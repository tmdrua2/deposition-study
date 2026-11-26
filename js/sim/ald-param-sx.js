// =============================================================
// ALD 공정변수 페이지 (equipment/ald/parameters.html) — ① 스크롤 단계 체험 ② 맨 아래 조작 그림 미션
//   형식은 원리 페이지와 같음 (단계 전환·반복 재생은 js/sim/sx-engine.js)
//
// ① [data-sx] 단계 5개: 펄스 시간 / 퍼지 시간 / 온도 / 전구체 공급량 / 변수는 서로 얽혀 있다
//    가운데 그림: 그 변수를 짧게→길게(낮게→높게) 천천히 바꾸며 반복
//      · 왼쪽 곡선: 가로 = 변수, 세로 = 사이클당 두께. 점이 곡선을 따라 움직임
//        (펄스·공급량 = 포화 곡선: 어느 지점부터 평평 → "늘려도 그대로")
//      · 오른쪽 표면: 같은 순간 웨이퍼 표면 모습 (js/sim/ald-surface.js 재사용)
//      · 아래 막대 2개: 함께 달라지는 것(시간·원료·파티클 등), 길이만
//      · 마지막 단계는 곡선 대신 "얽힘 사슬"이 차례로 켜짐
//    오른쪽 위 게이지: 지금 변수 값(짧게 ↔ 길게)
// ② [data-param-lab] 아래 미션 3개: js/figs/param-lab.js가 만든 버튼 상태를 읽어 체크 (그리는 코드는 손대지 않음)
//
// 정지 화면(움직임 줄이기·?still=1): 단계마다 정지 그림(곡선 + 세 지점 표시 + 표면)을 세로로
// 곡선 모양은 경향을 보여 주는 개념도. 색은 css/style.css 변수만 클래스로 씀
// 의존: gsap, ScrollTrigger, motion-pref.js, sx-engine.js, ald-surface.js
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

  // ---------- 곡선 좌표 (viewBox 600 × 290) ----------
  const PX0 = 56, PX1 = 572, PY0 = 236, PH = 150;
  const X = (x) => PX0 + x * (PX1 - PX0);
  const Y = (v) => PY0 - v * PH;                          // v = 사이클당 두께 (1 = 기준 한 층 몫)

  const SAT = 0.42, OK = 0.4, WL = 0.3, WH = 0.7;
  const satY = (x) => (x < SAT ? 1 - Math.pow(1 - x / SAT, 2) : 1);
  const purgeY = (x) => (x < OK ? 1 + 0.5 * Math.pow(1 - x / OK, 2) : 1);
  const tempBr = {                                        // 온도 창 밖 두 갈래 (어느 쪽인지는 전구체에 따라 다름)
    lowUp: (x) => 1 + 0.45 * Math.pow((WL - x) / WL, 1.4), lowDn: (x) => 1 - 0.5 * Math.pow((WL - x) / WL, 1.4),
    hiUp: (x) => 1 + 0.45 * Math.pow((x - WH) / (1 - WH), 1.4), hiDn: (x) => 1 - 0.5 * Math.pow((x - WH) / (1 - WH), 1.4)
  };
  const path = (f, a, b) => {
    let d = "";
    for (let n = 0; n <= 40; n++) { const x = a + (b - a) * n / 40; d += (n ? " L" : "M") + X(x).toFixed(1) + " " + Y(f(x)).toFixed(1); }
    return d;
  };

  // ---------- 단계별 내용 ----------
  const VARS = [
    { kind: "sat", lo: "짧게", hi: "길게", xl: "펄스 시간 →", name: "펄스 시간",
      meters: [["사이클당 두께", (x) => satY(x) / 1.5], ["한 사이클 시간", (x) => 0.2 + 0.8 * x]],
      desc: (x) => x < SAT * 0.97 ? "펄스가 짧아 표면 자리가 다 차기 전에 닫힙니다. 늦게 닿는 곳이 덜 덮여 얇고 고르지 않습니다."
        : "포화: 여기부터는 펄스를 늘려도 사이클당 두께가 그대로입니다. 시간과 전구체만 더 듭니다." },
    { kind: "purge", lo: "짧게", hi: "길게", xl: "퍼지 시간 →", name: "퍼지 시간",
      meters: [["파티클 위험", (x) => (x < OK ? 0.15 + 0.85 * Math.pow(1 - x / OK, 1.3) : 0.12)], ["한 사이클 시간", (x) => 0.2 + 0.8 * x]],
      desc: (x) => x < OK * 0.97 ? "퍼지가 짧아 남은 전구체가 반응 기체와 만납니다. CVD처럼 더 쌓이고 공중에서 알갱이(파티클)가 생깁니다."
        : "충분: 여기부터는 퍼지를 늘려도 막은 그대로입니다. 퍼지는 사이클마다 두 번이라 시간이 크게 늘어납니다." },
    { kind: "temp", lo: "낮게", hi: "높게", xl: "웨이퍼 온도 →", name: "웨이퍼 온도",
      meters: [["막이 달라질 위험", (x) => (x < WL ? 0.15 + 0.85 * (WL - x) / WL : x > WH ? 0.15 + 0.85 * (x - WH) / (1 - WH) : 0.1)], ["아래 소자의 열 부담", (x) => 0.15 + 0.85 * x]],
      desc: (x) => x < WL ? "창보다 낮음: 전구체가 맺히거나(응축) 반응이 끝까지 가지 않습니다(반응 부족). 어느 쪽인지는 전구체에 따라 다릅니다."
        : x > WH ? "창보다 높음: 전구체가 스스로 쪼개지거나(분해) 붙은 분자가 떨어집니다(이탈). 어느 쪽인지는 전구체에 따라 다릅니다."
        : "ALD 온도 창 안: 온도가 조금 바뀌어도 사이클당 두께가 거의 같습니다." },
    { kind: "sat", lo: "적게", hi: "많게", xl: "전구체 공급량 →", name: "전구체 공급량", dose: true,
      meters: [["사이클당 두께", (x) => satY(x) / 1.5], ["버려지는 전구체", (x) => 0.08 + 0.92 * Math.max(0, (x - SAT) / (1 - SAT))]],
      desc: (x) => x < SAT * 0.97 ? "한 번 열 때 들어가는 전구체가 모자라 표면이 다 차지 않습니다."
        : "포화: 공급량을 늘려도 막은 그대로입니다. 남는 전구체는 배기로 버려지고, 퍼지할 양도 늘어납니다." },
    { kind: "chain", name: "변수는 서로 얽혀 있다" }
  ];
  const SWEEP = 5.4, HOLD = 1.6;
  const CHAIN_T = 3.6;                                    // 사슬 한 줄이 다 켜지는 시간
  const totalOf = (b) => (VARS[b].kind === "chain" ? CHAIN_T * 3 + 1.4 : SWEEP + HOLD);
  const xAt = (t) => 0.04 + 0.92 * ease(clamp(t / SWEEP, 0, 1));

  // ---------- 그림 하나 만들기 (스크롤 그림·정지 그림이 같이 씀) ----------
  function makeFig(holder) {
    const A = window.AldSurface;
    holder.innerHTML =
      `<div class="ps-fig">` +
        `<div class="ps-plot"><svg class="ps-svg" viewBox="0 0 600 290" role="img" aria-label="가로축은 지금 바꾸는 변수, 세로축은 사이클당 두께인 개념 그래프"></svg>` +
          `<div class="ps-meters"></div></div>` +
        `<div class="ps-side"><p class="ps-side-h">표면에서는</p><div class="ps-surf"></div><div class="ps-temp"></div><p class="ps-side-cap"></p></div>` +
      `</div>` +
      `<div class="ps-chain" hidden>` +
        chainRow(["펄스·공급량을 늘림", "남는 전구체가 늘어남", "퍼지를 더 길게", "사이클 시간이 늘어남"]) +
        chainRow(["깊고 좁은 구조", "안쪽까지 차는 데 오래 걸림", "펄스·공급량을 더", "퍼지 부담도 커짐"]) +
        chainRow(["전구체 용기 온도를 올림", "공급량이 늘어남", "열에 약한 전구체는 분해", "막 속 불순물"]) +
      `</div>`;
    const svg = holder.querySelector(".ps-svg");
    const surfBox = holder.querySelector(".ps-surf"), tempBox = holder.querySelector(".ps-temp");
    const sideCap = holder.querySelector(".ps-side-cap");
    const meters = holder.querySelector(".ps-meters");
    const chainNodes = [...holder.querySelectorAll(".ps-node")];
    const surf = A ? A.buildSvg(surfBox) : null;
    const sSvg = surfBox.querySelector("svg");
    if (sSvg) { sSvg.setAttribute("aria-hidden", "true"); sSvg.removeAttribute("role"); }

    // 곡선 뼈대 (단계가 바뀔 때마다 다시 그림)
    let built = -1, dot, dot2, flatLab, meterEls = [], zoneNow = "";
    function build(b) {
      built = b;
      const V = VARS[b];
      svg.innerHTML = "";
      holder.classList.toggle("is-chain", V.kind === "chain");
      holder.querySelector(".ps-fig").hidden = V.kind === "chain";
      holder.querySelector(".ps-chain").hidden = V.kind !== "chain";
      if (V.kind === "chain") return;
      if (V.kind === "temp") {
        mk("rect", { class: "ps-band", x: X(WL), y: 24, width: X(WH) - X(WL), height: PY0 - 24 }, svg);
        mk("text", { class: "ps-band-t", x: (X(WL) + X(WH)) / 2, y: PY0 - 14 }, svg).textContent = "ALD 온도 창";
      }
      mk("path", { class: "ps-axis", d: `M${PX0} ${PY0} H${PX1 + 10} M${PX0} ${PY0} V18` }, svg);
      mk("text", { class: "ps-axis-t", x: PX1 + 10, y: PY0 + 24, "text-anchor": "end" }, svg).textContent = V.xl;
      mk("text", { class: "ps-axis-t", x: PX0 + 6, y: 16 }, svg).textContent = "사이클당 두께 ↑";
      mk("line", { class: "ps-ref", x1: PX0, x2: PX1, y1: Y(1), y2: Y(1) }, svg);
      if (V.kind === "sat") {
        mk("path", { class: "ps-curve", d: path(satY, 0, SAT) }, svg);
        mk("path", { class: "ps-curve is-flat", d: path(satY, SAT, 1) }, svg);
        mk("line", { class: "ps-mark", x1: X(SAT), x2: X(SAT), y1: Y(1) - 18, y2: PY0 }, svg);
        mk("text", { class: "ps-lab", x: X(SAT), y: Y(1) - 24, "text-anchor": "middle" }, svg).textContent = "포화";
        mk("text", { class: "ps-zone-t", x: X(SAT / 2), y: PY0 - 20, "text-anchor": "middle" }, svg).textContent = "모자람";
        flatLab = mk("text", { class: "ps-flat-t", x: X((SAT + 1) / 2), y: Y(1) + 30, "text-anchor": "middle" }, svg);
        flatLab.textContent = "여기부터는 늘려도 그대로";
      } else if (V.kind === "purge") {
        mk("path", { class: "ps-curve", d: path(purgeY, 0, OK) }, svg);
        mk("path", { class: "ps-curve is-flat", d: path(purgeY, OK, 1) }, svg);
        mk("line", { class: "ps-mark", x1: X(OK), x2: X(OK), y1: Y(1) - 18, y2: PY0 }, svg);
        mk("text", { class: "ps-lab", x: X(OK), y: Y(1) - 24, "text-anchor": "middle" }, svg).textContent = "충분";
        mk("text", { class: "ps-zone-t", x: X(0.05), y: Y(1.5) - 12 }, svg).textContent = "모자람: CVD처럼 더 쌓임";
        flatLab = mk("text", { class: "ps-flat-t", x: X((OK + 1) / 2), y: Y(1) + 30, "text-anchor": "middle" }, svg);
        flatLab.textContent = "막은 그대로, 시간만 늘어남";
      } else {
        mk("path", { class: "ps-curve is-flat", d: path(() => 1, WL, WH) }, svg);
        // 갈래 이름은 곡선 가운데쯤 위(올라가는 갈래)·아래(내려가는 갈래)에
        [["lowUp", 0, WL, "응축", 0.13, -14], ["lowDn", 0, WL, "반응 부족", 0.13, 30],
         ["hiUp", WH, 1, "분해", 0.87, -14], ["hiDn", WH, 1, "이탈", 0.87, 30]].forEach(([k, a, c, t, lx, dy]) => {
          mk("path", { class: "ps-curve is-branch", d: path(tempBr[k], a, c) }, svg);
          mk("text", { class: "ps-zone-t", x: X(lx), y: Y(tempBr[k](lx)) + dy, "text-anchor": "middle" }, svg).textContent = t;
        });
        flatLab = null;
      }
      dot2 = mk("circle", { class: "ps-dot is-alt", r: 8, cx: -20, cy: -20 }, svg);
      dot = mk("circle", { class: "ps-dot", r: 9, cx: -20, cy: -20 }, svg);
      meters.innerHTML = V.meters.map(([n]) => `<div class="ps-meter"><span class="ps-meter-n">${n}</span><span class="ps-meter-tr"><i></i></span></div>`).join("");
      meterEls = [...meters.querySelectorAll("i")];
      surfBox.hidden = V.kind === "temp";
      tempBox.hidden = V.kind !== "temp";
      zoneNow = "";
    }

    // 단계 b, 변수 값 x(0~1), 반복 시간 t → 그림
    function set(b, x, t) {
      if (b !== built) build(b);
      const V = VARS[b];
      if (V.kind === "chain") {                        // 사슬: 한 줄씩 차례로 켜짐 (t < 0이면 모두 켬)
        chainNodes.forEach((n, k) => {
          const r = Math.floor(k / 4), c = k % 4;
          const on = t < 0 || t >= r * CHAIN_T + c * (CHAIN_T / 4.4);
          n.classList.toggle("is-on", on);
          n.classList.toggle("is-now", t >= 0 && on && Math.floor(t / CHAIN_T) === r);
        });
        return;
      }
      // 점: 곡선 위. 온도 창 밖은 두 갈래 모두에 점(어느 쪽인지는 전구체에 따라 다름)
      let v = 1, v2 = null;
      if (V.kind === "sat") v = satY(x);
      else if (V.kind === "purge") v = purgeY(x);
      else if (x < WL) { v = tempBr.lowUp(x); v2 = tempBr.lowDn(x); }
      else if (x > WH) { v = tempBr.hiUp(x); v2 = tempBr.hiDn(x); }
      dot.setAttribute("cx", X(x).toFixed(1)); dot.setAttribute("cy", Y(v).toFixed(1));
      dot2.setAttribute("cx", v2 === null ? -20 : X(x).toFixed(1)); dot2.setAttribute("cy", v2 === null ? -20 : Y(v2).toFixed(1));
      const past = V.kind === "sat" ? x >= SAT : V.kind === "purge" ? x >= OK : false;
      if (flatLab) flatLab.classList.toggle("is-on", past);
      svg.classList.toggle("is-past", past);
      V.meters.forEach(([, f], k) => { meterEls[k].style.transform = `scaleX(${clamp(f(x), 0, 1).toFixed(3)})`; });
      // 표면
      if (V.kind === "sat" && surf) {
        if (x < SAT) {
          const o = A.pose(0, 0.12 + 0.62 * x / SAT, 0, false);
          A.apply(surf, o);
          sideCap.textContent = `채워진 자리 ${o.filled}/${A.N}`;
        } else {
          const o = A.pose(0, 1, 0, false);
          o.E = A.pose(0, 0.45 + 0.55 * ((Math.max(0, t) % 2.6) / 2.6), 0, false).E;   // 남는 분자가 내려와 튕겨 나감
          A.apply(surf, o);
          sideCap.textContent = V.dose ? `다 참 ${A.N}/${A.N}: 남는 전구체는 배기로` : `다 참 ${A.N}/${A.N}: 더 들어와도 튕겨 나감`;
        }
      } else if (V.kind === "purge" && surf) {
        const bad = x < OK;
        A.apply(surf, A.pose(2, 0.78, 0, bad));
        sideCap.textContent = bad ? "남은 전구체 + 반응 기체 → 알갱이" : "깨끗하게 한 줄로 반응";
      } else if (V.kind === "temp" && A) {
        const z = x < WL ? "low" : x > WH ? "high" : "window";
        if (z !== zoneNow) {
          zoneNow = z;
          const Z = A.ZONES[z];
          tempBox.className = "ps-temp is-" + z;
          tempBox.innerHTML = Z.items.map((it) => `<figure class="ps-tcard"><div class="atw-pic">${A.tempSvg(it.kind)}</div><figcaption>${it.title}</figcaption></figure>`).join("");
          sideCap.textContent = z === "window" ? "자리마다 하나씩, 남김없이 반응" : "두 갈래 중 하나 (전구체에 따라)";
        }
      }
    }
    // 정지 그림용: 짧은(낮은) 쪽에 옅은 점, 긴(높은) 쪽은 본 점 — 각각 위에 "짧게 / 길게" 이름 (곡선 이름과 겹치지 않게)
    function ghosts(b) {
      const V = VARS[b];
      if (V.kind === "chain") return;
      const vAt = (x) => (V.kind === "sat" ? satY(x) : V.kind === "purge" ? purgeY(x) : 1);
      mk("circle", { class: "ps-dot is-ghost", r: 7, cx: X(0.12), cy: Y(vAt(0.12)) }, svg);
      [[0.12, V.lo], [0.88, V.hi]].forEach(([x, t]) => {
        mk("text", { class: "ps-ghost-t", x: X(x), y: Y(vAt(x)) + (V.kind === "temp" ? 0 : 30), "text-anchor": "middle" }, svg).textContent = t;
      });
    }
    return { set, ghosts };
  }
  function chainRow(items) {
    return `<div class="ps-chain-row">` + items.map((t, k) => (k ? `<span class="ps-arrow" aria-hidden="true">→</span>` : "") + `<span class="ps-node">${t}</span>`).join("") + `</div>`;
  }

  // =============================================================
  // ① 스크롤 단계 체험
  // =============================================================
  function setupStory(root) {
    const E = window.SxEngine;
    if (!E || !window.AldSurface) return;
    const $ = E.$;
    if (E.isStill() || !window.gsap || !window.ScrollTrigger) { buildStill(root); return; }

    const fig = makeFig($("[data-sx-svg]", root));
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
      else descEl.textContent = "한 변수를 바꾸면 다른 변수의 알맞은 값도 따라 움직입니다. 그래서 레시피는 하나씩 바꿔 가며 확인합니다.";
    }
    E.story(root, { total: totalOf, draw, onActivate, lapSoften: () => true, softEl: $("[data-sx-svg]", root) });
  }

  function buildStill(root) {
    const E = window.SxEngine;
    E.still(root, (step, b, fig) => {
      const V = VARS[b];
      fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${V.name}${V.kind === "chain" ? "" : ` · ${V.lo} → ${V.hi}`}</p></div><div class="ps-still"></div>`;
      const f = makeFig(fig.querySelector(".ps-still"));
      if (V.kind === "chain") { f.set(b, 0, -1); return; }
      const x = V.kind === "temp" ? 0.88 : 0.88;
      f.set(b, x, 0);
      f.ghosts(b);
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
      const L = { pulse: lv("pulse"), purge: lv("purge"), temp: lv("temp"), dose: lv("dose") };
      const changed = Object.values(L).filter(Boolean).length;
      const word = (id) => ((lab.querySelector(`[data-res="${id}"] .pl-res-word`) || {}).textContent || "");
      if (L.pulse === 1 && changed === 1 && word("gpc") === "거의 그대로") done.add("flat");
      if (L.purge === -1) done.add("purge");
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
