// =============================================================
// PECVD 장비 데이터 — 1단계: "형태"만 (학습 내용은 3단계부터 부품별로 채움)
// 좌표·크기 규칙은 data/platform.js 맨 위 설명과 같다.
// EFEM·로드포트·로드락·트랜스퍼 모듈(TM)은 platform: "common-300"에서 가져온다.
//
// ※ "대표적인 300mm PECVD 장비 구성"을 단순화한 모양. 실제 제품 외형·사양 아님.
// ※ 숫자는 그림 비율용 추상 단위(u).
// =============================================================
window.EQUIPMENT = window.EQUIPMENT || {};
window.EQUIPMENT.pecvd = {
  id: "pecvd",
  title: "PECVD 장비",
  process: "cvd",
  platform: "common-300",
  // 층 구분: 장비 본체는 팹 바닥(Fab floor) 위, 드라이 펌프는 바닥 아래층(Sub-fab)
  // z = 층 높이(u). 렌더러가 층마다 점선 바닥면과 층 이름을 그린다
  site: {
    floors: [
      { id: "fab-floor", name: "Fab floor", ko: "팹 바닥", z: 0 },
      { id: "sub-fab", name: "Sub-fab", ko: "서브팹 (아래층)", z: -6.5 }
    ]
  },
  parts: [
    // ── 공정 챔버(PM): 트랜스퍼 챔버의 오른쪽 앞 면에 붙은 것이 기준 ──
    //    rotZ로 돌려서 PM의 앞(front)이 트랜스퍼 챔버를 보게 함 → back = 바깥쪽 정비면
    {
      id: "pm", name: "공정 챔버", en: "Process Module (PM)",
      parent: null, level: 1,
      shape: "box", size: [5.2, 5.2, 2.6], pos: [6.35, 9.34, 3.5], rotZ: -120,
      material: "metal",
      details: [
        { type: "bolts", face: "top", inset: 0.25 },
        { type: "window", face: "right", area: [0.38, 0.3, 0.62, 0.72] },
        { type: "label-plate", face: "back", area: [0.1, 0.62, 0.34, 0.8] }
      ],
      tag: "PM1",                 // 그림 위 작은 챔버 번호 (펌프의 tag와 짝)
      label: { no: 5, abbr: "PM" },
      // 자기 좌표의 back(+y) = 트랜스퍼 모듈 반대쪽 → 복사본 4개 모두 TM에서 바깥쪽으로 빠짐
      explode: [0, 3.2, 0], explodeOrder: 5
    },
    {
      // 챔버 아래 캐비닛: 히터 전원·리프트 장치·배기 밸브 등이 들어가는 자리
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
      id: "pm-lid", name: "챔버 뚜껑", en: "Chamber Lid",
      parent: "pm", level: 1,
      shape: "cylinder", size: [4.4, 4.4, 0.6], pos: [0, 0, 2.6],
      material: "metal",
      details: [{ type: "bolts", face: "top", count: 16 }]
    },
    {
      // RF 매칭 박스: 전원과 플라즈마 사이 임피던스를 맞추는 장치 (뚜껑 위)
      id: "rf-match", name: "RF 매칭 박스", en: "RF Matching Network",
      parent: "pm", level: 1,
      shape: "box", size: [1.7, 1.5, 1.3], pos: [-0.9, 0.6, 3.2],
      material: "panel",
      details: [
        { type: "vent", face: "right", area: [0.15, 0.2, 0.85, 0.6] },
        { type: "vent", face: "back", area: [0.15, 0.2, 0.85, 0.6] },
        { type: "label-plate", face: "left", area: [0.15, 0.6, 0.6, 0.8] }
      ]
    },
    // 나머지 공정 챔버 3개: 위 PM을 통째로(자식 포함) 복사해서 다른 면에 붙임
    { id: "pm-2", copyOf: "pm", name: "공정 챔버 2", tag: "PM2", pos: [6.35, 16.67, 3.5], rotZ: -60 },
    { id: "pm-3", copyOf: "pm", name: "공정 챔버 3", tag: "PM3", pos: [-6.35, 16.67, 3.5], rotZ: 60 },
    { id: "pm-4", copyOf: "pm", name: "공정 챔버 4", tag: "PM4", pos: [-6.35, 9.34, 3.5], rotZ: 120 },

    // ── 가스 박스: 가스 밸브·MFC(유량 조절기)가 모인 캐비닛 ──
    {
      id: "gas-box", name: "가스 박스", en: "Gas Box",
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
      label: { no: 6, abbr: "GAS", anchor: "top" },
      explode: [4.5, 0, 0], explodeOrder: 6        // 오른쪽 옆으로
    },
    // 가스 배관: 가스 박스 윗면 → 위로 → 장비 위쪽을 지나 → 각 공정 챔버 뚜껑으로 (챔버마다 1줄)
    //   RF 매칭 박스보다 높게 지나고, 줄마다 높이를 조금씩 달리해 서로 겹치지 않게 함
    {
      id: "gas-line-1", name: "가스 배관 (PM1)", en: "Gas Line to PM1",
      parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
      connects: ["gas-box", "pm"],
      path: [[11.7, 12.2, 8], [11.7, 12.2, 8.6], [5.5, 12.2, 8.6], [5.5, 8.67, 8.6], [5.5, 8.67, 6.7]],
      material: "pipe"
    },
    {
      id: "gas-line-2", name: "가스 배관 (PM2)", en: "Gas Line to PM2",
      parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
      connects: ["gas-box", "pm-2"],
      path: [[11.7, 13, 8], [11.7, 13, 8.85], [6.5, 13, 8.85], [6.5, 15.6, 8.85], [6.5, 15.6, 6.7]],
      material: "pipe"
    },
    {
      id: "gas-line-3", name: "가스 배관 (PM3)", en: "Gas Line to PM3",
      parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
      connects: ["gas-box", "pm-3"],
      path: [[11.7, 13.8, 8], [11.7, 13.8, 9.1], [-5.5, 13.8, 9.1], [-5.5, 17.34, 9.1], [-5.5, 17.34, 6.7]],
      material: "pipe"
    },
    {
      id: "gas-line-4", name: "가스 배관 (PM4)", en: "Gas Line to PM4",
      parent: null, level: 1, shape: "pipe", size: [0.16], pos: [0, 0, 0],
      connects: ["gas-box", "pm-4"],
      path: [[11.7, 14.6, 8], [11.7, 14.6, 9.35], [-6.5, 14.6, 9.35], [-6.5, 10.41, 9.35], [-6.5, 10.41, 6.7]],
      material: "pipe"
    },

    // ── RF 전원 장치: 플라즈마를 켜는 고주파 전원 ──
    {
      id: "rf-generator", name: "RF 전원 장치", en: "RF Generator",
      parent: null, level: 1,
      shape: "box", size: [3, 3.2, 5.5], pos: [12.2, 19.5, 0],
      material: "panel",
      details: [
        { type: "seam", face: "front", count: 3, dir: "h" },
        { type: "vent", face: "front", area: [0.15, 0.08, 0.85, 0.28] },
        { type: "vent", face: "right", area: [0.12, 0.4, 0.88, 0.85] },
        { type: "label-plate", face: "right", area: [0.12, 0.12, 0.45, 0.22] },
        { type: "warning-label", face: "right", at: [0.78, 0.17] }
      ],
      label: { no: 7, abbr: "RF", anchor: "top" },
      explode: [4.5, 0, 0], explodeOrder: 6
    },
    // connects = 이 배관이 잇는 모듈 → 분해 때 그 모듈이 움직이기 시작하면 배관은 희미해지며 사라짐
    // RF 케이블: 공중 아치 대신 낮은 케이블 트레이 위를 따라 1번 챔버의 RF 매칭 박스까지
    //   트레이는 챔버 뚜껑 바로 위 높이, 2번 챔버와 가스 박스 사이 통로를 지나감
    {
      id: "cable-tray", name: "케이블 트레이", en: "Cable Tray",
      parent: null, level: 1,
      shape: "box", size: [0.6, 9.2, 0.12], pos: [10.6, 14.1, 6.8],
      material: "metal",
      explode: [4.5, 0, 0], explodeOrder: 6        // 가스 박스·RF와 함께 옆으로
    },
    // 가로 트레이·지지대는 세로 트레이의 자식 (pos는 세로 트레이 기준) → 같이 움직인다
    {
      id: "cable-tray-2", name: "케이블 트레이 (가로)", en: "Cable Tray",
      parent: "cable-tray", level: 1,
      shape: "box", size: [2.6, 0.6, 0.12], pos: [-1, -4.28, 0],
      material: "metal"
    },
    { id: "tray-post", name: "트레이 지지대", en: "Tray Post", parent: "cable-tray", level: 1,
      shape: "box", size: [0.18, 0.18, 6.8], pos: [0, 4.2, -6.8], material: "dark" },
    { id: "tray-post-2", copyOf: "tray-post", pos: [0, -3.7, -6.8] },
    {
      id: "rf-cable", name: "RF 케이블", en: "RF Cable",
      parent: null, level: 1,
      shape: "pipe", size: [0.14],
      pos: [0, 0, 0], connects: ["rf-generator", "pm"],
      path: [[11.2, 18.4, 5.5], [11.2, 18.4, 6.99], [10.6, 18.4, 6.99], [10.6, 9.82, 6.99], [8.2, 9.82, 6.99]],
      material: "cable"
    },

    // ── 드라이 펌프 + 배기 배관: 챔버별 독립 배기 ──
    //    펌프는 바닥 아래층(Sub-fab, z = -6.5)의 오른쪽 앞 빈 곳에 한 줄로 놓는다.
    //    (보는 방향이 오른쪽 앞 위라서, 챔버 바로 아래에 두면 뒤쪽 펌프가 위층 장비에 가려짐)
    //    배기 배관: 각 챔버 하부 캐비닛 밑면 → 팹 바닥을 뚫고 수직으로 → 서브팹 천장 높이에서
    //    수평으로 꺾여 → 자기 펌프 윗면으로. 펌프 1대 = 챔버 1개 (tag로 PM1~PM4 표시)
    {
      id: "pump", name: "드라이 펌프", en: "Dry Pump",
      parent: null, level: 1,
      shape: "box", size: [2.4, 3.0, 2.2], pos: [13.5, 8.0, -6.5],
      material: "panel-warm",
      details: [
        { type: "vent", face: "right", area: [0.12, 0.2, 0.88, 0.75] },
        { type: "seam", face: "front", count: 2 },
        { type: "warning-label", face: "front", at: [0.78, 0.72] }
      ],
      tag: "PM1",
      label: { no: 8, abbr: "PUMP" },
      explode: [3, -3, 0], explodeOrder: 7         // 마지막: 서브팹 바닥 위에서 앞·오른쪽으로 (가려진 펌프가 드러남)
    },
    { id: "pump-2", copyOf: "pump", name: "드라이 펌프 (PM2)", pos: [13.5, 15.0, -6.5], tag: "PM2" },
    { id: "pump-3", copyOf: "pump", name: "드라이 펌프 (PM3)", pos: [13.5, 18.5, -6.5], tag: "PM3" },
    { id: "pump-4", copyOf: "pump", name: "드라이 펌프 (PM4)", pos: [13.5, 4.5, -6.5], tag: "PM4" },
    {
      id: "foreline-1", name: "배기 배관 (PM1)", en: "Foreline to PM1 Pump",
      parent: null, level: 1, shape: "pipe", size: [0.5], pos: [0, 0, 0], connects: ["pm", "pump"],
      path: [[6.52, 9.24, 0], [6.52, 9.24, -2.5], [6.52, 8, -2.5], [12.9, 8, -2.5], [12.9, 8, -4.3]],
      material: "pipe"
    },
    {
      id: "foreline-2", name: "배기 배관 (PM2)", en: "Foreline to PM2 Pump",
      parent: null, level: 1, shape: "pipe", size: [0.5], pos: [0, 0, 0], connects: ["pm-2", "pump-2"],
      path: [[6.52, 16.77, 0], [6.52, 16.77, -2.5], [6.52, 15, -2.5], [12.9, 15, -2.5], [12.9, 15, -4.3]],
      material: "pipe"
    },
    {
      id: "foreline-3", name: "배기 배관 (PM3)", en: "Foreline to PM3 Pump",
      parent: null, level: 1, shape: "pipe", size: [0.5], pos: [0, 0, 0], connects: ["pm-3", "pump-3"],
      path: [[-6.52, 16.77, 0], [-6.52, 16.77, -2.5], [-6.52, 18.5, -2.5], [12.9, 18.5, -2.5], [12.9, 18.5, -4.3]],
      material: "pipe"
    },
    {
      id: "foreline-4", name: "배기 배관 (PM4)", en: "Foreline to PM4 Pump",
      parent: null, level: 1, shape: "pipe", size: [0.5], pos: [0, 0, 0], connects: ["pm-4", "pump-4"],
      path: [[-6.52, 9.24, 0], [-6.52, 9.24, -2.5], [-6.52, 4.5, -2.5], [12.9, 4.5, -2.5], [12.9, 4.5, -4.3]],
      material: "pipe"
    }
  ]
};
