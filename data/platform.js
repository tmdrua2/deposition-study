// =============================================================
// 공통 300mm 플랫폼 데이터 (EFEM · 로드포트/FOUP · 로드락 · 트랜스퍼 모듈(TM))
// + EFEM 부속: 시그널 타워 · 조작 화면(HMI) · 비상 정지 버튼(EMO)
// PECVD·ALD 장비가 같이 쓴다 → data/pecvd.js 의 platform: "common-300"
//
// ※ "대표적인 300mm 장비 구성"을 단순화한 모양이다. 실제 회사 제품을 따라 그리지 않았다.
// ※ 크기·위치 숫자는 그림 비율용 "추상 단위(u)"일 뿐, 실제 치수·사양이 아니다.
//
// 좌표 규칙 (그리는 방식과 무관한 3D 공간 기준 → 나중에 Three.js로 바꿔도 그대로 씀)
//   x = 오른쪽, y = 안쪽(깊이), z = 위
//   pos  = 도형 "바닥면 가운데"의 위치. parent가 있으면 부모 기준(부모의 회전도 따라감)
//   size = [폭(x), 깊이(y), 높이(z)]   (원기둥은 [지름, 지름, 높이])
//   rotZ = 위에서 봤을 때 회전 각도(도). 없으면 0
//   copyOf = 다른 부품을 자식 부품까지 통째로 복사해서 위치만 바꿔 씀
//   label = 도면식 이름표 { no: 번호, abbr: 영문 약어, anchor: 지시선이 닿는 자리(top·front·right) }
//           → 화면에는 "번호  약어  한글명(name)" 으로 표시됨 (js/explode/callouts.js)
//           anchor는 없어도 됨: 지시선 끝점은 렌더러가 "가려지지 않은 점" 중에서 자동으로 고름
//           anchor가 있으면 그 면(top·front·right) 위의 보이는 점에서만 고름 (EFEM은 윗면 → FOUP 쪽에 안 찍힘)
//   explode      = 분해가 끝났을 때 이 부품(과 자식들)이 옮겨 가 있는 방향×거리 [x, y, z] (u)
//                  · 부품 "자기 좌표" 기준 → rotZ로 돌린 공정 챔버 복사본도 값 하나로 각자 바깥쪽을 향함
//                  · 장비 전체 기준 최종 이동량이다 (부모가 나중에 움직여도 자식은 이미 간 자리에 그대로)
//   explodeOrder = 분해되는 차례 (1부터). 같은 차례끼리는 목록 순서대로 조금씩 시간차를 두고 움직임
//                  explodeOrder가 있는 부품 = 한 덩어리로 움직이는 "모듈" (js/explode/stage.js가 사용)
//   tag   = 그림 위 작은 표시 글자 (예: "PM1" — 공정 챔버와 그 챔버의 펌프를 짝지어 보여 줌)
//   details = 겉모양 디테일 "종류"만 적는다 (그리는 방법·색은 렌더러가 정함)
//     face: front(-y) · back(+y) · left(-x) · right(+x) · top
//     area: 그 면 안에서의 범위 [가로 시작, 세로 시작, 가로 끝, 세로 끝] (0~1 비율)
// =============================================================
window.EQUIPMENT_PLATFORMS = window.EQUIPMENT_PLATFORMS || {};
window.EQUIPMENT_PLATFORMS["common-300"] = {
  id: "common-300",
  title: "공통 300mm 플랫폼",
  parts: [
    // ── EFEM: 대기압에서 FOUP의 웨이퍼를 꺼내 로드락으로 넘기는 앞쪽 모듈 ──
    {
      // 폭을 넓혀 오른쪽 끝(로드포트 옆)에 조작 공간을 둠 → 터치 패널·EMO 버튼 자리
      id: "efem", name: "장비 전방 모듈", en: "Equipment Front End Module",
      parent: null, level: 1,
      shape: "box", size: [15.6, 4, 8.5], pos: [1.2, 2, 0],
      material: "panel",
      details: [
        { type: "seam", face: "front", count: 3 },
        { type: "bolts", face: "front" },
        { type: "seam", face: "right", count: 2, dir: "h" },
        { type: "label-plate", face: "right" },
        { type: "vent", face: "right", area: [0.2, 0.08, 0.8, 0.3] }
      ],
      label: { no: 2, abbr: "EFEM", anchor: "front" },  // 윗면은 FFU가 덮음 → 앞면 패널에 지시선
      explode: [0, -10.5, 0], explodeOrder: 2       // 앞쪽으로 (시그널 타워·HMI·EMO가 함께)
    },
    {
      // FFU(팬 필터 유닛): EFEM 위에서 깨끗한 공기를 아래로 불어 넣는 장치
      id: "ffu", name: "FFU", en: "Fan Filter Unit",
      parent: "efem", level: 1,
      shape: "box", size: [15, 3.6, 0.7], pos: [0, 0, 8.5],
      material: "panel",
      details: [{ type: "vent", face: "top", area: [0.06, 0.2, 0.94, 0.8] }]
    },

    // ── 로드포트 + FOUP (3개: 첫 번째를 복사해서 씀) ──
    {
      id: "loadport", name: "로드포트", en: "Load Port",
      parent: "efem", level: 1,
      shape: "box", size: [3.4, 1.0, 3.8], pos: [-5.5, -2.5, 0],
      material: "panel",
      details: [
        { type: "seam", face: "front", count: 2, dir: "h" },
        { type: "label-plate", face: "front", area: [0.12, 0.62, 0.45, 0.74] }
      ],
      explode: [0, -14, 0], explodeOrder: 1        // 맨 먼저, EFEM보다 더 앞쪽으로 (FOUP 함께)
    },
    {
      id: "lp-stage", name: "로드포트 받침대", en: "Load Port Stage",
      parent: "loadport", level: 1,
      shape: "box", size: [3.2, 3.0, 0.35], pos: [0, -1.0, 3.8],
      material: "dark"
    },
    {
      // FOUP: 웨이퍼 25장을 담아 옮기는 밀폐 상자
      id: "foup", name: "웨이퍼 운반 용기", en: "Front Opening Unified Pod",
      parent: "lp-stage", level: 1,
      shape: "box", size: [2.8, 2.7, 2.5], pos: [0, 0, 0.35],
      material: "foup",
      details: [{ type: "seam", face: "right", count: 2, dir: "h" }],
      label: { no: 1, abbr: "FOUP", anchor: "top" }
    },
    {
      id: "foup-handle", name: "FOUP 손잡이", en: "FOUP Top Flange",
      parent: "foup", level: 1,
      shape: "box", size: [1.6, 1.4, 0.3], pos: [0, 0, 2.5],
      material: "foup"
    },
    { id: "loadport-2", copyOf: "loadport", pos: [-1.2, -2.5, 0] },
    { id: "loadport-3", copyOf: "loadport", pos: [3.1, -2.5, 0] },

    // ── 시그널 타워: 장비 상태를 색으로 알리는 경광등 (위에서부터 빨강·노랑·초록) ──
    {
      id: "signal-tower", name: "시그널 타워", en: "Signal Tower",
      parent: "efem", level: 1,
      shape: "cylinder", size: [0.2, 0.2, 0.9], pos: [6.9, -1.1, 9.2],  // FFU 윗면 위
      material: "metal",
      label: { no: 9, abbr: "TOWER", anchor: "top" }
    },
    { id: "lamp-green", name: "초록 등", en: "Green Lamp", parent: "signal-tower", level: 1,
      shape: "cylinder", size: [0.56, 0.56, 0.48], pos: [0, 0, 0.9], material: "lamp-green" },
    { id: "lamp-amber", name: "노랑 등", en: "Amber Lamp", parent: "signal-tower", level: 1,
      shape: "cylinder", size: [0.56, 0.56, 0.48], pos: [0, 0, 1.38], material: "lamp-amber" },
    { id: "lamp-red", name: "빨강 등", en: "Red Lamp", parent: "signal-tower", level: 1,
      shape: "cylinder", size: [0.56, 0.56, 0.48], pos: [0, 0, 1.86], material: "lamp-red" },
    { id: "lamp-cap", name: "타워 뚜껑", en: "Tower Cap", parent: "signal-tower", level: 1,
      shape: "cylinder", size: [0.6, 0.6, 0.12], pos: [0, 0, 2.34], material: "dark" },

    // ── 조작 화면(터치 패널): 작업자가 레시피 선택·상태 확인을 하는 화면 (EFEM 앞면 오른쪽 끝) ──
    {
      id: "hmi", name: "조작 화면 (터치 패널)", en: "Operator Touch Panel (HMI)",
      parent: "efem", level: 1,
      shape: "box", size: [1.9, 0.16, 1.4], pos: [6.6, -2.08, 4.4],
      material: "dark",
      details: [{ type: "screen", face: "front" }],
      label: { no: 11, abbr: "HMI", anchor: "front" }
    },
    // ── EMO: 누르면 장비 전원을 즉시 끊는 빨간 비상 정지 버튼 (노란 바탕판 위) ──
    {
      id: "emo", name: "비상 정지 버튼", en: "Emergency Off (EMO)",
      parent: "efem", level: 1,
      shape: "box", size: [0.9, 0.12, 0.9], pos: [6.6, -2.06, 2.5],
      material: "warning",
      details: [{ type: "button", face: "front" }],
      label: { no: 10, abbr: "EMO", anchor: "front" }
    },

    // ── 로드락: 대기압 ↔ 진공을 오가며 웨이퍼를 넘기는 작은 방 (2개) ──
    {
      id: "ll-frame", name: "로드락 받침 프레임", en: "Load Lock Frame",
      parent: null, level: 1,
      shape: "box", size: [5.4, 4.6, 3.5], pos: [0, 6.35, 0],
      material: "dark",
      details: [{ type: "vent", face: "right", area: [0.2, 0.15, 0.8, 0.45] }],
      explode: [0, -4, 0], explodeOrder: 3         // 로드락 2개를 받침 프레임째 앞쪽으로 조금
    },
    {
      id: "loadlock", name: "로드락", en: "Load Lock",
      parent: "ll-frame", level: 1,
      shape: "box", size: [2.3, 4.6, 2.6], pos: [-1.3, 0, 3.5],
      material: "metal",
      details: [
        { type: "bolts", face: "top", inset: 0.3 },
        { type: "window", face: "top", area: [0.25, 0.3, 0.75, 0.7] }
      ],
      label: { no: 3, abbr: "LL", anchor: "top" }
    },
    { id: "loadlock-2", copyOf: "loadlock", pos: [1.3, 0, 3.5] },

    // ── 트랜스퍼 모듈(TM): 진공 로봇이 웨이퍼를 각 공정 챔버로 나눠 주는 가운데 방 (육각형) ──
    {
      id: "tm-frame", name: "메인프레임", en: "Mainframe",
      parent: null, level: 1,
      shape: "prism", sides: 6, size: [10, 10, 3.5], pos: [0, 13, 0],
      material: "dark",
      explode: [0, 0, 0], explodeOrder: 4          // 기준점: 제자리 (차례가 오면 이름표만 나타남)
    },
    {
      id: "tm", name: "트랜스퍼 모듈", en: "Transfer Module (TM)",
      parent: "tm-frame", level: 1,
      shape: "prism", sides: 6, size: [10, 10, 2.6], pos: [0, 0, 3.5],
      material: "metal",
      label: { no: 4, abbr: "TM", anchor: "top" }
    },
    {
      id: "tm-lid", name: "트랜스퍼 모듈 뚜껑", en: "Transfer Module Lid",
      parent: "tm", level: 1,
      shape: "prism", sides: 6, size: [8.6, 8.6, 0.4], pos: [0, 0, 2.6],
      material: "metal",
      details: [{ type: "bolts", face: "top", count: 18 }]
    }
  ]
};
