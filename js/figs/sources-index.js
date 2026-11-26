// =============================================================
// 출처 모음 + [검증 필요] 모음 (equipment/pecvd/sources.html · equipment/ald/sources.html — body의 data-equip로 장비를 고름)
//
// 데이터에서 자동으로 만든다 (js/figs/collect.js)
//   [data-src-stats]  : 한눈에 보기 숫자 (공개 특허 · 일반 교과서 · 기타 · 검증 필요)
//   [data-src-list]   : 출처 목록 — 종류별(공개 특허 / 일반 교과서 / 기타), 같은 자료는 하나로, 쓰인 패널·페이지 링크
//   [data-verify-list]: [검증 필요] 문장 — 모듈·페이지별 details, 각 문장에 원래 위치 링크 + "대조함" 표시(브라우저 저장)
// =============================================================
(function () {
  "use strict";

  if (!window.SiteCollect) return;
  // 어느 장비의 출처를 모을지: <body data-equip="ald"> (없으면 pecvd) — 장비마다 같은 출처 페이지 틀을 씀
  const C = SiteCollect.make((document.body && document.body.dataset.equip) || "pecvd");
  if (!C) return;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STORE = "deposition:verify-checked";

  const sources = C.sources();
  const groups = C.verify();
  const GROUPS = [
    { id: "patent",   title: "공개 특허",   en: "Patents",   desc: "Google Patents에서 직접 열어 확인한 공개 특허·특허 출원 (확인 날짜 표시)" },
    { id: "textbook", title: "일반 교과서", en: "Textbooks", desc: "직접 대조하지 않은 교과서 수준 지식 — 어느 패널·페이지에서 어떤 주제로 썼는지" },
    { id: "other",    title: "기타",       en: "Others",    desc: "위키백과·공개 리뷰 논문(확인 날짜 표시) · 시험기관 공개 글 · 일반 현장 지식" }
  ];
  const by = id => sources.filter(s => s.group === id);
  const verifyTotal = groups.reduce((a, g) => a + g.items.length, 0);
  // 교과서·현장 지식은 "자료 1개"가 아니라 주제(쓰인 곳)마다 따로 적었으므로 주제 수로 셈
  const countOf = id => id === "textbook" ? by(id).reduce((a, s) => a + s.uses.length, 0) : by(id).length;
  const unitOf = id => id === "textbook" ? "주제" : "건";

  // ---------- 한눈에 보기 ----------
  const stats = document.querySelector("[data-src-stats]");
  if (stats) {
    const usedIn = new Set(sources.flatMap(s => s.uses.map(u => u.href))).size;
    stats.innerHTML = GROUPS.map(g => `
      <li><a href="#src-${g.id}"><span class="src-stat-n">${countOf(g.id)}</span><span class="src-stat-k">${g.title}${g.id === "textbook" ? " · 주제" : ""}</span><span class="src-stat-en">${g.en}</span></a></li>`).join("") + `
      <li class="is-verify"><a href="#verify"><span class="src-stat-n">${verifyTotal}</span><span class="src-stat-k">[검증 필요] 문장</span><span class="src-stat-en">${groups.length}개 모듈·페이지</span></a></li>
      <li class="is-note"><p>출처가 쓰인 패널·페이지 <strong>${usedIn}</strong>곳 · 같은 자료는 하나로 합쳐 셌습니다.</p></li>`;
  }

  // ---------- 출처 목록 ----------
  const list = document.querySelector("[data-src-list]");
  if (list) {
    list.innerHTML = GROUPS.map(g => {
      const items = by(g.id);
      // 특허는 번호순, 나머지는 쓰인 곳이 많은 순
      if (g.id === "patent") items.sort((a, b) => a.title.localeCompare(b.title));
      else items.sort((a, b) => b.uses.length - a.uses.length);
      return `
      <section class="src-group" aria-labelledby="src-${g.id}">
        <h3 id="src-${g.id}" class="src-group-title">${g.title} <span class="src-count">${countOf(g.id)}${unitOf(g.id)}</span></h3>
        <p class="src-group-desc">${g.desc}</p>
        <ol class="src-items">${items.map(item).join("")}</ol>
      </section>`;
    }).join("");
  }

  // ---------- 페이지·패널별로 묶어 보기 [data-src-bypage] (있을 때만) ----------
  //   같은 자료를 "어디에서 썼나" 기준으로 뒤집어 보여 줌: 섹션 페이지 → 부품 패널 → 기초 페이지 순
  const byPage = document.querySelector("[data-src-bypage]");
  if (byPage) {
    const places = new Map();
    sources.forEach(s => s.uses.forEach(u => {
      if (!places.has(u.href)) places.set(u.href, { label: u.label, href: u.href, items: [] });
      places.get(u.href).items.push({ s, note: u.note });
    }));
    const rank = p => (/#page-sources$/.test(p.href) ? (/basics\//.test(p.href) ? 2 : 0) : 1);
    const KINDS = ["섹션 페이지", "부품 패널", "기초 페이지"];
    const all = [...places.values()].sort((a, b) => rank(a) - rank(b));
    byPage.innerHTML = all.map(p => `
      <details class="vf-group src-place">
        <summary><span class="vf-g-name"><span class="src-place-k">${KINDS[rank(p)]}</span>${esc(p.label)}</span><span class="vf-g-count">${p.items.length}</span></summary>
        <ul class="src-place-items">${p.items.map(({ s, note }) => `
          <li><span class="src-place-kind">${esc(s.kind)}</span>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>` : `<span>${esc(s.title)}</span>`}${s.checked ? ` <span class="src-checked">${esc(s.checked)} 확인</span>` : ""}${note ? `<span class="src-note">${esc(note)}</span>` : ""}</li>`).join("")}</ul>
        <p class="vf-open"><a href="${esc(p.href)}">이 곳으로 가기 →</a></p>
      </details>`).join("");
  }

  function item(s) {
    const many = s.uses.length > 1;
    const title = s.url ? `<a class="src-title" href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a>` : `<span class="src-title">${esc(s.title)}</span>`;
    // 쓰인 곳 + 그곳에서 확인한 내용(메모). 메모가 같은 곳끼리는 겹쳐 쓰지 않음
    const uses = s.uses.map(u => `
      <li><a class="src-use" href="${esc(u.href)}">${esc(u.label)}</a>${u.note ? `<span class="src-note">${esc(u.note)}</span>` : ""}</li>`).join("");
    return `
      <li class="src-item${many ? " is-many" : ""}">
        <div class="src-head">${title}${s.checked ? `<span class="src-checked">${esc(s.checked)} 확인</span>` : ""}</div>
        <p class="src-uses-title">쓰인 곳 ${s.uses.length}</p>
        <ul class="src-uses">${uses}</ul>
      </li>`;
  }

  // ---------- [검증 필요] 모음 ----------
  const vf = document.querySelector("[data-verify-list]");
  if (!vf) return;
  let checked = {};
  try { checked = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { checked = {}; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(checked)); } catch (e) { /* 저장 안 되는 환경: 무시 */ } };
  const keyOf = (g, it) => `${g.id}|${it.text}`;

  const KIND = { panel: "부품 패널", page: "섹션 페이지", basics: "기초 페이지" };
  let n = 0;
  vf.innerHTML = `
    <div class="vf-tools">
      <p class="vf-sum" aria-live="polite"></p>
      <button type="button" class="vf-btn" data-vf-all>모두 펼치기</button>
    </div>` +
    ["panel", "page", "basics"].map(kind => {
      const gs = groups.filter(g => g.kind === kind);
      if (!gs.length) return "";
      return `<h3 class="vf-kind">${KIND[kind]}</h3>` + gs.map(g => `
      <details class="vf-group" data-group="${esc(g.id)}">
        <summary><span class="vf-g-name">${esc(g.label)}</span><span class="vf-g-count"><span data-vf-left></span> / ${g.items.length}</span></summary>
        <ol class="vf-items">${g.items.map(it => {
          const id = `vf-${n++}`;
          const k = keyOf(g, it);
          return `
          <li class="vf-item" data-key="${esc(k)}">
            <p class="vf-text">${esc(it.text)}</p>
            <p class="vf-meta"><span class="vf-where">${esc(it.where || "")}</span>
              <a class="vf-go" href="${esc(it.href)}">원래 위치 →</a>
              <label class="vf-check" for="${id}"><input type="checkbox" id="${id}"${checked[k] ? " checked" : ""}> 대조함</label></p>
          </li>`;
        }).join("")}</ol>
        <p class="vf-open"><a href="${esc(g.href)}">${g.kind === "panel" ? "패널 열기" : "페이지 열기"} →</a></p>
      </details>`).join("");
    }).join("");

  function sync() {
    let done = 0;
    vf.querySelectorAll(".vf-group").forEach(d => {
      const boxes = [...d.querySelectorAll(".vf-item")];
      const ok = boxes.filter(li => checked[li.dataset.key]).length;
      done += ok;
      boxes.forEach(li => li.classList.toggle("is-checked", !!checked[li.dataset.key]));
      d.querySelector("[data-vf-left]").textContent = ok;
      d.classList.toggle("is-complete", ok === boxes.length);
    });
    vf.querySelector(".vf-sum").textContent = `전체 ${verifyTotal}문장 중 대조함 ${done}`;
  }
  vf.addEventListener("change", e => {
    const li = e.target.closest(".vf-item");
    if (!li) return;
    if (e.target.checked) checked[li.dataset.key] = 1; else delete checked[li.dataset.key];
    save();
    sync();
  });
  const allBtn = vf.querySelector("[data-vf-all]");
  allBtn.addEventListener("click", () => {
    const ds = [...vf.querySelectorAll(".vf-group")];
    const open = !ds.every(d => d.open);
    ds.forEach(d => { d.open = open; });
    allBtn.textContent = open ? "모두 접기" : "모두 펼치기";
  });
  sync();

  // 주소 끝이 #verify면 첫 묶음을 펼쳐 둠
  if (location.hash === "#verify") { const f = vf.querySelector(".vf-group"); if (f) f.open = true; }
})();
