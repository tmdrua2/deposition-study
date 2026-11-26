// =============================================================
// 스크롤 단계 체험 공용 엔진 (ALD 원리·공정 흐름·공정변수 페이지가 함께 씀)
//   원래 js/sim/ald-scrolly.js 안에 있던 "단계 전환 + 자동 반복 재생" 부분을 떼어 냄 (2026-11-26)
//
// 하는 일
//   · 왼쪽 단계 글(article[data-beat]) 중 화면 기준선(넓은 화면 55%, 휴대폰 72%)에 걸린 글이 "지금 단계"
//   · 지금 단계가 바뀌면: 글 강조 · 진행 점([data-sx-dots] li) · 사이드 노트([data-sx-note])를 바꾸고 그림을 처음부터
//   · 그림은 페이지가 준 draw(단계, 반복 시간)로 그림. 시간은 gsap.ticker로 더하고, 화면 밖·탭 숨김이면 멈춤
//   · 반복이 처음으로 돌아갈 때·단계가 바뀔 때 그림을 살짝 흐렸다 밝힘(툭 끊기지 않게)
//
// 쓰는 법
//   SxEngine.story(root, {
//     total: (b) => 초,                 // 단계 b 한 바퀴 시간
//     draw: (b, t) => {},               // 단계 b, 반복 시간 t(초)로 그림
//     onActivate: (b) => {},            // (선택) 단계가 바뀐 순간
//     lapSoften: (b) => true,           // (선택) 한 바퀴 돌 때 흐렸다 밝힐지
//     softEl: 요소                      // (선택) 흐렸다 밝힐 요소 (기본 [data-sx-svg])
//   })
//   SxEngine.isStill() → 정지 화면(움직임 줄이기·?still=1·데이터 절약·저사양)이면 true
// 의존: vendor/gsap/gsap.min.js, ScrollTrigger.min.js, js/motion-pref.js
// =============================================================
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const isStill = () => (window.MotionPref ? !!MotionPref.reason()
    : window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const mobile = () => window.matchMedia("(max-width: 899px)").matches;

  // 단계 안 <details class="sx-note"> 메모를 오른쪽 사이드 노트 칸에 옮겨 담음
  function showNote(noteEl, step, b) {
    const det = $(".sx-note", step);
    if (!noteEl || !det) return;
    noteEl.innerHTML = `<p class="sx-note-k">${b + 1}단계 옆 메모</p><h3>${$("summary", det).textContent.replace(/^메모:\s*/, "")}</h3>` +
      $(".sx-note-body", det).innerHTML;
    noteEl.classList.remove("is-in"); void noteEl.offsetWidth; noteEl.classList.add("is-in");
  }

  function story(root, o) {
    const steps = $$("[data-beat]", root);
    const dots = $$("[data-sx-dots] li", root);
    const noteEl = $("[data-sx-note]", root);
    const softEl = o.softEl || $("[data-sx-svg]", root);
    let cur = -1, loopT = 0, lastLap = 0;

    const soften = () => { if (softEl) gsap.fromTo(softEl, { opacity: 0.25 }, { opacity: 1, duration: 0.45, ease: "power1.out", overwrite: true }); };

    // ---- 시계: 보이는 동안만 시간을 더함 ----
    function tick(time, deltaTime) {
      const dt = Math.min(deltaTime, 100) / 1000;        // 탭 복귀 직후 큰 점프 막기
      loopT += dt;
      const lap = Math.floor(loopT / o.total(cur));
      if (lap !== lastLap) { lastLap = lap; if (!o.lapSoften || o.lapSoften(cur)) soften(); }
      o.draw(cur, loopT % o.total(cur));
    }
    let onScreen = true, ticking = false;
    function sync() {
      const want = onScreen && !document.hidden;
      if (want && !ticking) { gsap.ticker.add(tick); ticking = true; }
      else if (!want && ticking) { gsap.ticker.remove(tick); ticking = false; }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { onScreen = en[en.length - 1].isIntersecting; sync(); }).observe($(".sx-stage", root) || root);
    }
    document.addEventListener("visibilitychange", sync);

    // ---- 단계 바꾸기 ----
    function activate(b) {
      if (b === cur) return;
      cur = b; loopT = 0; lastLap = 0;
      steps.forEach((st, n) => st.classList.toggle("is-on", n === b));
      dots.forEach((li, n) => { li.classList.toggle("is-done", n < b); li.classList.toggle("is-on", n === b); });
      showNote(noteEl, steps[b], b);
      if (o.onActivate) o.onActivate(b);
      soften();
      o.draw(b, 0);
    }

    // ---- 스크롤: 단계 글이 기준선을 지나는 동안 그 단계가 켜짐 ----
    gsap.registerPlugin(ScrollTrigger);
    const line = () => (mobile() ? "72%" : "55%");
    steps.forEach((st, n) => {
      ScrollTrigger.create({
        trigger: st, start: () => "top " + line(), end: () => "bottom " + line(),
        onToggle: (self) => { if (self.isActive) activate(n); }
      });
    });
    // 처음: 이미 지나간 단계가 있으면 그 단계(새로고침 위치), 아니면 1단계
    const y = window.innerHeight * (parseFloat(line()) / 100);
    let start = 0;
    steps.forEach((st, n) => { if (st.getBoundingClientRect().top < y) start = n; });
    activate(start);
    sync();
    return { activate };
  }

  // 정지 화면 공통: 단계마다 그림 칸을 글 제목 위에 넣고 메모를 펼침. make(step, b, fig)가 그림을 채움
  function still(root, make) {
    root.classList.add("is-still");
    $$("[data-beat]", root).forEach((st, b) => {
      const fig = document.createElement("figure");
      fig.className = "sx-still-fig";
      st.insertBefore(fig, $("h3", st));
      make(st, b, fig);
      const det = $(".sx-note", st);
      if (det) det.open = true;
    });
  }

  window.SxEngine = { $, $$, isStill, mobile, story, still };
})();
