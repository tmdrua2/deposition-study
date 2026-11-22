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
// 펼침 아이콘 (⌄)
const CHEVRON = `<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// 섹션에 속한 페이지 목록
// (hidden: true 인 페이지 = 하위 페이지 → 목차·메뉴에는 안 보이고 검색에만 나옴)
function pagesOf(sectionId) {
  return PAGES.filter((p) => p.section === sectionId && !p.hidden);
}

// ---------- 1) 헤더 + 전체 화면 메뉴 ----------
function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="${ROOT}index.html">증착 공정 노트</a>
      <button class="menu-btn" type="button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="site-menu">
        <span></span><span></span><span></span>
      </button>
    </div>`;

  // 메뉴 안 항목: 실습 기록을 뺀 섹션은 ⌄로 펼치는 목록
  const groups = SECTIONS.filter((s) => s.id !== "lab").map((sec, i) => {
    const links = pagesOf(sec.id)
      .map((p) => `<li><a href="${ROOT + p.path}">${p.title}</a></li>`)
      .join("");
    return `
      <li class="menu-group">
        <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="menu-panel-${i}">
          <span>${sec.title}<small>${sec.en}</small></span>${CHEVRON}
        </button>
        <div class="menu-panel" id="menu-panel-${i}"><ul>${links}</ul></div>
      </li>`;
  }).join("");

  const lab = pagesOf("lab")[0];
  const menu = document.createElement("div");
  menu.id = "site-menu";
  menu.className = "site-menu";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-label", "전체 메뉴");
  menu.innerHTML = `
    <div class="menu-top">
      <a class="logo" href="${ROOT}index.html">증착 공정 노트</a>
      <button class="menu-close" type="button" aria-label="메뉴 닫기">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
    </div>
    <ul class="menu-list">${groups}</ul>
    <div class="menu-bars">
      ${lab ? `<a class="menu-bar is-accent" href="${ROOT + lab.path}">내 실습 기록${ARROW}</a>` : ""}
      <a class="menu-bar" href="${ROOT}index.html#toc">전체 목차 보기${ARROW}</a>
    </div>`;
  document.body.appendChild(menu);

  const openBtn = header.querySelector(".menu-btn");
  const closeBtn = menu.querySelector(".menu-close");

  function setOpen(open) {
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open); // 뒤쪽 페이지 스크롤 막기
    openBtn.setAttribute("aria-expanded", String(open));
    if (open) closeBtn.focus();
    else openBtn.focus();
  }
  openBtn.addEventListener("click", () => setOpen(true));
  closeBtn.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) setOpen(false);
  });
  // 메뉴 안 링크를 누르면 메뉴 닫기 (같은 페이지 안 #이동일 때 필요)
  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      openBtn.setAttribute("aria-expanded", "false");
    })
  );
  // ⌄ 누르면 하위 페이지 펼치기/접기
  menu.querySelectorAll(".menu-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      btn.parentElement.classList.toggle("is-open", open);
    })
  );
}

