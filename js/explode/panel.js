// =============================================================
// 부품 정보 패널 — 이름표나 분해된 모듈을 누르면 열리는 설명 패널
//
//   넓은 화면: 오른쪽에서 밀려 나오는 패널 / 좁은 화면(900px 미만): 아래에서 올라오는 시트
//   내용은 전부 data/*.js 의 부품 데이터에서 읽는다 (이 파일에는 칸 제목만 있음)
//     role · components · principle · params · issues · pm · interview · sources
//   비어 있는 칸은 "작성 예정"으로 보여 주고, 헤더와 칸 틀은 그대로 둔다.
//
//   닫기: Esc 키 · 바깥(어두운 바탕) 클릭 · 닫기 버튼
//   열려 있는 동안: 페이지 스크롤을 막아서 뒤의 분해 연출이 움직이지 않게 한다
//                  (패널 안 스크롤은 됨) + Tab 키 초점이 패널 안에서만 돈다
//
//   글 안 표기 (데이터에 쓰는 약속)
//     [검증 필요]                    → 작은 표시
//     [[보이는 글|basics/plasma.html]] → 링크 (사이트 맨 위 폴더 기준 경로, body의 data-root를 앞에 붙임)
//
// 사용법: const panel = EquipPanel.create({ equipment, platforms, onOpen(partId), onShow(partId), onClose(byPointer) })
//         panel.open(partId, 돌아갈초점요소)  /  panel.close()  /  panel.isOpen()  /  panel.has(partId)
//   onShow : 보이는 부품이 바뀔 때마다 (처음 열 때 + "내부 부품" 링크·돌아가기) → 주소 #part= 갱신에 씀
//   onClose(byPointer) : 마우스·손가락으로 닫았으면 true (닫기 버튼 클릭·바깥 클릭), 키보드(Esc·Enter)면 false
// =============================================================
(function () {
  "use strict";

  const pad2 = (n) => String(n).padStart(2, "0");
  const TODO = "작성 예정";
  // 칸 제목: 영문 라벨(고정폭) + 한글 제목. 순서 = 화면 순서
  const SECTIONS = [
    ["role", "Role", "역할"],
    ["principle", "Principle", "동작 원리"],
    ["params", "Parameters", "관련 공정변수"],
    ["issues", "Issues · PM", "자주 생기는 문제와 PM 포인트"],
    ["interview", "Interview", "면접 질문"],
    ["sources", "Sources", "출처"]
  ];

  // 작은 요소 만들기 도우미: el("p", "class", 글 또는 자식들)
  function el(tag, cls, kids) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (kids != null) [].concat(kids).forEach((k) => n.append(k instanceof Node ? k : String(k)));
    return n;
  }

  // 글 안 표기를 실제 요소로 바꿈 (HTML로 해석하지 않으므로 데이터에 꺾쇠가 있어도 안전)
  function rich(text) {
    const frag = document.createDocumentFragment();
    const root = document.body.dataset.root || "";
    String(text || "").split(/(\[검증 필요\]|\[\[[^\]]+\]\])/).forEach((s) => {
      if (!s) return;
      if (s === "[검증 필요]") { frag.append(el("span", "verify-tag", "검증 필요")); return; }
      const m = s.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/);
      if (m) { const a = el("a", "", m[1]); a.href = root + m[2]; frag.append(a); return; }
      frag.append(s);
    });
    return frag;
  }
  const todo = () => el("p", "todo", TODO);
  const filled = (v) => Array.isArray(v) ? v.length > 0 : !!v;

  function create(opts) {
    const eq = opts.equipment;
    const plat = (opts.platforms && eq.platform && opts.platforms[eq.platform]) || { parts: [] };
    const allParts = [...plat.parts, ...eq.parts];
    const byId = new Map(allParts.map((p) => [p.id, p]));
    // 이름표 번호·약어: 자기에게 없으면 부모의 것을 "어느 모듈 안인지" 표시로 씀
    const labelOf = (p) => p && p.label && p.label.no != null ? p.label : null;

    // ---------- 요소 만들기 (body 맨 끝: 고정된 무대의 transform 영향을 받지 않게) ----------
    const backdrop = el("div", "part-panel-backdrop");
    backdrop.hidden = true;
    const panel = el("aside", "part-panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "part-panel-title");

    const head = el("header", "part-panel-head");
    const backBtn = el("button", "part-panel-back");
    backBtn.type = "button";
    backBtn.hidden = true;
    const closeBtn = el("button", "part-panel-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "패널 닫기");
    closeBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15"/></svg>';
    const idLine = el("p", "part-panel-id");
    const title = el("h2", "part-panel-title");
    title.id = "part-panel-title";
    const en = el("p", "part-panel-en");
    head.append(backBtn, idLine, title, en, closeBtn);
    const body = el("div", "part-panel-body");
    body.tabIndex = -1;            // 키보드로 패널 본문을 스크롤할 수 있게
    panel.append(el("span", "part-panel-grip"), head, body);
    document.body.append(backdrop, panel);

    let current = null;            // 지금 보이는 부품 id
    let history = [];              // 내부 부품으로 들어가면 돌아갈 부품 id
    let returnFocus = null;
    let savedY = 0;
    let closeTimer = 0;

    // ---------- 내용 채우기 ----------
    function fill(id) {
      const p = byId.get(id);
      if (!p) return false;
      current = id;
      const parent = p.parent ? byId.get(p.parent) : null;
      const own = labelOf(p), par = labelOf(parent);
      // 헤더: 번호 · 약어 (내부 부품이면 "05 PM › 내부 부품")
      idLine.replaceChildren();
      if (own) {
        idLine.append(el("span", "pp-no", pad2(own.no)), el("span", "pp-abbr", own.abbr || ""));
      } else if (par) {
        idLine.append(el("span", "pp-no", pad2(par.no)), el("span", "pp-abbr", par.abbr || ""),
          el("span", "pp-sub", "› 내부 부품"));
      }
      title.textContent = p.name || p.id;
      en.textContent = p.en || "";
      en.hidden = !p.en;
      // 돌아가기 버튼: 내부 부품을 열었을 때만
      const prev = history.length ? byId.get(history[history.length - 1]) : null;
      backBtn.hidden = !prev;
      if (prev) backBtn.textContent = "← " + (prev.name || prev.id) + " 패널로";

      body.replaceChildren();
      SECTIONS.forEach(([key, enLabel, ko]) => {
        const sec = el("section", "pp-sec pp-sec-" + key);
        sec.append(el("h3", "pp-h", [el("span", "pp-h-en", enLabel), el("span", "pp-h-ko", ko)]));
        renderSection(key, p, sec);
        body.append(sec);
      });
      body.scrollTop = 0;
      if (opts.onShow) opts.onShow(id);
      return true;
    }

    function renderSection(key, p, sec) {
      if (key === "role") {
        sec.append(filled(p.role) ? el("p", "pp-text", rich(p.role)) : todo());
        // 구성품 목록 (있을 때만) — part가 있으면 그 부품 패널로 가는 링크
        if (filled(p.components)) {
          sec.append(el("h4", "pp-sub-h", "구성품"));
          const dl = el("dl", "pp-parts");
          p.components.forEach((c) => {
            const dt = el("dt", "", [el("span", "pp-part-name", c.name), c.en ? el("span", "pp-part-en", c.en) : ""]);
            const dd = el("dd", "", rich(c.desc));
            if (c.part && byId.has(c.part)) {
              const go = el("button", "pp-link", ["내부 부품 · ", c.name, " 보기 →"]);
              go.type = "button";
              go.addEventListener("click", () => { history.push(current); fill(c.part); closeBtn.focus(); });
              dd.append(el("span", "pp-link-row", go));
            }
            dl.append(el("div", "pp-part", [dt, dd]));
          });
          sec.append(dl);
        }
      } else if (key === "principle") {
        if (!filled(p.principle)) { sec.append(todo()); return; }
        [].concat(p.principle).forEach((t) => sec.append(el("p", "pp-text", rich(t))));
      } else if (key === "params") {
        if (!filled(p.params)) { sec.append(todo()); return; }
        // 사양 표처럼: 변수 이름 줄 → 올리면 / 내리면 / 트레이드오프 (정의 목록)
        const wrap = el("div", "pp-spec");
        p.params.forEach((v) => {
          const dl = el("dl", "pp-spec-dl");
          [["올리면", v.up], ["내리면", v.down], ["트레이드오프", v.tradeoff]].forEach(([k, t]) => {
            dl.append(el("dt", "", k), el("dd", "", t ? rich(t) : el("span", "todo", TODO)));
          });
          wrap.append(el("div", "pp-spec-row", [el("p", "pp-spec-name", v.name), dl]));
        });
        sec.append(wrap);
      } else if (key === "issues") {
        if (!filled(p.issues) && !filled(p.pm)) { sec.append(todo()); return; }
        (p.issues || []).forEach((it) => {
          const d = el("details", "pp-details");
          d.append(el("summary", "", rich(it.problem)));
          const ol = el("ol", "pp-checks");
          (it.checks || []).forEach((c) => ol.append(el("li", "", rich(c))));
          d.append(el("p", "pp-checks-h", "점검 순서"), ol);
          sec.append(d);
        });
        sec.append(el("h4", "pp-sub-h", "PM 포인트 (정기 정비)"));
        if (filled(p.pm)) {
          const ul = el("ul", "pp-list");
          p.pm.forEach((t) => ul.append(el("li", "", rich(t))));
          sec.append(ul);
        } else sec.append(todo());
      } else if (key === "interview") {
        if (!filled(p.interview)) { sec.append(todo()); return; }
        p.interview.forEach((it, i) => {
          const d = el("details", "pp-details");
          const sum = el("summary", "", [el("span", "pp-q-no", "Q" + (i + 1)), el("span", "pp-q", rich(it.q))]);
          if (it.cs) sum.append(el("span", "pp-cs", "CS"));
          d.append(sum, el("p", "pp-text pp-answer", it.a ? rich(it.a) : TODO));
          sec.append(d);
        });
      } else if (key === "sources") {
        if (!filled(p.sources)) { sec.append(todo()); return; }
        const ul = el("ul", "pp-sources");
        p.sources.forEach((s) => {
          const li = el("li");
          li.append(el("span", "pp-src-kind", s.kind || "자료"));
          if (s.url) {
            const a = el("a", "pp-src-title", s.title || s.url);
            a.href = s.url;
            a.target = "_blank";
            a.rel = "noopener";
            li.append(a);
          } else if (s.title) li.append(el("span", "pp-src-title", s.title));
          if (s.note) li.append(el("span", "pp-src-note", s.note));
          if (s.checked) li.append(el("span", "pp-src-date", "확인 " + s.checked));
          ul.append(li);
        });
        sec.append(ul);
      }
    }

    // ---------- 스크롤 막기: 열려 있는 동안 페이지는 그 자리에 ----------
    //   body에 overflow: hidden을 걸면 고정(pin) 위치가 흔들릴 수 있어서, 스크롤 입력만 막는다
    const inPanel = (t) => t instanceof Node && panel.contains(t);
    const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);
    function blockWheel(e) { if (!inPanel(e.target)) e.preventDefault(); }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close({ pointer: false }); return; }
      if (e.key === "Tab") { trapTab(e); return; }
      if (SCROLL_KEYS.has(e.key) && !inPanel(e.target)) e.preventDefault();
    }
    // 그래도 스크롤바를 끌거나 해서 움직이면 바로 제자리로 (안전망)
    function holdScroll() { if (Math.abs(window.scrollY - savedY) > 1) window.scrollTo({ top: savedY, behavior: "instant" }); }

    // Tab 초점이 패널 밖으로 나가지 않게
    function trapTab(e) {
      const f = [...panel.querySelectorAll('button:not([hidden]), a[href], summary, [tabindex="0"], .part-panel-body')]
        .filter((n) => !n.closest("[hidden]") && n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !inPanel(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !inPanel(document.activeElement))) { e.preventDefault(); first.focus(); }
    }

    // ---------- 열기 · 닫기 ----------
    function open(id, focusBack) {
      history = [];
      if (!fill(id)) return;
      if (opts.onOpen) opts.onOpen(id);
      const wasOpen = isOpen();
      if (!wasOpen) {
        returnFocus = focusBack || document.activeElement;
        savedY = window.scrollY;
        clearTimeout(closeTimer);
        backdrop.hidden = false;
        panel.hidden = false;
        // 숨김을 푼 상태(화면 밖)를 브라우저가 한 번 계산하게 한 뒤 is-open → CSS 전환으로 미끄러져 들어옴
        void panel.offsetWidth;
        backdrop.classList.add("is-open");
        panel.classList.add("is-open");
        window.addEventListener("wheel", blockWheel, { passive: false });
        window.addEventListener("touchmove", blockWheel, { passive: false });
        window.addEventListener("scroll", holdScroll);
        document.addEventListener("keydown", onKey);
        document.documentElement.classList.add("has-part-panel");
      }
      closeBtn.focus({ preventScroll: true });
    }

    function close(how) {
      if (!isOpen()) return;
      panel.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      window.removeEventListener("wheel", blockWheel);
      window.removeEventListener("touchmove", blockWheel);
      window.removeEventListener("scroll", holdScroll);
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("has-part-panel");
      // 미끄러져 나간 뒤 숨김 (전환 시간과 맞춤, 움직임 줄이기면 바로)
      const ms = parseFloat(getComputedStyle(panel).transitionDuration) * 1000 || 0;
      closeTimer = setTimeout(() => { panel.hidden = true; backdrop.hidden = true; }, ms + 20);
      current = null;
      if (opts.onClose) opts.onClose(!!(how && how.pointer));
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }

    function isOpen() { return panel.classList.contains("is-open") || (!panel.hidden && current !== null); }

    backdrop.addEventListener("click", () => close({ pointer: true }));
    // 키보드 Enter·Space로 누른 클릭은 detail이 0 → 키보드로 닫은 것
    closeBtn.addEventListener("click", (e) => close({ pointer: e.detail > 0 }));
    backBtn.addEventListener("click", () => {
      const prev = history.pop();
      if (prev) { fill(prev); closeBtn.focus(); }
    });

    return { open: open, close: close, isOpen: isOpen, has: (id) => byId.has(id), el: panel };
  }

  window.EquipPanel = { create: create };
})();
