// =============================================================
// ALD 공정 흐름: 밸브 시간표 (equipment/ald/flow.html 맨 앞 띠)
//
// 1) 웨이퍼 경로 평면도(js/figs/wafer-route.js, PECVD와 같은 공통 플랫폼)에 ALD 내용만 넘김
//    → 6번째 단계 "PM에서 ALD 사이클"을 길게, 설명을 ALD에 맞게
// 2) 웨이퍼가 공정 챔버에 있는 동안 가로 막대 시간표에서 재생선이 지나감
//    줄 = 전구체 / 퍼지 / 반응 기체 밸브, 칸이 칠해진 동안 그 밸브가 열림. 안정화 → 사이클 ×3 → …반복 → 마지막 퍼지
//    지금 칸 강조 + 짧은 설명이 바뀜. 챔버 밖이면 흐리게
// 수치·시간 눈금 없음 (칸 길이는 실제 시간 비율 아님)
// 정지 화면(움직임 줄이기·?still=1): 평면도는 단계별 정지 그림, 시간표는 전체 칸이 보이는 그림
// 순서: 이 파일을 wafer-route.js보다 먼저 불러야 첫 그림부터 맞춰짐 (HTML 맨 아래라 요소는 이미 있음)
// =============================================================
(function () {
  "use strict";

  // ---------- 1) 웨이퍼 경로에 넘길 ALD 내용 ----------
  window.WAFER_ROUTE_DATA = {
    steps: {
      5: { name: "PM에서 ALD 사이클", act: 8,
           cap: "슬릿 밸브를 닫고 가열·안정화한 뒤, 밸브가 번갈아 열리며 사이클을 반복합니다 (밸브 시간표)." },
      6: { cap: "마지막 퍼지로 남은 기체를 뺀 뒤, 진공 로봇이 웨이퍼를 TM으로 꺼냅니다." },
    },
  };
  const PM_STEP = 5;

  // ---------- 2) 시간표 칸 ----------
  const X0 = 100, WIDTH = 488;
  const ROWS = [
    { id: "prec",  name: "전구체",    y: 40 },
    { id: "purge", name: "퍼지",      y: 84 },
    { id: "react", name: "반응 기체", y: 128 },
  ];
  const BAR_H = 24;
  // 칸: w = 그림 폭(비율용), on = 열린 밸브, head = 위 머리글
  const SEGS = [{ key: "stab", w: 46, on: ["purge"], head: "안정화", cap: "가열·안정화 — 퍼지 가스만 흘려 웨이퍼 온도와 챔버 압력을 맞춥니다." }];
  for (let c = 1; c <= 3; c++) {
    SEGS.push(
      { key: "prec",   w: 28, on: ["prec"],  cycle: c, cap: `사이클 ${c} · 전구체 밸브 열림 — 전구체가 표면 빈자리에 붙습니다.` },
      { key: "purge1", w: 28, on: ["purge"], cycle: c, cap: `사이클 ${c} · 퍼지 — 붙지 않은 전구체를 몰아냅니다. 다른 두 밸브는 닫혀 있습니다.` },
      { key: "react",  w: 28, on: ["react"], cycle: c, cap: `사이클 ${c} · 반응 기체 밸브 열림 — 붙은 전구체와 반응해 막 한 층이 완성됩니다.` },
      { key: "purge2", w: 28, on: ["purge"], cycle: c, cap: `사이클 ${c} · 퍼지 — 남은 반응 기체와 부산물을 몰아냅니다.` });
  }
  SEGS.push({ key: "more",  w: 36, on: [], more: true, cap: "…원하는 두께가 될 때까지 같은 네 단계를 계속 반복합니다." });
  SEGS.push({ key: "final", w: 70, on: ["purge"], head: "마지막 퍼지", cap: "마지막 퍼지 — 남은 기체를 충분히 빼낸 뒤에야 슬릿 밸브를 엽니다." });
  let acc = X0;
  SEGS.forEach((s) => { s.x = acc; acc += s.w; });

  const CAP_BEFORE = "레시피 시작 전 — 웨이퍼가 공정 챔버에 들어오기를 기다립니다.";
  const CAP_AFTER = "레시피 끝 — 웨이퍼를 꺼내고 다음 웨이퍼를 받을 준비를 합니다.";
  const CAP_ALL = "레시피 전체 — 안정화 → 사이클 반복 → 마지막 퍼지. 칸이 칠해진 동안 그 밸브가 열립니다.";

  function chartSvg() {
    let s = `<svg viewBox="0 0 600 168" class="vt-svg" role="img" aria-label="밸브 시간표. 안정화 동안 퍼지만 켜지고, 사이클마다 전구체, 퍼지, 반응 기체, 퍼지 밸브가 차례로 하나씩 열리며, 끝에 마지막 퍼지가 길게 이어진다.">`;
    // 머리글 (안정화 · 사이클 1~3 · … · 마지막 퍼지)
    SEGS.forEach((g) => { if (g.head) s += `<text class="vt-head" x="${g.x + g.w / 2}" y="18">${g.head}</text>`; });
    for (let c = 1; c <= 3; c++) {
      const first = SEGS.find((g) => g.cycle === c);
      s += `<text class="vt-head" x="${first.x + 56}" y="18">사이클 ${c}</text>`;
      s += `<line class="vt-sep" x1="${first.x}" x2="${first.x}" y1="26" y2="158"/>`;
    }
    // 줄: 이름 + 바닥선 + 켜진 칸
    ROWS.forEach((r) => {
      s += `<text class="vt-row" data-vt-row="${r.id}" x="0" y="${r.y + BAR_H / 2 + 5}">${r.name}</text>`;
      s += `<line class="vt-base" x1="${X0}" x2="${X0 + WIDTH}" y1="${r.y + BAR_H}" y2="${r.y + BAR_H}"/>`;
      SEGS.forEach((g, n) => {
        if (g.more) s += `<rect class="vt-more" x="${g.x + 4}" y="${r.y + 6}" width="${g.w - 8}" height="${BAR_H - 6}" rx="3"/>`;
        else if (g.on.includes(r.id)) s += `<rect class="vt-on is-${r.id}" data-vt-seg="${n}" x="${g.x + 1}" y="${r.y}" width="${g.w - 2}" height="${BAR_H}" rx="3"/>`;
      });
    });
    s += `<line class="vt-play" x1="${X0}" x2="${X0}" y1="26" y2="160"/>`;
    return s + "</svg>";
  }

  function setup(box) {
    const route = box.closest("[data-wafer-route]") || document.querySelector("[data-wafer-route]");
    box.innerHTML = `<p class="vt-title">공정 챔버 안 밸브 시간표</p><div class="vt-chart">${chartSvg()}</div>` +
      `<p class="vt-cap" aria-live="polite"></p>` +
      `<p class="vt-note">칸 길이는 실제 시간 비율이 아닙니다. 장비에 따라 퍼지 가스를 계속 흘리면서 그 사이에 전구체·반응 기체를 짧게 끼워 넣기도 합니다 <span class="verify-tag">검증 필요</span>.</p>`;
    const play = box.querySelector(".vt-play"), cap = box.querySelector(".vt-cap");
    const segEls = [...box.querySelectorAll("[data-vt-seg]")];
    const rowEls = [...box.querySelectorAll("[data-vt-row]")];
    let lastKey = "";
    function show(d) {
      let q = -1, mode;                                            // q: 시간표 위 진행(0~1)
      if (d.i < PM_STEP || (d.i === PM_STEP && d.t < d.move)) mode = "before";
      else if (d.i > PM_STEP) mode = "after";
      else if (!d.playing) mode = "all";                          // 정지 그림에서 이 단계를 고름 → 전체를 한눈에
      else { mode = "run"; q = Math.max(0, Math.min(1, (d.t - d.move) / d.act)); }
      const x = X0 + Math.max(0, q) * WIDTH;
      let n = -1;
      if (mode === "run") { n = SEGS.findIndex((g) => x >= g.x && x < g.x + g.w); if (n < 0) n = SEGS.length - 1; }
      play.setAttribute("x1", x.toFixed(1)); play.setAttribute("x2", x.toFixed(1));
      const key = mode + n;
      if (key === lastKey) return;
      lastKey = key;
      box.classList.toggle("is-idle", mode === "before" || mode === "after");
      box.classList.toggle("is-run", mode === "run");
      segEls.forEach((el) => el.classList.toggle("is-now", +el.dataset.vtSeg === n));
      const on = n >= 0 ? SEGS[n].on : [];
      rowEls.forEach((el) => el.classList.toggle("is-on", on.includes(el.dataset.vtRow)));
      cap.textContent = mode === "before" ? CAP_BEFORE : mode === "after" ? CAP_AFTER : mode === "all" ? CAP_ALL : SEGS[n].cap;
    }
    show({ i: 0, t: 0, move: 0, act: 1, playing: true });
    if (route) route.addEventListener("wr:step", (e) => show(e.detail));
  }

  document.querySelectorAll("[data-valve-timeline]").forEach(setup);
})();
