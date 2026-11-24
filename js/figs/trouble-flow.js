// =============================================================
// 문제와 점검: 증상 고르기 → 점검 흐름도 펼치기 (equipment/pecvd/troubleshooting.html)
//
// HTML 약속
//   <div data-trouble>
//     <div class="tf-pick"></div>                 ← 증상 버튼을 여기에 만듦 (각 details의 summary 글을 그대로 씀)
//     <details class="tf" id="tf-…"> … </details> ← 증상 하나 = details 하나 (장비 페이지 틀 규칙)
//   </div>
// 동작
//   - 버튼을 누르면 그 증상의 details만 펼치고 나머지는 접은 뒤, 흐름도 시작 위치로 이동
//   - 주소 끝 #tf-particle 처럼 증상 id가 있으면 그 증상을 펼친 채로 시작
//   - 흐름도 안의 "C. 플라즈마 이상" 같은 링크(data-tf-go)도 같은 방식으로 다른 증상으로 건너뜀
//   - 움직임 줄이기·?still=1 → 처음부터 모두 펼침(내용이 다 보이게), 펼침 애니메이션·부드러운 이동 없음
//   - 스크립트가 꺼져 있으면 details를 하나씩 눌러 펼치면 됨
// =============================================================
(function () {
  "use strict";

  const root = document.querySelector("[data-trouble]");
  if (!root) return;
  const items = [...root.querySelectorAll("details.tf")];
  const pick = root.querySelector(".tf-pick");
  if (!items.length || !pick) return;

  let still = false;
  try { still = new URLSearchParams(location.search).get("still") === "1"; } catch (e) { /* 무시 */ }
  const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const calm = still || reduce;   // 정지 화면
  if (calm) root.classList.add("is-still");
  root.classList.add("is-js");    // 스크립트가 켜지면: 증상 버튼이 탭 역할, 접힌 증상은 숨김(정지 화면은 모두 펼쳐 보임)

  // ---------- 증상 버튼 만들기 ----------
  pick.innerHTML = items.map(d => {
    const key = d.querySelector(".tf-key").textContent;
    const name = d.querySelector(".tf-sum-name").textContent;
    const hint = d.querySelector(".tf-sum-hint").textContent;
    return `<button type="button" data-tf-open="${d.id}" aria-controls="${d.id}" aria-pressed="false">
      <span class="tf-key">${key}</span><span class="tf-pick-name">${name}</span><span class="tf-pick-hint">${hint}</span></button>`;
  }).join("");
  const buttons = [...pick.querySelectorAll("button")];

  // ---------- 흐름도 끝 "다른 증상 보기" (위로 올라가지 않고 바로 다른 증상으로) ----------
  //   각 증상 details 맨 아래에 나머지 증상 버튼을 작게 붙임. 누르면 위 증상 버튼과 똑같이 동작
  items.forEach(d => {
    const body = d.querySelector(".tf-body") || d;
    const box = document.createElement("div");
    box.className = "tf-switch";
    box.innerHTML = `<p class="tf-switch-title">다른 증상 보기</p><div class="tf-switch-row">` +
      items.filter(o => o !== d).map(o =>
        `<button type="button" data-tf-open="${o.id}" aria-controls="${o.id}"><span class="tf-key">${o.querySelector(".tf-key").textContent}</span>${o.querySelector(".tf-sum-name").textContent}</button>`
      ).join("") + `</div>`;
    body.appendChild(box);
  });
  const hint = document.createElement("p");
  hint.className = "tf-hint";
  hint.textContent = "위에서 증상을 하나 고르면 점검 흐름도가 여기에 펼쳐집니다.";
  pick.after(hint);

  // 버튼의 눌림 표시를 details 열림 상태와 맞춤
  function sync() {
    buttons.forEach(b => {
      const d = document.getElementById(b.dataset.tfOpen);
      b.setAttribute("aria-pressed", d && d.open ? "true" : "false");
    });
    hint.hidden = items.some(d => d.open);
  }

  // 헤더에 가리지 않게, details 머리가 헤더 바로 아래 오도록 이동
  function scrollToItem(d) {
    const header = document.getElementById("site-header");
    const top = d.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0) - 12;
    window.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
  }

  // 한 증상만 펼치기 (정지 화면에서는 나머지를 접지 않음 — 모두 보이게)
  function openOnly(id, scroll) {
    const target = document.getElementById(id);
    if (!target || !items.includes(target)) return;
    items.forEach(d => { if (d === target) d.open = true; else if (!calm) d.open = false; });
    sync();
    if (scroll) scrollToItem(target);
  }

  pick.addEventListener("click", ev => {
    const b = ev.target.closest("[data-tf-open]");
    if (b) openOnly(b.dataset.tfOpen, true);
  });
  root.addEventListener("click", ev => {
    const sw = ev.target.closest(".tf-switch [data-tf-open]");
    if (sw) {
      openOnly(sw.dataset.tfOpen, true);
      try { history.replaceState(null, "", "#" + sw.dataset.tfOpen); } catch (e) { /* 무시 */ }
      return;
    }
    const a = ev.target.closest("[data-tf-go]");
    if (!a) return;
    ev.preventDefault();
    openOnly(a.dataset.tfGo, true);
    try { history.replaceState(null, "", "#" + a.dataset.tfGo); } catch (e) { /* 파일 직접 열기 등에서 실패해도 무시 */ }
  });
  items.forEach(d => d.addEventListener("toggle", sync));

  // ---------- 처음 상태 ----------
  const hashId = decodeURIComponent((location.hash || "").slice(1));
  if (calm) items.forEach(d => { d.open = true; });
  if (hashId && items.some(d => d.id === hashId)) {
    openOnly(hashId, false);
    // 페이지가 다 그려진 뒤(머리 연출 높이 확정 후) 그 증상으로 이동
    window.addEventListener("load", () => scrollToItem(document.getElementById(hashId)));
  }
  sync();
})();
