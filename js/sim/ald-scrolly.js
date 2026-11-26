// =============================================================
// ALD 원리 페이지 (equipment/ald/principle.html) — ① 스크롤 단계 체험 ② 맨 아래 작은 실험대
//
// ① 스크롤 단계 체험 [data-sx]
//   왼쪽 단계 글 7개(article[data-beat])를 지나가는 만큼 가운데 표면 그림이 진행된다(scrub). 올리면 거꾸로.
//   전구체 주입 → 빈자리에 붙음 → 자기 제한 → 퍼지 → 반응 기체 → 한 층 완성 → 사이클 반복(층이 쌓임)
//   · 그림 계산은 js/sim/ald-surface.js의 pose()를 그대로 씀 (단계·진행·사이클 → 분자 위치)
//   · 스크롤 위치 → "진행값 t"(0~7) → 매 프레임 조금씩 따라가며(부드럽게) 그림
//   · 자기 제한 단계: 아래 작은 창에서 남은 분자가 튕겨 나가는 장면이 저절로 반복
//     퍼지 단계: 작은 창에서 "퍼지가 부족하면" 장면이 저절로 반복 (스크롤을 멈춰도 계속)
//   · 오른쪽 위 작은 챔버 단면: 지금 열린 밸브만 하늘색
//   · 사이드 노트: 각 단계 안 <details> 메모를 오른쪽 칸으로 옮겨 보여 줌 (좁은 화면은 단계 안 접는 메모 그대로)
// ② 실험대 [data-bench] (시안 A 일부): 손잡이 4개 → 실행 → 챔버 사이클 → 위치별 막 두께 막대 + 결과 문구(막대 바로 아래) + 온도 창 그림 + 미션
//
// 정지 화면(움직임 줄이기·?still=1 등): ① 스크롤 진행 대신 단계마다 정지 그림을 세로로 나열 ② 실행하면 바로 결과
// 색은 css/style.css의 변수만 클래스로 씀 (JS에 색 없음)
// 의존: vendor/gsap/gsap.min.js, ScrollTrigger.min.js, js/motion-pref.js, js/sim/ald-surface.js
// =============================================================
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const SVGNS = "http://www.w3.org/2000/svg";
  const mk = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const isStill = () => (window.MotionPref ? !!MotionPref.reason()
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ---------- 작은 챔버 단면 (스토리 그림 오른쪽 위) ----------
  // 배관 3줄 + 밸브 3개 → 챔버. 열린 밸브와 그 배관만 하늘색(.is-on)
  function miniChamber(holder) {
    holder.innerHTML =
      `<svg class="sx-ch" viewBox="0 0 220 128" role="img" aria-label="작은 챔버 단면: 전구체·반응 기체·퍼지 배관이 각자 밸브를 지나 챔버로 들어간다. 하늘색이 지금 열린 밸브.">` +
      `<text x="4" y="22">전구체</text><text x="4" y="46">반응 기체</text><text x="4" y="70">퍼지</text>` +
      `<path class="sx-ch-line" d="M62 18 H168 V80 M62 42 H168 M62 66 H168"/>` +
      `<path class="sx-ch-flow" data-mflow="prec" d="M62 18 H168 V80"/>` +
      `<path class="sx-ch-flow" data-mflow="react" d="M62 42 H168 V80"/>` +
      `<path class="sx-ch-flow" data-mflow="purge" d="M62 66 H168 V80"/>` +
      `<path class="sx-valve" data-mvalve="prec" d="M98 11 L112 25 V11 L98 25 Z"/>` +
      `<path class="sx-valve" data-mvalve="react" d="M98 35 L112 49 V35 L98 49 Z"/>` +
      `<path class="sx-valve" data-mvalve="purge" d="M98 59 L112 73 V59 L98 73 Z"/>` +
      `<rect class="sx-ch-wall" x="124" y="80" width="88" height="40" rx="6"/>` +
      `<rect class="sx-ch-heater" x="146" y="108" width="44" height="7" rx="2"/>` +
      `<rect class="sx-ch-wafer" x="142" y="104" width="52" height="4" rx="1"/>` +
      `<path class="sx-ch-line is-thin" d="M206 120 V127"/>` +
      `</svg>`;
    const valves = $$("[data-mvalve]", holder), flows = $$("[data-mflow]", holder);
    return (gas) => {
      valves.forEach((v) => v.classList.toggle("is-on", v.dataset.mvalve === gas));
      flows.forEach((f) => f.classList.toggle("is-on", f.dataset.mflow === gas));
    };
  }

  // =============================================================
  // ① 스크롤 단계 체험
  // =============================================================
  // 단계 7개: 표면 그림의 단계(step 0~3)와 그 안의 진행 구간(a→b). 마지막은 사이클 3번 더
  const BEATS = [
    { step: 0, a: 0, b: 0.3, gas: "prec" },
    { step: 0, a: 0.3, b: 0.66, gas: "prec" },
    { step: 0, a: 0.66, b: 1, gas: "prec", demo: "bounce" },
    { step: 1, a: 0, b: 1, gas: "purge", demo: "bad" },
    { step: 2, a: 0, b: 1, gas: "react" },
    { step: 3, a: 0, b: 1, gas: "purge" },
    { cycles: 3 }
  ];
  const NB = BEATS.length;
  const GAS = ["prec", "purge", "react", "purge"];
  const STEP_NAME = ["전구체 주입", "퍼지", "반응 기체 주입", "퍼지"];
  // 위쪽 진행 표시 (4단계 사이클 기준 번호)
  const WHERE = ["1/4 전구체 주입", "1/4 전구체 주입", "1/4 전구체 주입 · 자기 제한", "2/4 퍼지", "3/4 반응 기체 주입", "4/4 퍼지 · 한 층 완성"];

  // 진행값 t(0~7) → 표면 그림 상태 {b: 단계 칸, i: 그림 단계, p: 진행, k: 사이클}
  function at(t) {
    t = clamp(t, 0, NB);
    const b = Math.min(NB - 1, Math.floor(t));
    const q = t - b;
    const B = BEATS[b];
    if (B.cycles) {
      const x = Math.min(q * B.cycles, B.cycles - 1e-6);
      const kk = Math.floor(x), r = (x - kk) * 4;
      const i = Math.min(3, Math.floor(r));
      return { b, i, p: r - i, k: 1 + kk };
    }
    return { b, i: B.step, p: lerp(B.a, B.b, q), k: 0 };
  }

  function descFor(s, o) {
    switch (s.b) {
      case 0: return "ALD 밸브가 잠깐 열리고 전구체 분자가 챔버로 들어옵니다.";
      case 1: return `전구체가 표면의 빈자리에만 하나씩 붙습니다. 채워진 자리 ${o.filled}/${AldSurface.N}`;
      case 2: return o.filled < AldSurface.N ? `거의 다 찼습니다. 채워진 자리 ${o.filled}/${AldSurface.N}`
        : "자리가 다 찼습니다. 더 들어온 분자는 표면에 닿아도 붙지 못하고 튕겨 나옵니다.";
      case 3: return "퍼지 가스가 떠 있던 전구체를 배기 쪽으로 몰아냅니다. 표면에 붙은 전구체는 그대로입니다.";
      case 4: return "반응 기체가 붙은 전구체와 반응해 막 한 줄이 됩니다. 반응에서 나온 부산물이 떨어져 나옵니다.";
      case 5: return "남은 반응 기체와 부산물을 몰아내면 한 층 완성. 새 표면에 빈자리가 다시 생깁니다.";
      default: return `같은 네 단계를 반복합니다. 사이클 ${s.k + 1} · 쌓인 층 ${o.layers}`;
    }
  }

  // 자동 시연 장면 (작은 창, 시간에 따라 반복). ph = 0~1
  const DEMO = {
    bounce: { period: 2.6, frame(ph) {
      const o = AldSurface.pose(0, 1, 0, false);                 // 자리가 다 찬 표면
      o.E = AldSurface.pose(0, 0.45 + 0.55 * ph, 0, false).E;    // 남는 분자만 다시 내려와 튕김
      return o;
    } },
    bad: { period: 4.2, frame(ph) {                                // 짧은 퍼지 → 반응 기체 단계에서 알갱이
      return ph < 0.35 ? AldSurface.pose(1, ph / 0.35, 0, true) : AldSurface.pose(2, Math.min(0.92, (ph - 0.35) / 0.6), 0, true);
    } }
  };

  function setupStory(root) {
    const A = window.AldSurface;
    const steps = $$("[data-beat]", root);
    if (!A || !steps.length) return;

    // 정지 화면: 단계마다 정지 그림을 글 위에 넣고, 고정 그림·사이드 노트 칸은 숨김
    if (isStill() || !window.gsap || !window.ScrollTrigger) { buildStill(root, steps); return; }

    const svgEl = A.buildSvg($("[data-sx-svg]", root));
    const setGas = miniChamber($("[data-sx-ch]", root));
    const nameEl = $("[data-sx-name]", root), descEl = $("[data-sx-desc]", root);
    const dots = $$("[data-sx-dots] li", root);
    const noteEl = $("[data-sx-note]", root);
    const demoBox = $("[data-sx-demo]", root);
    const demoEl = A.buildSvg($("[data-sx-demo-svg]", root));
    demoEl.svg = $("[data-sx-demo-svg] svg", root);
    if (demoEl.svg) { demoEl.svg.setAttribute("aria-hidden", "true"); demoEl.svg.removeAttribute("role"); }
    const caps = $$("[data-demo-cap]", root);

    // ---- 그리기 ----
    let lastB = -1, lastText = "", demoKind = null;
    function render(t) {
      const s = at(t);
      const o = A.pose(s.i, s.p, s.k, false);
      A.apply(svgEl, o);
      const name = s.b < 6 ? WHERE[s.b] : `사이클 반복 · ${s.k + 1}번째 사이클 ${s.i + 1}/4 ${STEP_NAME[s.i]}`;
      const d = descFor(s, o);
      const text = name + "|" + d;
      if (text !== lastText) {
        lastText = text;
        nameEl.innerHTML = `<span class="sim-stage-num">${s.b + 1}/${NB}</span>${name}`;
        descEl.textContent = d;
        setGas(s.b < 6 ? BEATS[s.b].gas : GAS[s.i]);
      }
      if (s.b !== lastB) { lastB = s.b; onBeat(s.b); }
    }
    // 단계 칸이 바뀔 때: 글 강조 · 진행 점 · 사이드 노트 · 자동 시연
    function onBeat(b) {
      steps.forEach((st, n) => st.classList.toggle("is-on", n === b));
      dots.forEach((li, n) => { li.classList.toggle("is-done", n < b); li.classList.toggle("is-on", n === b); });
      const det = $(".sx-note", steps[b]);
      if (noteEl && det) {
        noteEl.innerHTML = `<p class="sx-note-k">${b + 1}단계 옆 메모</p><h3>${$("summary", det).textContent.replace(/^메모:\s*/, "")}</h3>` +
          $(".sx-note-body", det).innerHTML;
        noteEl.classList.remove("is-in"); void noteEl.offsetWidth; noteEl.classList.add("is-in");
      }
      setDemo(BEATS[b].demo || null);
    }

    // ---- 자동 시연 (작은 창): 보이는 동안만 gsap 시계로 반복 ----
    let demoT0 = 0, onScreen = true;
    function demoTick() {
      if (!demoKind || !onScreen || document.hidden) return;
      const D = DEMO[demoKind];
      const ph = ((performance.now() - demoT0) / 1000 / D.period) % 1;
      A.apply(demoEl, D.frame(ph));
    }
    function setDemo(kind) {
      if (kind === demoKind) return;
      demoKind = kind;
      demoBox.hidden = !kind;
      root.classList.toggle("has-demo", !!kind);
      caps.forEach((c) => { c.hidden = c.dataset.demoCap !== kind; });
      gsap.ticker.remove(demoTick);
      if (kind) { demoT0 = performance.now(); demoTick(); gsap.ticker.add(demoTick); }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { onScreen = en[en.length - 1].isIntersecting; }).observe(root);
    }

    // ---- 스크롤 → 목표 진행값 → 부드럽게 따라감 ----
    let cur = 0, target = 0, follow = false;
    function chase() {
      const dlt = target - cur;
      if (Math.abs(dlt) < 0.0008) { cur = target; render(cur); gsap.ticker.remove(chase); follow = false; return; }
      cur += dlt * 0.16;
      render(cur);
    }
    function setTarget(v) {
      target = clamp(v, 0, NB);
      if (!follow) { follow = true; gsap.ticker.add(chase); }
    }
    // 읽는 기준선(화면 위에서 62%)이 몇 번째 단계 글의 어디쯤을 지나는지 → t
    const LINE = 0.62;
    function measure() {
      const y = window.innerHeight * LINE;
      for (let n = 0; n < steps.length; n++) {
        const r = steps[n].getBoundingClientRect();
        if (y < r.bottom || n === steps.length - 1) {
          return n + clamp((y - r.top) / Math.max(1, r.height), 0, 1);
        }
      }
      return 0;
    }
    gsap.registerPlugin(ScrollTrigger);
    const stepsBox = $("[data-sx-steps]", root);
    ScrollTrigger.create({
      trigger: stepsBox, start: `top ${LINE * 100}%`, end: `bottom ${LINE * 100}%`,
      onUpdate: () => setTarget(measure()),
      onLeave: () => setTarget(NB), onLeaveBack: () => setTarget(0),
      onRefresh: () => setTarget(measure())
    });
    cur = target = measure();
    render(cur);
  }

  // 정지 화면: 각 단계 글 위에 그 단계 끝 모습 (+ 작은 챔버, 퍼지 단계는 "부족하면" 비교 그림)
  function buildStill(root, steps) {
    const A = window.AldSurface;
    root.classList.add("is-still");
    const ENDS = [[0, 0.3, 0], [0, 0.66, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 0], [3, 1, 3]];
    steps.forEach((st, b) => {
      const fig = document.createElement("figure");
      fig.className = "sx-still-fig";
      fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${b < 6 ? WHERE[b] : "사이클 반복 · 4층"}</p><div class="sx-ch-box"></div></div><div class="sx-svg-box"></div>`;
      st.insertBefore(fig, $("h3", st));
      const el = A.buildSvg($(".sx-svg-box", fig));
      const [i, p, k] = ENDS[b];
      A.apply(el, A.pose(i, p, k, false));
      miniChamber($(".sx-ch-box", fig))(BEATS[b].gas || "purge");
      if (BEATS[b].demo === "bad") {             // 비교: 퍼지가 부족하면 → 공중에서 알갱이
        const cmp = document.createElement("div");
        cmp.className = "sx-demo is-still";
        cmp.innerHTML = `<div class="sx-demo-svg"></div>`;
        const cap = $('[data-demo-cap="bad"]', root);
        if (cap) cmp.appendChild(cap.cloneNode(true));
        fig.appendChild(cmp);
        A.apply(A.buildSvg($(".sx-demo-svg", cmp)), A.pose(2, 0.7, 0, true));
      }
      const det = $(".sx-note", st);
      if (det) det.open = true;
    });
  }

  // =============================================================
  // ② 실험대 (시안 A의 챔버·손잡이·막대를 줄여서 가져옴)
  // =============================================================
  function setupBench(root) {
    const q = (s) => $(s, root), qa = (s) => $$(s, root);
    const NAMES = {
      pulse: ["짧게", "보통", "길게"], purge: ["짧게", "보통", "길게"], cyc: ["적게", "보통", "많이"],
      temp: ["창보다 낮음", "온도 창 안", "온도 창 안", "온도 창 안", "창보다 높음"]
    };
    const DEFAULT = { pulse: 1, purge: 1, temp: 2, cyc: 1 };
    const knob = (k) => +q(`[data-k="${k}"]`).value;
    const still = isStill() || !window.gsap;

    function syncKnobs() {
      Object.keys(NAMES).forEach((k) => {
        const v = knob(k);
        q(`[data-kv="${k}"]`).textContent = NAMES[k][v];
        q(`[data-k="${k}"]`).setAttribute("aria-valuetext", NAMES[k][v]);
      });
      q("[data-bn-total]").textContent = NAMES.cyc[knob("cyc")];
      setHeat(knob("temp"));
    }

    // ---- 결과 계산 (그림용 경향, 실제 값 아님) ----
    const NBAR = 9;                                // 막대 9개: 가장자리 … 가운데 … 가장자리
    const noise = (j, s) => { const x = Math.sin(j * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
    function outcome(s) {
      const tags = [], bad = [];
      let kind = "ok";
      const cycH = [0.38, 0.6, 0.86][s.cyc];
      const prof = [];
      for (let j = 0; j < NBAR; j++) {
        const x = (j - (NBAR - 1) / 2) / ((NBAR - 1) / 2);   // -1 … 1
        let m = 1;
        if (s.pulse === 0) m *= 1 - 0.42 * Math.pow(Math.abs(x), 1.4);   // 포화 전: 늦게 닿는 가장자리가 덜 참
        if (s.purge === 0) m *= 1.12 + 0.34 * noise(j, 3);               // 공중 반응: 울퉁불퉁
        if (s.temp === 0) m *= 1.38 + 0.16 * noise(j, 5);                // 응축: 두껍고 조금 고르지 않음
        if (s.temp === 4) m *= 1.12 + 0.42 * (1 - Math.abs(x));          // 분해: 가운데가 두꺼움
        prof.push(Math.min(1, cycH * m));
      }
      const grains = s.purge === 0 ? [1, 4, 6] : [];
      if (s.temp === 0) { kind = "cold"; tags.push("두꺼움"); bad.push("온도 창보다 낮음"); }
      else if (s.temp === 4) { kind = "hot"; tags.push("가운데 두꺼움"); bad.push("온도 창보다 높음"); }
      if (s.purge === 0) { if (kind === "ok") kind = "purge"; tags.push("울퉁불퉁", "파티클"); bad.push("퍼지 부족"); }
      if (s.pulse === 0) { if (kind === "ok") kind = "pulse"; tags.push("가장자리 얇음"); bad.push("포화 전"); }
      if (kind === "ok") tags.push("고름", ["얇게", "중간", "두껍게"][s.cyc]);
      return { kind, prof, grains, tags, bad };
    }
    const TEXT = {
      ok: (s) => s.pulse === 2 ? "펄스를 늘렸는데도 두께가 그대로입니다. 자리가 다 차면 더 붙지 않기 때문입니다(자기 제한)."
        : s.purge === 2 ? "막은 똑같이 고릅니다. 퍼지를 길게 하면 깨끗하지만 사이클마다 시간이 늘어 처리량이 줄어듭니다."
        : "웨이퍼 어디서나 같은 높이입니다. 두께는 사이클 수로 정해집니다.",
      purge: () => "막이 울퉁불퉁하고 위에 파티클이 얹혔습니다. 퍼지가 짧아 남은 전구체와 반응 기체가 공중에서 만났습니다.",
      pulse: () => "가운데보다 가장자리가 얇습니다. 펄스가 짧아 표면 자리가 다 차기 전에 끝났습니다(포화 전).",
      cold: () => "막이 한 층 몫보다 두껍게 쌓였습니다. 차가운 표면에 전구체가 이슬처럼 맺혔습니다(응축).",
      hot: () => "가운데가 볼록하게 두꺼워졌습니다. 전구체가 열로 스스로 쪼개져 CVD처럼 쌓였습니다(분해)."
    };
    // 결과 아래 한 줄: 다시 볼 곳
    const MORE = {
      ok: '<a href="#self-limiting">위 3단계: 자기 제한 다시 보기</a>',
      purge: '<a href="#sim">위 4단계: 퍼지 다시 보기</a> · 현장에서는 파티클이 갑자기 늘면 퍼지 유량·시간·ALD 밸브부터 의심합니다 <span class="verify-tag">검증 필요</span>',
      pulse: '레시피를 정할 때는 펄스를 늘려 가며 두께가 더 늘지 않는 지점(포화)을 찾습니다 <span class="verify-tag">검증 필요</span> · <a href="parameters.html">공정변수</a>',
      cold: "아래 그림처럼 응축이 아니라 <b>반응 부족</b>으로 가면 오히려 얇아집니다. 어느 쪽인지는 전구체에 따라 다릅니다.",
      hot: "아래 그림처럼 분해가 아니라 <b>이탈</b>로 가면 오히려 얇아집니다. 어느 쪽인지는 전구체에 따라 다릅니다."
    };

    // ---- 막대 그래프 ----
    const bars = q("[data-bars]");
    const BX = 24, BW = 32, BG = 8.5, BASEY = 128, MAXH = 104;
    mk("line", { class: "bn-bar-target", x1: 14, x2: 386, y1: BASEY - MAXH * 0.6, y2: BASEY - MAXH * 0.6 }, bars);
    const barEls = [];
    for (let j = 0; j < NBAR; j++) barEls.push(mk("rect", { class: "bn-bar", x: BX + j * (BW + BG), y: BASEY, width: BW, height: 0, rx: 3 }, bars));
    mk("line", { class: "bn-bar-base", x1: 14, x2: 386, y1: BASEY, y2: BASEY }, bars);
    const tx = (x, s, a) => { mk("text", { x, y: 145, "text-anchor": a }, bars).textContent = s; };
    tx(BX, "가장자리", "start"); tx(200, "가운데", "middle"); tx(386 - 14, "가장자리", "end");
    const grainG = mk("g", {}, bars);
    const hNow = barEls.map(() => 0);
    function setBar(j, h) { hNow[j] = h; barEls[j].setAttribute("y", (BASEY - MAXH * h).toFixed(1)); barEls[j].setAttribute("height", (MAXH * h).toFixed(1)); }
    function drawBars(o, frac, instant) {
      barEls.forEach((b, j) => {
        const to = o.prof[j] * frac;
        if (instant || still) setBar(j, to);
        else { const st = { h: hNow[j] }; gsap.to(st, { h: to, duration: 0.35, ease: "power2.out", onUpdate: () => setBar(j, st.h) }); }
      });
      grainG.innerHTML = "";
      if (frac >= 1) o.grains.forEach((j) => {
        const cx = BX + j * (BW + BG) + BW / 2, top = BASEY - MAXH * o.prof[j];
        mk("circle", { class: "bn-bar-grain", cx: cx - 4, cy: top - 7, r: 5 }, grainG);
        mk("circle", { class: "bn-bar-grain", cx: cx + 7, cy: top - 4, r: 3.4 }, grainG);
      });
    }

    // ---- 챔버 사이클 ----
    const dotsG = q("[data-dots]");
    const precDots = [], reactDots = [];
    for (let m = 0; m < 9; m++) {
      precDots.push(mk("circle", { class: "bn-dot k-prec", r: 6, cx: 0, cy: 0, opacity: 0 }, dotsG));
      reactDots.push(mk("circle", { class: "bn-dot k-react", r: 4.5, cx: 0, cy: 0, opacity: 0 }, dotsG));
    }
    const grainDots = [0, 1, 2].map(() => mk("circle", { class: "bn-dot k-grain", r: 6, cx: 0, cy: 0, opacity: 0 }, dotsG));
    const dotX = (m) => 250 + m * 20;
    const cloud = q("[data-cloud]"), heat = q("[data-heat]");

    function setStep(i, c) {
      const on = [["prec"], ["purge", "exh"], ["react"], ["purge", "exh"]][i] || [];
      qa("[data-flow]").forEach((p) => p.classList.toggle("is-on", on.includes(p.dataset.flow)));
      qa("[data-valve]").forEach((v) => v.classList.toggle("is-on", on.includes(v.dataset.valve)));
      qa("[data-chs]").forEach((li) => li.classList.toggle("is-on", +li.dataset.chs === i));
      cloud.setAttribute("class", "bn-cloud" + (on[0] ? " k-" + on[0] : ""));
      if (c != null) q("[data-bn-cycle]").textContent = String(c);
    }
    function setHeat(t) { heat.style.opacity = String([0.15, 0.3, 0.45, 0.6, 0.95][t]); }   // 온도가 높을수록 진하게

    function buildTimeline(s, o) {
      const pulseD = [0.38, 0.62, 0.95][s.pulse], purgeD = [0.22, 0.5, 0.85][s.purge];
      const cycles = [3, 5, 8][s.cyc];
      const shortPurge = s.purge === 0;
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      for (let c = 0; c < cycles; c++) {
        const L = "c" + c;
        tl.addLabel(L);
        // ① 전구체: 샤워헤드에서 내려와 웨이퍼에 붙음 (펄스가 짧으면 바깥쪽 몇 개는 못 닿음)
        tl.call(setStep, [0, c + 1], L);
        tl.fromTo(cloud, { opacity: 0 }, { opacity: 0.16, duration: pulseD * 0.5 }, L);
        precDots.forEach((d, m) => {
          const reach = !(s.pulse === 0 && (m < 2 || m > 6));
          tl.fromTo(d, { x: dotX(m), y: 176, opacity: 1 }, { y: reach ? 254 : 214, duration: pulseD * 0.8, ease: "power1.in" }, L + "+=" + (m % 3) * 0.04);
        });
        // ② 퍼지: 떠 있던 것을 배기로 (짧으면 일부 남음)
        const P1 = L + "+=" + pulseD;
        tl.call(setStep, [1, c + 1], P1);
        tl.to(cloud, { opacity: 0.1, duration: purgeD * 0.4 }, P1);
        precDots.forEach((d, m) => {
          const stays = shortPurge && m % 3 === 1;
          tl.to(d, stays ? { x: dotX(m) + 30, y: 214, duration: purgeD } : { opacity: 0, duration: purgeD * 0.6 }, P1);
        });
        // ③ 반응 기체 (퍼지 부족이면 남은 전구체와 공중에서 만나 알갱이)
        const R = P1 + "+=" + purgeD;
        tl.call(setStep, [2, c + 1], R);
        tl.fromTo(cloud, { opacity: 0 }, { opacity: 0.16, duration: pulseD * 0.5 }, R);
        reactDots.forEach((d, m) => tl.fromTo(d, { x: dotX(m) + 6, y: 176, opacity: 1 }, { y: 254, opacity: 0, duration: pulseD * 0.85, ease: "power1.in" }, R + "+=" + (m % 3) * 0.04));
        if (shortPurge) {
          grainDots.forEach((g, n) => {
            const m = 1 + n * 3;
            tl.fromTo(g, { x: dotX(m) + 30, y: 214, opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.15 }, R + "+=0.1");
            tl.to(g, { y: 252, duration: pulseD * 0.6, ease: "power1.in" }, ">");
          });
          precDots.forEach((d, m) => { if (m % 3 === 1) tl.to(d, { opacity: 0, duration: 0.1 }, R + "+=0.1"); });
        }
        // ④ 퍼지 → 한 사이클 끝: 막대가 한 칸 자람
        const P2 = R + "+=" + pulseD;
        tl.call(setStep, [3, c + 1], P2);
        tl.to(cloud, { opacity: 0.1, duration: purgeD * 0.4 }, P2);
        if (shortPurge) tl.to(grainDots, { opacity: 0, duration: purgeD * 0.6 }, P2 + "+=" + purgeD * 0.3);
        tl.call(() => drawBars(o, (c + 1) / cycles), [], P2 + "+=" + purgeD * 0.5);
        tl.to({}, { duration: purgeD }, P2);
      }
      tl.call(() => { setStep(-1); gsap.to(cloud, { opacity: 0, duration: 0.3 }); });
      tl.timeScale(1.4);
      return tl;
    }

    // ---- 결과 표시 (막대 바로 아래, 덮는 서랍 없음) ----
    const done = new Set();
    function check(s, o) {
      if (o.kind === "ok" && s.pulse === 2 && s.purge >= 1) done.add("sat");
      if (s.purge === 0) done.add("purge");
      if (s.temp === 0 || s.temp === 4) done.add("temp");
      qa("[data-m]").forEach((li) => li.classList.toggle("is-done", done.has(li.dataset.m)));
      q("[data-done]").textContent = String(done.size);
    }
    function showTemp(s) {
      const box = q("[data-bn-temp]");
      const A = window.AldSurface;
      if (!A) { box.hidden = true; return; }
      const z = s.temp === 0 ? "low" : s.temp === 4 ? "high" : "window";
      const Z = A.ZONES[z];
      box.hidden = false;
      box.className = "bn-temp is-" + z;
      box.innerHTML = `<p class="bn-temp-h">웨이퍼 온도: <b>${Z.name}</b>${z === "window" ? "" : " — 두 갈래 중 하나"}</p>` +
        `<div class="bn-temp-cards">` + Z.items.map((it) =>
          `<figure class="atw-card"><div class="atw-pic">${A.tempSvg(it.kind)}</div><figcaption><strong>${it.title}</strong> ${it.text}</figcaption></figure>`).join("") +
        `</div>`;
    }
    function showResult(s, o) {
      q("[data-chips]").innerHTML = o.tags.map((t) => `<li class="${o.kind === "ok" ? "" : "is-bad"}">${t}</li>`).join("") +
        o.bad.map((t) => `<li class="is-bad">원인: ${t}</li>`).join("");
      const v = q("[data-verdict]");
      v.classList.remove("is-idle");
      v.innerHTML = TEXT[o.kind](s) + (o.kind !== "ok" ? ' <span class="verify-tag">검증 필요</span>' : "");
      const more = q("[data-more]");
      more.innerHTML = MORE[o.kind]; more.hidden = false;
      showTemp(s);
      check(s, o);
    }

    let running = null;
    const runBtn = q("[data-run]");
    function run() {
      if (running) { running.kill(); running = null; }
      const s = { pulse: knob("pulse"), purge: knob("purge"), temp: knob("temp"), cyc: knob("cyc") };
      const o = outcome(s);
      drawBars(o, 0, true);
      q("[data-chips]").innerHTML = "";
      q("[data-more]").hidden = true;
      q("[data-bn-temp]").hidden = true;
      if (still) {                                  // 정지 화면: 애니메이션 없이 결과만
        setStep(-1); q("[data-bn-cycle]").textContent = "끝";
        drawBars(o, 1, true); showResult(s, o); return;
      }
      q("[data-verdict]").textContent = "사이클이 도는 중입니다…";
      runBtn.disabled = true;
      running = buildTimeline(s, o);
      running.eventCallback("onComplete", () => { runBtn.disabled = false; running = null; showResult(s, o); });
      running.play();
    }
    runBtn.addEventListener("click", run);
    q("[data-reset]").addEventListener("click", () => {
      Object.keys(DEFAULT).forEach((k) => { q(`[data-k="${k}"]`).value = DEFAULT[k]; });
      syncKnobs();
    });
    qa("[data-k]").forEach((el) => el.addEventListener("input", syncKnobs));
    syncKnobs();
    setStep(-1);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sx]").forEach(setupStory);
    document.querySelectorAll("[data-bench]").forEach(setupBench);
  });
})();
