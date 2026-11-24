// =============================================================
// 공정변수 "직접 조절해 보기" (equipment/pecvd/parameters.html)
//
// 변수 5개를 내림(-1) · 기준(0) · 올림(+1)으로 바꾸면, 결과 7개의 막대가 그 방향으로 움직이고 이유가 한 줄 나온다.
//   - 실리콘 질화막(SiH4 + NH3) 기준 "경향"만. 숫자·눈금 없음. 막대 길이 = 방향과 대략의 세기(약/강)만
//   - 여러 변수를 함께 바꾸면 효과를 더한다. 서로 반대 방향이 섞이면 "엇갈림"(어느 쪽이 클지는 조건에 따라 다름)
//   - 방향이 정해지지 않는 효과(예: 균일도 모양)는 "달라짐"
//
// HTML 약속
//   <div data-param-lab data-part-base="../pecvd.html#part=">
//     <div class="pl-vars"></div>          ← 변수 버튼을 여기에 만듦
//     <ol class="pl-res-list"></ol>        ← 결과 막대를 여기에 만듦
//     <p class="pl-summary"></p>           ← "바꾼 변수: …" 요약 (화면 읽기 프로그램도 읽음)
//     <button data-pl-reset>               ← 모두 기준으로
//   </div>
// 움직임: 막대가 늘고 주는 CSS 전환만 있음 (움직임 줄이기·?still=1이면 전환 없이 바로 바뀜)
// 내용을 고칠 때: 아래 VARS의 effects만 고치면 됨. 같은 내용을 parameters.html의 "공정변수 표"에도 맞춰 둘 것
// =============================================================
(function () {
  "use strict";

  const root = document.querySelector("[data-param-lab]");
  if (!root) return;

  // ---------- 결과 항목 ----------
  //   neg / pos : 막대 왼쪽 / 오른쪽 끝의 뜻 (응력은 "인장 쪽 / 압축 쪽")
  const RESULTS = [
    { id: "rate",     name: "증착 속도",          neg: "줄어듦", pos: "늘어남" },
    { id: "unif",     name: "두께 균일도",        neg: "나빠짐", pos: "좋아짐" },
    { id: "dens",     name: "막 밀도",            neg: "성겨짐", pos: "치밀해짐" },
    { id: "h",        name: "막 속 수소 함량",    neg: "줄어듦", pos: "늘어남" },
    { id: "stress",   name: "막 응력",            neg: "인장 쪽", pos: "압축 쪽" },
    { id: "ri",       name: "굴절률",             neg: "낮아짐", pos: "높아짐" },
    { id: "particle", name: "파티클 위험",        neg: "줄어듦", pos: "커짐" }
  ];

  // ---------- 변수와 효과 ----------
  //   effects: { 결과id: [방향, 세기, 올렸을 때 이유, 내렸을 때 이유, 검증필요] }
  //     방향 +1 = "올림"일 때 막대가 pos 쪽으로 / -1 = neg 쪽으로 / 0 = 방향이 조건에 따라 다름("달라짐")
  //     세기 1(약) · 2(강) — 그림용 대략값
  const VARS = [
    { id: "temp", name: "히터(웨이퍼) 온도", up: "올림", down: "내림", part: "pm", partName: "히터 패널",
      effects: {
        h:    [-1, 2, "온도가 높으면 Si–H·N–H 결합의 수소가 더 많이 빠져나가 막 속에 덜 남음", "온도가 낮으면 수소가 덜 빠져나가 막 속에 더 남음", false],
        dens: [+1, 2, "표면에서 원자가 더 움직여 제자리를 찾고 수소가 빠져 막이 치밀해짐", "원자가 덜 움직이고 수소가 남아 막이 성기게 됨", false],
        ri:   [+1, 1, "수소가 줄고 막이 치밀해지면 굴절률이 조금 오르는 경향", "수소가 많고 성긴 막은 굴절률이 조금 낮은 경향", true]
      } },
    { id: "press", name: "챔버 압력", up: "올림", down: "내림", part: "pm", partName: "스로틀 밸브 패널",
      effects: {
        rate:     [+1, 1, "기체 밀도가 높아져 원료 공급이 늘어 빨라지는 경향(어느 정도까지)", "원료 공급이 줄어 느려질 수 있음", true],
        unif:     [ 0, 1, "가스 흐름과 플라즈마 분포가 바뀌어 가운데·가장자리 두께 차이의 모양이 달라짐", "가스 흐름과 플라즈마 분포가 바뀌어 가운데·가장자리 두께 차이의 모양이 달라짐", true],
        dens:     [-1, 1, "이온이 웨이퍼로 가는 길에 더 자주 부딪혀 에너지를 잃음 → 이온 충돌이 약해짐", "이온이 덜 부딪혀 더 큰 에너지로 막을 두드림", true],
        stress:   [-1, 1, "이온 충돌이 약해져 인장 쪽으로 움직이는 경향", "이온 충돌이 세져 압축 쪽으로 움직이는 경향", true],
        particle: [+1, 2, "분자끼리 자주 부딪혀 웨이퍼에 닿기 전 기체 속에서 먼저 반응해 입자가 생기기 쉬움", "분자 충돌이 줄어 기체 속 반응이 줄어듦", false]
      } },
    { id: "rf", name: "RF 전력", up: "올림", down: "내림", part: "rf-generator", partName: "RF 패널",
      effects: {
        rate:     [+1, 2, "전자가 원료 가스를 더 많이 쪼개 라디칼이 늘어남 — 어느 정도까지(원료가 다 분해되면 더 늘지 않음)", "분해가 줄어 느려지고, 너무 낮으면 플라즈마가 불안정해짐", true],
        dens:     [+1, 1, "이온 충돌이 늘어 막 표면을 두드려 치밀하게 만듦", "이온 충돌이 줄어 막이 덜 치밀해짐", true],
        stress:   [+1, 2, "이온 충돌이 늘어 압축 응력 쪽으로 움직임", "이온 충돌이 줄어 인장 쪽으로 움직임", true],
        particle: [+1, 1, "분해가 많아져 기체 속 반응과 아킹(불꽃 방전) 위험이 커짐", "분해가 줄어 기체 속 반응 위험이 줄어듦", false]
      } },
    { id: "ratio", name: "가스 비율 (SiH₄ : NH₃)", up: "실리콘", down: "질소", part: "gas-box", partName: "가스 박스 패널",
      effects: {
        ri:       [+1, 2, "막에 실리콘이 많아져(실리콘 과잉 막) 굴절률이 오름", "질소가 많은 막이 되어 굴절률이 내려감", false],
        rate:     [+1, 1, "증착 속도를 주로 정하는 실리콘 원료가 늘어 빨라지는 경향", "실리콘 원료가 줄어 느려지는 경향", true],
        h:        [+1, 1, "Si–H 결합 형태로 들어가는 수소가 늘어나는 경향", "Si–H 형태 수소는 줄지만 N–H 형태는 늘 수 있음", true],
        particle: [+1, 1, "SiH₄가 많으면 기체 속에서 먼저 반응해 입자가 생기기 쉬움", "SiH₄가 적어 기체 속 반응 위험이 줄어듦", true]
      } },
    { id: "gap", name: "샤워헤드–히터 간격", up: "넓힘", down: "좁힘", part: "showerhead", partName: "샤워헤드 패널",
      effects: {
        rate: [-1, 1, "같은 전력에서 전기장이 약해지고 플라즈마가 넓게 퍼져 느려지는 경향", "플라즈마가 웨이퍼 가까이 모여 빨라지는 경향", true],
        unif: [ 0, 1, "가스가 웨이퍼에 닿기 전 더 퍼지지만, 너무 넓으면 플라즈마가 불안정해짐", "구멍 흔적이 두께에 비치고, 간격 편차(평행)에 더 민감해짐", true]
      } }
  ];

  const base = root.getAttribute("data-part-base") || "";
  const state = {};           // 변수id → -1 | 0 | 1
  VARS.forEach(v => { state[v.id] = 0; });

  // 정지 화면(움직임 줄이기·?still=1) → 막대 전환 없이
  let still = false;
  try { still = new URLSearchParams(location.search).get("still") === "1"; } catch (e) { /* 무시 */ }
  if (still) root.classList.add("is-still");

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const VERIFY = ' <span class="verify-tag">검증 필요</span>';

  // ---------- 변수 버튼 만들기 ----------
  const varsBox = root.querySelector(".pl-vars");
  varsBox.innerHTML = VARS.map(v => `
    <div class="pl-var" data-var="${v.id}">
      <div class="pl-var-head">
        <span class="pl-var-name" id="pl-name-${v.id}">${esc(v.name)}</span>
        <a class="pl-var-part" href="${base}${v.part}">${esc(v.partName)}</a>
      </div>
      <div class="pl-seg" role="radiogroup" aria-labelledby="pl-name-${v.id}">
        <button type="button" role="radio" data-v="-1" aria-checked="false"><span aria-hidden="true">▼</span> ${esc(v.down)}</button>
        <button type="button" role="radio" data-v="0" aria-checked="true">기준</button>
        <button type="button" role="radio" data-v="1" aria-checked="false"><span aria-hidden="true">▲</span> ${esc(v.up)}</button>
      </div>
    </div>`).join("");

  // ---------- 결과 막대 만들기 ----------
  const list = root.querySelector(".pl-res-list");
  list.innerHTML = RESULTS.map(r => `
    <li class="pl-res" data-res="${r.id}" data-state="none">
      <div class="pl-res-head"><span class="pl-res-name">${esc(r.name)}</span><span class="pl-res-word">변화 없음</span></div>
      <div class="pl-bar" aria-hidden="true">
        <span class="pl-end is-neg">${esc(r.neg)}</span>
        <span class="pl-track"><i class="pl-fill is-neg"></i><i class="pl-fill is-pos"></i><i class="pl-mid"></i></span>
        <span class="pl-end is-pos">${esc(r.pos)}</span>
      </div>
      <p class="pl-why"></p>
    </li>`).join("");

  // ---------- 계산해서 그리기 ----------
  function render() {
    RESULTS.forEach(r => {
      let net = 0, hasPos = false, hasNeg = false, hasVague = false;
      const whys = [];
      VARS.forEach(v => {
        const s = state[v.id], e = v.effects[r.id];
        if (!s || !e) return;
        const dir = e[0] * s, w = e[1];
        if (dir > 0) hasPos = true; else if (dir < 0) hasNeg = true; else hasVague = true;
        net += dir * w;
        const mark = s > 0 ? "▲" : "▼";
        whys.push(`<span class="pl-why-var">${esc(v.name.replace(/ \(.*\)/, ""))} ${mark} ${esc(s > 0 ? v.up : v.down)}</span> ${esc(s > 0 ? e[2] : e[3])}${e[4] ? VERIFY : ""}`);
      });

      // 상태: none(변화 없음) / pos / neg / mixed(엇갈림) / vague(달라짐)
      let st = "none", word = "변화 없음", mag = 0;
      if (hasPos && hasNeg) { st = "mixed"; word = "엇갈림"; }
      else if (hasPos || hasNeg) { st = net > 0 ? "pos" : "neg"; word = net > 0 ? r.pos : r.neg; mag = Math.min(2, Math.abs(net)); }
      else if (hasVague) { st = "vague"; word = "달라짐"; }
      if (st === "mixed") whys.push('<span class="pl-why-mix">효과가 서로 반대 — 어느 쪽이 클지는 조건에 따라 다름</span>');
      if ((st === "pos" || st === "neg") && hasVague) word += " · 모양도 달라짐";

      const li = list.querySelector(`[data-res="${r.id}"]`);
      li.dataset.state = st;
      li.querySelector(".pl-res-word").textContent = word;
      // 막대: 가운데에서 한쪽으로. 세기 1 = 절반, 2 = 끝까지 (엇갈림·달라짐은 양쪽에 짧게 무늬)
      const scale = st === "mixed" || st === "vague" ? 0.4 : mag / 2;
      li.querySelector(".pl-fill.is-pos").style.transform = `scaleX(${st === "pos" || st === "mixed" || st === "vague" ? scale : 0})`;
      li.querySelector(".pl-fill.is-neg").style.transform = `scaleX(${st === "neg" || st === "mixed" || st === "vague" ? scale : 0})`;
      li.querySelector(".pl-why").innerHTML = whys.join("<br>");
    });

    // 요약 줄
    const changed = VARS.filter(v => state[v.id]).map(v => `${v.name.replace(/ \(.*\)/, "")} ${state[v.id] > 0 ? "▲ " + v.up : "▼ " + v.down}`);
    root.querySelector(".pl-summary").textContent = changed.length ? "바꾼 변수: " + changed.join(" · ") : "모든 변수가 기준입니다. 변수를 하나 바꿔 보세요.";
    root.classList.toggle("is-changed", changed.length > 0);
  }

  // ---------- 입력 ----------
  varsBox.addEventListener("click", ev => {
    const b = ev.target.closest(".pl-seg button");
    if (!b) return;
    const box = b.closest(".pl-var");
    state[box.dataset.var] = Number(b.dataset.v);
    box.querySelectorAll(".pl-seg button").forEach(x => x.setAttribute("aria-checked", x === b ? "true" : "false"));
    box.dataset.level = b.dataset.v;
    render();
  });
  // 라디오 묶음 안에서 ←→ 키로 옮기기 (키보드 사용자)
  varsBox.addEventListener("keydown", ev => {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const b = ev.target.closest(".pl-seg button");
    if (!b) return;
    const btns = [...b.parentNode.children];
    const i = btns.indexOf(b) + (ev.key === "ArrowRight" ? 1 : -1);
    if (btns[i]) { ev.preventDefault(); btns[i].focus(); btns[i].click(); }
  });
  root.querySelector("[data-pl-reset]").addEventListener("click", () => {
    VARS.forEach(v => { state[v.id] = 0; });
    varsBox.querySelectorAll(".pl-var").forEach(box => {
      box.dataset.level = "0";
      box.querySelectorAll(".pl-seg button").forEach(x => x.setAttribute("aria-checked", x.dataset.v === "0" ? "true" : "false"));
    });
    render();
  });

  render();
})();
