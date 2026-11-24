// =============================================================
// 면접 질문 연습 모드 (equipment/pecvd/interview.html)
//
// 질문은 직접 쓰지 않고 데이터에서 모은다 (js/figs/collect.js → 부품 패널의 interview)
//   - 연습 카드: 질문 → (선택) 30초 생각하기 → 모범 답변 보기 → 다음 질문
//   - 걸러 보기: 모듈별 / CS 질문만 / 표시(다시 볼 것 · 아직 안 함)
//   - 스스로 표시: "답했음 / 다시 볼 것" → 이 브라우저에 저장(localStorage). 저장이 막힌 환경이면 조용히 무시
//   - 각 질문에 원래 부품 패널로 가는 링크
//   - 아래 [data-iv-list]에는 전체 목록을 details로 (summary = 질문, 본문 = 답변)
// 움직임 줄이기·?still=1 → 카드 넘김 효과·타이머 막대 전환 없음 (숫자만 줄어듦)
// =============================================================
(function () {
  "use strict";

  const root = document.querySelector("[data-interview]");
  if (!root || !window.SiteCollect) return;
  const equip = root.dataset.equip || "pecvd";
  const C = SiteCollect.make(equip);
  if (!C) return;

  const ALL = C.questions();
  const THINK = 30;                                   // 생각하기 시간(초)
  const STORE = `deposition:interview:${equip}`;      // 저장 이름

  // 정지 화면 판정 (공용 motion-pref.js가 없으면 직접)
  let calm = false;
  try {
    calm = new URLSearchParams(location.search).get("still") === "1" ||
      !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { /* 무시 */ }
  if (calm) root.classList.add("is-still");

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 표시 저장 (안 되면 메모리에만) ----------
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { marks = {}; }
  function saveMarks() { try { localStorage.setItem(STORE, JSON.stringify(marks)); } catch (e) { /* 저장 안 되는 환경: 무시 */ } }
  function setMark(key, val) {
    if (marks[key] === val) delete marks[key]; else marks[key] = val;   // 같은 것을 다시 누르면 해제
    saveMarks();
  }

  // ---------- 숫자 채우기 (들어가며 문단) ----------
  document.querySelectorAll("[data-iv-total]").forEach(el => { el.textContent = ALL.length; });
  document.querySelectorAll("[data-iv-cs]").forEach(el => { el.textContent = ALL.filter(q => q.cs).length; });

  // ---------- 상태 ----------
  const st = { module: "all", cs: false, mark: "all", shuffle: false, pos: 0, open: false };
  let deck = [];
  let order = ALL.map((_, i) => i);

  // ---------- 틀 만들기 ----------
  const mods = C.modules.filter(m => (m.part.interview || []).length);
  const count = id => ALL.filter(q => q.module === id).length;
  root.insertAdjacentHTML("beforeend", `
    <div class="iv-filters">
      <div class="iv-filter-row">
        <p class="iv-filter-title" id="iv-f-mod">모듈</p>
        <div class="iv-chips" role="group" aria-labelledby="iv-f-mod">
          <button type="button" data-mod="all" aria-pressed="true">전체 <span class="iv-n">${ALL.length}</span></button>
          ${mods.map(m => `<button type="button" data-mod="${esc(m.id)}" aria-pressed="false" title="${esc(m.name)}">${esc(m.tag.replace(/^\d+ /, ""))}<span class="iv-chip-ko">${esc(m.name.replace(/ \(.*\)$/, ""))}</span> <span class="iv-n">${count(m.id)}</span></button>`).join("")}
        </div>
      </div>
      <div class="iv-filter-row is-inline">
        <button type="button" class="iv-toggle" data-cs aria-pressed="false"><span class="iv-cs-badge">CS</span> CS 질문만</button>
        <div class="iv-seg" role="group" aria-label="스스로 표시로 거르기">
          <button type="button" data-markf="all" aria-pressed="true">모두</button>
          <button type="button" data-markf="review" aria-pressed="false">다시 볼 것</button>
          <button type="button" data-markf="none" aria-pressed="false">아직 안 함</button>
        </div>
        <button type="button" class="iv-toggle" data-shuffle aria-pressed="false">섞기</button>
      </div>
    </div>

    <div class="iv-progress" aria-live="polite">
      <div class="iv-progress-bar" aria-hidden="true"><i class="is-done"></i><i class="is-review"></i></div>
      <p class="iv-progress-text"></p>
    </div>

    <article class="iv-card" aria-live="polite">
      <div class="iv-card-top">
        <a class="iv-from" href="#"></a>
        <span class="iv-cs-badge is-card" hidden>CS 관점</span>
        <span class="iv-pos"></span>
      </div>
      <h3 class="iv-q"></h3>

      <div class="iv-actions">
        <button type="button" class="iv-btn" data-think><span class="iv-btn-ico" aria-hidden="true">◷</span> <span class="iv-think-label">${THINK}초 생각하기</span></button>
        <button type="button" class="iv-btn is-primary" data-reveal aria-expanded="false" aria-controls="iv-answer">모범 답변 보기</button>
      </div>
      <div class="iv-timer" hidden>
        <div class="iv-timer-track" aria-hidden="true"><i></i></div>
        <p class="iv-timer-text" role="status"></p>
      </div>

      <div class="iv-answer" id="iv-answer" hidden>
        <p class="iv-answer-label">모범 답변 <span>· 30초 분량</span></p>
        <p class="iv-a"></p>
        <a class="iv-panel-link" href="#">원래 패널에서 자세히 보기 →</a>
      </div>

      <div class="iv-bottom">
        <div class="iv-marks" role="group" aria-label="스스로 표시">
          <button type="button" data-mark="done" aria-pressed="false"><span aria-hidden="true">✓</span> 답했음</button>
          <button type="button" data-mark="review" aria-pressed="false"><span aria-hidden="true">↺</span> 다시 볼 것</button>
        </div>
        <div class="iv-nav">
          <button type="button" class="iv-btn" data-prev aria-label="이전 질문">←<span class="iv-nav-word"> 이전</span></button>
          <button type="button" class="iv-btn is-next" data-next aria-label="다음 질문"><span class="iv-nav-word">다음 </span>→</button>
        </div>
      </div>
      <p class="iv-empty" hidden>조건에 맞는 질문이 없습니다. 위에서 거르기를 바꿔 보세요.</p>
    </article>`);

  const $ = s => root.querySelector(s);
  const card = $(".iv-card");
  const timerBox = $(".iv-timer"), timerFill = $(".iv-timer-track i"), timerText = $(".iv-timer-text");
  const thinkBtn = $("[data-think]"), thinkLabel = $(".iv-think-label");
  const revealBtn = $("[data-reveal]"), answer = $(".iv-answer");

  // ---------- 거르기 → 카드 묶음 ----------
  function shuffled(n) {
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function rebuild(keepKey) {
    deck = order.map(i => ALL[i]).filter(q =>
      (st.module === "all" || q.module === st.module) &&
      (!st.cs || q.cs) &&
      (st.mark === "all" || (st.mark === "review" ? marks[q.key] === "review" : !marks[q.key])));
    const at = keepKey ? deck.findIndex(q => q.key === keepKey) : -1;
    st.pos = at >= 0 ? at : 0;
    show(false);
  }

  // ---------- 카드 보여 주기 ----------
  function show(animate) {
    stopTimer(true);
    st.open = false;
    const q = deck[st.pos];
    const empty = !q;
    card.classList.toggle("is-empty", empty);
    $(".iv-empty").hidden = !empty;
    if (!empty) {
      $(".iv-from").innerHTML = `<span class="iv-from-tag">${esc(q.from.tag)}</span>${esc(q.from.name)}`;
      $(".iv-from").href = q.from.href;
      $(".iv-cs-badge.is-card").hidden = !q.cs;
      $(".iv-pos").textContent = `${String(st.pos + 1).padStart(2, "0")} / ${String(deck.length).padStart(2, "0")}`;
      $(".iv-q").textContent = q.q;
      $(".iv-a").textContent = q.a;
      $(".iv-panel-link").href = q.from.href;
      $(".iv-panel-link").textContent = `${q.from.name} 패널에서 자세히 보기 →`;
    }
    answer.hidden = true;
    revealBtn.setAttribute("aria-expanded", "false");
    revealBtn.textContent = "모범 답변 보기";
    syncMarks();
    $("[data-prev]").disabled = empty || st.pos === 0;
    $("[data-next]").disabled = empty || st.pos >= deck.length - 1;
    if (animate && !calm) {                               // 카드 넘김: 살짝 올라오며 나타남 (transform·opacity만)
      card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in");
    }
    progress();
  }

  function syncMarks() {
    const q = deck[st.pos];
    root.querySelectorAll("[data-mark]").forEach(b => {
      b.setAttribute("aria-pressed", q && marks[q.key] === b.dataset.mark ? "true" : "false");
      b.disabled = !q;
    });
  }

  function progress() {
    const inScope = ALL.filter(q => (st.module === "all" || q.module === st.module) && (!st.cs || q.cs));
    const done = inScope.filter(q => marks[q.key] === "done").length;
    const review = inScope.filter(q => marks[q.key] === "review").length;
    const n = inScope.length || 1;
    $(".iv-progress-bar .is-done").style.transform = `scaleX(${done / n})`;
    const rv = $(".iv-progress-bar .is-review");
    rv.style.left = `${(done / n) * 100}%`;
    rv.style.transform = `scaleX(${review / n})`;
    $(".iv-progress-text").innerHTML =
      `<span class="is-done">답했음 ${done}</span><span class="is-review">다시 볼 것 ${review}</span><span>아직 ${inScope.length - done - review}</span><span class="iv-scope">${st.module === "all" ? "전체" : esc(C.modules.find(m => m.id === st.module).name)}${st.cs ? " · CS만" : ""} ${inScope.length}개 기준</span>`;
    syncList();
  }

  // ---------- 30초 생각하기 ----------
  let timer = null, t0 = 0;
  function stopTimer(reset) {
    if (timer) { clearInterval(timer); timer = null; }
    thinkBtn.setAttribute("aria-pressed", "false");
    thinkLabel.textContent = `${THINK}초 생각하기`;
    if (reset) { timerBox.hidden = true; timerFill.style.transform = "scaleX(1)"; root.classList.remove("is-thinking"); }
  }
  function tick() {
    const left = Math.max(0, THINK - (Date.now() - t0) / 1000);
    timerFill.style.transform = `scaleX(${left / THINK})`;
    const sec = Math.ceil(left);
    if (left <= 0) {
      stopTimer(false);
      root.classList.remove("is-thinking");
      timerText.textContent = "시간이 됐습니다 — 소리 내어 답해 본 뒤 모범 답변과 비교해 보세요.";
      return;
    }
    // 화면 읽기 프로그램이 매초 읽지 않도록, 10초 단위로만 글을 바꾼다 (숫자는 버튼에 표시)
    thinkLabel.textContent = `${sec}초 · 멈추기`;
    if (sec === THINK || sec % 10 === 0) timerText.textContent = `생각하는 중 — ${sec}초 남음`;
  }
  thinkBtn.addEventListener("click", () => {
    if (timer) { stopTimer(true); return; }
    t0 = Date.now();
    timerBox.hidden = false;
    timerFill.style.transition = "none";
    timerFill.style.transform = "scaleX(1)";
    void timerFill.offsetWidth;
    timerFill.style.transition = "";
    thinkBtn.setAttribute("aria-pressed", "true");
    root.classList.add("is-thinking");
    tick();
    timer = setInterval(tick, 250);
  });

  // ---------- 답변 펼치기 ----------
  revealBtn.addEventListener("click", () => {
    st.open = !st.open;
    answer.hidden = !st.open;
    revealBtn.setAttribute("aria-expanded", String(st.open));
    revealBtn.textContent = st.open ? "답변 접기" : "모범 답변 보기";
    if (st.open) stopTimer(false);
  });

  // ---------- 넘기기 ----------
  function go(d) {
    const n = st.pos + d;
    if (n < 0 || n >= deck.length) return;
    st.pos = n;
    show(true);
  }
  $("[data-prev]").addEventListener("click", () => go(-1));
  $("[data-next]").addEventListener("click", () => go(1));
  document.addEventListener("keydown", e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.body.classList.contains("menu-open")) return;      // 메뉴가 열려 있으면 무시
    const r = root.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;                            // 연습 카드가 화면에 있을 때만
    if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
  });

  // ---------- 스스로 표시 ----------
  root.querySelectorAll("[data-mark]").forEach(b => b.addEventListener("click", () => {
    const q = deck[st.pos];
    if (!q) return;
    setMark(q.key, b.dataset.mark);
    syncMarks();
    progress();
  }));

  // ---------- 거르기 버튼 ----------
  root.addEventListener("click", e => {
    const mb = e.target.closest("[data-mod]");
    if (mb) {
      st.module = mb.dataset.mod;
      root.querySelectorAll("[data-mod]").forEach(b => b.setAttribute("aria-pressed", String(b === mb)));
      rebuild();
      return;
    }
    const fb = e.target.closest("[data-markf]");
    if (fb) {
      st.mark = fb.dataset.markf;
      root.querySelectorAll("[data-markf]").forEach(b => b.setAttribute("aria-pressed", String(b === fb)));
      rebuild();
      return;
    }
    if (e.target.closest("[data-cs]")) {
      st.cs = !st.cs;
      $("[data-cs]").setAttribute("aria-pressed", String(st.cs));
      rebuild();
      return;
    }
    if (e.target.closest("[data-shuffle]")) {
      st.shuffle = !st.shuffle;
      $("[data-shuffle]").setAttribute("aria-pressed", String(st.shuffle));
      order = st.shuffle ? shuffled(ALL.length) : ALL.map((_, i) => i);
      rebuild();
    }
  });

  // ---------- 전체 목록 (details) ----------
  const list = document.querySelector("[data-iv-list]");
  function buildList() {
    if (!list) return;
    const groups = C.modules.filter(m => ALL.some(q => q.module === m.id));
    // 하위 페이지 질문(있으면) 묶음
    const extra = [...new Set(ALL.filter(q => !C.modules.some(m => m.id === q.module)).map(q => q.module))];
    const blocks = groups.map(m => ({ id: m.id, tag: m.tag, name: m.name, href: m.href }))
      .concat(extra.map(id => { const f = ALL.find(q => q.module === id).from; return { id, tag: f.tag, name: f.name, href: f.href }; }));
    list.innerHTML = blocks.map(b => `
      <section class="iv-group" aria-labelledby="ivg-${esc(b.id)}">
        <h3 class="iv-group-title" id="ivg-${esc(b.id)}"><span class="iv-group-tag">${esc(b.tag)}</span> ${esc(b.name)}
          <a class="iv-group-link" href="${esc(b.href)}">패널 열기 →</a></h3>
        ${ALL.filter(q => q.module === b.id).map(q => `
          <details data-key="${esc(q.key)}">
            <summary>${q.cs ? '<span class="iv-cs-badge">CS</span> ' : ""}<span class="iv-sum-q">${esc(q.q)}</span><span class="iv-mark-dot" aria-hidden="true"></span><span class="iv-mark-word sr-only"></span></summary>
            <p>${esc(q.a)}</p>
          </details>`).join("")}
      </section>`).join("");
    syncList();
  }
  function syncList() {
    if (!list) return;
    list.querySelectorAll("details[data-key]").forEach(d => {
      const m = marks[d.dataset.key] || "";
      d.dataset.mark = m;
      const w = d.querySelector(".iv-mark-word");
      if (w) w.textContent = m === "done" ? " (답했음)" : m === "review" ? " (다시 볼 것)" : "";
    });
  }

  buildList();
  rebuild();
})();
