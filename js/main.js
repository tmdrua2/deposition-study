// =============================================================
// 모든 페이지에서 공통으로 쓰는 스크립트
//  1) 위쪽 헤더 + 햄버거(≡) 전체 화면 메뉴
//  2) 메인 페이지: 카테고리 카드, 장비 목록, 검색, 점·선 구 그래픽
//  3) 학습 페이지: 제목 위 영문 라벨, "이 페이지 목차"
//  4) 스크롤하면 나타나기, "맨 위로" 버튼
// 각 HTML의 <body data-root="..."> 값으로 사이트 맨 위 폴더 위치를 알려줍니다.
//   index.html       → data-root=""
//   하위 폴더의 파일  → data-root="../"
// =============================================================

const ROOT = document.body.dataset.root || "";
// 사용자가 "움직임 줄이기"를 켰는지 (켰으면 애니메이션을 끕니다)
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 화살표 아이콘 (→) — 카드·버튼에서 같이 씀
const ARROW = `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// 섹션에 속한 페이지 목록
// (hidden: true 인 페이지 = 하위 페이지 → 목차·메뉴에는 안 보이고 검색에만 나옴)
function pagesOf(sectionId) {
  return PAGES.filter((p) => p.section === sectionId && !p.hidden);
}

// ---------- 1) 헤더 + 전체 화면 메뉴 ----------
// 메뉴 전용 목록: 분류 → 항목. 제목은 PAGES(js/pages.js)에서 path로 찾아 씀.
//   en    : 항목 옆 작은 영문 라벨
//   desc  : 넓은 화면 유리 카드에 나오는 한 줄 설명
//   status: done(완성) / wip(작성 중) / soon(준비 중) — 페이지를 채우면 여기 값을 바꾼다
const MENU_GROUPS = [
  { label: "Fundamentals", title: "기초", items: [
    { path: "basics/vacuum.html", name: "진공", en: "Vacuum", status: "wip",
      desc: "압력 단위, 평균자유행로, 펌프 종류 — 증착이 왜 진공에서 일어나는지" },
    { path: "basics/plasma.html", name: "플라즈마", en: "Plasma", status: "soon",
      desc: "전자·이온·라디칼과 쉬스 — PECVD·스퍼터의 바탕 개념" },
    { path: "basics/thin-film-growth.html", name: "박막 성장 원리", en: "Thin-film Growth", status: "soon",
      desc: "흡착·확산·핵생성, 그리고 단차 피복(step coverage)" },
  ]},
  { label: "Deposition Equipment", title: "증착 장비", items: [
    // sections: 이 장비의 섹션 목록(js/pages.js EQUIP_SECTIONS) → 상태·설명을 완성 섹션 수로 자동 계산 (아래 menuState)
    { path: "equipment/pecvd.html", name: "PECVD", en: "Plasma-Enhanced CVD", sections: "pecvd",
      desc: "장비 분해 연출과 원리부터 면접 질문까지 7개 섹션" },
    { path: "equipment/ald.html", name: "ALD", en: "Atomic Layer Deposition", status: "done",   // 장비 분해 화면 완성(1차) — 7개 섹션 하위 페이지는 준비 중
      desc: "장비 분해 연출 + 전구체·퍼지·반응 기체 사이클 기체 흐름 (섹션 7개는 준비 중)" },
    { path: "equipment/pvd.html", name: "PVD", en: "Physical Vapor Deposition", status: "wip",
      desc: "스퍼터링 공정 모션 — 본문은 채우는 중" },
    { path: "equipment/epi.html", name: "Epi", en: "Epitaxy", status: "soon",
      desc: "기판 결정을 이어 단결정 막을 키우는 에피택시" },
    { path: "equipment/ecd.html", name: "전기도금", en: "ECD", status: "soon",
      desc: "구리 배선을 채우는 전기화학 도금" },
  ]},
  { label: "More", title: "더보기", items: [
    { path: "companies/index.html", name: "증착 장비사", en: "Companies", status: "soon",
      desc: "해외·국내 증착 장비 회사 정리" },
    { path: "lab/index.html", name: "내 실습 기록", en: "Lab Notes", status: "soon",
      desc: "직접 해본 공정과 배운 점" },
  ]},
];
const STATUS_TEXT = { done: "완성", wip: "작성 중", soon: "준비 중" };

// 메뉴 항목의 상태·설명: sections가 있으면 섹션 완성 수로 정함
//   전부 완성 → "완성" + "장비 분해 연출 + 7개 섹션 완성" / 일부만 → "작성 중" + "7개 섹션 중 3개 완성 (원리·장비 구성·공정 흐름)"
function menuState(it) {
  const eq = it.sections && typeof EQUIP_SECTIONS === "object" ? EQUIP_SECTIONS[it.sections] : null;
  if (!eq) return { status: it.status, desc: it.desc };
  const done = eq.list.filter((s) => s.ready);
  if (done.length === eq.list.length) return { status: "done", desc: `장비 분해 연출 + ${eq.list.length}개 섹션 완성 (원리부터 면접 질문·출처까지)` };
  if (!done.length) return { status: "soon", desc: it.desc };
  return { status: "wip", desc: `장비 분해 연출 + ${eq.list.length}개 섹션 중 ${done.length}개 완성 (${done.map((s) => s.title).join("·")})` };
}

// 지금 보고 있는 페이지인지 (PECVD 하위 페이지 equipment/pecvd/*.html도 PECVD로 봄)
function isCurrentPage(path) {
  const here = location.pathname.replace(/\/$/, "/index.html");
  const target = new URL(ROOT + path, location.href).pathname;
  if (here === target) return true;
  return path.endsWith(".html") && here.startsWith(target.replace(/\.html$/, "/"));
}

function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="${ROOT}index.html" aria-label="LAYER BY LAYER 증착 공정 노트, 처음으로">
        <span class="logo-en">LAYER BY LAYER</span><span class="logo-ko">증착 공정 노트</span>
      </a>
      <button class="menu-btn" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="site-menu">
        <span></span><span></span><span></span>
      </button>
    </div>`;

  // 항목 HTML: 번호 · 큰 한글 · 작은 영문 · 상태 · 화살표
  let no = 0;   // 전체 번호 01, 02 …
  let row = 0;  // 나타나는 순서 (위에서부터 한 줄씩)
  const groups = MENU_GROUPS.map((g) => {
    const items = g.items.map((it) => {
      no += 1;
      const cur = isCurrentPage(it.path);
      const st = menuState(it);
      const num = String(no).padStart(2, "0");
      return `
        <li class="mi-row" style="--i:${++row}">
          <a class="mi${cur ? " is-current" : ""}" href="${ROOT + it.path}"${cur ? ' aria-current="page"' : ""}
             data-no="${num}" data-en="${it.en}" data-name="${it.name}" data-desc="${st.desc}" data-status="${st.status}">
            <span class="mi-no">${num}</span>
            <span class="mi-name">${it.name}</span>
            <span class="mi-en">${it.en}</span>
            <span class="mi-status is-${st.status}">${cur ? "보는 중 · " : ""}${STATUS_TEXT[st.status]}</span>
            ${ARROW}
          </a>
        </li>`;
    }).join("");
    return `
      <li class="mg" style="--i:${++row}">
        <p class="mg-label">${g.label}<span>${g.title}</span></p>
        <ul class="mg-items">${items}</ul>
      </li>`;
  }).join("");

  const menu = document.createElement("div");
  menu.id = "site-menu";
  menu.className = "site-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-label", "전체 메뉴");
  menu.innerHTML = `
    <div class="menu-bg" aria-hidden="true"></div>
    <div class="menu-inner">
      <div class="menu-top">
        <span class="menu-kicker">Index</span>
        <button class="menu-close" type="button" aria-label="메뉴 닫기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="menu-body">
        <ul class="menu-groups">${groups}</ul>
        <aside class="menu-card" aria-hidden="true">
          <p class="mc-top"><span class="mc-no"></span><span class="mc-en"></span></p>
          <p class="mc-name"></p>
          <p class="mc-desc"></p>
          <p class="mc-status"><i></i><span></span></p>
        </aside>
      </div>
      <div class="menu-foot" style="--i:${++row}">
        <strong>LAYER BY LAYER · 증착 공정 노트</strong>
        <span>반도체 증착 장비를 원리·장비 구성·점검 순서로 정리하는 학습 노트</span>
      </div>
    </div>`;
  document.body.appendChild(menu);

  const openBtn = header.querySelector(".menu-btn");
  const closeBtn = menu.querySelector(".menu-close");
  const card = menu.querySelector(".menu-card");
  const links = [...menu.querySelectorAll(".mi")];

  // 유리 카드 내용 바꾸기 (넓은 화면에서만 보임 — 화면 읽기 프로그램은 항목 글자를 그대로 읽음)
  function showCard(a) {
    if (!a) return;
    card.querySelector(".mc-no").textContent = a.dataset.no;
    card.querySelector(".mc-en").textContent = a.dataset.en;
    card.querySelector(".mc-name").textContent = a.dataset.name;
    card.querySelector(".mc-desc").textContent = a.dataset.desc;
    card.querySelector(".mc-status span").textContent = STATUS_TEXT[a.dataset.status];
    card.dataset.status = a.dataset.status;
    card.classList.remove("is-swap");
    void card.offsetWidth;          // 같은 애니메이션을 다시 틀기 위한 한 줄
    card.classList.add("is-swap");
  }
  const defaultLink = links.find((a) => a.classList.contains("is-current")) || links[0];
  showCard(defaultLink);
  links.forEach((a) => {
    a.addEventListener("mouseenter", () => showCard(a));
    a.addEventListener("focus", () => showCard(a));
  });

  function setOpen(open, returnFocus = true) {
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open); // 뒤쪽 페이지 스크롤 막기
    openBtn.setAttribute("aria-expanded", String(open));
    if (open) {
      showCard(defaultLink);
      closeBtn.focus();
    } else if (returnFocus) openBtn.focus();       // 닫으면 ☰ 버튼으로 초점 복귀
  }
  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (!menu.classList.contains("is-open")) return;
    if (e.key === "Escape") setOpen(false);
    // Tab 초점이 메뉴 밖으로 나가지 않게: 처음 ↔ 끝에서 돌아감
    if (e.key === "Tab") {
      const f = [closeBtn, ...links];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!menu.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });
  // 메뉴 안 링크를 누르면 메뉴 닫기 (같은 페이지 안 #이동일 때 필요)
  links.forEach((a) => a.addEventListener("click", () => setOpen(false, false)));
}

