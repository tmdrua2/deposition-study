// =============================================================
// ALD 원리 페이지 (equipment/ald/principle.html) — ① 스크롤 단계 체험 ② 맨 아래 작은 실험대
//
// ① 스크롤 단계 체험 [data-sx] — 단계 전환 + 자동 반복 재생 (2026-11-26 scrub 방식에서 변경)
//   왼쪽 단계 글 5개(article[data-beat]) 중 화면 기준선에 걸린 글이 "지금 단계" → 가운데 표면 그림이 그 단계 장면을 저절로 반복.
//   내리면 다음 단계, 올리면 이전 단계로 바뀜. 진행 표시(1/5)·작은 챔버 밸브 색·사이드 노트도 같은 순간에 바뀜.
//   1 전구체 주입(빈자리에 붙음) → 2 자기 제한(튕겨 나감) → 3 퍼지(+ "퍼지가 부족하면" 작은 창) → 4 반응 기체 → 퍼지(한 층 완성) → 5 사이클 반복
//   · 그림 계산은 js/sim/ald-surface.js의 pose()를 그대로 씀 (단계·진행·사이클 → 분자 위치)
//   · 재생 시계는 gsap.ticker. 그림이 화면 밖이거나 탭이 숨겨지면 멈춤
//   · 오른쪽 위 작은 챔버 단면: 지금 열린 밸브만 하늘색 (휴대폰은 글씨를 빼고 밸브만 크게)
//   · 사이드 노트: 각 단계 안 <details> 메모를 오른쪽 칸으로 옮겨 보여 줌 (좁은 화면은 단계 안 접는 메모 그대로)
// ② 실험대 [data-bench] (시안 A 일부): 손잡이 4개 → 실행 → 챔버 사이클 → 위치별 막 두께 막대 + 결과 문구(막대 바로 아래) + 온도 창 그림 + 미션
//
// 정지 화면(움직임 줄이기·?still=1 등): ① 자동 재생 대신 단계마다 정지 그림을 세로로 나열 ② 실행하면 바로 결과
// 색은 css/style.css의 변수만 클래스로 씀 (JS에 색 없음)
// 의존: vendor/gsap/gsap.min.js, ScrollTrigger.min.js, js/motion-pref.js, js/sim/sx-engine.js(단계 전환·시계), js/sim/ald-surface.js
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
    // 휴대폰(899px 이하): 글씨(전구체·반응 기체·퍼지)는 CSS로 숨기고, 밸브~챔버 부분만 잘라 크게 보여 줌
    const svg = $("svg", holder), mq = window.matchMedia("(max-width: 899px)");
    const fit = () => svg.setAttribute("viewBox", mq.matches ? "86 6 134 122" : "0 0 220 128");
    fit();
    if (mq.addEventListener) mq.addEventListener("change", fit); else if (mq.addListener) mq.addListener(fit);
    const valves = $$("[data-mvalve]", holder), flows = $$("[data-mflow]", holder);
    return (gas) => {
      valves.forEach((v) => v.classList.toggle("is-on", v.dataset.mvalve === gas));
      flows.forEach((f) => f.classList.toggle("is-on", f.dataset.mflow === gas));
    };
  }

  // =============================================================
  // ① 스크롤 단계 체험 — 단계 전환 + 자동 반복 재생 (PECVD 원리 페이지와 같은 방식)
  // =============================================================
  // 왼쪽 단계 글이 화면 가운데 띠를 지나면 그 단계가 "지금 단계"가 되고,
  // 가운데 그림은 그 단계 장면을 시간에 따라 저절로 반복한다(스크롤을 멈춰도 계속).
  // 단계마다 "장면 조각(seg)" 목록: 표면 그림 단계 i(0~3), 진행 a→b, 걸리는 시간 d초, 사이클 k
  const STEP_NAME = ["전구체 주입", "퍼지", "반응 기체 주입", "퍼지"];
  const GAS = ["prec", "purge", "react", "purge"];      // 표면 그림 단계 i → 열린 밸브
  const CYC_D = [1.7, 1.0, 1.7, 1.0];                   // 5단계(사이클 반복)에서 한 단계 시간
  const LOOPS = [
    { name: "전구체 주입 · 빈자리에 붙음", segs: [{ i: 0, a: 0, b: 1, d: 5 }], hold: 1.4 },
    { name: "자기 제한 · 다 차면 튕겨 나감", segs: [{ bounce: true, d: 2.6 }], hold: 0 },
    { name: "퍼지", segs: [{ i: 0, a: 1, b: 1, d: 0.8 }, { i: 1, a: 0, b: 1, d: 3.4 }], hold: 1.2, demo: "bad" },
    { name: "반응 기체 → 퍼지 · 한 층 완성", segs: [{ i: 2, a: 0, b: 1, d: 4.2 }, { i: 3, a: 0, b: 1, d: 3 }], hold: 1.4 },
    { name: "사이클 반복", segs: [1, 2, 3].flatMap((k) => [0, 1, 2, 3].map((i) => ({ i, a: 0, b: 1, d: CYC_D[i], k }))), hold: 1.8 }
  ];
  const NB = LOOPS.length;
  LOOPS.forEach((L) => { L.total = L.segs.reduce((s, g) => s + g.d, 0) + L.hold; });

  // 단계 b의 반복 시간 t(초) → {i, p, k, bounce, ph}
  function frameAt(b, t) {
    const L = LOOPS[b];
    let x = t % L.total;
    for (const g of L.segs) {
      if (x < g.d) return { i: g.i, p: lerp(g.a, g.b, x / g.d), k: g.k || 0, bounce: g.bounce, ph: x / g.d };
      x -= g.d;
    }
    const g = L.segs[L.segs.length - 1];                // 끝에서 잠깐 멈춤(hold): 마지막 모습 그대로
    return { i: g.i, p: g.b, k: g.k || 0, bounce: g.bounce, ph: 1 };
  }
  // 자기 제한 장면: 자리가 다 찬 표면 + 남는 분자만 다시 내려와 튕김
  function bounceFrame(ph) {
    const o = AldSurface.pose(0, 1, 0, false);
    o.E = AldSurface.pose(0, 0.45 + 0.55 * ph, 0, false).E;
    return o;
  }

  function descFor(b, f, o) {
    switch (b) {
      case 0: return o.filled < AldSurface.N ? `전구체가 표면의 빈자리에만 하나씩 붙습니다. 채워진 자리 ${o.filled}/${AldSurface.N}`
        : `빈자리가 모두 찼습니다. 채워진 자리 ${o.filled}/${AldSurface.N}`;
      case 1: return "자리가 다 찼습니다. 더 들어온 분자는 표면에 닿아도 붙지 못하고 튕겨 나옵니다.";
      case 2: return f.i === 0 ? "자리가 다 찬 뒤에도 붙지 못한 전구체가 떠 있습니다."
        : "퍼지 가스가 떠 있던 전구체를 배기 쪽으로 몰아냅니다. 표면에 붙은 전구체는 그대로입니다.";
      case 3: return f.i === 2 ? "반응 기체가 붙은 전구체와 반응해 막 한 줄이 됩니다. 반응에서 나온 부산물이 떨어져 나옵니다."
        : "남은 반응 기체와 부산물을 몰아내면 한 층 완성. 새 표면에 빈자리가 다시 생깁니다.";
      default: return `같은 네 단계를 반복합니다. 사이클 ${f.k + 1} · 쌓인 층 ${o.layers}`;
    }
  }
  function nameFor(b, f) {
    if (b === 3) return `${LOOPS[b].name} — 지금 ${STEP_NAME[f.i]}`;
    if (b === 4) return `사이클 반복 · ${f.k + 1}번째 사이클 ${f.i + 1}/4 ${STEP_NAME[f.i]}`;
    return LOOPS[b].name;
  }

  // 작은 창 자동 시연: 퍼지가 부족하면 → 반응 기체 단계에서 공중 알갱이
  const DEMO = {
    bad: { period: 4.2, frame(ph) {
      return ph < 0.35 ? AldSurface.pose(1, ph / 0.35, 0, true) : AldSurface.pose(2, Math.min(0.92, (ph - 0.35) / 0.6), 0, true);
    } }
  };

  function setupStory(root) {
    const A = window.AldSurface;
    const steps = $$("[data-beat]", root);
    if (!A || !steps.length) return;

    // 정지 화면: 단계마다 정지 그림을 글 위에 넣고, 고정 그림·사이드 노트 칸은 숨김
    if (isStill() || !window.gsap || !window.ScrollTrigger || !window.SxEngine) { buildStill(root, steps); return; }

    const svgBox = $("[data-sx-svg]", root);
    const svgEl = A.buildSvg(svgBox);
    const setGas = miniChamber($("[data-sx-ch]", root));
    const nameEl = $("[data-sx-name]", root), descEl = $("[data-sx-desc]", root);
    const demoBox = $("[data-sx-demo]", root);
    const demoEl = A.buildSvg($("[data-sx-demo-svg]", root));
    demoEl.svg = $("[data-sx-demo-svg] svg", root);
    if (demoEl.svg) { demoEl.svg.setAttribute("aria-hidden", "true"); demoEl.svg.removeAttribute("role"); }
    const caps = $$("[data-demo-cap]", root);

    // ---- 그리기: 지금 단계 cur, 그 단계 안 반복 시간 loopT (시계·스크롤은 js/sim/sx-engine.js) ----
    let lastText = "";
    function draw(cur, loopT) {
      const f = frameAt(cur, loopT);
      const o = f.bounce ? bounceFrame(f.ph) : A.pose(f.i, f.p, f.k, false);
      A.apply(svgEl, o);
      const name = nameFor(cur, f), d = descFor(cur, f, o);
      if (name + "|" + d !== lastText) {
        lastText = name + "|" + d;
        nameEl.innerHTML = `<span class="sim-stage-num">${cur + 1}/${NB}</span>${name}`;
        descEl.textContent = d;
        setGas(f.bounce ? "prec" : GAS[f.i]);           // 작은 챔버: 지금 열린 밸브만 하늘색
      }
      const D = LOOPS[cur].demo && DEMO[LOOPS[cur].demo];
      if (D) A.apply(demoEl, D.frame((loopT / D.period) % 1));
    }

    // ---- 단계가 바뀐 순간: 작은 창(퍼지 부족) 보이기/숨기기 ----
    function onActivate(b) {
      lastText = "";
      const kind = LOOPS[b].demo || null;
      demoBox.hidden = !kind;
      root.classList.toggle("has-demo", !!kind);
      caps.forEach((c) => { c.hidden = c.dataset.demoCap !== kind; });
    }

    SxEngine.story(root, { total: (b) => LOOPS[b].total, lapSoften: (b) => !!LOOPS[b].hold, draw, onActivate });
  }

  // 정지 화면: 각 단계 글 위에 그 단계 대표 모습 (+ 작은 챔버, 퍼지 단계는 "부족하면" 비교 그림)
  function buildStill(root, steps) {
    const A = window.AldSurface;
    root.classList.add("is-still");
    const ENDS = [[0, 1, 0], [0, 1, 0], [1, 1, 0], [2, 1, 0], [3, 1, 3]];
    const STILL_GAS = ["prec", "prec", "purge", "react", "purge"];
    const STILL_NAME = ["전구체 주입 · 빈자리가 다 참", "자기 제한", "퍼지", "반응 기체 · 막 한 줄", "사이클 반복 · 4층"];
    steps.forEach((st, b) => {
      const fig = document.createElement("figure");
      fig.className = "sx-still-fig";
      fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${STILL_NAME[b]}</p><div class="sx-ch-box"></div></div><div class="sx-svg-box"></div>`;
      st.insertBefore(fig, $("h3", st));
      const el = A.buildSvg($(".sx-svg-box", fig));
      const [i, p, k] = ENDS[b];
      A.apply(el, b === 1 ? bounceFrame(0.55) : A.pose(i, p, k, false));
      miniChamber($(".sx-ch-box", fig))(STILL_GAS[b]);
      if (LOOPS[b].demo === "bad") {             // 비교: 퍼지가 부족하면 → 공중에서 알갱이
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
      ok: '<a href="#self-limiting">위 2단계: 자기 제한 다시 보기</a>',
      purge: '<a href="#sim">위 3단계: 퍼지 다시 보기</a> · 현장에서는 파티클이 갑자기 늘면 퍼지 유량·시간·ALD 밸브부터 의심합니다 <span class="verify-tag">검증 필요</span>',
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
