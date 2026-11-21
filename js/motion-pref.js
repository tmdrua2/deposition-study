// =============================================================
// 움직임 판정 (공용) — "애니메이션 대신 정지 화면을 보여 줄까?"
//
// 정지 화면이 되는 경우
//   1) 움직임 줄이기 설정 (prefers-reduced-motion)          → reason "reduce"
//   2) 데이터 절약 모드 (navigator.connection.saveData,
//      prefers-reduced-data)                                  → reason "save-data"
//   3) 저사양 기기: 메모리 2GB 이하 또는 CPU 코어 2개 이하
//      (브라우저가 이 값을 알려 줄 때만 판정, 모르면 저사양으로 보지 않음) → reason "low-end"
//
// 주소로 바꾸기 (검사·선택용)
//   ?still=1  → 위 조건과 관계없이 정지 화면 (reason "forced")
//   ?motion=1 → 2)·3)이어도 애니메이션 (정지 화면의 "분해 애니메이션 보기" 버튼이 이 주소로 다시 염)
//               단, 1) 움직임 줄이기 설정은 사용자의 운영체제 설정이므로 항상 따름
//
// 사용: MotionPref.liteReason() → "save-data" | "low-end" | "forced" | null  (움직임 줄이기는 따로 matchMedia로)
//       MotionPref.reason()     → 위 + "reduce"
//       MotionPref.animateUrl() → "분해 애니메이션 보기" 버튼이 열 주소
// 쓰는 곳: js/explode/stage.js (장비 분해 무대), js/sim/sim-core.js (공정 모션)
// =============================================================
(function () {
  "use strict";

  const LOW_MEMORY_GB = 2;   // 이 값 이하면 저사양
  const LOW_CORES = 2;       // 이 값 이하면 저사양

  function param(name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  }
  const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

  function saveData() {
    const c = navigator.connection;
    return !!(c && c.saveData) || mq("(prefers-reduced-data: reduce)");
  }
  function lowEnd() {
    const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
    return (typeof mem === "number" && mem > 0 && mem <= LOW_MEMORY_GB) ||
      (typeof cores === "number" && cores > 0 && cores <= LOW_CORES);
  }

  // 움직임 줄이기 말고 "가볍게 보여 줄" 이유
  function liteReason() {
    if (param("still") === "1") return "forced";
    if (param("motion") === "1") return null;
    if (saveData()) return "save-data";
    if (lowEnd()) return "low-end";
    return null;
  }
  function reason() {
    return mq("(prefers-reduced-motion: reduce)") ? "reduce" : liteReason();
  }
  // 지금 주소에서 still은 빼고 motion=1을 넣은 주소 (#part= 같은 해시는 그대로)
  function animateUrl() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("still");
      u.searchParams.set("motion", "1");
      return u.href;
    } catch (e) { return "?motion=1"; }
  }

  window.MotionPref = { reason: reason, liteReason: liteReason, animateUrl: animateUrl };
})();
