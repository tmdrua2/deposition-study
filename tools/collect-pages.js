// =============================================================
// 도우미 스크립트: 페이지(HTML) 글에서 "출처 · [검증 필요] 문장 · 면접 질문"을 뽑아 data/pecvd-pages.js로 저장
//
// 왜 필요한가
//   사이트는 index.html을 직접 열어도(file://) 동작해야 해서, 브라우저가 다른 HTML 파일을 읽는 fetch()를 쓰지 않는다.
//   그래서 면접 질문 모음·출처 모음 페이지가 하위 페이지 글을 읽을 수 있도록, 미리 뽑아 둔 데이터 파일을 만든다.
//   (부품 패널 내용은 원래 data/*.js에 있으므로 이 스크립트와 상관없이 자동으로 모인다)
//
// 쓰는 법 (페이지 글을 고친 뒤 한 번)
//   터미널에서 사이트 맨 위 폴더로 가서:  node tools/collect-pages.js
//   → data/pecvd-pages.js 가 새로 써진다. 사이트를 보는 데에는 이 스크립트가 필요 없다(패키지 설치도 없음).
//
// 뽑는 규칙
//   - 출처: <h2 id="page-sources"> 또는 id="sources" 아래 첫 목록(<ul>)의 항목. "이 사이트의 …", "○○ 페이지 —" 같은 사이트 안 참고는 뺀다
//   - [검증 필요]: <span class="verify-tag">검증 필요</span> 또는 글자 그대로 [검증 필요]가 붙은 문장
//     · 위치 링크 = 감싸는 <details id>가 있으면 그 id, 없으면 바로 앞에 나온 id
//   - 면접 질문: <h2 id="interview"> 아래의 <details> (summary = 질문, 나머지 = 답변)
// =============================================================
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "pecvd-pages.js");

// 읽을 페이지 (순서 = 화면에 보일 순서). 모음 페이지 자신(interview·sources)과 틀·안내 페이지는 뺀다
const PAGES = [
  { path: "equipment/pecvd/principle.html",       group: "PECVD 원리",       equip: "pecvd", section: "principle" },
  { path: "equipment/pecvd/hardware.html",        group: "PECVD 장비 구성",  equip: "pecvd", section: "hardware" },
  { path: "equipment/pecvd/flow.html",            group: "PECVD 공정 흐름",  equip: "pecvd", section: "flow" },
  { path: "equipment/pecvd/parameters.html",      group: "PECVD 공정변수",   equip: "pecvd", section: "parameters" },
  { path: "equipment/pecvd/troubleshooting.html", group: "PECVD 문제와 점검", equip: "pecvd", section: "troubleshooting" },
  { path: "basics/vacuum.html",                   group: "기초 · 진공" },
  { path: "basics/plasma.html",                   group: "기초 · 플라즈마" },
  { path: "basics/thin-film-growth.html",         group: "기초 · 박막 성장" },
];

const V = "⁣V⁣";                       // [검증 필요] 자리 표시 (보이지 않는 글자로 감쌈)
const VOID = new Set(["br", "img", "meta", "link", "input", "hr", "source", "wbr", "col", "area"]);
const SKIP = new Set(["script", "style", "svg", "noscript", "header", "nav", "footer"]);
const BLOCK = new Set(["p", "li", "td", "th", "dd", "dt", "figcaption", "summary", "h1", "h2", "h3", "h4", "blockquote"]);

const decode = s => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&middot;/g, "·").replace(/&rarr;/g, "→").replace(/&larr;/g, "←");
const clean = s => s.replace(/\s+/g, " ").trim();
const attr = (a, name) => { const m = a.match(new RegExp("\\b" + name + '="([^"]*)"')); return m ? m[1] : null; };

function parse(file, meta) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const out = { path: file, group: meta.group, title: "", sources: [], verify: [], interview: [] };
  if (meta.equip) { out.equip = meta.equip; out.section = meta.section; }

  const stack = [];            // 열린 요소 { tag, id, cls, buf, block, cells? }
  let skip = 0;                // SKIP 요소 안 깊이
  let inVerify = 0;            // verify-tag span 안
  let lastId = "";             // 바로 앞에 나온 id
  let heading = "";            // 바로 앞 h2 글
  let h2id = "";               // 바로 앞 h2 id
  let srcMode = false;         // 출처 목록 읽는 중
  let srcListDone = false;
  let ivDetails = null;        // 면접 details 읽는 중 { q, a }
  let thead = [];              // 표 머리 칸
  let row = [];                // 지금 줄의 칸 글
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g;
  let m;