// ---------- 2) 메인 페이지(표지) 장비 진열·아래 목차는 js/home.js ----------

// ---------- 메인 페이지 검색 ----------
// 지금은 제목과 keywords만 검색합니다 (파일을 직접 열어도 동작하도록).
function setupSearch() {
  const input = document.getElementById("search");
  const results = document.getElementById("search-results");
  if (!input || !results) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ""; return; }

    const hits = PAGES.filter((p) =>
      (p.title + " " + p.keywords).toLowerCase().includes(q)
    );

    results.innerHTML = hits.length
      ? hits.map((p) => {
          const sec = SECTIONS.find((s) => s.id === p.section);
          // 결과 한 줄 전체를 누를 수 있게 묶음 이름(tag)도 링크 안에 넣음
          return `<li><a href="${ROOT + p.path}">${p.title}
                  <span class="tag">${sec ? sec.title : ""}</span></a></li>`;
        }).join("")
      : `<li class="empty">검색 결과가 없습니다.</li>`;
  });
}

// ---------- 3) 학습 페이지 제목 영역 ----------
// 맨 위 h1과 부제목을 한 상자로 묶고, 위에 영문 라벨(섹션 이름)을 붙입니다.
function renderPageHead() {
  const main = document.querySelector("main:not(.home)");
  if (!main) return;
  const h1 = main.querySelector(":scope > h1");
  if (!h1) return;

  const path = decodeURIComponent(location.pathname);
  const page = PAGES.find((p) => path.endsWith("/" + p.path));
  const sec = page && SECTIONS.find((s) => s.id === page.section);

  const head = document.createElement("div");
  head.className = "page-head";
  main.insertBefore(head, h1);
  if (sec) head.insertAdjacentHTML("beforeend", `<p class="eyebrow">${sec.en}</p>`);
  h1.classList.add("dot-title");
  head.appendChild(h1);
  const sub = head.nextElementSibling;
  if (sub && sub.classList.contains("subtitle")) head.appendChild(sub);
}

