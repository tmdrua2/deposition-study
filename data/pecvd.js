// =============================================================
// PECVD 장비 데이터 — 1단계: "형태"만 (학습 내용은 3단계부터 부품별로 채움)
// 좌표·크기 규칙은 data/platform.js 맨 위 설명과 같다.
// EFEM·로드포트·로드락·트랜스퍼 챔버는 platform: "common-300"에서 가져온다.
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
      label: { anchor: "top" }
    },
    {
      // 챔버 아래 캐비닛: 히터 전원·리프트 장치·배기 밸브 등이 들어가는 자리
      id: "pm-frame", name: "공정 챔버 하부 캐비닛", en: "PM Lower Cabinet",
      parent: "pm", level: 1,
      shape: "box", size: [5.6, 6, 3.5], pos: [0, 0.2, -3.5],
      material: "panel",
      details: [
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
    { id: "pm-2", copyOf: "pm", name: "공정 챔버 2", pos: [6.35, 16.67, 3.5], rotZ: -60 },
    { id: "pm-3", copyOf: "pm", name: "공정 챔버 3", pos: [-6.35, 16.67, 3.5], rotZ: 60 },
    { id: "pm-4", copyOf: "pm", name: "공정 챔버 4", pos: [-6.35, 9.34, 3.5], rotZ: 120 },

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
        { type: "label-plate", face: "right", area: [0.6, 0.78, 0.88, 0.86] }
      ],
      label: { anchor: "top" }
    },
    {
      // 가스 배관: 가스 박스 → 공정 챔버 뚜껑 (path = 부품 위치 기준 꺾이는 점들)
      id: "gas-line", name: "가스 배관", en: "Gas Line",
      parent: null, level: 1,
      shape: "pipe", size: [0.32],
      pos: [0, 0, 0],
      path: [[12.0, 12.8, 8.0], [12.0, 12.8, 8.6], [12.0, 8.85, 8.6], [5.4, 8.85, 8.6], [5.4, 8.85, 6.7]],
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
        { type: "label-plate", face: "right", area: [0.12, 0.12, 0.45, 0.22] }
      ],
      label: { anchor: "top" }
    },
    {
      id: "rf-cable", name: "RF 케이블", en: "RF Cable",
      parent: null, level: 1,
      shape: "pipe", size: [0.26],
      pos: [0, 0, 0],
      path: [[11.4, 18.6, 5.5], [11.4, 18.6, 9.6], [11.4, 9.82, 9.6], [7.32, 9.82, 9.6], [7.32, 9.82, 8.0]],
      material: "cable"
    },

    // ── 펌프 + 배기 배관: 챔버 안 기체를 빼내 진공·압력을 유지 ──
    {
      id: "pump", name: "진공 펌프", en: "Dry Pump",
      parent: null, level: 1,
      shape: "box", size: [2.6, 3.4, 2.4], pos: [11.6, 6.4, 0],
      material: "panel",
      details: [
        { type: "vent", face: "front", area: [0.12, 0.2, 0.88, 0.75] },
        { type: "seam", face: "right", count: 2 },
        { type: "vent", face: "right", area: [0.1, 0.2, 0.45, 0.7] }
      ],
      label: { anchor: "top" }
    },
    {
      id: "foreline", name: "배기 배관", en: "Foreline / Exhaust",
      parent: null, level: 1,
      shape: "pipe", size: [0.55],
      pos: [0, 0, 0],
      path: [[11.0, 6.4, 2.4], [11.0, 6.4, 3.0], [8.35, 6.4, 3.0]],
      material: "pipe"
    }
  ]
};
