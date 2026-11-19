// =============================================================
// 사이트 전체 페이지 목록 (목차와 검색이 모두 이 목록을 사용)
// 새 페이지를 만들면 여기에 한 줄 추가하세요.
//   section : 어느 묶음에 들어갈지 (아래 SECTIONS의 id)
//   title   : 화면에 보일 제목
//   path    : 사이트 맨 위 폴더 기준 파일 경로
//   keywords: 검색에 걸리게 할 단어들 (영어/한글/약어 모두 적어두면 좋음)
// =============================================================

const SECTIONS = [
  { id: "basics",    title: "기초" },
  { id: "equipment", title: "공정·장비" },
  { id: "companies", title: "회사" },
  { id: "lab",       title: "내 실습 기록" },
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
  { section: "equipment", title: "PVD (물리 기상 증착)", path: "equipment/pvd.html",
    keywords: "pvd sputter sputtering 스퍼터 증발 evaporation target 타겟 물리기상증착" },
  { section: "equipment", title: "CVD / PECVD (화학 기상 증착)", path: "equipment/cvd-pecvd.html",
    keywords: "cvd pecvd lpcvd 화학기상증착 precursor 전구체 plasma" },
  { section: "equipment", title: "ALD (원자층 증착)", path: "equipment/ald.html",
    keywords: "ald atomic layer deposition 원자층 self-limiting 자기제한 purge 퍼지" },
  { section: "equipment", title: "Epi (에피택시)", path: "equipment/epi.html",
    keywords: "epi epitaxy 에피택시 에피 단결정 sige" },
  { section: "equipment", title: "전기도금 (ECD)", path: "equipment/ecd.html",
    keywords: "ecd electroplating 전기도금 구리 cu 도금 seed 시드 damascene" },

  // 회사
  { section: "companies", title: "증착 장비사 목록", path: "companies/index.html",
    keywords: "회사 장비사 해외 국내 company" },

  // 실습 기록
  { section: "lab", title: "내 실습 기록", path: "lab/index.html",
    keywords: "실습 기록 lab note 일지" },
];
