// =============================================================
// 글 단계 ↔ 그림 단계 연결 (아임웹식 "한쪽 글이 지나가면 다른 쪽 그림이 바뀜")
//
// HTML 약속
//   <section data-scrolly>
//     <figure data-scene="pecvd" data-sim-control="external"> ... <canvas> ... </figure>
//     <ol> <li data-step="0">…</li> <li data-step="1">…</li> … </ol>
//   </section>
//   화면 가운데 띠를 지나는 글 단계(li)의 번호로 그림 단계를 바꿈 (api.setStage, js/sim/sim-core.js)
//   지금 단계 글에는 class="is-active" → CSS가 또렷하게 보여 줌
//   단계 번호 버튼([data-goto-step])을 누르면 그 글 단계로 스크롤
//
// 스크롤 계산은 IntersectionObserver만 씀 (GSAP 불필요, 휴대폰에서도 가벼움)
// sim-core.js 다음에 불러와야 함 (그림이 먼저 만들어져 있어야 단계를 바꿀 수 있음)
// =============================================================
(function () {
  "use strict";

  function setup(root) {
    const fig = root.querySelector("[data-scene]");
    const steps = Array.from(root.querySelectorAll("[data-step]"));
    const sim = (window.ProcessSim && ProcessSim.instances.find((s) => s.root === fig)) || null;
    if (!steps.length) return;

    let current = -1;
    function activate(i) {
      if (i === current) return;
      current = i;
      steps.forEach((el) => el.classList.toggle("is-active", +el.dataset.step === i));
      root.querySelectorAll("[data-goto-step]").forEach((b) => {
        const on = +b.dataset.gotoStep === i;
        b.classList.toggle("is-active", on);
        if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      if (sim) sim.setStage(i);
    }

    // 화면 세로 가운데 근처의 얇은 띠(위 45% ~ 아래 45%를 뺀 곳)에 들어온 단계를 지금 단계로
    //   휴대폰(900px 미만)은 그림이 화면 위쪽 절반을 덮으므로, 그 아래 보이는 곳(위에서 68~78%)을 기준으로
    if ("IntersectionObserver" in window) {
      const narrow = window.matchMedia("(max-width: 899px)").matches;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) activate(+en.target.dataset.step); });
      }, { rootMargin: narrow ? "-68% 0px -22% 0px" : "-45% 0px -45% 0px" });
      steps.forEach((el) => io.observe(el));
    }
    activate(0);

    // 단계 번호 버튼: 그 단계 글이 화면 가운데에 오게 스크롤
    root.querySelectorAll("[data-goto-step]").forEach((b) => {
      b.addEventListener("click", () => {
        const el = steps.find((s) => s.dataset.step === b.dataset.gotoStep);
        if (!el) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const r = el.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2, behavior: reduce ? "auto" : "smooth" });
        activate(+b.dataset.gotoStep);
      });
    });
  }

  // sim-core.js도 DOMContentLoaded에서 그림을 만듦 → 이 파일을 뒤에 불러오면 그다음에 실행됨
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-scrolly]").forEach(setup);
  });
})();
