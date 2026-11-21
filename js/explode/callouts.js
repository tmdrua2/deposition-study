// =============================================================
// 도면식 이름표(콜아웃) — "01  EFEM  장비 전방 모듈" + 가는 지시선
//
// 렌더러(render-iso.js)가 돌려준 이름표 자리(labels)·층 이름 자리(floors)를 받아
// 그림 위에 HTML 이름표를 겹쳐 놓는다. (SVG 글자는 휴대폰에서 너무 작아지므로 HTML로)
//   · 넓은 화면: 그림 왼쪽·오른쪽 기둥에 이름표를 위아래로 정렬하고, 꺾인 지시선으로 연결
//   · 좁은 화면: 그림 위에는 번호 점만, 그림 아래에 번호·약어·한글명 목록
//   · 이름표에 마우스를 올리거나 키보드로 고르면 그 부품의 외곽선만 포인트 색(청록)으로 강조
//
// 사용법: EquipCallouts.mount(그림을 감싼 요소, svg요소, IsoRender.render()의 결과)
// 렌더러를 Three.js로 바꿔도 "화면 위 점 좌표"만 넘겨 주면 그대로 쓸 수 있다.
// =============================================================
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const WIDE_MIN = 900;   // 이 폭(px) 이상이면 양쪽 기둥 이름표, 미만이면 번호 점 + 목록
  const GAP = 30;         // 이름표끼리 최소 세로 간격(px)
  const pad2 = (n) => String(n).padStart(2, "0");

  function mount(figure, svg, info) {
    // ---------- 요소 만들기 ----------
    const lines = document.createElementNS(SVGNS, "svg");
    lines.setAttribute("class", "callout-lines");
    lines.setAttribute("aria-hidden", "true");
    const layer = document.createElement("div");
    layer.className = "callout-layer";
    figure.append(lines, layer);

    // 이름표 버튼 (3단계에서 클릭 → 부품 패널 열기를 붙인다)
    const items = info.labels.map((L) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "callout";
      b.dataset.part = L.id;
      b.setAttribute("aria-label", pad2(L.no) + " " + L.abbr + " " + L.name);
      b.innerHTML =
        '<span class="callout-no">' + pad2(L.no) + "</span>" +
        '<span class="callout-abbr">' + L.abbr + "</span>" +
        '<span class="callout-name">' + L.name + "</span>";
      layer.appendChild(b);
      const on = () => highlight(L.id, true), off = () => highlight(L.id, false);
      b.addEventListener("pointerenter", on);
      b.addEventListener("pointerleave", off);
      b.addEventListener("focus", on);
      b.addEventListener("blur", off);
      return { L: L, el: b };
    });

    // 층 이름표 (FAB FLOOR / SUB-FAB)
    const floorTags = info.floors.map((F) => {
      const t = document.createElement("span");
      t.className = "floor-tag";
      t.innerHTML = '<span class="floor-tag-en">' + F.name + "</span>" +
        (F.ko ? '<span class="floor-tag-ko">' + F.ko + "</span>" : "");
      layer.appendChild(t);
      return { F: F, el: t };
    });

    // 좁은 화면용 목록 (그림 바로 아래)
    const legend = document.createElement("ol");
    legend.className = "callout-legend";
    legend.innerHTML = info.labels.map((L) =>
      '<li><span class="callout-no">' + pad2(L.no) + '</span><span class="callout-abbr">' + L.abbr +
      '</span><span class="callout-name">' + L.name + "</span></li>").join("");
    figure.after(legend);

    // ---------- 강조: data-tree에 이 부품 id가 들어 있는 그룹(자기 + 자식)만 ----------
    function highlight(id, on) {
      svg.querySelectorAll('[data-tree~="' + id + '"]').forEach((g) => g.classList.toggle("is-hl", on));
      items.forEach((it) => { if (it.L.id === id) it.el.classList.toggle("is-hl", on); });
      lines.querySelectorAll('[data-for="' + id + '"]').forEach((n) => n.classList.toggle("is-hl", on));
    }

    // ---------- 배치: 그림 크기가 바뀔 때마다 다시 계산 ----------
    function layout() {
      const wide = figure.clientWidth >= WIDE_MIN;
      figure.classList.toggle("is-wide", wide);
      const fr = figure.getBoundingClientRect();
      const sr = svg.getBoundingClientRect();
      const W = fr.width, H = fr.height;
      if (!sr.width || !sr.height) return;
      // viewBox 좌표 → 그림틀 안의 px 좌표 (preserveAspectRatio 기본값 = 가운데 맞춤)
      const vb = info.viewBox;
      const sc = Math.min(sr.width / vb[2], sr.height / vb[3]);
      const ox = sr.left - fr.left + (sr.width - vb[2] * sc) / 2;
      const oy = sr.top - fr.top + (sr.height - vb[3] * sc) / 2;
      const map = (p) => [ox + (p[0] - vb[0]) * sc, oy + (p[1] - vb[1]) * sc];

      lines.setAttribute("viewBox", "0 0 " + W.toFixed(0) + " " + H.toFixed(0));
      lines.setAttribute("width", W.toFixed(0));
      lines.setAttribute("height", H.toFixed(0));
      while (lines.firstChild) lines.removeChild(lines.firstChild);

      floorTags.forEach((t) => {
        const p = map(t.F.point);
        t.el.style.left = p[0].toFixed(1) + "px";
        t.el.style.top = p[1].toFixed(1) + "px";
      });

      const pts = items.map((it) => map(it.L.point));
      if (!wide) {
        // 좁은 화면: 부품 위치에 번호 점만
        items.forEach((it, i) => {
          it.el.style.left = pts[i][0].toFixed(1) + "px";
          it.el.style.top = pts[i][1].toFixed(1) + "px";
          it.el.style.width = "";
        });
        return;
      }

      // 넓은 화면: 그림 가운데보다 왼쪽에 있는 부품은 왼쪽 기둥, 오른쪽은 오른쪽 기둥
      const col = sr.left - fr.left;                    // 기둥 폭 = 그림 왼쪽 여백
      const mid = ox + (vb[2] * sc) / 2;
      ["left", "right"].forEach((side) => {
        const group = items.map((it, i) => ({ it: it, p: pts[i] }))
          .filter((o) => (side === "left") === (o.p[0] < mid))
          .sort((a, b) => a.p[1] - b.p[1]);
        // 세로 위치: 부품 높이에 맞추되, 서로 GAP 이상 떨어지게 위→아래, 아래→위 두 번 밀기
        const top = 16, bottom = H - 16;
        const ys = group.map((o) => Math.min(Math.max(o.p[1], top), bottom));
        for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
        for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - GAP);
        group.forEach((o, i) => {
          const y = ys[i], el = o.it.el;
          el.classList.toggle("is-right", side === "right");
          el.style.width = (col - 12).toFixed(0) + "px";
          el.style.top = y.toFixed(1) + "px";
          el.style.left = (side === "left" ? 0 : W - col + 12).toFixed(1) + "px";
          // 지시선: 이름표 끝 → 짧은 수평선(선반) → 부품 위 점
          const edge = side === "left" ? col - 4 : W - col + 4;
          const shelf = side === "left" ? col + 14 : W - col - 14;
          const pl = document.createElementNS(SVGNS, "polyline");
          pl.setAttribute("points", [[edge, y], [shelf, y], o.p].map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" "));
          pl.setAttribute("class", "callout-leader");
          pl.dataset.for = o.it.L.id;
          lines.appendChild(pl);
          const dot = document.createElementNS(SVGNS, "circle");
          dot.setAttribute("cx", o.p[0].toFixed(1));
          dot.setAttribute("cy", o.p[1].toFixed(1));
          dot.setAttribute("r", "2.6");
          dot.setAttribute("class", "callout-dot");
          dot.dataset.for = o.it.L.id;
          lines.appendChild(dot);
        });
      });
    }

    layout();
    if ("ResizeObserver" in window) new ResizeObserver(() => layout()).observe(figure);
    else window.addEventListener("resize", layout);
    // 글꼴이 늦게 들어오면 글자 폭이 바뀌므로 한 번 더
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    return { layout: layout, highlight: highlight };
  }

  window.EquipCallouts = { mount: mount };
})();
