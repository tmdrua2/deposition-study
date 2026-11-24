// =============================================================
// PECVD 장비 계통도 (equipment/pecvd/hardware.html)
//
// 장비 전체를 네 계통으로 나눈 "지도":
//   gas   가스  : 가스 박스(MFC) → 가스 라인 → 샤워헤드   (+ 세정 때 RPS)
//   rf    RF    : RF 제너레이터 → 매칭 → 샤워헤드(위 전극) → 플라즈마
//   exh   배기  : 펌핑 링 → 스로틀 밸브 → 포어라인 → 드라이 펌프 → 스크러버
//   wafer 웨이퍼: FOUP → EFEM → LL → TM → PM(히터 위)
//
// HTML 약속
//   <figure data-hw-map data-part-base="../pecvd.html#part=">
//     <div class="hm-legend"> <button data-sys="gas"> … </div>   ← 계통 고르기 (누르면 고정, 다시 누르면 해제)
//     <div class="hm-svg"></div>                                  ← 여기에 SVG를 그림
//     <p class="hm-info" aria-live="polite"></p>                  ← 올린 모듈 설명
//   </figure>
// 동작
//   - 선이나 모듈에 마우스를 올리면(휴대폰은 누르면) 그 계통만 또렷하게, 나머지는 흐리게
//   - 모듈을 누르면 장비 페이지의 해당 부품 패널로 이동 (#part=부품id)
//   - 강조된 계통의 선에는 흐르는 방향으로 점선이 움직임 (움직임 줄이기·?still=1이면 멈춘 점선)
//   - 화면 폭이 좁으면(640px 미만) 세로형 배치로 다시 그림
// 좌표는 그림 비율용 숫자일 뿐 실제 치수가 아님. 색은 css/style.css의 --sys-* 변수
// =============================================================
(function () {
  "use strict";

  // ---------- 모듈 (계통·이름·설명·연결할 부품 패널) ----------
  //   sys  : 속한 계통 (여러 개면 공백으로) / part: 장비 페이지 부품 id (#part=) / href: 다른 곳으로 갈 때
  const NODES = {
    gasbox:   { sys: "gas", name: "가스 박스", sub: "MFC로 유량 제어", part: "gas-box",
                desc: "원료 가스마다 MFC(질량 유량 제어기)와 밸브가 있어, 레시피가 정한 가스를 정한 양만큼 내보냅니다." },
    rps:      { sys: "gas", name: "RPS", sub: "세정용 NF₃ 분해", part: "pm", dashed: true,
                desc: "원격 플라즈마 소스. 세정할 때만 NF₃를 분해해 불소 라디칼을 챔버로 보냅니다. 공정 챔버 패널의 구성품에서 설명합니다." },
    rfgen:    { sys: "rf", name: "RF 제너레이터", sub: "고주파 전력", part: "rf-generator",
                desc: "플라즈마를 켜고 유지하는 고주파 전력을 만듭니다." },
    match:    { sys: "rf", name: "매칭", sub: "임피던스 맞춤", part: "rf-generator",
                desc: "전원과 플라즈마의 임피던스를 맞춰, 전력이 되돌아오지 않고 플라즈마로 잘 들어가게 합니다. RF 전원 장치 패널에서 함께 설명합니다." },
    sh:       { sys: "gas rf", name: "샤워헤드", sub: "가스 분배 · 위 전극", part: "showerhead",
                desc: "가스 라인으로 온 가스를 작은 구멍들로 고르게 뿌리고, 동시에 RF가 걸리는 위쪽 전극입니다. 가스 계통과 RF 계통이 만나는 곳입니다." },
    plasma:   { sys: "rf", name: "플라즈마", sub: "가스가 쪼개지는 곳", href: "principle.html#steps", glow: true,
                desc: "샤워헤드와 히터 사이에서 켜지는 플라즈마. 원료 가스가 라디칼로 쪼개집니다. 원리 페이지의 단면 애니메이션으로 이어집니다." },
    heater:   { sys: "wafer", name: "웨이퍼 · 히터", sub: "서셉터 · 리프트 핀", part: "pm",
                desc: "웨이퍼를 올려 데우는 받침대이자 아래쪽(접지) 전극. 리프트 핀이 웨이퍼를 들어 올려 로봇과 주고받습니다." },
    ring:     { sys: "exh", name: "펌핑 링", sub: "둘레로 고르게 배기", part: "pm",
                desc: "히터 둘레에서 가스를 모든 방향으로 고르게 빨아내, 웨이퍼 위 흐름이 한쪽으로 쏠리지 않게 합니다." },
    throttle: { sys: "exh", name: "스로틀 밸브", sub: "압력 조절", part: "pm",
                desc: "배기구의 열림 정도를 바꿔 챔버 압력을 목표값에 맞춥니다. 많이 열면 압력이 내려가고, 조이면 올라갑니다." },
    pump:     { sys: "exh", name: "드라이 펌프", sub: "진공 만들기", part: "pump",
                desc: "포어라인 끝에서 챔버 가스를 계속 빨아내 진공을 만들고 유지합니다. 소음·진동 때문에 보통 아래층(서브팹)에 둡니다." },
    scrubber: { sys: "exh", name: "스크러버", sub: "배기 가스 정화", part: "pump",
                desc: "펌프를 지난 가스 속 독성·가연성 가스와 세정 가스를 태우거나 씻어 처리합니다. 드라이 펌프 패널에서 함께 설명합니다." },
    foup:     { sys: "wafer", name: "FOUP", sub: "웨이퍼 운반 용기", part: "foup",
                desc: "웨이퍼를 담아 오는 밀폐 용기. 로드포트에 놓이면 문이 열리고 대기 로봇이 웨이퍼를 꺼냅니다." },
    efem:     { sys: "wafer", name: "EFEM", sub: "대기 로봇 · 얼라이너", part: "efem",
                desc: "대기압의 깨끗한 공간. 대기(ATM) 로봇이 웨이퍼를 꺼내 얼라이너로 방향을 맞춘 뒤 로드락에 넣습니다." },
    ll:       { sys: "wafer", name: "LL", sub: "로드락 · 압력 전환", part: "loadlock",
                desc: "대기와 진공 사이의 작은 방. 웨이퍼가 들어오면 공기를 빼고(펌핑), 나갈 때는 다시 공기를 넣습니다(벤트)." },
    tm:       { sys: "wafer", name: "TM", sub: "진공 로봇", part: "tm",
                desc: "진공 상태로 유지되는 가운데 방. 진공 로봇이 로드락과 공정 챔버 사이로 웨이퍼를 나릅니다." },
  };

  // ---------- 계통 이름 (설명 줄·화면 읽기용) ----------
  const SYS = {
    gas: { name: "가스 계통", desc: "원료 가스를 정한 양만큼 챔버로 보내는 길" },
    rf: { name: "RF 계통", desc: "전력을 플라즈마로 보내는 길" },
    exh: { name: "배기 계통", desc: "챔버 압력을 맞추고 남은 가스를 빼내는 길" },
    wafer: { name: "웨이퍼 계통", desc: "웨이퍼가 대기에서 진공 챔버까지 오가는 길" },
  };

  // ---------- 배치 두 가지 ----------
  //   nodes: [x, y, 너비, 높이] / edges: 지나는 점들(흐름 방향 순서) / both: 양쪽 화살표(웨이퍼는 오가므로)
  const LAYOUTS = {
    wide: {
      w: 1120, h: 596,
      pm: [560, 150, 340, 330], pmLabel: [576, 466],   // PM 이름 위치 (선과 겹치지 않는 곳)
      nodes: {
        gasbox: [40, 40, 176, 58], rps: [296, 128, 158, 58],
        match: [760, 40, 140, 58], rfgen: [932, 40, 170, 58],
        sh: [590, 192, 280, 52], plasma: [612, 258, 236, 52], heater: [590, 324, 280, 52], ring: [640, 400, 180, 52],
        throttle: [650, 512, 160, 52], pump: [380, 512, 150, 52], scrubber: [150, 512, 150, 52],
        foup: [20, 324, 98, 52], efem: [140, 324, 158, 52], ll: [320, 324, 106, 52], tm: [448, 324, 100, 52],
      },
      edges: [
        { sys: "gas", pts: [[216, 69], [650, 69], [650, 192]], label: "가스 라인", lx: 470, ly: 60 },
        { sys: "gas", pts: [[375, 128], [375, 69]], dashed: true, label: "세정 때만", lx: 384, ly: 104, anchor: "start" },
        { sys: "rf", pts: [[932, 69], [900, 69]] },
        { sys: "rf", pts: [[830, 98], [830, 192]], label: "RF 케이블", lx: 840, ly: 126, anchor: "start" },
        { sys: "exh", pts: [[730, 452], [730, 512]] },
        { sys: "exh", pts: [[650, 538], [530, 538]], label: "포어라인", lx: 590, ly: 529 },
        { sys: "exh", pts: [[380, 538], [300, 538]] },
        { sys: "wafer", pts: [[118, 350], [140, 350]], both: true },
        { sys: "wafer", pts: [[298, 350], [320, 350]], both: true },
        { sys: "wafer", pts: [[426, 350], [448, 350]], both: true },
        { sys: "wafer", pts: [[548, 350], [590, 350]], both: true },
      ],
      // 진공 | 대기 경계 (EFEM과 LL 사이)
      boundary: { x1: 309, y1: 290, x2: 309, y2: 410, atm: [300, 302, "end", "← 대기"], vac: [318, 302, "start", "진공 →"] },
      subfab: [134, 494, 412, 86, 140, 488],     // 서브팹 영역 [x, y, w, h, 글자x, 글자y]
    },
    tall: {
      w: 400, h: 852,
      pm: [8, 176, 384, 332], pmLabel: [22, 198],
      nodes: {
        gasbox: [16, 20, 176, 56], rfgen: [208, 20, 176, 56],
        rps: [16, 100, 120, 56], match: [208, 100, 176, 56],
        sh: [30, 206, 340, 50], plasma: [52, 268, 296, 50], heater: [30, 330, 340, 50], ring: [150, 404, 220, 50],
        throttle: [220, 532, 164, 50], pump: [220, 620, 164, 50], scrubber: [220, 708, 164, 50],
        tm: [16, 532, 160, 50], ll: [16, 620, 160, 50], efem: [16, 708, 160, 50], foup: [16, 796, 160, 50],
      },
      edges: [
        { sys: "gas", pts: [[160, 76], [160, 206]] },
        { sys: "gas", pts: [[136, 128], [160, 128]], dashed: true },
        { sys: "rf", pts: [[296, 76], [296, 100]] },
        { sys: "rf", pts: [[296, 156], [296, 206]] },
        { sys: "exh", pts: [[300, 454], [300, 532]] },
        { sys: "exh", pts: [[302, 582], [302, 620]], label: "포어라인", lx: 308, ly: 600, anchor: "start" },
        { sys: "exh", pts: [[302, 670], [302, 708]] },
        { sys: "wafer", pts: [[96, 532], [96, 380]], both: true },
        { sys: "wafer", pts: [[96, 620], [96, 582]], both: true },
        { sys: "wafer", pts: [[96, 708], [96, 670]], both: true },
        { sys: "wafer", pts: [[96, 796], [96, 758]], both: true },
      ],
      boundary: { x1: 8, y1: 689, x2: 200, y2: 689, vac: [198, 683, "end", "진공 ↑"], atm: [198, 702, "end", "대기 ↓"] },
      subfab: [210, 610, 182, 160, 216, 788],
    },
  };

  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function build(fig, layoutName) {
    const L = LAYOUTS[layoutName];
    const base = fig.dataset.partBase || "../pecvd.html#part=";
    const tall = layoutName === "tall";
    const fsName = tall ? 15 : 16, fsSub = tall ? 11.5 : 12;

    // 화살촉: 계통마다 색이 달라서 계통별로 하나씩
    const markers = Object.keys(SYS).map((k) => `
      <marker id="hm-arrow-${k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M1 1.5 L8.5 5 L1 8.5" class="hm-arrow is-${k}"/>
      </marker>`).join("");

    const [px, py, pw, ph] = L.pm;
    let out = `<svg viewBox="0 0 ${L.w} ${L.h}" class="hm-svg-el is-${layoutName}" role="group" aria-label="PECVD 장비 계통도">
      <defs>${markers}
        <radialGradient id="hm-plasma" cx="50%" cy="50%" r="60%">
          <stop offset="0" class="hm-plasma-a"/><stop offset="1" class="hm-plasma-b"/>
        </radialGradient>
      </defs>`;

    // 서브팹 영역 (점선 상자)
    const [sx, sy, sw, sh, tx, ty] = L.subfab;
    out += `<g class="hm-zone" aria-hidden="true"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="14"/>
      <text x="${tx}" y="${ty}">서브팹 (아래층)</text></g>`;

    // 공정 챔버(PM) 큰 상자: 누르면 공정 챔버 패널
    out += `<a class="hm-pm" href="${esc(base)}pm" data-node="pm" aria-label="공정 챔버 PM — 부품 패널 열기">
      <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18"/>
      <text x="${L.pmLabel[0]}" y="${L.pmLabel[1]}" class="hm-pm-name">PM <tspan class="hm-pm-sub">공정 챔버</tspan></text></a>`;

    // 진공 | 대기 경계선
    const B = L.boundary;
    out += `<g class="hm-boundary" aria-hidden="true"><line x1="${B.x1}" y1="${B.y1}" x2="${B.x2}" y2="${B.y2}"/>
      <text x="${B.atm[0]}" y="${B.atm[1]}" text-anchor="${B.atm[2]}">${B.atm[3]}</text>
      <text x="${B.vac[0]}" y="${B.vac[1]}" text-anchor="${B.vac[2]}">${B.vac[3]}</text></g>`;

    // 선 (계통 색 + 선 모양). 넓은 투명 선 = 마우스 올리기 쉬운 영역
    L.edges.forEach((e) => {
      const d = "M" + e.pts.map((p) => p.join(" ")).join(" L");
      const mk = `url(#hm-arrow-${e.sys})`;
      out += `<g class="hm-edge is-${e.sys}${e.dashed ? " is-dashed" : ""}" data-sys="${e.sys}">
        <path class="hm-hit" d="${d}"/>
        <path class="hm-line" d="${d}" marker-end="${mk}"${e.both ? ` marker-start="${mk}"` : ""}/>
        <path class="hm-flow" d="${d}"/>
        ${e.label ? `<text class="hm-edge-label" x="${e.lx}" y="${e.ly}" text-anchor="${e.anchor || "middle"}">${e.label}</text>` : ""}
      </g>`;
    });

    // 모듈 상자 (누르면 부품 패널)
    Object.keys(L.nodes).forEach((id) => {
      const n = NODES[id], [x, y, w, h] = L.nodes[id];
      const href = n.href || base + n.part;
      const first = n.sys.split(" ")[0];
      const goes = n.href ? "원리 페이지로 이동" : "부품 패널 열기";
      out += `<a class="hm-node is-${first}${n.glow ? " is-plasma" : ""}${n.dashed ? " is-dashed" : ""}" href="${esc(href)}" data-node="${id}" data-sys="${n.sys}"
          aria-label="${esc(n.name)} (${esc(n.sub)}) — ${goes}">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"${n.glow ? ' fill="url(#hm-plasma)"' : ""}/>
        ${n.sys.indexOf(" ") > 0 ? `<rect class="hm-node-band" x="${x + 1}" y="${y + h - 4}" width="${w - 2}" height="3" rx="1.5"/>` : ""}
        <text x="${x + w / 2}" y="${y + h / 2 - 3}" class="hm-node-name" style="font-size:${fsName}px">${esc(n.name)}</text>
        <text x="${x + w / 2}" y="${y + h / 2 + fsSub + 2}" class="hm-node-sub" style="font-size:${fsSub}px">${esc(n.sub)}</text>
      </a>`;
    });
    out += "</svg>";
    return out;
  }

  function setup(fig) {
    const holder = fig.querySelector(".hm-svg");
    const info = fig.querySelector(".hm-info");
    const legendBtns = Array.from(fig.querySelectorAll(".hm-legend [data-sys]"));
    const defaultInfo = info ? info.innerHTML : "";
    let locked = null;      // 버튼으로 고정한 계통
    let layout = "";

    let still = false;
    try { still = new URLSearchParams(location.search).get("still") === "1"; } catch (e) { /* 주소 못 읽으면 움직임 */ }
    if (still) fig.classList.add("is-still");

    // 강조할 계통 정하기 (null = 전부 보통)
    function focus(sys) {
      const s = sys || locked;
      if (s) fig.dataset.focus = s; else delete fig.dataset.focus;
      legendBtns.forEach((b) => b.classList.toggle("is-on", !!s && s.split(" ").indexOf(b.dataset.sys) >= 0));
    }
    function showInfo(id) {
      if (!info) return;
      if (!id) { info.innerHTML = locked ? sysInfo(locked) : defaultInfo; return; }
      if (id === "pm") { info.innerHTML = "<strong>PM 공정 챔버</strong> — 네 계통이 모두 모이는 진공 방. 누르면 공정 챔버 부품 패널이 열립니다."; return; }
      const n = NODES[id];
      const sysNames = n.sys.split(" ").map((k) => SYS[k].name).join(" · ");
      info.innerHTML = `<strong>${esc(n.name)}</strong> <span class="hm-info-sys">${sysNames}</span> — ${esc(n.desc)}`;
    }
    const sysInfo = (k) => `<strong>${SYS[k].name}</strong> — ${SYS[k].desc}. 선 위 모듈을 누르면 부품 패널이 열립니다.`;

    function render() {
      const next = holder.clientWidth < 640 ? "tall" : "wide";
      if (next === layout) return;
      layout = next;
      holder.innerHTML = build(fig, layout);
      const svg = holder.querySelector("svg");
      // 모듈: 올리면 그 계통 강조 + 설명 (샤워헤드처럼 계통이 둘이면 data-focus="gas rf" → 두 계통 모두 또렷)
      svg.querySelectorAll("[data-node]").forEach((a) => {
        const on = () => { focus(a.dataset.sys || null); showInfo(a.dataset.node); };
        const off = () => { focus(null); showInfo(null); };
        a.addEventListener("pointerenter", on);
        a.addEventListener("focus", on);
        a.addEventListener("pointerleave", off);
        a.addEventListener("blur", off);
      });
      svg.querySelectorAll(".hm-edge").forEach((g) => {
        g.addEventListener("pointerenter", () => { focus(g.dataset.sys); if (info) info.innerHTML = sysInfo(g.dataset.sys); });
        g.addEventListener("pointerleave", () => { focus(null); showInfo(null); });
      });
    }

    // 계통 버튼: 올리면 미리 보기, 누르면 고정/해제 (휴대폰은 누르기로)
    legendBtns.forEach((b) => {
      b.addEventListener("pointerenter", () => focus(b.dataset.sys));
      b.addEventListener("pointerleave", () => focus(null));
      b.addEventListener("click", () => {
        locked = locked === b.dataset.sys ? null : b.dataset.sys;
        legendBtns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.sys === locked)));
        focus(null);
        showInfo(null);
      });
    });

    render();
    if ("ResizeObserver" in window) new ResizeObserver(render).observe(holder);
    else window.addEventListener("resize", render);
  }

  // data-sys 속성 선택자 "~="는 공백으로 나뉜 값 중 하나와 맞음 → 샤워헤드(gas rf)는 두 계통 모두에서 또렷
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-hw-map]").forEach(setup);
  });
})();
