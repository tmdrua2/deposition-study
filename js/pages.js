// =============================================================
// 사이트 전체 페이지 목록 (목차와 검색이 모두 이 목록을 사용)
// 새 페이지를 만들면 여기에 한 줄 추가하세요.
//   section : 어느 묶음에 들어갈지 (아래 SECTIONS의 id)
//   title   : 화면에 보일 제목
//   path    : 사이트 맨 위 폴더 기준 파일 경로
//   keywords: 검색에 걸리게 할 단어들 (영어/한글/약어 모두 적어두면 좋음)
//   short   : (선택) 알약 버튼·장비 목록에 쓸 짧은 이름 (없으면 title 사용)
//   desc    : (선택) 장비 목록에서 이름 아래 회색으로 보일 한글 설명
// =============================================================

// en  : 제목 위 작은 영문 라벨, 메인 카드의 영문 제목
// desc: 메인 카드의 한글 설명
const SECTIONS = [
  { id: "basics",    title: "기초",        en: "Fundamentals",
    desc: "진공, 플라즈마, 박막이 자라는 원리" },
  { id: "equipment", title: "공정·장비",   en: "Process & Equipment",
    desc: "증착 방식별 원리, 장비 구성, 공정변수와 문제 해결" },
  { id: "companies", title: "회사",        en: "Companies",
    desc: "해외·국내 증착 장비사 정리" },
  { id: "lab",       title: "내 실습 기록", en: "Lab Notes",
    desc: "직접 해본 공정과 배운 점" },
];

const PAGES = [
  // 기초
  { section: "basics", title: "진공", path: "basics/vacuum.html",
    keywords: "vacuum 진공 펌프 압력 mean free path 평균자유행로 torr pa" },
  { section: "basics", title: "플라즈마", path: "basics/plasma.html",
    keywords: "plasma 플라즈마 rf dc 이온 전자 sheath 쉬스" },
  { section: "basics", title: "박막 성장 원리", path: "basics/thin-film-growth.html",
    keywords: "thin film growth 박막 성장 핵생성 nucleation 흡착 확산 step coverage" },

  // 공정·장비
  { section: "equipment", title: "PVD (물리 기상 증착)", short: "PVD", desc: "물리 기상 증착", path: "equipment/pvd.html",
    keywords: "pvd sputter sputtering 스퍼터 증발 evaporation target 타겟 물리기상증착" },
  // PECVD: 장비 분해 페이지 (예전 cvd-pecvd.html은 이 페이지로 옮겼다는 안내만 남김)
  { section: "equipment", title: "PECVD 장비 (플라즈마 화학 기상 증착)", short: "PECVD", desc: "플라즈마 화학 기상 증착", path: "equipment/pecvd.html",
    keywords: "pecvd cvd 화학기상증착 플라즈마 plasma 장비 분해 공정 챔버 샤워헤드 showerhead efem 로드락 트랜스퍼 rps 시즈닝" },
  // PECVD 섹션 하위 페이지 (hidden: 목차·메뉴엔 안 보이고 검색에만. 목록·이전/다음은 js/sections.js)
  { section: "equipment", title: "PECVD 원리 (플라즈마 분해·라디칼·막 성장)", path: "equipment/pecvd/principle.html", hidden: true,
    keywords: "pecvd 원리 플라즈마 라디칼 radical 전자 충돌 분해 흡착 탈착 막 성장 저온 열 예산 질화막 산화막 sih4 nh3 n2o teos sin sio2 ccp" },
  { section: "equipment", title: "PECVD 장비 구성 (가스·RF·배기·웨이퍼 계통도)", path: "equipment/pecvd/hardware.html", hidden: true,
    keywords: "pecvd 장비 구성 계통도 가스 박스 mfc 가스 라인 샤워헤드 rf 제너레이터 매칭 히터 서셉터 펌핑 링 스로틀 밸브 포어라인 드라이 펌프 스크러버 foup efem 로드락 ll tm pm" },
  { section: "equipment", title: "PECVD 공정 흐름 (웨이퍼 이동·레시피 단계·세정·시즈닝)", path: "equipment/pecvd/flow.html", hidden: true,
    keywords: "pecvd 공정 흐름 웨이퍼 이동 경로 atm 로봇 얼라이너 펌핑 벤트 냉각 레시피 리프트 핀 안정화 퍼지 rps nf3 세정 클리닝 시즈닝 seasoning" },
  { section: "equipment", title: "ALD (원자층 증착)", short: "ALD", desc: "원자층 증착", path: "equipment/ald.html",
    keywords: "ald atomic layer deposition 원자층 self-limiting 자기제한 purge 퍼지" },
  { section: "equipment", title: "Epi (에피택시)", short: "Epi", desc: "에피택시", path: "equipment/epi.html",
    keywords: "epi epitaxy 에피택시 에피 단결정 sige" },
  { section: "equipment", title: "전기도금 (ECD)", short: "ECD", desc: "전기도금", path: "equipment/ecd.html",
    keywords: "ecd electroplating 전기도금 구리 cu 도금 seed 시드 damascene" },

  // 회사
  { section: "companies", title: "증착 장비사 목록", path: "companies/index.html",
    keywords: "회사 장비사 해외 국내 company" },

  // 실습 기록
  { section: "lab", title: "내 실습 기록", path: "lab/index.html",
    keywords: "실습 기록 lab note 일지" },
];

// =============================================================
// 장비 섹션 하위 페이지 목록 + 완성 여부 (모든 페이지가 pages.js를 읽으므로 여기 둠)
//   ready: true  = 그 섹션 페이지를 다 채움 → 오른쪽 위 메뉴(☰)의 "N개 섹션 중 M개 완성"과 상태,
//                  장비 페이지 섹션 카드, 하위 페이지 진행 표시·이전/다음이 모두 자동으로 바뀐다
//   card       = 완성된 섹션의 장비 페이지 카드 아래 한 줄 (준비 중이면 "준비 중")
// 쓰는 곳: js/main.js(메뉴), js/sections.js(진행 표시·이전/다음·카드)
// =============================================================
const EQUIP_SECTIONS = {
  pecvd: {
    name: "PECVD",
    home: "equipment/pecvd.html",      // 사이트 맨 위 기준 경로
    folder: "equipment/pecvd/",
    list: [
      { id: "principle",       title: "원리",       en: "Principle",       ready: true,  card: "단면 애니메이션과 함께 읽기" },
      { id: "hardware",        title: "장비 구성",   en: "Hardware",        ready: true,  card: "계통도에서 모듈을 눌러 보기" },
      { id: "flow",            title: "공정 흐름",   en: "Process flow",    ready: true,  card: "웨이퍼 경로와 레시피 단계 애니메이션" },
      { id: "parameters",      title: "공정변수",    en: "Parameters",      ready: true,  card: "변수를 직접 올리고 내려 보기" },
      { id: "troubleshooting", title: "문제와 점검", en: "Troubleshooting", ready: true,  card: "증상을 골라 점검 흐름도 펼치기" },
      { id: "interview",       title: "면접 질문",   en: "Interview",       ready: false },
      { id: "sources",         title: "출처",       en: "Sources",         ready: false },
    ],
  },
};