// ---------- 2) 메인 페이지 카테고리 카드 ----------
// 카드 배경에 깔리는 은은한 선 그림 (흰 선, 낮은 투명도)
function cardPattern(id) {
  let shapes = "";
  if (id === "basics") {
    // 웨이퍼: 큰 원 + 칩 격자 + 아래쪽 노치
    let dies = "";
    for (let x = 300; x < 620; x += 26) {
      for (let y = 40; y < 360; y += 26) {
        const cx = x + 13 - 460, cy = y + 13 - 200;
        if (cx * cx + cy * cy < 140 * 140) dies += `<rect x="${x + 2}" y="${y + 2}" width="22" height="22" rx="1.5"/>`;
      }
    }
    shapes = `<circle cx="460" cy="200" r="165" stroke-width="1.4"/><circle cx="460" cy="200" r="185" opacity=".5"/>${dies}`;
  } else if (id === "equipment") {
    // 동심원 호: 플라즈마·박막 층 느낌
    for (let r = 40; r <= 400; r += 14) shapes += `<circle cx="560" cy="360" r="${r}"/>`;
  } else if (id === "companies") {
    // 완만한 곡선 다발
    for (let i = 0; i < 16; i++) {
      const y = 60 + i * 16;
      shapes += `<path d="M120 ${y + 120} C 260 ${y - 40}, 420 ${y + 160}, 640 ${y}"/>`;
    }
  } else {
    // 실습 기록: 웨이퍼 윤곽 + 쌓인 막(가로선)
    shapes = `<circle cx="470" cy="230" r="150"/><circle cx="470" cy="230" r="120" opacity=".6"/>`;
    for (let y = 250; y < 400; y += 9) shapes += `<path d="M260 ${y} H 640" opacity=".55"/>`;
  }
  return `<svg class="card-bg" viewBox="0 0 640 400" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
    <g fill="none" stroke="#fff" stroke-width="1">${shapes}</g></svg>`;
}

function renderToc() {
  const toc = document.getElementById("toc");
  if (!toc) return;

  toc.innerHTML = SECTIONS.map((sec) => {
    const pages = pagesOf(sec.id);
    if (!pages.length) return "";
    // 카드 제목(영문 + →)은 섹션의 첫 페이지로 이동
    // 페이지가 여러 개인 섹션은 아래에 알약 버튼을 하나씩 더 둠
    const single = pages.length === 1;
    const pills = single ? "" : `<ul class="pills">${pages
      .map((p) => `<li><a class="pill" href="${ROOT + p.path}">${p.short || p.title}${ARROW}</a></li>`)
      .join("")}</ul>`;
    const head = `<h3 class="card-title">${sec.en}${ARROW}</h3><p class="card-desc">${sec.desc}</p>`;
    return `
      <section class="cat-card card-${sec.id}${single ? " is-small" : ""}" id="${sec.id}" aria-label="${sec.title}">
        ${cardPattern(sec.id)}
        <a class="card-link" href="${ROOT + pages[0].path}">${head}</a>${pills}
      </section>`;
  }).join("");
}

