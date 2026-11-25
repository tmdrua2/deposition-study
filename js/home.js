// =============================================================
// 표지(index.html) — 장비 진열 무대 + 아래 목차
//
//   1) 장비 진열: js/main.js의 MENU_GROUPS "증착 장비" 목록으로 자동 생성
//      · 완성(done) 장비 = 링크 + 또렷한 그림 / 그 밖 = "준비 중" + 안개 낀 그림 (누를 수 없음)
//      · 그림: 완성 장비는 장비 페이지와 같은 데이터(data/pecvd.js), 나머지는 data/lineup.js
//        → 같은 렌더러(render-iso.js), 같은 바닥선·조명
//      · 표지에서는 서브팹(아래층) 펌프·배기관을 빼고 팹 바닥 위 장비만 그림 (모두 같은 바닥에 서도록)
//      · 바닥 반사: 그린 그림을 한 번 더 복사해 위아래로 뒤집어 아주 옅게 (CSS가 흐리게 처리)
//   2) 상단 바 색이 스크롤 위치의 배경색에 맞춰 바뀜 (body[data-hdr])
//   3) 깊이감: 넓은 화면 + 마우스일 때만, 마우스 위치에 따라 배경 < 글자 < 뒤 장비 < 앞 장비 순으로
//      조금씩 더 움직임. 움직임 줄이기·?still=1·데이터 절약이면 끔
//   4) 아래 목차: 기초 / 장비사·실습 기록 — 같은 MENU_GROUPS에서 생성
//   마우스를 올리면 바탕이 물드는 효과는 CSS(:has)만으로 처리
// =============================================================
(function () {
  "use strict";
  if (typeof MENU_GROUPS === "undefined") return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const toneOf = (path) => path.split("/").pop().replace(".html", "");     // equipment/ald.html → ald
  const groupOf = (title) => MENU_GROUPS.find((g) => g.title === title);

  // ---------- 1) 장비 진열 ----------
  const lineup = document.getElementById("lineup");
  const equip = groupOf("증착 장비");
  if (lineup && equip) {
    lineup.innerHTML = equip.items.map((it) => {
      const st = menuState(it).status;
      const ready = st === "done";
      const tone = toneOf(it.path);
      const inner = `
        <span class="slot-depth">
          <span class="slot-glow" aria-hidden="true"></span>
          <span class="slot-shadow" aria-hidden="true"></span>
          <span class="slot-fig" data-equip="${tone}"></span>
          <span class="slot-reflect" aria-hidden="true"></span>
        </span>
        <span class="slot-label">
          <span class="slot-abbr">${esc(tone === "ecd" ? "ECD" : it.name)}</span>
          <span class="slot-ko">${esc(PAGES.find((p) => p.path === it.path)?.desc || it.en)}</span>
          <span class="slot-status${ready ? " is-done" : ""}">${ready ? "완성 · 보러 가기" : "준비 중"}</span>
        </span>`;
      return ready
        ? `<li class="slot is-ready" data-tone="${tone}"><a class="slot-link" href="${ROOT + it.path}">${inner}</a></li>`
        : `<li class="slot is-soon" data-tone="${tone}"><div class="slot-link" title="준비 중인 장비입니다">${inner}</div></li>`;
    }).join("");
  }

  // ---------- 아래 목차: 기초 / 장비사·실습 기록 ----------
  const STATUS = { done: "완성", wip: "작성 중", soon: "준비 중" };
  function renderIndex(id, group) {
    const box = document.getElementById(id);
    if (!box || !group) return;
    box.innerHTML = group.items.map((it) => {
      const st = menuState(it).status;
      return `
        <li><a class="ix-row" href="${ROOT + it.path}">
          <span class="ix-name">${esc(it.name)}</span>
          <span class="ix-en">${esc(it.en)}</span>
          <span class="ix-desc">${esc(it.desc)}</span>
          <span class="ix-status is-${st}">${STATUS[st]}</span>
        </a></li>`;
    }).join("");
  }
  renderIndex("index-basics", groupOf("기초"));
  renderIndex("index-more", groupOf("더보기"));

  // ---------- 그림 그리기 ----------
  if (!window.IsoRender) return;

  // 표지용: 팹 바닥 아래(서브팹)에 있는 부품과 그 자식·복사본, 아래로 내려가는 배관을 뺀다
  function aboveFloor(eq) {
    const drop = new Set();
    eq.parts.forEach((p) => {
      if (!p.parent && p.pos && p.pos[2] < 0) drop.add(p.id);
      if (p.shape === "pipe" && p.path && p.path.some((pt) => pt[2] < 0)) drop.add(p.id);
    });
    let grew = true;
    while (grew) {
      grew = false;
      eq.parts.forEach((p) => {
        if (drop.has(p.id)) return;
        if ((p.parent && drop.has(p.parent)) || (p.copyOf && drop.has(p.copyOf))) { drop.add(p.id); grew = true; }
      });
    }
    return Object.assign({}, eq, { site: null, parts: eq.parts.filter((p) => !drop.has(p.id)) });
  }
  function dataOf(id) {
    if (window.EQUIPMENT && window.EQUIPMENT[id]) return aboveFloor(window.EQUIPMENT[id]);
    if (window.EQUIPMENT_LINEUP && window.EQUIPMENT_LINEUP[id]) return window.EQUIPMENT_LINEUP[id];
    return null;
  }

  // 그림틀 크기에 맞춰 장면 크기·위치: 조립된 장비 몸체가 틀 폭·높이 안에 들어가고, 바닥(맨 아래 점)이 틀 아래 끝에 닿게
  function place(scene, f, w, h) {
    const vb = f.info.viewBox, body = f.info.assembledBody;
    const s = Math.min(w / (body[2] - body[0]), h / (body[3] - body[1]));
    scene.style.width = vb[2] * s + "px";
    scene.style.height = vb[3] * s + "px";
    scene.style.left = w / 2 - ((body[0] + body[2]) / 2 - vb[0]) * s + "px";
    scene.style.top = h - (body[3] - vb[1]) * s + "px";
  }
  const figs = [];
  function fit(f) {
    const w = f.box.clientWidth, h = f.box.clientHeight;
    if (!w || !h) return;
    place(f.scene, f, w, h);
    if (f.mirror) place(f.mirror, f, w, h);
  }

  document.querySelectorAll(".slot-fig[data-equip]").forEach((box) => {
    const eq = dataOf(box.dataset.equip);
    if (!eq) return;
    const scene = document.createElement("div");
    scene.className = "lineup-scene";
    box.appendChild(scene);
    try {
      const info = IsoRender.render(scene, eq, window.EQUIPMENT_PLATFORMS);
      const f = { box: box, scene: scene, info: info, mirror: null };
      // 바닥 반사: 같은 그림을 복사해 반사 틀(위아래 뒤집힘)에 넣음
      const refl = box.parentElement.querySelector(".slot-reflect");
      if (refl) {
        f.mirror = scene.cloneNode(true);
        refl.appendChild(f.mirror);
        f.reflBox = refl;
      }
      figs.push(f);
    } catch (e) {
      box.removeChild(scene);   // 그림이 실패해도 이름·링크는 그대로
      console.warn("표지 장비 그림을 그리지 못했습니다:", box.dataset.equip, e);
    }
  });
  // 글자는 장비 위쪽에 따로 놓이므로(겹치지 않음) 장비 그림만 칸 크기에 맞춤
  const fitAll = () => { figs.forEach(fit); };
  fitAll();
  let raf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fitAll); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);   // 글꼴이 늦게 와서 칸 크기가 바뀔 때

  const stage = document.querySelector(".cover-stage");
  if (!stage) return;

  // ---------- 2) 상단 바 색: 지금 바 아래에 보이는 화면 색에 맞춤 ----------
  //   body[data-hdr] = light(크림) / sand(모래색) / dark(남색) → CSS가 색 변수만 바꾸고 색 전환은 transition
  const secMore = document.querySelector(".cover-sec.is-more"), secAbout = document.querySelector(".cover-sec.is-about");
  let hdrRaf = 0;
  function themeNow() {
    const y = 36;                                   // 바 가운데 높이
    const fade = parseFloat(getComputedStyle(document.querySelector(".cover-hero")).getPropertyValue("--fade")) || 110;
    const sr = stage.getBoundingClientRect();
    let t = "light";
    if (sr.top + 100 < y && sr.bottom - fade / 2 > y) t = "dark";                 // 어두운 장비 무대 위
    if (secMore && secMore.getBoundingClientRect().top + 120 < y) t = "sand";     // 모래색 구간
    if (secAbout && secAbout.getBoundingClientRect().top + 200 < y) t = "dark";   // 남색 구간 + 바닥글
    if (document.body.dataset.hdr !== t) document.body.dataset.hdr = t;
  }
  function onScroll() { if (!hdrRaf) hdrRaf = requestAnimationFrame(() => { hdrRaf = 0; themeNow(); }); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  themeNow();

  // ---------- 3) 마우스 깊이감 ----------
  const still = (window.MotionPref && MotionPref.reason()) ||
    !matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)").matches;
  if (still) { stage.classList.add("is-still"); return; }

  // 목표값(마우스 위치 -1~1)을 향해 매 프레임 조금씩 따라감 → 부드럽게
  //   ★ 성능: 예전에는 무대에 CSS 변수(--px)를 넣어서 장비 그림 속 수천 개 요소의 스타일이 매 프레임 다시 계산됐다.
  //     지금은 움직일 층 몇 개의 transform만 직접 바꾼다 (층마다 이동 거리 = 깊이).
  const layers = [
    [stage.querySelector(".cs-tones"), -6, -4],
    [stage.querySelector(".cs-word"), -12, -6],
    [stage.querySelector(".cs-floor"), -9, 0]
  ].concat([...stage.querySelectorAll(".slot")].map((el) =>
    [el, el.classList.contains("is-ready") ? -26 : -17, el.classList.contains("is-ready") ? -10 : -7]
  )).filter((l) => l[0]);
  layers.forEach((l) => { l[0].style.willChange = "transform"; });
  let tx = 0, ty = 0, x = 0, y = 0, running = false;
  function tick() {
    x += (tx - x) * 0.06;
    y += (ty - y) * 0.06;
    layers.forEach((l) => { l[0].style.transform = "translate3d(" + (x * l[1]).toFixed(2) + "px," + (y * l[2]).toFixed(2) + "px,0)"; });
    if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) requestAnimationFrame(tick);
    else running = false;
  }
  // mousemove는 좌표만 기억하고, 그리기는 requestAnimationFrame 한 번에 묶음
  let pending = null;
  function aim(nx, ny) {
    tx = nx; ty = ny;
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  stage.addEventListener("pointermove", (e) => {
    if (pending) { pending = e; return; }
    pending = e;
    requestAnimationFrame(() => {
      const r = stage.getBoundingClientRect(), ev = pending;
      pending = null;
      aim(((ev.clientX - r.left) / r.width) * 2 - 1, ((ev.clientY - r.top) / r.height) * 2 - 1);
    });
  });
  stage.addEventListener("pointerleave", () => aim(0, 0));

})();