// 페이지 안 목차 (h2 제목들로 자동 생성)
function renderPageToc() {
  const box = document.getElementById("page-toc");
  if (!box) return;

  const headings = document.querySelectorAll("main h2[id]");
  box.innerHTML = "<strong>이 페이지 목차</strong><ol>" +
    Array.from(headings)
      .map((h) => `<li><a href="#${h.id}">${h.textContent}</a></li>`)
      .join("") +
    "</ol>";
}

// ---------- 4) 스크롤하면 아래에서 위로 나타나기 ----------
// 처음 화면보다 아래에 있는 제목·카드만 숨겼다가, 화면에 들어오면 나타나게 합니다.
function setupReveal() {
  // 움직임 줄이기·?still=1(정지 화면 점검)이면 나타나기 효과 없이 처음부터 보임
  if (REDUCE_MOTION || /[?&]still=1/.test(location.search) || !("IntersectionObserver" in window)) return;
  const main = document.querySelector("main");
  if (!main) return;
  // 섹션 카드·섹션 하위 페이지는 자체 디자인이라 나타나기 효과를 쓰지 않음
  if (main.matches(".sec-hub-main, .sec-main")) return;

  // 표지(main.cover): 섹션 배경은 그대로 두고 안의 제목·목록만 나타남
  const targets = main.classList.contains("cover")
    ? main.querySelectorAll(".cover-sec > *")
    : main.classList.contains("home")
    ? main.querySelectorAll(".home-section > .eyebrow, .home-section > h2, .cat-card, .equip-item")
    : main.querySelectorAll(":scope > :not(.page-head)");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target); // 한 번 나타나면 끝
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  targets.forEach((el) => {
    // 이미 첫 화면에 보이는 요소는 숨기지 않음 (깜빡임 방지)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.classList.add("reveal");
    // 같은 줄의 장비 그림은 조금씩 시간차를 두고 나타남
    if (el.classList.contains("equip-item")) {
      el.style.transitionDelay = `${Array.from(el.parentElement.children).indexOf(el) * 60}ms`;
    }
    observer.observe(el);
  });
}