// ---------- 메인 페이지 장비 목록 (단순한 선 그림) ----------
// 색: 선=남색, 면=연회색, 포인트=하늘색. viewBox는 모두 160×120
const EQUIP_ART = {
  // PVD: 위쪽 타겟(진한 판)에서 원자가 튀어나와 아래 웨이퍼에 쌓임
  "equipment/pvd.html": `
    <rect x="30" y="14" width="100" height="92" rx="6" class="f-body"/>
    <rect x="44" y="22" width="72" height="10" rx="2" class="f-ink"/>
    <path d="M52 36v4M68 36v4M92 36v4M108 36v4" class="s-thin"/>
    <circle cx="60" cy="54" r="2" class="f-sky"/><circle cx="80" cy="48" r="2" class="f-sky"/>
    <circle cx="98" cy="60" r="2" class="f-sky"/><circle cx="72" cy="68" r="2" class="f-sky"/><circle cx="90" cy="74" r="2" class="f-sky"/>
    <rect x="48" y="84" width="64" height="4" rx="1" class="f-ink"/>
    <rect x="56" y="88" width="48" height="10" class="f-line"/>
    <path d="M30 60h-12M130 60h12" class="s-line"/>`,
  // PECVD: 가스 관 → 샤워헤드(구멍) → 플라즈마 → 히터 위 웨이퍼
  "equipment/pecvd.html": `
    <path d="M80 4v14" class="s-line"/>
    <rect x="28" y="18" width="104" height="88" rx="6" class="f-body"/>
    <rect x="40" y="26" width="80" height="8" rx="2" class="f-line"/>
    <path d="M48 38v5M58 38v5M68 38v5M78 38v5M88 38v5M98 38v5M108 38v5" class="s-sky"/>
    <path d="M44 56c12-6 24 6 36 0s24 6 36 0M44 64c12-6 24 6 36 0s24 6 36 0" class="s-sky s-thin"/>
    <rect x="48" y="80" width="64" height="4" rx="1" class="f-ink"/>
    <rect x="44" y="84" width="72" height="12" rx="2" class="f-line"/>
    <path d="M52 100h56" class="s-thin"/>`,
  // ALD: 전구체 A·B를 번갈아 넣는 펄스 + 한 층씩 쌓인 막
  "equipment/ald.html": `
    <rect x="22" y="20" width="116" height="60" rx="6" class="f-body"/>
    <path d="M6 36h16M6 50h16" class="s-line"/>
    <circle cx="10" cy="36" r="3" class="f-ink"/><circle cx="10" cy="50" r="3" class="f-sky"/>
    <rect x="42" y="56" width="76" height="4" rx="1" class="f-ink"/>
    <rect x="42" y="52" width="76" height="3" class="f-sky"/>
    <rect x="42" y="48" width="76" height="3" class="f-ink-soft"/>
    <rect x="42" y="44" width="76" height="3" class="f-sky"/>
    <rect x="46" y="60" width="68" height="10" class="f-line"/>
    <path d="M22 104h12v-12h10v12h12v-12h10v12h12v-12h10v12h12v-12h10v12h18" class="s-line"/>`,
  // Epi: 램프 히터 사이 석영관, 서셉터 위 웨이퍼에 결정(점 격자)
  "equipment/epi.html": `
    <rect x="20" y="40" width="120" height="40" rx="20" class="f-body"/>
    <g class="f-sky"><circle cx="34" cy="26" r="5"/><circle cx="56" cy="26" r="5"/><circle cx="78" cy="26" r="5"/><circle cx="100" cy="26" r="5"/><circle cx="122" cy="26" r="5"/>
    <circle cx="34" cy="94" r="5"/><circle cx="56" cy="94" r="5"/><circle cx="78" cy="94" r="5"/><circle cx="100" cy="94" r="5"/><circle cx="122" cy="94" r="5"/></g>
    <rect x="46" y="62" width="68" height="8" rx="2" class="f-line"/>
    <rect x="50" y="58" width="60" height="4" class="f-ink"/>
    <g class="f-ink"><circle cx="56" cy="53" r="1.4"/><circle cx="64" cy="53" r="1.4"/><circle cx="72" cy="53" r="1.4"/><circle cx="80" cy="53" r="1.4"/><circle cx="88" cy="53" r="1.4"/><circle cx="96" cy="53" r="1.4"/><circle cx="104" cy="53" r="1.4"/></g>`,
  // ECD: 도금액이 담긴 조, 위에서 웨이퍼를 담그고 아래 양극(+)
  "equipment/ecd.html": `
    <path d="M80 6v18" class="s-line"/>
    <rect x="44" y="24" width="72" height="8" rx="2" class="f-line"/>
    <rect x="50" y="32" width="60" height="4" class="f-ink"/>
    <path d="M26 30v70a6 6 0 0 0 6 6h96a6 6 0 0 0 6-6V30" class="f-body"/>
    <path d="M28 50h104v50a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4z" class="f-sky-soft"/>
    <rect x="52" y="90" width="56" height="6" rx="1" class="f-ink"/>
    <g class="f-sky"><circle cx="62" cy="70" r="2"/><circle cx="80" cy="62" r="2"/><circle cx="96" cy="74" r="2"/><circle cx="72" cy="80" r="2"/><circle cx="90" cy="56" r="2"/></g>
    <path d="M140 92h8M144 88v8M124 12h8" class="s-line"/>`,
};

