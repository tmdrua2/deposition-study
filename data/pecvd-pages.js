// =============================================================
// 자동 생성 파일 — 직접 고치지 말 것.  만드는 법: node tools/collect-pages.js  (만든 날: 2026-11-25)
// 페이지(HTML) 글에서 뽑은 출처 · [검증 필요] 문장 · 면접 질문.
// 쓰는 곳: equipment/pecvd/interview.html, equipment/pecvd/sources.html (js/figs/collect.js가 부품 데이터와 합침)
//   path    = 사이트 맨 위 기준 경로, anchor = 그 페이지 안의 위치(id)
// =============================================================
window.SITE_PAGE_NOTES = {
 "generated": "2026-11-25",
 "pages": [
  {
   "path": "equipment/pecvd/principle.html",
   "group": "PECVD 원리",
   "title": "원리",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Plasma-enhanced chemical vapor deposition\"",
     "url": "https://en.wikipedia.org/wiki/Plasma-enhanced_chemical_vapor_deposition",
     "checked": "2026-11-22",
     "note": "플라즈마 속 전자는 에너지가 높고 중성 기체는 낮은 온도에 머묾, 원료 분자 분해와 라디칼 생성, 열 분해보다 낮은 온도에서 증착, 질화막(실레인 + 암모니아 또는 질소)과 산화막(실레인 + N2O·O2, TEOS) 원료, 플라즈마 질화막의 수소, TEOS 산화막의 탄소·수소, 평행판 전극. 이 문서에 없던 샤워헤드·부산물 배기는 아래 자료."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "흡착·표면 확산·탈착, 열 예산, 축전 결합 플라즈마(CCP)"
    }
   ],
   "verify": [
    {
     "text": "막을 쌓을 때 웨이퍼에는 이미 만들어 둔 소자와 배선이 있어서, 너무 뜨거우면 배선이 상하거나 불순물 원자가 퍼져(확산) 소자 특성이 바뀔 수 있습니다.",
     "where": "왜 플라즈마를 쓰나",
     "anchor": "why"
    },
    {
     "text": "아직 플라즈마가 없으므로, 이 온도에서는 가스 대부분이 반응하지 않고 그대로 흘러 나갑니다.",
     "where": "챔버 안에서 일어나는 네 단계",
     "anchor": "steps"
    },
    {
     "text": "예를 들어 SiH4에서 수소가 떨어져 나간 SiH3, SiH2 같은 조각입니다.",
     "where": "챔버 안에서 일어나는 네 단계",
     "anchor": "steps"
    },
    {
     "text": "아래의 히터가 웨이퍼를 데워 표면 반응과 원자 이동을 돕기 때문에, 히터 온도가 막의 치밀함과 막 속 수소량을 좌우합니다.",
     "where": "챔버 안에서 일어나는 네 단계",
     "anchor": "steps"
    },
    {
     "text": "계속 빼내야 챔버 압력이 일정하게 유지되고, 부산물이 막에 다시 섞여 들어가는 것도 줄일 수 있습니다.",
     "where": "챔버 안에서 일어나는 네 단계",
     "anchor": "steps"
    },
    {
     "text": "부산물 종류는 조건에 따라 다릅니다.",
     "where": "대표적인 막 두 가지",
     "anchor": "films"
    },
    {
     "text": "TEOS로 만든 막에는 탄소와 수소가 남을 수 있습니다.",
     "where": "대표적인 막 두 가지",
     "anchor": "films"
    }
   ],
   "interview": [],
   "equip": "pecvd",
   "section": "principle"
  },
  {
   "path": "equipment/pecvd/hardware.html",
   "group": "PECVD 장비 구성",
   "title": "장비 구성",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Plasma-enhanced chemical vapor deposition\"",
     "url": "https://en.wikipedia.org/wiki/Plasma-enhanced_chemical_vapor_deposition",
     "checked": "2026-11-22",
     "note": "평행판 전극 사이에서 플라즈마를 만드는 구성."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "MFC 유량 제어, 임피던스 매칭, 스로틀 밸브 압력 제어, 로드락의 역할"
    }
   ],
   "verify": [
    {
     "text": "아래 계통도는 대표적인 300mm 장비 구성을 단순하게 그린 것이고, 실제 연결은 장비마다 다를 수 있습니다.",
     "where": "네 개의 길로 보는 장비",
     "anchor": "overview"
    },
    {
     "text": "RPS가 어디에 이어지는지는 장비마다 다릅니다.",
     "where": "계통마다 하는 일",
     "anchor": "systems"
    },
    {
     "text": "그래서 막 두께가 웨이퍼 안에서 고르지 않을 때도 가스 분포(샤워헤드), 플라즈마 분포(RF·전극 간격), 배기 쏠림(펌핑 링), 웨이퍼 위치·온도(히터·리프트 핀) 중 어느 길의 문제인지 나눠 볼 수 있습니다.",
     "where": "네 길이 만나는 곳: 공정 챔버",
     "anchor": "meet"
    }
   ],
   "interview": [],
   "equip": "pecvd",
   "section": "hardware"
  },
  {
   "path": "equipment/pecvd/flow.html",
   "group": "PECVD 공정 흐름",
   "title": "공정 흐름",
   "sources": [
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "로드락을 거친 대기↔진공 이송, 리프트 핀으로 웨이퍼 주고받기, 레시피 단계(안정화·증착·퍼지·펌핑), 불소 라디칼에 의한 챔버 세정, 시즈닝"
    }
   ],
   "verify": [
    {
     "text": "아래 순서와 이름은 대표적인 구성을 단순하게 그린 것으로, 장비·공정마다 다를 수 있습니다.",
     "where": "두 가지 흐름",
     "anchor": "two-flows"
    },
    {
     "text": "01 FOUP 문 열기 · 매핑 로드포트가 FOUP를 고정하고 문을 열면, 센서가 칸마다 웨이퍼가 있는지 확인합니다(매핑).",
     "where": "웨이퍼 이동 경로",
     "anchor": "route"
    },
    {
     "text": "들어올 때와 다른 LL을 쓰는지, 어디서 식히는지는 장비마다 다릅니다.",
     "where": "웨이퍼 이동 경로",
     "anchor": "route"
    },
    {
     "text": "예를 들어 압력이 맞지 않으면 슬릿 밸브가 열리지 않고, 문이 열렸다는 신호가 없으면 로봇 팔이 들어가지 않습니다.",
     "where": "왜 이런 순서일까",
     "anchor": "route-why"
    },
    {
     "text": "값이 흔들리는 중에 플라즈마를 켜면 막 두께와 막질이 웨이퍼마다 달라질 수 있어서, 안정될 때까지 기다린 뒤 다음 단계로 넘어갑니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    },
    {
     "text": "어떤 가스로 얼마나 퍼지하는지는 공정마다 다릅니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    },
    {
     "text": "남은 가스를 충분히 빼야 슬릿 밸브를 열었을 때 공정 가스가 TM 쪽으로 넘어가지 않습니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    },
    {
     "text": "주기는 공정마다 다릅니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    },
    {
     "text": "플라즈마를 챔버 밖에서 만들면 이온이 챔버 부품을 직접 때리는 것을 줄일 수 있습니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    },
    {
     "text": "벽에 남은 불소를 덮어 다음 막에 섞이지 않게 하는 목적도 있다고 알려져 있습니다.",
     "where": "공정 챔버 안 레시피 단계",
     "anchor": "recipe"
    }
   ],
   "interview": [],
   "equip": "pecvd",
   "section": "flow"
  },
  {
   "path": "equipment/pecvd/parameters.html",
   "group": "PECVD 공정변수",
   "title": "공정변수",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Silicon nitride\"",
     "url": "https://en.wikipedia.org/wiki/Silicon_nitride",
     "checked": "2026-11-24",
     "note": "질화막과 실리콘의 격자 상수가 달라 증착 공정에 따라 응력이 생기고, PECVD에서는 증착 조건을 바꿔 이 응력을 줄일 수 있다는 설명. 어떤 변수가 어느 방향으로 움직이는지는 이 자료에서 확인하지 못함."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "온도와 막 속 수소·밀도, 압력과 기체 속 반응, RF 전력과 분해·이온 충돌, 원료 비율과 막 조성·굴절률, 이중 주파수에서 저주파의 역할, 실험 계획법"
    }
   ],
   "verify": [
    {
     "text": "그래서 온도는 증착 속도보다 막의 질(밀도·수소)에 더 크게 영향을 주고, RF 전력은 분해량과 이온 충돌(이온이 막 표면을 두드리는 것)을 함께 바꿉니다.",
     "where": "다섯 개의 손잡이",
     "anchor": "knobs"
    },
    {
     "text": "그래서 RF 전력이나 저주파 비율로 이온 충돌을 늘려 막을 치밀하게 하는 쪽을 함께 보는데, 그러면 응력이 압축 쪽으로 움직입니다.",
     "where": "변수는 서로 얽혀 있다",
     "anchor": "tradeoff"
    },
    {
     "text": "그래서 두께 균일도 모양까지 달라질 수 있습니다.",
     "where": "변수는 서로 얽혀 있다",
     "anchor": "tradeoff"
    },
    {
     "text": "그래서 레시피를 새로 잡을 때는 두께·균일도·굴절률·응력 같은 목표를 한꺼번에 보면서, 여러 변수를 계획적으로 조합해 시험하는 실험 계획법(DOE, 적은 횟수의 실험으로 변수들의 영향을 나눠 보는 방법)을 많이 씁니다.",
     "where": "변수는 서로 얽혀 있다",
     "anchor": "tradeoff"
    },
    {
     "text": "그래서 보통 HF는 플라즈마 밀도·가스 분해에, LF는 이온 충돌(막 밀도·응력)에 더 크게 영향을 준다고 설명하고, LF 비율을 올리면 막이 치밀해지고 응력이 압축 쪽으로 움직이는 경향이 있어 응력 조절 손잡이로 씁니다.",
     "where": "단일 주파수와 이중 주파수",
     "anchor": "dual-freq"
    },
    {
     "text": "굴절률이 조금 오를 수 있음",
     "where": "공정변수 표 · 히터(웨이퍼) 온도 — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "이온 충돌이 약해져 응력이 인장 쪽으로 움직이는 경향",
     "where": "공정변수 표 · 챔버 압력 — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "분자가 덜 부딪혀 기체 속 반응이 줄고, 이온이 더 세게 부딪힘. 증착 속도가 줄 수 있음",
     "where": "공정변수 표 · 챔버 압력 — 내리면",
     "anchor": "parameters"
    },
    {
     "text": "가스 분해가 늘어 증착 속도가 빨라지고(어느 정도까지 — 원료가 다 분해되면 더 늘지 않음), 이온 충돌이 늘어 막이 치밀해지며 응력이 압축 쪽으로",
     "where": "공정변수 표 · RF 전력 — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "증착 속도가 오르고, Si–H 형태의 수소와 파티클 위험이 늘 수 있음",
     "where": "공정변수 표 · 가스 비율 (SiH4 : NH3, 올리면 = 실리콘 원료를 늘리면) — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "질소가 많은 막이 되어 굴절률이 내려감. 증착 속도가 줄 수 있음",
     "where": "공정변수 표 · 가스 비율 (SiH4 : NH3, 올리면 = 실리콘 원료를 늘리면) — 내리면",
     "anchor": "parameters"
    },
    {
     "text": "가스가 웨이퍼에 닿기 전 더 퍼짐",
     "where": "공정변수 표 · 샤워헤드–히터 간격 (올리면 = 넓히면) — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "플라즈마가 웨이퍼 가까이 모여 빨라지지만, 구멍 흔적과 간격 편차(평행)에 더 민감해짐",
     "where": "공정변수 표 · 샤워헤드–히터 간격 (올리면 = 넓히면) — 내리면",
     "anchor": "parameters"
    }
   ],
   "interview": [],
   "equip": "pecvd",
   "section": "parameters"
  },
  {
   "path": "equipment/pecvd/troubleshooting.html",
   "group": "PECVD 문제와 점검",
   "title": "문제와 점검",
   "sources": [
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "범위·시점으로 원인을 좁히는 점검 방식, 굴절률과 막 조성·응력과 이온 충돌의 관계"
    }
   ],
   "verify": [
    {
     "text": "아래 흐름도는 대표적인 점검 순서이고, 실제 순서와 판단 기준은 장비·회사마다 다릅니다.",
     "where": "모든 문제에 쓰는 네 칸 점검 틀",
     "anchor": "frame"
    },
    {
     "text": "여러 챔버 → 함께 바뀐 레시피, 공용 가스 공급(레귤레이터 공급 압력), 측정 장비 자체",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨",
     "anchor": "tf-thickness"
    },
    {
     "text": "조치 — 레벨링 다시 맞춘 뒤 테스트 웨이퍼",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · 샤워헤드–히터 간격·평행",
     "anchor": "tf-thickness"
    },
    {
     "text": "조치 — 센서·히터 점검, 필요하면 교체",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · 히터 온도 분포",
     "anchor": "tf-thickness"
    },
    {
     "text": "확인 — 얇아진 영역이 특정 구멍 영역과 겹치는지, 마지막 세정 이후 처리량, 떼어서 육안·빛 투과 검사",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · 샤워헤드 구멍 막힘",
     "anchor": "tf-thickness"
    },
    {
     "text": "조치 — 펌핑 링·배기 경로의 쌓인 부산물 제거",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · 펌핑 링 막힘 (배기 쏠림)",
     "anchor": "tf-thickness"
    },
    {
     "text": "확인 — 표시값과 셋포인트(목표값) 차이, 밸브 구동 값 추이, 가스를 끈 상태의 영점, 유량 검증(압력 상승 속도로 실제 유량 재기)",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · MFC 유량",
     "anchor": "tf-thickness"
    },
    {
     "text": "확인 — 시즈닝을 정해진 대로 했는지, 세정 종료 판정이 정상이었는지, 몇 장 뒤 평소 값으로 돌아오는지",
     "where": "문제와 점검 순서 · 막 두께 이상 · 균일도 나쁨 · 세정 직후 첫 몇 장만 다름",
     "anchor": "tf-thickness"
    },
    {
     "text": "조치 — RPS 세정, 세정 주기 조정",
     "where": "문제와 점검 순서 · 파티클 증가 · 벽·샤워헤드에 쌓인 막 벗겨짐",
     "anchor": "tf-particle"
    },
    {
     "text": "조치 — 핀 높이·끝 마모 점검, 필요하면 교체",
     "where": "문제와 점검 순서 · 파티클 증가 · 리프트 핀·이송 긁힘",
     "anchor": "tf-particle"
    },
    {
     "text": "챔버를 열었다면 리크 체크와 시즈닝을 마친 뒤 확인합니다.",
     "where": "문제와 점검 순서 · 파티클 증가",
     "anchor": "tf-particle"
    },
    {
     "text": "여러 챔버 → 함께 바뀐 레시피 조건(압력·가스), 공용 설비",
     "where": "문제와 점검 순서 · 플라즈마 이상",
     "anchor": "tf-plasma"
    },
    {
     "text": "점화 순간 → 점화 단계의 압력·가스, 매칭 시작 위치(프리셋)",
     "where": "문제와 점검 순서 · 플라즈마 이상",
     "anchor": "tf-plasma"
    },
    {
     "text": "조치 — 세정, 침식이 심하면 교체",
     "where": "문제와 점검 순서 · 플라즈마 이상 · 샤워헤드 구멍·가장자리 아킹",
     "anchor": "tf-plasma"
    },
    {
     "text": "확인 — 세정 주기, 벽·샤워헤드에서 벗겨진 날카로운 이물, 히터 쪽 접지 경로",
     "where": "문제와 점검 순서 · 플라즈마 이상 · 쌓인 막·이물, 접지 경로",
     "anchor": "tf-plasma"
    },
    {
     "text": "여러 챔버 → 레시피 변경, 공용 가스 공급(가스 교체·공급 압력), 측정 장비",
     "where": "문제와 점검 순서 · 막질 이상",
     "anchor": "tf-film"
    },
    {
     "text": "서서히 → MFC 드리프트, 온도 센서 드리프트, 챔버 안 쌓임",
     "where": "문제와 점검 순서 · 막질 이상",
     "anchor": "tf-film"
    },
    {
     "text": "확인 — 응력은 이온 충돌을 따라감 → 실제로 들어간 전력(포워드 − 반사), 제너레이터 출력 보정, 매칭 상태",
     "where": "문제와 점검 순서 · 막질 이상 · 응력 → RF 전력·저주파 비율",
     "anchor": "tf-film"
    },
    {
     "text": "조치 — 센서·히터 점검, 필요하면 교체",
     "where": "문제와 점검 순서 · 막질 이상 · 응력·수소·밀도 → 히터 온도",
     "anchor": "tf-film"
    },
    {
     "text": "확인 — 시즈닝을 정해진 대로 했는지, 몇 장 뒤 평소 값으로 돌아오는지",
     "where": "문제와 점검 순서 · 막질 이상 · 세정 직후 첫 몇 장만",
     "anchor": "tf-film"
    }
   ],
   "interview": [],
   "equip": "pecvd",
   "section": "troubleshooting"
  },
  {
   "path": "equipment/ald/principle.html",
   "group": "ALD 원리",
   "title": "원리",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Atomic layer deposition\"",
     "url": "https://en.wikipedia.org/wiki/Atomic_layer_deposition",
     "checked": "2026-11-25",
     "note": "전구체를 동시에 넣지 않고 겹치지 않는 펄스로 차례로 넣음, 주입–퍼지–주입–퍼지가 한 사이클, 사이클 수를 바꿔 두께를 정밀하게 조절하고 사이클당 성장량으로 공정을 설명함, TMA와 물로 만드는 Al2O3가 대표 예, 얇고 고르게 덮는(conformal) 막, 플라즈마 ALD로 증착 온도를 낮출 수 있음. ALD 온도 창, PECVD와의 속도 비교는 이 자료에서 확인하지 못함."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "ALD 온도 창(응축·반응 부족·분해·이탈), 퍼지 부족 시 CVD처럼 쌓이는 현상, ALD와 PECVD의 단차 피복·속도 비교"
    }
   ],
   "verify": [
    {
     "text": "그래서 전구체를 조금 더 오래 넣어도 한 번에 쌓이는 양은 거의 같습니다 — 이 성질 덕분에 ALD는 가스 흐름이 고르지 않아도 웨이퍼 전체에 고른 막을 만들 수 있습니다.",
     "where": "자기제한 반응: 표면이 다 차면 멈춘다",
     "anchor": "self-limiting"
    },
    {
     "text": "퍼지가 두 번이나 들어가는 이유는, 남은 전구체와 반응 기체가 공중에서 만나면 그 순간부터 CVD처럼 마구 쌓이고 공중에서 생긴 입자가 파티클이 되기 때문입니다.",
     "where": "4단계 사이클",
     "anchor": "cycle"
    },
    {
     "text": "창을 벗어나면 네 가지 일이 생길 수 있습니다.",
     "where": "ALD 온도 창",
     "anchor": "window"
    },
    {
     "text": "경향만 적었고, 막 종류와 장비에 따라 달라질 수 있습니다.",
     "where": "PECVD와 비교",
     "anchor": "vs-pecvd"
    },
    {
     "text": "반응 기체 단계에서만 플라즈마를 켜서 더 낮은 온도에서 막을 만들 수 있지만, 플라즈마 손상과 깊은 구조 안쪽 피복은 따져 봐야 합니다 (플라즈마 소스 패널).",
     "where": "PECVD와 비교",
     "anchor": "vs-pecvd"
    }
   ],
   "interview": [],
   "equip": "ald",
   "section": "principle"
  },
  {
   "path": "equipment/ald/hardware.html",
   "group": "ALD 장비 구성",
   "title": "장비 구성",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Atomic layer deposition\"",
     "url": "https://en.wikipedia.org/wiki/Atomic_layer_deposition",
     "checked": "2026-11-25",
     "note": "공간 분할 ALD는 기체를 서로 다른 위치로 넣어 공간으로 나누고, 대량 생산 라인에 맞는다는 설명. 매엽식과 배치식의 비교는 이 자료에서 확인하지 못함."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "ALD 장비 모듈 구성, 전구체·반응 기체 배관 분리, 매엽식·배치식 비교"
    }
   ],
   "verify": [
    {
     "text": "아래는 개념만 비교했습니다.",
     "where": "장비 방식: 매엽식 · 배치식 · 공간 분할",
     "anchor": "types"
    },
    {
     "text": "한 번에 한 장이라 처리량을 챔버 수로 늘림",
     "where": "장비 방식: 매엽식 · 배치식 · 공간 분할 · 매엽식 — 따져 볼 점",
     "anchor": "types"
    },
    {
     "text": "공간이 커서 퍼지가 오래 걸리고, 위·아래 웨이퍼끼리 차이를 관리해야 함",
     "where": "장비 방식: 매엽식 · 배치식 · 공간 분할 · 배치식 — 따져 볼 점",
     "anchor": "types"
    },
    {
     "text": "구역 사이를 기체가 새지 않게 막는 구조가 필요",
     "where": "장비 방식: 매엽식 · 배치식 · 공간 분할 · 공간 분할 — 따져 볼 점",
     "anchor": "types"
    }
   ],
   "interview": [],
   "equip": "ald",
   "section": "hardware"
  },
  {
   "path": "equipment/ald/flow.html",
   "group": "ALD 공정 흐름",
   "title": "공정 흐름",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Atomic layer deposition\"",
     "url": "https://en.wikipedia.org/wiki/Atomic_layer_deposition",
     "checked": "2026-11-25",
     "note": "주입–퍼지–주입–퍼지가 한 사이클이고 사이클 수로 두께를 조절. 웨이퍼 이송·가열·안정화 순서는 이 자료에서 확인하지 못함."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "진공 장비의 웨이퍼 이송(FOUP → EFEM → LL → TM → PM), 로드락 펌핑·벤트, 레시피 단계 구성, 초기 지연"
    }
   ],
   "verify": [
    {
     "text": "웨이퍼 온도가 ALD 온도 창 안에 들어와 고르게 되기 전에 사이클을 시작하면, 처음 몇 사이클의 성장량이 달라질 수 있습니다.",
     "where": "한 장의 웨이퍼가 겪는 순서",
     "anchor": "flow"
    },
    {
     "text": "막을 처음 쌓기 시작할 때 표면 상태에 따라 처음 몇 사이클은 덜 쌓이는 경우가 있습니다(초기 지연).",
     "where": "한 장의 웨이퍼가 겪는 순서",
     "anchor": "flow"
    },
    {
     "text": "남은 기체가 있는 채로 문을 열면 트랜스퍼 모듈로 넘어가 오염이 될 수 있기 때문입니다.",
     "where": "한 장의 웨이퍼가 겪는 순서",
     "anchor": "flow"
    },
    {
     "text": "이때 뜨거운 웨이퍼를 식히기도 합니다.",
     "where": "한 장의 웨이퍼가 겪는 순서",
     "anchor": "flow"
    }
   ],
   "interview": [],
   "equip": "ald",
   "section": "flow"
  },
  {
   "path": "equipment/ald/parameters.html",
   "group": "ALD 공정변수",
   "title": "공정변수",
   "sources": [
    {
     "kind": "웹 자료(위키백과)",
     "title": "Wikipedia, \"Atomic layer deposition\"",
     "url": "https://en.wikipedia.org/wiki/Atomic_layer_deposition",
     "checked": "2026-11-25",
     "note": "ALD 공정을 사이클당 성장량으로 설명하고 사이클 수로 두께를 조절. 펄스·퍼지 시간이 모자랄 때의 영향, 온도 창은 이 자료에서 확인하지 못함."
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "포화 곡선, 퍼지 부족 시 CVD처럼 쌓이는 현상, 온도 창, 전구체 공급량과 포화"
    }
   ],
   "verify": [
    {
     "text": "퍼지 시간도 같은 방법으로, 줄여 가다 두께가 늘기 시작하는(기체가 섞이기 시작하는) 지점을 찾습니다.",
     "where": "포화 곡선: 레시피를 잡는 방법",
     "anchor": "saturation"
    },
    {
     "text": "너무 딱 맞추면 전구체 용기 온도가 조금만 흔들려도 포화 아래로 떨어집니다.",
     "where": "포화 곡선: 레시피를 잡는 방법",
     "anchor": "saturation"
    },
    {
     "text": "포화 전에 닫히면 사이클당 두께가 줄고, 기체가 먼저 닿는 쪽만 덮여 균일도·단차 피복이 나빠짐",
     "where": "공정변수 표 · 펄스 시간 (전구체·반응 기체 주입) — 내리면",
     "anchor": "parameters"
    },
    {
     "text": "남은 기체가 다음 기체와 만나 CVD처럼 더 쌓임 → 두께 증가, 균일도·단차 피복 악화, 파티클·불순물 증가",
     "where": "공정변수 표 · 퍼지 시간 — 내리면",
     "anchor": "parameters"
    },
    {
     "text": "균일도·단차 피복이 나빠질 수 있음",
     "where": "공정변수 표 · 웨이퍼 온도 (올리면 = 온도 창 위로) — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "창 아래로 내려가면 반응 부족으로 덜 쌓이고 불순물이 남거나, 응축으로 오히려 더 쌓이고 파티클 위험",
     "where": "공정변수 표 · 웨이퍼 온도 (올리면 = 온도 창 위로) — 내리면",
     "anchor": "parameters"
    },
    {
     "text": "남는 전구체가 많아 퍼지 부담이 커짐",
     "where": "공정변수 표 · 전구체 공급량 (용기 온도·캐리어 가스) — 올리면",
     "anchor": "parameters"
    },
    {
     "text": "충분한 공급 ↔ 원료 비용, 열에 약한 전구체의 분해",
     "where": "공정변수 표 · 전구체 공급량 (용기 온도·캐리어 가스) — 트레이드오프",
     "anchor": "parameters"
    }
   ],
   "interview": [],
   "equip": "ald",
   "section": "parameters"
  },
  {
   "path": "basics/vacuum.html",
   "group": "기초 · 진공",
   "title": "진공",
   "sources": [
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "진공 공학 교과서 내용 (진공 영역, 펌프·게이지 원리, 가스 부하, 컨덕턴스·배기 속도)"
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "물리·물리화학 교과서의 기체 운동론 내용 (이상기체 법칙, 평균자유행로, 입사 플럭스)"
    },
    {
     "kind": "일반 교과서 내용",
     "title": "일반 교과서 내용",
     "note": "반도체 공정 교과서 내용 (증착 공정과 진공의 관계, 로드락)"
    }
   ],
   "verify": [
    {
     "text": "압력이 낮아질수록 보통 저진공 → 중진공 → 고진공 → 초고진공 순으로 부르며, 각 구간의 경계는 자료마다 조금씩 다르게 정의된다.",
     "where": "핵심 개념",
     "anchor": "concept"
    },
    {
     "text": "로터리 펌프는 오일을 쓰므로 오일 역류 오염 우려가 있어, 반도체 공정에는 오일 없는 드라이 펌프를 주로 쓴다.",
     "where": "핵심 개념 · 러핑 펌프 (rough pump, 초기 배기용) — 특징",
     "anchor": "concept"
    },
    {
     "text": "기체 종류와 상관없이 실제 압력을 재므로 공정 압력 제어에 주로 쓴다.",
     "where": "핵심 개념 · 커패시턴스 마노미터 — 특징",
     "anchor": "concept"
    },
    {
     "text": "압력이 높으면 → 입자가 자주 산란되어 퍼짐 → 방향성은 떨어지지만 측면까지 덮는 데는 유리할 수 있음.",
     "where": "증착 공정과의 연결",
     "anchor": "link-to-process"
    },
    {
     "text": "저압 CVD(LPCVD)는 압력을 낮춰 가스가 웨이퍼 사이로 잘 퍼지게 해서 균일도를 높인다.",
     "where": "증착 공정과의 연결",
     "anchor": "link-to-process"
    }
   ],
   "interview": []
  },
  {
   "path": "basics/plasma.html",
   "group": "기초 · 플라즈마",
   "title": "플라즈마",
   "sources": [],
   "verify": [],
   "interview": []
  },
  {
   "path": "basics/thin-film-growth.html",
   "group": "기초 · 박막 성장",
   "title": "박막 성장 원리",
   "sources": [],
   "verify": [],
   "interview": []
  }
 ]
};
