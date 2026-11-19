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
    // 한 묶음 = 가로 한 줄 (왼쪽: 묶음 이름, 오른쪽: 페이지 카드들)
    return `
      <section class="toc-row" id="${sec.id}">
        <h2>${sec.title}</h2>
        <ul class="toc-links">${items}</ul>
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
          // 결과 한 줄 전체를 누를 수 있게 묶음 이름(tag)도 링크 안에 넣음
          return `<li><a href="${ROOT + p.path}">${p.title}
                  <span class="tag">${sec ? sec.title : ""}</span></a></li>`;
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

// ---------- 4) 스크롤하면 부드럽게 나타나기 ----------
// main 안의 요소 중 "처음 화면보다 아래에 있는 것"만 숨겼다가,
// 스크롤해서 화면에 들어오면 나타나게 합니다.
// 움직임 줄이기 설정을 켠 사용자에게는 아무 효과도 넣지 않습니다.
function setupReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  const main = document.querySelector("main");
  if (!main) return;

  // 메인 페이지는 목차 줄 하나하나, 다른 페이지는 본문 요소 하나하나
  const targets = main.querySelectorAll(".toc-row, main > :not(.hero)");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target); // 한 번 나타나면 끝
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  targets.forEach((el) => {
    if (el.id === "toc") return; // 목차 상자 자체는 그대로, 안의 줄만 효과
    // 이미 첫 화면에 보이는 요소는 숨기지 않음 (깜빡임 방지)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.classList.add("reveal");
    observer.observe(el);
  });
}

renderHeader();
renderToc();
setupSearch();
renderPageToc();
setupReveal();
