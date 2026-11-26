// =============================================================
// ALD 공정 흐름 페이지 (equipment/ald/flow.html) — ① 스크롤 단계 체험 ② 맨 아래 작은 실험(사이클 수)
//   형식은 원리 페이지와 같음 (단계 전환·반복 재생은 js/sim/sx-engine.js)
//
// ① [data-sx] 단계 8개: FOUP에서 꺼냄 → EFEM·정렬 → 로드락 진공 → TM으로 이송 → 가열·안정화 → ALD 사이클 반복 → 마지막 퍼지 → 반출
//    가운데 그림 = 웨이퍼 경로 평면도(js/figs/wafer-route.js의 WaferRoute.mount)에서 그 단계 구간만 반복.
//    챔버 단계(가열·안정화 / 사이클 / 마지막 퍼지)는 그림을 공정 챔버 쪽으로 당겨 보여 주고,
//    아래에 밸브 시간표(js/figs/ald-valve-timeline.js의 AldValveTimeline.mount)가 그 구간만 함께 재생
//    오른쪽 위 칩 = 지금 웨이퍼가 있는 곳(대기 쪽 / 경계 / 진공 쪽)
// ② [data-cyc-bench] 사이클 수 손잡이 → 막 두께(층 쌓임)와 공정 시간(사이클 칸)이 함께 늘어남. 숫자 없이 길이만
//
// 정지 화면(움직임 줄이기·?still=1): ① 단계마다 정지 그림(평면도 + 챔버 단계는 시간표)을 세로로 ② 바로 결과
// 색은 css/style.css 변수만 클래스로 씀 (JS에 색 없음). 길이·시간은 그림 비율용, 실제 값 아님
// 의존: gsap, ScrollTrigger, motion-pref.js, sx-engine.js, ald-valve-timeline.js, wafer-route.js
// =============================================================
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // 평면도 단계(0~8)마다 웨이퍼가 있는 곳
  const ZONE = ["atm", "atm", "atm", "edge", "vac", "vac", "vac", "edge", "atm"];
  const ZONE_NAME = { atm: "대기 쪽", edge: "경계: 로드락", vac: "진공 쪽" };
  const FULL = "0 0 600 640", ZOOM = "30 50 540 396";     // 챔버 단계는 진공 쪽(TM·PM·LL)만 크게

  // 단계 8개: route = 평면도 단계 번호들 / pm = 레시피 구간(밸브 시간표) / pmIn = 마지막에 PM으로 들어가는 이동까지
  const STAGES = [
    { name: "FOUP에서 꺼냄", route: [0, 1] },
    { name: "EFEM · 정렬", route: [2] },
    { name: "로드락 진공", route: [3] },
    { name: "TM으로 이송 → 공정 챔버", route: [4], pmIn: true },
    { name: "가열 · 안정화", pm: "stab", d: 4.2, desc: "슬릿 밸브가 닫힌 채 퍼지 가스만 흐릅니다. 웨이퍼가 히터 온도까지 데워지고 압력이 맞춰지기를 기다립니다." },
    { name: "ALD 사이클 반복", pm: "cycles", d: 12 },
    { name: "마지막 퍼지", pm: "final", d: 3.8 },
    { name: "반출", route: [6, 7, 8] }
  ];
  const SPEED = 1.15, HOLD = 1.0;
  const PM_IN_DESC = "진공 로봇이 슬릿 밸브를 지나 공정 챔버 안 리프트 핀 위에 웨이퍼를 내려놓습니다.";

  function buildSegs(WR, VT) {
    const S = WR.STEPS, M = WR.MOVE_T, act = S[VT.PM_STEP].act;
    STAGES.forEach((st) => {
      st.segs = [];
      if (st.route) st.route.forEach((i) => st.segs.push({ i, a: 0, b: WR.durOf(S[i]), d: WR.durOf(S[i]) * SPEED }));
      if (st.pmIn) st.segs.push({ i: 5, a: 0, b: M, d: M * SPEED, desc: PM_IN_DESC });
      if (st.pm) { const r = VT.ranges[st.pm]; st.segs.push({ i: 5, a: M + r[0] * act, b: M + r[1] * act, d: st.d, pm: true }); }
      st.total = st.segs.reduce((s, g) => s + g.d, 0) + HOLD;
      // 이 단계 전체 이동 경로 (점선)
      const moves = st.segs.map((g) => (g.pm ? null : (g.desc ? S[5].move : S[g.i].move))).filter(Boolean);
      st.trail = moves.length ? [moves[0][0]].concat(moves.map((m) => m[1])) : [];
    });
    return { M, act };
  }
  function frameAt(st, t) {
    let x = t;
    for (const g of st.segs) {
      if (x < g.d) return { g, rt: g.a + (g.b - g.a) * (x / g.d) };
      x -= g.d;
    }
    const g = st.segs[st.segs.length - 1];
    return { g, rt: g.b };
  }

  // =============================================================
  // ① 스크롤 단계 체험
  // =============================================================
  function setupStory(root) {
    const E = window.SxEngine, WR = window.WaferRoute, VT = window.AldValveTimeline;
    if (!E || !WR || !VT) return;
    const $ = E.$;
    const steps = E.$$("[data-beat]", root);
    if (!steps.length) return;

    if (E.isStill() || !window.gsap || !window.ScrollTrigger) {
      // 정지 화면: 평면도를 먼저 하나 만들어 장비별 내용(WAFER_ROUTE_DATA)을 반영한 뒤 단계마다 그림
      const tmp = document.createElement("div");
      WR.mount(tmp, "tmp-");
      const K = buildSegs(WR, VT);
      buildStill(root, K);
      return;
    }

    const plan = WR.mount($("[data-sx-svg]", root), "");
    const K = buildSegs(WR, VT);
    const vtBox = $("[data-sx-vt]", root);
    const vtShow = VT.mount(vtBox);
    const stage = $(".sx-stage", root);
    const nameEl = $("[data-sx-name]", root), descEl = $("[data-sx-desc]", root), zoneEl = $("[data-sx-zone]", root);
    const NB = STAGES.length;

    let lastText = "";
    function draw(b, t) {
      const st = STAGES[b], f = frameAt(st, t);
      plan.draw(f.g.i, f.rt, st.trail);
      if (st.pm) vtShow({ i: 5, t: f.rt, move: K.M, act: K.act, playing: true });
      const S = WR.STEPS[f.g.i];
      const desc = st.pm ? (st.desc || "") : f.g.desc || `${S.name}: ${S.cap}`;
      const zone = ZONE[f.g.i];
      const key = desc + zone;
      if (key !== lastText) {
        lastText = key;
        descEl.textContent = desc;
        zoneEl.textContent = ZONE_NAME[zone];
        zoneEl.dataset.zone = zone;
      }
    }
    function onActivate(b) {
      const st = STAGES[b];
      lastText = "";
      nameEl.innerHTML = `<span class="sim-stage-num">${b + 1}/${NB}</span>${st.name}`;
      stage.classList.toggle("has-vt", !!st.pm);
      vtBox.hidden = !st.pm;
      plan.svg.setAttribute("viewBox", st.pm ? ZOOM : FULL);
    }
    E.story(root, { total: (b) => STAGES[b].total, draw, onActivate, softEl: $("[data-sx-svg]", root) });
  }

  function buildStill(root, K) {
    const E = window.SxEngine, WR = window.WaferRoute, VT = window.AldValveTimeline;
    E.still(root, (step, b, fig) => {
      const st = STAGES[b], g = st.segs[st.segs.length - 1];
      fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${st.name}</p><p class="sx-zone" data-zone="${ZONE[g.i]}">${ZONE_NAME[ZONE[g.i]]}</p></div>` +
        `<div class="sx-svg-box fx-plan"></div>`;
      const p = WR.mount(E.$(".fx-plan", fig), `s${b}-`);
      p.draw(g.i, g.b, st.trail);
      if (st.pm) {
        p.svg.setAttribute("viewBox", ZOOM);
        const box = document.createElement("div");
        box.className = "vt sx-vt";
        fig.appendChild(box);
        const show = VT.mount(box);
        // 사이클 구간은 레시피 전체(정지 그림), 나머지는 그 구간 가운데
        const r = VT.ranges[st.pm], q = st.pm === "cycles" ? null : (r[0] + r[1]) / 2;
        show(q === null ? { i: 5, t: K.M + 1, move: K.M, act: K.act, playing: false }
          : { i: 5, t: K.M + q * K.act, move: K.M, act: K.act, playing: true });
      }
    });
  }

  // =============================================================
  // ② 작은 실험: 사이클 수 → 막 두께 + 공정 시간
  // =============================================================
  function setupBench(root) {
    const E = window.SxEngine;
    const q = (s) => root.querySelector(s), qa = (s) => [...root.querySelectorAll(s)];
    const still = (E && E.isStill()) || !window.gsap;
    const N = [4, 8, 12, 16, 20];
    const NAME = ["아주 적게", "적게", "보통", "많이", "아주 많이"];
    const MAXN = 20;
    const knob = q("[data-cyc]");

    // ---- 막 단면: 사이클마다 한 줄씩 ----
    const film = q("[data-cb-film]");
    const BASE = 184, LH = 7, FX = 34, FW = 176;
    mk("rect", { class: "asf-sub", x: 14, y: BASE, width: 216, height: 30 }, film);
    mk("text", { class: "cb-t", x: 122, y: BASE + 20, "text-anchor": "middle" }, film).textContent = "웨이퍼";
    const layers = [];
    for (let c = 0; c < MAXN; c++) layers.push(mk("rect", { class: "asf-cell" + (c % 2 ? " is-alt" : ""), x: FX, y: BASE - (c + 1) * LH, width: FW, height: LH - 0.6, rx: 1.5, opacity: 0 }, film));
    const ghost = mk("line", { class: "cb-ghost", x1: FX - 8, x2: FX + FW + 8, y1: BASE, y2: BASE, opacity: 0 }, film);
    const ghostT = mk("text", { class: "cb-t is-faint", x: FX - 10, y: BASE, "text-anchor": "end", opacity: 0 }, film);
    ghostT.textContent = "전";
    const brace = mk("path", { class: "cb-brace", d: "" }, film);
    const braceT = mk("text", { class: "cb-t is-strong", x: 234, y: 0, "text-anchor": "start" }, film);
    braceT.textContent = "두께";

    // ---- 공정 시간 막대: 이송·가열 + 사이클 칸 + 마지막 퍼지·반출 ----
    const time = q("[data-cb-time]");
    const TX = 92, CW = 19, PARTS = [["prec", 4], ["purge", 5], ["react", 4], ["purge", 5]];   // 한 사이클 칸 + 1 틈
    const Y1 = 30, Y2 = 104, BH = 30;
    mk("text", { class: "cb-t is-strong", x: 0, y: Y1 + 20 }, time).textContent = "ALD";
    mk("text", { class: "cb-t", x: 0, y: Y2 + 20 }, time).textContent = "PECVD 참고";
    const fixIn = mk("rect", { class: "cb-fix", x: TX, y: Y1, width: 44, height: BH, rx: 3 }, time);
    mk("text", { class: "cb-t is-in", x: TX + 22, y: Y1 + 19, "text-anchor": "middle" }, time).textContent = "이송";
    const cyc = [];
    for (let c = 0; c < MAXN; c++) {
      let x = TX + 46 + c * CW;
      cyc.push(PARTS.map(([k, w]) => { const r = mk("rect", { class: "cb-seg k-" + k, x, y: Y1, width: w - 0.4, height: BH, opacity: 0 }, time); x += w; return r; }));
    }
    const finP = mk("rect", { class: "cb-seg k-purge is-final", x: 0, y: Y1, width: 14, height: BH, opacity: 0 }, time);
    const fixOut = mk("rect", { class: "cb-fix", x: 0, y: Y1, width: 30, height: BH, rx: 3, opacity: 0 }, time);
    const endMark = mk("path", { class: "cb-end", d: "" }, time);
    // PECVD(같은 두께) 참고 줄: 이송 + 한 번에 쌓음 + 반출
    mk("rect", { class: "cb-fix", x: TX, y: Y2, width: 44, height: BH, rx: 3 }, time);
    const pDep = mk("rect", { class: "cb-pdep", x: TX + 46, y: Y2, width: 0, height: BH, rx: 2 }, time);
    const pOut = mk("rect", { class: "cb-fix", x: 0, y: Y2, width: 30, height: BH, rx: 3, opacity: 0 }, time);
    mk("text", { class: "cb-t is-in", x: TX + 22, y: Y2 + 19, "text-anchor": "middle" }, time).textContent = "이송";
    const outT = mk("text", { class: "cb-t is-in", x: 0, y: Y1 + 19, "text-anchor": "middle", opacity: 0 }, time);
    outT.textContent = "반출";
    mk("text", { class: "cb-t is-faint", x: TX, y: 160 }, time).textContent = "시간 →  (길이만 비교, 실제 비율 아님)";

    let prev = null, tl = null;
    const done = new Set();
    function render(n, animate) {
      if (tl) { tl.kill(); tl = null; }
      const topY = BASE - n * LH;
      const endX = TX + 46 + n * CW;
      finP.setAttribute("x", endX + 1);
      fixOut.setAttribute("x", endX + 17);
      outT.setAttribute("x", endX + 32);
      endMark.setAttribute("d", `M${endX + 49} ${Y1 - 6} V${Y1 + BH + 6}`);
      const pw = 10 + n * 1.5;                     // 같은 두께를 한 번에: 사이클 칸보다 훨씬 짧게(개념)
      pOut.setAttribute("x", TX + 48 + pw);
      brace.setAttribute("d", `M218 ${topY} h6 V${BASE} h-6`);
      braceT.setAttribute("y", (topY + BASE) / 2 + 4);
      // 바꾸기 전 두께를 점선으로
      if (prev !== null && prev !== n) {
        const gy = BASE - prev * LH;
        [ghost].forEach((l) => { l.setAttribute("y1", gy); l.setAttribute("y2", gy); l.setAttribute("opacity", 1); });
        ghostT.setAttribute("y", gy + 4); ghostT.setAttribute("opacity", 1);
      }
      const set = (els, o) => els.forEach((e) => e.setAttribute("opacity", o));
      if (!animate || still) {
        layers.forEach((l, c) => l.setAttribute("opacity", c < n ? 1 : 0));
        cyc.forEach((g, c) => set(g, c < n ? 1 : 0));
        set([finP, fixOut, outT, pOut], 1);
        pDep.setAttribute("width", pw);
        return;
      }
      set(layers, 0); cyc.forEach((g) => set(g, 0)); set([finP, fixOut, outT, pOut], 0);
      pDep.setAttribute("width", 0);
      tl = gsap.timeline();
      const st = { w: 0 };
      tl.to(st, { w: pw, duration: 0.45, ease: "power1.out", onUpdate: () => pDep.setAttribute("width", st.w.toFixed(1)) }, 0.15);
      tl.to(pOut, { attr: { opacity: 1 }, duration: 0.15 }, 0.62);
      for (let c = 0; c < n; c++) {
        tl.to(cyc[c], { attr: { opacity: 1 }, duration: 0.08, stagger: 0.025 }, 0.2 + c * 0.13);
        tl.to(layers[c], { attr: { opacity: 1 }, duration: 0.12 }, 0.27 + c * 0.13);
      }
      tl.to([finP, fixOut, outT], { attr: { opacity: 1 }, duration: 0.12, stagger: 0.08 }, 0.25 + n * 0.13);
    }

    const verdict = q("[data-cb-verdict]"), chips = q("[data-cb-chips]");
    const LEN = ["아주 얇음", "얇음", "중간", "두꺼움", "아주 두꺼움"], TIME = ["아주 짧음", "짧음", "중간", "긺", "아주 긺"];
    function update(animate) {
      const v = +knob.value, n = N[v];
      q("[data-kv]").textContent = NAME[v];
      knob.setAttribute("aria-valuetext", NAME[v]);
      const before = prev === null ? null : N.indexOf(prev);
      render(n, animate);
      chips.innerHTML = `<li>막: ${LEN[v]}</li><li>시간: ${TIME[v]}</li>`;
      if (before === null || before === v) verdict.textContent = "펄스·퍼지 시간은 그대로 두고 사이클 수만 바꿉니다. 손잡이를 움직여 보세요.";
      else if (v > before) verdict.textContent = "사이클을 늘린 만큼 막이 두꺼워졌고, 공정 시간도 거의 그만큼 늘었습니다. 두께를 바꾸는 손잡이가 사이클 수입니다.";
      else verdict.textContent = "사이클을 줄인 만큼 막이 얇아졌고, 공정 시간도 거의 그만큼 줄었습니다.";
      if (before !== null && before !== v) done.add("thick");
      if (v >= 3) done.add("slow");
      qa("[data-m]").forEach((li) => li.classList.toggle("is-done", done.has(li.dataset.m)));
      q("[data-done]").textContent = String(done.size);
      prev = n;
    }
    knob.addEventListener("input", () => update(true));
    q("[data-cb-run]").addEventListener("click", () => render(N[+knob.value], true));
    update(false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sx]").forEach(setupStory);
    document.querySelectorAll("[data-cyc-bench]").forEach(setupBench);
  });
})();
