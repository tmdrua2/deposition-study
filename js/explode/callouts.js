// =============================================================
// 도면식 이름표(콜아웃) — "01  EFEM  장비 전방 모듈" + 가는 지시선
//
// 렌더러(render-iso.js)가 돌려준 값을 받아 그림 위에 HTML 이름표를 겹쳐 놓는다.
//   labels[].candidates : 그 부품에서 다른 부품에 가려지지 않은 화면 점들 (지시선 끝점 후보)
//   equipBounds         : 장비 윤곽의 화면 범위 → 이름표 기둥을 그 바로 바깥에 둔다
//   floors / tags       : 층 이름(FAB FLOOR …), 작은 표시(PM1 …)
//
// 배치 규칙 (우선순위 순서)
//   1) 지시선끼리 절대 교차하지 않는다  → 모든 선 쌍을 계산으로 검사하고 고친다
//   2) 지시선은 짧게: 끝점 후보 중 기둥에 가장 가까운 점, 모양은 "짧은 사선 + 수평선"
//   3) 이름표 위아래 순서는 부품의 화면 높이순, 교차가 안 생기는 범위에서만 번호순으로 맞춤
//   · 넓은 화면: 기둥에 두 줄 표기 "번호 약어 / 한글명" / 좁은 화면: 기둥에 얇은 선 원 번호 + 그림 아래 목록
//   · 이름표에 마우스·키보드 초점 → 그 부품 외곽선만 포인트 색(청록)으로 강조 (+ opts.onFocus로 알림)
//   · 지시선·끝점·이름표는 처음에 한 번만 만들고, 배치할 때는 위치만 고친다
//     → stage.js가 걸어 둔 "나타나기" 애니메이션 상태가 화면 크기가 바뀌어도 유지됨
//
// 사용법: EquipCallouts.mount(그림틀, 그림 요소(svg 또는 층 묶음), IsoRender.render()의 결과, opts)
//   opts.legendAfter : 좁은 화면 목록을 이 요소 뒤에 넣음 (기본: 그림틀 뒤)
//   opts.onFocus(id) : 이름표에 마우스/초점이 들어오면 부품 id, 나가면 null
//   opts.onSelect(id, 버튼) : 이름표(넓은 화면)·번호 원·아래 목록 항목을 누르면 (부품 패널 열기)
//   돌려주는 lock(id) : 강조를 이 부품에 고정 (패널이 열려 있는 동안), lock(null)로 풀기
//   opts.tagBlocks   : 작은 표시(PM1 …)를 다른 곳에서 그릴 때, 층 이름표가 피해야 할 그 표시들의 자리
//                      [{ point(viewBox 좌표), text, place: "below"|"center" }]
// =============================================================
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const WIDE_MIN = 900;   // 이 폭(px) 이상이면 "번호 약어 한글명", 미만이면 번호만
  const pad2 = (n) => String(n).padStart(2, "0");

  // ---------- 선분 교차 검사 (끝점이 맞닿는 경우는 교차로 보지 않음) ----------
  function crossZ(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  function segCross(p1, p2, q1, q2) {
    const d1 = crossZ(q1, q2, p1), d2 = crossZ(q1, q2, p2), d3 = crossZ(p1, p2, q1), d4 = crossZ(p1, p2, q2);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }
  // 두 지시선(각각 꺾인 선 = 선분 2개)이 교차하나
  function leadersCross(A, B) {
    for (let i = 0; i + 1 < A.length; i++) {
      for (let j = 0; j + 1 < B.length; j++) {
        if (segCross(A[i], A[i + 1], B[j], B[j + 1])) return true;
      }
    }
    return false;
  }

  function mount(figure, svg, info, opts) {
    opts = opts || {};
    // ---------- 요소 만들기 ----------
    const lines = document.createElementNS(SVGNS, "svg");
    lines.setAttribute("class", "callout-lines");
    lines.setAttribute("aria-hidden", "true");
    const layer = document.createElement("div");
    layer.className = "callout-layer";
    figure.append(lines, layer);

    // 이름표 버튼: 누르면 opts.onSelect → 부품 패널 (키보드 Enter·Space도 버튼이라 저절로 됨)
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
      // 지시선(꺾인 선)과 끝점(작은 원): pathLength=1 → stage.js가 선을 "그려 나가듯" 나타낼 수 있음
      const leader = document.createElementNS(SVGNS, "polyline");
      leader.setAttribute("class", "callout-leader");
      leader.setAttribute("pathLength", "1");
      leader.dataset.for = L.id;
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("class", "callout-dot");
      dot.dataset.for = L.id;
      lines.append(leader, dot);
      const on = () => highlight(L.id, true), off = () => highlight(L.id, false);
      b.addEventListener("pointerenter", on);
      b.addEventListener("pointerleave", off);
      b.addEventListener("focus", on);
      b.addEventListener("blur", off);
      b.addEventListener("click", () => { if (opts.onSelect) opts.onSelect(L.id, b); });
      return { L: L, el: b, leader: leader, dot: dot };
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

    // 작은 표시 (PM1~PM4: 공정 챔버와 그 챔버의 펌프에 같은 글자)
    const partTags = (info.tags || []).map((T) => {
      const t = document.createElement("span");
      t.className = "part-tag part-tag-" + T.place;
      t.textContent = T.text;
      t.setAttribute("aria-hidden", "true");
      layer.appendChild(t);
      return { T: T, el: t };
    });

    // 좁은 화면용 목록 (그림 바로 아래)
    const legend = document.createElement("ol");
    legend.className = "callout-legend";
    // 항목마다 버튼 → 휴대폰에서도 목록을 눌러 부품 패널을 열 수 있음
    legend.innerHTML = info.labels.map((L) =>
      '<li><button type="button" class="callout-legend-btn" data-part="' + L.id + '">' +
      '<span class="callout-no">' + pad2(L.no) + '</span><span class="callout-abbr">' + L.abbr +
      '</span><span class="callout-name">' + L.name + "</span></button></li>").join("");
    legend.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => { if (opts.onSelect) opts.onSelect(btn.dataset.part, btn); });
    });
    (opts.legendAfter || figure).after(legend);   // 기본: 그림틀 바로 뒤 (분해 무대에서는 고정 화면 안)

    // ---------- 강조: data-tree에 이 부품 id가 들어 있는 그룹(자기 + 자식)만 ----------
    //   locked: 패널이 열려 있는 동안 강조할 부품 → 마우스가 다른 이름표를 지나가도 바뀌지 않음
    let locked = null;
    function highlight(id, on, force) {
      if (locked && !force) return;
      // data-src-tree: 복사본도 원본 id를 가짐 → PM 이름표에 올리면 PM1~PM4가 모두 강조
      svg.querySelectorAll('[data-src-tree~="' + id + '"]').forEach((g) => g.classList.toggle("is-hl", on));
      items.forEach((it) => { if (it.L.id === id) it.el.classList.toggle("is-hl", on); });
      lines.querySelectorAll('[data-for="' + id + '"]').forEach((n) => n.classList.toggle("is-hl", on));
      if (opts.onFocus) opts.onFocus(on ? id : null);
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

      partTags.forEach((t) => place(t.el, map(t.T.point)));

      // 이름표 기둥 위치: 장비 윤곽 바로 바깥 (단, 이름표가 그림틀 밖으로 나가지 않게)
      items.forEach((it) => { it.el.style.width = ""; it.el.classList.remove("is-right"); });
      const labelW = Math.max(...items.map((it) => it.el.offsetWidth)) + 6;
      const eb = [map([info.equipBounds[0], info.equipBounds[1]]), map([info.equipBounds[2], info.equipBounds[3]])];
      const off = wide ? 22 : 8;
      const EDGE = wide ? 16 : 2;                          // 이름표와 화면 끝 사이 최소 여백
      const colL = Math.max(labelW + EDGE, eb[0][0] - off);        // 왼쪽 기둥 이름표의 오른쪽 끝(지시선이 닿는 x)
      const colR = Math.min(W - labelW - EDGE, eb[1][0] + off);    // 오른쪽 기둥 이름표의 왼쪽 끝
      const GAP = wide ? 38 : 22;                          // 이름표끼리 최소 세로 간격 (넓은 화면은 두 줄 표기)
      const top = 14, bottom = H - 14;

      // 1) 부품마다 왼쪽·오른쪽 끝점 후보와 지시선 길이(비용)
      const all = items.map((it) => {
        const c = (it.L.candidates && it.L.candidates.length ? it.L.candidates : [it.L.point]).map(map);
        const left = c.reduce((a, b) => (b[0] < a[0] ? b : a));
        const right = c.reduce((a, b) => (b[0] > a[0] ? b : a));
        // 끝점: 기둥 쪽 가장자리에서 30% 이내의 후보 중, 부품의 보이는 부분 가운데에 가장 가까운 점
        //   → 지시선은 짧게 유지하면서, 끝점이 옆 부품과 맞닿은 윤곽선에 붙어 헷갈리는 것을 막음
        const cx = c.reduce((s, p) => s + p[0], 0) / c.length, cy = c.reduce((s, p) => s + p[1], 0) / c.length;
        const pick = (edge) => {
          const xs = c.map((p) => p[0]), span = Math.max(...xs) - Math.min(...xs);
          // anchor 면을 지정한 부품(centered)은 가장자리 제한 없이 한가운데 점 → 옆 부품과 헷갈리지 않음
          const near = it.L.centered ? c : c.filter((p) => Math.abs(p[0] - edge[0]) <= span * 0.3 + 1);
          return near.reduce((a, b) => (Math.hypot(b[0] - cx, b[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? b : a));
        };
        return {
          it: it, no: it.L.no,
          A: { left: pick(left), right: pick(right) },
          cost: { left: left[0] - colL, right: colR - right[0] }
        };
      });
      // 2) 기둥 정하기: 지시선이 짧은 쪽. 한쪽에 너무 몰리면 차이가 작은 것부터 옮김
      all.forEach((o) => { o.side = o.cost.left <= o.cost.right ? "left" : "right"; });
      const maxSide = Math.ceil(all.length * 0.65);
      ["left", "right"].forEach((s) => {
        const other = s === "left" ? "right" : "left";
        const group = all.filter((o) => o.side === s).sort((a, b) =>
          (a.cost[other] - a.cost[s]) - (b.cost[other] - b.cost[s]));
        while (group.length > maxSide) group.shift().side = other;
      });

      // 3) 기둥 안 순서 = 끝점 화면 높이순 → 세로 위치 → 지시선 모양
      const order = { left: [], right: [] };
      function sortSides() {
        ["left", "right"].forEach((s) => {
          order[s] = all.filter((o) => o.side === s).sort((a, b) => a.A[s][1] - b.A[s][1] || a.no - b.no);
        });
      }
      function build() {
        ["left", "right"].forEach((s) => {
          const g = order[s];
          const ys = g.map((o) => Math.min(Math.max(o.A[s][1], top), bottom));
          for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
          for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - GAP);
          g.forEach((o, i) => {
            const a = o.A[s], y = ys[i], dir = s === "left" ? -1 : 1;
            const edge = s === "left" ? colL : colR;
            // 짧은 사선(45°) + 수평선. 사선이 기둥을 넘어가지 않게 제한
            const room = Math.abs(edge - a[0]) - 10;
            const dx = Math.max(0, Math.min(Math.abs(y - a[1]), room));
            o.y = y;
            o.path = [a, [a[0] + dir * dx, y], [edge, y]];
          });
        });
      }
      const placed = () => order.left.concat(order.right);
      function crossings() {
        const P = placed(), out = [];
        for (let i = 0; i < P.length; i++) {
          for (let j = i + 1; j < P.length; j++) if (leadersCross(P[i].path, P[j].path)) out.push([P[i], P[j]]);
        }
        return out;
      }
      sortSides();
      build();
      // 4) 교차 고치기: 같은 기둥이면 두 이름표 순서를 바꾸고, 다른 기둥이면 한쪽을 반대 기둥으로
      for (let iter = 0; iter < 80; iter++) {
        const X = crossings();
        if (!X.length) break;
        const [a, b] = X[0];
        if (a.side === b.side) {
          const g = order[a.side], i = g.indexOf(a), j = g.indexOf(b);
          g[i] = b; g[j] = a;
        } else {
          const mover = (a.cost[a.side === "left" ? "right" : "left"] - a.cost[a.side]) <
            (b.cost[b.side === "left" ? "right" : "left"] - b.cost[b.side]) ? a : b;
          mover.side = mover.side === "left" ? "right" : "left";
          sortSides();
        }
        build();
      }
      // 5) 번호순 맞추기: 이웃한 두 이름표가 번호 역순이면 바꿔 보고, 교차가 생기면 되돌림
      let changed = true;
      for (let pass = 0; changed && pass < 12; pass++) {
        changed = false;
        ["left", "right"].forEach((s) => {
          const g = order[s];
          for (let i = 0; i + 1 < g.length; i++) {
            if (g[i].no < g[i + 1].no) continue;
            [g[i], g[i + 1]] = [g[i + 1], g[i]];
            build();
            if (crossings().length) { [g[i], g[i + 1]] = [g[i + 1], g[i]]; build(); }
            else changed = true;
          }
        });
      }

      // 6) 그리기
      placed().forEach((o) => {
        const el = o.it.el, right = o.side === "right";
        el.classList.toggle("is-right", right);
        el.style.top = o.y.toFixed(1) + "px";
        el.style.left = (right ? colR + 4 : colL - 4 - el.offsetWidth).toFixed(1) + "px";
        // 지시선은 끝점(부품) → 이름표 방향으로 그려짐
        o.it.leader.setAttribute("points", o.path.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" "));
        // 끝점: 작은 원 테두리
        o.it.dot.setAttribute("cx", o.path[0][0].toFixed(1));
        o.it.dot.setAttribute("cy", o.path[0][1].toFixed(1));
        o.it.dot.setAttribute("r", wide ? "3" : "2.5");
      });
      // 7) 층 이름표: 층마다 "자기 모서리"를 먼저 시도 → 두 이름표가 한곳에 몰려 겹치지 않음
      //    팹 바닥(위층) = 위 꼭짓점에서 오른쪽으로 뻗은 변(바닥판 위쪽 바깥, 화면 오른쪽 위 빈 곳),
      //    서브팹(아래층) = 아래 꼭짓점에서 왼쪽으로 뻗은 변(바닥판 아래쪽 바깥, 화면 왼쪽 아래 빈 곳).
      //    → 위층 이름은 위에, 아래층 이름은 아래에 놓여 헷갈리지 않음
      //    꼭짓점이 화면 밖(바닥판은 화면보다 넓을 수 있음)이거나 막혀 있으면 그 변을 따라 조금씩 안쪽으로
      //    옮겨 가며, 부품·이름표·지시선·PM 표시·다른 층 이름표와 안 겹치는 첫 자리
      const rectOf = (el) => { const r = el.getBoundingClientRect(); return [r.left - fr.left, r.top - fr.top, r.right - fr.left, r.bottom - fr.top]; };
      const blocks = items.map((it) => rectOf(it.el)).concat(partTags.map((t) => rectOf(t.el)));
      // 다른 곳에서 그리는 PM 표시: 글자 수로 크기를 어림 (CSS .part-tag 크기와 비슷하게)
      (opts.tagBlocks || []).forEach((T) => {
        const p = map(T.point), w = T.text.length * (wide ? 6.2 : 5) + 4, h = wide ? 11 : 9;
        const y0 = T.place === "below" ? p[1] + 6 : p[1] - h / 2;
        blocks.push([p[0] - w / 2, y0, p[0] + w / 2, y0 + h]);
      });
      const hulls = (info.occupied || []).map((h) => h.map(map));
      const hitPoly = (R) => hulls.some((h) => {
        const pts = [[R[0], R[1]], [R[2], R[1]], [R[2], R[3]], [R[0], R[3]], [(R[0] + R[2]) / 2, (R[1] + R[3]) / 2]];
        return pts.some((p) => inPoly(p, h)) || h.some((p) => p[0] > R[0] && p[0] < R[2] && p[1] > R[1] && p[1] < R[3]);
      });
      const hitRect = (R) => blocks.some((B) => R[0] < B[2] && B[0] < R[2] && R[1] < B[3] && B[1] < R[3]) ||
        placed().some((o) => o.path.some((p, i) => i > 0 && segRect(o.path[i - 1], p, R)));   // 지시선과도 안 겹치게
      // [위층, 아래층]이 차례로 시도할 [모서리, 그 모서리에서 뻗은 변의 반대쪽 꼭짓점]
      const PREFER = [[["T", "R"], ["T", "L"], ["R", "B"]], [["B", "L"], ["B", "R"], ["L", "B"]]];
      // 층 높이(z) 순서: 가장 높은 층 = 0번(위층)
      const zRank = floorTags.map((t) => t.F.z || 0).sort((a, b) => b - a);
      floorTags.forEach((t) => {
        const fi = zRank.indexOf(t.F.z || 0);
        const c = (t.F.corners || [t.F.point]).map(map);
        const w = t.el.offsetWidth, h = t.el.offsetHeight;
        const V = {
          L: c.reduce((a, b) => (b[0] < a[0] ? b : a)), R: c.reduce((a, b) => (b[0] > a[0] ? b : a)),
          B: c.reduce((a, b) => (b[1] > a[1] ? b : a)), T: c.reduce((a, b) => (b[1] < a[1] ? b : a))
        };
        const ctr = [(V.L[0] + V.R[0]) / 2, (V.T[1] + V.B[1]) / 2];
        // 점 P에서 바닥 바깥쪽으로 6px 떨어지게 이름표 상자를 놓음
        const boxAt = (P) => {
          const x = P[0] < ctr[0] - 1 ? P[0] - 6 - w : P[0] > ctr[0] + 1 ? P[0] + 6 : P[0] - w / 2;
          const y = P[1] < ctr[1] ? P[1] - 4 - h : P[1] + 4;
          return [x, y];
        };
        const spots = [];
        // 바닥판 안쪽 가장자리: 바깥에 자리가 없을 때(휴대폰에서 바닥판이 그림틀보다 클 때)
        const boxIn = (P) => {
          const x = P[0] < ctr[0] - 1 ? P[0] + 10 : P[0] > ctr[0] + 1 ? P[0] - 10 - w : P[0] - w / 2;
          const y = P[1] < ctr[1] ? P[1] + 6 : P[1] - 6 - h;
          return [x, y];
        };
        [boxAt, boxIn].forEach((fn) => {
          (PREFER[fi] || PREFER[1]).forEach(([k, n]) => {
            const C = V[k], N = V[n];
            for (let f = 0.04; f <= 0.7; f += 0.03) {
              // 변 위의 점에서 바닥판 바깥쪽(가운데 반대쪽)으로 / 안쪽으로
              spots.push(fn([C[0] + (N[0] - C[0]) * f, C[1] + (N[1] - C[1]) * f]));
            }
          });
        });
        // 겹침 점수: 화면 밖 > 이름표·지시선·PM 표시·다른 층 이름표와 겹침 > 부품과 겹침. 0점인 첫 자리, 없으면 가장 낮은 자리
        const score = (sp) => {
          const R = [sp[0] - 2, sp[1] - 2, sp[0] + w + 2, sp[1] + h + 2];
          return (R[0] < 0 || R[2] > W || R[1] < 0 || R[3] > H - (wide ? 28 : 36) ? 100 : 0)   // 아래 = 안내 문구·경로 설명 자리
           + (hitRect(R) ? 10 : 0) + (hitPoly(R) ? 1 : 0);
        };
        let spot = spots[0], best = Infinity;
        for (const sp of spots) {
          const v = score(sp);
          if (v < best) { best = v; spot = sp; }
          if (v === 0) break;
        }
        place(t.el, spot);
        blocks.push([spot[0] - 4, spot[1] - 4, spot[0] + w + 4, spot[1] + h + 4]);
      });

      // 점검용: 남은 교차 수를 속성으로 남김 (0이어야 정상)
      figure.dataset.crossings = String(crossings().length);
    }
    // 선분이 사각형을 지나가나 (사각형 테두리 4변과 교차하거나, 끝점이 안에 있으면)
    function segRect(a, b, R) {
      const inR = (p) => p[0] >= R[0] && p[0] <= R[2] && p[1] >= R[1] && p[1] <= R[3];
      if (inR(a) || inR(b)) return true;
      const c = [[R[0], R[1]], [R[2], R[1]], [R[2], R[3]], [R[0], R[3]]];
      return c.some((p, i) => segCross(a, b, p, c[(i + 1) % 4]));
    }
    function inPoly(pt, poly) {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i], b = poly[j];
        if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
      }
      return hit;
    }
    function place(el, p) {
      el.style.left = p[0].toFixed(1) + "px";
      el.style.top = p[1].toFixed(1) + "px";
    }

    layout();
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => layout());
      ro.observe(figure);
      if (svg !== figure) ro.observe(svg);   // 그림 크기만 바뀌어도 다시 배치
    }
    else window.addEventListener("resize", layout);
    // 글꼴이 늦게 들어오면 글자 폭이 바뀌므로 한 번 더
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    function lock(id) {
      if (locked) { const prev = locked; locked = null; highlight(prev, false, true); }
      if (id) { highlight(id, true, true); locked = id; }
    }

    return { layout: layout, highlight: highlight, lock: lock, items: items, floorTags: floorTags, legend: legend };
  }

  window.EquipCallouts = { mount: mount };
})();
