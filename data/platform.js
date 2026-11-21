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
      explode: [0, -15, 0], explodeOrder: 2       // 앞쪽으로 (시그널 타워·HMI·EMO가 함께)
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
      explode: [0, -22.5, 0], explodeOrder: 1        // 맨 먼저, EFEM보다 더 앞쪽으로 (FOUP 함께)
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
      explode: [0, -6, 0], explodeOrder: 3         // 로드락 2개를 받침 프레임째 앞쪽으로
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
      label: { no: 4, abbr: "TM", anchor: "top" },

      // ── 학습 내용 (부품 패널 js/explode/panel.js가 읽음, 형식은 data/pecvd.js의 PM과 같음) ──
      role: "로드락(LL)과 공정 챔버(PM)들 사이 한가운데에 있는 진공 방입니다. 안에 있는 진공 로봇이 LL에서 웨이퍼를 꺼내 각 PM에 넣고, 공정이 끝난 웨이퍼를 다시 LL로 돌려보냅니다. 대기와 진공을 오가는 일은 LL이 맡고, TM은 늘 진공으로 유지되기 때문에 PM을 대기에 노출하지 않고 웨이퍼를 계속 나를 수 있습니다.",
      components: [
        { name: "진공 로봇", en: "Vacuum Robot", desc: "진공 안에서 웨이퍼를 나르는 로봇. 관절이 있는 팔이 펴지고 접히며 앞뒤로 움직이고, 몸통이 돌아 방향을 바꿉니다. 팔 모양은 개구리 다리처럼 접히는 형(프로그 레그)과 사람 팔처럼 관절이 이어진 형(스카라) 등이 있습니다 [검증 필요]." },
        { name: "블레이드 (엔드 이펙터)", en: "Blade / End Effector", desc: "팔 끝에서 웨이퍼를 실제로 받치는 얇은 판. 진공 속에서는 빨아들여 잡는 방식(진공 흡착)을 쓸 수 없어서, 보통 블레이드 위 작은 패드와의 마찰로 웨이퍼가 얹혀 있습니다 [검증 필요]. 블레이드가 두 개인 로봇은 한쪽으로 끝난 웨이퍼를 빼고 곧바로 다른 쪽의 새 웨이퍼를 넣을 수 있어(교환 동작) 처리량이 늘어납니다." },
        { name: "로봇 구동부", en: "Robot Drive", desc: "모터는 보통 챔버 아래 대기 쪽에 있고, 회전을 밀봉된 축이나 자기 결합으로 진공 안 팔에 전달합니다. 모터를 진공 밖에 두면 윤활제·마모 가루가 진공을 더럽히는 것을 줄일 수 있습니다 [검증 필요]." },
        { name: "슬릿 밸브", en: "Slit Valve", desc: "TM 각 면에 있는 웨이퍼 출입구의 문. LL·PM과 TM 사이를 여닫아 압력과 가스를 나눕니다. 로봇 팔은 이 문이 '열림'으로 확인된 뒤에만 들어갑니다." },
        { name: "웨이퍼 감지 센서", en: "Wafer Sensors", desc: "블레이드 위에 웨이퍼가 있는지 확인하는 센서와, 출입구 근처에서 지나가는 웨이퍼 가장자리를 읽어 중심이 얼마나 틀어졌는지 계산하는 센서가 있습니다. 틀어진 만큼 놓는 위치를 보정하는 기능을 쓰는 장비도 있습니다 [검증 필요]." },
        { name: "진공 펌프 · 퍼지 가스", en: "Pumping · Purge Gas", desc: "TM을 진공으로 유지하는 배기 계통과, 질소 같은 불활성 가스를 조금 흘려 TM 압력을 맞추는 퍼지 라인. TM을 PM보다 살짝 높은 압력으로 두어 PM의 공정 가스가 TM 쪽으로 넘어오지 않게 하는 방식이 쓰입니다 [검증 필요]." }
      ],
      principle: [
        "① 대기 쪽 EFEM 로봇이 웨이퍼를 LL에 넣으면 LL이 펌프로 공기를 빼 진공이 됩니다([[진공|basics/vacuum.html]]). LL과 TM 압력이 비슷해진 뒤 LL–TM 슬릿 밸브가 열립니다.",
        "② TM 진공 로봇이 블레이드를 LL 안으로 뻗어 웨이퍼 밑에 넣고, 살짝 들어 올려 받은 뒤 팔을 접어 TM 가운데로 가져옵니다. 슬릿 밸브가 닫힙니다.",
        "③ 로봇 몸통이 돌아 목표 PM 쪽을 보고, PM의 슬릿 밸브가 열리면 블레이드를 뻗어 웨이퍼를 리프트 핀 위에 올립니다. 핀이 웨이퍼를 받으면 블레이드가 빠지고 슬릿 밸브가 닫힌 뒤 공정이 시작됩니다.",
        "④ 블레이드가 두 개면, 공정이 끝난 PM에서 한쪽 블레이드로 끝난 웨이퍼를 빼고 같은 자리에서 다른 블레이드의 새 웨이퍼를 바로 넣습니다. 끝난 웨이퍼는 LL로 돌아가고, LL이 대기로 벤트(공기를 넣음)된 뒤 EFEM이 꺼내 FOUP에 담습니다.",
        "⑤ TM이 늘 진공인 이유: 웨이퍼를 옮길 때마다 PM을 대기에 열면 펌프 다운에 시간이 들어 처리량이 떨어지고, 공기 속 수분·산소·파티클이 챔버와 웨이퍼 표면을 오염시킵니다. 그래서 대기↔진공 전환은 LL에서만 하고 TM은 진공을 지키는 '중간 통로' 역할을 합니다.",
        "⑥ 로봇이 각 위치(LL, PM1~PM4)에서 어디까지 팔을 뻗고 어느 높이에서 웨이퍼를 내려놓을지는 미리 기억시킨 좌표를 따릅니다. 이 좌표를 맞추는 작업을 티칭이라고 하며, 로봇·PM 부품 교체 뒤나 위치 어긋남이 생겼을 때 CS 엔지니어가 다시 합니다."
      ],
      params: [
        { name: "로봇 속도 · 가속도", up: "한 장 옮기는 시간이 줄어 처리량이 늘어남", down: "웨이퍼가 블레이드 위에서 덜 미끄러지고 진동·파티클이 줄어듦", tradeoff: "처리량 ↔ 웨이퍼 미끄러짐·위치 틀어짐 위험" },
        { name: "TM 압력 (퍼지 가스 유량)", up: "PM 쪽 공정 가스가 TM으로 넘어오는 것을 막기 쉬워짐 [검증 필요]", down: "더 깨끗한 진공에 가까워지지만, 슬릿 밸브를 열 때 압력 차이로 가스가 흐를 수 있음 [검증 필요]", tradeoff: "역류 방지 ↔ 압력 차이에 따른 기류·파티클 날림" },
        { name: "슬릿 밸브 여닫는 속도", up: "출입 대기 시간이 줄어 처리량이 늘어남", down: "문과 오링이 부딪히는 충격이 줄어 파티클·마모가 줄어듦 [검증 필요]", tradeoff: "처리량 ↔ 파티클·밀봉 부품 수명" },
        { name: "LL 펌프 다운 · 벤트 속도 (TM과 맞닿는 조건)", up: "LL 대기 시간이 줄어 로봇이 덜 기다림", down: "급격한 기류가 줄어 쌓인 입자가 덜 날리고 웨이퍼가 덜 흔들림 [검증 필요]", tradeoff: "처리량 ↔ 파티클·웨이퍼 흔들림" }
      ],
      issues: [
        {
          problem: "웨이퍼 미끄러짐 · 위치 틀어짐 (PM에 놓인 웨이퍼가 한쪽으로 치우침)",
          checks: [
            "어느 위치에서 생기는지 좁히기: 특정 PM만인지, LL 포함 모든 위치인지, 특정 블레이드만인지",
            "웨이퍼 중심 틀어짐을 읽는 센서 기록이 있다면 틀어진 방향·크기의 추이를 본다 [검증 필요]",
            "블레이드 패드 마모·오염(마찰이 줄면 미끄러짐), 블레이드 휨",
            "로봇 속도·가속도 설정이 바뀌지 않았는지",
            "해당 PM의 리프트 핀 높이·움직임 — 핀과 블레이드 높이가 안 맞으면 주고받을 때 웨이퍼가 밀림",
            "웨이퍼 쪽 원인: 휜 웨이퍼, 뒷면에 쌓인 막, 히터에 달라붙었다 떨어지는 현상 [검증 필요]",
            "위 항목이 정상이면 그 위치의 티칭 좌표를 확인하고 다시 티칭"
          ]
        },
        {
          problem: "이송 중 파티클 증가",
          checks: [
            "파티클 위치가 웨이퍼 어느 쪽에 몰리는지(가장자리·블레이드 닿는 자리 = 이송 원인 의심)",
            "TM에 들어갔다 나오기만 한 웨이퍼(공정 없이 이송만)로 파티클을 재서 이송 탓인지 공정 탓인지 나눈다",
            "블레이드 패드·블레이드 표면 오염",
            "슬릿 밸브 오링·문 닿는 면 마모",
            "LL 펌프 다운·벤트 속도, TM–LL·TM–PM 압력 차이",
            "로봇 팔 관절·구동부에서 나오는 마모 가루 [검증 필요]"
          ]
        },
        {
          problem: "로봇 알람 (멈춤, 위치 오차, 웨이퍼 없음/있음 불일치)",
          checks: [
            "알람 기록에서 종류·발생 위치·시각을 확인 — 한 위치에서 반복되는지",
            "웨이퍼 감지 센서: 블레이드 위 웨이퍼 유무 판정이 실제와 맞는지(센서 오염·정렬)",
            "슬릿 밸브 열림·닫힘 센서 — 문이 열렸는데 '닫힘'으로 읽혀 로봇이 멈추는 경우",
            "로봇이 들어가려던 곳에 웨이퍼가 이미 있거나 떨어져 있지 않은지 (관찰창으로 확인)",
            "로봇 구동부 상태: 모터·엔코더(위치 센서) 신호, 케이블·커넥터",
            "원인을 고친 뒤 원점 복귀(홈) → 위치 확인 → 필요하면 티칭 → 더미 웨이퍼로 반복 이송 시험"
          ]
        }
      ],
      pm: [
        "블레이드 패드 상태 점검·세정, 마모되면 교체",
        "슬릿 밸브 오링·문 점검과 교체, 교체 후 리크 체크",
        "웨이퍼 감지 센서 동작·정렬 확인",
        "로봇·PM 부품 교체 뒤 각 위치 티칭 확인 → 더미 웨이퍼로 반복 이송 시험",
        "TM 안쪽 바닥·벽에 떨어진 조각·이물 청소 (웨이퍼 파손이 있었다면 반드시)",
        "정비 뒤 복구 순서: 펌프 다운 → 리크 체크 → 로봇 원점 복귀·위치 확인 → 이송 시험 → 파티클 확인"
      ],
      interview: [
        {
          q: "트랜스퍼 모듈(TM)은 왜 항상 진공으로 유지하나요?",
          a: "공정 챔버는 진공에서 공정을 하는데, 웨이퍼를 옮길 때마다 대기에 열면 다시 진공을 만드는 데 시간이 들어 처리량이 크게 떨어집니다. 또 공기 속 수분, 산소, 파티클이 챔버와 웨이퍼를 오염시킵니다. 그래서 대기와 진공을 오가는 일은 로드락에서만 하고, TM은 늘 진공으로 두어 여러 공정 챔버 사이를 오염 없이 빠르게 오가게 합니다."
        },
        {
          q: "진공 로봇은 웨이퍼를 어떻게 잡나요? 대기 로봇과 무엇이 다른가요?",
          a: "대기 로봇은 블레이드에서 공기를 빨아들여 웨이퍼를 붙잡는 진공 흡착을 쓸 수 있지만, 진공 속에서는 빨아들일 공기가 없어서 그 방식을 쓸 수 없습니다. 그래서 보통 블레이드 위 패드에 웨이퍼를 얹고 마찰로 버팁니다. 그만큼 너무 빨리 가속하면 웨이퍼가 미끄러질 수 있어서, 속도와 가속도 설정이 처리량과 안정성 사이의 균형점이 됩니다."
        },
        {
          q: "블레이드가 두 개인 진공 로봇의 장점은 무엇인가요?",
          a: "한 번 공정 챔버 앞에 갔을 때 끝난 웨이퍼를 빼고 곧바로 새 웨이퍼를 넣는 교환 동작을 할 수 있습니다. 블레이드가 하나면 끝난 웨이퍼를 로드락에 두고 새 웨이퍼를 가지러 다녀와야 해서, 그동안 챔버가 비어 있게 됩니다. 두 개면 챔버가 노는 시간이 줄어 장비 전체 처리량이 늘어납니다."
        },
        {
          q: "슬릿 밸브와 로봇은 어떻게 연동되나요?",
          a: "로봇 팔은 해당 슬릿 밸브가 열림으로 확인될 때만 들어가고, 팔이 완전히 빠져나온 뒤에야 문이 닫히도록 인터록(안전 연동)이 걸려 있습니다. 문이 덜 열린 상태로 팔이 들어가면 부딪혀 웨이퍼가 깨지거나 파티클이 생기기 때문입니다. 또 문을 열기 전에 양쪽 압력을 비슷하게 맞춰 갑작스러운 기류를 막습니다."
        },
        {
          cs: true,
          q: "고객이 \"PM3에 들어간 웨이퍼만 한쪽으로 틀어져 놓인다\"고 합니다. 무엇부터 점검하겠습니까?",
          a: "PM3에서만 생기므로 로봇 전체보다 PM3 위치를 먼저 의심합니다. 먼저 센서 기록으로 틀어진 방향과 언제부터인지 보고, 최근 PM3 정비나 부품 교체 이력을 확인합니다. 다음으로 PM3 리프트 핀 높이와 움직임, 히터 표면 상태를 봅니다. 블레이드 패드 마모도 확인하고, 이상이 없으면 PM3 티칭 좌표를 확인해 다시 티칭한 뒤 더미 웨이퍼로 반복 이송해 확인하겠습니다."
        }
      ],
      sources: [
        { kind: "일반 교과서 내용", note: "진공 장비에서 로드락·트랜스퍼 챔버의 역할, 대기와 진공 분리 이유" },
        { kind: "장비사 공개 자료", note: "클러스터 장비의 진공 로봇·블레이드·슬릿 밸브 구성 (확인하지 않음, 종류만 표시)" },
        { kind: "일반 현장 지식", note: "티칭·이송 문제 점검 순서 — 장비마다 다름 [검증 필요]" }
      ]
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