function renderEquipList() {
  const list = document.getElementById("equip-list");
  if (!list) return;
  list.innerHTML = pagesOf("equipment").map((p) => `
    <li class="equip-item">
      <a href="${ROOT + p.path}">
        <div class="equip-art"><svg viewBox="0 0 160 120" aria-hidden="true">${EQUIP_ART[p.path] || ""}</svg></div>
        <strong>${p.short || p.title}</strong>
        <span>${p.desc || ""}</span>
      </a>
    </li>`).join("");
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

// ---------- 메인 첫 화면: 점·선 네트워크 구 ----------
// 구 표면에 점을 고르게 뿌리고(피보나치 배치), 가까운 점끼리 선으로 잇습니다.
// 매 프레임 조금씩 옆으로 돌려서 2D 화면에 그립니다. 뒤쪽 점·선은 더 흐리게.
function setupSphere() {
  const box = document.getElementById("sphere");
  if (!box) return;

  const N = 72;              // 점 개수
  const SIZE = 400, R = 180; // 그림 크기, 구 반지름
  const pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = i * Math.PI * (3 - Math.sqrt(5)); // 황금각
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  // 각 점에서 가장 가까운 3개와 연결 (중복 제거)
  const edges = new Set();
  pts.forEach((a, i) => {
    pts.map((b, j) => [j, (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2])
      .filter(([j]) => j !== i)
      .sort((m, n) => m[1] - n[1])
      .slice(0, 3)
      .forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const pairs = [...edges].map((e) => e.split("-").map(Number));

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
  const lines = pairs.map(() => svg.appendChild(document.createElementNS(NS, "line")));
  // 점 몇 개는 남색 포인트로
  const dots = pts.map((_, i) => {
    const c = svg.appendChild(document.createElementNS(NS, "circle"));
    if (i % 9 === 0) c.classList.add("is-ink");
    return c;
  });
  box.appendChild(svg);

  const TILT = 0.38; // 앞으로 살짝 기울임 (라디안)
  function draw(angle) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const ct = Math.cos(TILT), st = Math.sin(TILT);
    const proj = pts.map(([x, y, z]) => {
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca;   // 세로축 회전
      const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;  // 기울임
      return [SIZE / 2 + x1 * R, SIZE / 2 + y2 * R, z2];
    });
    pairs.forEach(([i, j], k) => {
      const a = proj[i], b = proj[j], l = lines[k];
      l.setAttribute("x1", a[0].toFixed(1)); l.setAttribute("y1", a[1].toFixed(1));
      l.setAttribute("x2", b[0].toFixed(1)); l.setAttribute("y2", b[1].toFixed(1));
      l.style.opacity = (0.35 + 0.65 * ((a[2] + b[2]) / 4 + 0.5)).toFixed(2);
    });
    proj.forEach(([x, y, z], i) => {
      const d = dots[i];
      d.setAttribute("cx", x.toFixed(1)); d.setAttribute("cy", y.toFixed(1));
      d.setAttribute("r", (2 + z * 1.2).toFixed(2));
      d.style.opacity = (0.35 + 0.65 * (z / 2 + 0.5)).toFixed(2);
    });
  }

  if (REDUCE_MOTION) { draw(0.6); return; } // 움직임 줄이기: 멈춘 그림 한 장
  let start = null;
  function frame(t) {
    if (start === null) start = t;
    draw(((t - start) / 1000) * 0.12); // 1초에 0.12라디안 → 약 52초에 한 바퀴
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
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
  if (REDUCE_MOTION || !("IntersectionObserver" in window)) return;
  const main = document.querySelector("main");
  if (!main) return;
  // 섹션 카드·섹션 하위 페이지는 자체 디자인이라 나타나기 효과를 쓰지 않음
  if (main.matches(".sec-hub-main, .sec-main")) return;

  const targets = main.classList.contains("home")
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
  const update = () => btn.classList.toggle("is-shown", window.scrollY > 400 && !stageFills());
  window.addEventListener("scroll", update, { passive: true });
  update();
}

renderHeader();
renderToc();
renderEquipList();
setupSearch();
setupSphere();
renderPageHead();
renderPageToc();
setupReveal();
setupToTop();
