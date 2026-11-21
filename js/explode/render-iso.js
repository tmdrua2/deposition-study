// =============================================================
// 아이소메트릭(2.5D) 렌더러 — data/*.js 의 3D 형태 데이터를 SVG로 그린다
//
// 데이터에는 "무엇이 어디에 어떤 모양으로" 만 있고, 여기서 "어떻게 그리나"를 정한다.
//   · 3D 좌표 → 화면 좌표 변환 (오른쪽 앞 위에서 내려다보는 시점)
//   · 면마다 명암 (빛은 왼쪽 앞 위에서 옴: 윗면 밝게, 왼쪽 면 중간, 오른쪽 면 어둡게)
//   · 얇은 외곽선, 윗면 모서리 하이라이트, 바닥 그림자
//   · 재질 마감: 도장(panel) · 금속(metal·pipe: 반사 하이라이트) · 유리 · 고무(cable)
//   · 디테일: seam(패널 이음선) · bolts(볼트) · vent(통풍구) · window(관찰창)
//             label-plate(빈 표시판) · handle(손잡이) · holes(구멍)
//             warning-label(노란 경고 라벨) · button(빨간 버튼) · screen(조작 화면)
//   · 층: data의 site.floors → 점선 바닥면 (Fab floor / Sub-fab)
//   · 접촉 음영(AO): 다른 부품 위에 얹힌 부품 둘레 + 옆면 아랫단을 어둡게 → 맞닿은 틈의 입체감
//   · 이름표 끝점 후보: 다른 부품에 가려지지 않은 점만 골라 callouts.js에 넘김
//   · 색은 css/style.css 의 :root 변수(--mat-재질이름)에서 읽어 온다
//   · 모듈(explodeOrder가 있는 부품 덩어리)마다 따로 된 SVG 층 → stage.js가 transform으로 옮김
//   · 돌려주는 값: 층 목록·분해 순서·층 앞뒤 순서 계산 함수 + 분해 완료 상태의
//     이름표 자리(labels)·층 이름 자리(floors) → js/explode/stage.js, callouts.js가 씀
//
// 사용법:  IsoRender.render(층을 담을 div, window.EQUIPMENT.pecvd, window.EQUIPMENT_PLATFORMS)
// 나중에 Three.js로 바꾸면 이 파일만 render-3d.js로 바꾸고 데이터는 그대로 쓴다.
// =============================================================
(function () {
  "use strict";

  const K = 20;                     // 1u(추상 단위)를 SVG 좌표 몇 칸으로 그릴지
  const COS30 = Math.cos(Math.PI / 6);
  const SIN30 = 0.5;
  const VIEW = [1, -1, 1];          // 보는 사람 쪽 방향 (이 방향을 향한 면만 보임)
  const LIGHT = normalize([-0.3, -0.55, 0.78]); // 빛이 오는 방향
  const SVGNS = "http://www.w3.org/2000/svg";
  // 반사 하이라이트 방향: 빛 방향과 보는 방향의 중간 (이 방향을 향한 금속 면이 반짝임)
  const HALF = normalize(add(LIGHT, normalize(VIEW)));

  // 재질별 마감 — 데이터에는 재질 "이름"만 있고, 어떻게 보일지는 여기서 정한다
  //   metal: 밝은 반사띠·반사선 / glass: 어두운 유리 / rubber: 약한 광택 / paint: 도장(기본)
  const FINISH = {
    metal: "metal", pipe: "metal",
    glass: "glass", screen: "glass",
    cable: "rubber"
  };
  function finishOf(material) { return FINISH[material] || "paint"; }

  // ---------- 작은 벡터 계산 ----------
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function normalize(a) { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  // 위에서 봤을 때 반시계 방향으로 회전 (z축 기준)
  function rotZ(v, rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  }

  // 3D 점 → 화면 점. x는 오른쪽 아래로, y(안쪽)는 오른쪽 위로, z는 위로
  function project(p) {
    return [(p[0] + p[1]) * COS30 * K, ((p[0] - p[1]) * SIN30 - p[2]) * K];
  }

  // ---------- 색 ----------
  const MAT_FALLBACK = "#C9CDD2";
  function hexToRgb(hex) {
    let h = String(hex).trim().replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    if (Number.isNaN(n) || h.length !== 6) return hexToRgb(MAT_FALLBACK);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) { return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t); }
  // amt > 0 이면 흰색 쪽으로 밝게, amt < 0 이면 먹색 쪽으로 어둡게
  function shade(rgb, amt) {
    return amt >= 0 ? mix(rgb, [255, 255, 255], amt) : mix(rgb, [11, 13, 16], -amt);
  }
  function css(rgb) { return "rgb(" + rgb.map((v) => Math.round(v)).join(",") + ")"; }

  function readMaterials() {
    const style = getComputedStyle(document.documentElement);
    const cache = {};
    return function (name) {
      if (!cache[name]) {
        const v = style.getPropertyValue("--mat-" + name);
        cache[name] = hexToRgb(v || MAT_FALLBACK);
      }
      return cache[name];
    };
  }
  // 면 방향(법선)에 따라 밝기를 정한다: 윗면 약간 밝게, 왼쪽(앞) 면 그대로, 오른쪽 면 어둡게
  function faceTone(base, n) {
    const lit = Math.max(0, dot(n, LIGHT));
    return shade(base, -0.27 + 0.46 * lit);   // 대비: 어두운 면은 더 어둡게, 밝은 면은 더 밝게
  }

  // ---------- SVG 요소 만들기 ----------
  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function ptsAttr(pts) { return pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "); }
  // 선 굵기를 화면 픽셀 기준으로 고정 (그림을 키워도 외곽선은 얇게 유지)
  const THIN = { "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" };
  function poly(parent, pts, attrs) {
    return el("polygon", Object.assign({ points: ptsAttr(pts) }, attrs), parent);
  }
  function line(parent, a, b, color, width) {
    return el("line", Object.assign({
      x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1),
      stroke: color, "stroke-width": width, "stroke-linecap": "round"
    }, THIN), parent);
  }

  // 화면 점들을 감싸는 가장 작은 볼록 다각형 (= 물체의 바깥 윤곽)
  function hull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const crossZ = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const pt of p) {
      while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const pt = p[i];
      while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }

  // 밑면 꼭짓점을 가운데에서 바깥으로 grow(u)만큼 넓힌 다각형 — 받침 부품 범위 밖으로는 안 나가게 자름
  function aoRing(pts, sup, grow) {
    const c = mul(pts.reduce((a, b) => add(a, b), [0, 0, 0]), 1 / pts.length);
    return pts.map((p) => {
      const dir = normalize([p[0] - c[0], p[1] - c[1], 0]);
      const q = add(p, mul(dir, grow));
      return [Math.min(Math.max(q[0], sup.min[0]), sup.max[0]), Math.min(Math.max(q[1], sup.min[1]), sup.max[1]), p[2]];
    });
  }
  // 점이 다각형(화면 좌표) 안에 있나
  function inside(pt, poly) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }
  // 점과 선분 사이 거리 (배관이 점을 가리는지 볼 때)
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }

  // =============================================================
  // 1) 데이터 정리: 플랫폼 부품 + 장비 부품을 합치고, copyOf(복사)를 풀어 놓는다
  // =============================================================
  function resolveParts(equipment, platforms) {
    const list = [];
    const plat = equipment.platform && platforms && platforms[equipment.platform];
    if (plat) list.push(...plat.parts);
    list.push(...equipment.parts);

    const byId = new Map(list.map((p) => [p.id, p]));
    const out = [];
    // 원본(src)의 자식들을 새 이름(복사본id.자식id)으로 복사
    function copyChildren(srcId, newParentId, prefix) {
      list.filter((c) => c.parent === srcId && !c.copyOf).forEach((c) => {
        const id = prefix + "." + c.id;
        out.push(Object.assign({}, c, { id: id, parent: newParentId, copyOfId: c.id }));
        copyChildren(c.id, id, prefix);
      });
    }
    list.forEach((p) => {
      if (!p.copyOf) { out.push(p); return; }
      const src = byId.get(p.copyOf);
      if (!src) return;
      const copy = Object.assign({}, src, p, { copyOfId: src.id });
      delete copy.copyOf;
      if (!("parent" in p)) copy.parent = src.parent;
      out.push(copy);
      copyChildren(src.id, p.id, p.id);
    });
    return out;
  }

  // 2) 각 부품의 실제 위치(월드 좌표)와 회전 계산 — 부모 위치·회전을 따라간다
  //    offsets: { 부품id: [dx,dy,dz] } — 분해 상태를 계산할 때 render()가 넘겨 줌
  function computeWorld(parts, offsets) {
    const byId = new Map(parts.map((p) => [p.id, p]));
    const world = new Map();
    function get(id) {
      if (world.has(id)) return world.get(id);
      const p = byId.get(id);
      const parent = p.parent && byId.has(p.parent) ? get(p.parent) : { origin: [0, 0, 0], rot: 0, root: null };
      const pos = p.pos || [0, 0, 0];
      let origin = add(parent.origin, rotZ(pos, parent.rot));
      if (offsets && offsets[id]) origin = add(origin, offsets[id]);
      const w = {
        origin: origin,
        rot: parent.rot + ((p.rotZ || 0) * Math.PI) / 180,
        root: parent.root || p.id      // 맨 위 조상 (분해 때 한 덩어리로 움직이는 단위)
      };
      world.set(id, w);
      return w;
    }
    parts.forEach((p) => get(p.id));
    return world;
  }

  // =============================================================
  // 3) 도형 → 면 목록 (부품 자기 기준 좌표, 바닥 가운데가 원점)
  //    면마다 o(왼쪽 아래 모서리), U(가로 방향), V(세로 방향)를 둔다
  //    → 디테일은 면 안의 0~1 비율 좌표로 위치를 잡는다
  // =============================================================
  function face(name, o, U, V, pts, extra) {
    return Object.assign({
      name: name, o: o, U: U, V: V,
      pts: pts || [o, add(o, U), add(add(o, U), V), add(o, V)],
      n: normalize(cross(U, V))
    }, extra || {});
  }

  function boxFaces(size) {
    const w = size[0], d = size[1], h = size[2], hw = w / 2, hd = d / 2;
    const Z = [0, 0, h];
    return [
      face("front", [-hw, -hd, 0], [w, 0, 0], Z),
      face("right", [hw, -hd, 0], [0, d, 0], Z),
      face("back", [hw, hd, 0], [-w, 0, 0], Z),
      face("left", [-hw, hd, 0], [0, -d, 0], Z),
      face("top", [-hw, -hd, h], [w, 0, 0], [0, d, 0], null,
        { edgeFaces: ["front", "right", "back", "left"] }),
      face("bottom", [-hw, hd, 0], [w, 0, 0], [0, -d, 0])
    ];
  }

  // 각기둥(prism) / 원기둥(cylinder, disk = 면을 많이 나눈 각기둥)
  function prismFaces(size, sides, smooth) {
    const r = size[0] / 2, h = size[2];
    const v = [];
    for (let k = 0; k < sides; k++) {
      const a = (2 * Math.PI * k) / sides;
      v.push([r * Math.cos(a), r * Math.sin(a), 0]);
    }
    const faces = [];
    const names = [];
    for (let k = 0; k < sides; k++) {
      const a = v[k], b = v[(k + 1) % sides];
      names.push("side" + k);
      faces.push(face("side" + k, a, sub(b, a), [0, 0, h], null, { smooth: smooth }));
    }
    faces.push(face("top", [-r, -r, h], [2 * r, 0, 0], [0, 2 * r, 0],
      v.map((p) => [p[0], p[1], h]), { edgeFaces: names, round: true }));
    faces.push(face("bottom", [-r, r, 0], [2 * r, 0, 0], [0, -2 * r, 0], v.slice().reverse()));
    return faces;
  }

  function shapeFaces(part) {
    const size = part.size || [1, 1, 1];
    switch (part.shape) {
      case "box": return boxFaces(size);
      case "prism": return prismFaces(size, part.sides || 6, false);
      case "cylinder":
      case "disk": return prismFaces(size, 36, true);
      default: return null;  // 아직 그릴 줄 모르는 도형 → 건너뜀 (콘솔에 알림)
    }
  }

  // 부품 기준 좌표의 면 → 월드 좌표의 면
  function toWorld(f, w) {
    const P = (p) => add(w.origin, rotZ(p, w.rot));
    const D = (d) => rotZ(d, w.rot);
    return Object.assign({}, f, {
      o: P(f.o), U: D(f.U), V: D(f.V), n: D(f.n), pts: f.pts.map(P)
    });
  }

  // 그릴 것(부품)의 정보 목록: 면, 3D 범위(AABB), 화면 범위
  // 배관은 꺾이는 마디마다 따로 나눠야 다른 물체와 앞뒤 순서가 맞게 그려진다
  function buildDrawables(part, w) {
    if (part.shape === "pipe") {
      const pts = (part.path || []).map((p) => add(w.origin, rotZ(p, w.rot)));
      const segs = [];
      for (let i = 0; i + 1 < pts.length; i++) {
        segs.push(finish({ part: part, kind: "pipe", pts3: [pts[i], pts[i + 1]], root: w.root },
          [pts[i], pts[i + 1]]));
      }
      return segs;
    }
    const faces = shapeFaces(part);
    if (!faces) { console.warn("render-iso: 모르는 도형", part.shape, part.id); return []; }
    const wf = faces.map((f) => toWorld(f, w));
    const all = [];
    wf.forEach((f) => all.push(...f.pts));
    return [finish({ part: part, kind: "solid", faces: wf, root: w.root }, all)];
  }
  function finish(d, pts3) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    pts3.forEach((p) => { for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); } });
    d.min = min; d.max = max;
    d.center = mul(add(min, max), 0.5);
    const scr = pts3.map(project);
    d.sMin = [Math.min(...scr.map((p) => p[0])), Math.min(...scr.map((p) => p[1]))];
    d.sMax = [Math.max(...scr.map((p) => p[0])), Math.max(...scr.map((p) => p[1]))];
    return d;
  }

  // =============================================================
  // 4) 그리는 순서 정하기 (먼 것부터 그려야 가까운 것이 위에 덮임)
  //    두 물체가 화면에서 겹칠 때만 비교: x가 작을수록, y가 클수록, z가 낮을수록 멀다
  // =============================================================
  function behind(a, b) {
    const e = 1e-3;
    if (a.max[0] <= b.min[0] + e) return true;
    if (b.max[0] <= a.min[0] + e) return false;
    if (a.min[1] >= b.max[1] - e) return true;
    if (b.min[1] >= a.max[1] - e) return false;
    if (a.max[2] <= b.min[2] + e) return true;
    if (b.max[2] <= a.min[2] + e) return false;
    return depth(a.center) < depth(b.center); // 서로 파고든 경우: 가운데 깊이로 비교
  }
  function depth(p) { return p[0] - p[1] + p[2]; } // 클수록 보는 사람에게 가까움
  function screenOverlap(a, b) {
    return a.sMin[0] < b.sMax[0] && b.sMin[0] < a.sMax[0] && a.sMin[1] < b.sMax[1] && b.sMin[1] < a.sMax[1];
  }
  function sortDrawables(list) {
    const n = list.length;
    const after = list.map(() => []);   // after[i] = i보다 나중에 그릴 것들
    const inDeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (!screenOverlap(list[i], list[j])) continue;
        if (behind(list[i], list[j])) { after[i].push(j); inDeg[j]++; }
        else { after[j].push(i); inDeg[i]++; }
      }
    }
    const order = [];
    const done = new Array(n).fill(false);
    while (order.length < n) {
      // 앞에 그릴 것이 남지 않은 것 중 가장 먼 것부터
      let pick = -1;
      for (let i = 0; i < n; i++) {
        if (done[i] || inDeg[i] > 0) continue;
        if (pick < 0 || depth(list[i].center) < depth(list[pick].center)) pick = i;
      }
      if (pick < 0) { // 순환(서로 앞뒤가 꼬임): 남은 것 중 가장 먼 것을 그냥 고름
        for (let i = 0; i < n; i++) {
          if (!done[i] && (pick < 0 || depth(list[i].center) < depth(list[pick].center))) pick = i;
        }
      }
      done[pick] = true;
      order.push(list[pick]);
      after[pick].forEach((j) => inDeg[j]--);
    }
    return order;
  }

  // =============================================================
  // 5) 디테일 그리기 (면 안의 0~1 비율 좌표 → 3D → 화면)
  // =============================================================
  function mapper(f) {
    return (u, v) => project(add(f.o, add(mul(f.U, u), mul(f.V, v))));
  }
  // 면 위의 작은 원(볼트·구멍) — 면이 기울어진 만큼 타원으로 보인다
  function faceCircle(f, cu, cv, r) {
    const m = mapper(f), lu = len(f.U), lv = len(f.V), pts = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      pts.push(m(cu + (r / lu) * Math.cos(t), cv + (r / lv) * Math.sin(t)));
    }
    return pts;
  }
  function rectPts(m, a) {
    return [m(a[0], a[1]), m(a[2], a[1]), m(a[2], a[3]), m(a[0], a[3])];
  }
  // 이음선으로 나뉜 패널 칸 목록 (볼트 위치 계산용)
  function panels(seam) {
    const n = seam ? seam.count || 2 : 1, out = [];
    for (let i = 0; i < n; i++) {
      out.push(seam && seam.dir === "h" ? [0, i / n, 1, (i + 1) / n] : [i / n, 0, (i + 1) / n, 1]);
    }
    return out;
  }

  const DETAIL = {
    // 패널 이음선: 어두운 선 + 바로 옆 밝은 선 → 파인 홈처럼 보임
    seam(g, f, d, fill) {
      const m = mapper(f), n = d.count || 2, h = d.dir === "h";
      const gap = 0.05 / (h ? len(f.V) : len(f.U));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (h) {
          line(g, m(0.01, t), m(0.99, t), css(shade(fill, -0.3)), 0.8);
          line(g, m(0.01, t - gap), m(0.99, t - gap), css(shade(fill, 0.35)), 0.6);
        } else {
          line(g, m(t, 0.01), m(t, 0.99), css(shade(fill, -0.3)), 0.8);
          line(g, m(t + gap, 0.01), m(t + gap, 0.99), css(shade(fill, 0.35)), 0.6);
        }
      }
    },
    // 볼트: 패널 칸마다 네 모서리 (둥근 윗면이면 둘레에 원형으로)
    bolts(g, f, d, fill, faceDetails) {
      const r = 0.07, color = css(shade(fill, -0.38)), hi = css(shade(fill, 0.4));
      const spots = [];
      if (f.round) {
        const count = d.count || 12, ring = d.ring || 0.43;
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          spots.push([0.5 + ring * Math.cos(t), 0.5 + ring * Math.sin(t)]);
        }
      } else {
        const seam = faceDetails.find((x) => x.type === "seam");
        const iu = (d.inset || 0.22) / len(f.U), iv = (d.inset || 0.22) / len(f.V);
        panels(seam).forEach((a) => {
          spots.push([a[0] + iu, a[1] + iv], [a[2] - iu, a[1] + iv], [a[2] - iu, a[3] - iv], [a[0] + iu, a[3] - iv]);
        });
      }
      spots.forEach((s) => {
        poly(g, faceCircle(f, s[0], s[1], r), { fill: color });
        poly(g, faceCircle(f, s[0] - 0.012, s[1] + 0.012, r * 0.4), { fill: hi, opacity: 0.7 });
      });
    },
    // 통풍구: 얇은 평행 슬롯 여러 줄 + 아래 턱의 밝은 선
    vent(g, f, d, fill) {
      const m = mapper(f), a = d.area || [0.15, 0.12, 0.85, 0.4];
      const lv = len(f.V), slot = 0.08 / lv, pitch = 0.2 / lv;
      const dark = css(shade(fill, -0.42)), lip = css(shade(fill, 0.3));
      for (let v = a[1]; v + slot <= a[3] + 1e-6; v += pitch) {
        poly(g, rectPts(m, [a[0], v, a[2], v + slot]), { fill: dark });
        line(g, m(a[0], v - 0.012 / lv * 2), m(a[2], v - 0.012 / lv * 2), lip, 0.5);
      }
    },
    // 관찰창: 테두리 + 어두운 유리 + 비스듬한 반사광
    window(g, f, d, fill, faceDetails, mat) {
      const m = mapper(f), a = d.area || [0.3, 0.4, 0.7, 0.75];
      const pu = 0.08 / len(f.U), pv = 0.08 / len(f.V);
      poly(g, rectPts(m, [a[0] - pu, a[1] - pv, a[2] + pu, a[3] + pv]),
        Object.assign({ fill: css(shade(fill, -0.12)), stroke: css(shade(fill, -0.35)), "stroke-width": 0.6 }, THIN));
      poly(g, rectPts(m, a), { fill: css(faceTone(mat("glass"), f.n)) });
      glint(g, m, a);
    },
    // 표시판: 글자 없는 밝은 판 (로고·상표 없음)
    "label-plate"(g, f, d, fill) {
      const m = mapper(f), a = d.area || [0.07, 0.74, 0.32, 0.86];
      poly(g, rectPts(m, a),
        Object.assign({ fill: css(shade(fill, 0.4)), stroke: css(shade(fill, -0.25)), "stroke-width": 0.5 }, THIN));
    },
    // 손잡이: 세로 막대
    handle(g, f, d, fill) {
      const m = mapper(f), a = d.area || [0.9, 0.45, 0.93, 0.75];
      poly(g, rectPts(m, a), { fill: css(shade(fill, -0.45)) });
    },
    // 구멍(샤워헤드 등): 격자 모양 작은 점
    holes(g, f, d, fill) {
      const a = d.area || [0.1, 0.1, 0.9, 0.9], n = d.count || 8, color = css(shade(fill, -0.5));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const u = a[0] + ((i + 0.5) / n) * (a[2] - a[0]), v = a[1] + ((j + 0.5) / n) * (a[3] - a[1]);
        if (f.round && Math.hypot(u - 0.5, v - 0.5) > 0.45) continue;
        poly(g, faceCircle(f, u, v, 0.05), { fill: color });
      }
    },
    // 경고 라벨: 작은 노란 사각형 + 가는 삼각형 테두리 (글자·로고 없음)
    //   at = 라벨 가운데 위치 [가로, 세로] (0~1), 크기는 실제 길이 0.5u로 고정
    "warning-label"(g, f, d, fill, faceDetails, mat) {
      const m = mapper(f), at = d.at || [0.85, 0.8], s = (d.size || 0.5) / 2;
      const hu = s / len(f.U), hv = s / len(f.V);
      const a = d.area || [at[0] - hu, at[1] - hv, at[0] + hu, at[1] + hv];
      const yellow = faceTone(mat("warning"), f.n);
      poly(g, rectPts(m, a), Object.assign({ fill: css(yellow), stroke: css(shade(yellow, -0.4)), "stroke-width": 0.5 }, THIN));
      const cu = (a[0] + a[2]) / 2, w = (a[2] - a[0]) * 0.32, b = a[1] + (a[3] - a[1]) * 0.24, t = a[3] - (a[3] - a[1]) * 0.22;
      poly(g, [m(cu - w, b), m(cu + w, b), m(cu, t)],
        Object.assign({ fill: "none", stroke: css(shade(yellow, -0.75)), "stroke-width": 0.6 }, THIN));
    },
    // 둥근 버튼(EMO 등): 어두운 테두리 → 빨간 버튼 → 작은 반사점
    button(g, f, d, fill, faceDetails, mat) {
      const at = d.at || [0.5, 0.5], r = d.r || 0.3, red = faceTone(mat("emo"), f.n);
      poly(g, faceCircle(f, at[0], at[1], r * 1.18), { fill: css(shade(fill, -0.5)) });
      poly(g, faceCircle(f, at[0], at[1], r), { fill: css(red) });
      poly(g, faceCircle(f, at[0] - 0.08, at[1] + 0.1, r * 0.3), { fill: "#ffffff", opacity: 0.35 });
    },
    // 조작 화면: 어두운 유리 화면 + 흐린 화면 구성 선 + 얇은 반사선
    screen(g, f, d, fill, faceDetails, mat) {
      const m = mapper(f), a = d.area || [0.08, 0.12, 0.92, 0.88];
      const glass = faceTone(mat("screen"), f.n);
      poly(g, rectPts(m, a), { fill: css(glass) });
      const lu = a[2] - a[0], lv = a[3] - a[1], ui = css(shade(glass, 0.35));
      // 화면 안 구성(위쪽 바 1줄 + 목록 3줄) — 특정 회사 화면이 아닌 일반적인 모양
      line(g, m(a[0] + 0.08 * lu, a[3] - 0.16 * lv), m(a[2] - 0.08 * lu, a[3] - 0.16 * lv), ui, 0.7);
      [0.36, 0.52, 0.68].forEach((t) => line(g, m(a[0] + 0.08 * lu, a[3] - t * lv), m(a[0] + 0.55 * lu, a[3] - t * lv), ui, 0.5));
      glint(g, m, a);
    }
  };

  // 유리 반사선: 비스듬한 가는 선 2줄 (넓은 반투명 면 대신 → 깔끔한 유리 느낌)
  function glint(g, m, a) {
    const w = a[2] - a[0], h = a[3] - a[1];
    line(g, m(a[0] + 0.18 * w, a[3] - 0.04 * h), m(a[0] + 0.04 * w, a[1] + 0.3 * h), "rgba(255,255,255,0.38)", 0.7);
    line(g, m(a[0] + 0.32 * w, a[3] - 0.04 * h), m(a[0] + 0.14 * w, a[1] + 0.12 * h), "rgba(255,255,255,0.2)", 0.5);
  }
  // 금속 면 반사선: 면 왼쪽 위에서 비스듬히 내려오는 가는 선 2줄
  function sheen(g, f) {
    const m = mapper(f);
    line(g, m(0.16, 0.96), m(0.3, 0.04), "rgba(255,255,255,0.32)", 0.8);
    line(g, m(0.23, 0.96), m(0.34, 0.25), "rgba(255,255,255,0.16)", 0.6);
  }

  // =============================================================
  // 6) 물체 하나 그리기
  // =============================================================
  function drawSolid(g, d, mat) {
    const base = mat(d.part.material || "panel");
    // 접촉 음영 1: 받침 부품 윗면에, 이 부품 밑면보다 조금 넓은 어두운 자국 (2단, 블러 없음)
    if (d.support) {
      const bottom = d.faces.find((f) => f.name === "bottom");
      if (bottom) [[0.34, "iso-ao iso-ao-wide"], [0.12, "iso-ao"]].forEach((o) => {
        poly(g, aoRing(bottom.pts, d.support, o[0]).map(project), { class: o[1] });
      });
    }
    const edge = css(shade(base, -0.32));
    const visible = d.faces.filter((f) => dot(f.n, VIEW) > 1e-6);
    const visibleNames = new Set(visible.map((f) => f.name));
    const details = d.part.details || [];
    const screenPts = [];

    const metal = finishOf(d.part.material) === "metal";
    visible.forEach((f) => {
      const pts = f.pts.map(project);
      screenPts.push(...pts);
      let fill = faceTone(base, f.n);
      // 금속 원기둥 옆면: 반사 방향을 향한 조각만 밝게 → 세로로 가는 반사띠가 생김
      if (metal && f.smooth) fill = shade(fill, 0.55 * Math.pow(Math.max(0, dot(f.n, HALF)), 24));
      // 원기둥 옆면은 잘게 나눈 조각이라 테두리를 면 색과 같게 해서 이음 자국을 숨김
      poly(g, pts, Object.assign({
        fill: css(fill), stroke: f.smooth ? css(fill) : edge, "stroke-width": f.smooth ? 0.8 : 0.6
      }, THIN));
      // 평평한 금속 옆면: 얇은 사선 반사선 2줄 (그라디언트 대신 선으로)
      if (metal && !f.smooth && f.name !== "top" && Math.abs(f.n[2]) < 0.5) sheen(g, f);
      // 접촉 음영 2: 바닥이나 다른 부품에 닿은 옆면의 아랫단에 얇은 어두운 띠
      if (d.grounded && Math.abs(f.n[2]) < 0.5) {
        const lv = len(f.V), m = mapper(f), h = Math.min(0.24 / lv, 0.3);
        poly(g, [m(0, 0), m(1, 0), m(1, h), m(0, h)], { class: "iso-ao-base" });
      }
      // 이 면에 붙은 디테일 (이음선을 먼저 그리고 그 위에 나머지)
      const own = details.filter((x) => x.face === f.name);
      own.slice().sort((x, y) => (x.type === "seam" ? -1 : 0) - (y.type === "seam" ? -1 : 0))
        .forEach((x) => { if (DETAIL[x.type]) DETAIL[x.type](g, f, x, fill, own, mat); });
    });

    // 윗면 모서리 하이라이트: 보이는 옆면과 만나는 윗면 테두리만 밝게
    const top = visible.find((f) => f.name === "top");
    if (top && top.edgeFaces) {
      const pts = top.pts.map(project), hi = css(shade(base, 0.55));
      top.edgeFaces.forEach((name, k) => {
        if (visibleNames.has(name)) line(g, pts[k], pts[(k + 1) % pts.length], hi, 0.9);
      });
    }
    // 바깥 윤곽선: 면 테두리보다 조금 진하게
    poly(g, hull(screenPts), Object.assign({
      class: "iso-outline", fill: "none", stroke: css(shade(base, -0.5)), "stroke-width": 0.9
    }, THIN));
  }

  // 배관 한 마디: 테두리 → 몸통 → 위쪽 반사광 순서로 겹쳐 그림 (굵기는 그림 크기에 맞춰 커짐)
  function drawPipe(g, d, mat) {
    const base = mat(d.part.material || "pipe");
    const finish = finishOf(d.part.material || "pipe");
    const w = ((d.part.size && d.part.size[0]) || 0.3) * K;
    const pts = d.pts3.map(project);
    const path = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
    // 끝을 둥글게 해서 마디끼리 이어 붙인 자리가 자연스럽게 보이게
    const common = { d: path, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" };
    el("path", Object.assign({ stroke: css(shade(base, -0.5)), "stroke-width": w + 2 }, common), g);
    el("path", Object.assign({ stroke: css(shade(base, -0.06)), "stroke-width": w }, common), g);
    // 위쪽 광택선: 금속은 밝게, 고무 케이블은 아주 약하게
    el("path", Object.assign({
      stroke: css(shade(base, finish === "rubber" ? 0.22 : 0.5)), "stroke-width": Math.max(1, w * 0.24),
      transform: "translate(0," + (-w * 0.2).toFixed(1) + ")"
    }, common), g);
    // 스테인리스 배관 이음부(피팅): 마디 양 끝에 조금 더 굵고 밝은 짧은 고리
    //   → 꺾이는 곳에서는 두 마디의 고리가 만나 엘보 피팅처럼 보임
    if (finish === "metal") {
      const a = d.pts3[0], b = d.pts3[1], L = len(sub(b, a));
      const t = Math.min(0.5, 0.42 / (L || 1));   // 고리 길이 0.42u (마디가 짧으면 절반까지만)
      [[a, add(a, mul(sub(b, a), t))], [add(b, mul(sub(a, b), t)), b]].forEach((seg) => {
        const p = seg.map(project);
        const dd = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1) + " L" + p[1][0].toFixed(1) + " " + p[1][1].toFixed(1);
        const c = { d: dd, fill: "none", "stroke-linecap": "butt" };
        el("path", Object.assign({ stroke: css(shade(base, -0.45)), "stroke-width": w * 1.38 + 2 }, c), g);
        el("path", Object.assign({ stroke: css(shade(base, 0.32)), "stroke-width": w * 1.38 }, c), g);
        el("path", Object.assign({
          stroke: css(shade(base, 0.7)), "stroke-width": Math.max(1, w * 0.28),
          transform: "translate(0," + (-w * 0.3).toFixed(1) + ")"
        }, c), g);
      });
    }
  }

  // 바닥 그림자: 바닥에 닿은 물체의 밑면을 빛 반대쪽(오른쪽 뒤)으로 살짝 늘린 모양
  function drawShadow(g, d, floorZ) {
    if (d.kind !== "solid" || Math.abs(d.min[2] - floorZ) > 0.01) return;
    const bottom = d.faces.find((f) => f.name === "bottom");
    if (!bottom) return;
    const shift = [0.6, 0.7, 0];
    const pts = bottom.pts.map(project).concat(bottom.pts.map((p) => project(add(p, shift))));
    poly(g, hull(pts), { class: "iso-shadow" });
  }

  // =============================================================
  // 7) 전체 그리기 (외부에서 부르는 함수)
  //
  //   분해 연출을 휴대폰에서도 부드럽게 하려고, 모듈(explodeOrder가 있는 부품 덩어리)마다
  //   "따로 된 작은 SVG 층"에 그린다. stage.js는 층을 CSS transform으로 옮기기만 한다
  //   → 브라우저가 그림을 다시 그리지 않고 이미 그린 층을 밀어 옮김 (gsap-performance 지침)
  //
  //   층 종류: 바닥 층(점선 바닥면 + 그림자) · 모듈 층 · 배관 층(움직이지 않고 희미해짐)
  //   options.level: 이 단계 이하의 부품만 그림 (기본 1 = 모듈 외관)
  // =============================================================
  // 부품마다 조상 id 목록 (자기 자신 포함)
  function ancestry(parts, useSource) {
    const byId = new Map(parts.map((p) => [p.id, p]));
    const out = new Map();
    parts.forEach((p) => {
      const chain = [];
      for (let q = p; q; q = q.parent ? byId.get(q.parent) : null) chain.push(useSource ? q.copyOfId || q.id : q.id);
      out.set(p.id, chain);
    });
    return out;
  }

  // 층 바닥면: 장비가 차지하는 바닥 범위를 둘러싼 사각형 (점선)
  function floorRect(z, ext) {
    return [[ext[0], ext[1], z], [ext[2], ext[1], z], [ext[2], ext[3], z], [ext[0], ext[3], z]];
  }
  const FLOOR_MARGIN = 1.6;   // 바닥면을 장비보다 이만큼(u) 넓게
  function extOf(boxes) {
    const e = [Infinity, Infinity, -Infinity, -Infinity];
    boxes.forEach((b) => {
      e[0] = Math.min(e[0], b.min[0]); e[1] = Math.min(e[1], b.min[1]);
      e[2] = Math.max(e[2], b.max[0]); e[3] = Math.max(e[3], b.max[1]);
    });
    return [e[0] - FLOOR_MARGIN, e[1] - FLOOR_MARGIN, e[2] + FLOOR_MARGIN, e[3] + FLOOR_MARGIN];
  }

  // 접촉 음영 준비: 각 물체가 바닥에 닿았나(grounded), 어떤 물체 위에 얹혔나(support)
  function contact(drawables, floors) {
    const solids = drawables.filter((d) => d.kind === "solid");
    solids.forEach((d) => {
      d.grounded = floors.some((f) => Math.abs(d.min[2] - f.z) < 0.02);
      if (d.grounded) return;
      d.support = solids.find((s) => s !== d && Math.abs(s.max[2] - d.min[2]) < 0.02 &&
        s.min[0] < d.max[0] && d.min[0] < s.max[0] && s.min[1] < d.max[1] && d.min[1] < s.max[1]) || null;
      if (d.support) d.grounded = true;
    });
  }

  // 화면 윤곽(가림 판정용)
  function addHulls(A) {
    A.orderIdx = new Map(A.ordered.map((d, i) => [d, i]));
    A.drawables.forEach((d) => {
      if (d.kind === "solid") {
        const all = [];
        d.faces.forEach((f) => all.push(...f.pts.map(project)));
        d.hull = hull(all);
      } else {
        d.seg = d.pts3.map(project);
        d.halfW = (((d.part.size && d.part.size[0]) || 0.3) * K) / 2 + 1;
      }
    });
  }
  // 화면 점 pt가 물체 d보다 나중에(=앞에) 그려지는 다른 물체에 가려지나
  function hidden(A, pt, d, skip) {
    const k = A.orderIdx.get(d);
    return A.ordered.some((e, i) => i > k && e !== d && !(skip && skip(e)) &&
      (e.kind === "solid" ? inside(pt, e.hull) : segDist(pt, e.seg[0], e.seg[1]) < e.halfW));
  }
  // 부품의 보이는 면 위에 고르게 점을 찍고, 가려지지 않은 점만 이름표 끝점 후보로
  //   faceName이 있으면 그 면 위의 점만 (front·right는 회전한 부품도 맞도록 면 방향으로 판단)
  const FACE_DIR = { top: [0, 0, 1], front: [0, -1, 0], right: [1, 0, 0] };
  function visiblePoints(A, list, skip, faceName) {
    const out = [];
    list.forEach((d) => {
      if (d.kind !== "solid") return;
      d.faces.forEach((f) => {
        if (dot(f.n, VIEW) <= 1e-6) return;
        if (faceName && FACE_DIR[faceName] && dot(f.n, FACE_DIR[faceName]) < 0.7) return;
        const m = mapper(f), fp = f.pts.map(project);
        for (let i = 1; i <= 4; i++) for (let j = 1; j <= 4; j++) {
          const pt = m(i / 5, j / 5);
          if (inside(pt, fp) && !hidden(A, pt, d, skip)) out.push(pt);
        }
      });
    });
    return out;
  }

  function render(container, equipment, platforms, options) {
    const opt = Object.assign({ level: 1 }, options || {});
    const mat = readMaterials();
    const parts = resolveParts(equipment, platforms).filter((p) => (p.level || 1) <= opt.level);
    const byId = new Map(parts.map((p) => [p.id, p]));
    const tree = ancestry(parts, false);
    const srcTree = ancestry(parts, true);   // 복사본 id → 원본 id (이름표 강조 때 PM2~4도 함께)
    const world0 = computeWorld(parts, null);

    // ---------- 모듈: explodeOrder가 있는 부품. 부품은 가장 가까운 "모듈 조상(자기 포함)"에 속함 ----------
    const moduleOf = new Map();
    parts.forEach((p) => {
      let q = p;
      while (q && q.explodeOrder == null) q = q.parent ? byId.get(q.parent) : null;
      moduleOf.set(p.id, q ? q.id : null);
    });
    const modules = parts.filter((p) => p.explodeOrder != null).map((p, i) => ({
      id: p.id, idx: i, order: p.explodeOrder,
      key: p.copyOfId || p.id,                                   // 복사본끼리 같은 key (예: pm, pm-2 → pm)
      disp3: rotZ(p.explode || [0, 0, 0], world0.get(p.id).rot), // 자기 좌표 → 장비 좌표
      parent: p.parent ? moduleOf.get(p.parent) : null
    }));
    const modById = new Map(modules.map((m) => [m.id, m]));
    modules.forEach((m) => { m.disp = project(m.disp3); });     // 화면에서 옮겨 갈 거리 (viewBox 단위)
    // 분해 순서: 차례 → 데이터 목록 순서
    const sequence = modules.slice().sort((a, b) => a.order - b.order || a.idx - b.idx);

    // prog = { 모듈id: 0~1 } → computeWorld에 넘길 이동량
    //   부모 모듈의 이동분을 빼 준다 → explode는 "장비 기준 최종 이동량"이 됨 (FOUP는 EFEM이 나중에 움직여도 제자리)
    function offsetsFor(prog) {
      const off = {};
      modules.forEach((m) => {
        let v = mul(m.disp3, prog[m.id] || 0);
        if (m.parent) v = sub(v, mul(modById.get(m.parent).disp3, prog[m.parent] || 0));
        off[m.id] = v;
      });
      return off;
    }
    const ALL = {};
    modules.forEach((m) => { ALL[m.id] = 1; });

    // 층 정보 (없으면 바닥 하나, z = 0) — 아래층부터
    const floors = ((equipment.site && equipment.site.floors) || [{ id: "floor", z: 0 }]).slice().sort((a, b) => a.z - b.z);
    const floorIdxOfZ = (z) => { let k = 0; floors.forEach((f, i) => { if (z >= f.z - 0.01) k = i; }); return k; };

    // 한 상태(이동량)에서 그릴 것 목록 + 그리는 순서
    function analyze(offsets) {
      const world = computeWorld(parts, offsets);
      const list = [];
      parts.forEach((p) => list.push(...buildDrawables(p, world.get(p.id))));
      return { drawables: list, ordered: sortDrawables(list) };
    }
    const A0 = analyze(null);               // 조립 상태 → 그리기 기준
    const A1 = analyze(offsetsFor(ALL));    // 분해 완료 상태 → 이름표·화면 범위 기준
    contact(A0.drawables, floors);
    addHulls(A0);
    addHulls(A1);

    // ---------- 층(SVG) 나누기 ----------
    //   모듈 부품 → 그 모듈 층 / 모듈 밖 배관 → "pipes@층" / 그 밖 → "static@층"
    const layerOfPart = new Map();
    parts.forEach((p) => {
      const mid = moduleOf.get(p.id);
      if (mid) { layerOfPart.set(p.id, mid); return; }
      const d = A0.drawables.find((x) => x.part === p);
      const fl = floors[d ? floorIdxOfZ(d.center[2]) : 0].id;
      layerOfPart.set(p.id, (p.shape === "pipe" ? "pipes" : "static") + "@" + fl);
    });
    const layerKey = (d) => layerOfPart.get(d.part.id);
    const layers = new Map();
    A0.drawables.forEach((d) => {
      const key = layerKey(d);
      if (!layers.has(key)) {
        const m = modById.get(key) || null;
        const fIdx = m ? floorIdxOfZ(A0.drawables.find((x) => x.part.id === key).center[2])
          : floors.findIndex((f) => key.endsWith("@" + f.id));
        layers.set(key, {
          id: key, floor: fIdx, module: m, connects: [],
          kind: m ? "module" : key.startsWith("pipes") ? "pipes" : "static", list: []
        });
      }
      const L = layers.get(key);
      L.list.push(d);
      if (d.part.connects) d.part.connects.forEach((c) => { if (!L.connects.includes(c)) L.connects.push(c); });
    });
    layers.forEach((L) => {   // 층의 3D 범위 (조립 상태) → 분해 중 바닥면 크기 계산용
      L.min = [0, 1, 2].map((i) => Math.min(...L.list.map((d) => d.min[i])));
      L.max = [0, 1, 2].map((i) => Math.max(...L.list.map((d) => d.max[i])));
    });

    // 분해 정도(prog)에 맞는 바닥면 범위: 모든 층의 범위를 그만큼 옮겨서 합침
    function extAt(prog) {
      const boxes = [];
      layers.forEach((L) => {
        const v = L.module ? mul(L.module.disp3, prog[L.module.id] || 0) : [0, 0, 0];
        boxes.push({ min: add(L.min, v), max: add(L.max, v) });
      });
      return extOf(boxes);
    }
    const ext0 = extAt({}), ext1 = extAt(ALL);

    // ---------- 층끼리 앞뒤 순서: 물체 단위 그리는 순서에서 "층 대 층" 다수결 ----------
    function layerRanks(A) {
      const ord = A.ordered, votes = new Map(), mean = new Map(), cnt = new Map();
      ord.forEach((d, i) => {
        const k = layerKey(d);
        mean.set(k, (mean.get(k) || 0) + i); cnt.set(k, (cnt.get(k) || 0) + 1);
      });
      mean.forEach((v, k) => mean.set(k, v / cnt.get(k)));
      // 화면에서 겹치는 두 물체마다 실제 앞뒤(behind)로 투표 — 정렬 결과가 아니라 관계 자체로 세야
      //   물체 단위 순서에 순환이 있어도 층 순서가 뒤집히지 않음
      for (let i = 0; i < ord.length; i++) {
        for (let j = i + 1; j < ord.length; j++) {
          const ka = layerKey(ord[i]), kb = layerKey(ord[j]);
          if (ka === kb || !screenOverlap(ord[i], ord[j])) continue;
          const key = behind(ord[i], ord[j]) ? ka + "|" + kb : kb + "|" + ka;   // 앞쪽 층이 먼저(뒤에) 그려짐
          votes.set(key, (votes.get(key) || 0) + 1);
        }
      }
      const rank = {};
      floors.forEach((f, fi) => {
        const ks = [...layers.keys()].filter((k) => layers.get(k).floor === fi);
        const before = new Map(ks.map((k) => [k, []]));
        ks.forEach((a) => ks.forEach((b) => {
          if (a >= b) return;
          const ab = votes.get(a + "|" + b) || 0, ba = votes.get(b + "|" + a) || 0;
          if (ab > ba) before.get(b).push(a); else if (ba > ab) before.get(a).push(b);
        }));
        const done = new Set();
        let r = 1;
        while (done.size < ks.length) {
          let cand = ks.filter((k) => !done.has(k) && before.get(k).every((x) => done.has(x)));
          if (!cand.length) cand = ks.filter((k) => !done.has(k));  // 순환: 평균 순서가 가장 앞선 것부터
          cand.sort((a, b) => mean.get(a) - mean.get(b));
          done.add(cand[0]);
          rank[cand[0]] = fi * 100 + r++;          // z-index: 층마다 100씩 (바닥 층 svg = fi*100)
        }
      });
      return rank;
    }
    function ranksFor(prog) { return layerRanks(analyze(offsetsFor(prog))); }

    // ---------- 보이는 범위(viewBox): 조립 + 분해 상태가 모두 들어가게 ----------
    const pad = 24;
    const rangeOf = (pts) => [
      Math.min(...pts.map((p) => p[0])) - pad, Math.min(...pts.map((p) => p[1])) - pad,
      Math.max(...pts.map((p) => p[0])) + pad, Math.max(...pts.map((p) => p[1])) + pad
    ];
    const floorPts = (ext) => floors.length > 1 ? floors.flatMap((f) => floorRect(f.z, ext).map(project)) : [];
    const allPts = [];
    A0.drawables.concat(A1.drawables).forEach((d) => allPts.push(d.sMin, d.sMax));
    const R = rangeOf(allPts.concat(floorPts(ext1)));
    const viewBox = [R[0], R[1], R[2] - R[0], R[3] - R[1]];
    // 조립 상태만의 범위 → stage.js가 처음에 이만큼 확대해서 보여 줌 (외관을 크게)
    const asmPts = [];
    A0.drawables.forEach((d) => asmPts.push(d.sMin, d.sMax));
    const assembledBounds = rangeOf(asmPts.concat(floorPts(ext0)));
    // 조립 상태 장비 몸체만의 범위 (바닥판·여백 제외) → stage.js가 "장비가 화면 폭의 몇 %"를 맞출 때 씀
    const assembledBody = [
      Math.min(...asmPts.map((p) => p[0])), Math.min(...asmPts.map((p) => p[1])),
      Math.max(...asmPts.map((p) => p[0])), Math.max(...asmPts.map((p) => p[1]))
    ];

    // ---------- DOM 만들기 ----------
    while (container.firstChild) container.removeChild(container.firstChild);
    const vbAttr = viewBox.map((v) => v.toFixed(1)).join(" ");
    const pct = (v, total) => ((v / total) * 100).toFixed(4) + "%";
    const floorPolys = [];
    const shadowOf = new Map();
    // 바닥 층: 점선 바닥면 + 그 층 모듈들의 바닥 그림자 (모듈마다 g 하나 → 함께 움직임)
    floors.forEach((fl, k) => {
      const div = document.createElement("div");
      div.className = "iso-layer iso-layer-floor";
      div.style.zIndex = String(k * 100);
      const svg = el("svg", { viewBox: vbAttr, "aria-hidden": "true", focusable: "false" });
      div.appendChild(svg);
      container.appendChild(div);
      if (floors.length > 1) {
        const poly0 = poly(svg, floorRect(fl.z, ext0).map(project),
          Object.assign({ class: k === 0 ? "iso-floor iso-floor-low" : "iso-floor" }, THIN));
        floorPolys.push({ el: poly0, z: fl.z });
      }
      const shadows = el("g", { class: "iso-shadows" }, svg);
      layers.forEach((L) => {
        if (L.floor !== k) return;
        const g = el("g", { "data-layer": L.id }, shadows);
        L.list.forEach((d) => drawShadow(g, d, fl.z));
        if (g.childNodes.length) shadowOf.set(L.id, g); else shadows.removeChild(g);
      });
    });
    // 모듈 층·배관 층: 자기 화면 범위만 한 작은 svg (휴대폰 메모리 절약)
    const ranks0 = layerRanks(A0);
    const layerOut = [];
    layers.forEach((L) => {
      const sMin = [Math.min(...L.list.map((d) => d.sMin[0])), Math.min(...L.list.map((d) => d.sMin[1]))];
      const sMax = [Math.max(...L.list.map((d) => d.sMax[0])), Math.max(...L.list.map((d) => d.sMax[1]))];
      const P = 16;   // 외곽선·배관 굵기·접촉 음영이 잘리지 않을 여유
      const box = [sMin[0] - P, sMin[1] - P, sMax[0] - sMin[0] + 2 * P, sMax[1] - sMin[1] + 2 * P];
      const div = document.createElement("div");
      div.className = "iso-layer iso-layer-" + L.kind;
      div.dataset.layer = L.id;
      div.style.left = pct(box[0] - viewBox[0], viewBox[2]);
      div.style.top = pct(box[1] - viewBox[1], viewBox[3]);
      div.style.width = pct(box[2], viewBox[2]);
      div.style.height = pct(box[3], viewBox[3]);
      div.style.zIndex = String(ranks0[L.id]);
      const svg = el("svg", { viewBox: box.map((v) => v.toFixed(1)).join(" "), "aria-hidden": "true", focusable: "false" });
      div.appendChild(svg);
      container.appendChild(div);
      const partsG = el("g", { class: "iso-parts" }, svg);
      A0.ordered.forEach((d) => {
        if (layerKey(d) !== L.id) return;
        const g = el("g", {
          "data-part": d.part.id, "data-tree": tree.get(d.part.id).join(" "),
          "data-src-tree": srcTree.get(d.part.id).join(" ")
        }, partsG);
        if (d.kind === "pipe") drawPipe(g, d, mat); else drawSolid(g, d, mat);
      });
      layerOut.push({
        id: L.id, kind: L.kind, floor: L.floor, el: div, svg: svg, box: box,
        module: L.module ? { id: L.module.id, key: L.module.key, order: L.module.order, disp: L.module.disp } : null,
        shadow: shadowOf.get(L.id) || null, connects: L.connects
      });
    });

    // ---------- 이름표 자리: 분해 완료 상태(A1) 기준 ----------
    const labels = [];
    parts.forEach((p) => {
      if (!p.label || p.label.no == null || p.copyOfId) return;
      const mine = A1.drawables.filter((d) => tree.get(d.part.id).includes(p.id));
      if (!mine.length) return;
      const lo = [0, 1, 2].map((i) => Math.min(...mine.map((d) => d.min[i])));
      const hi = [0, 1, 2].map((i) => Math.max(...mine.map((d) => d.max[i])));
      const c = mul(add(lo, hi), 0.5);
      const anchor = p.label.anchor || "top";
      const pt3 = anchor === "front" ? [c[0], lo[1], c[2]] : anchor === "right" ? [hi[0], c[1], c[2]] : [c[0], c[1], hi[2]];
      // 끝점 후보: 부품 자기 몸체를 먼저. 배관은 분해 때 사라지므로 가림 판정에서 뺌
      const skipPipe = (e) => e.kind === "pipe";
      const body = mine.filter((d) => d.part.id === p.id);
      const onFace = p.label.anchor ? visiblePoints(A1, body, skipPipe, p.label.anchor) : [];
      const own = onFace.length >= 3 ? onFace : visiblePoints(A1, body, skipPipe);
      const mid = moduleOf.get(p.id);
      labels.push({
        id: p.id, no: p.label.no, abbr: p.label.abbr || "", name: p.name || p.id,
        layer: mid, key: mid ? modById.get(mid).key : null,
        point: project(pt3), candidates: own.length >= 3 ? own : visiblePoints(A1, mine, skipPipe),
        centered: onFace.length >= 3      // anchor 면을 썼으면 그 면의 보이는 부분 한가운데에 끝점
      });
    });
    labels.sort((a, b) => a.no - b.no);

    // ---------- 작은 표시(tag, 예: PM1): 조립 상태 기준 위치 + 어느 층에 붙어 움직이나 ----------
    const tags = [];
    parts.forEach((p) => {
      if (!p.tag) return;
      const d = A0.drawables.find((x) => x.part.id === p.id && x.kind === "solid");
      if (!d) return;
      const layer = layerOfPart.get(p.id);
      if (d.grounded && !d.support) {
        const low = d.hull.reduce((a, b) => (b[1] > a[1] ? b : a));
        tags.push({ id: p.id, text: p.tag, point: low, place: "below", layer: layer });
      } else {
        const top = d.faces.find((f) => f.name === "top");
        const c = mul(top.pts.reduce((a, b) => add(a, b), [0, 0, 0]), 1 / top.pts.length);
        tags.push({ id: p.id, text: p.tag, point: project(c), place: "center", layer: layer });
      }
    });

    // 층 이름 자리: 분해 완료 상태의 바닥면 네 꼭짓점
    const floorInfo = floors.length > 1 ? floors.map((fl) => {
      const rect = floorRect(fl.z, ext1).map(project);
      return { id: fl.id, name: fl.name || fl.id, ko: fl.ko || "", z: fl.z, point: rect.reduce((a, b) => (b[1] > a[1] ? b : a)), corners: rect };
    }) : [];

    // 분해 완료 상태: 장비 화면 범위(이름표 기둥 위치) + 물체가 차지한 영역(글자 빈 자리 찾기)
    const equipBounds = [
      Math.min(...A1.drawables.map((d) => d.sMin[0])), Math.min(...A1.drawables.map((d) => d.sMin[1])),
      Math.max(...A1.drawables.map((d) => d.sMax[0])), Math.max(...A1.drawables.map((d) => d.sMax[1]))
    ];
    const occupied = A1.drawables.filter((d) => d.kind === "solid").map((d) => d.hull);
    // 점검용: 분해 완료 상태의 부품 윤곽 + 그 부품이 속한 모듈 (모듈끼리 화면에서 겹치는지 검사)
    const occupiedBy = A1.drawables.filter((d) => d.kind === "solid").map((d) => ({ module: moduleOf.get(d.part.id), hull: d.hull }));
    // 분해 완료 상태에서 부품 하나의 3D 범위 (웨이퍼 경로 점 계산용)
    function partBox(id) {
      const mine = A1.drawables.filter((d) => d.part.id === id);
      if (!mine.length) return null;
      return {
        min: [0, 1, 2].map((i) => Math.min(...mine.map((d) => d.min[i]))),
        max: [0, 1, 2].map((i) => Math.max(...mine.map((d) => d.max[i])))
      };
    }
    // 분해 정도에 맞춘 바닥면 꼭짓점 (stage.js가 매 프레임 바닥면을 넓힘)
    function floorPointsAt(prog) {
      const e = extAt(prog);
      return floorPolys.map((f) => ptsAttr(floorRect(f.z, e).map(project)));
    }

    return {
      viewBox: viewBox, assembledBounds: assembledBounds, assembledBody: assembledBody,
      layers: layerOut, floorPolys: floorPolys, floorPointsAt: floorPointsAt,
      sequence: sequence.map((m) => ({ id: m.id, key: m.key, order: m.order })),
      ranksFor: ranksFor, partBox: partBox,
      labels: labels, tags: tags, occupied: occupied, occupiedBy: occupiedBy, floors: floorInfo, equipBounds: equipBounds
    };
  }

  window.IsoRender = { render: render, project: project, resolveParts: resolveParts };
})();
