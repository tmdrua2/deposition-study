// =============================================================
// 사이트 글 모으기 (면접 질문 모음 · 출처 모음 페이지가 같이 씀)
//
// 어디서 모으나
//   ① 부품 패널: data/platform.js + data/<장비>.js 의 부품 (interview · sources · 모든 글 칸의 [검증 필요])
//      → 부품을 데이터에 추가하면 여기에도 저절로 나타난다
//   ② 하위 페이지·기초 페이지: data/pecvd-pages.js (tools/collect-pages.js가 HTML에서 뽑아 만든 파일)
//
// 쓰는 법 (페이지 맨 아래, pages.js·데이터 파일 다음에)
//   const C = SiteCollect.make("pecvd");
//   C.modules      → [{ id, no, abbr, name, en, href, interview:[…], … }]   (분해 그림 번호 순, 샤워헤드는 PM 바로 뒤)
//   C.questions()  → [{ key, q, a, cs, module, from }]
//   C.sources()    → [{ kind, group, title, url, checked, uses:[{ label, href, note }] }]  (중복은 하나로 합침)
//   C.verify()     → [{ group, groupHref, items:[{ text, where, href }] }]
// =============================================================
(function () {
  "use strict";

  const ROOT = (document.body && document.body.dataset.root) || "";
  const pad = n => String(n).padStart(2, "0");

  // 데이터 글 안 표기 정리: [[보이는 글|경로]] → 보이는 글
  const plain = s => String(s || "").replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g, "$1");

  // 문장 나누기 (마침표·물음표 뒤 공백)
  const sentences = s => String(s).split(/(?<=[.?!])\s+/);

  // 패널 글 칸 이름 (js/explode/panel.js의 칸 순서·이름과 같게)
  const FIELDS = [
    ["role", "역할"], ["components", "구성품"], ["principle", "동작 원리"], ["params", "관련 공정변수"],
    ["issues", "문제와 점검"], ["pm", "PM 포인트"], ["interview", "면접 답변"]
  ];

  // 출처 종류 → 세 묶음 (공개 특허 / 일반 교과서 / 기타)
  function groupOf(kind) {
    if (/특허/.test(kind)) return "patent";
    if (/교과서/.test(kind)) return "textbook";
    return "other";
  }

  function make(equipId) {
    const eq = (window.EQUIPMENT || {})[equipId];
    if (!eq) return null;
    const plat = ((window.EQUIPMENT_PLATFORMS || {})[eq.platform] || { parts: [] }).parts;
    const all = plat.concat(eq.parts).filter(p => !p.copyOf);
    const byId = new Map(all.map(p => [p.id, p]));
    // EQUIP_SECTIONS는 pages.js의 const (window에는 안 붙지만 전역에서 읽힘)
    const sec = (typeof EQUIP_SECTIONS !== "undefined" && EQUIP_SECTIONS[equipId]) || null;
    const homeHref = ROOT + (sec ? sec.home : "equipment/" + equipId + ".html");

    // 학습 내용이 있는 부품 = 패널 (interview·role·sources 중 하나라도)
    const modules = all.filter(p => p.role || (p.interview && p.interview.length) || (p.sources && p.sources.length)).map(p => {
      let no = p.label ? p.label.no : null;
      let host = null;
      if (no == null) {                       // 이름표 없는 안쪽 부품(샤워헤드) → 부모 패널 바로 뒤
        for (let q = byId.get(p.parent); q; q = byId.get(q.parent)) if (q.label) { host = q; break; }
        no = host ? host.label.no + 0.5 : 99;
      }
      return {
        id: p.id, part: p, no,
        tag: p.label ? `${pad(p.label.no)} ${p.label.abbr}` : (host ? `${host.label.abbr} 안쪽` : "부품"),
        name: p.name, en: p.en,
        href: `${homeHref}#part=${encodeURIComponent(p.id)}`
      };
    }).sort((a, b) => a.no - b.no);

    // 하위 페이지 노트 (없으면 빈 목록)
    //   이 장비의 하위 페이지 + 기초 페이지만 (다른 장비 하위 페이지는 뺌 — 한 파일에 PECVD·ALD가 함께 있음)
    const notes = ((window.SITE_PAGE_NOTES || {}).pages || []).filter(n => !n.equip || n.equip === equipId);
    const secList = sec ? sec.list : [];
    const pageLabel = n => n.equip ? `${eq.title.replace(/ 장비$/, "")} · ${n.title}` : n.group;

    function questions() {
      const out = [];
      modules.forEach(m => (m.part.interview || []).forEach((it, i) => {
        if (!it || !it.q) return;
        // cat = 카드 분류(원리·장비·공정·CS). 데이터에 없으면 CS 질문만 "CS", 나머지는 빈칸
        out.push({ key: `${m.id}|${it.q}`, q: plain(it.q), a: plain(it.a), cs: !!it.cs, cat: it.cat || (it.cs ? "CS" : ""), module: m.id, from: m, index: i });
      }));
      // 하위 페이지 <h2 id="interview"> 아래 details (지금은 없음 → 생기면 저절로 들어옴)
      notes.filter(n => n.equip === equipId).forEach(n => (n.interview || []).forEach(it => {
        const from = { id: "page-" + n.section, tag: "페이지", name: n.title, href: ROOT + n.path + "#interview" };
        out.push({ key: `${n.path}|${it.q}`, q: it.q, a: it.a, cs: /CS|점검/.test(it.q), module: from.id, from });
      }));
      return out;
    }

    function sources() {
      const map = new Map();      // 같은 자료 = 같은 주소(없으면 종류+제목) → 하나로 합침
      const add = (s, use) => {
        if (!s) return;
        const kind = s.kind || "기타";
        const title = s.title || kind;
        const key = s.url ? s.url.replace(/\/en$/, "") : kind + "|" + title;
        if (!map.has(key)) map.set(key, { kind, group: groupOf(kind), title, url: s.url || "", checked: s.checked || "", uses: [] });
        const item = map.get(key);
        if (s.checked && (!item.checked || s.checked > item.checked)) item.checked = s.checked;
        item.uses.push({ label: use.label, href: use.href, note: s.note || "" });
      };
      modules.forEach(m => (m.part.sources || []).forEach(s => add(s, { label: m.tag.replace(" 안쪽", "") + " " + m.name, href: m.href })));
      notes.forEach(n => (n.sources || []).forEach(s => add(s, { label: pageLabel(n), href: ROOT + n.path + "#page-sources" })));
      return [...map.values()];
    }

    function verify() {
      const groups = [];
      // ① 부품 패널: 모든 글 칸을 훑어 [검증 필요]가 든 문장
      modules.forEach(m => {
        const items = [];
        const push = (txt, where) => {
          plain(txt).split("\n").forEach(line => {
            const parts = sentences(line);
            parts.forEach((s, i) => {
              if (!s.includes("[검증 필요]")) return;
              let t = s.replace(/\s*\[검증 필요\]\s*/g, " ").replace(/\s+([.,)])/g, "$1").trim();
              if (t.length < 14 && i > 0) t = parts[i - 1] + " " + t;       // 너무 짧으면 앞 문장과 묶음
              if (t) items.push({ text: t, where, href: m.href });
            });
          });
        };
        const p = m.part;
        FIELDS.forEach(([k, label]) => {
          const v = p[k];
          if (!v) return;
          if (typeof v === "string") push(v, label);
          else v.forEach(it => {
            if (typeof it === "string") push(it, label);
            else if (k === "components") push(it.desc, `${label} · ${it.name}`);
            else if (k === "params") ["up", "down", "tradeoff"].forEach(f => push(it[f], `${label} · ${it.name} — ${{ up: "올리면", down: "내리면", tradeoff: "트레이드오프" }[f]}`));
            else if (k === "issues") { push(it.problem, label); (it.checks || []).forEach(c => push(c, `${label} · ${it.problem}`)); }
            else if (k === "interview") push(it.a, `${label} · ${plain(it.q)}`);
          });
        });
        groups.push({ id: m.id, kind: "panel", label: `${m.tag} · ${m.name}`, sub: "부품 패널", href: m.href, items });
      });
      // ② 하위 페이지 (섹션 순서) → ③ 기초 페이지
      const order = n => n.equip ? secList.findIndex(s => s.id === n.section) : 100;
      notes.slice().sort((a, b) => order(a) - order(b)).forEach(n => {
        const href = ROOT + n.path;
        groups.push({
          id: n.path, kind: n.equip ? "page" : "basics", label: pageLabel(n), sub: n.equip ? "섹션 페이지" : "기초 페이지", href,
          items: (n.verify || []).map(v => ({ text: v.text, where: v.where, href: href + (v.anchor ? "#" + v.anchor : "") }))
        });
      });
      return groups.filter(g => g.items.length);
    }

    return { eq, modules, questions, sources, verify, homeHref };
  }

  window.SiteCollect = { make, groupOf, plain };
})();
