// =============================================================
// 표지(index.html) 장비 진열 — 준비 중 장비의 "단순한 실루엣" 형태 데이터
// 규칙은 data/platform.js 맨 위 설명과 같다 (shape·size·pos·rotZ·material 이름만).
// 표지에서는 js/home.js가 render-iso.js로 그린 뒤 한 가지 색 실루엣으로 칠한다.
//
// ※ 각 공정 장비의 "대표적인 구성"을 아주 단순하게 줄인 모양. 실제 제품 외형·사양 아님.
// ※ 숫자는 그림 비율용 추상 단위(u).
// =============================================================
window.EQUIPMENT_LINEUP = {
  // ALD: 공통 플랫폼 + 납작한 챔버 4개 (원자층 증착 챔버는 작은 반응 공간)
  ald: {
    id: "ald", platform: "common-300",
    parts: [
      { id: "c1", shape: "cylinder", size: [4.6, 4.6, 2], pos: [6.35, 9.34, 3.5], material: "metal" },
      { id: "c1-base", parent: "c1", shape: "box", size: [4.8, 4.8, 3.5], pos: [0, 0, -3.5], material: "panel-warm" },
      { id: "c2", copyOf: "c1", pos: [6.35, 16.67, 3.5] },
      { id: "c3", copyOf: "c1", pos: [-6.35, 16.67, 3.5] },
      { id: "c4", copyOf: "c1", pos: [-6.35, 9.34, 3.5] }
    ]
  },
  // PVD: 공통 플랫폼 + 키 큰 원통형 스퍼터 챔버 (위에 타깃·자석 뭉치)
  pvd: {
    id: "pvd", platform: "common-300",
    parts: [
      { id: "c1", shape: "cylinder", size: [5, 5, 3], pos: [6.35, 9.34, 3.5], material: "metal" },
      { id: "c1-top", parent: "c1", shape: "cylinder", size: [3.6, 3.6, 1.6], pos: [0, 0, 3], material: "panel" },
      { id: "c1-base", parent: "c1", shape: "box", size: [5, 5, 3.5], pos: [0, 0, -3.5], material: "panel-warm" },
      { id: "c2", copyOf: "c1", pos: [6.35, 16.67, 3.5] },
      { id: "c3", copyOf: "c1", pos: [-6.35, 16.67, 3.5] },
      { id: "c4", copyOf: "c1", pos: [-6.35, 9.34, 3.5] }
    ]
  },
  // Epi: 공통 플랫폼 + 넓적한 챔버 2개 (위에 가열 램프 덮개)
  epi: {
    id: "epi", platform: "common-300",
    parts: [
      { id: "c1", shape: "box", size: [6, 6, 2.4], pos: [6.35, 11.5, 3.5], rotZ: -90, material: "metal" },
      { id: "c1-lamp", parent: "c1", shape: "cylinder", size: [4.6, 4.6, 1.4], pos: [0, 0, 2.4], material: "panel" },
      { id: "c1-base", parent: "c1", shape: "box", size: [6, 6, 3.5], pos: [0, 0, -3.5], material: "panel-warm" },
      { id: "c2", copyOf: "c1", pos: [-6.35, 11.5, 3.5], rotZ: 90 }
    ]
  },
  // ECD(전기도금): 진공 플랫폼이 아니라 긴 습식 장비 — 몸체 + 위에 도금 셀이 한 줄
  ecd: {
    id: "ecd",
    parts: [
      { id: "body", shape: "box", size: [16, 7, 6], pos: [0, 0, 0], material: "panel" },
      { id: "front", shape: "box", size: [6, 3, 7.5], pos: [-8.5, -1.5, 0], material: "panel" },
      { id: "cell1", shape: "cylinder", size: [2.4, 2.4, 1.4], pos: [-4.5, 0, 6], material: "metal" },
      { id: "cell2", copyOf: "cell1", pos: [-1, 0, 6] },
      { id: "cell3", copyOf: "cell1", pos: [2.5, 0, 6] },
      { id: "cell4", copyOf: "cell1", pos: [6, 0, 6] }
    ]
  }
};
