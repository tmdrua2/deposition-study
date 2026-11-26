// =============================================================
// PECVD 공정변수 페이지 (equipment/pecvd/parameters.html) — ① 스크롤 단계 체험 ② 맨 아래 조작 그림 미션
//   형식은 ALD 공정변수 페이지와 같음 (단계 전환·반복 재생은 js/sim/sx-engine.js)
//
// ① [data-sx] 단계 7개: 히터 온도 / 챔버 압력 / RF 전력 / 가스 비율 / 샤워헤드–히터 간격 /
//    단일·이중 주파수 / 변수는 서로 얽혀 있다
//    가운데 그림: 그 변수를 낮게→높게 천천히 바꾸며 반복 (숫자 없이 방향만)
//      · 왼쪽 챔버 단면: 플라즈마 밝기, 원료 분자 수(압력), 히터 빛(온도), 간격, 스로틀 밸브 날개, 기체 속 알갱이(파티클)
//      · 오른쪽 막 단면(확대): 두께 = 막 높이, 치밀함 = 원자 간격, 수소 = 작은 점, 이온 화살표가 막을 두드리는 세기
//      · 아래 두께 분포 곡선: 가운데·가장자리 두께 차이(균일도), 간격이 좁으면 구멍 흔적 물결
//      · 그림 밑 막대 3개: 함께 달라지는 것 (길이만)
//      · 마지막 단계는 그림 대신 "얽힘 사슬"이 차례로 켜짐
// ② [data-pl-missions] 미션 3개: js/figs/param-lab.js가 만든 버튼 상태를 읽어 체크 (그리는 코드는 손대지 않음)
//
// 정지 화면(움직임 줄이기·?still=1): 단계마다 "낮게 / 높게" 정지 그림 두 장을 나란히
// 그림은 경향을 보여 주는 개념도. 색은 css/style.css 변수만 클래스로 씀 (플라즈마 빛 = --coral, 강조 = 공정 색)
// 의존: gsap, ScrollTrigger, motion-pref.js, sx-engine.js
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };   // 늘 같은 "무작위" 값
  const f1 = (v) => v.toFixed(1);

  // ---------- 그림 좌표 (viewBox 640 × 300) ----------
  const SH = { x0: 62, x1: 278, y: 64, h: 10 };          // 샤워헤드 판
  const SHB = SH.y + SH.h;                                // 샤워헤드 아래면
  const gapPx = (g) => 54 + 70 * g;                       // 간격 0~1 → 샤워헤드 아래면 ~ 웨이퍼 윗면
  const HOLES = [84, 112, 140, 170, 200, 228, 256];
  const FZ = { x0: 362, w: 256, base: 206 };              // 막 단면 확대 (기판 윗면 = base)
  const PROF = { x0: 372, x1: 612, ref: 280 };            // 두께 분포 곡선

  // ---------- 기준 상태 (모든 값 0~1, 경향용) ----------
  const BASE = { bright: 0.55, rate: 0.55, dens: 0.55, h: 0.45, ion: 0.45, si: 0.5, gap: 0.5, press: 0.5,
    heat: 0.5, grains: 0, prof: 0.1, ripple: 0.03, lf: 0, unstable: 0 };

  // ---------- 단계별 내용 ----------
  //   st(x): 변수 값 x(0 = 낮게, 1 = 높게)일 때 기준에서 달라지는 것
  //   hot: 그림에서 강조할 부품 (heater · throttle · rf · gas · gap)
  const VARS = [
    { name: "히터 온도", lo: "낮게", hi: "높게", hot: "heater",
      st: (x) => ({ heat: x, dens: 0.25 + 0.6 * x, h: 0.85 - 0.7 * x }),
      meters: [["막 밀도", (s) => s.dens], ["막 속 수소", (s) => s.h], ["아래 소자 열 부담", (s) => 0.1 + 0.85 * s.heat]],
      desc: (x) => x < 0.5 ? "온도가 낮으면 수소가 덜 빠져나가 막 속에 많이 남고, 원자가 덜 움직여 성긴 막이 됩니다. 아래 소자의 열 부담은 적습니다."
        : "온도가 높으면 수소가 빠져나가고 원자가 제자리를 찾아 막이 치밀해집니다. 대신 아래 소자가 견딜 수 있는 열(열 예산)에 막힙니다." },
    { name: "챔버 압력", lo: "낮게", hi: "높게", hot: "throttle",
      st: (x) => ({ press: x, rate: 0.32 + 0.48 * x, ion: 0.8 - 0.6 * x, dens: 0.72 - 0.32 * x, grains: clamp((x - 0.55) / 0.45, 0, 1), prof: -0.5 + x }),
      meters: [["증착 속도", (s) => s.rate], ["이온 충돌 세기", (s) => s.ion], ["파티클 위험", (s) => 0.08 + 0.9 * s.grains]],
      desc: (x) => x < 0.5 ? "압력이 낮으면 분자가 덜 부딪혀, 이온이 에너지를 덜 잃고 막을 세게 두드립니다. 원료 공급이 줄어 느려질 수 있습니다."
        : "압력이 높으면 원료가 많아 빨라지지만, 분자끼리 자주 부딪혀 기체 속에서 먼저 생긴 알갱이(파티클)가 늘기 쉽습니다. 두께 분포 모양도 달라집니다." },
    { name: "RF 전력", lo: "낮게", hi: "높게", hot: "rf",
      st: (x) => ({ bright: 0.12 + 0.85 * x, rate: 0.18 + 0.62 * (1 - Math.pow(1 - x, 2.2)), ion: 0.18 + 0.72 * x, dens: 0.3 + 0.55 * x,
        grains: clamp((x - 0.75) / 0.25, 0, 1) * 0.6, unstable: x < 0.1 ? 1 - x / 0.1 : 0 }),
      meters: [["플라즈마 밝기", (s) => s.bright], ["증착 속도", (s) => s.rate], ["응력: 압축 쪽으로", (s) => s.ion]],
      desc: (x) => x < 0.5 ? "전력이 낮으면 가스가 덜 쪼개져 느려지고, 너무 낮으면 플라즈마가 깜빡이며 불안정해집니다."
        : "전력을 올리면 분해가 늘어 빨라지다가, 원료가 거의 다 쪼개지면 더 늘지 않습니다. 이온 충돌이 늘어 막이 치밀해지고 응력은 압축 쪽으로 갑니다." },
    { name: "가스 비율 (SiH₄ : NH₃)", lo: "질소 쪽", hi: "실리콘 쪽", hot: "gas",
      st: (x) => ({ si: 0.2 + 0.65 * x, rate: 0.4 + 0.3 * x, h: 0.3 + 0.4 * x, grains: clamp((x - 0.7) / 0.3, 0, 1) * 0.7 }),
      meters: [["굴절률", (s) => 0.12 + 0.82 * (s.si - 0.2) / 0.65], ["증착 속도", (s) => s.rate], ["Si–H 수소", (s) => s.h]],
      desc: (x) => x < 0.5 ? "NH₃가 많으면 질소가 많은 막이 되어 굴절률이 내려갑니다. 증착 속도는 줄 수 있습니다."
        : "SiH₄가 많으면 실리콘이 많은 막이 되어 굴절률이 오르고 빨라집니다. Si–H 형태의 수소와 기체 속 알갱이 위험이 늘 수 있습니다." },
    { name: "샤워헤드–히터 간격", lo: "좁게", hi: "넓게", hot: "gap",
      st: (x) => ({ gap: x, bright: 0.75 - 0.3 * x, rate: 0.78 - 0.45 * x, ripple: 0.16 * Math.pow(1 - x, 2), unstable: x > 0.85 ? (x - 0.85) / 0.15 * 0.7 : 0 }),
      meters: [["증착 속도", (s) => s.rate], ["구멍 흔적 (두께 얼룩)", (s) => s.ripple / 0.16], ["플라즈마 불안정", (s) => 0.06 + 0.9 * s.unstable]],
      desc: (x) => x < 0.5 ? "간격이 좁으면 플라즈마가 웨이퍼 가까이 모여 빨라지지만, 샤워헤드 구멍 흔적이 두께에 비치고 간격 편차(평행)에 민감해집니다."
        : "간격이 넓으면 가스가 더 퍼져 흔적은 줄지만, 같은 전력에서 전기장이 약해져 느려지고 너무 넓으면 플라즈마가 불안정해질 수 있습니다." },
    { name: "단일 주파수와 이중 주파수", lo: "HF만", hi: "HF + LF", hot: "rf", dual: true,
      st: (x) => ({ lf: x, ion: 0.2 + 0.75 * x, dens: 0.35 + 0.55 * x, bright: 0.62 }),
      meters: [["플라즈마 밀도 (HF)", (s) => s.bright], ["이온 충돌 세기 (LF)", (s) => s.ion], ["응력: 압축 쪽으로", (s) => s.ion]],
      desc: (x) => x < 0.5 ? "고주파(HF)만 걸면 무거운 이온이 빠르게 바뀌는 전기장을 잘 따라가지 못해 약하게 부딪힙니다. 전력 하나가 분해와 충돌을 함께 정합니다."
        : "저주파(LF)를 더하면 이온이 천천히 바뀌는 전기장에서 크게 가속되어 막을 세게 두드립니다. 증착 속도는 HF로 두고 막 밀도·응력만 따로 움직일 수 있습니다." },
    { kind: "chain", name: "변수는 서로 얽혀 있다" }
  ];
  const SWEEP = 5.4, HOLD = 1.6;
  const CHAIN_T = 3.6;                                    // 사슬 한 줄이 다 켜지는 시간
  const totalOf = (b) => (VARS[b].kind === "chain" ? CHAIN_T * 3 + 1.4 : SWEEP + HOLD);
  const xAt = (t) => 0.04 + 0.92 * ease(clamp(t / SWEEP, 0, 1));

  // =============================================================
  // 그림 하나 만들기 (스크롤 그림·정지 그림이 같이 씀)
  // =============================================================
  let figN = 0;
  function makeFig(holder, withChain) {
    const uid = "ppg" + (++figN);
    holder.innerHTML =
      `<div class="pp-fig"><svg class="pp-svg" viewBox="0 0 640 300" role="img" aria-label="왼쪽은 PECVD 챔버 단면, 오른쪽은 웨이퍼 위 막 단면을 확대한 개념 그림. 아래 곡선은 웨이퍼 가장자리에서 가운데까지의 두께 분포"></svg>` +
      `<div class="pp-meters"></div></div>` +
      (withChain ? `<div class="ps-chain" hidden>` +
        chainRow(["수소를 줄이고 싶음", "온도는 열 예산에 막힘", "RF·LF로 이온 충돌↑", "응력이 압축 쪽으로"]) +
        chainRow(["속도를 올리고 싶음", "RF·압력·SiH₄ 올림", "기체 속 반응 → 파티클", "응력·굴절률도 움직임"]) +
        chainRow(["압력만 바꿈", "머무는 시간·이온 충돌", "플라즈마 퍼지는 모양", "균일도 모양이 달라짐"]) +
      `</div>` : "");
    const svg = holder.querySelector(".pp-svg");
    const meters = holder.querySelector(".pp-meters");
    const chainNodes = [...holder.querySelectorAll(".ps-node")];

    // ---- 그라데이션 (플라즈마 빛) ----
    const defs = mk("defs", {}, svg);
    const rg = mk("radialGradient", { id: uid, cx: "50%", cy: "50%", r: "62%" }, defs);
    mk("stop", { offset: "0%", class: "pp-glow-s0" }, rg);
    mk("stop", { offset: "100%", class: "pp-glow-s1" }, rg);

    // ---- 챔버 단면 ----
    mk("path", { class: "pp-wall", d: "M24 40 H316 V272 H24 Z" }, svg);
    const gGas = mk("g", { class: "pp-hotable", "data-hot": "gas" }, svg);
    mk("path", { class: "pp-pipe", d: `M2 52 H${SH.x0}` }, gGas);
    mk("text", { class: "pp-t pp-t-minor", x: 4, y: 34 }, gGas).textContent = "가스";
    const inDots = [0, 1, 2].map((k) => mk("circle", { class: "pp-m", r: 3.4, cx: -9, cy: 52 }, gGas));
    // RF 전원 두 개 (단일 주파수 카드는 하나만 "RF")
    const gRf = mk("g", { class: "pp-hotable", "data-hot": "rf" }, svg);
    mk("path", { class: "pp-pipe is-rf", d: "M156 28 V64" }, gRf);
    mk("rect", { class: "pp-rfbox", x: 128, y: 4, width: 56, height: 24, rx: 6 }, gRf);
    const rfAT = mk("text", { class: "pp-t pp-t-strong", x: 156, y: 21, "text-anchor": "middle" }, gRf);
    const gRfB = mk("g", { class: "pp-rfb" }, gRf);
    mk("path", { class: "pp-pipe is-rf", d: "M236 28 V64" }, gRfB);
    mk("rect", { class: "pp-rfbox", x: 208, y: 4, width: 56, height: 24, rx: 6 }, gRfB);
    mk("text", { class: "pp-t pp-t-strong", x: 236, y: 21, "text-anchor": "middle" }, gRfB).textContent = "LF";
    // 샤워헤드
    const gShow = mk("g", { class: "pp-hotable", "data-hot": "shower" }, svg);
    mk("rect", { class: "pp-shower", x: SH.x0, y: SH.y, width: SH.x1 - SH.x0, height: SH.h, rx: 2 }, gShow);
    HOLES.forEach((hx) => mk("rect", { class: "pp-hole", x: hx - 1.5, y: SH.y + 2, width: 3, height: SH.h - 2 }, gShow));
    mk("text", { class: "pp-t pp-t-minor", x: SH.x0 + 4, y: SH.y - 6 }, gShow).textContent = "샤워헤드";
    // 플라즈마 빛 · 시스(웨이퍼 바로 위 어두운 띠)
    const plasma = mk("rect", { class: "pp-plasma", x: SH.x0, y: SHB, width: SH.x1 - SH.x0, height: 60, fill: `url(#${uid})` }, svg);
    const plasmaT = mk("text", { class: "pp-t pp-t-plasma", x: (SH.x0 + SH.x1) / 2, y: 110, "text-anchor": "middle" }, svg);
    plasmaT.textContent = "플라즈마";
    const sheath = mk("rect", { class: "pp-sheath", x: 88, y: 0, width: 164, height: 7 }, svg);
    // 원료 분자 · 기체 속 알갱이
    const mols = Array.from({ length: 22 }, () => mk("circle", { class: "pp-m", r: 3, cx: -9, cy: -9 }, svg));
    const grains = Array.from({ length: 8 }, () => mk("circle", { class: "pp-grain", r: 3.4, cx: -9, cy: -9 }, svg));
    // 히터 + 웨이퍼 (간격에 따라 위아래로)
    const gHeat = mk("g", { class: "pp-hotable", "data-hot": "heater" }, svg);
    const stem = mk("rect", { class: "pp-stem", x: 156, y: 0, width: 28, height: 140 }, gHeat);   // 받침대: 챔버 바닥까지
    mk("rect", { class: "pp-heater", x: 72, y: 5, width: 196, height: 20, rx: 3 }, gHeat);
    const heatGlow = mk("rect", { class: "pp-heat", x: 72, y: 5, width: 196, height: 20, rx: 3 }, gHeat);
    mk("rect", { class: "pp-wafer", x: 88, y: 0, width: 164, height: 5 }, gHeat);
    mk("text", { class: "pp-t pp-t-minor pp-t-in", x: 170, y: 20, "text-anchor": "middle" }, gHeat).textContent = "히터";
    // 간격 치수선 (간격 단계에서만)
    const gGap = mk("g", { class: "pp-gapdim" }, svg);
    const gapLine = mk("path", { class: "pp-dim", d: "" }, gGap);
    const gapT = mk("text", { class: "pp-t pp-t-strong", x: 40, y: 0, "text-anchor": "middle" }, gGap);
    gapT.textContent = "간격";
    // 배기 + 스로틀 밸브 (압력)
    const gThr = mk("g", { class: "pp-hotable", "data-hot": "throttle" }, svg);
    mk("path", { class: "pp-pipe", d: "M300 272 V298" }, gThr);
    mk("circle", { class: "pp-valve", cx: 300, cy: 286, r: 9 }, gThr);
    const blade = mk("line", { class: "pp-blade", x1: 292, y1: 286, x2: 308, y2: 286 }, gThr);
    mk("text", { class: "pp-t pp-t-minor", x: 286, y: 291, "text-anchor": "end" }, gThr).textContent = "스로틀 밸브 → 펌프";

    // ---- 막 단면 확대 ----
    const zoomLink = mk("path", { class: "pp-zlink", d: "" }, svg);
    mk("rect", { class: "pp-zoom", x: 348, y: 28, width: 284, height: 200, rx: 12 }, svg);
    mk("text", { class: "pp-t pp-t-strong", x: 360, y: 48 }, svg).textContent = "막 단면 (확대)";
    const ionT = mk("text", { class: "pp-t pp-t-minor", x: 620, y: 48, "text-anchor": "end" }, svg);
    ionT.textContent = "이온 ↓";
    mk("rect", { class: "pp-sub", x: FZ.x0 - 2, y: FZ.base, width: FZ.w + 4, height: 14 }, svg);
    const film = mk("rect", { class: "pp-film", x: FZ.x0 - 2, y: 150, width: FZ.w + 4, height: 56 }, svg);
    const atoms = Array.from({ length: 190 }, () => mk("circle", { class: "pp-at", r: 5.2, cx: -20, cy: -20 }, svg));
    const hs = Array.from({ length: 20 }, () => mk("circle", { class: "pp-hd", r: 2.4, cx: -20, cy: -20 }, svg));
    const zions = [392, 452, 520, 584].map(() => mk("path", { class: "pp-ion", d: "" }, svg));
    const flashes = zions.map(() => mk("circle", { class: "pp-flash", r: 0, cx: -20, cy: -20 }, svg));
    // 범례
    const lg = mk("g", { class: "pp-legend" }, svg);
    mk("circle", { class: "pp-at", cx: 368, cy: 241, r: 5 }, lg);
    const lgSi = mk("text", { class: "pp-t pp-t-minor", x: 378, y: 245 }, lg);
    const lgN = mk("g", {}, lg);
    mk("circle", { class: "pp-at is-n", cx: 418, cy: 241, r: 5 }, lgN);
    mk("text", { class: "pp-t pp-t-minor", x: 428, y: 245 }, lgN).textContent = "N";
    mk("circle", { class: "pp-hd", cx: 460, cy: 241, r: 2.6 }, lg);
    mk("text", { class: "pp-t pp-t-minor", x: 468, y: 245 }, lg).textContent = "수소";
    // 두께 분포
    mk("text", { class: "pp-t pp-t-minor", x: 520, y: 245 }, svg).textContent = "두께 분포 ↓";
    mk("line", { class: "pp-ref", x1: PROF.x0, x2: PROF.x1, y1: PROF.ref, y2: PROF.ref }, svg);
    const prof = mk("path", { class: "pp-prof", d: "" }, svg);
    mk("text", { class: "pp-t pp-t-tiny", x: PROF.x0, y: 298 }, svg).textContent = "가장자리";
    mk("text", { class: "pp-t pp-t-tiny", x: (PROF.x0 + PROF.x1) / 2, y: 298, "text-anchor": "middle" }, svg).textContent = "가운데";
    mk("text", { class: "pp-t pp-t-tiny", x: PROF.x1, y: 298, "text-anchor": "end" }, svg).textContent = "가장자리";

    // ---- 단계가 바뀔 때 뼈대 ----
    let built = -1, meterEls = [], filmKey = "";
    function build(b) {
      built = b;
      const V = VARS[b];
      const chain = V.kind === "chain";
      holder.querySelector(".pp-fig").hidden = chain;
      const ch = holder.querySelector(".ps-chain");
      if (ch) ch.hidden = !chain;
      if (chain) return;
      svg.querySelectorAll(".pp-hotable").forEach((g) => g.classList.toggle("is-hot",
        g.dataset.hot === V.hot || (V.hot === "gap" && (g.dataset.hot === "shower" || g.dataset.hot === "heater"))));
      gGap.style.display = V.hot === "gap" ? "" : "none";
      rfAT.textContent = V.dual ? "HF" : "RF";
      gRfB.style.display = V.dual ? "" : "none";
      lgSi.textContent = "Si";
      meters.innerHTML = V.meters.map(([n]) => `<div class="pp-meter"><span class="pp-meter-n">${n}</span><span class="ps-meter-tr"><i></i></span></div>`).join("");
      meterEls = [...meters.querySelectorAll("i")];
      filmKey = "";
    }

    // ---- 막 원자 배치 (값이 바뀔 때만 다시) ----
    function layFilm(s, top, hFilm) {
      const key = [s.dens, s.si, hFilm].map((v) => Math.round(v * 40)).join(",");
      if (key === filmKey) return;
      filmKey = key;
      const sp = 22 - 8.5 * s.dens;                        // 원자 간격: 치밀할수록 좁음
      const cols = Math.floor(FZ.w / sp), rows = Math.max(1, Math.floor(hFilm / sp));
      const ox = FZ.x0 + (FZ.w - cols * sp) / 2 + sp / 2;
      const jit = (1 - s.dens) * sp * 0.3;                 // 성긴 막은 줄이 흐트러짐
      let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols && k < atoms.length; c++, k++) {
        const a = atoms[k];
        a.setAttribute("cx", f1(ox + c * sp + (rnd(k, 1) - 0.5) * 2 * jit));
        a.setAttribute("cy", f1(FZ.base - sp / 2 - r * sp + (rnd(k, 2) - 0.5) * 2 * jit));
        a.classList.toggle("is-n", rnd(k, 7) >= s.si);
      }
      for (; k < atoms.length; k++) atoms[k].setAttribute("cx", -20);
      // 수소: 원자 사이 빈틈에
      const nH = Math.round(s.h * hs.length);
      hs.forEach((d, i) => {
        if (i >= nH) { d.setAttribute("cx", -20); return; }
        const c = Math.floor(rnd(i, 3) * Math.max(1, cols - 1)), r = Math.floor(rnd(i, 5) * rows);
        d.setAttribute("cx", f1(ox + c * sp + sp / 2));
        d.setAttribute("cy", f1(FZ.base - sp - r * sp));
      });
    }

    // ---- 단계 b, 변수 값 x(0~1), 반복 시간 t → 그림 ----
    function set(b, x, t) {
      if (b !== built) build(b);
      const V = VARS[b];
      if (V.kind === "chain") {                          // 사슬: 한 줄씩 차례로 켜짐 (t < 0이면 모두 켬)
        chainNodes.forEach((n, k) => {
          const r = Math.floor(k / 4), c = k % 4;
          const on = t < 0 || t >= r * CHAIN_T + c * (CHAIN_T / 4.4);
          n.classList.toggle("is-on", on);
          n.classList.toggle("is-now", t >= 0 && on && Math.floor(t / CHAIN_T) === r);
        });
        return;
      }
      const s = Object.assign({}, BASE, V.st(x));
      const gp = gapPx(s.gap), wy = SHB + gp;           // 웨이퍼 윗면

      // 히터·웨이퍼·시스
      gHeat.setAttribute("transform", `translate(0 ${f1(wy)})`);
      stem.setAttribute("height", f1(Math.max(0, 272 - wy)));
      heatGlow.style.opacity = (0.06 + 0.8 * s.heat).toFixed(3);
      sheath.setAttribute("y", f1(wy - 7));
      // 플라즈마 밝기 (불안정하면 깜빡임)
      const flick = s.unstable ? 1 - s.unstable * 0.75 * (0.5 + 0.5 * Math.sin(t * 29) * Math.sin(t * 11.3)) : 1;
      plasma.setAttribute("height", f1(gp - 7));
      plasma.style.opacity = ((0.08 + 0.9 * s.bright) * flick).toFixed(3);
      plasmaT.setAttribute("y", f1(SHB + gp * 0.32 + 5));
      // 간격 치수선
      if (V.hot === "gap") {
        gapLine.setAttribute("d", `M40 ${SHB} V${f1(wy)} M34 ${SHB} H46 M34 ${f1(wy)} H46`);
        gapT.setAttribute("y", f1(SHB + gp / 2 + 5));
        gapT.setAttribute("x", 40);
      }
      // 원료 분자: 압력이 높을수록 많이, 색 = SiH4(밝은 원) / NH3(옅은 파랑)
      const nM = Math.round(6 + s.press * 16);
      mols.forEach((m, i) => {
        if (i >= nM) { m.setAttribute("cx", -9); return; }
        const p = (t * 0.42 + rnd(i, 2)) % 1;
        m.setAttribute("cx", f1(HOLES[i % HOLES.length] + (rnd(i, 4) - 0.5) * 12 + Math.sin(t * 2 + i) * 2));
        m.setAttribute("cy", f1(SHB + 4 + p * (gp - 14)));
        m.style.opacity = (1 - Math.pow(p, 3)).toFixed(2);
        m.classList.toggle("is-n", rnd(i, 9) >= s.si);
      });
      inDots.forEach((d, k) => {
        const p = (t * 0.6 + k / 3) % 1;
        d.setAttribute("cx", f1(4 + p * (SH.x0 - 8)));
        d.classList.toggle("is-n", rnd(k + 30, 9) >= s.si);
      });
      // 기체 속 알갱이 (파티클)
      const nG = Math.round(s.grains * grains.length);
      grains.forEach((g, i) => {
        if (i >= nG) { g.setAttribute("cx", -9); return; }
        g.setAttribute("cx", f1(92 + rnd(i, 4) * 150 + Math.sin(t * 0.9 + i) * 6));
        g.setAttribute("cy", f1(SHB + gp * (0.22 + 0.5 * rnd(i, 6)) + Math.cos(t * 1.1 + i) * 4));
      });
      // 스로틀 밸브: 압력이 높을수록 닫힘(날개가 눕는다)
      const ang = (90 - 78 * s.press) * Math.PI / 180;
      blade.setAttribute("x1", f1(300 - 8 * Math.cos(ang))); blade.setAttribute("y1", f1(286 + 8 * Math.sin(ang)));
      blade.setAttribute("x2", f1(300 + 8 * Math.cos(ang))); blade.setAttribute("y2", f1(286 - 8 * Math.sin(ang)));
      // LF 전원 (이중 주파수)
      if (V.dual) gRfB.style.opacity = (0.15 + 0.85 * s.lf).toFixed(2);

      // 막 단면: 두께 = 높이
      const hFilm = 26 + s.rate * 112, top = FZ.base - hFilm;
      film.setAttribute("y", f1(top)); film.setAttribute("height", f1(hFilm));
      layFilm(s, top, hFilm);
      zoomLink.setAttribute("d", `M252 ${f1(wy)} L348 ${f1(clamp(top, 60, 200))}`);
      // 이온: 세기 = 화살표 길이·속도·부딪힘 빛
      zions.forEach((z, i) => {
        const xx = [392, 452, 520, 584][i];
        const p = (t * (0.45 + 1.5 * s.ion) + i * 0.27) % 1;
        const len = 8 + 26 * s.ion, y0 = 60, yEnd = top - 2;
        const yh = y0 + len + p * (yEnd - y0 - len);
        z.setAttribute("d", `M${xx} ${f1(yh - len)} V${f1(yh)} M${xx - 4} ${f1(yh - 6)} L${xx} ${f1(yh)} L${xx + 4} ${f1(yh - 6)}`);
        z.style.opacity = (0.3 + 0.7 * s.ion).toFixed(2);
        const fl = flashes[i];
        if (p > 0.86) {
          const q = (p - 0.86) / 0.14;
          fl.setAttribute("cx", xx); fl.setAttribute("cy", f1(top));
          fl.setAttribute("r", f1(2 + q * (4 + 12 * s.ion)));
          fl.style.opacity = ((1 - q) * (0.25 + 0.75 * s.ion)).toFixed(2);
        } else fl.style.opacity = 0;
      });
      // 두께 분포: 모양(가운데 두꺼움 ↔ 가장자리 두꺼움) + 구멍 흔적 물결
      let d = "";
      for (let n = 0; n <= 60; n++) {
        const u = n / 60, c = 1 - Math.pow(2 * u - 1, 2);
        const v = s.prof * 0.55 * (c - 0.6) + s.ripple * Math.sin(u * Math.PI * 14 + 0.6);
        d += (n ? " L" : "M") + f1(PROF.x0 + u * (PROF.x1 - PROF.x0)) + " " + f1(PROF.ref - 50 * v);
      }
      prof.setAttribute("d", d);
      // 막대
      V.meters.forEach(([, fn], k) => { meterEls[k].style.transform = `scaleX(${clamp(fn(s), 0, 1).toFixed(3)})`; });
    }
    return { set };
  }
  function chainRow(items) {
    return `<div class="ps-chain-row">` + items.map((t, k) => (k ? `<span class="ps-arrow" aria-hidden="true">→</span>` : "") + `<span class="ps-node">${t}</span>`).join("") + `</div>`;
  }

  // =============================================================
  // ① 스크롤 단계 체험
  // =============================================================
  function setupStory(root) {
    const E = window.SxEngine;
    if (!E) return;
    const $ = E.$;
    if (E.isStill() || !window.gsap || !window.ScrollTrigger) { buildStill(root); return; }

    const fig = makeFig($("[data-sx-svg]", root), true);
    const nameEl = $("[data-sx-name]", root), descEl = $("[data-sx-desc]", root);
    const gauge = $("[data-sx-gauge]", root);
    const gDot = $(".ps-gauge-dot", gauge), gLo = $("[data-g-lo]", gauge), gHi = $("[data-g-hi]", gauge);
    const NB = VARS.length;
    let lastDesc = "";
    function draw(b, t) {
      const V = VARS[b];
      if (V.kind === "chain") { fig.set(b, 0, t); return; }
      const x = xAt(t);
      fig.set(b, x, t);
      gDot.style.left = (x * 100).toFixed(1) + "%";
      const d = V.desc(x);
      if (d !== lastDesc) { lastDesc = d; descEl.textContent = d; }
    }
    function onActivate(b) {
      const V = VARS[b];
      lastDesc = "";
      nameEl.innerHTML = `<span class="sim-stage-num">${b + 1}/${NB}</span>${V.name}${V.kind === "chain" ? "" : ` · ${V.lo} → ${V.hi}`}`;
      gauge.hidden = V.kind === "chain";
      if (V.kind !== "chain") { gLo.textContent = V.lo; gHi.textContent = V.hi; }
      else descEl.textContent = "원하는 결과 하나를 얻으려고 여러 변수를 함께 움직이면, 다른 결과도 따라 움직입니다. 그래서 목표를 한꺼번에 보며 계획적으로 시험합니다.";
    }
    E.story(root, { total: totalOf, draw, onActivate, lapSoften: () => true, softEl: $("[data-sx-svg]", root) });
  }

  // 정지 화면: 단계마다 "낮게 / 높게" 두 장
  function buildStill(root) {
    const E = window.SxEngine;
    E.still(root, (step, b, fig) => {
      const V = VARS[b];
      if (V.kind === "chain") {
        fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${V.name}</p></div><div class="pp-still-one"></div>`;
        makeFig(fig.querySelector(".pp-still-one"), true).set(b, 0, -1);
        return;
      }
      fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${V.name} · ${V.lo} ↔ ${V.hi}</p></div>` +
        `<div class="pp-still-pair"><div><p class="pp-still-k">${V.lo}</p><div class="pp-still-a"></div></div>` +
        `<div><p class="pp-still-k">${V.hi}</p><div class="pp-still-b"></div></div></div>`;
      makeFig(fig.querySelector(".pp-still-a"), false).set(b, 0.06, 0.55);
      makeFig(fig.querySelector(".pp-still-b"), false).set(b, 0.94, 0.55);
      const p = document.createElement("p");
      p.className = "ps-still-desc";
      p.textContent = V.desc(0.1) + " " + V.desc(0.9);
      fig.appendChild(p);
    });
  }

  // =============================================================
  // ② 조작 그림 미션 (param-lab.js 상태를 읽기만 함)
  // =============================================================
  function setupMissions(box) {
    const lab = document.querySelector("[data-param-lab]");
    if (!lab) return;
    const done = new Set();
    const lv = (id) => +((lab.querySelector(`[data-var="${id}"]`) || {}).dataset || {}).level || 0;
    function check() {
      const L = { temp: lv("temp"), press: lv("press"), rf: lv("rf"), ratio: lv("ratio"), gap: lv("gap") };
      const changed = Object.values(L).filter(Boolean).length;
      const word = (id) => ((lab.querySelector(`[data-res="${id}"] .pl-res-word`) || {}).textContent || "");
      if (L.temp === 1 && changed === 1 && word("h") === "줄어듦") done.add("temp");
      if (L.rf === 1 && word("stress").indexOf("압축") === 0) done.add("rf");
      if (changed >= 2 && lab.querySelector('[data-state="mixed"]')) done.add("mix");
      box.querySelectorAll("[data-m]").forEach((li) => li.classList.toggle("is-done", done.has(li.dataset.m)));
      box.querySelector("[data-done]").textContent = String(done.size);
    }
    lab.addEventListener("click", () => setTimeout(check, 0));
    lab.addEventListener("keydown", () => setTimeout(check, 0));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-sx]").forEach(setupStory);
    document.querySelectorAll("[data-pl-missions]").forEach(setupMissions);
  });
})();