// ---------- "맨 위로" 버튼 ----------
function setupToTop() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "to-top";
  btn.setAttribute("aria-label", "맨 위로");
  btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  document.body.appendChild(btn);

  btn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: REDUCE_MOTION ? "auto" : "smooth" })
  );
  // 조금 스크롤했을 때만 보이기. 단, 장비 분해 무대가 화면을 꽉 채우고 있을 때는 숨김
  //   (화면 오른쪽 아래 이름표를 가리지 않게)
  const pins = document.querySelectorAll(".equip-stage-pin");
  const stageFills = () => [...pins].some((p) => {
    const r = p.getBoundingClientRect();
    return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight - 4;
  });
  // 버튼 바로 밑에 누를 수 있는 것(버튼·링크·입력칸)이 겹쳐 있으면 잠깐 숨김
  //   (휴대폰에서 면접 연습 카드의 "다시 볼 것"·"다음" 버튼 끝을 가리던 문제)
  const TAPPABLE = "main a, main button, main input, main select, main summary, main label";
  const coversSomething = () => {
    const b = btn.getBoundingClientRect();
    const pad = 8;
    const box = { l: b.left - pad, r: b.right + pad, t: b.top - pad, b: b.bottom + pad };
    return [...document.querySelectorAll(TAPPABLE)].some((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > box.l && r.left < box.r && r.bottom > box.t && r.top < box.b;
    });
  };
  let raf = 0;
  const update = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() =>
      btn.classList.toggle("is-shown", window.scrollY > 400 && !stageFills() && !coversSomething()));
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

renderHeader();
setupSearch();
renderPageHead();
renderPageToc();
setupReveal();
setupToTop();

// ---------- PECVD 같은 장비 무대 페이지: 무대가 끝나 크림 본문이 바 아래에 오면 상단 바도 크림으로 ----------
//   (무대 안에서의 남색 → 크림 전환은 stage.js가 함. 여기는 "무대가 완전히 지나간 뒤"만 맡음)
//   body.hdr-body → CSS가 색만 바꾸고 transition으로 부드럽게 (blur 없음)
(function () {
  const st = document.querySelector(".equip-stage");
  if (!st || !document.body.classList.contains("page-stage")) return;
  let raf = 0;
  function check() {
    raf = 0;
    document.body.classList.toggle("hdr-body", st.getBoundingClientRect().bottom < 36);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(check); };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  check();
})();
