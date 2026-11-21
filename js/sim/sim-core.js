// =============================================================
// 공정 모션 공용 엔진 (모든 공정 페이지가 같이 씀)
//  - 캔버스 크기 맞추기 (화면이 선명하도록 화면 밀도 반영, 최대 2배)
//  - 반복 재생, 일시정지 버튼, 현재 단계 이름 표시
//  - "움직임 줄이기" 설정, 데이터 절약 모드, 느린 기기 → 정지 화면
//  - 첫 화면이 안 보이거나 브라우저 탭이 숨으면 자동으로 멈춤 (배터리 절약)
//
// 사용법
//  1) HTML: <section data-scene="pvd"> 안에 <canvas>, [data-sim-stage], [data-sim-pause], [data-sim-note]
//  2) 장면 파일(js/sim/pvd.js)에서 ProcessSim.register("pvd", 장면) 으로 등록
//
// 장면(scene)이 가져야 하는 것
//  stages : [{ name: "진공 배기", duration: 초 }, ...]   공정 단계 (순서대로 반복)
//  create(random)            → 입자 등 처음 상태를 만들어 돌려줌
//  update(state, dt, stage)  → (선택) dt초만큼 움직임. 없으면 정지 화면만 그림
//  draw(ctx, state, view)    → 그리기. view = { w, h, stage, still, colors }
//  stillTime                 : 정지 화면에 보여줄 시점(초) — 보통 증착 단계 한가운데
// =============================================================
(function () {
  "use strict";

  const scenes = {};
  const instances = [];

  // 매번 같은 순서로 나오는 난수 → 정지 화면이 항상 똑같이 보임
  function makeRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 색은 css/style.css의 :root 변수에서 읽어 옴 (색을 JS에 직접 쓰지 않기 위해)
  function readColors(el) {
    const cs = getComputedStyle(el);
    const v = (name) => cs.getPropertyValue(name).trim();
    return {
      bg: v("--hero-bg"),
      line: v("--hero-line"),
      lineStrong: v("--hero-line-strong"),
      text: v("--hero-text"),
      muted: v("--hero-muted"),
      accent: v("--accent"),
      ar: v("--sim-ar"),
      electron: v("--sim-electron"),
      metal: v("--sim-metal"),
      sheath: v("--sim-sheath"),
    };
  }

  function start(root) {
    const scene = scenes[root.dataset.scene];
    const canvas = root.querySelector("canvas");
    if (!scene || !canvas) return null;

    const ctx = canvas.getContext("2d");
    const stageEl = root.querySelector("[data-sim-stage]");
    const pauseBtn = root.querySelector("[data-sim-pause]");
    const noteEl = root.querySelector("[data-sim-note]");

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const canAnimate = typeof scene.update === "function";
    const total = scene.stages.reduce((sum, s) => sum + s.duration, 0);

    let w = 0, h = 0;
    let colors = readColors(root);
    let state = scene.create(makeRandom(7));
    let time = 0;              // 반복 안에서 지난 시간(초)
    let mode = (reduceMq.matches || saveData || !canAnimate) ? "still" : "play";
    let userPaused = false;
    let onScreen = true;
    let raf = 0, last = 0;
    let slowFrames = 0, countedFrames = 0; // 느린 기기 감지용

    // 시간 → 지금 몇 번째 단계인지, 그 단계가 얼마나 진행됐는지(0~1)
    function stageAt(t) {
      let x = ((t % total) + total) % total;
      for (let i = 0; i < scene.stages.length; i++) {
        const d = scene.stages[i].duration;
        if (x < d) return { index: i, progress: x / d, name: scene.stages[i].name, count: scene.stages.length };
        x -= d;
      }
      const lastI = scene.stages.length - 1;
      return { index: lastI, progress: 1, name: scene.stages[lastI].name, count: scene.stages.length };
    }

    function showStage(stage) {
      if (!stageEl) return;
      const text = `${stage.index + 1}/${stage.count} ${stage.name}`;
      if (stageEl.dataset.text !== text) {
        stageEl.dataset.text = text;
        stageEl.innerHTML = `<span class="sim-stage-num">${stage.index + 1}/${stage.count}</span> ${stage.name}`;
      }
    }

    function render(stage, still) {
      ctx.clearRect(0, 0, w, h);
      scene.draw(ctx, state, { w, h, stage, still, colors });
      showStage(stage);
    }

    // 정지 화면: 처음 상태에서 stillTime까지 일정한 간격으로 미리 돌린 뒤 한 번만 그림
    function drawStill() {
      const t = scene.stillTime || 0;
      state = scene.create(makeRandom(7));
      if (canAnimate) {
        const step = 1 / 60;
        for (let s = 0; s < t; s += step) scene.update(state, step, stageAt(s));
      }
      render(stageAt(t), true);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mode === "still") drawStill();
      else render(stageAt(time), false);
    }

    function shouldRun() {
      return mode === "play" && !userPaused && onScreen && !document.hidden;
    }

    function frame(now) {
      raf = 0;
      if (!shouldRun()) return;
      let dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (dt > 0.25) dt = 0; // 탭을 오래 비웠다 돌아온 경우: 한꺼번에 튀지 않게

      // 느린 기기 감지: 처음 몇 초 동안 프레임이 자주 느리면 정지 화면으로 바꿈
      if (dt > 0 && countedFrames < 240) {
        countedFrames++;
        if (dt > 1 / 28) slowFrames++;
        if (countedFrames === 240 && slowFrames / countedFrames > 0.6) {
          mode = "still";
          if (noteEl) noteEl.textContent = "기기 성능에 맞춰 정지 화면으로 바꿨습니다. 재생 버튼으로 다시 볼 수 있습니다.";
          updateButton();
          drawStill();
          return;
        }
      }

      const step = Math.min(dt, 1 / 30);
      time += step;
      const stage = stageAt(time);
      scene.update(state, step, stage);
      if (time >= total) time -= total;
      render(stage, false);
      raf = requestAnimationFrame(frame);
    }

    function kick() {
      if (!raf && shouldRun()) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    function updateButton() {
      if (!pauseBtn) return;
      if (!canAnimate) { pauseBtn.hidden = true; return; }
      const playing = mode === "play" && !userPaused;
      pauseBtn.textContent = playing ? "일시정지" : "재생";
      pauseBtn.setAttribute("aria-pressed", String(!playing));
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        if (mode === "still") {
          // 정지 화면에서 사용자가 직접 재생을 누르면 그때부터 움직임
          mode = "play";
          userPaused = false;
          countedFrames = 240; // 직접 고른 것이니 느린 기기 자동 정지는 다시 하지 않음
          state = scene.create(makeRandom(7));
          time = 0;
          if (noteEl) noteEl.textContent = "";
        } else {
          userPaused = !userPaused;
        }
        updateButton();
        kick();
      });
    }

    reduceMq.addEventListener && reduceMq.addEventListener("change", (e) => {
      if (e.matches) { mode = "still"; drawStill(); }
      updateButton();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        kick();
      }).observe(root);
    }
    document.addEventListener("visibilitychange", kick);

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    resize();
    // Pretendard 글꼴이 늦게 도착하면 이름표 글자가 다른 글꼴로 그려지므로, 도착 후 한 번 더 그림
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    updateButton();
    kick();

    const api = {
      root,
      // 다른 스크립트(스크롤 전환 등)에서 쓸 수 있게
      pause() { userPaused = true; updateButton(); },
      play() { userPaused = false; updateButton(); kick(); },
      isStill() { return mode === "still"; },
    };
    instances.push(api);
    return api;
  }

  window.ProcessSim = {
    register(name, scene) { scenes[name] = scene; },
    instances,
  };

  // 모든 스크립트를 읽은 뒤(장면 등록이 끝난 뒤) 시작
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-scene]").forEach(start);
  });
})();