const near = (fn) => { for (let i = stack.length - 1; i >= 0; i--) if (fn(stack[i])) return stack[i]; return null; };
  const blockTop = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].block) return stack[i]; return null; };
  const addText = t => { const b = blockTop(); if (b) b.buf += t; };

  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[5] !== undefined) {                     // 글자
      if (skip || inVerify) continue;
      addText(decode(m[5]).replace(/\[검증 필요\]/g, V));
      continue;
    }
    const close = m[1] === "/", tag = m[2].toLowerCase(), a = m[3] || "";
    if (!close) {
      if (VOID.has(tag) || m[4] === "/") { if (tag === "br") addText(" "); continue; }
      const id = attr(a, "id"), cls = attr(a, "class") || "";
      if (skip) { if (SKIP.has(tag)) skip++; stack.push({ tag, skipped: true }); continue; }
      if (SKIP.has(tag)) { skip++; stack.push({ tag, skipped: true }); continue; }
      if (tag === "span" && /\bverify-tag\b/.test(cls)) { addText(V); inVerify++; stack.push({ tag, verify: true }); continue; }
      if (tag === "span" || tag === "button") {
        const b = blockTop();
        if (b && b.cls && /\btf-part\b/.test(b.cls) && b.cut === undefined) b.cut = b.buf.length;   // "샤워헤드 구멍 막힘 <span>샤워헤드 패널</span>" → 앞부분만 이름
        addText(" ");                                   // "01<span>FOUP…" 처럼 붙어 버리지 않게
      }
      // 캡처 요소: 증상 이름(.tf-sum-name), 원인 후보 이름(a.tf-part) — 위치 설명(where)에 씀
      const el = { tag, id, cls, buf: "", block: BLOCK.has(tag) || /\b(tf-sum-name|tf-part)\b/.test(cls) };
      if (tag === "a") el.href = attr(a, "href");
      if (tag === "h2" && id) { h2id = id; srcMode = (id === "page-sources" || id === "sources"); srcListDone = false; }
      if (tag === "tr") row = [];
      if (tag === "thead") thead = [];
      if (tag === "details" && h2id === "interview") ivDetails = { q: "", a: "" };
      if (id) el.anchorHere = id;
      stack.push(el);
      if (id) lastId = id;
      continue;
    }
    // 닫는 태그: 같은 이름의 가장 가까운 요소까지 닫는다
    let idx = -1;
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { idx = i; break; }
    if (idx < 0) continue;
    while (stack.length > idx) {
      const el = stack.pop();
      if (el.skipped) { if (SKIP.has(el.tag)) skip--; continue; }
      if (el.verify) { inVerify--; continue; }
      if (el.tag === "a" && el.href) { const b = blockTop(); if (b) (b.links = b.links || []).push(el.href); }
      if (!el.block) continue;
      const text = clean(el.buf);
      // 안쪽 블록의 글을 바깥 블록에도 이어 줌(li 안의 p 등) — 단, [검증 필요] 문장은 안쪽에서 이미 뽑았으므로 표시를 지움
      const parent = blockTop();
      if (parent) { parent.buf += " " + text.split(V).join(""); if (el.links) parent.links = (parent.links || []).concat(el.links); }
      finishBlock(el, text);
    }
  }

  function anchorFor() {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === "details" && stack[i].id) return stack[i].id;
    return lastId;
  }

  function finishBlock(el, text) {
    if (/\btf-sum-name\b/.test(el.cls)) { const d = near(s => s.tag === "details"); if (d) d.sumName = text; }
    if (/\btf-part\b/.test(el.cls)) { const li = near(s => s.tag === "li"); if (li) li.cand = clean(el.cut !== undefined ? el.buf.slice(0, el.cut) : text); }
    if (el.tag === "h1" && !out.title) out.title = text.split(V).join("").trim();
    if (el.tag === "h2") heading = text.split(V).join("").trim();
    if (el.tag === "th" && stack.some(s => s.tag === "thead")) thead.push(text);
    if (el.tag === "td" || el.tag === "th") row.push(text.split(V).join("").trim());

    // 면접 질문
    if (ivDetails && el.tag === "summary") ivDetails.q = text;
    else if (ivDetails && (el.tag === "p" || el.tag === "li")) ivDetails.a = clean(ivDetails.a + " " + text);

    // 출처: 출처 제목 아래 첫 목록의 li
    if (srcMode && !srcListDone && el.tag === "li" && !stack.some(s => s.tag === "li")) {
      const t = text.split(V).join("").trim();
      if (!/^이 사이트의|^[가-힣 ]+페이지 —|^위 내용은|^작성 예정/.test(t)) out.sources.push(sourceOf(t, el.links || []));
    }

    // [검증 필요] 문장
    if (text.includes(V) && !srcMode) {
      // 문장이 너무 짧으면(예: "부산물 구성은 [검증 필요].") 앞 문장과 묶어 뜻이 통하게
      const all = splitSentences(text);
      const sentences = [];
      all.forEach((s, i) => {
        if (!s.includes(V)) return;
        if (/^\s*를 붙/.test(s.split(V)[1] || "")) return;            // "[검증 필요]를 붙였습니다" 같은 안내 문장은 뺌
        const short = clean(s.split(V).join("")).length < 14;
        sentences.push(short && i > 0 ? all[i - 1] + " " + s : s);
      });
      let ctx = heading;
      const det = near(s => s.tag === "details" && s.sumName);
      if (det) ctx += " · " + det.sumName;
      const li = near(s => s.tag === "li" && s.cand);
      if (li && el.tag !== "li") ctx += " · " + li.cand;
      if (el.tag === "td" && thead.length) {
        const col = thead[row.length - 1];
        ctx = clean(`${heading} · ${row[0] || ""}${col ? " — " + col : ""}`);
      }
      sentences.forEach(s => {
        const t = clean(s.split(V).join(" ")).replace(/\s+([.,)])/g, "$1").replace(/^(확인|조치) /, "$1 — ");
        if (t.length > 1) out.verify.push({ text: t, where: ctx, anchor: anchorFor() });
      });
    }
  }

  // 목록 닫힘 감지: 출처 목록은 첫 ul 하나만
  // (간단히: 출처 항목이 하나라도 모인 뒤 다음 h2가 오면 srcMode가 바뀌므로 충분)
  return out;
}

