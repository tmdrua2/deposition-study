// =============================================================
// ALD 문제와 점검 페이지 (equipment/ald/troubleshooting.html)
//   ① 스크롤 단계 체험: 네 칸 점검 틀(한 곳만인가 → 갑자기인가 → 원인 나누기 → 조치와 확인)
//      고정 그림 = 장비 구성 페이지의 ALD 계통도(window.AldHwMap, js/sim/ald-hw-sx.js)를 빌려 씀
//      단계 안에서 장면(phase)이 바뀌며 살펴볼 계통이 켜지고, 의심할 부품 자리에 고리가 생김
//   ② 점검 게임: 증상 → 범위(한 챔버만/모든 챔버) → 시점(갑자기/서서히)을 고르면
//      후보 목록이 좁혀지고 계통도에 번호 고리가 켜짐 → 마지막에 확인 방법·조치·조치 후 확인
//      게임 내용은 HTML의 증상별 <details data-tg-case>에서 읽음 (글은 HTML 한 곳에만)
// 정지 화면(움직임 줄이기·?still=1): ① 단계마다 정지 그림(장면 둘을 합친 한 장) ② 게임은 그대로, 증상 목록은 모두 펼침
// 색은 css/style.css 변수만 클래스로 씀 (JS에 색 없음)
// 의존: gsap, ScrollTrigger, motion-pref.js, sx-engine.js, ald-hw-sx.js
// =============================================================
(function () {
  "use strict";

  // ---- ① 단계별 장면: 시간(초) · 켜는 계통 · 고리 자리 · 오른쪽 위 칩 · 아래 설명 ----
  //   drawB = 계통도 그리기 방식 (3이면 웨이퍼가 이송 길을 따라 움직임, 0이면 공급 기체 순서, -1이면 기본)
  const STAGES = [
    { name: "범위: 한 곳만인가", phases: [
      { t: 3.2, sys: ["heat", "vac"], marks: ["heater", "valve", "ring"], chip: "한 챔버만", desc: "한 챔버만 → 그 챔버에만 있는 히터·ALD 밸브·펌핑 링" },
      { t: 3.2, sys: ["supply"], marks: ["canister", "ctrl"], chip: "모든 챔버", desc: "모든 챔버 → 함께 쓰는 전구체 공급부·레시피(제어기)" }
    ] },
    { name: "시점: 갑자기인가, 서서히인가", phases: [
      { t: 3.2, sys: ["supply", "heat"], marks: ["valve", "canister", "ctrl"], chip: "갑자기", desc: "갑자기 → 그때 바뀐 것: 교체한 밸브, 용기 교체, 레시피 변경" },
      { t: 3.2, sys: ["vac", "supply"], marks: ["ring", "wall", "canister", "pline"], chip: "서서히", desc: "서서히 → 쌓이고 닳는 것: 펌핑 링·벽의 막, 전구체 잔량, 배관 응축" }
    ] },
    { name: "원인 나누기: 네 길", phases: [
      { t: 2.2, sys: ["supply"], marks: ["canister", "pmfc", "valve"], chip: "공급", desc: "공급 — 전구체 양·퍼지 → 사이클당 두께, 파티클" },
      { t: 2.2, sys: ["vac"], marks: ["ring", "throttle", "pump"], chip: "진공·배기", desc: "진공 배기 — 압력·흐름 쏠림 → 균일도" },
      { t: 2.2, sys: ["heat"], marks: ["heater", "pline", "ctrl"], chip: "가열·제어", desc: "가열 제어 — 온도 창·응축·밸브 순서 → 두께, 막질" },
      { t: 2.2, sys: ["xfer"], marks: ["efem", "ll", "tm", "slit"], chip: "이송", desc: "이송 — 웨이퍼 놓임, 진공·대기 경계 → 균일도, 파티클" }
    ] },
    { name: "조치와 확인", phases: [
      { t: 8, sys: ["xfer"], marks: [], chip: "테스트 웨이퍼", drawB: 3, desc: "" },
      { t: 4.5, sys: ["supply"], marks: ["heater"], chip: "다시 재기", drawB: 0, desc: "같은 레시피로 증착 → 두께·균일도·파티클을 정상 챔버·이전 기록과 비교" }
    ] }
  ];
  const totalOf = (b) => STAGES[b].phases.reduce((a, p) => a + p.t, 0);
  function phaseAt(b, t) {
    let s = 0;
    const ps = STAGES[b].phases;
    for (let i = 0; i < ps.length; i++) { if (t < s + ps[i].t || i === ps.length - 1) return { i, p: ps[i], lt: t - s }; s += ps[i].t; }
  }

  function initStory(root) {
    const E = window.SxEngine, M = window.AldHwMap;
    const NB = STAGES.length;

    if (E.isStill()) {
      // 정지 화면: 장면들을 합친 한 장 (계통·고리 모두 켬, 설명은 이어 붙임)
      E.still(root, (step, b, fig) => {
        const ps = STAGES[b].phases;
        fig.innerHTML = `<div class="sx-still-top"><p class="sx-stage-name">${STAGES[b].name}</p><p class="sx-zone" data-zone="vac">${ps.map((p) => p.chip).join(" / ")}</p></div>` +
          `<div class="sx-svg-box"></div><p class="sx-desc"></p>`;
        const m = M.make(fig.querySelector(".sx-svg-box"));
        const sys = [...new Set(ps.flatMap((p) => p.sys))];
        m.setSys(sys);
        m.draw(ps[0].drawB != null ? ps[0].drawB : -1, 0.7);
        m.mark([...new Set(ps.flatMap((p) => p.marks))].map((spot) => ({ spot })));
        fig.querySelector(".sx-desc").textContent = ps.map((p) => p.desc).filter(Boolean).join(" / ") ||
          "테스트 웨이퍼를 같은 레시피로 돌려 두께·균일도·파티클을 다시 잼";
      });
      return;
    }

    const map = M.make(E.$("[data-sx-svg]", root));
    const nameEl = E.$("[data-sx-name]", root), descEl = E.$("[data-sx-desc]", root), zoneEl = E.$("[data-sx-zone]", root);
    let lastPhase = -1, lastText = "";
    function draw(b, t) {
      const { i, p, lt } = phaseAt(b, t);
      if (i !== lastPhase) {                       // 장면이 바뀐 순간만 계통·고리를 바꿈
        lastPhase = i;
        map.setSys(p.sys);
        map.mark(p.marks.map((spot) => ({ spot })));
        zoneEl.textContent = p.chip; zoneEl.dataset.zone = "vac";
      }
      const r = map.draw(p.drawB != null ? p.drawB : -1, lt);
      const text = p.desc || r.desc;
      if (text !== lastText) { lastText = text; descEl.textContent = text; }
    }
    function onActivate(b) {
      lastPhase = -1; lastText = "";
      nameEl.innerHTML = `<span class="sim-stage-num">${b + 1}/${NB}</span>${STAGES[b].name}`;
    }
    E.story(root, { total: totalOf, draw, onActivate, lapSoften: () => false });
  }

  // ---------------------------------------------------------
  // ② 점검 게임
  // ---------------------------------------------------------
  const SCOPE = { one: "한 챔버", all: "모든 챔버", any: "범위 무관" };
  const TIME = { sudden: "갑자기", slow: "서서히", any: "시점 무관" };

  // 증상별 <details>에서 게임 내용 읽기 + 후보마다 "범위·시점" 작은 표시 붙이기
  function readCases() {
    return [...document.querySelectorAll("[data-tg-case]")].map((d) => {
      const steps = d.querySelectorAll(".tf-step");
      const branch = (si, k) => { const ps = steps[si] ? steps[si].querySelectorAll(".tf-branch p") : []; return ps[k] ? ps[k].innerHTML : ""; };
      const cands = [...d.querySelectorAll(".tf-cand")].map((li) => {
        const c = {
          scope: li.dataset.scope || "any", time: li.dataset.time || "any",
          spots: (li.dataset.spot || "").split(/\s+/).filter(Boolean),
          sys: (li.dataset.sys || "").split(/\s+/).filter(Boolean)
        };
        const part = li.querySelector(".tf-part");
        if (part && !li.querySelector(".tf-tags")) {
          part.insertAdjacentHTML("afterend", `<span class="tf-tags"><i>${SCOPE[c.scope]}</i><i>${TIME[c.time]}</i></span>`);
        }
        c.html = li.innerHTML;
        return c;
      });
      const fin = d.querySelector("[data-tg-final]");
      return {
        id: d.id,
        key: d.querySelector(".tf-key").textContent,
        name: d.querySelector(".tf-sum-name").textContent,
        hint: d.querySelector(".tf-sum-hint").textContent,
        cands,
        branch,
        finalQ: fin ? fin.querySelector(".tf-step-q").innerHTML : "",
        finalT: fin ? fin.querySelector(".tf-step-text").innerHTML : ""
      };
    });
  }

  function initGame(root, cases) {
    const M = window.AldHwMap;
    const $ = (s) => root.querySelector(s);
    const ui = $("[data-tg-ui]"), result = $("[data-tg-result]");
    ui.hidden = false;
    const still = window.SxEngine && SxEngine.isStill();
    if (still) root.classList.add("is-still");

    // 증상 버튼
    $("[data-tg-syms]").innerHTML = cases.map((c, i) =>
      `<button type="button" data-tg-sym="${i}" aria-pressed="false"><span class="tf-key">${c.key}</span><span class="tg-sym-name">${c.name}</span><span class="tg-sym-hint">${c.hint}</span></button>`).join("");

    const map = M.make($("[data-tg-svg]"));
    map.svg.classList.add("is-game");                 // 게임 그림은 멈춘 지도: 기체 점·챔버 색은 숨김
    map.setSys([]);
    map.draw(-1, 0);
    const st = { c: null, scope: null, time: null };

    const fits = (v, want) => !want || v === "any" || v === want;
    function render() {
      const c = st.c != null ? cases[st.c] : null;
      root.querySelectorAll("[data-tg-sym]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.tgSym === st.c)));
      root.querySelectorAll("[data-tg-scope]").forEach((b) => { b.disabled = !c; b.setAttribute("aria-pressed", String(b.dataset.tgScope === st.scope)); });
      root.querySelectorAll("[data-tg-time]").forEach((b) => { b.disabled = !st.scope; b.setAttribute("aria-pressed", String(b.dataset.tgTime === st.time)); });
      root.querySelectorAll("[data-tg-q]").forEach((q) => {
        const k = q.dataset.tgQ;
        q.classList.toggle("is-now", (k === "sym" && !c) || (k === "scope" && c && !st.scope) || (k === "time" && st.scope && !st.time));
      });

      if (!c) {
        $("[data-tg-funnel]").innerHTML = `<span class="tg-f-idle">증상을 고르면 후보가 나타납니다</span>`;
        map.setSys([]); map.mark([]);
        result.hidden = true; result.innerHTML = "";
        return;
      }
      // 단계별 후보 수: 전체 → 범위 → 시점
      const all = c.cands.map((x, i) => Object.assign({ n: i + 1 }, x));
      const byScope = all.filter((x) => fits(x.scope, st.scope));
      const left = byScope.filter((x) => fits(x.time, st.time));
      const nums = [all.length];
      if (st.scope) nums.push(byScope.length);
      if (st.time) nums.push(left.length);
      $("[data-tg-funnel]").innerHTML = `<span class="tg-f-k">후보</span>` +
        nums.map((n, i) => `<span class="tg-f-n${i === nums.length - 1 ? " is-last" : ""}">${n}</span>`).join(`<span class="tg-f-arrow" aria-hidden="true">→</span>`) +
        `<span class="sr-only">개</span>`;

      // 계통도: 남은 후보의 계통만 켜고, 남은 후보 자리에 번호 고리
      map.setSys([...new Set(left.flatMap((x) => x.sys))]);
      map.mark(left.flatMap((x) => x.spots.map((spot) => ({ spot, n: x.n }))));
      map.draw(-1, 0.7);

      // 결과: 고른 조건 힌트 + 후보 카드 (시점까지 고르면 확인·조치를 펼침)
      const done = !!st.time;
      const hints = [];
      if (st.scope) hints.push(c.branch(0, st.scope === "one" ? 0 : 1));
      if (st.time) hints.push(c.branch(1, st.time === "sudden" ? 0 : 1));
      result.hidden = false;
      result.classList.toggle("is-done", done);
      result.innerHTML =
        `<div class="tg-res-head"><p class="tg-res-k">${c.key}. ${c.name}${st.scope ? " · " + SCOPE[st.scope] : ""}${st.time ? " · " + TIME[st.time] : ""}</p>` +
        (hints.length ? `<div class="tg-hints">${hints.map((h) => `<p>${h}</p>`).join("")}</div>` : "") +
        `<p class="tg-res-tip">${done ? "남은 후보의 확인 방법과 조치입니다. 위에서부터 확인하기 쉬운 것(기록·로그)부터 지워 갑니다." : st.scope ? "시점까지 고르면 확인 방법과 조치가 펼쳐집니다." : "범위를 고르면 후보가 좁혀집니다."}</p></div>` +
        `<ol class="tg-cands">${all.map((x) => {
          const out = !left.includes(x);
          return `<li class="tf-cand tg-cand${out ? " is-out" : ""}"${out ? ' aria-hidden="true"' : ""}><span class="tg-no">${x.n}</span><div class="tg-cand-body">${x.html}</div></li>`;
        }).join("")}</ol>` +
        (done ? `<div class="tg-final"><p class="tf-step-no">04 · 조치 후 확인</p><p class="tg-final-q">${c.finalQ}</p><p>${c.finalT}</p>` +
          `<p class="tg-final-links"><a href="#${c.id}" data-tf-go="${c.id}">이 증상의 점검 순서 전체 보기</a><button type="button" data-tg-reset>다른 증상 풀기</button></p></div>` : "");
      if (!still) { result.classList.remove("is-in"); void result.offsetWidth; result.classList.add("is-in"); }
    }

    root.addEventListener("click", (e) => {
      const sym = e.target.closest("[data-tg-sym]");
      if (sym) { st.c = +sym.dataset.tgSym; st.scope = null; st.time = null; render(); return; }
      const sc = e.target.closest("[data-tg-scope]");
      if (sc && !sc.disabled) { st.scope = sc.dataset.tgScope; st.time = null; render(); return; }
      const tm = e.target.closest("[data-tg-time]");
      if (tm && !tm.disabled) { st.time = tm.dataset.tgTime; render(); return; }
      if (e.target.closest("[data-tg-reset]")) {
        st.c = null; st.scope = null; st.time = null; render();
        const first = root.querySelector("[data-tg-sym]");
        if (first) first.focus({ preventScroll: true });
      }
    });
    render();
  }

  // 다른 증상으로 가는 링크(data-tf-go): 그 <details>를 펼친 뒤 이동
  function initGoLinks() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-tf-go]");
      if (!a) return;
      const d = document.getElementById(a.dataset.tfGo);
      if (d && d.tagName === "DETAILS") d.open = true;
    });
  }

  function init() {
    if (!window.SxEngine || !window.AldHwMap) return;
    const sx = document.querySelector("[data-sx-trouble]");
    if (sx) initStory(sx);
    const cases = readCases();
    const game = document.querySelector("[data-tg]");
    if (game && cases.length) initGame(game, cases);
    if (SxEngine.isStill()) document.querySelectorAll("[data-tg-case]").forEach((d) => { d.open = true; });
    initGoLinks();
    // 출처 페이지의 "원래 위치 →"(#tf-…)로 들어오면 그 증상을 펼쳐 둠
    const openHash = () => {
      const d = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (d && d.tagName === "DETAILS") { d.open = true; d.scrollIntoView({ block: "start" }); }
    };
    openHash();
    window.addEventListener("hashchange", openHash);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
