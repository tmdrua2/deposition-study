// =============================================================
// 공통 300mm 플랫폼 데이터 (EFEM · 로드포트/FOUP · 로드락 · 트랜스퍼 챔버)
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
      id: "efem", name: "EFEM", en: "Equipment Front End Module",
      parent: null, level: 1,
      shape: "box", size: [13, 4, 8.5], pos: [0, 2, 0],
      material: "panel",
      details: [
        { type: "seam", face: "front", count: 3 },
        { type: "bolts", face: "front" },
        { type: "seam", face: "right", count: 2, dir: "h" },
        { type: "label-plate", face: "right" },
        { type: "vent", face: "right", area: [0.2, 0.08, 0.8, 0.3] }
      ],
      label: { anchor: "top" }
    },
    {
      // FFU(팬 필터 유닛): EFEM 위에서 깨끗한 공기를 아래로 불어 넣는 장치
      id: "ffu", name: "FFU", en: "Fan Filter Unit",
      parent: "efem", level: 1,
      shape: "box", size: [12.4, 3.6, 0.7], pos: [0, 0, 8.5],
      material: "panel",
      details: [{ type: "vent", face: "top", area: [0.06, 0.2, 0.94, 0.8] }]
    },

    // ── 로드포트 + FOUP (3개: 첫 번째를 복사해서 씀) ──
    {
      id: "loadport", name: "로드포트", en: "Load Port",
      parent: "efem", level: 1,
      shape: "box", size: [3.4, 1.0, 3.8], pos: [-4.3, -2.5, 0],
      material: "panel",
      details: [
        { type: "seam", face: "front", count: 2, dir: "h" },
        { type: "label-plate", face: "front", area: [0.12, 0.62, 0.45, 0.74] }
      ]
    },
    {
      id: "lp-stage", name: "로드포트 받침대", en: "Load Port Stage",
      parent: "loadport", level: 1,
      shape: "box", size: [3.2, 3.0, 0.35], pos: [0, -1.0, 3.8],
      material: "dark"
    },
    {
      // FOUP: 웨이퍼 25장을 담아 옮기는 밀폐 상자
      id: "foup", name: "FOUP", en: "Front Opening Unified Pod",
      parent: "lp-stage", level: 1,
      shape: "box", size: [2.8, 2.7, 2.5], pos: [0, 0, 0.35],
      material: "foup",
      details: [{ type: "seam", face: "right", count: 2, dir: "h" }]
    },
    {
      id: "foup-handle", name: "FOUP 손잡이", en: "FOUP Top Flange",
      parent: "foup", level: 1,
      shape: "box", size: [1.6, 1.4, 0.3], pos: [0, 0, 2.5],
      material: "foup"
    },
    { id: "loadport-2", copyOf: "loadport", pos: [0, -2.5, 0] },
    { id: "loadport-3", copyOf: "loadport", pos: [4.3, -2.5, 0] },

    // ── 로드락: 대기압 ↔ 진공을 오가며 웨이퍼를 넘기는 작은 방 (2개) ──
    {
      id: "ll-frame", name: "로드락 받침 프레임", en: "Load Lock Frame",
      parent: null, level: 1,
      shape: "box", size: [5.4, 4.6, 3.5], pos: [0, 6.35, 0],
      material: "dark",
      details: [{ type: "vent", face: "right", area: [0.2, 0.15, 0.8, 0.45] }]
    },
    {
      id: "loadlock", name: "로드락", en: "Load Lock",
      parent: "ll-frame", level: 1,
      shape: "box", size: [2.3, 4.6, 2.6], pos: [-1.3, 0, 3.5],
      material: "metal",
      details: [
        { type: "bolts", face: "top", inset: 0.3 },
        { type: "window", face: "top", area: [0.25, 0.3, 0.75, 0.7] }
      ]
    },
    { id: "loadlock-2", copyOf: "loadlock", pos: [1.3, 0, 3.5] },

    // ── 트랜스퍼 챔버: 진공 로봇이 웨이퍼를 각 공정 챔버로 나눠 주는 가운데 방 (육각형) ──
    {
      id: "tc-frame", name: "메인프레임", en: "Mainframe",
      parent: null, level: 1,
      shape: "prism", sides: 6, size: [10, 10, 3.5], pos: [0, 13, 0],
      material: "dark"
    },
    {
      id: "tc", name: "트랜스퍼 챔버", en: "Transfer Chamber",
      parent: "tc-frame", level: 1,
      shape: "prism", sides: 6, size: [10, 10, 2.6], pos: [0, 0, 3.5],
      material: "metal",
      label: { anchor: "top" }
    },
    {
      id: "tc-lid", name: "트랜스퍼 챔버 뚜껑", en: "Transfer Chamber Lid",
      parent: "tc", level: 1,
      shape: "prism", sides: 6, size: [8.6, 8.6, 0.4], pos: [0, 0, 2.6],
      material: "metal",
      details: [{ type: "bolts", face: "top", count: 18 }]
    }
  ]
};
