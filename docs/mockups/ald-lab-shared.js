// =============================================================
// ALD 시안 공용 — 기존 표면 시뮬레이션(js/sim/ald-surface.js)을 "리모컨"처럼 조종하는 도우미
//
// ald-surface.js는 고치지 않는다. 그 파일이 만드는 버튼(재생·단계·퍼지 부족)을 숨겨 두고,
// 시안 쪽 버튼이 그 숨은 버튼을 대신 눌러서 원하는 장면을 보여 준다.
//   AldSurf(요소).show(i)        : i단계가 끝난 정지 그림
//   AldSurf(요소).playStep(i)     : i단계만 재생하고 끝 모습에서 멈춤 (Promise)
//   AldSurf(요소).playPartial(n)  : 1단계(전구체)를 재생하다 빈자리가 n개 찼을 때 멈춤 → 포화 전
//   AldSurf(요소).playCycles(n)   : 사이클을 n번 더 돌고 4단계 끝에서 멈춤
//   AldSurf(요소).loop() / stop() : 계속 재생 / 멈춤
//   AldSurf(요소).setBad(true)    : 퍼지 부족 모드
// 정지 화면(움직임 줄이기·?still=1)이면 재생 없이 끝 모습만 바로 그림
// =============================================================
(function () {
  "use strict";

  const stillMode = () => (window.MotionPref ? !!MotionPref.reason()
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function AldSurf(root) {
    const q = (s) => root.querySelector(s);
    const playBtn = q("[data-asf-play]"), badBtn = q("[data-asf-bad]");
    const stageEl = q("[data-asf-stage]"), descEl = q("[data-asf-desc]");
    const prevBtn = q("[data-asf-prev]"), nextBtn = q("[data-asf-next]");
    const stepBtns = [...root.querySelectorAll("[data-asf-step]")];
    let watcher = null, pending = null;

    const playing = () => playBtn.getAttribute("aria-pressed") === "false";   // ald-surface: 재생 중이면 false
    const curStep = () => {
      const m = (stageEl.textContent || "").match(/(\d)\/4/);
      return m ? +m[1] - 1 : 0;
    };
    // 글자(단계 이름·설명)가 바뀔 때마다 fn 실행 — 그림 속성 변화는 안 봄(가벼움)
    function watch(fn) {
      unwatch();
      watcher = new MutationObserver(fn);
      watcher.observe(root, { subtree: true, childList: true, characterData: true });
    }
    function unwatch() { if (watcher) { watcher.disconnect(); watcher = null; } }
    function finish() { const r = pending; pending = null; if (r) r(); }

    function stop() { unwatch(); if (playing()) playBtn.click(); finish(); }
    function show(i) { stop(); stepBtns[i].click(); }          // 멈춘 상태에서 단계 버튼 = 그 단계 끝 그림
    function setBad(v) {
      const now = badBtn.getAttribute("aria-pressed") === "true";
      if (now !== v) { stop(); badBtn.click(); stop(); }       // 누르면 처음(사이클 1)부터 다시 그림
    }
    function isBad() { return badBtn.getAttribute("aria-pressed") === "true"; }

    // i단계만 재생 → 다음 단계로 넘어가는 순간 멈추고 i단계 끝 그림으로 되돌림
    function playStep(i) {
      return new Promise((res) => {
        show(i);
        if (stillMode()) { res(); return; }
        pending = res;
        playBtn.click();                                       // 끝 그림에서 재생 = 그 단계 처음부터
        watch(() => {
          if (curStep() === i) return;
          unwatch();
          if (playing()) playBtn.click();
          if (i === 3) prevBtn.click(); else stepBtns[i].click();   // 4단계는 사이클이 넘어가므로 ◀로 되돌림
          finish();
        });
      });
    }

    // 전구체 단계를 재생하다가 "채워진 자리 n/12"가 되면 멈춤
    function playPartial(n) {
      return new Promise((res) => {
        show(0);
        if (stillMode()) { res(); return; }   // 정지 화면에서는 포화 전 그림을 만들 수 없어 끝 그림 그대로
        pending = res;
        playBtn.click();
        watch(() => {
          const m = (descEl.textContent || "").match(/(\d+)\/12/);
          if ((m && +m[1] >= n) || curStep() !== 0) { unwatch(); if (playing()) playBtn.click(); finish(); }
        });
      });
    }

    // 지금(4단계 끝)에서 사이클 n번 더
    function playCycles(n) {
      return new Promise((res) => {
        stop();
        if (stillMode()) {
          for (let k = 0; k < n; k++) { nextBtn.click(); stepBtns[3].click(); }
          res(); return;
        }
        nextBtn.click();                                       // 다음 사이클 1단계
        pending = res;
        playBtn.click();
        let count = 0, last = 0;
        watch(() => {
          const c = curStep();
          if (last === 3 && c === 0) {
            count++;
            if (count >= n) { unwatch(); if (playing()) playBtn.click(); prevBtn.click(); finish(); return; }
          }
          last = c;
        });
      });
    }

    function loop() { unwatch(); finish(); if (stillMode()) { show(3); return; } if (!playing()) playBtn.click(); }

    return { show, playStep, playPartial, playCycles, loop, stop, setBad, isBad, still: stillMode };
  }

  window.AldSurf = AldSurf;
  window.aldStill = stillMode;
})();
