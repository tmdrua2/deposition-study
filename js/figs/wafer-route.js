// =============================================================
// 웨이퍼 이동 경로 애니메이션 (equipment/pecvd/flow.html)
//
// 장비를 위에서 본 평면도(대표 300mm 구성: FOUP 3개 · EFEM · LL 2개 · 육각 TM · PM 4개) 위로
// 웨이퍼 한 장이 9단계를 지나감:
//   FOUP → ATM 로봇 → 얼라이너 → LL(펌핑) → TM → PM(증착) → TM → LL(벤트·냉각) → FOUP
//
// HTML 약속
//   <div data-wafer-route>
//     <div class="wr-svg"></div>                         ← 여기에 SVG를 그림
//     <p class="wr-cap"> … </p>                          ← 지금 단계 이름·설명
//     <button data-wr-play>                              ← 일시정지/재생
//     <ol> <li><button data-wr-step="0">…</button></li> … </ol>   ← 단계 목록 (누르면 그 단계부터)
//   </div>
// 움직임 줄이기·?still=1·데이터 절약·저사양 → 자동 재생 없이 단계별 정지 그림 (단계 버튼으로 넘김, 재생 버튼으로 직접 재생 가능)
// 화면 밖이거나 탭이 숨으면 멈춤. 상태는 "단계 번호 + 진행"으로 계산 → 아무 단계로나 바로 건너뛸 수 있음
// 좌표는 그림 비율용 숫자일 뿐 실제 치수가 아님
// =============================================================
(function () {
  "use strict";

  // ---------- 평면도 좌표 (viewBox 600 × 640) ----------
  const C = [300, 236];                       // 트랜스퍼 모듈(TM) 가운데
  const R = 118;                              // 육각형 꼭짓점까지 거리
  const AP = R * Math.cos(Math.PI / 6);       // 가운데에서 면까지 거리
  const deg = (d) => (d * Math.PI) / 180;
  const pol = (r, a) => [C[0] + r * Math.cos(deg(a)), C[1] + r * Math.sin(deg(a))];
  // PM: 육각형의 비스듬한 네 면 (화면 기준 각도). PM1 = 오른쪽 위
  const PMS = [{ id: "PM1", a: 330 }, { id: "PM2", a: 30 }, { id: "PM3", a: 150 }, { id: "PM4", a: 210 }]
    .map((p) => Object.assign(p, { c: pol(AP + 64, p.a), door: pol(AP + 5, p.a) }));
  const LL = [{ id: "LL1", x: 246, c: [271, 382] }, { id: "LL2", x: 304, c: [329, 382] }];
  const LL_Y = [346, 420];                    // LL 위(TM 쪽 슬릿 밸브)·아래(EFEM 쪽 문)
  const ROBOT = [300, 492];                   // ATM 로봇
  const ALIGN = [462, 492];                   // 얼라이너
  const FOUP = [300, 578];                    // 웨이퍼가 나오는 FOUP (가운데)

  // ---------- 9단계 ----------
  //   move: [출발, 도착] / arm: 옮기는 로봇 / act: 도착 뒤 동작 시간(초)
  const MOVE_T = 1.1;
  const STEPS = [
    { name: "FOUP 문 열기 · 매핑", act: 1.6, cap: "로드포트가 FOUP 문을 열고, 어느 칸에 웨이퍼가 있는지 센서로 확인합니다(매핑)." },
    { name: "ATM 로봇이 꺼냄", move: [FOUP, ROBOT], arm: "atm", act: 0.4, cap: "대기 로봇(ATM 로봇)이 블레이드를 넣어 웨이퍼 한 장을 꺼냅니다." },
    { name: "얼라이너", move: [ROBOT, ALIGN], arm: "atm", act: 1.5, cap: "웨이퍼를 돌려 노치(방향 표시 홈)와 중심을 맞춥니다." },
    { name: "LL에 넣고 펌핑", move: [ALIGN, LL[0].c], arm: "atm", act: 1.7, door: "ll1-atm", cap: "로드락에 넣고 대기 쪽 문을 닫은 뒤 공기를 빼서(펌핑) 진공으로 만듭니다." },
    { name: "TM으로", move: [LL[0].c, C], arm: "tm", act: 0.3, door: "ll1-slit", cap: "TM 쪽 슬릿 밸브가 열리면 진공 로봇이 웨이퍼를 가져갑니다." },
    { name: "PM에서 증착", move: [C, PMS[0].c], arm: "tm", act: 2.0, door: "pm-slit", cap: "공정 챔버에 넣고 슬릿 밸브를 닫은 뒤 레시피대로 막을 쌓습니다 (아래 레시피 단계)." },
    { name: "TM으로 꺼냄", move: [PMS[0].c, C], arm: "tm", act: 0.3, door: "pm-slit", cap: "증착이 끝나면 진공 로봇이 웨이퍼를 다시 TM으로 꺼냅니다." },
    { name: "LL에서 벤트 · 냉각", move: [C, LL[1].c], arm: "tm", act: 1.7, door: "ll2-slit", cap: "다른 로드락에 넣고 공기를 넣어(벤트) 대기압으로 되돌리며 웨이퍼를 식힙니다." },
    { name: "FOUP로", move: [LL[1].c, FOUP], arm: "atm", act: 0.7, door: "ll2-atm", cap: "대기 로봇이 웨이퍼를 꺼내 원래 FOUP 칸에 넣습니다." },
  ];
  const durOf = (s) => (s.move ? MOVE_T : 0) + s.act;

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const f1 = (n) => n.toFixed(1);

  // ---------- 고정 그림 (한 번만 만듦) ----------
  function staticSvg() {
    const hex = [0, 60, 120, 180, 240, 300].map((a) => pol(R, a).map(f1).join(",")).join(" ");
    let s = `<svg viewBox="0 0 600 640" class="wr-svg-el" role="img" aria-labelledby="wr-title">
      <title id="wr-title">위에서 본 장비 평면도. 웨이퍼가 FOUP에서 대기 로봇, 얼라이너, 로드락, 트랜스퍼 모듈을 지나 공정 챔버에서 막을 입고, 다른 로드락을 거쳐 FOUP로 돌아온다.</title>
      <defs>
        <radialGradient id="wr-plasma"><stop offset="0" class="wr-plasma-a"/><stop offset="1" class="wr-plasma-b"/></radialGradient>
        <marker id="wr-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1.5 L8.5 5 L1 8.5" class="wr-head"/></marker>
      </defs>
      <rect class="wr-vac-zone" x="40" y="60" width="520" height="372" rx="22"/>
      <line class="wr-boundary" x1="40" y1="438" x2="560" y2="438"/>
      <text class="wr-zone-t" x="556" y="428" text-anchor="end">진공 ↑</text>
      <text class="wr-zone-t" x="556" y="456" text-anchor="end">대기 ↓</text>`;
    // PM 4개 (TM 쪽 면이 TM을 보게 돌림)
    PMS.forEach((p, k) => {
      s += `<g transform="translate(${f1(p.c[0])} ${f1(p.c[1])}) rotate(${p.a})">
        <rect class="wr-mod${k === 0 ? " is-target" : ""}" x="-52" y="-52" width="104" height="104" rx="10"/>
        ${k === 0 ? '<rect class="wr-glow" id="wr-glow" x="-44" y="-44" width="88" height="88" rx="44" fill="url(#wr-plasma)" opacity="0"/>' : ""}
        <circle class="wr-heater" r="24"/></g>
        <text class="wr-t" x="${f1(p.c[0])}" y="${f1(p.c[1] + (p.a < 180 ? 44 : -36))}">${p.id}</text>`;
    });
    // PM1 슬릿 밸브 (TM 쪽 면)
    const d = PMS[0], nx = Math.cos(deg(d.a + 90)), ny = Math.sin(deg(d.a + 90));
    s += `<line class="wr-door" id="wr-pm-slit" x1="${f1(d.door[0] - nx * 26)}" y1="${f1(d.door[1] - ny * 26)}" x2="${f1(d.door[0] + nx * 26)}" y2="${f1(d.door[1] + ny * 26)}"/>`;
    // TM 육각형 + 진공 로봇 중심
    s += `<polygon class="wr-mod is-tm" points="${hex}"/>
      <circle class="wr-hub" cx="${C[0]}" cy="${C[1]}" r="20"/>
      <text class="wr-t" x="${C[0]}" y="${C[1] + 52}">TM</text>
      <text class="wr-t is-sub" x="${C[0]}" y="${C[1] + 70}">진공 로봇</text>`;
    // LL 2개 (안쪽 칠 = 압력: 옅으면 대기, 진하면 진공)
    LL.forEach((l, k) => {
      s += `<rect class="wr-mod is-ll" x="${l.x}" y="${LL_Y[0]}" width="50" height="${LL_Y[1] - LL_Y[0]}" rx="6"/>
        <rect class="wr-ll-fill" id="wr-ll${k + 1}-fill" x="${l.x + 3}" y="${LL_Y[0] + 3}" width="44" height="${LL_Y[1] - LL_Y[0] - 6}" rx="4"/>
        <text class="wr-t is-sub is-ll" x="${l.c[0]}" y="${LL_Y[0] + 20}">${l.id}</text>
        <line class="wr-door" id="wr-ll${k + 1}-slit" x1="${l.x + 6}" y1="${LL_Y[0]}" x2="${l.x + 44}" y2="${LL_Y[0]}"/>
        <line class="wr-door" id="wr-ll${k + 1}-atm" x1="${l.x + 6}" y1="${LL_Y[1]}" x2="${l.x + 44}" y2="${LL_Y[1]}"/>`;
    });
    s += `<text class="wr-ll-state" id="wr-ll-state" x="${C[0]}" y="${LL_Y[1] - 10}"></text>`;
    // EFEM + ATM 로봇 + 얼라이너
    s += `<rect class="wr-mod is-efem" x="80" y="452" width="440" height="80" rx="10"/>
      <text class="wr-t is-left" x="96" y="476">EFEM</text>
      <text class="wr-t is-sub is-left" x="96" y="494">대기압</text>
      <circle class="wr-hub" cx="${ROBOT[0]}" cy="${ROBOT[1]}" r="16"/>
      <text class="wr-t is-sub" x="${ROBOT[0] - 70}" y="${ROBOT[1] + 30}">ATM 로봇</text>
      <circle class="wr-aligner" cx="${ALIGN[0]}" cy="${ALIGN[1]}" r="20"/>
      <text class="wr-t is-sub" x="${ALIGN[0]}" y="${ALIGN[1] + 34}">얼라이너</text>`;
    // FOUP 3개 (가운데가 이 웨이퍼의 FOUP)
    [180, 300, 420].forEach((x, k) => {
      s += `<rect class="wr-mod is-foup${k === 1 ? " is-target" : ""}" x="${x - 46}" y="552" width="92" height="52" rx="8"/>`;
    });
    s += `<line class="wr-door" id="wr-foup-door" x1="262" y1="552" x2="338" y2="552"/>
      <line class="wr-scan" id="wr-scan" x1="258" x2="342" y1="560" y2="560" opacity="0"/>
      <text class="wr-t" x="300" y="626">FOUP (로드포트 위)</text>`;
    // 움직이는 것: 이번 단계 경로(점선) · 로봇 팔 · 웨이퍼
    s += `<path class="wr-trail" id="wr-trail" d="" marker-end="url(#wr-head)"/>
      <polyline class="wr-arm" id="wr-arm" points=""/>
      <g id="wr-wafer"><circle class="wr-wafer" r="15"/><circle class="wr-film" id="wr-film" r="15" opacity="0"/>
        <g id="wr-notch"><path class="wr-notch" d="M0 -15 l-3.5 4.5 h7 z"/></g></g>
    </svg>`;
    return s;
  }

  // ---------- 단계 i, 진행 시간 t(초) → 화면 상태 ----------
  function stateAt(i, t) {
    const st = STEPS[i];
    const mt = st.move ? MOVE_T : 0;
    const mp = st.move ? ease(clamp01(t / mt)) : 1;        // 이동 진행
    const ap = clamp01((t - mt) / st.act);                  // 도착 뒤 동작 진행
    const moving = st.move && t < mt;
    const o = { i, pos: null, arm: null, door: {}, ll1: 0, ll2: 1, film: 0, notch: -110, glow: 0, scan: -1, llText: "", trail: st.move };

    // 웨이퍼 위치
    if (st.move) o.pos = lerp2(st.move[0], st.move[1], mp);
    else o.pos = FOUP;
    // 로봇 팔: 옮기는 동안 + (ATM 로봇이 꺼낸 직후) 로봇 위에 들고 있을 때
    if (moving || (i === 1)) o.arm = st.arm === "tm" ? C : ROBOT;
    // 문: 그 문을 지나가는 동안만 열림
    if (st.door && moving) o.door[st.door] = true;
    if (i === 0 && ap > 0.2) o.door["foup"] = true;
    if (i === 1 && t < mt) o.door["foup"] = true;
    if (i === 8 && t >= mt * 0.5) o.door["foup"] = true;
    if (i === 0 && ap > 0.3) o.scan = (ap - 0.3) / 0.7;     // 매핑 센서가 칸을 훑음
    // LL 압력 (0 = 대기, 1 = 진공)
    o.ll1 = i < 3 ? 0 : i === 3 ? (moving ? 0 : ap) : 1;
    o.ll2 = i < 7 ? 1 : i === 7 ? (moving ? 1 : 1 - ap) : 0;
    if (i === 3 && !moving) o.llText = "LL1 펌핑";
    if (i === 7 && !moving) o.llText = "LL2 벤트·냉각";
    // 노치 방향: 얼라이너에서 한 바퀴 넘게 돌아 위쪽(-90°)으로 맞춤
    o.notch = i < 2 ? -110 : i === 2 ? -110 + (moving ? 0 : ease(ap) * 380) : 270;
    // 막: PM에서 증착하는 동안 생김
    o.film = i < 5 ? 0 : i === 5 ? (moving ? 0 : ap) : 1;
    o.glow = i === 5 && !moving ? Math.sin(Math.PI * ap) : 0;
    return o;
  }

  // 두 마디 로봇 팔: 몸통 → 팔꿈치 → 웨이퍼 (팔 길이가 모자라면 곧게 펴짐)
  function armPoints(base, tip) {
    const dx = tip[0] - base[0], dy = tip[1] - base[1], d = Math.hypot(dx, dy);
    if (d < 2) return `${f1(base[0])},${f1(base[1])}`;
    const L = Math.max(48, d / 2 + 0.01), hgt = Math.sqrt(Math.max(0, L * L - (d / 2) * (d / 2)));
    const mx = base[0] + dx / 2 - (dy / d) * hgt, my = base[1] + dy / 2 + (dx / d) * hgt;
    return `${f1(base[0])},${f1(base[1])} ${f1(mx)},${f1(my)} ${f1(tip[0])},${f1(tip[1])}`;
  }

  function setup(root) {
    const holder = root.querySelector(".wr-svg");
    if (!holder) return;
    holder.innerHTML = staticSvg();
    const $ = (id) => holder.querySelector("#" + id);
    const el = {
      wafer: $("wr-wafer"), film: $("wr-film"), notch: $("wr-notch"), arm: $("wr-arm"), trail: $("wr-trail"),
      glow: $("wr-glow"), scan: $("wr-scan"), llState: $("wr-ll-state"),
      ll1: $("wr-ll1-fill"), ll2: $("wr-ll2-fill"),
      doors: { "foup": $("wr-foup-door"), "ll1-atm": $("wr-ll1-atm"), "ll1-slit": $("wr-ll1-slit"), "ll2-slit": $("wr-ll2-slit"), "ll2-atm": $("wr-ll2-atm"), "pm-slit": $("wr-pm-slit") },
    };
    const cap = root.querySelector(".wr-cap");
    const playBtn = root.querySelector("[data-wr-play]");
    const stepBtns = Array.from(root.querySelectorAll("[data-wr-step]"));

    // 정지 화면 판정 (js/motion-pref.js 공용, 없으면 움직임 줄이기만 봄)
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lite = window.MotionPref ? !!MotionPref.liteReason() : false;
    let playing = !(reduceMq.matches || lite);
    let onScreen = true, raf = 0, last = 0;
    let step = 0, t = 0;

    function draw() {
      const o = stateAt(step, t);
      el.wafer.setAttribute("transform", `translate(${f1(o.pos[0])} ${f1(o.pos[1])})`);
      el.notch.setAttribute("transform", `rotate(${f1(o.notch + 90)})`);
      el.film.setAttribute("opacity", f1(o.film));
      el.arm.setAttribute("points", o.arm ? armPoints(o.arm, o.pos) : "");
      const mv = STEPS[step].move;
      el.trail.setAttribute("d", mv ? `M${f1(mv[0][0])} ${f1(mv[0][1])} L${f1(mv[1][0])} ${f1(mv[1][1])}` : "");
      el.glow.setAttribute("opacity", f1(o.glow * 0.9));
      el.scan.setAttribute("opacity", o.scan >= 0 ? "1" : "0");
      if (o.scan >= 0) { const y = 558 + o.scan * 40; el.scan.setAttribute("y1", f1(y)); el.scan.setAttribute("y2", f1(y)); }
      el.ll1.style.opacity = f1(0.12 + 0.5 * o.ll1);
      el.ll2.style.opacity = f1(0.12 + 0.5 * o.ll2);
      el.llState.textContent = o.llText;
      el.llState.setAttribute("x", step === 3 ? "200" : "400");
      el.llState.setAttribute("text-anchor", step === 3 ? "end" : "start");
      Object.keys(el.doors).forEach((k) => el.doors[k].classList.toggle("is-open", !!o.door[k]));
    }

    function showStep() {
      stepBtns.forEach((b) => {
        const on = +b.dataset.wrStep === step;
        b.classList.toggle("is-active", on);
        if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (cap) cap.innerHTML = `<span class="wr-cap-no">${step + 1}/${STEPS.length}</span> <strong>${STEPS[step].name}</strong><span class="wr-cap-desc"> — ${STEPS[step].cap}</span>`;
    }

    function updateButton() {
      if (!playBtn) return;
      playBtn.textContent = playing ? "일시정지" : "재생";
      playBtn.setAttribute("aria-pressed", String(!playing));
    }

    function frame(now) {
      raf = 0;
      if (!(playing && onScreen && !document.hidden)) return;
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (dt > 0.25) dt = 0;
      t += dt;
      // 단계 끝 → 다음 단계 (마지막 뒤에는 잠깐 쉬었다가 처음부터)
      const d = durOf(STEPS[step]) + (step === STEPS.length - 1 ? 0.8 : 0.25);
      if (t >= d) { t = 0; step = (step + 1) % STEPS.length; showStep(); }
      draw();
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && playing && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

    // 단계 버튼: 그 단계로 건너뜀. 재생 중이면 그 단계 처음부터, 멈춰 있으면 그 단계가 끝난 모습(정지 그림)
    stepBtns.forEach((b) => b.addEventListener("click", () => {
      step = +b.dataset.wrStep;
      t = playing ? 0 : durOf(STEPS[step]);
      showStep();
      draw();
    }));
    if (playBtn) playBtn.addEventListener("click", () => {
      playing = !playing;
      if (playing && t >= durOf(STEPS[step])) t = 0;   // 정지 그림에서 재생 → 그 단계 처음부터
      updateButton();
      kick();
    });
    if (reduceMq.addEventListener) reduceMq.addEventListener("change", (e) => {
      if (e.matches) { playing = false; t = durOf(STEPS[step]); draw(); updateButton(); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { onScreen = en[0].isIntersecting; kick(); }).observe(root);
    }
    document.addEventListener("visibilitychange", kick);

    if (!playing) t = durOf(STEPS[0]);
    showStep();
    draw();
    updateButton();
    kick();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-wafer-route]").forEach(setup);
  });
})();
