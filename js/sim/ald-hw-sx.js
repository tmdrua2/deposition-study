// =============================================================
// ALD 장비 구성 페이지 (equipment/ald/hardware.html) — ① 스크롤 단계 체험 ② 맨 아래 작은 비교 그림
//   형식은 원리·공정 흐름 페이지와 같음 (단계 전환·반복 재생은 js/sim/sx-engine.js)
//
// ① [data-sx] 단계 5개 = PECVD 장비 구성의 "네 개의 길"을 ALD에 맞춘 것
//    공급(전구체·반응 기체·퍼지) → 진공·배기 → 가열·제어 → 이송 → 네 길이 만나는 곳(공정 챔버)
//    가운데 고정 그림 = ALD 장비 계통도. 지금 단계의 계통만 하늘색으로 켜지고 그 흐름이 반복 재생,
//    나머지 계통은 흐리게. 마지막 단계는 네 계통이 동시에 켜짐
//    오른쪽 위 칩 = 지금 켜진 길 (이송 단계는 웨이퍼가 있는 곳: 대기 쪽 / 경계: 로드락 / 진공 쪽)
//    휴대폰은 그림 글씨가 너무 작아지므로 단계마다 그 계통 부분만 잘라 크게 보여 줌
// ② [data-atc] 매엽식·배치식·공간 분할 비교: 세 방식 그림이 나란히, 기체가 바뀌거나 웨이퍼가 움직임
//
// 정지 화면(움직임 줄이기·?still=1): ① 단계마다 정지 그림을 세로로 ② 세 그림을 멈춘 한 장면으로
// 색은 css/style.css 변수만 클래스로 씀 (JS에 색 없음). 위치·속도는 그림 비율용, 실제 값 아님
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
  const txt = (x, y, s, cls, parent, anchor) =>
    Object.assign(mk("text", { x, y, class: cls || "hx-t", "text-anchor": anchor || "start" }, parent), { textContent: s });

  // ---- 계통도 위 길 (좌표는 viewBox 0 0 800 470 기준, 그림 비율용) ----
  const GAS = {                                   // 공급부 → ALD 밸브 → 샤워헤드 (세 길은 챔버 직전까지 따로)
    prec: "M126 52 H540 V238",
    react: "M126 111 H500 V238",
    purge: "M126 159 H460 V238"
  };
  const WRAP = "M126 52 H540 V188";                // 가열 배관 (전구체 길 중 챔버 밖 부분)
  const EXH = "M534 300 C572 302 566 340 560 372 V428";        // 펌핑 링 → 스로틀 → 포어라인 → 펌프 윗면
  const EXH2 = "M600 444 H640";                                  // 펌프 → 스크러버 (글자를 가로지르지 않게 따로)
  const SIG = {                                   // 제어기 → 밸브 / 히터 / 스로틀 (신호선)
    valve: "M680 78 V199 H562",
    heater: "M722 78 V326 H552",
    throttle: "M764 78 V398 H572"
  };
  const ROUTE = "M46 306 H224 H327 H470 L500 314"; // 웨이퍼 길: FOUP → EFEM → LL → TM → 슬릿 밸브 → 히터 위

  // 단계 정의: 켜는 계통, 한 바퀴 시간(초), 휴대폰에서 잘라 보여 줄 부분
  const SYS_NAME = { supply: "공급", vac: "진공·배기", heat: "가열·제어", xfer: "이송" };
  const STAGES = [
    { name: "공급 계통", sys: ["supply"], total: 6, crop: "16 6 600 320" },
    { name: "진공·배기 계통", sys: ["vac"], total: 6, crop: "396 210 404 260" },
    { name: "가열·제어 계통", sys: ["heat"], total: 6, crop: "16 6 784 400" },
    { name: "이송 계통", sys: ["xfer"], total: 8, crop: "10 236 600 160" },
    { name: "네 길이 만나는 곳: 공정 챔버", sys: ["supply", "vac", "heat", "xfer"], total: 6, crop: "380 150 420 320" }
  ];
  const FULL = "0 0 800 470";

  // 공급 순서: 전구체 → 퍼지 → 반응 기체 → 퍼지 (한 칸 1.5초)
  const ORDER = ["prec", "purge", "react", "purge"];
  const GAS_DESC = {
    prec: "전구체 펄스 — 데운 용기 → 가열 배관 → 전구체 밸브 → 챔버",
    purge: "퍼지 — 퍼지 가스가 남은 기체를 밀어냄 (다른 두 밸브는 닫힘)",
    react: "반응 기체 펄스 — MFC → 반응 기체 밸브 → 챔버"
  };
  const VAC_DESC = ["펌핑 링이 히터 둘레에서 기체를 고르게 빨아냄", "스로틀 밸브가 열림을 바꿔 챔버 압력을 맞춤", "포어라인 → 드라이 펌프 → 스크러버에서 처리"];
  const HEAT_DESC = ["용기·가열 배관·밸브 블록을 데워 전구체가 식어 붙지 않게", "히터가 웨이퍼를 ALD 온도 창 안으로 데움", "제어기가 레시피 순서대로 밸브를 하나씩 엶 (동시에 열리지 않게)"];
  const MEET_DESC = ["위: ALD 밸브·샤워헤드로 기체가 들어옴 (공급)", "아래: 히터가 웨이퍼를 데움 (가열)", "옆: 슬릿 밸브로 웨이퍼가 드나듦 (이송)", "둘레: 펌핑 링으로 기체가 빠짐 (배기)"];
  // 이송 구간: [끝 시간, 구역, 설명]
  const XFER = [
    [1.2, "atm", "FOUP → EFEM: 대기 로봇이 웨이퍼를 꺼냄"],
    [2.2, "atm", "EFEM → 로드락: 대기 쪽 문으로 넣음"],
    [3.6, "edge", "로드락: 문을 닫고 공기를 빼 진공으로 (펌핑)"],
    [4.8, "vac", "TM: 진공 로봇이 웨이퍼를 받음"],
    [6.2, "vac", "슬릿 밸브를 열고 공정 챔버 히터 위에 내려놓음"],
    [8, "vac", "슬릿 밸브가 닫히면 공정 시작 — 끝나면 거꾸로 나감"]
  ];
  const ZONE_NAME = { atm: "대기 쪽", edge: "경계: 로드락", vac: "진공 쪽" };

  // ---------------------------------------------------------
  // 계통도 한 장 만들기 → { svg, setStage(b), draw(b, t) → {desc, zone, chip} }
  // ---------------------------------------------------------
  function makeMap(holder) {
    const svg = mk("svg", { viewBox: FULL, class: "hx-svg", role: "img",
      "aria-label": "ALD 장비 계통도. 왼쪽 위 공급부(전구체 용기, 반응 기체 MFC, 퍼지 MFC)에서 세 배관이 따로 챔버 뚜껑 위 ALD 밸브로 가고, 공정 챔버 아래로 스로틀 밸브와 드라이 펌프, 스크러버가 이어진다. 오른쪽 위 제어기가 밸브·히터·스로틀 밸브에 신호를 보내고, 왼쪽 아래로 FOUP, EFEM, 로드락, 트랜스퍼 모듈을 지나 웨이퍼가 공정 챔버에 들어간다." }, holder);
    const g = (sys, cls) => mk("g", { "data-sys": sys, class: cls || "" }, svg);
    const box = (p, x, y, w, h, label, sub) => {
      mk("rect", { x, y, width: w, height: h, rx: 7, class: "hx-box" }, p);
      if (label) txt(x + w / 2, y + h / 2 + (sub ? -2 : 5), label, "hx-t", p, "middle");
      if (sub) txt(x + w / 2, y + h / 2 + 13, sub, "hx-ts", p, "middle");
    };

    // 무리 이름 (공급부 · 아래층)
    txt(30, 18, "공급부", "hx-grp", svg);
    mk("path", { d: "M400 418 H800", class: "hx-floor" }, svg);
    txt(796, 412, "서브팹 (아래층)", "hx-grp", svg, "end");

    // ── 가열 배관 감싸개 (가열 계통, 전구체 배관 뒤에) ──
    const gHeat = g("heat");
    mk("path", { d: WRAP, class: "hx-wrap" }, gHeat);
    const wigC = mk("path", { d: "M38 84 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0", class: "hx-wig" }, gHeat);

    // ── 이송 길 (이송 계통) ──
    const gX = g("xfer");
    mk("path", { d: "M224 258 V354", class: "hx-bound" }, gX);
    txt(130, 268, "대기 쪽", "hx-ts", gX, "middle");
    txt(327, 258, "진공 쪽", "hx-ts", gX, "middle");
    const route = mk("path", { d: ROUTE, class: "hx-line hx-route" }, gX);
    box(gX, 24, 286, 44, 40, "FOUP");
    box(gX, 84, 276, 92, 60, "EFEM", "대기 로봇");
    const ll = mk("g", { class: "hx-ll" }, gX); box(ll, 196, 286, 56, 40, "LL");
    box(gX, 272, 266, 110, 80, "TM", "진공 로봇");

    // ── 공급 배관 3줄 + 공급부 상자 (공급 계통) ──
    const gS = g("supply");
    const gasPath = {};
    for (const k in GAS) gasPath[k] = mk("path", { d: GAS[k], class: "hx-line" }, gS);
    mk("rect", { x: 30, y: 28, width: 96, height: 48, rx: 14, class: "hx-box" }, gS);
    txt(78, 50, "전구체 용기", "hx-t", gS, "middle"); txt(78, 66, "(데움)", "hx-ts", gS, "middle");
    box(gS, 30, 94, 96, 34, "반응 기체 MFC");
    box(gS, 30, 142, 96, 34, "퍼지 MFC");
    txt(334, 44, "가열 배관", "hx-ts", gS, "middle");

    // ── 진공·배기 (배기 계통) ──
    const gV = g("vac");
    const exh = mk("path", { d: EXH, class: "hx-line" }, gV);
    const exh2 = mk("path", { d: EXH2, class: "hx-line" }, gV);
    mk("path", { d: "M444 346 H556", class: "hx-ring" }, gV);
    mk("path", { d: "M416 360 H444 V350", class: "hx-line is-thin" }, gV);      // 이름표 지시선
    txt(412, 364, "펌핑 링", "hx-ts", gV, "end");
    mk("circle", { cx: 560, cy: 398, r: 10, class: "hx-box" }, gV);
    const flap = mk("path", { d: "M552 398 H568", class: "hx-flap" }, gV);
    txt(544, 402, "스로틀 밸브", "hx-ts", gV, "end");
    box(gV, 520, 428, 80, 32, "드라이 펌프");
    box(gV, 640, 428, 80, 32, "스크러버");
    mk("path", { d: "M580 240 H588", class: "hx-line is-thin" }, gV);
    mk("circle", { cx: 598, cy: 240, r: 10, class: "hx-box" }, gV);
    const needle = mk("path", { d: "M598 240 V232", class: "hx-flap" }, gV);
    txt(614, 245, "압력계", "hx-ts", gV);

    // ── 공정 챔버 (모든 길이 만나는 곳: 늘 보임) ──
    const gPM = mk("g", { class: "hx-pm" }, svg);
    mk("rect", { x: 420, y: 222, width: 160, height: 150, rx: 12, class: "hx-wall" }, gPM);
    const cloud = mk("rect", { x: 426, y: 244, width: 148, height: 64, rx: 6, class: "hx-cloud" }, gPM);
    mk("rect", { x: 440, y: 232, width: 120, height: 8, rx: 3, class: "hx-shower" }, gPM);
    txt(500, 270, "공정 챔버 (PM)", "hx-ts", gPM, "middle");
    const gHtr = g("heat");                                            // 히터 (가열 계통)
    mk("rect", { x: 450, y: 318, width: 100, height: 16, rx: 3, class: "hx-heater" }, gHtr);
    mk("rect", { x: 492, y: 334, width: 16, height: 38, class: "hx-heater" }, gHtr);
    const wigH = mk("path", { d: "M458 326 q6 -4 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0", class: "hx-wig is-in" }, gHtr);
    txt(516, 364, "히터", "hx-ts", gHtr);
    const gW = g("xfer");                                              // 웨이퍼·슬릿 밸브 (이송 계통)
    const slit = mk("rect", { x: 414, y: 294, width: 12, height: 26, rx: 2, class: "hx-slit" }, gW);
    const waferRest = mk("rect", { x: 456, y: 311, width: 88, height: 6, rx: 2, class: "hx-wafer" }, gW);
    const waferMove = mk("rect", { x: -40, y: 0, width: 26, height: 6, rx: 2, class: "hx-wafer" }, gW);

    // ── ALD 밸브 블록 (공급 + 가열·제어가 함께 씀) ──
    const gVB = g("supply heat");
    mk("rect", { x: 440, y: 186, width: 122, height: 26, rx: 5, class: "hx-box hx-vblock" }, gVB);
    const valves = {};
    [["purge", 460], ["react", 500], ["prec", 540]].forEach(([k, x]) => {
      valves[k] = mk("path", { d: `M${x - 10} 191 L${x + 10} 207 V191 L${x - 10} 207 Z`, class: "sx-valve" }, gVB);
    });
    txt(434, 204, "ALD 밸브", "hx-t", gVB, "end");

    // ── 제어기 + 신호선 (가열·제어 계통) ──
    const gC = g("heat");
    const sigPath = {};
    for (const k in SIG) sigPath[k] = mk("path", { d: SIG[k], class: "hx-sig" }, gC);
    box(gC, 640, 26, 144, 52, "제어기", "레시피·인터록");

    // ── 움직이는 점 ──
    const gDots = mk("g", { class: "hx-dots" }, svg);
    function stream(path, n, cls, r) {
      const L = path.getTotalLength(), dots = [];
      for (let i = 0; i < n; i++) dots.push(mk("circle", { r, class: "hx-dot " + cls, visibility: "hidden" }, gDots));
      return (t, on, speed) => {
        dots.forEach((d, i) => {
          if (!on) { d.setAttribute("visibility", "hidden"); return; }
          const p = path.getPointAtLength(((t * speed) + (i * L) / n) % L);
          d.setAttribute("cx", p.x.toFixed(1)); d.setAttribute("cy", p.y.toFixed(1));
          d.setAttribute("visibility", "visible");
        });
      };
    }
    // 신호 한 알: 제어기 → 끝까지 가는 동안만 보임
    function pulse(path, cls) {
      const L = path.getTotalLength(), d = mk("rect", { width: 7, height: 7, rx: 1.5, class: "hx-dot " + cls, visibility: "hidden" }, gDots);
      return (p, on) => {
        if (!on || p > 1) { d.setAttribute("visibility", "hidden"); return; }
        const q = path.getPointAtLength(p * L);
        d.setAttribute("x", (q.x - 3.5).toFixed(1)); d.setAttribute("y", (q.y - 3.5).toFixed(1));
        d.setAttribute("visibility", "visible");
      };
    }
    const sGas = { prec: stream(gasPath.prec, 9, "k-prec", 4.5), react: stream(gasPath.react, 8, "k-react", 4.5), purge: stream(gasPath.purge, 8, "k-purge", 3.6) };
    const sExh = stream(exh, 8, "k-byp", 3.4), sExh2 = stream(exh2, 1, "k-byp", 3.4);
    const sHeat = stream(mk("path", { d: WRAP }), 5, "k-heat", 3.2);
    const pSig = { valve: pulse(sigPath.valve, "k-sig"), heater: pulse(sigPath.heater, "k-sig"), throttle: pulse(sigPath.throttle, "k-sig") };
    const routeL = route.getTotalLength();

    // ── 점검 표시 (문제와 점검 페이지가 씀): 부품 자리에 번호 고리 ──
    const gMarks = mk("g", { class: "hx-marks" }, svg);

    let on = [];
    function setSys(list) {
      on = list.slice();
      ["supply", "vac", "heat", "xfer"].forEach((s) => svg.classList.toggle("is-" + s, on.includes(s)));
      svg.classList.toggle("is-meet", on.length === 4);
    }
    function setStage(b) { setSys(STAGES[b].sys); }

    // marks = [{ spot: "valve", n: 1 }, …] → 같은 자리는 번호를 묶어 고리 하나로. 빈 목록이면 지움
    function mark(marks) {
      gMarks.textContent = "";
      const bySpot = new Map();
      (marks || []).forEach((m) => { if (SPOTS[m.spot]) bySpot.set(m.spot, (bySpot.get(m.spot) || []).concat(m.n)); });
      bySpot.forEach((ns, spot) => {
        const [x, y] = SPOTS[spot];
        const gg = mk("g", { class: "hx-mark", transform: `translate(${x} ${y})` }, gMarks);
        mk("circle", { r: 19, class: "hx-mark-ring" }, gg);
        const label = ns.filter((n) => n != null).join("·");
        if (label) {
          const w = 10 + label.length * 7.5;
          mk("rect", { x: 10, y: -30, width: w, height: 18, rx: 9, class: "hx-mark-tag" }, gg);
          txt(10 + w / 2, -17, label, "hx-mark-n", gg, "middle");
        }
      });
    }

    function draw(b, t) {
      const has = (s) => on.includes(s);
      const ph = Math.floor(t / 1.5) % 4, gas = ORDER[ph];
      const lap = (t % 1.5) / 1.5;
      let desc = "", zone = "vac", chip = on.length === 4 ? "네 길 모두" : "켜진 길: " + SYS_NAME[on[0]];

      // 공급: 지금 칸의 기체만 흐르고 그 밸브만 열림. 챔버 안이 그 기체로 참
      const gasOn = has("supply");
      for (const k in sGas) sGas[k](t, gasOn && k === gas, 150);
      const valveOn = has("supply") || has("heat");
      for (const k in valves) valves[k].classList.toggle("is-on", valveOn && k === gas);
      cloud.setAttribute("class", "hx-cloud" + (gasOn ? " k-" + gas : ""));
      const fill = (0.12 + 0.3 * Math.min(1, lap * 2.2)) * (gas === "purge" ? 0.4 : 1);   // 퍼지는 밝은 색이라 옅게 (챔버 글씨가 묻히지 않게)
      cloud.style.opacity = gasOn ? fill.toFixed(2) : "0";

      // 진공·배기: 배기 점 + 스로틀 날개·압력계 바늘이 조금씩 움직임
      sExh(t, has("vac"), 70); sExh2(t, has("vac"), 40);
      flap.setAttribute("transform", `rotate(${has("vac") ? (-35 + 12 * Math.sin(t * 2.1)).toFixed(1) : -35} 560 398)`);
      needle.setAttribute("transform", `rotate(${has("vac") ? (40 + 4 * Math.sin(t * 5)).toFixed(1) : 40} 598 240)`);

      // 가열·제어: 가열 배관을 따라 열 표시가 흐르고, 히터 물결이 숨 쉬듯, 신호가 칸마다 한 번씩
      sHeat(t, has("heat"), 60);
      const breathe = has("heat") ? (0.45 + 0.55 * Math.abs(Math.sin(t * 2))).toFixed(2) : "";
      wigC.style.opacity = breathe; wigH.style.opacity = breathe;
      const sp = lap * 1.6;                          // 칸 앞부분에 신호가 감 (밸브가 열리는 때와 맞춤)
      for (const k in pSig) pSig[k](sp, has("heat"));

      // 이송: 이송 단계에서만 웨이퍼가 길을 따라 움직임. 다른 단계는 히터 위에 놓여 있음
      if (b === 3) {
        const seg = XFER.findIndex((s) => t < s[0]);
        const s = XFER[seg < 0 ? XFER.length - 1 : seg];
        zone = s[1]; desc = s[2]; chip = ZONE_NAME[zone];
        // 길 위 비율: 구간별로 정한 지점 사이를 이동 (LL·PM에서는 멈춤)
        const marks = [[0, 0], [1.2, 84 / routeL], [2.2, 178 / routeL], [3.6, 178 / routeL], [4.8, 281 / routeL], [6.2, 1], [8, 1]];
        let f = 1;
        for (let i = 1; i < marks.length; i++) {
          if (t <= marks[i][0]) { const a = marks[i - 1], c = marks[i]; f = a[1] + (c[1] - a[1]) * ((t - a[0]) / (c[0] - a[0])); break; }
        }
        const p = route.getPointAtLength(f * routeL);
        waferMove.setAttribute("x", (p.x - 13).toFixed(1)); waferMove.setAttribute("y", (p.y - 3).toFixed(1));
        waferMove.style.display = f >= 1 ? "none" : "";
        waferRest.style.display = f >= 1 ? "" : "none";
        ll.classList.toggle("is-pump", seg === 2);
        slit.classList.toggle("is-open", t > 4.8 && t < 6.2);
      } else {
        waferMove.style.display = "none"; waferRest.style.display = "";
        ll.classList.remove("is-pump"); slit.classList.remove("is-open");
      }

      if (b === 0) desc = GAS_DESC[gas];
      else if (b === 1) desc = VAC_DESC[Math.min(2, Math.floor(t / 2))];
      else if (b === 2) desc = HEAT_DESC[Math.min(2, Math.floor(t / 2))];
      else if (b === 4) desc = MEET_DESC[ph];
      return { desc, zone: b === 3 ? zone : "vac", chip };
    }

    return { svg, setStage, setSys, mark, draw };
  }

  // 부품 자리 (viewBox 좌표, 위 그림과 같은 자리) — 문제와 점검 페이지가 원인 후보를 고리로 표시할 때 씀
  const SPOTS = {
    canister: [78, 52], pline: [334, 52], rmfc: [78, 111], pmfc: [78, 159],
    valve: [501, 199], shower: [500, 236], heater: [472, 326], ring: [544, 350], wall: [436, 258],
    throttle: [560, 398], pump: [560, 444], scrub: [680, 444], gauge: [598, 240],
    ctrl: [712, 52], slit: [420, 307], tm: [327, 306], ll: [224, 306], efem: [130, 306]
  };

  // 다른 페이지에서 계통도를 다시 쓸 수 있게 내보냄 (문제와 점검 페이지: js/sim/ald-trouble-sx.js)
  window.AldHwMap = { make: makeMap, STAGES, FULL, SPOTS, SYS_NAME };

  // ---------------------------------------------------------
  // ① 스크롤 단계 체험
  // ---------------------------------------------------------
  function initStory(root) {
    const E = window.SxEngine;
    const NB = STAGES.length;
    // 정지 화면에서 보여 줄 순간 (단계마다 흐름이 잘 보이는 때)
    const STILL_T = [0.7, 3, 4.6, 4.2, 0.7];

    if (E.isStill()) {
      E.still(root, (step, b, fig) => {
        fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${STAGES[b].name}</p><p class="sx-zone" data-zone="vac"></p></div>` +
          `<div class="sx-svg-box"></div><p class="sx-desc"></p>`;
        const m = makeMap(fig.querySelector(".sx-svg-box"));
        m.setStage(b);
        const r = m.draw(b, STILL_T[b]);
        const z = fig.querySelector(".sx-zone");
        z.textContent = r.chip; z.dataset.zone = r.zone;
        fig.querySelector(".sx-desc").textContent = r.desc;
      });
      return;
    }

    const map = makeMap(E.$("[data-sx-svg]", root));
    const nameEl = E.$("[data-sx-name]", root), descEl = E.$("[data-sx-desc]", root), zoneEl = E.$("[data-sx-zone]", root);
    let last = "";
    function draw(b, t) {
      const r = map.draw(b, t);
      const key = r.desc + r.chip;
      if (key !== last) {
        last = key;
        descEl.textContent = r.desc;
        zoneEl.textContent = r.chip; zoneEl.dataset.zone = r.zone;
      }
    }
    function onActivate(b) {
      last = "";
      nameEl.innerHTML = `<span class="sim-stage-num">${b + 1}/${NB}</span>${STAGES[b].name}`;
      map.setStage(b);
      map.svg.setAttribute("viewBox", E.mobile() ? STAGES[b].crop : FULL);   // 휴대폰: 그 계통 부분만 크게
    }
    E.story(root, { total: (b) => STAGES[b].total, draw, onActivate, lapSoften: () => false });
  }

  // ---------------------------------------------------------
  // ② 매엽식 · 배치식 · 공간 분할 비교 그림
  // ---------------------------------------------------------
  function initCompare(root) {
    const E = window.SxEngine;
    const holders = {};
    root.querySelectorAll("[data-atc]").forEach((h) => { holders[h.dataset.atc] = h; });

    // 시간 칸 막대: 지금 기체 칸이 밝아짐 (매엽식·배치식)
    function timeBar(svg, y, widths) {
      let x = 20; const tot = widths.reduce((a, b) => a + b, 0), cells = [];
      widths.forEach((w, i) => {
        const cw = (160 * w) / tot;
        cells.push(mk("rect", { x: x + 1, y, width: cw - 2, height: 8, rx: 2, class: "atc-cell k-" + ORDER[i] }, svg));
        x += cw;
      });
      txt(20, y + 22, "시간 →", "atc-t", svg);
      return cells;
    }
    // 길이(초)가 다른 네 칸 중 지금 칸 찾기
    const phaseOf = (t, widths) => {
      const tot = widths.reduce((a, b) => a + b, 0); let r = t % tot;
      for (let i = 0; i < 4; i++) { if (r < widths[i]) return i; r -= widths[i]; }
      return 3;
    };

    // 매엽식: 작은 챔버 하나, 웨이퍼 한 장. 기체가 시간으로 바뀜
    const s1 = mk("svg", { viewBox: "0 0 200 140", "aria-hidden": "true" }, holders.single);
    mk("rect", { x: 40, y: 14, width: 120, height: 78, rx: 10, class: "atc-ch" }, s1);
    const c1 = mk("rect", { x: 46, y: 22, width: 108, height: 50, rx: 6, class: "atc-cloud" }, s1);
    mk("rect", { x: 60, y: 74, width: 80, height: 5, rx: 2, class: "atc-wf" }, s1);
    mk("rect", { x: 56, y: 79, width: 88, height: 7, rx: 2, class: "atc-ht" }, s1);
    const W1 = [1, 1, 1, 1];
    const bar1 = timeBar(s1, 104, W1);

    // 배치식: 큰 반응관에 여러 장. 공간이 커서 퍼지 칸이 김
    const s2 = mk("svg", { viewBox: "0 0 200 140", "aria-hidden": "true" }, holders.batch);
    mk("rect", { x: 62, y: 4, width: 76, height: 92, rx: 16, class: "atc-ch" }, s2);
    const c2 = mk("rect", { x: 68, y: 10, width: 64, height: 80, rx: 12, class: "atc-cloud" }, s2);
    for (let i = 0; i < 7; i++) mk("rect", { x: 76, y: 16 + i * 11, width: 48, height: 3, rx: 1, class: "atc-wf" }, s2);
    const W2 = [1, 1.9, 1, 1.9];
    const bar2 = timeBar(s2, 104, W2);

    // 공간 분할: 구역이 고정, 웨이퍼가 구역 아래를 지나감
    const s3 = mk("svg", { viewBox: "0 0 200 140", "aria-hidden": "true" }, holders.spatial);
    const ZW = [["prec", 34], ["purge", 16], ["react", 34], ["purge", 16]];
    let zx = 0;
    for (let rep = 0; rep < 2; rep++) ZW.forEach(([k, w]) => {
      mk("rect", { x: zx + 0.5, y: 18, width: w - 1, height: 30, class: "atc-zone k-" + k }, s3);
      mk("path", { d: `M${zx + w / 2} 50 V58`, class: "atc-arrow" }, s3);
      zx += w;
    });
    txt(100, 12, "기체 머리 (구역마다 다른 기체)", "atc-t", s3, "middle");
    mk("path", { d: "M0 70 H200", class: "atc-floor" }, s3);
    const wf3 = [0, 1, 2].map(() => mk("rect", { y: 62, width: 40, height: 6, rx: 2, class: "atc-wf" }, s3));
    txt(100, 92, "웨이퍼가 움직임 →", "atc-t", s3, "middle");
    txt(20, 126, "자리 →", "atc-t", s3);

    function draw(t) {
      const p1 = phaseOf(t, W1), p2 = phaseOf(t * 0.8, W2);
      c1.setAttribute("class", "atc-cloud k-" + ORDER[p1]);
      c2.setAttribute("class", "atc-cloud k-" + ORDER[p2]);
      bar1.forEach((c, i) => c.classList.toggle("is-on", i === p1));
      bar2.forEach((c, i) => c.classList.toggle("is-on", i === p2));
      wf3.forEach((w, i) => w.setAttribute("x", ((((t * 26) + i * 80) % 240) - 40).toFixed(1)));
    }

    if (E.isStill()) { draw(0.4); root.classList.add("is-still"); return; }
    let T = 0, onScreen = false, ticking = false;
    const tick = (time, dt) => { T += Math.min(dt, 100) / 1000; draw(T); };
    const sync = () => {
      const want = onScreen && !document.hidden;
      if (want && !ticking) { gsap.ticker.add(tick); ticking = true; }
      else if (!want && ticking) { gsap.ticker.remove(tick); ticking = false; }
    };
    draw(0);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { onScreen = en[en.length - 1].isIntersecting; sync(); }).observe(root);
    } else { onScreen = true; sync(); }
    document.addEventListener("visibilitychange", sync);
  }

  function init() {
    if (!window.SxEngine) return;
    const sx = document.querySelector(".sx-hw[data-sx]");          // 장비 구성 페이지의 단계 체험만 (다른 페이지는 계통도만 빌려 씀)
    if (sx) initStory(sx);
    const atc = document.querySelector("[data-atc-root]");
    if (atc) initCompare(atc);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
