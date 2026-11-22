// =============================================================
// 장비 섹션 하위 페이지 목록 + 공통 길잡이 (이전/다음, 진행 표시)
//
// 장비 페이지 본문은 섹션 카드 7개 → 각 섹션은 따로 된 하위 페이지 (equipment/pecvd/principle.html 등)
// 순서는 CLAUDE.md "장비 페이지 틀"과 같다. 섹션 이름·설명을 바꾸면 여기만 고치면 된다
// (장비 페이지의 카드 글은 HTML에 직접 있음 — 같이 고칠 것)
//
// 하위 페이지 HTML 약속
//   <body data-equip="pecvd" data-section="principle">
//   <ol data-sec-rail></ol>    → 7칸 진행 표시 (지금 섹션 강조, 각 칸은 그 섹션 링크)
//   <nav data-sec-pager></nav> → 이전 섹션 / 장비 페이지로 / 다음 섹션
//   ready: false 인 섹션은 "준비 중"으로 표시
// main.js 다음에 불러온다 (ROOT 값을 씀)
// =============================================================
const EQUIP_SECTIONS = {
  pecvd: {
    name: "PECVD",
    home: "equipment/pecvd.html",      // 사이트 맨 위 기준 경로
    folder: "equipment/pecvd/",
    list: [
      { id: "principle",       title: "원리",       en: "Principle",       ready: true },
      { id: "hardware",        title: "장비 구성",   en: "Hardware",        ready: false },
      { id: "flow",            title: "공정 흐름",   en: "Process flow",    ready: false },
      { id: "parameters",      title: "공정변수",    en: "Parameters",      ready: false },
      { id: "troubleshooting", title: "문제와 점검", en: "Troubleshooting", ready: false },
      { id: "interview",       title: "면접 질문",   en: "Interview",       ready: false },
      { id: "sources",         title: "출처",       en: "Sources",         ready: false },
    ],
  },
};

(function () {
  const body = document.body;
  // 고정 헤더 높이 → CSS 변수 --header-h (원리 페이지의 고정 그림이 헤더 바로 아래에 붙도록)
  const header = document.getElementById("site-header");
  const setHeaderH = () => { if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px"); };
  setHeaderH();
  window.addEventListener("resize", setHeaderH);
  const eq = EQUIP_SECTIONS[body.dataset.equip];
  if (!eq || !body.dataset.section) return;
  const root = typeof ROOT === "string" ? ROOT : (body.dataset.root || "");
  const idx = eq.list.findIndex((s) => s.id === body.dataset.section);
  if (idx < 0) return;
  const pad2 = (n) => String(n).padStart(2, "0");
  const href = (s) => root + eq.folder + s.id + ".html";
  const total = eq.list.length;

  // 7칸 진행 표시
  document.querySelectorAll("[data-sec-rail]").forEach((rail) => {
    rail.innerHTML = eq.list.map((s, i) => `
      <li class="${i === idx ? "is-current" : ""}${s.ready ? "" : " is-soon"}">
        <a href="${href(s)}"${i === idx ? ' aria-current="page"' : ""}>
          <span class="sec-rail-no">${pad2(i + 1)}</span><span class="sec-rail-name">${s.title}</span>
        </a>
      </li>`).join("");
    rail.setAttribute("aria-label", `${eq.name} 섹션 ${total}개 중 ${idx + 1}번째`);
  });

  // 이전 / 장비 페이지로 / 다음
  const prev = eq.list[idx - 1], next = eq.list[idx + 1];
  const card = (s, i, dir) => s ? `
    <a class="sec-pager-link is-${dir}" href="${href(s)}" rel="${dir}">
      <span class="sec-pager-dir">${dir === "prev" ? "이전 섹션" : "다음 섹션"}</span>
      <span class="sec-pager-title"><span class="sec-pager-no">${pad2(i + 1)}</span>${s.title}</span>
      ${s.ready ? "" : '<span class="sec-pager-soon">준비 중</span>'}
    </a>` : `<span class="sec-pager-link is-empty" aria-hidden="true"></span>`;
  document.querySelectorAll("[data-sec-pager]").forEach((nav) => {
    nav.setAttribute("aria-label", "섹션 이동");
    nav.innerHTML = `
      <div class="sec-pager-inner">
        ${card(prev, idx - 1, "prev")}
        <a class="sec-pager-home" href="${root + eq.home}#sections">${eq.name} 장비 페이지로</a>
        ${card(next, idx + 1, "next")}
      </div>`;
  });
})();
