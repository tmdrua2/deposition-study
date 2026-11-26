// =============================================================
// ALD 원리 시뮬레이션 — 웨이퍼 표면 확대 단면 (equipment/ald/principle.html 맨 앞)
//
//  ① 전구체 주입: 전구체가 빈자리에만 하나씩 붙음 → 12자리가 다 차면 더 안 붙음(자기 제한)
//  ② 퍼지: 퍼지 가스가 떠 있던 전구체를 배기 쪽으로 몰아냄
//  ③ 반응 기체 주입: 붙은 전구체와 반응해 막 한 줄 완성, 부산물이 떨어져 나옴
//  ④ 퍼지: 부산물을 몰아내고 새 표면에 빈자리가 다시 생김 → 사이클 +1, 층이 한 줄씩 쌓임
//  "퍼지가 부족하면" 버튼: ②가 짧아 전구체가 남음 → ③에서 공중에서 만나 알갱이 → 아무 데나 떨어져 울퉁불퉁
//  온도 창 패널([data-ald-temp]): 막대 위치(낮음 / 창 / 높음)에 따라 단면 개념도가 바뀜 (숫자 없음)
//
// 구조: pose(단계, 진행 0~1, 사이클, 퍼지 부족?) → 모든 분자 위치를 계산하는 함수 하나.
//   GSAP 타임라인은 "시계"만 돌리고(단계마다 라벨), 매 프레임 이 함수로 그림 → 아무 단계로나 바로 건너뛸 수 있고
//   정지 화면도 같은 함수로 그 단계 끝 모습을 한 번 그림. 난수는 사이클 번호로 정해져 항상 같은 그림.
// 정지 화면(움직임 줄이기·?still=1·데이터 절약·저사양): 자동 재생 없이 단계 버튼으로 단계별 정지 그림, 재생 버튼으로 직접 재생 가능
// 화면 밖이거나 탭이 숨으면 멈춤. 색은 css/style.css의 :root 변수(--ald-*)를 클래스로만 씀 (JS에 색 없음)
// 의존: vendor/gsap/gsap.min.js, js/motion-pref.js
// =============================================================
(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const W = 720, H = 336;          // 그림 비율용 좌표 (실제 크기 아님)
  const BASE = 300;                // 기판 윗면
  const N = 12;                    // 표면 자리 수
  const X0 = 96, DX = 48;          // 자리 가로 위치
  const T = 16;                    // 막 한 줄 두께(그림용)
  const MAXC = 6;                  // 6층까지 쌓고 처음부터
  const EX_Y = 130;                // 배기구 높이
  const xs = (j) => X0 + j * DX;

  const STEPS = [
    { id: "prec",   name: "전구체 주입",
      desc: "전구체 분자가 표면의 빈자리에만 하나씩 붙습니다.",
      full: "자리가 다 찼습니다. 더 들어온 분자는 붙을 곳이 없어 떠 있기만 합니다 — 자기 제한." },
    { id: "purge1", name: "퍼지",
      desc: "불활성 기체(퍼지 가스)가 붙지 않고 떠 있던 전구체를 배기 쪽으로 몰아냅니다.",
      bad: "퍼지가 짧아서 떠 있던 전구체 일부가 챔버에 그대로 남았습니다." },
    { id: "react",  name: "반응 기체 주입",
      desc: "반응 기체가 붙어 있는 전구체와 반응해 막 한 줄이 됩니다. 반응에서 나온 부산물이 떨어져 나옵니다.",
      bad: "남은 전구체와 반응 기체가 공중에서 만나 알갱이가 생기고, 아무 곳에나 떨어져 쌓입니다." },
    { id: "purge2", name: "퍼지",
      desc: "남은 반응 기체와 부산물을 몰아냅니다. 새 표면에 다시 빈자리가 생기면 한 사이클이 끝납니다.",
      bad: "한 사이클이 끝났지만 열마다 두께가 다릅니다. 반복할수록 표면이 울퉁불퉁해집니다(CVD처럼 자람)." },
  ];
  const DUR = { normal: [3.6, 2.2, 3.4, 2.2], bad: [3.6, 1.0, 3.4, 2.2] };

  // ---------- 작은 도구 ----------
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const seg = (p, a, b) => clamp01((p - a) / (b - a));         // p가 a→b 사이 어디쯤인지 (0~1)
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t;
  const lerp = (a, b, t) => a + (b - a) * t;
  const f1 = (n) => n.toFixed(1);
  // 사이클·종류·번호로 정해지는 난수 (같은 입력 → 같은 값 → 정지 그림이 늘 같음)
  function rnd(a, b, c) {
    let x = (Math.imul(a + 1, 73856093) ^ Math.imul(b + 7, 19349663) ^ Math.imul(c + 3, 83492791)) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  // 0..N-1을 난수 순서로 줄 세운 순위 (먼저 붙는 자리 순서)
  function ranks(k, key) {
    const idx = [...Array(N).keys()].sort((a, b) => rnd(k, key, a) - rnd(k, key, b));
    const r = new Array(N);
    idx.forEach((j, n) => { r[j] = n; });
    return r;
  }
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // ---------- 막 두께 (퍼지 부족이면 열마다 더 쌓임) ----------
  // 사이클 k에 생기는 알갱이 3개가 떨어지는 열
  const grainCol = (k, g) => Math.floor(rnd(k, 50, g) * (N - 2)) + 1;
  // 사이클 k에서 열 c에 더 쌓이는 두께 (정상이면 0)
  function extra(k, c, bad) {
    if (!bad) return 0;
    let e = Math.round(rnd(k, 60, c) * 6);                       // 공중 반응(CVD)으로 조금씩 더
    for (let g = 0; g < 3; g++) {
      const d = Math.abs(c - grainCol(k, g));
      if (d === 0) e += 12; else if (d === 1) e += 5;              // 알갱이가 떨어진 곳은 볼록
    }
    return e;
  }
  // 사이클 k가 시작될 때 열 c의 막 두께
  function heightAt(k, c, bad) {
    let h = 0;
    for (let i = 0; i < k; i++) h += T + extra(i, c, bad);
    return h;
  }

  // ---------- pose: 단계 i, 진행 p, 사이클 k → 화면 상태 ----------
  // 돌려주는 것: 원마다 [x, y, 보임(0~1), 크기 배율] 과 막 칸, 빈자리, 글자용 값
  function pose(i, p, k, bad) {
    const Y = (c) => BASE - heightAt(k, c, bad);                   // 이번 사이클 시작 때 표면 높이
    const topAll = Math.min(...[...Array(N).keys()].map(Y));
    const hover = (m, key) => [120 + rnd(k, key, m) * 470, 52 + rnd(k, key + 1, m) * Math.max(30, topAll - 140)];
    const o = { P: [], E: [], R: [], RE: [], B: [], U: [], G: [], sites: [], cells: [], filled: 0 };
    const rP = ranks(k, 1), rR = ranks(k, 7);
    const aOf = (j) => 0.12 + 0.6 * rP[j] / (N - 1);               // 전구체가 j자리에 붙는 시점(①)
    const bOf = (j) => 0.12 + 0.5 * rR[j] / (N - 1);               // 반응 기체가 j자리에 닿는 시점(③)

    // 전구체 P_j (자리마다 하나)
    for (let j = 0; j < N; j++) {
      const tx = xs(j), ty = Y(j) - 11;
      if (i === 0) {
        const a = aOf(j), t = seg(p, a - 0.3, a);
        const sx = tx + (rnd(k, 2, j) - 0.5) * 150, sy = -24 - rnd(k, 3, j) * 50;
        const e = easeOut(t);
        o.P.push([lerp(sx, tx, e), lerp(sy, ty, e), t > 0 ? 1 : 0, 1]);
        if (p >= a) o.filled++;
      } else if (i === 1) {
        o.P.push([tx, ty, 1, 1]);
      } else if (i === 2) {
        const c = seg(p, bOf(j), bOf(j) + 0.12);                    // 반응해서 막으로 바뀌는 정도
        o.P.push([tx, ty, 1 - c, 1 - 0.3 * c]);
      } else o.P.push([tx, ty, 0, 1]);
    }
    if (i > 0) o.filled = N;

    // 남는 전구체 E_m (붙을 자리가 없어 떠 있는 분자, 6개)
    for (let m = 0; m < 6; m++) {
      const [hx, hy] = hover(m, 4);
      if (i === 0) {
        const s = 0.46 + 0.06 * m, e1 = s + 0.16, e2 = e1 + 0.2;
        const sx = 120 + rnd(k, 11, m) * 470, low = topAll - 36;
        let x, y;
        if (p < e1) { const t = easeIn(seg(p, s, e1)); x = lerp(sx, sx + (hx - sx) * 0.3, t); y = lerp(-24, low, t); }
        else { const t = easeOut(seg(p, e1, e2)); x = lerp(sx + (hx - sx) * 0.3, hx, t); y = lerp(low, hy, t); }   // 표면에 닿았다가 튕겨 나옴
        const wob = p > e2 ? Math.sin(p * 18 + m) * 3 : 0;
        o.E.push([x + wob, y, p > s ? 1 : 0, 1]);
      } else if (i === 1) {
        const leaves = !bad || m < 3;                               // 퍼지 부족: 3개는 남음
        if (leaves) {
          const t = easeIn(seg(p, 0.08 + 0.07 * m, 0.08 + 0.07 * m + (bad ? 0.75 : 0.55)));
          const x = lerp(hx, W + 30, t), y = lerp(hy, EX_Y, t);
          o.E.push([x, y, x > W + 10 ? 0 : 1, 1]);
        } else o.E.push([hx + 36 * p, hy, 1, 1]);
      } else if (i === 2 && bad && m >= 3) {
        // 남은 전구체 → 반응 기체와 공중에서 만남 (만나면 알갱이로 바뀌어 사라짐)
        const g = m - 3, meet = 0.3 + 0.1 * g;
        o.E.push([hx + 36, hy, p < meet ? 1 : 0, 1]);
      } else o.E.push([0, 0, 0, 1]);
    }

    // 반응 기체 R_j (자리마다 하나) + 부산물 B_j
    for (let j = 0; j < N; j++) {
      const tx = xs(j), cy = Y(j) - 11 - 15;                        // 붙은 전구체 바로 위에서 만남
      if (i === 2) {
        const b = bOf(j), t = seg(p, b - 0.26, b), c = seg(p, b, b + 0.12);
        const sx = tx + (rnd(k, 8, j) - 0.5) * 150, sy = -24 - rnd(k, 9, j) * 50;
        const e = easeOut(t);
        o.R.push([lerp(sx, tx, e), lerp(sy, cy, e), t > 0 ? 1 - c : 0, 1]);
        const r = seg(p, b, b + 0.4);
        o.B.push([tx + 8 + rnd(k, 12, j) * 14 * r, cy - (50 + rnd(k, 14, j) * 50) * easeOut(r), r > 0 ? 1 : 0, 1]);
      } else if (i === 3) {
        o.R.push([0, 0, 0, 1]);
        const bx = tx + 8 + rnd(k, 12, j) * 14, by = cy - (50 + rnd(k, 14, j) * 50);
        const t = easeIn(seg(p, 0.05 + 0.04 * rnd(k, 13, j) * 10, 0.75));
        const x = lerp(bx, W + 30, t), y = lerp(by, EX_Y, t);
        o.B.push([x, y, x > W + 10 ? 0 : 1, 1]);
      } else { o.R.push([0, 0, 0, 1]); o.B.push([0, 0, 0, 1]); }
    }

    // 남는 반응 기체 RE_g (3개): 정상이면 떠 있다가 ④에서 나감 / 퍼지 부족이면 남은 전구체와 만남
    for (let g = 0; g < 3; g++) {
      const [hx, hy] = hover(g, 20);
      if (i === 2) {
        const s = 0.18 + 0.1 * g;
        if (bad) {
          const [ex, ey] = hover(g + 3, 4), tx = ex + 36, meet = 0.3 + 0.1 * g;
          const t = easeOut(seg(p, s - 0.12, meet));
          o.RE.push([lerp(tx + 60 - 120 * (g % 2), tx, t), lerp(-24, ey, t), p > s - 0.12 && p < meet ? 1 : 0, 1]);
        } else {
          const t = easeOut(seg(p, s + 0.3, s + 0.6));
          o.RE.push([lerp(hx - 40, hx, t), lerp(-24, hy, t), p > s + 0.3 ? 1 : 0, 1]);
        }
      } else if (i === 3 && !bad) {
        const t = easeIn(seg(p, 0.1 + 0.08 * g, 0.7));
        const x = lerp(hx, W + 30, t);
        o.RE.push([x, lerp(hy, EX_Y, t), x > W + 10 ? 0 : 1, 1]);
      } else o.RE.push([0, 0, 0, 1]);
    }

    // 알갱이 G_g (퍼지 부족, ③): 만나는 곳에서 생겨 → 커지며 → 떨어져 그 열 위에 얹힘 → 막에 섞여 사라짐
    for (let g = 0; g < 3; g++) {
      if (bad && i === 2) {
        const [ex, ey] = hover(g + 3, 4), mx = ex + 36, meet = 0.3 + 0.1 * g, land = meet + 0.3;
        const c = grainCol(k, g), lx = xs(c), ly = Y(c) - 30;
        const t = easeIn(seg(p, meet + 0.06, land));
        const grow = seg(p, meet, meet + 0.06);
        const fade = seg(p, 0.8, 1);
        o.G.push([lerp(mx, lx, t), lerp(ey, ly, t), p >= meet ? 1 - fade : 0, 0.5 + 0.5 * grow]);
      } else o.G.push([0, 0, 0, 1]);
    }

    // 퍼지 가스 U_m (②·④에서 왼→오른쪽으로 쓸고 지나감)
    for (let m = 0; m < 10; m++) {
      if (i === 1 || i === 3) {
        const q = clamp01(p * 1.25 - m * 0.028);
        const x = -30 + q * 790, y = 40 + rnd(0, 6, m) * Math.max(40, topAll - 64);
        o.U.push([x, y + Math.sin(q * 9 + m) * 6, q > 0 && q < 1 ? 1 : 0, 1]);
      } else o.U.push([0, 0, 0, 1]);
    }

    // 막 칸: 지난 사이클 줄은 그대로, 이번 사이클 줄은 ③에서 칸마다 생겨남
    for (let r = 0; r < MAXC; r++) {
      for (let c = 0; c < N; c++) {
        let show = 0, hgt = T + extra(r, c, bad);
        if (r < k) show = 1;
        else if (r === k && i === 2) {
          show = seg(p, bOf(c), bOf(c) + 0.12);
          hgt = T + extra(r, c, bad) * seg(p, 0.8, 1);
        } else if (r === k && i === 3) show = 1;
        const yb = BASE - heightAt(r, c, bad);
        o.cells.push([xs(c) - DX / 2 + 1, yb - hgt, DX - 2, hgt, show, r]);
      }
    }

    // 빈자리 고리: ①에서는 전구체가 붙기 전까지, ④ 뒤쪽에서는 새 표면 위에 다시 생김
    for (let c = 0; c < N; c++) {
      if (i === 0) o.sites.push([xs(c), Y(c) - 6, p < aOf(c) ? 1 : 0]);
      else if (i === 3) {
        const yn = BASE - heightAt(k, c, bad) - T - extra(k, c, bad) - 6;
        o.sites.push([xs(c), yn, seg(p, 0.55, 0.85)]);
      } else o.sites.push([xs(c), Y(c) - 6, 0]);
    }
    o.layers = k + (i === 3 ? 1 : 0);
    return o;
  }

  // ---------- 그림 뼈대 (한 번만 만듦) ----------
  function buildSvg(holder) {
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "asf-svg", role: "img",
      "aria-label": "웨이퍼 표면을 크게 확대한 단면. 빈자리 열두 개 위로 전구체가 하나씩 붙고, 퍼지 가스가 남은 분자를 몰아내고, 반응 기체가 들어와 막 한 줄이 되며, 사이클마다 막이 한 줄씩 쌓인다." }, holder);
    // 배경: 위쪽 기체 공간 표시 · 오른쪽 배기
    svgEl("text", { class: "asf-label", x: 18, y: 30 }, svg).textContent = "기체 들어옴 ↓";
    svgEl("path", { class: "asf-exhaust", d: `M${W - 70} ${EX_Y} H${W - 14}`, "marker-end": "url(#asf-head)" }, svg);
    svgEl("text", { class: "asf-label is-end", x: W - 14, y: EX_Y - 14 }, svg).textContent = "배기";
    const defs = svgEl("defs", {}, svg);
    const mk = svgEl("marker", { id: "asf-head", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, defs);
    svgEl("path", { d: "M1 1.5 L8.5 5 L1 8.5", class: "asf-head" }, mk);
    // 기판
    svgEl("rect", { class: "asf-sub", x: 40, y: BASE, width: W - 80, height: H - BASE }, svg);
    svgEl("text", { class: "asf-sub-t", x: W / 2, y: BASE + 24 }, svg).textContent = "웨이퍼 (기판)";
    const gCells = svgEl("g", {}, svg), gSites = svgEl("g", {}, svg), gMol = svgEl("g", {}, svg);
    const el = { cells: [], sites: [], P: [], E: [], R: [], RE: [], B: [], U: [], G: [] };
    for (let n = 0; n < MAXC * N; n++) el.cells.push(svgEl("rect", { class: "asf-cell" + (Math.floor(n / N) % 2 ? " is-alt" : ""), rx: 2 }, gCells));
    for (let c = 0; c < N; c++) el.sites.push(svgEl("circle", { class: "asf-site", r: 5.5 }, gSites));
    const add = (key, n, cls, r) => { for (let m = 0; m < n; m++) el[key].push(svgEl("circle", { class: cls, r }, gMol)); };
    add("B", N, "asf-byp", 3.6);
    add("U", 10, "asf-purge", 4.5);
    add("P", N, "asf-prec", 10);
    add("E", 6, "asf-prec", 10);
    add("R", N, "asf-react", 6.5);
    add("RE", 3, "asf-react", 6.5);
    add("G", 3, "asf-grain", 13);
    return el;
  }

  function apply(el, o) {
    const put = (nodes, arr) => arr.forEach((v, n) => {
      const c = nodes[n];
      c.setAttribute("transform", `translate(${f1(v[0])} ${f1(v[1])}) scale(${v[3].toFixed(2)})`);
      c.setAttribute("opacity", v[2].toFixed(2));
    });
    ["P", "E", "R", "RE", "B", "U", "G"].forEach((k) => put(el[k], o[k]));
    o.cells.forEach((v, n) => {
      const r = el.cells[n];
      r.setAttribute("x", f1(v[0])); r.setAttribute("y", f1(v[1]));
      r.setAttribute("width", f1(v[2])); r.setAttribute("height", f1(Math.max(0, v[3])));
      r.setAttribute("opacity", v[4].toFixed(2));
    });
    o.sites.forEach((v, n) => {
      const s = el.sites[n];
      s.setAttribute("cx", f1(v[0])); s.setAttribute("cy", f1(v[1])); s.setAttribute("opacity", v[2].toFixed(2));
    });
  }

  // ---------- 시뮬레이션 한 개 연결 ----------
  function setup(root) {
    const holder = root.querySelector(".asf-svg-box");
    if (!holder || !window.gsap) return;
    const el = buildSvg(holder);
    const stageEl = root.querySelector("[data-asf-stage]");
    const descEl = root.querySelector("[data-asf-desc]");
    const cycEl = root.querySelector("[data-asf-cycle]");
    const layEl = root.querySelector("[data-asf-layers]");
    const warnEl = root.querySelector("[data-asf-warn]");
    const playBtn = root.querySelector("[data-asf-play]");
    const badBtn = root.querySelector("[data-asf-bad]");
    const stepBtns = [...root.querySelectorAll("[data-asf-step]")];
    const prevBtn = root.querySelector("[data-asf-prev]"), nextBtn = root.querySelector("[data-asf-next]");

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const still0 = window.MotionPref ? !!MotionPref.reason() : reduceMq.matches;
    let playing = !still0, onScreen = true;
    let bad = false, cycle = 0, cur = { i: 0, p: 0 };
    let tl = null;
    const clock = { t: 0 };
    const dur = () => DUR[bad ? "bad" : "normal"];
    const startOf = (i) => dur().slice(0, i).reduce((a, b) => a + b, 0);

    function stageAt(t) {
      const d = dur();
      let x = t;
      for (let i = 0; i < d.length; i++) { if (x < d[i] || i === d.length - 1) return { i, p: clamp01(x / d[i]) }; x -= d[i]; }
      return { i: 3, p: 1 };
    }

    let lastText = "";
    function render(i, p) {
      cur = { i, p };
      const o = pose(i, p, cycle, bad);
      apply(el, o);
      // 글자: 단계 이름 · 설명 · 사이클 수 (바뀔 때만 고침)
      const s = STEPS[i];
      let d = bad && s.bad ? s.bad : s.desc;
      if (i === 0) d = o.filled >= N ? s.full : `${s.desc} 채워진 자리 ${o.filled}/${N}`;
      const text = i + "|" + d + "|" + cycle + "|" + o.layers;
      if (text === lastText) return;
      lastText = text;
      if (stageEl) stageEl.innerHTML = `<span class="sim-stage-num">${i + 1}/4</span> ${s.name}`;
      if (descEl) descEl.textContent = d;
      if (cycEl) cycEl.textContent = String(cycle + 1);
      if (layEl) layEl.textContent = String(o.layers);
      stepBtns.forEach((b) => {
        const on = +b.dataset.asfStep === i;
        b.classList.toggle("is-active", on);
        if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (prevBtn) prevBtn.disabled = i === 0 && cycle === 0;
    }

    // 타임라인 = 한 사이클 (단계마다 라벨). 끝나면 사이클 +1 하고 처음부터
    function build() {
      if (tl) tl.kill();
      clock.t = 0;
      const total = startOf(4);
      tl = gsap.timeline({ paused: true, onComplete: () => {
        cycle = (cycle + 1) % MAXC;          // 6층까지 쌓으면 처음부터
        tl.restart();
        if (!running()) tl.pause();
      } });
      STEPS.forEach((s, i) => tl.addLabel(s.id, startOf(i)));
      tl.fromTo(clock, { t: 0 }, { t: total, duration: total, ease: "none", onUpdate: () => {
        const st = stageAt(clock.t); render(st.i, st.p);
      } }, 0);
    }
    const running = () => playing && onScreen && !document.hidden;
    function sync() { if (running()) tl.play(); else tl.pause(); }

    function updatePlay() {
      if (!playBtn) return;
      playBtn.textContent = playing ? "일시정지" : "재생";
      playBtn.setAttribute("aria-pressed", String(!playing));
    }

    // 단계로 건너뛰기: 재생 중이면 그 단계 처음부터, 멈춰 있으면 그 단계가 끝난 모습(정지 그림)
    function go(i) {
      if (playing) { tl.seek(STEPS[i].id); const st = stageAt(clock.t); render(st.i, st.p); }
      else { tl.seek(startOf(i) + dur()[i] - 0.001); render(i, 1); }
      sync();
    }
    stepBtns.forEach((b) => b.addEventListener("click", () => go(+b.dataset.asfStep)));
    if (nextBtn) nextBtn.addEventListener("click", () => {
      if (cur.i < 3) go(cur.i + 1);
      else { cycle = (cycle + 1) % MAXC; go(0); }
    });
    if (prevBtn) prevBtn.addEventListener("click", () => {
      if (cur.i > 0) go(cur.i - 1);
      else if (cycle > 0) { cycle--; go(3); }
    });
    if (playBtn) playBtn.addEventListener("click", () => {
      playing = !playing;
      if (playing && cur.p >= 0.999) {          // 정지 그림(단계 끝)에서 재생 → 그 단계 처음부터
        tl.seek(STEPS[cur.i].id);
      }
      updatePlay();
      sync();
    });
    if (badBtn) badBtn.addEventListener("click", () => {
      bad = !bad;
      badBtn.setAttribute("aria-pressed", String(bad));
      badBtn.textContent = bad ? "정상 퍼지로 되돌리기" : "퍼지가 부족하면";
      root.classList.toggle("is-bad", bad);
      if (warnEl) warnEl.hidden = !bad;
      cycle = 0; lastText = "";
      build();
      go(0);
    });
    reduceMq.addEventListener && reduceMq.addEventListener("change", (e) => {
      if (e.matches && playing) { playing = false; updatePlay(); go(cur.i); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { onScreen = en[en.length - 1].isIntersecting; sync(); }).observe(root);
    }
    document.addEventListener("visibilitychange", sync);

    build();
    if (playing) render(0, 0); else { tl.seek(dur()[0] - 0.001); render(0, 1); }
    updatePlay();
    sync();
  }

  // ---------- 온도 창 패널 ----------
  // 작은 단면 (viewBox 300×160) — 기판 + 이미 있는 막 한 줄 + 그 위 상태. 좌표는 손으로 정한 개념도
  const CX = (n) => 36 + n * 33;                    // 칸 8개 가운데
  function tempSvg(kind) {
    const base = 128, row = 112;
    let s = `<svg viewBox="0 0 300 160" class="atw-svg" aria-hidden="true">`;
    s += `<rect class="asf-sub" x="10" y="${base}" width="280" height="32"/>`;
    for (let n = 0; n < 8; n++) s += `<rect class="asf-cell" x="${CX(n) - 15.5}" y="${row}" width="31" height="16" rx="2"/>`;
    const prec = (x, y, extraCls) => `<circle class="asf-prec${extraCls || ""}" cx="${x}" cy="${y}" r="10"/>`;
    const site = (x) => `<circle class="asf-site" cx="${x}" cy="${row - 6}" r="5"/>`;
    if (kind === "window") {
      for (let n = 0; n < 8; n++) s += prec(CX(n), row - 11);
    } else if (kind === "condense") {
      for (let n = 0; n < 8; n++) s += prec(CX(n), row - 11);
      [0.5, 1.5, 2.5, 4.5, 5.5, 6.5].forEach((n) => { s += prec(36 + n * 33, row - 29); });
      [1, 2, 5, 6].forEach((n) => { s += prec(CX(n), row - 47); });
      s += `<path class="atw-drop" d="M44 ${row - 70} q22 -10 44 0 M196 ${row - 70} q22 -10 44 0"/>`;
    } else if (kind === "lack") {
      [0, 2, 3, 5, 7].forEach((n) => {
        s += prec(CX(n), row - 11, " is-half");
        s += `<circle class="atw-frag" cx="${CX(n) + 9}" cy="${row - 21}" r="3.6"/><circle class="atw-frag" cx="${CX(n) - 9}" cy="${row - 21}" r="3.6"/>`;
      });
      [1, 4, 6].forEach((n) => { s += site(CX(n)); });
    } else if (kind === "decomp") {
      const bump = [10, 22, 6, 30, 14, 4, 26, 12];
      for (let n = 0; n < 8; n++) s += `<rect class="asf-cell is-alt" x="${CX(n) - 15.5}" y="${row - bump[n]}" width="31" height="${bump[n]}" rx="2"/>`;
      [[40, 70], [92, 52], [150, 64], [210, 40], [255, 66], [120, 30], [182, 22], [70, 34]].forEach(([x, y]) => { s += `<circle class="atw-frag is-prec" cx="${x}" cy="${y}" r="4.5"/>`; });
    } else if (kind === "desorb") {
      [0, 2, 3, 6].forEach((n) => { s += prec(CX(n), row - 11); });
      [1, 4, 5, 7].forEach((n, q) => {
        s += site(CX(n));
        const y = row - 52 - (q % 2) * 18;
        const x = CX(n);   // 위로 떠나는 화살표 (선 + 꺾쇠)
        s += prec(x, y, " is-away") + `<path class="atw-arrow" d="M${x} ${y - 14} v-16 M${x - 5} ${y - 25} L${x} ${y - 30} L${x + 5} ${y - 25}"/>`;
      });
    }
    return s + "</svg>";
  }
  const ZONES = {
    low: { name: "창보다 낮음", items: [
      { kind: "condense", title: "응축이면", text: "전구체가 차가운 표면에 이슬처럼 맺혀 여러 겹 쌓입니다. 한 사이클에 한 층보다 많이 쌓여 자기 제한이 깨집니다." },
      { kind: "lack", title: "반응 부족이면", text: "반응에 필요한 에너지가 모자라 반응이 끝까지 가지 않습니다. 빈자리가 남고, 덜 반응한 조각이 불순물로 남기 쉽습니다." } ] },
    window: { name: "ALD 온도 창", items: [
      { kind: "window", title: "창 안이면", text: "자리마다 하나씩 붙고 남김없이 반응합니다. 온도가 조금 바뀌어도 사이클당 성장량이 거의 같습니다." } ] },
    high: { name: "창보다 높음", items: [
      { kind: "decomp", title: "분해이면", text: "전구체가 자리와 상관없이 열로 스스로 쪼개져 쌓입니다. CVD처럼 되어 두껍고 고르지 않습니다." },
      { kind: "desorb", title: "이탈이면", text: "붙었던 분자나 표면의 반응 자리가 열로 떨어져 나갑니다. 빈자리가 남아 성장량이 줄어듭니다." } ] },
  };
  const zoneOf = (v) => (v < 34 ? "low" : v > 66 ? "high" : "window");

  function setupTemp(root) {
    const input = root.querySelector("input[type=range]");
    const out = root.querySelector("[data-atw-draw]");
    const nameEl = root.querySelector("[data-atw-zone]");
    const marks = [...root.querySelectorAll("[data-atw-mark]")];
    if (!input || !out) return;
    let shown = "";
    function show() {
      const z = zoneOf(+input.value);
      root.style.setProperty("--atw-pos", input.value + "%");
      if (z === shown) return;
      shown = z;
      const Z = ZONES[z];
      input.setAttribute("aria-valuetext", Z.name);
      if (nameEl) nameEl.textContent = Z.name;
      marks.forEach((m) => m.classList.toggle("is-on", m.dataset.atwMark === z));
      out.className = "atw-draw is-" + z;
      out.innerHTML = Z.items.map((it) =>
        `<figure class="atw-card"><div class="atw-pic">${tempSvg(it.kind)}</div>` +
        `<figcaption><strong>${it.title}</strong> ${it.text}</figcaption></figure>`).join("");
    }
    input.addEventListener("input", show);
    // 구간 이름을 누르면 그 구간 가운데로
    marks.forEach((m) => m.addEventListener("click", () => {
      input.value = { low: 15, window: 50, high: 85 }[m.dataset.atwMark];
      show();
    }));
    show();
  }

  // 다른 파일(js/sim/ald-scrolly.js: 원리 페이지 스크롤 체험·실험대)이 같은 그림 계산을 다시 쓰도록 내보냄
  //   pose(단계, 진행, 사이클, 퍼지부족) → 상태 / buildSvg(상자) → 그림 뼈대 / apply(뼈대, 상태) → 그리기
  window.AldSurface = { W, H, N, MAXC, STEPS, pose, buildSvg, apply, tempSvg, ZONES };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-ald-surface]").forEach(setup);
    document.querySelectorAll("[data-ald-temp]").forEach(setupTemp);
  });
})();
