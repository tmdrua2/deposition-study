// =============================================================
// 장비 분해 무대 — 스크롤하면 장비가 모듈별로 천천히 벌어진다 (GSAP + ScrollTrigger)
//
// 흐름: 화면 고정(pin) → 스크롤 양에 따라 타임라인 하나가 앞뒤로 재생(scrub)
//   ① 외관 (살짝 확대된 상태) → ② 모듈이 차례로 벌어짐 + 도착할 때 이름표 등장
//   → ③ 웨이퍼 경로 점선 → 잠깐 머문 뒤 고정이 풀리고 아래 본문으로
//   위로 스크롤하면 같은 타임라인이 거꾸로 재생 = 정확히 거꾸로 조립
//   분해되어 도착한 모듈(그림이나 이름표)을 누르면 부품 정보 패널이 열림 (panel.js)
//
// 분해 순서·방향은 데이터(data/*.js)의 explodeOrder·explode 값을 그대로 쓴다.
// 이 파일은 "몇 % 벌어졌나"만 다루고, 그림은 render-iso.js가 미리 그려 둔 층을 옮기기만 한다.
//   → 휴대폰 성능: 층마다 CSS transform(translate3d)만 바꿈 = 다시 그리기 없음
//
// 움직임 줄이기(prefers-reduced-motion) 설정: 고정·애니메이션 없이 분해된 정지 그림 + 이름표
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
  // 카메라: 진입 순간 조립된 장비를 크게 → 분해하면서 아주 조금만 물러남
  const START_W = 0.83;        // 진입 순간 장비 몸체 폭 = 화면 폭 × 이 값 (목표)
  const START_H = 0.96;        //   단, 높이는 무대 높이 × 이 값을 넘지 않음 (가로로 긴 화면은 높이가 먼저 참)
  const ZOOM_MAX = 1.25;       // 시작 배율 ÷ 끝 배율의 최댓값 → 분해 중 축소는 최대 20% (1 ÷ 1.25 = 0.8)
  // 끝: 분해가 끝나고 웨이퍼 경로가 그려진 뒤 → 배경이 남색에서 크림으로 (본문과 같은 색)
  const CREAM_GAP = 0.3;       // 웨이퍼 경로를 다 그린 뒤 크림 전환이 시작되기까지
  const CREAM_DUR = 1.0;       // 크림 전환 길이
  const END_HOLD = 0.5;        // 크림 화면에서 잠깐 머문 뒤 고정이 풀림
  // 무대 안 글자·선 색 이름 (CSS .equip-stage-pin의 --st-* / --st-*-light 짝)
  const ST_VARS = ["ink", "muted", "faint", "rule", "rule-strong", "bg", "accent", "shadow", "floor", "floor-line"];
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
    const callouts = EquipCallouts.mount(figure, stack, Object.assign({}, info, { tags: [] }), {
      tagBlocks: tagBlocks,
      // 이름표에 마우스를 올리면 그 모듈 층만 또렷하게, 나머지는 살짝 흐리게
      onFocus: (id) => {
        const key = id && labelById.get(id) ? labelById.get(id).key : null;
        scene.classList.toggle("is-focus", !!key);
        info.layers.forEach((L) => {
          const on = !!key && !!L.module && L.module.key === key;
          L.el.classList.toggle("is-focus-on", on);
          if (L.carrier) L.carrier.classList.toggle("is-focus-on", on);
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
      onOpen: (id) => callouts.lock(labelIdFor(id)),
      onClose: () => callouts.lock(null)
    }) : null;
    function select(id, btn) {
      if (!panel || !arrived(id)) return;
      panel.open(id, btn || (itemFor(id) || {}).el);
    }
    // 분해된 모듈 그림을 직접 눌러도 열림 (그 모듈의 대표 이름표 = 모듈 id와 같은 이름표, 없으면 그 모듈의 첫 이름표)
    scene.addEventListener("click", (e) => {
      const layerEl = e.target.closest && e.target.closest(".iso-layer-module");
      const L = layerEl && layerById.get(layerEl.dataset.layer);
      if (!L || !L.module) return;
      const key = L.module.key;
      const lab = info.labels.find((x) => x.id === key) || info.labels.find((x) => x.key === key);
      if (lab) select(lab.id);
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
    }

    // ---------- 3) 크기 맞추기 ----------
    //   끝 화면(분해 완료): 벌어진 장비 몸체가 이름표 기둥 사이에 꽉 차게 = 배율 k1 (그림 묶음의 실제 크기)
    //   시작 화면(조립):   장비 몸체가 화면 폭의 START_W만큼 = 배율 k0, 단 k0 ≤ k1 × ZOOM_MAX
    //   바닥 점선판은 몸체보다 넓으므로 화면 가장자리 밖으로 잘려도 됨 (무대가 overflow: clip)
    let isStatic = false;
    const cam = { zoom: 1, x: 0, y: 0 };   // 시작 화면의 카메라 (scene에 거는 scale·이동 px)
    const glowAt = { x0: 0, y0: 0, x1: 0, y1: 0, zoom: 1 };   // 코랄 빛의 시작·끝 위치 (무대 기준 px)
    const eb = info.equipBounds, ab = info.assembledBody;
    function fit() {
      const header = document.getElementById("site-header");
      stageEl.style.setProperty("--header-h", (header ? header.offsetHeight : 0) + "px");
      figure.style.height = "";
      figure.style.flex = "";
      const cs = getComputedStyle(figure);
      const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
      const padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
      const wide = figure.classList.contains("is-wide");
      const availW = Math.max(1, figure.clientWidth - padL - padR);
      // 휴대폰: 그림틀 높이를 내용에 맞추므로 높이 제한은 "무대 높이 − 아래 목록" 정도로 어림
      const pinH = pin.clientHeight;
      const legendH = (!wide && callouts.legend) ? callouts.legend.offsetHeight + 12 : 0;
      const band = pin.querySelector(".stage-band");
      const bandH = band ? band.offsetHeight : 0;   // 위쪽 글씨 띠 (큰 제목·캡션 자리)
      const availH = isStatic ? window.innerHeight * 0.78
        : Math.max(1, (wide ? figure.clientHeight : pinH - bandH - legendH) - padT - padB);
      const expW = eb[2] - eb[0], expH = eb[3] - eb[1];
      const asmW = ab[2] - ab[0], asmH = ab[3] - ab[1];
      const k1 = Math.min(availW / expW, availH / expH);
      const k0 = isStatic ? k1 : Math.max(k1, Math.min(
        (window.innerWidth * START_W) / asmW, availH * START_H / asmH, k1 * ZOOM_MAX));
      // 그림 묶음(viewBox 전체) 크기 = viewBox × k1, 벌어진 몸체 가운데가 쓸 수 있는 칸 가운데에 오게
      const W = vb[2] * k1, H = vb[3] * k1;
      if (isStatic || !wide) {
        // 휴대폰: 그림틀 높이 = 시작·끝 중 더 큰 그림 높이 → 남는 높이는 그림+목록 위아래로 고르게 (CSS margin auto)
        // 움직임 줄이기(정지 화면): 고정이 없어 그림틀 높이가 저절로 안 생김 → 분해 그림 높이로 정함
        figure.style.flex = "0 0 auto";
        figure.style.height = (Math.max(expH * k1, asmH * k0) + padT + padB).toFixed(1) + "px";
      }
      const boxH = figure.clientHeight - padT - padB;
      const left = padL + availW / 2 - ((eb[0] + eb[2]) / 2 - vb[0]) * k1;
      const top = padT + boxH / 2 - ((eb[1] + eb[3]) / 2 - vb[1]) * k1;
      Object.assign(stack.style, { width: W.toFixed(1) + "px", height: H.toFixed(1) + "px",
        left: left.toFixed(1) + "px", top: top.toFixed(1) + "px" });
      // 시작 카메라: scene을 가운데(W/2, H/2) 기준으로 zoom배 → 조립 몸체 가운데가 그림틀 가운데(헤더 아래 화면 가운데)에 오게 이동
      const zoom = k0 / k1;
      const bx = ((ab[0] + ab[2]) / 2 - vb[0]) * k1, by = ((ab[1] + ab[3]) / 2 - vb[1]) * k1;
      const tx = figure.clientWidth / 2 - left, ty = padT + boxH / 2 - top;   // 안내 문구 자리 위 칸의 가운데
      cam.zoom = zoom;
      cam.x = tx - W / 2 - zoom * (bx - W / 2);
      cam.y = ty - H / 2 - zoom * (by - H / 2);
      // 코랄 빛 자리: 트랜스퍼 모듈 가운데(공정 챔버 4개에 둘러싸인 곳). 시작 = 카메라가 당겨 본 위치, 끝 = 분해 완료 위치
      const tb = info.partBox("tm");
      if (glow && tb) {
        const p = IsoRender.project([(tb.min[0] + tb.max[0]) / 2, (tb.min[1] + tb.max[1]) / 2, (tb.min[2] + tb.max[2]) / 2]);
        const sx = (p[0] - vb[0]) * k1, sy = (p[1] - vb[1]) * k1;
        const ox = figure.offsetLeft + left, oy = figure.offsetTop + top;   // 무대(pin) 기준
        glowAt.x1 = ox + sx; glowAt.y1 = oy + sy;
        glowAt.x0 = ox + W / 2 + zoom * (sx - W / 2) + cam.x;
        glowAt.y0 = oy + H / 2 + zoom * (sy - H / 2) + cam.y;
        glowAt.zoom = zoom;
        const gw = Math.max(420, expW * k1 * 0.95);
        glow.style.setProperty("--glow-w", gw.toFixed(0) + "px");
        glow.style.setProperty("--glow-h", (gw * 0.62).toFixed(0) + "px");
        if (isStatic || !tl) gsap.set(glow, isStatic ? { x: glowAt.x1, y: glowAt.y1, scale: 1 } : { x: glowAt.x0, y: glowAt.y0, scale: zoom });
      }
      // 그림 크기·위치가 바뀌었으니 이름표를 바로 다시 배치
      //   (ResizeObserver는 "위치만 바뀐 것"은 알려 주지 않아서 지시선이 어긋날 수 있음)
      callouts.layout();
      // 카메라 값이 바뀌었으면 타임라인의 시작 값도 다시 계산 (진행 정도는 그대로)
      if (tl) { const p = tl.progress(); tl.invalidate(); tl.progress(p); }
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
    let t = 0.5;
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
      wafer.classList.toggle("is-flowing", !!tl && time >= flowAt);
      // 크림이 반쯤 차오른 뒤에는 부품 패널을 밝은 유리로 (값이 같으면 classList는 아무것도 안 바꿈)
      document.body.classList.toggle("stage-light", !isStatic && !!tl && time >= lightAt);
    }

    // ---------- 5) 타임라인 ----------
    const wpAt = moveEnd + 0.2;            // 웨이퍼 경로 그리기 시작
    const flowAt = wpAt + 1.2;

    function buildTimeline() {
      tl = gsap.timeline({ paused: true, defaults: { ease: EASE }, onUpdate: () => apply(false) });
      // 안내 문구는 바로 사라짐
      if (hint) tl.to(hint, { autoAlpha: 0, duration: 0.3, ease: "none" }, 0.02);
      // 카메라: 크게 본 외관 → 첫 모듈이 도착할 때까지 아주 조금(최대 20%) 물러남
      const firstEnd = endOf(seq[0].id);
      //   (함수로 적어 두면 화면 크기가 바뀔 때 invalidate()로 다시 계산됨)
      tl.fromTo(scene,
        { scale: () => cam.zoom, x: () => cam.x, y: () => cam.y },
        { scale: 1, x: 0, y: 0, duration: firstEnd - 0.15 }, 0.15);
      // 코랄 빛도 카메라와 똑같이 움직여 늘 공정 챔버 묶음 뒤에 있음
      //   (정지 화면에서는 아래 3-A 연출을 넣지 않음: 남색 무대 + 큰 제목 + 분해 그림 그대로)
      if (glow && !isStatic) tl.fromTo(glow,
        { x: () => glowAt.x0, y: () => glowAt.y0, scale: () => glowAt.zoom },
        { x: () => glowAt.x1, y: () => glowAt.y1, scale: 1, duration: firstEnd - 0.15 }, 0.15);
      // 큰 제목 "PECVD"와 설명: 첫 모듈이 출발할 때 위로 살짝 물러나며 흐려짐 → 같은 자리에 캡션이 들어옴
      //   (제목 h1은 opacity만 → 화면 읽기 프로그램에는 계속 남음)
      if (heroWord && !isStatic) tl.to(heroWord, { opacity: 0, y: -28, duration: 0.55, ease: "power1.in" }, 0.3);
      if (heroMeta && !isStatic) tl.to(heroMeta, { autoAlpha: 0, y: -16, duration: 0.45, ease: "power1.in" }, 0.3);
      // 분해 캡션: 그 차례의 첫 모듈이 도착할 즈음 글자가 아래에서 올라오고, 다음 캡션이 오기 직전 위로 빠짐
      //   (TM은 제자리라 이름표가 로드락보다 먼저 나타남 → 캡션 시각은 앞 캡션보다 최소 0.6 뒤로 밀어 순서를 지킴)
      const capAt = [];
      capGroups.forEach((g, i) => {
        const t = Math.min(...g.ids.map(endOf)) - 0.2;
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
        const at = lab && lab.layer && lab.layer in startOf ? endOf(lab.layer) : 0.6;
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
      // 3-A 이전 구성의 길이(웨이퍼 경로 + 0.8 머묾) → 분해 부분의 스크롤 속도를 그대로 두는 기준
      baseDur = flowAt + 0.8;
      if (isStatic) { tl.to({}, { duration: 0.8 }); return tl; }
      // 크림 전환: 크림 덮개가 덮이고, 무대 안 글자·선 색과 헤더 색이 남색 단계 → 크림 단계로
      const creamAt = tl.duration() + CREAM_GAP;
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
      // 크림 화면에서 잠깐 머문 뒤 고정이 풀림
      tl.to({}, { duration: END_HOLD });
      return tl;
    }

    // ---------- 6) 움직임 설정에 따라: 스크롤 연출 / 정지 화면 ----------
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      isStatic = !!ctx.conditions.reduce;
      stageEl.classList.toggle("is-static", isStatic);
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
      ScrollTrigger.create({
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
      // 정리: 설정이 바뀌면(움직임 줄이기 켬/끔) GSAP이 타임라인을 되돌리고, 여기서 층 위치도 처음으로
      return () => {
        seq.forEach((m) => { prog[m.id].p = 0; });
        apply(true);
      };
    });
    // 글꼴이 늦게 들어오면 제목 높이가 바뀜 → 고정 위치 다시 계산
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); ScrollTrigger.refresh(); });

    return { info: info, callouts: callouts, panel: panel };
  }

  window.EquipStage = { mount: mount };
})();
