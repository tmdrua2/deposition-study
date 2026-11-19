// =============================================================
// 모든 페이지에서 공통으로 쓰는 스크립트
//  1) 위쪽 메뉴(헤더) 자동 생성
//  2) 메인 페이지의 목차 + 검색
//  3) 각 페이지 안의 "이 페이지 목차" 자동 생성
// 각 HTML의 <body data-root="..."> 값으로 사이트 맨 위 폴더 위치를 알려줍니다.
//   index.html       → data-root=""
//   하위 폴더의 파일  → data-root="../"
// =============================================================

const ROOT = document.body.dataset.root || "";

// ---------- 1) 헤더 메뉴 ----------
function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const links = SECTIONS.map((sec) => {
    const first = PAGES.find((p) => p.section === sec.id);
    if (!first) return "";
    // 기초/공정은 메인 목차로, 회사/실습은 해당 페이지로 이동
    const href = sec.id === "basics" || sec.id === "equipment"
      ? `${ROOT}index.html#${sec.id}`
      : ROOT + first.path;
    return `<a href="${href}">${sec.title}</a>`;
  }).join("");

  header.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="${ROOT}index.html">증착 공정 노트</a>
      <nav>${links}</nav>
    </div>`;
}

// ---------- 2) 메인 페이지 목차 ----------
function renderToc() {
  const toc = document.getElementById("toc");
  if (!toc) return;

  toc.innerHTML = SECTIONS.map((sec) => {
    const items = PAGES.filter((p) => p.section === sec.id)
      .map((p) => `<li><a href="${ROOT + p.path}">${p.title}</a></li>`)
      .join("");
    return `
      <section class="toc-card" id="${sec.id}">
        <h2>${sec.title}</h2>
        <ul>${items}</ul>
      </section>`;
  }).join("");
}

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
          return `<li><a href="${ROOT + p.path}">${p.title}</a>
                  <span class="tag">${sec ? sec.title : ""}</span></li>`;
        }).join("")
      : `<li class="empty">검색 결과가 없습니다.</li>`;
  });
}

// ---------- 3) 페이지 안 목차 (h2 제목들로 자동 생성) ----------
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

renderHeader();
renderToc();
setupSearch();
renderPageToc();
