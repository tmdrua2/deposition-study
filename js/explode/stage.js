// =============================================================
// 장비 분해 무대 — 스크롤하면 장비가 모듈별로 천천히 벌어진다 (GSAP + ScrollTrigger)
//
// 흐름: 화면 고정(pin) → 스크롤 양에 따라 타임라인 하나가 앞뒤로 재생(scrub)
//   ① 외관 (살짝 확대된 상태) → ② 모듈이 차례로 벌어짐 + 도착할 때 이름표 등장
//   → ③ 웨이퍼 경로 점선 → 크림 배경으로 바뀐 장면에서 스크롤이 한 번 멈춤(브레이크, 6-1)
//   → 다시 스크롤하면 고정이 풀리고 아래 본문으로 (위로 올라올 때도 같은 장면에서 한 번 멈춤)
//   위로 스크롤하면 같은 타임라인이 거꾸로 재생 = 정확히 거꾸로 조립
//   분해되어 도착한 모듈(그림이나 이름표)을 누르면 부품 정보 패널이 열림 (panel.js)
//
// 분해 순서·방향은 데이터(data/*.js)의 explodeOrder·explode 값을 그대로 쓴다.
// 이 파일은 "몇 % 벌어졌나"만 다루고, 그림은 render-iso.js가 미리 그려 둔 층을 옮기기만 한다.
//   → 휴대폰 성능: 층마다 CSS transform(translate3d)만 바꿈 = 다시 그리기 없음
//
// 정지 화면: 움직임 줄이기 설정 · 데이터 절약 모드 · 저사양 기기 (판정은 js/motion-pref.js)
//   → 고정·애니메이션 없이 분해된 정지 그림 + 이름표. 데이터 절약·저사양이면 "분해 애니메이션 보기" 링크
// 주소 #part=부품id 로 열면 분해 끝 상태 + 그 부품 패널이 열린 채로 시작 (패널을 열면 주소도 바뀜)
//
// 사용법: <section class="equip-stage" data-equipment="pecvd"> 안에
//         .equip-stage-pin > .iso-figure > [data-iso-view] 를 두고 EquipStage.mount(section)
// =============================================================
(function () {
  "use strict";

  // ---------- 연출 숫자 (여기만 바꾸면 빠르기·간격이 바뀜) ----------
  const MOVE = 1.1;          // 모듈 하나가 벌어지는 시간 (타임라인 단위, 실제 초가 아니라 스크롤 비율)
  const STAGGER = 0.3;       // 같은 차례 안에서 다음 모듈이 출발하기까지 (PM1 → PM2 …)
  const NEXT = 0.75;         // 한 차례의 마지막 모듈이 출발한 뒤 다음 차례가 출발하기까지
  const EASE = "power2.inOut"; // 천천히 출발 → 천천히 도착 (튕김 없음)
  const SCROLL_SCREENS = 4.5;  // 분해 구간 길이 = 화면 높이 × 이 값
  const SCRUB = 1.2;           // 스크롤을 멈춰도 이 시간(초) 동안 미끄러지듯 따라옴
  // 카메라 3단계 (3-B):
  //   ① 첫 화면: 큰 제목 아래 남는 칸에 조립된 장비 전체(서브팹 펌프 포함)가 잘리지 않게
  //   ② 첫 스크롤: 제목이 빠르게 사라지고 장비가 화면 정가운데로 (조금 커짐)
  //   ③ 분해: 첫 모듈이 도착할 때까지 "분해 완료 화면" 크기로 물러남 → 그 뒤로는 카메라 고정.
  //      분해 완료 화면 = 벌어진 장비 + 이름표 + 층 이름 + 경로 설명이 모두 헤더 아래 보이는 영역 안(위아래 여백 포함)
  //      모듈은 바깥쪽으로만 움직이므로 분해 중간 상태도 늘 이 안에 들어감
  const START_W = 0.83;        // 장비 몸체 폭 목표 = 화면 폭 × 이 값 (①·②)
  const START_H = 0.92;        //   단, 높이는 쓸 수 있는 칸 높이 × 이 값을 넘지 않음 (위아래 여백)
  const ZOOM_MAX = 1.25;       // ②의 배율 ÷ 분해 완료 배율의 최댓값 → 분해 중 축소는 최대 20%
  const HERO_OVERLAP = 0.7;    // ① 장비 윗부분이 큰 제목 높이의 아래 30%를 가림 (제목 위 70%는 늘 보임)
  const TITLE_OUT = [0.02, 0.4];   // ② 제목이 사라지는 구간 (타임라인 단위, 전체 길이의 3% 정도)
  const CENTER_END = 0.7;      // ② 장비가 가운데에 도착하는 시각
  const EXPLODE_AT = 0.85;     // 첫 모듈이 출발하는 시각 (가운데 이동이 끝난 뒤)
  // 끝: 분해 + 웨이퍼 경로 → 그 상태로 머묾 → 배경이 남색에서 크림으로 (본문과 같은 색)
  const HOLD_SCREENS = 0.65;   // 웨이퍼 경로를 다 그린 뒤 머무는 스크롤 길이 = 화면 높이 × 이 값
  const CREAM_DUR = 1.0;       // 크림 전환 길이
  const END_HOLD = 0.5;        // 크림 화면에서 잠깐 머문 뒤 고정이 풀림
  // 브레이크: 크림 + 분해 완료 장면에서 스크롤이 한 번 멈춤 (위·아래 어느 쪽으로 지나가도). 다시 스크롤하면 통과
  const BRAKE_AFTER = 0.05;    // 멈추는 시각 = 크림 전환 + 이름표가 다시 다 보인 직후 + 이 값 (END_HOLD 안쪽)
  const BRAKE_GAP = 200;       // 휠 입력이 이 시간(ms) 끊기면 "새 스크롤" → 통과
  const BRAKE_MAX = 1600;      // 이 시간(ms)이 지난 뒤 휠을 줄지 않는 세기로 계속 굴리고 있으면 풀어 줌 (가두지 않기)
  const BRAKE_ABS = 4000;      //   관성이든 뭐든 이 시간(ms)이 지나면 무조건 풀어 줌
  const BRAKE_TOL = 3;         // 멈춘 자리 ± 이 px 안에서 출발하면 브레이크 없이 통과
  // 무대 안 글자·선 색 이름 (CSS .equip-stage-pin의 --st-* / --st-*-light 짝)
  const ST_VARS = ["ink", "muted", "faint", "rule", "rule-strong", "bg", "accent", "shadow", "floor", "floor-line", "lift-shadow"];
  // 웨이퍼가 지나가는 부품 순서 (FOUP는 가운데 로드포트의 것)
  const WAFER_PATH = ["loadport-2.foup", "efem", "loadlock", "tm", "pm"];

  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function mount(stageEl) {
    const eq = window.EQUIPMENT && window.EQUIPMENT[stageEl.dataset.equipment];
    if (!eq) return;
    const pin = stageEl.querySelector(".equip-stage-pin");
    const figure = stageEl.querySelector(".iso-figure");
    const stack = figure.querySelector("[data-iso-view]");
    const hint = figure.querySelector(".iso-hint");
    const caption = figure.querySelector(".iso-caption");
    // 3-A 비주얼: 배경 층·글씨 띠 (없어도 분해 연출은 동작)
    const glow = pin.querySelector(".stage-glow");
    const cream = pin.querySelector(".stage-cream");
    const heroWord = pin.querySelector(".stage-word");
    const heroText = pin.querySelector(".stage-word-text");
    const heroMeta = pin.querySelector(".stage-hero-meta");
    const capBox = pin.querySelector(".stage-captions");
    const header = document.getElementById("site-header");
    if (glow) gsap.set(glow, { xPercent: -50, yPercent: -50, x: 0, y: 0 });

    // ---------- 1) 그리기: 층 묶음(scene) 안에 모듈별 층을 만든다 ----------
    const scene = document.createElement("div");
    scene.className = "iso-scene";
    stack.appendChild(scene);
    const info = IsoRender.render(scene, eq, window.EQUIPMENT_PLATFORMS);
    const vb = info.viewBox;
    const layerById = new Map(info.layers.map((L) => [L.id, L]));

    // PM1~PM4 표시: 모듈 층과 똑같은 크기의 "운반판"에 올려 같은 비율로 함께 옮김
    info.layers.forEach((L) => {
      const mine = info.tags.filter((T) => T.layer === L.id);
      if (!mine.length) return;
      const c = document.createElement("div");
      c.className = "iso-tag-carrier";
      c.dataset.layer = L.id;
      ["left", "top", "width", "height"].forEach((k) => { c.style[k] = L.el.style[k]; });
      mine.forEach((T) => {
        const t = document.createElement("span");
        t.className = "part-tag part-tag-" + T.place;
        t.textContent = T.text;
        t.setAttribute("aria-hidden", "true");
        t.style.left = (((T.point[0] - L.box[0]) / L.box[2]) * 100).toFixed(3) + "%";
        t.style.top = (((T.point[1] - L.box[1]) / L.box[3]) * 100).toFixed(3) + "%";
        c.appendChild(t);
      });
      scene.appendChild(c);
      L.carrier = c;
    });

    // 웨이퍼 경로: 분해된 위치에서 각 부품 윗면 가운데를 잇는 점선 (그림과 같은 viewBox)
    const wafer = svgEl("svg", { class: "wafer-path", viewBox: vb.join(" "), "aria-hidden": "true", focusable: "false" }, scene);
    const wpPts = WAFER_PATH.map((id) => info.partBox(id)).filter(Boolean)
      .map((b) => IsoRender.project([(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.max[2]]));
    const wpD = "M" + wpPts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
    const maskId = "wp-mask-" + stageEl.dataset.equipment;
    const defs = svgEl("defs", {}, wafer);
    const mask = svgEl("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: vb[0], y: vb[1], width: vb[2], height: vb[3] }, defs);
    // 가리개(mask) 선이 처음부터 끝까지 그려지는 만큼만 점선이 보임 → "그려 나가는" 효과
    const reveal = svgEl("path", { class: "wp-reveal", d: wpD, pathLength: "1" }, mask);
    const wpG = svgEl("g", { mask: "url(#" + maskId + ")" }, wafer);
    const wpLine = svgEl("path", { class: "wp-line", d: wpD }, wpG);
    wpPts.forEach((p, i) => svgEl("circle", {
      class: i === wpPts.length - 1 ? "wp-node wp-node-end" : "wp-node", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 4.5
    }, wpG));

    // ---------- 2) 이름표: 분해 완료 위치 기준으로 배치 (교차 0 검사는 callouts.js) ----------
    const labelById = new Map(info.labels.map((L) => [L.id, L]));
    // PM1~PM4 표시의 분해 완료 위치 → 층 이름표(FAB FLOOR …)가 이 자리를 피해서 놓이게
    const tagBlocks = info.tags.map((T) => {
      const L = layerById.get(T.layer), d = L && L.module ? L.module.disp : [0, 0];
      return { point: [T.point[0] + d[0], T.point[1] + d[1]], text: T.text, place: T.place };
    });
    // 마우스를 올린 모듈 그림의 층 (이름표에 올리거나 키보드 초점일 때는 null → 그 이름표의 모듈 전부 확대)
    let hoverLayer = null, hoverLid = null, hoverOffT = 0;
    // 확대 배율: 기본 1.04, 커진 그림이 화면(헤더 아래 보이는 그림틀) 밖이나 이름표 상자에 닿으면 그만큼 줄임
    //   (확대 직전에 위치를 한 번 잴 뿐, 그림은 다시 그리지 않음)
    function liftScale(L) {
      const MAX = 1.04, EDGE = 4;
      const parts = L.el.querySelector(".iso-parts");
      const r = parts && parts.getBoundingClientRect();
      if (!r || !r.width || !r.height) return MAX;
      const fr = figure.getBoundingClientRect();
      const hh = (document.getElementById("site-header") || { offsetHeight: 0 }).offsetHeight;
      const lim = { l: Math.max(fr.left, 0) + EDGE, r: Math.min(fr.right, window.innerWidth) - EDGE,
        t: Math.max(fr.top, hh) + EDGE, b: Math.min(fr.bottom, window.innerHeight) - EDGE };
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, hw = r.width / 2, hh2 = r.height / 2;
      let s = Math.min(MAX, (cx - lim.l) / hw, (lim.r - cx) / hw, (cy - lim.t) / hh2, (lim.b - cy) / hh2);
      // 이름표: 원래는 안 닿는데 커지면 닿는 배율을 넘지 않게 (가로·세로 둘 다 겹쳐야 겹침)
      callouts.items.forEach((it) => {
        const cs = getComputedStyle(it.el);
        if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.1) return;
        const c = it.el.getBoundingClientRect();
        const need = (lo, hi, c0, half, from, to) =>      // 이 축에서 겹치기 시작하는 배율 (이미 겹치면 0)
          to <= lo ? (c0 - to) / half : from >= hi ? (from - c0) / half : 0;
        const sx = need(r.left, r.right, cx, hw, c.left, c.right);
        const sy = need(r.top, r.bottom, cy, hh2, c.top, c.bottom);
        if (sx === 0 && sy === 0) return;                  // 원래부터 겹친 상자(지시선 끝 쪽) → 확대 탓이 아님
        s = Math.min(s, Math.max(sx, sy));
      });
      return Math.max(1, s).toFixed(3);
    }
    const callouts = EquipCallouts.mount(figure, stack, Object.assign({}, info, { tags: [] }), {
      tagBlocks: tagBlocks,
      // 이름표에 마우스를 올리면 그 모듈 층만 또렷하게, 나머지는 살짝 흐리게
      onFocus: (id) => {
        const key = id && labelById.get(id) ? labelById.get(id).key : null;
        scene.classList.toggle("is-focus", !!key);
        info.layers.forEach((L) => {
          const on = !!key && !!L.module && L.module.key === key;
          // 그림에 마우스를 올린 때는 그 복사본 하나만(예: PM3), 이름표면 그 이름표의 모듈 전부(PM1~PM4)
          const lit = on && (!hoverLayer || hoverLayer === L);
          L.el.classList.toggle("is-focus-on", lit);
          if (L.carrier) L.carrier.classList.toggle("is-focus-on", lit);
          if (lit && !L.el.classList.contains("is-lift")) L.el.style.setProperty("--lift", liftScale(L));
          L.el.classList.toggle("is-lift", lit);
        });
      },
      onSelect: (id, btn) => select(id, btn)
    });

    // ---------- 2-1) 부품 정보 패널 ----------
    //   이름표가 나타난 뒤(= 그 모듈이 분해되어 도착한 뒤)에만 열림
    //   열려 있는 동안 그 모듈은 강조 고정, 나머지는 흐리게. 스크롤은 panel.js가 막음
    const allParts = [...((window.EQUIPMENT_PLATFORMS || {})[eq.platform] || { parts: [] }).parts, ...eq.parts];
    const parentOf = new Map(allParts.map((p) => [p.id, p.parent || null]));
    // 내부 부품(예: 샤워헤드)은 이름표가 있는 조상(공정 챔버)을 강조
    const labelIdFor = (id) => { let p = id; while (p && !labelById.has(p)) p = parentOf.get(p); return p; };
    const itemFor = (id) => callouts.items.find((it) => it.L.id === id);
    const arrived = (id) => {
      if (isStatic) return true;
      const it = itemFor(id);
      if (!it) return false;
      const cs = getComputedStyle(it.el);
      return cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.5;
    };
    const panel = window.EquipPanel ? EquipPanel.create({
      equipment: eq, platforms: window.EQUIPMENT_PLATFORMS,
      onOpen: (id) => { callouts.lock(labelIdFor(id)); makeRoom(labelIdFor(id)); },
      // 주소를 #part=부품 으로 (뒤로 가기 기록은 쌓지 않음) → 이 주소를 복사하면 같은 패널이 열린 채로 시작
      onShow: (id) => setHash(id),
      onClose: (byPointer) => {
        callouts.lock(null);
        // 마우스로 닫으면 강조도 풀림. 키보드로 닫으면 이름표에 초점 + 강조가 그대로 (어디에 있었는지 보이게)
        if (byPointer) callouts.muteFocus();
        makeRoom(null);
        setHash(null);
      }
    }) : null;
    function select(id, btn) {
      if (!panel || !arrived(id)) return;
      panel.open(id, btn || (itemFor(id) || {}).el);
    }
    function setHash(id) {
      if (!window.history || !history.replaceState) return;
      try { history.replaceState(null, "", id ? "#part=" + id : location.pathname + location.search); } catch (e) { /* 파일 직접 열기 등에서 막히면 그냥 둠 */ }
    }

    // ---------- 2-1-1) 패널 자리 비키기 (넓은 화면: 오른쪽 패널) ----------
    //   패널이 열리면 선택한 모듈(복사본 포함, 예: PM1~PM4) + 그 이름표가 패널 왼쪽 남은 공간 안에 다 보이도록
    //   그림틀 전체(장비·이름표·지시선)를 왼쪽으로 옮기고, 그래도 넓으면 줄인다. 이미 다 보이면 그대로.
    //   transform만 바꾸므로 이름표 배치는 다시 계산하지 않음. 닫으면 제자리로.
    let roomFor = null;
    const ROOM_GAP = 24;      // 패널과 장비 사이 여백
    function makeRoom(lid, instant) {
      roomFor = lid;
      const to = { x: 0, y: 0, scale: 1 };
      if (lid && panel && window.innerWidth >= 900) {
        const key = (labelById.get(lid) || {}).key;
        // 지금 transform을 뺀 원래 위치로 환산 (패널을 연 채 다른 부품으로 바뀌어도 정확하게)
        const cur = { x: +gsap.getProperty(figure, "x") || 0, y: +gsap.getProperty(figure, "y") || 0, s: +gsap.getProperty(figure, "scale") || 1 };
        const fr = figure.getBoundingClientRect();
        const f0 = { l: fr.left - cur.x, t: fr.top - cur.y };
        const un = (r) => ({ l: f0.l + (r.left - f0.l - cur.x) / cur.s, r: f0.l + (r.right - f0.l - cur.x) / cur.s,
          t: f0.t + (r.top - f0.t - cur.y) / cur.s, b: f0.t + (r.bottom - f0.t - cur.y) / cur.s });
        const rects = [];
        info.layers.forEach((L) => { if (L.module && L.module.key === key) rects.push(un(L.el.getBoundingClientRect())); });
        callouts.items.forEach((it) => { if (it.L.id === lid || (key && it.L.key === key)) rects.push(un(it.el.getBoundingClientRect())); });
        if (rects.length) {
          const U = rects.reduce((u, r) => ({ l: Math.min(u.l, r.l), r: Math.max(u.r, r.r), t: Math.min(u.t, r.t), b: Math.max(u.b, r.b) }));
          const pr = panel.el.getBoundingClientRect();
          const left = 16, right = window.innerWidth - (pr.width || 440) - 16 - ROOM_GAP;
          if (U.r > right || U.l < left) {
            const s = Math.min(1, (right - left) / (U.r - U.l));
            // 오른쪽 끝을 패널 앞에 맞추고, 왼쪽이 화면 밖으로 나가면 왼쪽에 맞춤 (줄였으면 둘 다 들어감)
            let x = right - f0.l - (U.r - f0.l) * s;
            if (f0.l + x + (U.l - f0.l) * s < left) x = left - f0.l - (U.l - f0.l) * s;
            const cy = (U.t + U.b) / 2;
            Object.assign(to, { x: x, y: (cy - f0.t) * (1 - s), scale: s });
          }
        }
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(figure, Object.assign({ transformOrigin: "0 0", duration: instant || reduce ? 0 : 0.45, ease: "power2.out", overwrite: true }, to));
    }
    // 분해된 모듈 그림을 직접 눌러도 열림: 누른 도형에서 가장 가까운 "이름표 있는 부품"
    //   (예: EFEM 위 시그널 타워를 누르면 TOWER, EFEM 몸통이면 EFEM). 없으면 그 모듈의 대표 이름표
    const labelOfLayer = (L) => {
      const key = L.module.key;
      const lab = info.labels.find((x) => x.id === key) || info.labels.find((x) => x.key === key);
      return lab ? lab.id : null;
    };
    function labelAt(target, L) {
      const g = target.closest && target.closest("[data-src-tree]");   // data-src-tree = 자기 → 부모 → … (원본 id)
      const ids = g ? g.getAttribute("data-src-tree").split(" ") : [];
      return ids.find((id) => labelById.has(id)) || labelOfLayer(L);
    }
    const layerAt = (target) => {
      const layerEl = target.closest && target.closest(".iso-layer-module");
      const L = layerEl && layerById.get(layerEl.dataset.layer);
      return L && L.module ? L : null;
    };
    // 이름표가 없는 모듈(케이블 트레이)은 눌러도 열 패널이 없으므로 클릭·손가락 커서를 받지 않음
    info.layers.forEach((L) => { if (L.module && !labelOfLayer(L)) L.el.classList.add("is-unlabeled"); });
    scene.addEventListener("click", (e) => {
      const L = layerAt(e.target);
      const lid = L && labelAt(e.target, L);
      if (lid) select(lid);
    });
    // 분해된 모듈 그림에 마우스를 올리면: 그 부품 강조(청록 외곽선, 나머지 흐림) + 그 모듈이 제자리에서 살짝 확대
    //   터치는 마우스 올림이 없으므로 무시 (탭 = 위의 click → 패널). 패널이 열려 있으면 강조가 고정돼 안 바뀜
    scene.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch") return;
      const L = layerAt(e.target);
      if (!L || !scene.classList.contains("is-exploded")) return;
      clearTimeout(hoverOffT);
      const lid = labelAt(e.target, L);
      if (!lid || !arrived(lid)) return;
      if (hoverLayer === L && hoverLid === lid && L.el.classList.contains("is-lift")) return;
      if (hoverLid && (hoverLayer !== L || hoverLid !== lid)) callouts.highlight(hoverLid, false);
      hoverLayer = L; hoverLid = lid;
      callouts.highlight(lid, true);
    });
    scene.addEventListener("pointerout", (e) => {
      if (e.pointerType === "touch" || !hoverLayer) return;
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".iso-layer-module");
      if (to === hoverLayer.el) return;
      // 부품 사이 작은 틈을 지날 때 깜빡이지 않게 조금 기다렸다가 끔
      clearTimeout(hoverOffT);
      hoverOffT = setTimeout(() => {
        const lid = hoverLid;
        hoverLayer = null; hoverLid = null;
        if (lid) callouts.highlight(lid, false);
      }, 80);
    });

    const legendItems = [...callouts.legend.children];

    // ---------- 2-2) 분해 캡션: 분해 차례마다 하나 ("02 EFEM / 장비 전방 모듈") ----------
    //   차례 안 모듈들의 대표 이름표(그 모듈에서 번호가 가장 작은 것)를 모아 만든다 → 데이터만 바꾸면 캡션도 바뀜
    const pad2 = (n) => String(n).padStart(2, "0");
    const capGroups = [];
    if (capBox) {
      [...new Set(info.sequence.map((m) => m.order))].forEach((o) => {
        const ms = info.sequence.filter((m) => m.order === o);
        const labs = [...new Set(ms.map((m) => m.key))].map((k) =>
          info.labels.filter((L) => L.key === k).sort((a, b) => a.no - b.no)[0]).filter(Boolean);
        if (!labs.length) return;
        const nos = labs.map((L) => L.no).sort((a, b) => a - b);
        const el = document.createElement("div");
        el.className = "stage-cap";
        el.innerHTML =
          '<p class="stage-cap-meta"><span class="stage-cap-no">' +
          (nos.length > 1 ? pad2(nos[0]) + "–" + pad2(nos[nos.length - 1]) : pad2(nos[0])) +
          '</span><span class="stage-cap-abbr">' + labs.map((L) => L.abbr).join(" · ") + "</span></p>" +
          '<p class="stage-cap-name">' + labs.map((L) => L.name).join(" · ") + "</p>";
        capBox.appendChild(el);
        capGroups.push({ el: el, ids: ms.map((m) => m.id), meta: el.firstChild, name: el.lastChild, split: null });
      });
      // 분해가 다 끝나면: 마지막 모듈 캡션 대신 전체 요약 ("ALL 01–11 / PECVD 장비 · 11개 구성 요소")
      //   구성 요소 수 = 이름표 수 (데이터에서 자동으로 셈)
      if (capGroups.length) {
        const nos = info.labels.map((L) => L.no).sort((a, b) => a - b);
        const el = document.createElement("div");
        el.className = "stage-cap stage-cap-summary";
        el.innerHTML =
          '<p class="stage-cap-meta"><span class="stage-cap-no">' + pad2(nos[0]) + "–" + pad2(nos[nos.length - 1]) +
          '</span><span class="stage-cap-abbr">ALL</span></p>' +
          '<p class="stage-cap-name">' + (eq.title || eq.id) + " · " + info.labels.length + "개 구성 요소</p>";
        capBox.appendChild(el);
        capGroups.push({ el: el, ids: null, summary: true, meta: el.firstChild, name: el.lastChild, split: null });
      }
    }

    // ---------- 3) 크기 맞추기 ----------
    //   끝 화면(분해 완료): 벌어진 장비 몸체가 이름표 기둥 사이에 꽉 차게 = 배율 k1 (그림 묶음의 실제 크기)
    //   시작 화면(조립):   장비 몸체가 화면 폭의 START_W만큼 = 배율 k0, 단 k0 ≤ k1 × ZOOM_MAX
    //   바닥 점선판은 몸체보다 넓으므로 화면 가장자리 밖으로 잘려도 됨 (무대가 overflow: clip)
    let isStatic = false;
    // 카메라 (scene에 거는 scale·이동 px): cam0 = ① 첫 화면, camC = ② 가운데. ③ 분해 완료 = {1, 0, 0}
    const cam0 = { zoom: 1, x: 0, y: 0 }, camC = { zoom: 1, x: 0, y: 0 };
    // 코랄 빛 위치 (무대 기준 px): 0 = 첫 화면, c = 가운데, 1 = 분해 완료
    const glowAt = { x0: 0, y0: 0, z0: 1, xc: 0, yc: 0, zc: 1, x1: 0, y1: 0 };
    const eb = info.equipBounds, ab = info.assembledBody;
    // el의 위쪽 위치를 조상 기준 px로 (transform은 무시 → 제목이 애니메이션 중이어도 원래 자리)
    const topIn = (el, anc) => { let y = 0; while (el && el !== anc) { y += el.offsetTop; el = el.offsetParent; } return y; };
    function fit() {
      const header = document.getElementById("site-header");
      stageEl.style.setProperty("--header-h", (header ? header.offsetHeight : 0) + "px");
      // 패널 자리 비키기 중이면 잠깐 원래 자리로 (이름표 배치는 transform 없는 상태로 재야 정확) → 끝에서 다시 비킴
      if (roomFor) gsap.set(figure, { x: 0, y: 0, scale: 1 });
      figure.style.height = "";
      figure.style.flex = "";
      // 휴대폰(목록이 그림 아래 있는 화면): 장비는 폭에 먼저 맞춰져 위아래가 남음
      //   → 남는 높이의 60%를 아래 목록 줄 높이로 돌림 (줄 높이 최대 약 44px = 손가락으로 누르기 좋은 크기)
      //   목록이 커진 만큼 그림틀이 줄어 장비 위아래 빈 곳이 줄어듦 (장비 크기는 그대로)
      const legendEl = callouts.legend;
      legendEl.style.removeProperty("--legend-py");
      if (!isStatic && !figure.classList.contains("is-wide")) {
        const c0 = getComputedStyle(figure);
        const aw = figure.clientWidth - parseFloat(c0.paddingLeft) - parseFloat(c0.paddingRight);
        const ah = figure.clientHeight - parseFloat(c0.paddingTop) - parseFloat(c0.paddingBottom);
        const slack = ah - (eb[3] - eb[1]) * (aw / (eb[2] - eb[0]));
        const cols = getComputedStyle(legendEl).gridTemplateColumns.split(" ").length || 1;
        const rows = Math.ceil(legendEl.children.length / cols);
        if (slack > 0 && rows) legendEl.style.setProperty("--legend-py", (7 + Math.min(9, (slack * 0.6) / (rows * 2))).toFixed(1) + "px");
      }
      const cs = getComputedStyle(figure);
      const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
      const padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
      const availW = Math.max(1, figure.clientWidth - padL - padR);
      const expW = eb[2] - eb[0], expH = eb[3] - eb[1];
      const asmW = ab[2] - ab[0], asmH = ab[3] - ab[1];
      // 큰 제목의 위·아래 (무대 기준). 정지 화면은 그림틀을 제목 아래로 내림
      const word = heroWord && heroWord.offsetHeight ? { top: topIn(heroWord, pin), h: heroWord.offsetHeight } : null;
      // 첫 화면 장비가 올라올 수 있는 가장 높은 곳
      //   스크롤 연출: 제목 아랫부분이 장비 뒤로 들어가게 일부(HERO_OVERLAP)만 비움
      //   정지 화면: 분해된 그림이 제목과 겹치지 않게 제목 아래 끝 + 여유 12px까지 비움
      let heroEdge = !word ? 0 : isStatic ? word.top + word.h + 12 : word.top + word.h * HERO_OVERLAP;
      // 휴대폰처럼 설명이 큰 제목 아래에 놓이면 → 설명 아래부터
      if (word && heroMeta) {
        const mt = topIn(heroMeta, pin);
        if (mt > word.top + word.h * 0.5) heroEdge = Math.max(heroEdge, mt + heroMeta.offsetHeight + 12);
      }
      figure.style.marginTop = isStatic && word ? Math.max(0, heroEdge - padT).toFixed(0) + "px" : "";
      // 쓸 수 있는 높이: 스크롤 연출 = 그림틀(헤더 아래 화면 − 휴대폰 목록) − 위아래 여백
      //   정지 화면 = 헤더 아래 보이는 높이 − 위아래 여백 (그림틀까지 스크롤하면 한 화면에 다 보임)
      const availH = isStatic ? Math.max(200, window.innerHeight - (header ? header.offsetHeight : 0) - padT - padB)
        : Math.max(1, figure.clientHeight - padT - padB);
      // ③ 분해 완료 배율: 벌어진 장비가 이름표 기둥 사이 + 위아래 여백 안에 들어오게
      const k1 = Math.min(availW / expW, availH / expH);
      if (isStatic) {
        // 움직임 줄이기(정지 화면): 고정이 없어 그림틀 높이가 저절로 안 생김 → 분해 그림 높이로 정함
        figure.style.flex = "0 0 auto";
        figure.style.height = (expH * k1 + padT + padB).toFixed(1) + "px";
      }
      const boxH = figure.clientHeight - padT - padB;
      // 그림 묶음(viewBox 전체) 크기 = viewBox × k1, 벌어진 몸체 가운데가 쓸 수 있는 칸 가운데(= 보이는 영역 가운데)에 오게
      const W = vb[2] * k1, H = vb[3] * k1;
      const left = padL + availW / 2 - ((eb[0] + eb[2]) / 2 - vb[0]) * k1;
      const top = padT + boxH / 2 - ((eb[1] + eb[3]) / 2 - vb[1]) * k1;
      Object.assign(stack.style, { width: W.toFixed(1) + "px", height: H.toFixed(1) + "px",
        left: left.toFixed(1) + "px", top: top.toFixed(1) + "px" });
      // 카메라 하나 계산: 조립 몸체를 배율 k로, 몸체 가운데가 그림틀 안 (cx, cy)에 오게
      //   scene은 가운데(W/2, H/2) 기준으로 확대되므로 그만큼 보정
      const bx = ((ab[0] + ab[2]) / 2 - vb[0]) * k1, by = ((ab[1] + ab[3]) / 2 - vb[1]) * k1;
      const camAt = (c, k, cx, cy) => {
        c.zoom = k / k1;
        c.x = (cx - left) - W / 2 - c.zoom * (bx - W / 2);
        c.y = (cy - top) - H / 2 - c.zoom * (by - H / 2);
      };
      const fw = figure.clientWidth, fh = figure.clientHeight;
      // ② 가운데: 보이는 영역 정가운데, 장비 몸체 폭 = 화면 폭 × START_W (높이·축소 한도 안에서)
      const kC = Math.min((window.innerWidth * START_W) / asmW, (availH * START_H) / asmH, k1 * ZOOM_MAX);
      camAt(camC, kC, fw / 2, padT + boxH / 2);
      // ① 첫 화면: 제목 아래(장비 윗부분이 제목 아랫부분을 가림) ~ 아래 여백 사이 칸의 가운데, 장비 전체가 그 칸 안
      const rTop = Math.max(padT * 0.5, heroEdge - figure.offsetTop), rBot = fh - padB;
      const k0 = Math.min(kC, (Math.max(40, rBot - rTop) * 0.96) / asmH);
      camAt(cam0, k0, fw / 2, (rTop + rBot) / 2);
      // 코랄 빛 자리: 트랜스퍼 모듈 가운데(공정 챔버 4개에 둘러싸인 곳). 시작 = 카메라가 당겨 본 위치, 끝 = 분해 완료 위치
      const tb = info.partBox("tm");
      if (glow && tb) {
        const p = IsoRender.project([(tb.min[0] + tb.max[0]) / 2, (tb.min[1] + tb.max[1]) / 2, (tb.min[2] + tb.max[2]) / 2]);
        const sx = (p[0] - vb[0]) * k1, sy = (p[1] - vb[1]) * k1;
        const ox = figure.offsetLeft + left, oy = figure.offsetTop + top;   // 무대(pin) 기준
        glowAt.x1 = ox + sx; glowAt.y1 = oy + sy;
        // 카메라가 scene을 옮기는 것과 똑같이 빛 자리도 옮김
        [["0", cam0], ["c", camC]].forEach(([n, c]) => {
          glowAt["x" + n] = ox + W / 2 + c.zoom * (sx - W / 2) + c.x;
          glowAt["y" + n] = oy + H / 2 + c.zoom * (sy - H / 2) + c.y;
          glowAt["z" + n] = c.zoom;
        });
        const gw = Math.max(420, expW * k1 * 0.95);
        glow.style.setProperty("--glow-w", gw.toFixed(0) + "px");
        glow.style.setProperty("--glow-h", (gw * 0.62).toFixed(0) + "px");
        if (isStatic || !tl) gsap.set(glow, isStatic ? { x: glowAt.x1, y: glowAt.y1, scale: 1 } : { x: glowAt.x0, y: glowAt.y0, scale: glowAt.z0 });
      }
      // 그림 크기·위치가 바뀌었으니 이름표를 바로 다시 배치
      //   (ResizeObserver는 "위치만 바뀐 것"은 알려 주지 않아서 지시선이 어긋날 수 있음)
      callouts.layout();
      // 카메라 값이 바뀌었으면 타임라인의 시작 값도 다시 계산 (진행 정도는 그대로)
      if (tl) { const p = tl.progress(); tl.invalidate(); tl.progress(p); }
      if (roomFor) makeRoom(roomFor, true);
    }
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(pin);
    else window.addEventListener("resize", fit);

    // ---------- 4) 분해 상태를 화면에 적용 (타임라인이 움직일 때마다 호출) ----------
    const seq = info.sequence;
    const prog = {};                       // 모듈별 분해 정도 0~1 (GSAP이 이 값을 바꿈)
    seq.forEach((m) => { prog[m.id] = { p: 0 }; });
    const moving = (id) => { const L = layerById.get(id); return !!L && (Math.abs(L.module.disp[0]) + Math.abs(L.module.disp[1]) > 0.01); };

    // 시간표: 모듈마다 출발 시각 (차례 → 같은 차례 안에서는 시간차)
    const startOf = {};
    let t = EXPLODE_AT;
    [...new Set(seq.map((m) => m.order))].forEach((o) => {
      const ms = seq.filter((m) => m.order === o);
      ms.forEach((m, i) => { startOf[m.id] = t + i * STAGGER; });
      t += (ms.length - 1) * STAGGER + (ms.some((m) => moving(m.id)) ? NEXT : 0.5);
    });
    const endOf = (id) => startOf[id] + (moving(id) ? MOVE : 0.15);
    const moveEnd = Math.max(...seq.map((m) => endOf(m.id)));

    // 앞뒤 순서(z-index): 모듈 하나가 반쯤 갔을 때마다 미리 계산해 둔 순서로 바꿈
    //   keyframes[j] = 분해 순서상 앞의 j개 모듈이 다 벌어진 상태의 순서
    const keyframes = [];
    const done = {};
    keyframes.push(info.ranksFor(done));
    seq.forEach((m) => { done[m.id] = 1; keyframes.push(info.ranksFor(Object.assign({}, done))); });
    const switchAt = seq.map((m) => startOf[m.id] + MOVE / 2);
    let kfNow = 0;

    let tl = null;
    let baseDur = 1;   // buildTimeline()이 정함
    let lightAt = Infinity;   // 이 시각부터 "크림 단계" → 부품 패널도 밝은 유리 (buildTimeline()이 정함)
    let brakeAt = null;       // 브레이크 시각 (buildTimeline()이 정함, 정지 화면이면 없음)
    function apply(force) {
      const now = {};
      seq.forEach((m) => { now[m.id] = prog[m.id].p; });
      info.layers.forEach((L) => {
        if (!L.module) return;
        const p = now[L.id];
        if (!force && p === L.lastP) return;
        L.lastP = p;
        const dx = L.module.disp[0] * p, dy = L.module.disp[1] * p;
        // 층 자기 크기에 대한 %로 옮김 → 화면 크기가 바뀌어도 다시 계산할 필요 없음
        const tf = "translate3d(" + ((dx / L.box[2]) * 100).toFixed(3) + "%," + ((dy / L.box[3]) * 100).toFixed(3) + "%,0)";
        L.el.style.transform = tf;
        if (L.carrier) L.carrier.style.transform = tf;
        if (L.shadow) L.shadow.setAttribute("transform", "translate(" + dx.toFixed(2) + "," + dy.toFixed(2) + ")");
      });
      // 바닥면: 벌어진 모듈까지 덮도록 넓힘
      //   (값이 그대로면 건드리지 않음 → 멈춰 있는 구간에서 다시 그리기 없음)
      const fp = info.floorPointsAt(now);
      info.floorPolys.forEach((f, i) => {
        if (force || f.last !== fp[i]) { f.last = fp[i]; f.el.setAttribute("points", fp[i]); }
      });
      // 앞뒤 순서
      const time = tl ? tl.time() : 0;
      let k = 0;
      while (k < switchAt.length && time >= switchAt[k]) k++;
      if (force || k !== kfNow) {
        kfNow = k;
        info.layers.forEach((L) => { L.el.style.zIndex = String(keyframes[k][L.id]); });
      }
      // 다 분해된 뒤에만 모듈 그림에 "누를 수 있음" 손가락 모양
      scene.classList.toggle("is-exploded", isStatic || (!!tl && time >= moveEnd));
      // 웨이퍼 경로를 다 그린 뒤에만 점선이 천천히 흐름
      const flowing = !!tl && time >= flowAt;
      wafer.classList.toggle("is-flowing", flowing);
      // 장비별 덧그림(예: ALD 사이클 기체 흐름)이 "분해가 끝나고 흐르기 시작/멈춤"을 알 수 있게 알림
      if (flowing !== flowNow) { flowNow = flowing; flowHooks.forEach((f) => f(flowing)); }
      // 크림이 반쯤 차오른 뒤에는 부품 패널을 밝은 유리로 (값이 같으면 classList는 아무것도 안 바꿈)
      document.body.classList.toggle("stage-light", !isStatic && !!tl && time >= lightAt);
    }

    // 흐름 알림 받는 곳 (onFlow로 등록) — 반환값 참고
    let flowNow = false;
    const flowHooks = [];

    // ---------- 5) 타임라인 ----------
    const wpAt = moveEnd + 0.2;            // 웨이퍼 경로 그리기 시작
    const flowAt = wpAt + 1.2;

    function buildTimeline() {
      tl = gsap.timeline({ paused: true, defaults: { ease: EASE }, onUpdate: () => apply(false) });
      // 안내 문구는 바로 사라짐
      if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.3, ease: "none" }, 0.02);
      // 카메라 ①→② 가운데로, ②→③ 첫 모듈이 도착할 때까지 분해 완료 화면 크기로 (그 뒤 고정 → 이름표와 어긋나지 않음)
      //   (함수로 적어 두면 화면 크기가 바뀔 때 invalidate()로 다시 계산됨)
      const firstEnd = endOf(seq[0].id);
      tl.fromTo(scene,
        { scale: () => cam0.zoom, x: () => cam0.x, y: () => cam0.y },
        { scale: () => camC.zoom, x: () => camC.x, y: () => camC.y, duration: CENTER_END - TITLE_OUT[0] }, TITLE_OUT[0])
        .to(scene, { scale: 1, x: 0, y: 0, duration: firstEnd - EXPLODE_AT }, EXPLODE_AT);
      // 코랄 빛도 카메라와 똑같이 움직여 늘 공정 챔버 묶음 뒤에 있음
      //   (정지 화면에서는 아래 3-A 연출을 넣지 않음: 남색 무대 + 큰 제목 + 분해 그림 그대로)
      if (glow && !isStatic) tl.fromTo(glow,
        { x: () => glowAt.x0, y: () => glowAt.y0, scale: () => glowAt.z0 },
        { x: () => glowAt.xc, y: () => glowAt.yc, scale: () => glowAt.zc, duration: CENTER_END - TITLE_OUT[0] }, TITLE_OUT[0])
        .to(glow, { x: () => glowAt.x1, y: () => glowAt.y1, scale: 1, duration: firstEnd - EXPLODE_AT }, EXPLODE_AT);
      // 큰 제목 "PECVD"와 설명: 첫 스크롤에 위로 물러나며 빠르게 사라짐
      //   (제목 h1은 opacity만 → 화면 읽기 프로그램에는 계속 남음)
      const titleDur = TITLE_OUT[1] - TITLE_OUT[0];
      if (heroWord && !isStatic) tl.to(heroWord, { opacity: 0, y: -36, duration: titleDur, ease: "power1.in" }, TITLE_OUT[0]);
      if (heroMeta && !isStatic) tl.to(heroMeta, { autoAlpha: 0, y: -16, duration: titleDur * 0.8, ease: "power1.in" }, TITLE_OUT[0]);
      // 분해 캡션: 그 차례의 첫 모듈이 도착할 즈음 글자가 아래에서 올라오고, 다음 캡션이 오기 직전 위로 빠짐
      //   (TM은 제자리라 이름표가 로드락보다 먼저 나타남 → 캡션 시각은 앞 캡션보다 최소 0.6 뒤로 밀어 순서를 지킴)
      const capAt = [];
      capGroups.forEach((g, i) => {
        // 요약 캡션은 마지막 모듈이 도착한 뒤 (웨이퍼 경로를 그리기 시작할 즈음)
        const t = g.summary ? moveEnd + 0.15 : Math.min(...g.ids.map(endOf)) - 0.2;
        capAt.push(i ? Math.max(t, capAt[i - 1] + 0.6) : t);
      });
      if (!isStatic) capGroups.forEach((g, i) => {
        const chars = g.split ? g.split.chars : [g.name];
        const at = capAt[i];
        tl.fromTo(g.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: "none" }, at)
          .fromTo(g.meta, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "none" }, at)
          .fromTo(chars, { yPercent: 115 }, { yPercent: 0, duration: 0.4, stagger: 0.025, ease: "power3.out" }, at);
        if (i + 1 < capGroups.length) {
          const out = capAt[i + 1] - 0.32;
          tl.to(chars, { yPercent: -115, duration: 0.28, stagger: 0.012, ease: "power2.in" }, out)
            .to(g.meta, { opacity: 0, duration: 0.2, ease: "none" }, out)
            .set(g.el, { autoAlpha: 0 }, capAt[i + 1]);
        }
      });
      // 모듈 이동
      seq.forEach((m) => {
        if (moving(m.id)) tl.to(prog[m.id], { p: 1, duration: MOVE }, startOf[m.id]);
      });
      // 배관: 이어진 모듈 중 가장 먼저 움직이는 모듈이 출발할 때 희미해지며 사라짐
      info.layers.forEach((L) => {
        if (L.kind !== "pipes") return;
        const starts = L.connects.filter((id) => id in startOf).map((id) => startOf[id]);
        const at = starts.length ? Math.min(...starts) : 0.5;
        tl.to(L.svg, { opacity: 0, duration: 0.5, ease: "power1.inOut" }, Math.max(0, at - 0.15));
      });
      // 이름표: 자기 모듈이 도착하면 끝점 → 지시선(그려 나감) → 이름 순서로
      callouts.items.forEach((it) => {
        const lab = labelById.get(it.L.id);
        const at = lab && lab.layer && lab.layer in startOf ? endOf(lab.layer) : firstEnd;
        tl.fromTo(it.dot, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, at)
          .fromTo(it.leader, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.35, ease: "power1.out" }, at + 0.04)
          .fromTo(it.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "power1.out" }, at + 0.3);
        // 휴대폰 목록(01~11)도 그 모듈이 도착할 때 흐린 글자 → 또렷하게
        const li = legendItems[callouts.items.indexOf(it)];
        if (li) tl.fromTo(li, { opacity: 0.28 }, { opacity: 1, duration: 0.3, ease: "none" }, at + 0.3);
      });
      // 층 이름(FAB FLOOR / SUB-FAB): 바닥면이 다 넓어진 뒤
      callouts.floorTags.forEach((f) => {
        tl.fromTo(f.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, moveEnd);
      });
      // 웨이퍼 경로 점선 + 설명
      tl.fromTo(reveal, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: "none" }, wpAt);
      if (caption) tl.fromTo(caption, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, wpAt + 0.4);
      // 스크롤 속도 기준: 3-A의 길이(첫 출발 0.5 + 분해 + 웨이퍼 경로 + 0.8) → 분해 부분의 "스크롤 1px당 진행"은 이전과 같음
      baseDur = flowAt - (EXPLODE_AT - 0.5) + 0.8;
      if (isStatic) { tl.to({}, { duration: 0.8 }); return tl; }
      // 머묾: 웨이퍼 경로를 다 그린 뒤 화면 높이 × HOLD_SCREENS 만큼 스크롤하는 동안 분해 완료 그대로
      //   (스크롤 길이 = 화면 높이 × SCROLL_SCREENS × 길이 ÷ baseDur 이므로 그 비율로 환산)
      const creamAt = flowAt + (HOLD_SCREENS * baseDur) / SCROLL_SCREENS;
      lightAt = creamAt + CREAM_DUR * 0.5;
      const cs = getComputedStyle(pin), bs = getComputedStyle(document.body);
      const from = {}, to = {};
      ST_VARS.forEach((n) => {
        from["--st-" + n] = cs.getPropertyValue("--st-" + n).trim();
        to["--st-" + n] = cs.getPropertyValue("--st-" + n + "-light").trim();
      });
      //   글자(이름표·지시선·캡션·목록)는 잠깐 숨겼다가 → 그동안 색을 바꾸고 → 먹색으로 다시 나타남
      //   (반투명으로 섞으면 남색+크림 = 탁한 회색이 되므로 섞지 않고 덮음)
      const overlays = [figure.querySelector(".callout-layer"), figure.querySelector(".callout-lines"),
        callouts.legend, capBox, caption].filter(Boolean);
      tl.to(overlays, { opacity: 0, duration: 0.25, ease: "none" }, creamAt);
      if (cream) tl.fromTo(cream, { yPercent: 100, y: 0 }, { yPercent: 0, duration: CREAM_DUR, ease: "power2.inOut" }, creamAt);
      tl.fromTo(pin, from, Object.assign({ duration: CREAM_DUR * 0.6, ease: "power1.inOut" }, to), creamAt + 0.25);
      if (header && document.body.classList.contains("page-stage")) {
        // 헤더는 크림이 화면 위쪽까지 차오를 즈음 바뀜
        const v = (n) => bs.getPropertyValue(n).trim();
        tl.fromTo(header,
          { "--hdr-bg": v("--hdr-dark-bg"), "--hdr-ink": v("--hdr-dark-ink"), "--hdr-line": v("--hdr-dark-line") },
          { "--hdr-bg": v("--bg"), "--hdr-ink": v("--ink"), "--hdr-line": v("--line"), duration: CREAM_DUR * 0.4, ease: "power1.inOut" },
          creamAt + CREAM_DUR * 0.6);
      }
      tl.to(overlays, { opacity: 1, duration: 0.3, ease: "none" }, creamAt + CREAM_DUR - 0.15);
      // 브레이크 시각: 이름표가 크림 위에 다시 다 나타난 직후 (그 뒤 END_HOLD가 남아 있어 조금 지나쳐도 화면은 그대로)
      brakeAt = creamAt + CREAM_DUR + 0.15 + BRAKE_AFTER;
      // 크림 화면에서 잠깐 머문 뒤 고정이 풀림
      tl.to({}, { duration: END_HOLD });
      // 점검용 시각표 (헤드리스 검사가 이 시각들로 캡처)
      stageEl._marks = { firstEnd: firstEnd, moveEnd: moveEnd, flowAt: flowAt, creamAt: creamAt, brakeAt: brakeAt, dur: tl.duration() };
      return tl;
    }

    // ---------- 6) 움직임 설정에 따라: 스크롤 연출 / 정지 화면 ----------
    //   정지 화면 = 움직임 줄이기 설정, 또는 데이터 절약 모드·저사양 기기 (판정은 js/motion-pref.js 공용)
    //   데이터 절약·저사양 때문이면 그림 위에 짧은 안내 + "분해 애니메이션 보기" 링크 (?motion=1로 다시 열기)
    const lite = window.MotionPref ? MotionPref.liteReason() : null;
    const LITE_TEXT = {
      "save-data": "데이터 절약 모드라서 분해가 끝난 그림으로 보여 줍니다.",
      "low-end": "기기 부담을 줄이려고 분해가 끝난 그림으로 보여 줍니다.",
      "forced": "정지 화면으로 보여 줍니다."
    };
    //   자리: 큰 제목 옆(휴대폰은 아래) 설명 바로 밑 — 그림틀 위 여백에 두면 큰 제목과 겹침
    function liteNote(on) {
      let n = pin.querySelector(".stage-lite-note");
      if (!on) { if (n) n.hidden = true; return; }
      if (!n) {
        n = document.createElement("p");
        n.className = "stage-lite-note";
        const a = document.createElement("a");
        a.className = "stage-lite-btn";
        a.href = MotionPref.animateUrl();
        a.textContent = "분해 애니메이션 보기";
        n.append(LITE_TEXT[lite] || LITE_TEXT.forced, " ", a);
        (heroMeta || figure).appendChild(n);
      }
      n.hidden = false;
    }
    // ---------- 6-1) 브레이크: 크림 + 분해 완료 장면에서 한 번 "덜컥" 멈춤 ----------
    //   아래로든 위로든 이 장면을 지나가려는 스크롤을 한 번 막고, 스크롤 위치를 장면에 딱 맞춘다.
    //   화면은 고정(pin) + scrub 상태라 위치를 맞춰도 그림이 튀지 않고 부드럽게 따라와 멈춤.
    //   가두지 않기: 멈춘 뒤 "새로" 스크롤하면(휠을 잠깐 멈췄다 다시 / 키를 다시 누름 / 다시 터치) 그대로 통과.
    //   휠: 지나가는 입력을 막음 → 남은 트랙패드 관성은 흘려 버림 → 입력이 끊기거나 새로 쓸어 올리면 풀림
    //   키: 스페이스·방향키·PageUp/Down만 (Home/End는 일부러 멀리 가는 키라 그대로). 꾹 누른 반복 입력은 무시
    //   터치: 손가락으로 끌다 지나가면 그 동작을 멈춤. 튕겨서 미끄러지다 지나가면 스크롤 이벤트로 잡아 되돌림
    //   끄는 경우: 부품 패널이 열려 있을 때, 스크롤바 끌기·목차 링크·#part= 자동 이동(사용자 휠·키·터치가 아님),
    //             정지 화면(움직임 줄이기 등 — 고정 자체가 없음)
    function setupBrake() {
      if (brakeAt == null || !trigger) return () => {};
      const now = () => performance.now();
      // 멈추는 스크롤 위치 (px). 화면 크기가 바뀌면 trigger.start/end가 바뀌므로 매번 계산
      const brakeY = () => Math.round(trigger.start + (trigger.end - trigger.start) * (brakeAt / tl.duration()));
      const blocked = () => !trigger || (panel && panel.isOpen());
      let hold = null;                      // 멈춰 있는 중: { src: 입력 종류, dir: 1 아래 / -1 위, since, lastT, lastD }
      let lastInput = { src: null, t: -1e9 }; // 마지막 사용자 스크롤 입력 (스크롤바·링크 이동과 구별)
      let lastY = window.scrollY;
      let touch = null, touchEndT = -1e9;
      stageEl._brakes = 0;                  // 점검용: 몇 번 멈췄나
      // from → to 움직임이 멈춤 자리를 지나가면 방향(1 / -1), 아니면 0. 멈춘 자리 바로 옆에서 출발하면 0(= 통과)
      const crosses = (from, to) => {
        const b = brakeY();
        if (from < b - BRAKE_TOL && to >= b) return 1;
        if (from > b + BRAKE_TOL && to <= b) return -1;
        return 0;
      };
      const engage = (src, dir) => {
        const t = now();
        hold = { src: src, dir: dir, since: t, lastT: t, lastD: Infinity, hist: [] };   // hist: 최근 휠 세기 기록 [시각, 세기]
        stageEl._brakes++;
        window.scrollTo({ top: brakeY(), behavior: "instant" });
        lastY = window.scrollY;
      };
      // 멈춤이 아직 "살아 있나" (이 시간 안의 같은 입력만 계속 막음 → 그 뒤 스크롤바 끌기 등은 자유)
      const live = (t) => !!hold && (hold.src === "wheel" ? t - hold.lastT < BRAKE_GAP
        : hold.src === "key" ? t - hold.since < 500
        : t - hold.since < 4000 && (!!touch || t - touchEndT < 2500));

      function onWheel(e) {
        if (e.ctrlKey || e.defaultPrevented || blocked()) return;   // ctrl+휠 = 확대
        const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
        if (!d) return;
        const t = now(), dir = d > 0 ? 1 : -1, ad = Math.abs(d);
        lastInput = { src: "wheel", t: t };
        if (hold) {
          // 새 스크롤로 보는 경우: 다른 입력이었음 / 반대 방향 / 입력이 끊겼다 다시 / 너무 오래 /
          //   관성으로 줄어들던 값이 갑자기 커짐(= 손가락으로 새로 쓸어 올림)
          const old = hold.hist && hold.hist.length && t - hold.hist[0][0] >= 250 ? hold.hist[0] : null;
          const fresh = hold.src !== "wheel" || dir !== hold.dir || t - hold.lastT > BRAKE_GAP ||
            t - hold.since > BRAKE_ABS || (t - hold.since > 350 && ad > Math.max(12, hold.lastD * 1.8)) ||
            // 오래 굴렸는데 세기가 줄지 않음 = 관성이 아니라 사용자가 계속 굴리는 중 (줄어드는 관성 끝자락은 계속 흘려 버림)
            //   (0.25초 전 세기와 비교: 관성은 그 사이 눈에 띄게 줄고, 계속 굴리면 그대로)
            (t - hold.since > BRAKE_MAX && !!old && ad >= Math.max(8, old[1] * 0.8));
          if (!fresh) {
            e.preventDefault(); hold.lastT = t; hold.lastD = ad;
            hold.hist.push([t, ad]);
            while (hold.hist.length > 1 && t - hold.hist[1][0] >= 250) hold.hist.shift();   // 0.25초 이상 지난 것 중 가장 최근 하나만 남김
            return;
          }
          hold = null;
        }
        const c = crosses(window.scrollY, window.scrollY + d);
        if (c) { e.preventDefault(); engage("wheel", c); hold.lastD = ad; }
      }

      const KEY_DIR = { PageDown: 1, PageUp: -1, ArrowDown: 1, ArrowUp: -1, " ": 1 };
      function onKey(e) {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || blocked()) return;
        let dir = KEY_DIR[e.key];
        if (!dir) return;
        if (e.key === " " && e.shiftKey) dir = -1;
        const tg = e.target && e.target.closest ? e.target : null;
        // 글 입력 칸에서는 키가 스크롤이 아님. 버튼·링크 위 스페이스도 "누르기"라 스크롤이 아님
        if (tg && tg.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
        if (e.key === " " && tg && tg.closest("button, a[href], summary, [role='button']")) return;
        lastInput = { src: "key", t: now() };
        if (hold) {
          if (hold.src === "key" && e.repeat && dir === hold.dir) { e.preventDefault(); return; }
          hold = null;   // 다시 누름 → 통과
        }
        const step = e.key === "ArrowDown" || e.key === "ArrowUp" ? 40 : window.innerHeight * 0.85;
        const c = crosses(window.scrollY, window.scrollY + dir * step);
        if (c) { e.preventDefault(); engage("key", c); }
      }

      function onTouchStart(e) {
        lastInput = { src: "touch", t: now() };
        hold = null;     // 새 터치 = 새 스크롤 → 통과
        touch = e.touches.length === 1 ? { y: e.touches[0].clientY, sy: window.scrollY, held: false } : null;
      }
      function onTouchMove(e) {
        if (!touch || blocked()) return;
        lastInput = { src: "touch", t: now() };
        if (touch.held) { if (e.cancelable) e.preventDefault(); return; }
        const c = crosses(window.scrollY, touch.sy + (touch.y - e.touches[0].clientY));
        if (c) { if (e.cancelable) e.preventDefault(); touch.held = true; engage("touch", c); }
      }
      function onTouchEnd() {
        touchEndT = now();
        lastInput = { src: "touch", t: touchEndT };
        touch = null;
      }

      // 입력을 미리 못 막은 경우의 안전망 (터치 관성, 부드러운 휠 스크롤이 한 번에 지나간 경우)
      function onScroll() {
        const y = window.scrollY, prev = lastY;
        lastY = y;
        if (blocked()) return;
        const t = now(), b = brakeY();
        if (hold) {
          // 멈춤이 살아 있는 동안 그 방향으로 밀려 나가면 다시 그 자리로
          if (live(t) && (y - b) * hold.dir > BRAKE_TOL) { window.scrollTo({ top: b, behavior: "instant" }); lastY = window.scrollY; }
          return;
        }
        const recent = lastInput.src === "touch" ? (!!touch || t - touchEndT < 2500) : t - lastInput.t < 250;
        if (!lastInput.src || !recent) return;
        const c = crosses(prev, y);
        if (c) { engage(lastInput.src, c); if (lastInput.src === "wheel") hold.lastT = lastInput.t; if (touch) touch.held = true; }
      }

      const nonPassive = { passive: false }, passive = { passive: true };
      window.addEventListener("wheel", onWheel, nonPassive);
      window.addEventListener("keydown", onKey);
      window.addEventListener("touchstart", onTouchStart, passive);
      window.addEventListener("touchmove", onTouchMove, nonPassive);
      window.addEventListener("touchend", onTouchEnd, passive);
      window.addEventListener("touchcancel", onTouchEnd, passive);
      window.addEventListener("scroll", onScroll, passive);
      stageEl._brakeY = brakeY;             // 점검용
      return () => {
        window.removeEventListener("wheel", onWheel, nonPassive);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("touchstart", onTouchStart, passive);
        window.removeEventListener("touchmove", onTouchMove, nonPassive);
        window.removeEventListener("touchend", onTouchEnd, passive);
        window.removeEventListener("touchcancel", onTouchEnd, passive);
        window.removeEventListener("scroll", onScroll, passive);
      };
    }

    let trigger = null;   // 스크롤 연출의 ScrollTrigger (#part= 바로 열기에서 씀)
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      isStatic = !!ctx.conditions.reduce || !!lite;
      stageEl.classList.toggle("is-static", isStatic);
      // 움직임 줄이기 설정이면 안내·링크 없음 (운영체제 설정을 따름)
      liteNote(!!lite && !ctx.conditions.reduce);
      fit();
      callouts.layout();
      // 캡션 한글명을 글자 단위로 쪼갬 (단어마다 가리개 → 글자가 아래에서 올라오는 연출). 정지 화면에서는 캡션을 안 씀
      //   matchMedia 안에서 만들었으므로 설정이 바뀌면 GSAP이 원래 글자로 되돌림
      if (!isStatic && window.SplitText) {
        gsap.registerPlugin(SplitText);
        capGroups.forEach((g) => { g.split = SplitText.create(g.name, { type: "words,chars", mask: "words", tag: "span" }); });
      }
      buildTimeline();
      if (isStatic) {
        // 움직임 줄이기: 분해가 끝난 정지 화면 + 이름표 (흐르는 점선도 없음)
        tl.progress(1);
        apply(true);
        wafer.classList.remove("is-flowing");
        return;
      }
      apply(true);
      // 처음 열 때 한 번만: "PECVD" 글자가 아래에서 차례로 올라옴 + 설명·빛이 서서히 (스크롤과 무관한 유일한 움직임)
      if (heroText && window.SplitText) {
        const hs = SplitText.create(heroText, { type: "chars", mask: "chars", tag: "span" });
        gsap.from(hs.chars, { yPercent: 108, duration: 1.1, stagger: 0.07, ease: "power4.out", delay: 0.1 });
      }
      if (heroMeta) gsap.from(heroMeta.children, { opacity: 0, y: 10, duration: 0.8, stagger: 0.08, ease: "power2.out", delay: 0.5 });
      if (glow) gsap.from(glow, { opacity: 0, duration: 1.4, ease: "power1.out" });
      trigger = ScrollTrigger.create({
        trigger: pin,
        pin: true,
        start: () => "top " + (document.getElementById("site-header") || { offsetHeight: 0 }).offsetHeight + "px",
        // 크림 전환이 붙은 만큼만 길어짐 → 분해 부분의 "스크롤 1px당 진행"은 이전과 같음
        end: () => "+=" + Math.round(window.innerHeight * SCROLL_SCREENS * (tl.duration() / baseDur)),
        scrub: SCRUB,
        animation: tl,
        anticipatePin: 1,
        invalidateOnRefresh: true
      });
      const offBrake = setupBrake();
      // 정리: 설정이 바뀌면(움직임 줄이기 켬/끔) GSAP이 타임라인을 되돌리고, 여기서 층 위치도 처음으로
      return () => {
        offBrake();
        trigger = null;
        seq.forEach((m) => { prog[m.id].p = 0; });
        apply(true);
      };
    });

    // ---------- 7) 주소 #part=부품 으로 열면: 분해가 끝난 상태 + 그 부품 패널이 열린 채로 시작 ----------
    //   예: pecvd.html#part=showerhead (내부 부품도 됨 — 강조는 그 부품이 들어 있는 모듈)
    //   없는 부품 이름이면 아무것도 하지 않음
    function openFromHash() {
      const m = /^#part=([\w-]+)$/.exec(window.location.hash);
      if (!m || !panel || !panel.has(m[1])) return;
      const id = m[1];
      if (!isStatic && trigger && tl) {
        // 분해 끝(웨이퍼 경로까지 그린 시점, 크림 전환 전)으로 바로 이동. scrub 따라오기도 바로 끝냄
        const p = Math.min(1, (flowAt + 0.02) / tl.duration());
        window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * p, behavior: "instant" });
        trigger.update();
        const tw = trigger.getTween && trigger.getTween();
        if (tw) tw.progress(1);
        tl.progress(p);
        apply(true);
      } else {
        // 정지 화면: 그림틀이 보이게 스크롤만
        const hh = (document.getElementById("site-header") || { offsetHeight: 0 }).offsetHeight;
        window.scrollTo({ top: figure.getBoundingClientRect().top + window.scrollY - hh, behavior: "instant" });
      }
      const it = itemFor(labelIdFor(id));
      panel.open(id, it ? it.el : null);
    }
    // 주소 #sections 같은 보통 이름(#part= 아님)으로 열면: 고정 구간 길이가 정해진 뒤 그 요소로 다시 이동
    //   (처음 이동은 분해 무대 높이가 계산되기 전이라 엉뚱한 곳에 멈춤 — 하위 페이지의 "장비 페이지로" 버튼이 #sections로 옴)
    function scrollToPlainHash() {
      const m = /^#([\w-]+)$/.exec(window.location.hash);
      if (!m) return;
      const t = document.getElementById(m[1]);
      if (!t || t.closest(".equip-stage")) return;
      const hh = (document.getElementById("site-header") || { offsetHeight: 0 }).offsetHeight;
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - hh - 16, behavior: "instant" });
    }
    if (/^#[\w-]+$/.test(window.location.hash) && "scrollRestoration" in history) history.scrollRestoration = "manual";

    // 브라우저가 예전 스크롤 위치로 되돌리지 않게 (#part= 위치가 우선)
    if (/^#part=/.test(window.location.hash) && "scrollRestoration" in history) history.scrollRestoration = "manual";
    window.addEventListener("hashchange", openFromHash);

    // 글꼴이 늦게 들어오면 제목 높이가 바뀜 → 고정 위치 다시 계산 → 그다음 #part= 처리
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); ScrollTrigger.refresh(); openFromHash(); scrollToPlainHash(); });
    else setTimeout(() => { openFromHash(); scrollToPlainHash(); }, 300);

    // scene·wafer·onFlow·isStatic: 장비별 덧그림(js/figs/ald-cycle.js)이 쓰는 손잡이
    return {
      info: info, callouts: callouts, panel: panel,
      scene: scene, wafer: wafer, figure: figure, caption: caption, vb: vb,
      onFlow: (f) => { flowHooks.push(f); },
      isStatic: () => isStatic
    };
  }

  window.EquipStage = { mount: mount };
})();
