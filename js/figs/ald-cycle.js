// =============================================================
// ALD 사이클 — 분해가 끝난 장비 그림 위에 기체 흐름을 점선으로 표시 (ALD만의 연출)
//
//   전구체 주입 → 퍼지 → 반응 기체 주입 → 퍼지 (네 단계 반복)
//   단계마다 그 단계에 쓰는 밸브와 배관만 하늘색으로 켜지고, 밸브 옆에 단계 이름이 짧게 나옴
//   (그림 = 1번 공정 챔버(PM1)와 전구체 공급부·반응 기체 공급부·펌프)
//
// 정지 화면(움직임 줄이기 · ?still=1 · 데이터 절약·저사양): 덧그림 없이
//   장비 아래에 네 단계를 작은 계통도 네 장으로 나란히 보여 줌 (.ald-steps)
//
// 사용: EquipStage.mount() 가 돌려준 손잡이를 넘김 → AldCycle.mount(무대 요소, 손잡이)
//   손잡이 = { info, scene, wafer, caption, vb, onFlow, isStatic } (js/explode/stage.js)
// 의존: GSAP, render-iso.js(IsoRender.project), stage.js
// 좌표는 렌더러가 계산한 "분해 완료 상태"의 부품 범위(info.partBox)를 그대로 써서 데이터가 바뀌어도 따라감
// =============================================================
(function () {
  "use strict";

  // 한 사이클 네 단계 (dur = 한 단계가 켜져 있는 시간, 초)
  const STEPS = [
    { id: "prec",   name: "전구체 주입",    desc: "원료 분자가 웨이퍼 표면에 붙습니다. 붙을 자리가 다 차면 더 붙지 않습니다.", dur: 2.4 },
    { id: "purge1", name: "퍼지",          desc: "불활성 가스로 붙지 않은 남은 전구체를 몰아냅니다.",                          dur: 1.8 },
    { id: "react",  name: "반응 기체 주입", desc: "반응 기체가 표면의 전구체와 반응해 막 한 층이 완성됩니다.",                   dur: 2.4 },
    { id: "purge2", name: "퍼지",          desc: "남은 반응 기체와 부산물을 몰아냅니다. 여기까지가 한 사이클입니다.",           dur: 1.8 }
  ];
  // 단계마다 켜지는 것: 배관(route)과 밸브(valve). 배기는 퍼지 단계에서 켜서 "몰아내는" 흐름을 보여 줌
  const LIT = {
    prec:   { routes: ["prec"],             valve: "v-prec" },
    purge1: { routes: ["purge", "exhaust"], valve: "v-purge" },
    react:  { routes: ["react"],            valve: "v-react" },
    purge2: { routes: ["purge", "exhaust"], valve: "v-purge" }
  };
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const pad = (n) => String(n);

  // ---------------------------------------------------------------
  // 1) 장비 위 덧그림 (움직이는 화면)
  // ---------------------------------------------------------------
  function buildOverlay(stageEl, h) {
    const info = h.info, P = IsoRender.project;
    const need = ["precursor", "reactant", "v-prec", "v-react", "v-purge", "pm", "pump"].map((id) => [id, info.partBox(id)]);
    if (need.some((n) => !n[1])) return null;                       // 데이터가 달라 부품을 못 찾으면 덧그림 없음
    const B = Object.fromEntries(need);
    const c = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
    const top = (b) => [...c(b), b.max[2]];
    const vTop = { prec: top(B["v-prec"]), react: top(B["v-react"]), purge: top(B["v-purge"]) };
    const zV = vTop.react[2];
    // 3D 꺾은선: 공급부 윗면 → 위로 → 가로(x) → 세로(y) → 밸브 위로 내려옴 (장비 그림의 배관과 같은 모양)
    const route = (from, to, zh) => [
      from, [from[0], from[1], zh], [to[0], from[1], zh], [to[0], to[1], zh], to
    ];
    const pTop = top(B.precursor), rTop = top(B.reactant);
    // 공급부 윗면 가장자리 쪽에서 출발 (캐니스터 위가 아니라 모서리)
    const pFrom = [B.precursor.min[0] + 0.5, pTop[1], pTop[2]];
    const rFrom = [B.reactant.min[0] + 0.5, rTop[1], rTop[2]];
    const R = {
      prec: route(pFrom, vTop.prec, zV + 1.6),
      react: route(rFrom, vTop.react, zV + 2.6),
      // 퍼지: 반응 기체 공급부(퍼지 가스도 여기서 나옴)에서 퍼지 밸브로. 반응 기체 배관보다 살짝 낮게 가서 겹치지 않음
      purge: route([rFrom[0], rFrom[1] + 0.5, rFrom[2]], vTop.purge, zV + 2.1),
      // 배기: 챔버 아래 → 바닥 아래로 → 펌프 위로 (장비 그림의 배기 배관과 같은 모양)
      exhaust: (() => {
        const a = [...c(B.pm), 0], t = top(B.pump), zs = -2.5;
        return [a, [a[0], a[1], zs], [t[0], a[1], zs], [t[0], t[1], zs], t];
      })()
    };
    const pts = (r) => r.map(P);
    const dOf = (r) => "M" + pts(r).map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");

    const svg = svgEl("svg", { class: "ald-cycle", viewBox: h.vb.join(" "), "aria-hidden": "true", focusable: "false" }, h.scene);
    const base = svgEl("g", {}, svg), lit = svgEl("g", {}, svg), valves = svgEl("g", {}, svg);
    const litEl = {}, valveEl = {}, haloEl = {};
    Object.keys(R).forEach((k) => {
      svgEl("path", { class: "ac-base", d: dOf(R[k]) }, base);
      litEl[k] = svgEl("path", { class: "ac-lit", d: dOf(R[k]) }, lit);
    });
    [["v-prec", "prec"], ["v-react", "react"], ["v-purge", "purge"]].forEach(([id, k]) => {
      const p = P(vTop[k]);
      haloEl[id] = svgEl("circle", { class: "ac-halo", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 13 }, valves);
      valveEl[id] = svgEl("circle", { class: "ac-valve", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 6 }, valves);
    });

    // 단계 이름표 (밸브 옆) — 장면 크기에 대한 % 로 놓음 → 화면 크기가 바뀌어도 따라감
    const vb = h.vb;
    const chip = document.createElement("div");
    chip.className = "ald-chip";
    chip.setAttribute("aria-hidden", "true");
    h.scene.appendChild(chip);
    const place = (id) => {
      const k = id === "v-prec" ? "prec" : id === "v-react" ? "react" : "purge";
      const p = P(vTop[k]);
      chip.style.left = (((p[0] - vb[0]) / vb[2]) * 100).toFixed(2) + "%";
      chip.style.top = (((p[1] - vb[1]) / vb[3]) * 100).toFixed(2) + "%";
      chip.classList.toggle("is-left", (p[0] - vb[0]) / vb[2] > 0.6);
    };

    // 아래 설명줄(.iso-caption): 웨이퍼 경로 문구 ↔ 사이클 네 단계 (지금 단계 강조)
    const cap = h.caption;
    const capOrig = cap ? cap.innerHTML : "";
    const capSteps = [];
    const cycleHtml = '<span class="iso-caption-line"></span><span class="ac-steps" aria-hidden="true">' +
      STEPS.map((s, i) => '<span class="ac-step">' + (i + 1) + " " + s.name + "</span>").join("") + "</span>";

    function setStep(i) {
      const s = STEPS[i], on = LIT[s.id];
      Object.keys(litEl).forEach((k) => litEl[k].classList.toggle("is-on", on.routes.includes(k)));
      Object.keys(valveEl).forEach((id) => {
        valveEl[id].classList.toggle("is-on", id === on.valve);
        haloEl[id].classList.toggle("is-on", id === on.valve);
      });
      chip.innerHTML = "<small>" + pad(i + 1) + "/4</small>" + s.name;
      place(on.valve);
      capSteps.forEach((el, j) => el.classList.toggle("is-on", j === i));
    }

    // 사이클 타임라인: 보일 때만 돎 (분해가 끝나기 전 · 크림 화면에서 벗어나 안 보일 때는 멈춤)
    const tl = gsap.timeline({ repeat: -1, paused: true });
    STEPS.forEach((s, i) => { tl.call(setStep, [i]).to({}, { duration: s.dur }); });

    let flowing = false, visible = true;
    const sync = () => {
      const run = flowing && visible && !document.hidden;
      svg.classList.toggle("is-live", flowing);
      chip.classList.toggle("is-live", flowing);
      h.wafer.classList.toggle("is-dim", flowing);
      if (cap) {
        if (flowing && !capSteps.length) {
          cap.innerHTML = cycleHtml;
          cap.querySelectorAll(".ac-step").forEach((el) => capSteps.push(el));
        } else if (!flowing && capSteps.length) {
          cap.innerHTML = capOrig;
          capSteps.length = 0;
        }
      }
      if (run) { if (tl.paused()) { if (!tl.time()) setStep(0); tl.play(); } }
      else tl.pause();
    };
    h.onFlow((f) => { flowing = f; sync(); });
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; sync(); }, { threshold: 0 }).observe(stageEl);
    }
    return { destroy: () => { tl.kill(); svg.remove(); chip.remove(); if (cap) cap.innerHTML = capOrig; h.wafer.classList.remove("is-dim"); } };
  }

  // ---------------------------------------------------------------
  // 2) 정지 화면: 네 단계 작은 계통도 네 장
  // ---------------------------------------------------------------
  // 그림 한 장 (viewBox 240×170): 왼쪽 공급부 둘 → 챔버 왼쪽에 붙은 밸브 셋 → 챔버 → 아래 펌프
  function miniSvg(step) {
    const on = LIT[step.id];
    const rt = (k) => on.routes.includes(k) ? " is-on" : "";
    const vv = (id) => on.valve === id ? " is-on" : "";
    return '<svg viewBox="0 0 240 170" role="img" aria-label="' + step.name + ' 단계의 기체 흐름 그림">' +
      // 공급부
      '<rect class="as-box" x="6" y="40" width="64" height="44" rx="4"/><text class="as-text" x="38" y="59">전구체</text><text class="as-text" x="38" y="72">공급부</text>' +
      '<rect class="as-box" x="6" y="98" width="64" height="58" rx="4"/><text class="as-text" x="38" y="122">반응 기체</text><text class="as-text" x="38" y="135">· 퍼지</text>' +
      // 배관 (공급부 → 밸브)
      '<path class="as-pipe' + rt("prec") + '" d="M70 62 H138"/>' +
      '<path class="as-pipe' + rt("react") + '" d="M70 108 H138"/>' +
      '<path class="as-pipe' + rt("purge") + '" d="M70 140 H110 V128 H138"/>' +
      // 챔버로 들어가는 짧은 가지 (밸브 → 챔버 가까이)
      '<path class="as-pipe' + rt("prec") + '" d="M150 62 H164"/>' +
      '<path class="as-pipe' + rt("react") + '" d="M150 108 H164 V96"/>' +
      '<path class="as-pipe' + rt("purge") + '" d="M150 128 H164"/>' +
      // 챔버 + 밸브
      '<rect class="as-chamber" x="164" y="40" width="70" height="100" rx="6"/><text class="as-text" x="199" y="94">챔버</text>' +
      '<circle class="as-valve' + vv("v-prec") + '" cx="144" cy="62" r="6"/>' +
      '<circle class="as-valve' + vv("v-react") + '" cx="144" cy="108" r="6"/>' +
      '<circle class="as-valve' + vv("v-purge") + '" cx="144" cy="128" r="6"/>' +
      // 배기 → 펌프
      '<path class="as-pipe' + rt("exhaust") + '" d="M199 140 V152"/>' +
      '<rect class="as-box" x="176" y="152" width="46" height="14" rx="3"/><text class="as-text" x="199" y="162" style="font-size:9px">펌프</text>' +
      '</svg>';
  }

  function buildStill(stageEl, box) {
    box.innerHTML =
      (stageEl ? '<h2 class="ald-steps-title">ALD 사이클 4단계</h2>' : '<h3 class="ald-steps-title">ALD 사이클 4단계</h3>') +
      '<p class="ald-steps-lede">네 단계가 막이 원하는 두께가 될 때까지 반복됩니다. 단계마다 켜지는 밸브와 배관만 하늘색으로 표시했습니다.</p>' +
      '<ol class="ald-steps-grid">' +
      STEPS.map((s, i) =>
        '<li class="ald-step">' + miniSvg(s) +
        '<p class="ald-step-name"><span>' + (i + 1) + "/4</span>" + s.name + "</p>" +
        '<p class="ald-step-desc">' + s.desc + "</p></li>").join("") +
      "</ol>";
  }

  // ---------------------------------------------------------------
  function mount(stageEl, handle) {
    if (!handle || !window.IsoRender || !window.gsap) return;
    const box = stageEl.querySelector(".ald-steps");
    let overlay = null, builtStill = false;
    // 정지 화면 ↔ 움직이는 화면 (설정이 바뀌면 stage.js가 .is-static을 바꿈)
    function update() {
      const still = stageEl.classList.contains("is-static");
      if (box) {
        if (still && !builtStill) { buildStill(stageEl, box); builtStill = true; }
        box.hidden = !still;
      }
      if (still && overlay) { overlay.destroy(); overlay = null; }
      if (!still && !overlay) overlay = buildOverlay(stageEl, handle);
    }
    update();
    new MutationObserver(update).observe(stageEl, { attributes: true, attributeFilter: ["class"] });
  }

  // ---------------------------------------------------------------
  // 3) 하위 페이지용 작은 사이클 그림 (equipment/ald/principle.html · flow.html)
  //    <div data-ald-mini></div> 를 두면: 작은 계통도 한 장이 네 단계를 차례로 보여 줌 + 아래 단계 이름·설명
  //    정지 화면(움직임 줄이기·?still=1·데이터 절약)이면 네 장을 나란히 (장비 페이지 정지 화면과 같은 그림)
  //    GSAP 없이 setTimeout만 씀 → 하위 페이지에서 GSAP를 안 불러도 됨. 화면 밖·탭 숨김이면 멈춤
  // ---------------------------------------------------------------
  function mini(box) {
    const still = window.MotionPref ? !!MotionPref.reason() : false;
    if (still) { buildStill(null, box); box.classList.add("is-still"); return; }
    box.innerHTML =
      '<figure class="ald-mini-fig"><div class="ald-mini-svg"></div>' +
      '<figcaption><ol class="ald-mini-steps">' +
      STEPS.map((s, i) => '<li data-i="' + i + '" tabindex="0" role="button"><span>' + (i + 1) + "/4</span>" + s.name + "</li>").join("") +
      '</ol><p class="ald-mini-desc" aria-live="off"></p></figcaption></figure>';
    const svgBox = box.querySelector(".ald-mini-svg"), desc = box.querySelector(".ald-mini-desc");
    const lis = [...box.querySelectorAll(".ald-mini-steps li")];
    let i = 0, timer = null, visible = true;
    function show(k) {
      i = k;
      svgBox.innerHTML = miniSvg(STEPS[k]);
      lis.forEach((li, j) => li.classList.toggle("is-on", j === k));
      desc.textContent = STEPS[k].desc;
    }
    function tick() { show((i + 1) % STEPS.length); timer = setTimeout(tick, STEPS[i].dur * 1000); }
    function sync() {
      const run = visible && !document.hidden;
      if (run && !timer) timer = setTimeout(tick, STEPS[i].dur * 1000);
      if (!run && timer) { clearTimeout(timer); timer = null; }
    }
    // 단계 이름을 누르면 그 단계로 (멈추지 않고 거기서부터 이어서 돎)
    lis.forEach((li, j) => {
      const go = () => { clearTimeout(timer); timer = null; show(j); sync(); };
      li.addEventListener("click", go);
      li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });   // 키보드로도
    });
    show(0);
    document.addEventListener("visibilitychange", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; sync(); }).observe(box);
    } else sync();
  }
  document.addEventListener("DOMContentLoaded", () => document.querySelectorAll("[data-ald-mini]").forEach(mini));

  window.AldCycle = { mount: mount, mini: mini };
})();