// 문장 나누기: "…다." "…요." 뒤 / 마침표+공백 뒤
function splitSentences(text) {
  const parts = text.split(new RegExp(`(?<=[.?!])\\s+|(?<=[.?!]${V})\\s+`));
  // 표시만 남은 조각(예: "… 있습니다" + V + ".")은 앞 문장에 붙임
  const out = [];
  parts.forEach(p => { if (out.length && clean(p.split(V).join("")).length < 2) out[out.length - 1] += p; else out.push(p); });
  return out;
}

// 출처 한 줄 → { kind, title, url, checked, note }
function sourceOf(t, links) {
  const url = (links.find(h => /^https?:/.test(h)) || "");
  const dm = t.match(/(\d{4}-\d{2}-\d{2})\s*확인/);
  let kind = "기타 자료";
  if (/patents\.google|특허/.test(url + t)) kind = "공개 특허";
  else if (/교과서/.test(t)) kind = "일반 교과서 내용";
  else if (/^일반 현장/.test(t)) kind = "일반 현장 지식";
  else if (/wikipedia/i.test(url + t)) kind = "웹 자료(위키백과)";
  let title = t, note = "";
  const dash = t.indexOf(" — ");
  if (dash > 0) { title = t.slice(0, dash).trim(); note = t.slice(dash + 3).trim(); }
  // 주소·확인 날짜는 따로 보관하므로 설명에서 뺌
  note = note.replace(url, "").replace(/\([^)]*\d{4}-\d{2}-\d{2}\s*확인[^)]*\)\.?/, "").replace(/^[\s.,]+/, "").trim();
  note = note.replace(/^확인한 내용:\s*/, "");
  if ((kind === "일반 교과서 내용" || kind === "일반 현장 지식") && title !== kind) {
    if (!note) note = title.replace(/^일반 /, "");       // "일반 진공 공학 교과서 내용 (…)" → 주제를 설명으로
    title = kind;
  }
  return Object.assign({ kind, title }, url ? { url } : {}, dm ? { checked: dm[1] } : {}, note ? { note } : {});
}

const pages = PAGES.filter(p => fs.existsSync(path.join(ROOT, p.path))).map(p => parse(p.path, p));
const today = new Date().toISOString().slice(0, 10);
const body =
`// =============================================================
// 자동 생성 파일 — 직접 고치지 말 것.  만드는 법: node tools/collect-pages.js  (만든 날: ${today})
// 페이지(HTML) 글에서 뽑은 출처 · [검증 필요] 문장 · 면접 질문.
// 쓰는 곳: equipment/pecvd/interview.html, equipment/pecvd/sources.html (js/figs/collect.js가 부품 데이터와 합침)
//   path    = 사이트 맨 위 기준 경로, anchor = 그 페이지 안의 위치(id)
// =============================================================
window.SITE_PAGE_NOTES = ${JSON.stringify({ generated: today, pages }, null, 1)};
`;
fs.writeFileSync(OUT, body);
pages.forEach(p => console.log(`${p.path}: 출처 ${p.sources.length} · 검증 필요 ${p.verify.length} · 면접 ${p.interview.length}`));
