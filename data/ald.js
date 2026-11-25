// =============================================================
// ALD(원자층 증착) 장비 데이터 — 1차: 형태 + 새 모듈 5개의 기본 설명
// 공통 모듈(EFEM·FOUP·로드락·TM·시그널 타워·EMO·HMI)은 data/platform.js 의 "common-300"을 그대로 쓴다 (복사 없음).
// 좌표·크기 규칙은 data/platform.js 맨 위 설명과 같다.
//
// ALD만의 모듈 (이 파일에서 새로 정의)
//   · 공정 챔버(PM)   — 작은 반응 공간, 아래 가열 구조 + 뚜껑 위 ALD 밸브 블록
//   · ALD 밸브        — 챔버 뚜껑에 바로 붙은 빠른 개폐 밸브 3개 (전구체 / 반응 기체 / 퍼지)
//   · 전구체 공급부   — 가열되는 용기(캐니스터) + 가열 배관
//   · 반응 기체·퍼지 가스 공급부 — 산화제 등 반응 기체와 불활성 퍼지 가스
//   · 플라즈마 소스(PEALD) — 선택 구성
//
// 드라이 펌프·배기 배관: 지금은 data/pecvd.js 안에 있다(플랫폼 파일에는 없음).
//   → 그림 형태와 공통 설명은 PECVD 것을 가져와 쓰고(그래서 pecvd.js를 먼저 불러야 함),
//     PECVD에만 해당하는 글(파우더·세정·PECVD 면접 질문)만 ALD용으로 바꿔 끼운다. 2차에서 펌프를 플랫폼으로 옮길지 결정.
//
// ※ "대표적인 300mm ALD 장비 구성"을 단순화한 모양. 실제 제품 외형·사양 아님.
// ※ 숫자는 그림 비율용 추상 단위(u).
// ※ 패널 글: 확인하지 않은 내용은 [검증 필요], 출처는 종류만(직접 열어 본 자료 없음). 공정변수·문제·면접 칸은 2차에서 작성.
// =============================================================
window.EQUIPMENT = window.EQUIPMENT || {};
(function () {
  "use strict";

  // ── PECVD 데이터에서 펌프·배기 배관 가져오기 (그림 형태 + 공통 설명) ──
  const pe = window.EQUIPMENT.pecvd;
  const pumpParts = pe ? pe.parts.filter((p) => /^(pump|foreline)/.test(p.id)).map((p) => {
    if (p.id !== "pump") return p;
    // ④·⑤번 원리 글과 PECVD 면접 질문은 PECVD 이야기 → ALD용으로 바꿔 끼움 (나머지 글은 공통 내용)
    const principle = p.principle.slice();
    principle[3] = "④ ALD의 배기 배관: 전구체와 반응 기체가 같은 배관으로 빠져나가다 만나면 배관 안에서 반응해 가루나 막이 쌓일 수 있습니다. 그래서 단계 사이에 퍼지로 먼저 몰아내고, 배기 배관을 데워 식지 않게 하는 구성이 흔합니다 [검증 필요].";
    principle[4] = "⑤ 스크러버: 다 쓰지 못한 전구체와 부산물은 독성이거나 불이 붙기 쉬울 수 있어서, 펌프 바로 뒤 스크러버에서 처리한 뒤 공장 배기로 보냅니다. 전구체 종류마다 처리 방법이 다릅니다 [검증 필요].";
    return Object.assign({}, p, {
      principle: principle,
      interview: (p.interview || []).filter((it) => !/PECVD/.test(it.q + it.a)),
      sources: (p.sources || []).filter((s) => !/파우더/.test(s.note || ""))
    });
  }) : [];

  window.EQUIPMENT.ald = {
    id: "ald",
    title: "ALD 장비",
    process: "ald",
    platform: "common-300",
    site: {
      floors: [
        { id: "fab-floor", name: "Fab floor", ko: "팹 바닥", z: 0 },
        { id: "sub-fab", name: "Sub-fab", ko: "서브팹 (아래층)", z: -6.5 }
      ]
    },
    parts: [
      // ── 공정 챔버(PM): TM의 오른쪽 앞 면이 기준, 나머지 3개는 아래에서 통째로 복사 ──
      {
        id: "pm", name: "ALD 공정 챔버", en: "ALD Process Module (PM)",
        parent: null, level: 1,
        shape: "box", size: [5.2, 5.2, 2.2], pos: [6.35, 9.34, 3.5], rotZ: -120,
        material: "metal",
        details: [
          { type: "bolts", face: "top", inset: 0.25 },
          { type: "window", face: "right", area: [0.38, 0.3, 0.62, 0.72] },
          { type: "label-plate", face: "back", area: [0.1, 0.62, 0.34, 0.8] }
        ],
        tag: "PM1",
        label: { no: 5, abbr: "PM" },
        explode: [0, 8.5, 0], explodeOrder: 5,

        role: "웨이퍼가 한 층씩 막을 입는 진공 방입니다. TM에서 웨이퍼 한 장을 받아 히터 위에 올리고, 전구체와 반응 기체를 번갈아 넣어 원자층 단위로 막을 쌓습니다. 한 번에 한 가지 기체만 넣고 다음 기체를 넣기 전에 퍼지로 몰아내야 해서, 안쪽 공간을 작게 만들어 기체가 빨리 들어오고 빨리 빠지게 하는 설계가 많습니다 [검증 필요]. 이 그림처럼 TM 둘레에 챔버 여러 개를 붙여 여러 장을 동시에 처리합니다.",
        components: [
          { name: "반응 공간 (작은 내부 공간)", en: "Reaction Volume", desc: "웨이퍼 위의 기체가 머무는 공간. 작을수록 기체를 갈아 끼우는 시간(퍼지 시간)이 줄어듭니다 [검증 필요]." },
          { name: "ALD 밸브 블록", en: "ALD Valve Block", part: "ald-valve", desc: "뚜껑 위, 챔버 바로 옆에 붙은 빠른 개폐 밸브 묶음. 전구체·반응 기체·퍼지 가스가 여기서 켜지고 꺼집니다." },
          { name: "히터 / 서셉터 (가열 구조)", en: "Heater / Susceptor", desc: "웨이퍼를 올려놓고 정해진 온도로 데우는 받침대. 표면 반응이 일어나는 온도를 맞춥니다. 챔버 벽·뚜껑도 따로 데워 전구체가 식어서 붙는 것을 막는 구성이 많습니다 [검증 필요]." },
          { name: "슬릿 밸브 · 리프트 핀", en: "Slit Valve · Lift Pin", desc: "웨이퍼 출입구를 여닫는 문과, 웨이퍼를 들어 올리고 내려놓는 핀. 동작은 PECVD 챔버와 같습니다." },
          { name: "배기 포트 · 펌핑 링", en: "Exhaust Port · Pumping Ring", desc: "퍼지 가스가 남은 기체를 밀어낼 때 빠져나가는 길. 기체가 웨이퍼 위를 고르게 지나가도록 둘레에서 빨아냅니다 [검증 필요]." },
          { name: "플라즈마 소스 (선택 구성)", en: "Plasma Source (PEALD option)", part: "peald-rf", desc: "플라즈마 ALD(PEALD)를 쓰는 구성에서만 붙는 장치. 열만 쓰는 열 ALD 장비에는 없습니다." }
        ],
        principle: [
          "① 웨이퍼가 히터 위에 놓이고 슬릿 밸브가 닫힙니다. 챔버는 정해진 온도와 압력으로 맞춰집니다.",
          "② 전구체 주입: 전구체(막의 재료가 되는 원료 분자)가 웨이퍼 표면에 붙습니다. 표면의 붙을 자리가 다 차면 더 이상 붙지 않습니다. 이것이 자기제한 반응이고, 그래서 한 번에 쌓이는 양이 한 층 정도로 정해집니다([[박막 성장|basics/thin-film-growth.html]]).",
          "③ 퍼지: 불활성 가스(N2·Ar 등)로 표면에 붙지 않은 남은 전구체를 몰아냅니다. 덜 빼면 다음 기체와 공중에서 만나 반응하고, 그러면 층 단위 성장이 깨지고 파티클이 생깁니다.",
          "④ 반응 기체 주입: 산화제 같은 반응 기체가 표면에 붙어 있던 전구체와 반응해 막 한 층을 완성합니다. 이 반응도 표면의 자리가 다 차면 멈춥니다.",
          "⑤ 퍼지: 남은 반응 기체와 부산물을 다시 몰아냅니다. 여기까지가 한 사이클이고, 이 네 단계를 원하는 두께가 될 때까지 반복합니다. 두께는 사이클 횟수로 정해지고, 사이클마다 쌓이는 양이 거의 같아서 두께와 모양(단차 피복)을 정밀하게 맞추기 좋습니다.",
          "⑥ 온도의 역할: 너무 낮으면 반응이 잘 안 되거나 전구체가 식어서 붙어 버리고, 너무 높으면 전구체가 스스로 분해돼 CVD처럼 층 단위가 아니라 마구 쌓일 수 있습니다. 그래서 제대로 층 단위 성장이 되는 온도 범위가 있습니다 [검증 필요]."
        ],
        sources: [
          { kind: "일반 교과서 내용", note: "ALD 자기제한 반응·4단계 사이클·퍼지 역할 (직접 열어 확인한 자료 없음 — 2차에서 출처 보강)" }
        ]
      },
      {
        // 챔버 아래 캐비닛: 히터 전원·리프트 장치·배기 밸브가 들어가는 자리 (가열 구조의 아랫부분)
        id: "pm-frame", name: "공정 챔버 하부 캐비닛", en: "PM Lower Cabinet",
        parent: "pm", level: 1,
        shape: "box", size: [5.6, 6, 3.5], pos: [0, 0.2, -3.5],
        material: "panel-warm",
        details: [
          { type: "warning-label", face: "back", at: [0.85, 0.62] },
          { type: "seam", face: "back", count: 2 },
          { type: "bolts", face: "back" },
          { type: "vent", face: "back", area: [0.12, 0.12, 0.88, 0.38] },
          { type: "handle", face: "back" },
          { type: "seam", face: "right", count: 2 },
          { type: "seam", face: "left", count: 2 },
          { type: "vent", face: "left", area: [0.15, 0.6, 0.85, 0.85] }
        ]
      },
      {
        // 뚜껑: PECVD보다 낮고 납작 (작은 반응 공간)
        id: "pm-lid", name: "챔버 뚜껑", en: "Chamber Lid",
        parent: "pm", level: 1,
        shape: "cylinder", size: [4.0, 4.0, 0.5], pos: [0, 0, 2.2],
        material: "metal",
        details: [{ type: "bolts", face: "top", count: 16 }]
      },
      {
        // ALD 밸브 블록: 뚜껑 위, 챔버 가까이 (뒤쪽 가장자리 쪽)
        id: "ald-valve", name: "ALD 밸브", en: "ALD Valve Block",
        parent: "pm", level: 1,
        shape: "box", size: [2.0, 1.1, 0.5], pos: [0, 0.6, 2.7],
        material: "panel",
        details: [{ type: "vent", face: "right", area: [0.2, 0.2, 0.8, 0.7] }],
        label: { no: 12, abbr: "VALVE" },

        role: "챔버 뚜껑 바로 위에 붙은 빠른 개폐 밸브 묶음입니다. ALD는 기체를 아주 짧게 켰다 끄기를 계속 반복하므로, 컨트롤러 신호에 맞춰 빠르게 열리고 닫혀야 합니다. 밸브가 챔버에서 멀면 배관 속 기체가 늦게 도착하고 늦게 빠져서 주입·퍼지 시간이 흐려집니다. 그래서 챔버 가까이에 붙입니다.",
        components: [
          { name: "전구체 밸브", en: "Precursor Valve", desc: "전구체 공급부에서 온 가열 배관을 여닫습니다. 전구체 주입 단계에만 열립니다." },
          { name: "반응 기체 밸브", en: "Reactant Valve", desc: "산화제 같은 반응 기체 배관을 여닫습니다. 반응 기체 주입 단계에만 열립니다." },
          { name: "퍼지 밸브", en: "Purge Valve", desc: "불활성 퍼지 가스 배관을 여닫습니다. 두 번의 퍼지 단계에서 열려 남은 기체를 몰아냅니다." },
          { name: "밸브 블록 (가열)", en: "Valve Manifold", desc: "밸브 셋을 한 덩어리로 묶은 몸체. 전구체가 식어서 붙지 않도록 몸체도 데우는 구성이 많습니다 [검증 필요]." }
        ],
        principle: [
          "① 사이클 순서대로 밸브가 열립니다: 전구체 밸브 → (닫고) 퍼지 밸브 → 반응 기체 밸브 → 퍼지 밸브. 한 번에 한 가지 기체만 챔버로 들어갑니다.",
          "② 응답 속도: 개폐가 느리거나 들쭉날쭉하면 매 사이클 들어가는 기체의 양이 달라지고, 그러면 사이클당 쌓이는 두께도 달라질 수 있습니다 [검증 필요]. 빠른 응답을 위해 공압이나 솔레노이드로 구동하는 밸브를 쓰는 경우가 많습니다 [검증 필요].",
          "③ 챔버와의 거리: 밸브와 챔버 사이 배관이 길수록 그 안에 기체가 남고, 퍼지에도 잘 안 빠지는 막다른 구간(데드 레그)이 생깁니다. 밸브를 챔버에 붙이는 이유 중 하나입니다.",
          "④ 안전: 전구체와 반응 기체가 서로 닿으면 배관 안에서 반응할 수 있으므로, 두 밸브가 동시에 열리지 않도록 컨트롤러가 순서를 지킵니다 [검증 필요].",
          "⑤ 수명: 하루에 개폐 횟수가 매우 많아 소모품에 가깝습니다. 개폐 횟수를 세어 두고 정해진 때에 교체하는 예방 정비 대상입니다 [검증 필요]."
        ],
        sources: [
          { kind: "일반 교과서 내용", note: "ALD 밸브 구성·개폐 순서 (직접 열어 확인한 자료 없음 — 2차에서 출처 보강)" }
        ]
      },
      // 밸브 3개: 밸브 블록 위 (그림에서 사이클 애니메이션이 이 부품들을 하늘색으로 켬)
      { id: "v-prec", name: "전구체 밸브", en: "Precursor Valve", parent: "ald-valve", level: 1,
        shape: "cylinder", size: [0.55, 0.55, 0.55], pos: [-0.65, 0, 0.5], material: "metal" },
      { id: "v-react", name: "반응 기체 밸브", en: "Reactant Valve", parent: "ald-valve", level: 1,
        shape: "cylinder", size: [0.55, 0.55, 0.55], pos: [0, 0, 0.5], material: "metal" },
      { id: "v-purge", name: "퍼지 밸브", en: "Purge Valve", parent: "ald-valve", level: 1,
        shape: "cylinder", size: [0.55, 0.55, 0.55], pos: [0.65, 0, 0.5], material: "metal" },

      // 나머지 공정 챔버 3개: 위 PM을 통째로(자식 포함) 복사
      { id: "pm-2", copyOf: "pm", name: "ALD 공정 챔버 2", tag: "PM2", pos: [6.35, 16.67, 3.5], rotZ: -60 },
      { id: "pm-3", copyOf: "pm", name: "ALD 공정 챔버 3", tag: "PM3", pos: [-6.35, 16.67, 3.5], rotZ: 60 },
      { id: "pm-4", copyOf: "pm", name: "ALD 공정 챔버 4", tag: "PM4", pos: [-6.35, 9.34, 3.5], rotZ: 120 },

      // ── 전구체 공급부: 가열되는 용기(캐니스터)가 위에 올라간 캐비닛 ──
      {
        id: "precursor", name: "전구체 공급부", en: "Precursor Delivery",
        parent: null, level: 1,
        shape: "box", size: [3, 4.2, 8], pos: [12.6, 13.5, 0],
        material: "panel",
        details: [
          { type: "seam", face: "front", count: 2, dir: "h" },
          { type: "vent", face: "front", area: [0.15, 0.06, 0.85, 0.2] },
          { type: "seam", face: "right", count: 2 },
          { type: "bolts", face: "right" },
          { type: "window", face: "right", area: [0.15, 0.55, 0.42, 0.85] },
          { type: "label-plate", face: "right", area: [0.6, 0.78, 0.88, 0.86] },
          { type: "warning-label", face: "front", at: [0.5, 0.42] }
        ],
        label: { no: 6, abbr: "PREC", anchor: "top" },
        explode: [13.5, -6.5, 0], explodeOrder: 6,

        role: "전구체(막의 재료가 되는 원료 물질)를 담아 챔버로 보내는 캐비닛입니다. 액체나 고체 전구체는 용기를 데워 증기를 만들고, 그 증기를 캐리어 가스(운반용 불활성 가스)에 실어 가열된 배관으로 챔버 밸브까지 보냅니다. 전구체 용기가 위에 올라가 있어 교체하기 쉽게 되어 있다고 생각하면 됩니다 [검증 필요].",
        components: [
          { name: "전구체 용기 (캐니스터)", en: "Precursor Canister", desc: "전구체를 담은 밀폐 용기. 가열해서 증기압(증발해서 기체가 되려는 힘)을 만듭니다. 다 쓰면 용기째 교체합니다." },
          { name: "용기 히터 · 온도 센서", en: "Canister Heater · Sensor", desc: "용기 온도를 일정하게 유지합니다. 온도가 흔들리면 같은 시간 동안 나오는 전구체의 양이 달라집니다." },
          { name: "가열 배관", en: "Heated Line", desc: "용기에서 챔버 밸브까지 가는 배관을 감싼 히터. 증기가 중간에 식어서 액체나 고체로 붙어 버리는 것을 막습니다." },
          { name: "캐리어 가스 라인 (MFC·밸브)", en: "Carrier Gas Line", desc: "전구체 증기를 실어 나르는 불활성 가스의 양을 MFC로 맞춥니다. 구성은 전구체마다 다릅니다 [검증 필요]." },
          { name: "누설 감시 · 배기 함체", en: "Leak Sensor · Exhausted Enclosure", desc: "독성이거나 불이 붙기 쉬운 전구체가 새면 감지해 알람을 내고, 함체는 늘 배기됩니다." }
        ],
        principle: [
          "① 용기 가열: 전구체 용기를 정해진 온도로 데우면 안에서 증기가 생깁니다. 온도가 높을수록 증기가 많이 나옵니다.",
          "② 운반: 캐리어 가스가 용기 위를 지나며 증기를 싣고, 가열된 배관을 따라 챔버 쪽 ALD 밸브까지 갑니다. 전구체 밸브가 열려 있는 짧은 시간 동안만 챔버로 들어갑니다.",
          "③ 배관 온도: 배관이 용기보다 차가운 곳(콜드 스팟)이 있으면 증기가 거기서 응축해 쌓입니다. 그래서 용기에서 챔버 쪽으로 갈수록 같거나 조금 더 따뜻하게 맞추는 구성이 흔합니다 [검증 필요].",
          "④ 너무 데우면: 열에 약한 전구체는 용기 안에서 분해될 수 있습니다. 증기를 충분히 만들면서 분해되지 않는 온도 사이에서 맞춥니다 [검증 필요].",
          "⑤ 안전: 전구체 중에는 독성이거나 공기에 닿으면 불이 붙는 것도 있습니다. 그래서 용기를 교환하는 작업은 정해진 절차와 보호 장비를 따릅니다 [검증 필요]."
        ],
        sources: [
          { kind: "일반 교과서 내용", note: "ALD 전구체 공급 방식(가열 용기·가열 배관·캐리어 가스) — 직접 열어 확인한 자료 없음, 전구체 종류별 차이는 2차에서 확인" }
        ]
      },
      // 전구체 용기 2개: 캐비닛 윗면 (배관 시작점 쪽 x = 11.7 을 피해 오른쪽에 놓음)
      { id: "canister-1", name: "전구체 용기", en: "Precursor Canister", parent: "precursor", level: 1,
        shape: "cylinder", size: [1.0, 1.0, 1.2], pos: [0.5, -1.05, 8], material: "metal" },
      { id: "canister-2", name: "전구체 용기", en: "Precursor Canister", parent: "precursor", level: 1,
        shape: "cylinder", size: [1.0, 1.0, 1.2], pos: [0.5, 1.05, 8], material: "metal" },

      // ── 반응 기체·퍼지 가스 공급부 ──
      {
        id: "reactant", name: "반응 기체·퍼지 공급부", en: "Reactant & Purge Gas Supply",
        parent: null, level: 1,
        shape: "box", size: [3, 3.2, 5.5], pos: [12.2, 19.5, 0],
        material: "panel",
        details: [
          { type: "vent", face: "front", area: [0.15, 0.7, 0.85, 0.92] },
          { type: "seam", face: "front", count: 2, dir: "h" },
          { type: "seam", face: "right", count: 2 },
          { type: "bolts", face: "right" },
          { type: "label-plate", face: "right", area: [0.6, 0.74, 0.88, 0.84] },
          { type: "warning-label", face: "front", at: [0.5, 0.4] }
        ],
        label: { no: 7, abbr: "RG", anchor: "top" },
        explode: [18, -11, 0], explodeOrder: 6,

        role: "전구체와 반응해 막을 완성하는 반응 기체(산화제 등)와, 단계 사이에 남은 기체를 몰아내는 퍼지 가스(불활성 가스)를 공급하는 캐비닛입니다. 가스 박스와 같은 가스 스틱(밸브·필터·MFC를 한 줄로 이은 배관) 구성이지만, ALD에서는 이 가스들이 사이클에 맞춰 짧게 켜졌다 꺼지는 것이 다릅니다 [검증 필요].",
        components: [
          { name: "반응 기체 라인", en: "Reactant Line", desc: "산화제 같은 반응 기체를 보내는 가스 스틱. 어떤 기체를 쓰는지(예: 물 증기, 오존, 산소 등)는 만드는 막과 공정마다 다릅니다 [검증 필요]." },
          { name: "퍼지 가스 라인 (N2·Ar 등)", en: "Purge Gas Line", desc: "반응하지 않는 불활성 가스를 보내는 가스 스틱. 퍼지 단계에서 챔버와 배관의 남은 기체를 밀어냅니다." },
          { name: "MFC · 밸브 · 필터", en: "MFC · Valve · Filter", desc: "각 라인의 유량을 맞추고, 켜고 끄고, 입자를 걸러 내는 부품. 구성은 가스 박스와 같습니다." },
          { name: "안전 함체 · 누설 감시", en: "Enclosure · Leak Sensor", desc: "가스가 새면 감지하고 함체를 배기합니다. 반응 기체에 따라 필요한 안전 장치가 다릅니다 [검증 필요]." }
        ],
        principle: [
          "① 반응 기체 단계: 반응 기체 라인이 열리면 가스 스틱의 MFC가 정해진 양을 챔버 쪽 ALD 밸브로 보냅니다.",
          "② 퍼지 단계: 퍼지 가스는 사이클 사이에 흘려 남은 기체를 몰아냅니다. 퍼지 가스를 전구체 캐리어 가스로도 쓰는 구성이 있습니다 [검증 필요].",
          "③ 라인 분리: 반응 기체와 전구체가 챔버 밖 배관에서 만나면 거기서 반응해 막이나 가루가 쌓일 수 있습니다. 그래서 두 기체는 서로 다른 배관으로 챔버 밸브까지 따로 갑니다."
        ],
        sources: [
          { kind: "일반 교과서 내용", note: "ALD 반응 기체·퍼지 가스 공급 구성 — 직접 열어 확인한 자료 없음, 반응 기체 종류는 2차에서 확인" }
        ]
      },

      // ── 가스 배관: 공급부 → 각 챔버의 ALD 밸브 (챔버마다 2줄, 높이를 달리해 겹치지 않게) ──
      //   전구체 배관(가열)은 전구체 밸브로, 반응 기체 배관은 반응 기체 밸브로 간 뒤 퍼지 밸브까지 이어짐(퍼지 가스도 이 줄로 옴)
      { id: "prec-line-1", name: "전구체 가열 배관 (PM1)", en: "Heated Precursor Line to PM1", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["precursor", "pm"], material: "pipe",
        path: [[11.7, 12.2, 8], [11.7, 12.2, 8.6], [7.19, 12.2, 8.6], [7.19, 9.6, 8.6], [7.19, 9.6, 7.25]] },
      { id: "prec-line-2", name: "전구체 가열 배관 (PM2)", en: "Heated Precursor Line to PM2", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["precursor", "pm-2"], material: "pipe",
        path: [[11.7, 13, 8], [11.7, 13, 8.85], [6.54, 13, 8.85], [6.54, 17.53, 8.85], [6.54, 17.53, 7.25]] },
      { id: "prec-line-3", name: "전구체 가열 배관 (PM3)", en: "Heated Precursor Line to PM3", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["precursor", "pm-3"], material: "pipe",
        path: [[11.7, 13.8, 8], [11.7, 13.8, 9.1], [-7.19, 13.8, 9.1], [-7.19, 16.41, 9.1], [-7.19, 16.41, 7.25]] },
      { id: "prec-line-4", name: "전구체 가열 배관 (PM4)", en: "Heated Precursor Line to PM4", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["precursor", "pm-4"], material: "pipe",
        path: [[11.7, 14.6, 8], [11.7, 14.6, 9.35], [-6.54, 14.6, 9.35], [-6.54, 8.48, 9.35], [-6.54, 8.48, 7.25]] },
      { id: "reac-line-1", name: "반응 기체·퍼지 배관 (PM1)", en: "Reactant & Purge Line to PM1", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["reactant", "pm"], material: "pipe",
        path: [[11.3, 18.4, 5.5], [11.3, 18.4, 9.9], [6.87, 18.4, 9.9], [6.87, 9.04, 9.9], [6.87, 9.04, 7.25], [6.54, 8.48, 7.25]] },
      { id: "reac-line-2", name: "반응 기체·퍼지 배관 (PM2)", en: "Reactant & Purge Line to PM2", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["reactant", "pm-2"], material: "pipe",
        path: [[11.3, 19.1, 5.5], [11.3, 19.1, 10.15], [6.87, 19.1, 10.15], [6.87, 16.97, 10.15], [6.87, 16.97, 7.25], [7.19, 16.41, 7.25]] },
      { id: "reac-line-3", name: "반응 기체·퍼지 배관 (PM3)", en: "Reactant & Purge Line to PM3", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["reactant", "pm-3"], material: "pipe",
        path: [[11.3, 19.8, 5.5], [11.3, 19.8, 10.4], [-6.87, 19.8, 10.4], [-6.87, 16.97, 10.4], [-6.87, 16.97, 7.25], [-6.54, 17.53, 7.25]] },
      { id: "reac-line-4", name: "반응 기체·퍼지 배관 (PM4)", en: "Reactant & Purge Line to PM4", parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
        connects: ["reactant", "pm-4"], material: "pipe",
        path: [[11.3, 20.5, 5.5], [11.3, 20.5, 10.65], [-6.87, 20.5, 10.65], [-6.87, 9.04, 10.65], [-6.87, 9.04, 7.25], [-7.19, 9.6, 7.25]] },

      // ── 플라즈마 소스: 플라즈마 ALD(PEALD)를 쓰는 구성에서만 붙는 선택 장치 (왼쪽 빈 곳) ──
      {
        id: "peald-rf", name: "플라즈마 소스 (선택 구성)", en: "Plasma Source — PEALD option",
        parent: null, level: 1,
        shape: "box", size: [2.4, 3, 4.5], pos: [-12.6, 13.5, 0],
        material: "panel",
        details: [
          { type: "seam", face: "front", count: 2, dir: "h" },
          { type: "vent", face: "front", area: [0.15, 0.7, 0.85, 0.92] },
          { type: "label-plate", face: "right", area: [0.15, 0.6, 0.6, 0.8] },
          { type: "warning-label", face: "front", at: [0.5, 0.4] }
        ],
        label: { no: 13, abbr: "PEALD", anchor: "top" },
        explode: [-8, -10, 0], explodeOrder: 6,

        role: "선택 구성입니다. 열만 쓰는 열 ALD 장비에는 없고, 플라즈마 ALD(PEALD)를 쓰는 장비에만 붙습니다. 반응 기체 주입 단계에서 플라즈마를 켜 반응성이 큰 라디칼(반응성이 큰 원자·조각)을 만들어, 열만으로는 어려운 반응을 낮은 온도에서 일으킵니다. 플라즈마를 챔버 안에서 만드는지 밖에서 만들어 보내는지는 장비마다 다릅니다 [검증 필요].",
        components: [
          { name: "RF 전원 장치", en: "RF Generator", desc: "플라즈마를 켜는 고주파 전원. PECVD의 RF 전원과 같은 역할입니다." },
          { name: "매칭 네트워크", en: "Matching Network", desc: "전원과 플라즈마 사이 임피던스를 맞춰 전력이 반사되지 않게 합니다. PECVD와 같은 원리입니다." },
          { name: "플라즈마 발생부 (챔버 안 또는 원격)", en: "Plasma Generator", desc: "반응 기체를 플라즈마로 만드는 곳. 위치와 방식은 장비마다 다릅니다 [검증 필요]." }
        ],
        principle: [
          "① 반응 기체 단계에서만 RF를 켭니다. 나머지 단계(전구체·퍼지)에서는 꺼져 있습니다 [검증 필요].",
          "② 플라즈마가 만든 라디칼이 표면에 붙어 있던 전구체와 반응합니다. 열만 쓸 때보다 낮은 온도에서도 반응이 일어나고, 열에 약한 소자나 재료에 쓰기 좋습니다 [검증 필요].",
          "③ 트레이드오프: 플라즈마가 표면에 주는 손상이 생길 수 있고, 좁고 깊은 구조 안쪽까지 라디칼이 도달하기 어려워 열 ALD보다 단차 피복이 불리할 수 있습니다 [검증 필요].",
          "※ 플라즈마와 RF의 자세한 원리는 [[플라즈마|basics/plasma.html]] 페이지와 PECVD의 RF 전원 장치 설명을 참고하세요."
        ],
        sources: [
          { kind: "일반 교과서 내용", note: "열 ALD와 플라즈마 ALD(PEALD)의 차이 — 직접 열어 확인한 자료 없음, 2차에서 출처 보강" }
        ]
      },

      // ── 드라이 펌프 4대 + 배기 배관: PECVD 데이터에서 가져옴 (파일 위쪽 설명 참고) ──
      ...pumpParts
    ]
  };
})();
