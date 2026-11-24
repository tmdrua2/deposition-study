// =============================================================
// 장비 섹션 하위 페이지 목록 + 공통 길잡이 (이전/다음, 진행 표시)
//
// 장비 페이지 본문은 섹션 카드 7개 → 각 섹션은 따로 된 하위 페이지 (equipment/pecvd/principle.html 등)
// 순서는 CLAUDE.md "장비 페이지 틀"과 같다. 섹션 목록·완성 여부(ready)는 js/pages.js의 EQUIP_SECTIONS 한 곳
// (장비 페이지 카드의 제목·설명 글은 HTML에 직접 있음, 카드 아래 상태 줄은 여기서 자동으로 채움)
//
// 하위 페이지 HTML 약속
//   <body data-equip="pecvd" data-section="principle">
//   <ol data-sec-rail></ol>    → 7칸 진행 표시 (지금 섹션 강조, 각 칸은 그 섹션 링크)
//   <nav data-sec-pager></nav> → 이전 섹션 / 장비 페이지로 / 다음 섹션
//   ready: false 인 섹션은 "준비 중"으로 표시
// main.js 다음에 불러온다 (ROOT 값을 씀)
// =============================================================

(function () {
  const body = document.body;
  // 고정 헤더 높이 → CSS 변수 --header-h (원리 페이지의 고정 그림이 헤더 바로 아래에 붙도록)
  const header = document.getElementById("site-header");
  const setHeaderH = () => { if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px"); };
  setHeaderH();
  window.addEventListener("resize", setHeaderH);
  const eq = typeof EQUIP_SECTIONS === "object" ? EQUIP_SECTIONS[body.dataset.equip] : null;
  if (!eq) return;
  // 장비 페이지(pecvd.html)의 섹션 카드: 아래 상태 줄을 완성 여부에 맞춤 (카드 li의 id = 섹션 id)
  eq.list.forEach((s) => {
    const state = document.querySelector(`.sec-card#${s.id} .sec-card-state`);
    if (!state) return;
    state.textContent = s.ready ? (s.card || "읽기") : "준비 중";
    state.classList.toggle("is-soon", !s.ready);
  });
  if (!body.dataset.section) return;
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

// =============================================================
// 머리 → 본문 전환 (하위 페이지 7개 공통)
//
// 한 면처럼 보이게: 남색 바탕·코랄 빛·세로 골유리(.sec-hero-bg)를 화면 뒤에 고정하고,
// 크림 면(.sec-sky-cover)이 부드러운 경계(투명 → 코랄 빛 → 크림)와 함께 아래에서 차오른다.
//   - 크림 면은 스크롤보다 조금 빠르게(RISE배) 올라와서 7칸 탭 뒤를 지나간다
//     → 탭 글자색을 뒤 배경 밝기에 맞춰 흰색 계열 ↔ 먹색으로 바꾼다 (대비 4.5 이상인 색만)
//   - 헤더도 같은 방법으로 남색 → 크림 (장비 페이지의 크림 전환과 같은 느낌)
//   - 큰 제목·설명은 크림이 다가오면 살짝 올라가며 사라짐
//   - 본문(main)의 맨 위는 항상 크림이 다 찬 곳 아래에 있다 (머리 아래쪽 --sky-fade 여백 덕분)
// 움직임 줄이기·?still=1 → 이 부분은 실행하지 않음 → CSS의 위→아래 그라데이션 정지 화면
// 스크롤 중에는 transform·opacity·CSS 변수 몇 개만 바꾼다 (레이아웃 다시 계산 없음)
// =============================================================
(function () {
  const body = document.body;
  const hero = document.querySelector(".sec-hero");
  const bg = hero && hero.querySelector(".sec-hero-bg");
  if (!bg || !body.classList.contains("sec-page")) return;
  let still = false;
  try { still = new URLSearchParams(location.search).get("still") === "1"; } catch (e) { /* 주소 못 읽으면 연출 */ }
  const reduceMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (still || (reduceMq && reduceMq.matches)) return;

  const RISE = 1.0;          // 크림 면이 스크롤보다 얼마나 더 빨리 올라오나 (1.0 = 두 배 속도)
  const TITLE_GONE = 0.45;   // 제목 위치의 크림 진행이 이 값이면 제목이 다 사라짐 (배경이 밝아지기 전에)

  body.classList.add("sec-live");
  const cover = document.createElement("div");
  cover.className = "sec-sky-cover";
  bg.appendChild(cover);
  const header = document.getElementById("site-header");
  const rail = hero.querySelector(".sec-rail-wrap");
  const fades = [...hero.querySelectorAll(".sec-back, .sec-kicker, .sec-title, .sec-lede")];

  // ---- 색 계산 도구: 배경 층(CSS와 같은 값)을 그대로 겹쳐 계산해서, 그 위 글자색을 고른다 ----
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const NAVY_DEEP = hex("#0C1529"), NAVY = hex("#14213D"), NAVY_LIFT = hex("#1E2C4E"), CREAM = hex("#F4EDE0");
  const ON_NAVY = hex("#F4EDE0"), ON_NAVY_MUTED = hex("#A9B1C2"), INK = hex("#1C2026"), MUTED = hex("#5F6670");
  const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  const CORAL = [255, 128, 104], GLOW = [255, 107, 91], SHADE = [12, 21, 41], REED_DARK = [6, 10, 24];
  // 크림 면 경계 (.sec-sky-cover): [위치 0~1, 색, 불투명도]
  const COVER = [[0, CORAL, 0], [0.4, CORAL, 0.30], [0.8, CREAM, 0.92], [1, CREAM, 1]];
  // 코랄 빛 (.sec-hero-glow, 가운데 → 가장자리): [거리 0~1, 불투명도]
  const GLOW_STOPS = [[0, 0.5], [0.4, 0.24], [0.7, 0.08], [1, 0]];
  // 골유리 위아래 그늘 (.stage-reed 두 번째 층): [화면 높이 비율, 불투명도]
  const VIGNETTE = [[0, 0.35], [0.3, 0], [0.75, 0], [1, 0.30]];
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const over = (base, c, a) => mix(base, c, a);          // 색 c를 불투명도 a로 덮기
  const css = (rgb) => `rgb(${rgb.map((v) => Math.round(v)).join(",")})`;
  const rgba = (rgb, a) => `rgba(${rgb.map((v) => Math.round(v)).join(",")},${a})`;
  const ramp = (stops, t) => {                            // [위치, 값] 목록에서 t 위치 값
    let k = 1;
    while (k < stops.length - 1 && t > stops[k][0]) k++;
    const [p0, v0] = stops[k - 1], [p1, v1] = stops[k];
    return v0 + (v1 - v0) * (p1 > p0 ? clamp01((t - p0) / (p1 - p0)) : 1);
  };
  // 골유리 줄: 가장 밝은 줄(흰 1px 선)과 가장 어두운 띠 → 글자색은 두 경우 모두에서 대비가 맞아야 함
  const reedExtremes = (c) => [over(c, WHITE, 0.07), over(c, REED_DARK, 0.20)];
  // 크림 면 진행 t에서의 색을 아래 색 위에 겹침 (CSS처럼 미리 곱한 알파로 보간)
  function coverOn(base, t) {
    let k = 1;
    while (k < COVER.length - 1 && t > COVER[k][0]) k++;
    const [p0, c0, a0] = COVER[k - 1], [p1, c1, a1] = COVER[k];
    const f = p1 > p0 ? clamp01((t - p0) / (p1 - p0)) : 1;
    const a = a0 + (a1 - a0) * f;
    const pre = c0.map((v, i) => v * a0 + (c1[i] * a1 - v * a0) * f);
    return pre.map((v, i) => v + base[i] * (1 - a));
  }
  let glowBox = null;   // 코랄 빛 상자 (화면 고정이라 크기 바뀔 때만 잼)
  // 화면 (x, y) 위치의 배경색 [가장 밝은 줄, 가장 어두운 띠]: 남색 → 아래쪽 밝은 남색 → 코랄 빛 → 골유리 그늘·줄 → 크림 면
  function skyColors(x, y, t) {
    let c = mix(NAVY_DEEP, NAVY, clamp01(y / (vh * 0.48)));
    const dl = Math.hypot((x - vw / 2) / (vw * 1.2), (y - vh * 1.08) / (vh * 0.8));
    c = over(c, NAVY_LIFT, clamp01(1 - dl / 0.62));
    if (glowBox) {
      const g = glowBox, d = Math.hypot((x - g.cx) / g.rx, (y - g.cy) / g.ry);
      c = over(c, GLOW, d < 1 ? ramp(GLOW_STOPS, d) : 0);
    }
    return reedExtremes(over(c, SHADE, ramp(VIGNETTE, clamp01(y / vh)))).map((v) => coverOn(v, t));
  }
  // 글자색 고르기: 주어진 배경색들 모두에서 대비 SAFE 이상인 색 (4.5 + 계산 오차 여유)
  //   크림 글자(남색 위) → 먹색 → 둘 다 안 되는 중간 밝기면 흰색·검정 중 대비가 큰 쪽 (이 밝기에서는 둘 중 하나가 4.5를 넘음)
  const SAFE = 5.5;
  const worst = (ink, bgs) => Math.min(...bgs.map((b) => contrast(ink, b)));
  //   경계 한가운데는 배경 밝기가 급하게 바뀌어서 글자 위·아래 끝 모두에 맞는 한 가지 색이 없을 수 있음
  //   → ok: false 이면 글자 둘레에 반대색 옅은 후광(halo)을 깔아 대비를 확보 (그 짧은 구간에서만)
  function pickInk(bgs) {
    if (worst(ON_NAVY, bgs) >= SAFE) return { ink: ON_NAVY, muted: ON_NAVY_MUTED, dark: true, ok: true };
    if (worst(INK, bgs) >= SAFE) return { ink: INK, muted: MUTED, dark: false, ok: true };
    const w = worst(WHITE, bgs), k = worst(BLACK, bgs);
    return w >= k ? { ink: WHITE, muted: WHITE, dark: true, ok: w >= SAFE } : { ink: BLACK, muted: BLACK, dark: false, ok: k >= SAFE };
  }
  const halo = (p) => {
    if (p.ok) return "none";
    const c = p.dark ? "rgba(12,21,41,0.9)" : "rgba(244,237,224,0.92)";
    return `0 0 1px ${c}, 0 0 1px ${c}, 0 0 2px ${c}, 0 0 3px ${c}, 0 0 5px ${c}, 0 0 9px ${c}, 0 0 16px ${c}`;
  };
  // 보조 글자색(번호 등): 대비가 모자라면 본 글자색 쪽으로 당김
  function safeMuted(p, bgs) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) { const c = mix(p.muted, p.ink, t); if (worst(c, bgs) >= SAFE) return c; }
    return p.ink;
  }

  // ---- 위치 재기 (처음, 화면 크기 바뀔 때, 글꼴 다 불러온 뒤) ----
  // 7칸 탭의 글자 줄들: 번호 줄과 이름 줄은 높이가 달라 뒤 배경 밝기가 다를 수 있음 → 줄마다 따로 색을 고름
  const tabSpans = rail ? [...rail.querySelectorAll(".sec-rail-no, .sec-rail-name")] : [];
  let F = 300, vw = innerWidth, vh = innerHeight, heroBottom = 0, hdrH = 72, fadeMids = [], tabBoxes = [];
  function measure() {
    const sy = window.scrollY;
    vw = document.documentElement.clientWidth;
    vh = innerHeight;
    hdrH = header ? header.offsetHeight : 72;
    F = parseFloat(getComputedStyle(hero).paddingBottom) || 300;   // 머리 아래 여백 = 번짐 높이
    cover.style.setProperty("--sky-f", F + "px");
    heroBottom = hero.getBoundingClientRect().bottom + sy;
    const glow = bg.querySelector(".sec-hero-glow");
    if (glow) { const g = glow.getBoundingClientRect(); glowBox = { cx: g.left + g.width / 2, cy: g.top + g.height / 2, rx: g.width / 2, ry: g.height / 2 }; }
    // 탭마다 글자가 있는 상자(문서 기준 위·아래, 화면 기준 좌·우)
    // 탭 글자 줄(번호·이름)마다 상자: 문서 기준 위·아래, 화면 기준 좌·우
    tabBoxes = tabSpans.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy, left: Math.max(0, r.left), right: Math.min(vw, r.right) };
    });
    fades.forEach((el) => { el.style.transform = ""; });
    fadeMids = fades.map((el) => { const r = el.getBoundingClientRect(); return r.top + sy + r.height / 2; });
    lastHdr = ""; tabKeys = []; lastLine = "";
    update();
  }

  let lastHdr = "", tabKeys = [], lastLine = "";
  function update() {
    const s = Math.max(0, window.scrollY);
    const solid = heroBottom - s * (1 + RISE);           // 화면에서 크림이 다 찬 줄
    const edge = solid - F;                               // 번짐이 시작되는 줄
    cover.style.transform = `translate3d(0,${Math.max(edge, -F).toFixed(1)}px,0)`;
    cover.style.setProperty("--sky-reed", clamp01(solid / (vh * 0.9)).toFixed(3));
    const tAt = (y) => clamp01((y - edge) / F);           // 화면 y에서의 크림 진행
    const both = (x, y) => skyColors(x, y, tAt(y));               // 글자색 고를 때: 밝은 줄·어두운 띠 둘 다
    const at = (x, y) => mix(...both(x, y), 0.5);                  // 헤더 배경 칠할 때: 줄무늬 평균에 가까운 색

    // 헤더: 뒤 배경과 똑같은 위→아래 그라데이션으로 칠함 → 헤더 아래쪽에 경계가 생기지 않음
    //   글자색은 로고·메뉴 높이(가운데 ±14px) 배경 모두에서 대비가 맞는 색. 아래 줄은 전환 중에는 숨김
    const cx = vw / 2;
    const hTop = at(cx, 0), hMid = at(cx, hdrH / 2), hBot = at(cx, hdrH);
    const hp = pickInk([hdrH / 2 - 14, hdrH / 2, hdrH / 2 + 14].map((y) => at(cx, y)));   // 헤더는 단색 그라데이션(줄무늬 없음)
    const settled = tAt(hdrH) === 0 || tAt(0) === 1;
    const hdrKey = css(hTop) + css(hBot) + css(hp.ink) + settled + hp.ok;
    if (hdrKey !== lastHdr) {
      lastHdr = hdrKey;
      body.style.setProperty("--hdr-bg", `linear-gradient(180deg, ${css(hTop)}, ${css(hMid)}, ${css(hBot)})`);
      body.style.setProperty("--hdr-ink", css(hp.ink));
      body.style.setProperty("--hdr-halo", halo(hp));
      body.style.setProperty("--hdr-line", settled ? rgba(hp.dark ? ON_NAVY : INK, hp.dark ? 0.10 : 0.12) : "transparent");
    }

    // 7칸 탭: 글자 줄마다 상자 네 모서리·가운데 배경을 보고 색을 고름 (빛 번짐이 오른쪽에만 있어도 맞게)
    //   --span-c = 평소 색(지금 섹션은 본 글자색, 나머지는 보조색), --span-hover = 마우스 올렸을 때, --span-halo = 후광
    let mid = null;
    tabBoxes.forEach((b, i) => {
      const y0 = b.top - s, y1 = b.bottom - s;
      const xm = (b.left + b.right) / 2, ym = (y0 + y1) / 2;
      const bgs = [[b.left, y0], [b.right, y0], [b.left, y1], [b.right, y1], [xm, ym], [xm, y0], [xm, y1]].flatMap(([x, y]) => both(x, y));
      const p = pickInk(bgs);
      const el = tabSpans[i];
      if (i === 6) mid = p;                                          // 가운데 칸(4번째) 번호 줄 → 위 가는 선·청록 선 기준
      const current = !!el.closest(".is-current");
      const color = current ? p.ink : safeMuted(p, bgs);
      const key = css(color) + css(p.ink) + p.ok;
      if (key === tabKeys[i]) return;
      tabKeys[i] = key;
      el.style.setProperty("--span-c", css(color));
      el.style.setProperty("--span-hover", css(p.ink));
      el.style.setProperty("--span-halo", halo(p));
    });
    if (mid) {
      const k = css(mid.ink);
      if (k !== lastLine) {
        lastLine = k;
        rail.style.setProperty("--rail-line", rgba(mid.ink, mid.dark ? 0.16 : 0.18));
        rail.style.setProperty("--rail-hover", rgba(mid.ink, 0.4));
        rail.style.setProperty("--rail-accent", mid.dark ? "var(--c-cvd-bright)" : "var(--c-cvd)");
      }
    }

    // 큰 제목·설명: 크림이 다가오면 올라가며 사라짐
    fades.forEach((el, i) => {
      const t = clamp01(tAt(fadeMids[i] - s) / TITLE_GONE);
      el.style.opacity = (1 - t).toFixed(3);
      el.style.transform = t > 0 ? `translate3d(0,${(-t * 18).toFixed(1)}px,0)` : "";
      el.style.visibility = t >= 1 ? "hidden" : "";   // 다 사라진 링크는 Tab 이동에서도 빠짐
    });
  }

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  const railList = rail && rail.querySelector(".sec-rail");
  if (railList) railList.addEventListener("scroll", measure, { passive: true });   // 휴대폰: 탭 줄을 옆으로 밀면 칸 위치가 바뀜
  if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(hero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener("load", measure);
  // 보는 중에 움직임 줄이기를 켜면 연출을 끄고 정지 화면으로 (다시 불러오는 것이 가장 단순)
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener("change", () => location.reload());
  measure();
})();
