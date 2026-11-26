// =============================================================
// 면접 카드 연습 (equipment/<장비>/interview.html 표준 형식 — 처음 적용: ALD)
//
// 질문은 직접 쓰지 않고 부품 패널에서 모은다 (js/figs/collect.js → 패널의 interview: { cat, cs, q, a })
//   cat = 원리 · 장비 · 공정 · CS  (없으면 CS 질문은 "CS", 나머지는 "장비" — 공통 플랫폼 모듈 질문)
//
// [data-cards data-equip="ald"]
//   · 카드: 앞면 = 분류 + 질문 → 누르면(또는 스페이스) 뒤집혀 답변 + 원래 패널 링크
//   · 표시: "다시 볼 것 / 알겠음" → 이 브라우저에 저장(localStorage, 막힌 환경이면 메모리에만)
//   · 걸러 보기: 분류 칩, "이 장비 질문만"(공통 플랫폼 빼기), "다시 볼 것만", "섞기"
//   · 키보드: ← → 넘기기, 스페이스 뒤집기 (카드에 초점이 있을 때)
// [data-cards-list] 전체 목록: 분류별 details (summary = 질문, 본문 = 답변) + 표시 점
// [data-cards-total] [data-cards-cs] 숫자
// 움직임 줄이기·?still=1 → 뒤집기 회전 없이 바로 바뀜
// =============================================================
(function () {
  "use strict";

  const root = document.querySelector("[data-cards]");
  if (!root || !window.SiteCollect) return;
  const equip = root.dataset.equip || "pecvd";
  const C = SiteCollect.make(equip);
  if (!C) return;

  const CATS = ["원리", "장비", "공정", "CS"];
  const own = new Set((C.eq.parts || []).map((p) => p.id));        // 이 장비 데이터 파일의 부품 (공통 플랫폼 제외)
  const ALL = C.questions().map((q) => Object.assign(q, {
    cat: CATS.includes(q.cat) ? q.cat : (q.cs ? "CS" : "장비"),
    own: own.has(q.module)
  }));
  // 분류 순서로 정렬 (같은 분류 안에서는 패널 순서 그대로)
  ALL.sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat));

  const STORE = `deposition:cards:${equip}`;
  const calm = window.MotionPref ? !!MotionPref.reason() :
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (calm) root.classList.add("is-still");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // [검증 필요] 글자를 작은 표시로
  const rich = (s) => esc(s).replace(/\[검증 필요(:[^\]]*)?\]/g, (m, x) => `<span class="verify-tag">검증 필요${x ? esc(x) : ""}</span>`);

  // 머리 문장 숫자: 이 장비 질문 기준 (공통 플랫폼 질문은 [data-cards-all]에 전체 수로)
  const OWN = ALL.filter((q) => q.own);
  document.querySelectorAll("[data-cards-total]").forEach((el) => { el.textContent = OWN.length; });
  document.querySelectorAll("[data-cards-cs]").forEach((el) => { el.textContent = OWN.filter((q) => q.cs).length; });
  document.querySelectorAll("[data-cards-all]").forEach((el) => { el.textContent = ALL.length; });

  // ---------- 표시 저장 ----------
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { marks = {}; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(marks)); } catch (e) { /* 저장 안 되는 환경: 무시 */ } };

  // ---------- 상태 ----------
  const st = { cat: "all", ownOnly: true, review: false, shuffle: false, pos: 0, flipped: false };
  let order = ALL.map((_, i) => i);
  const inScope = () => ALL.filter((q) => (st.cat === "all" || q.cat === st.cat) && (!st.ownOnly || q.own));
  const deck = () => order.map((i) => ALL[i]).filter((q) => inScope().includes(q) && (!st.review || marks[q.key] === "review"));

  // ---------- 뼈대 ----------
  const nOf = (cat) => ALL.filter((q) => (cat === "all" || q.cat === cat) && (!st.ownOnly || q.own)).length;
  root.innerHTML = `
    <div class="ivc-bar">
      <div class="ivc-chips" role="group" aria-label="분류">
        ${["all"].concat(CATS).map((c) => `<button type="button" data-cat="${c}" aria-pressed="false"><span class="ivc-cat-dot" data-c="${c}"></span>${c === "all" ? "전체" : c}<span class="ivc-n"></span></button>`).join("")}
      </div>
      <div class="ivc-toggles">
        <button type="button" class="iv-toggle" data-own aria-pressed="true">${esc(C.eq.title.replace(/ 장비$/, ""))} 질문만</button>
        <button type="button" class="iv-toggle" data-review aria-pressed="false">다시 볼 것만</button>
        <button type="button" class="iv-toggle" data-shuffle aria-pressed="false">순서 섞기</button>
      </div>
    </div>
    <p class="ivc-progress" aria-live="polite"></p>
    <div class="ivc-stage">
      <div class="ivc-card" tabindex="0" role="button" aria-pressed="false" aria-label="카드 뒤집기">
        <div class="ivc-face is-front">
          <p class="ivc-top"><span class="ivc-cat"></span><span class="ivc-pos"></span></p>
          <p class="ivc-q"></p>
          <p class="ivc-hint">눌러서 답 보기 · 스페이스</p>
        </div>
        <div class="ivc-face is-back" aria-hidden="true">
          <p class="ivc-top"><span class="ivc-cat"></span><a class="ivc-from" href="#"></a></p>
          <p class="ivc-q-mini"></p>
          <p class="ivc-a"></p>
        </div>
      </div>
      <p class="ivc-empty" hidden>"다시 볼 것"으로 표시한 질문이 없습니다. 카드를 넘기며 표시해 보세요.</p>
    </div>
    <div class="ivc-actions">
      <button type="button" class="iv-btn" data-prev aria-label="이전 질문">←</button>
      <button type="button" class="iv-btn ivc-mark is-review" data-mark="review" aria-pressed="false">다시 볼 것</button>
      <button type="button" class="iv-btn ivc-mark is-ok" data-mark="ok" aria-pressed="false">알겠음</button>
      <button type="button" class="iv-btn" data-next aria-label="다음 질문">→</button>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const card = $(".ivc-card");

  function render(anim) {
    const d = deck();
    if (st.pos >= d.length) st.pos = Math.max(0, d.length - 1);
    const q = d[st.pos];
    root.querySelectorAll("[data-cat]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.cat === st.cat));
      b.querySelector(".ivc-n").textContent = nOf(b.dataset.cat);
    });
    $("[data-own]").setAttribute("aria-pressed", String(st.ownOnly));
    $("[data-review]").setAttribute("aria-pressed", String(st.review));
    $("[data-shuffle]").setAttribute("aria-pressed", String(st.shuffle));

    const sc = inScope();
    const ok = sc.filter((x) => marks[x.key] === "ok").length, rv = sc.filter((x) => marks[x.key] === "review").length;
    $(".ivc-progress").innerHTML = `<span class="is-ok">알겠음 ${ok}</span><span class="is-review">다시 볼 것 ${rv}</span><span>아직 ${sc.length - ok - rv}</span><span class="ivc-scope">${st.cat === "all" ? "전체" : st.cat} ${sc.length}개 기준</span>`;

    $(".ivc-empty").hidden = !!q;
    card.hidden = !q;
    root.querySelectorAll(".ivc-actions button").forEach((b) => { b.disabled = !q; });
    if (!q) return;
    root.querySelectorAll(".ivc-cat").forEach((el) => { el.textContent = q.cat === "CS" ? "CS 관점" : q.cat; el.dataset.c = q.cat; });
    $(".ivc-pos").textContent = `${st.pos + 1} / ${d.length}`;
    $(".ivc-q").textContent = q.q;
    $(".ivc-q-mini").textContent = q.q;
    $(".ivc-a").innerHTML = rich(q.a);
    const from = $(".ivc-from");
    from.href = q.from.href; from.textContent = `${q.from.tag} ${q.from.name} 패널 →`;
    card.classList.toggle("is-flipped", st.flipped);
    card.setAttribute("aria-pressed", String(st.flipped));
    $(".is-front").setAttribute("aria-hidden", String(st.flipped));
    $(".is-back").setAttribute("aria-hidden", String(!st.flipped));
    root.querySelectorAll("[data-mark]").forEach((b) => b.setAttribute("aria-pressed", String(marks[q.key] === b.dataset.mark)));
    $("[data-prev]").disabled = st.pos === 0;
    $("[data-next]").disabled = st.pos >= d.length - 1;
    if (anim && !calm) { card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in"); }
    renderList();
  }

  function go(step) {
    const d = deck();
    const n = st.pos + step;
    if (n < 0 || n >= d.length) return;
    st.pos = n; st.flipped = false; render(true);
  }
  function flip() { st.flipped = !st.flipped; render(false); }

  root.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest(".ivc-from")) return;                         // 패널 링크는 그대로 이동
    const cat = t.closest("[data-cat]");
    if (cat) { st.cat = cat.dataset.cat; st.pos = 0; st.flipped = false; render(true); return; }
    if (t.closest("[data-own]")) { st.ownOnly = !st.ownOnly; st.pos = 0; st.flipped = false; render(true); return; }
    if (t.closest("[data-review]")) { st.review = !st.review; st.pos = 0; st.flipped = false; render(true); return; }
    if (t.closest("[data-shuffle]")) {
      st.shuffle = !st.shuffle;
      order = ALL.map((_, i) => i);
      if (st.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      st.pos = 0; st.flipped = false; render(true); return;
    }
    if (t.closest("[data-prev]")) { go(-1); return; }
    if (t.closest("[data-next]")) { go(1); return; }
    const mk = t.closest("[data-mark]");
    if (mk) {
      const q = deck()[st.pos];
      if (!q) return;
      if (marks[q.key] === mk.dataset.mark) delete marks[q.key]; else marks[q.key] = mk.dataset.mark;
      save();
      // "다시 볼 것만" 보는 중에 알겠음으로 바꾸면 그 카드가 빠지므로 자리만 다시 맞춤
      render(false);
      return;
    }
    if (t.closest(".ivc-card")) flip();
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
  });
  root.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });

  // ---------- 전체 목록 (분류별 details) ----------
  const list = document.querySelector("[data-cards-list]");
  let listBuilt = false;
  function renderList() {
    if (!list) return;
    if (!listBuilt) {
      listBuilt = true;
      list.innerHTML = CATS.map((c) => {
        const qs = ALL.filter((q) => q.cat === c);
        if (!qs.length) return "";
        return `<h3 class="ivc-list-h"><span class="ivc-cat" data-c="${c}">${c === "CS" ? "CS 관점" : c}</span> ${qs.length}개</h3>` +
          qs.map((q) => `
          <details class="iv-item" data-key="${esc(q.key)}">
            <summary><span class="iv-sum-q">${esc(q.q)}</span><span class="iv-mark-dot" aria-hidden="true"></span><span class="iv-mark-word sr-only"></span></summary>
            <p>${rich(q.a)}</p>
            <p class="iv-item-from"><a href="${esc(q.from.href)}">${esc(q.from.tag)} ${esc(q.from.name)} 패널 →</a>${q.own ? "" : " <span class=\"ivc-shared\">공통 플랫폼</span>"}</p>
          </details>`).join("");
      }).join("");
    }
    list.querySelectorAll(".iv-item").forEach((d) => {
      const m = marks[d.dataset.key];
      d.dataset.mark = m === "ok" ? "done" : m === "review" ? "review" : "";
      d.querySelector(".iv-mark-word").textContent = m === "ok" ? "알겠음" : m === "review" ? "다시 볼 것" : "";
    });
  }

  render(false);
})();
