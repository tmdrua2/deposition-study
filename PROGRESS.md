# 진행 상황

## 완료
- 사이트 뼈대 (메인 목차·검색, 공통 헤더 메뉴, 기초/장비 페이지 틀)
- 사이트 디자인 개편 (흰 바탕 기업 사이트 스타일)
- 내용 작성 규칙 정리 (`CLAUDE.md`)
- 진공 페이지 (`basics/vacuum.html`)
  - 남은 일: [검증 필요] 표시한 내용을 교과서와 대조 확인

- 작업 규칙 추가: 작업 진행·스킬 활용·이미지 사용·사용량 절약 (`CLAUDE.md`)
- Node.js 설치 + `find-skills` 스킬 설치 (Vercel Labs, 컴퓨터 전체 `~/.claude/skills/`에 설치)

## 진행 중
- **장비 중심 개편** (브랜치 `equipment-redesign`, `redesign`에서 만듦) — 설계서: `docs/equipment-redesign-plan.md`
  - 0단계 완료 (2026-11-21): 브랜치 생성, 설계서 저장, CLAUDE.md 갱신(출처 규칙·장비 데이터 규칙·폴더 구조),
    `gsap-performance` 스킬 설치 (GreenSock 공식, `~/.claude/skills/`)
  - 방식: 2.5D 아이소메트릭 SVG + GSAP. 장비 데이터는 그리는 코드와 분리 (나중에 Three.js로 바꿔도 데이터 재사용)
  - 1단계 완료 (2026-11-21): PECVD 장비 외관 정지 그림 (`equipment/pecvd.html`에서 확인)
    - `js/explode/render-iso.js` 렌더러: 도형 box·prism(각기둥)·cylinder·disk·pipe,
      면 명암·얇은 외곽선·윗면 모서리 하이라이트·바닥 그림자, 디테일 seam·bolts·vent·window·label-plate·handle·holes
    - `data/platform.js`(EFEM·로드포트/FOUP·로드락·트랜스퍼 챔버) + `data/pecvd.js`(공정 챔버 4개·가스 박스·RF·펌프·배관, 형태만)
    - `copyOf`로 부품을 자식까지 복사 (공정 챔버 4개, 로드포트 3개), 배관은 마디별로 나눠 앞뒤 순서 계산
    - 재질 색은 `css/style.css`의 `--mat-*` 변수
    - 남은 일: `pecvd.html`은 아직 `js/pages.js` 목록에 안 넣음 (기존 `cvd-pecvd.html`과 겹침 → 시제품 완료 때 메뉴 개편과 함께 정리)
  - 다음: **2단계** — `stage.js`: 모듈 분해 스크롤 + 이름표 + 대체 화면
- 이전 개편에서 가져온 것 (`redesign` 브랜치 커밋, 그대로 유지)
  - 색 체계 (종이색 본문 + 먹색 글자 + 공정별 포인트 색)
  - GSAP 3.15.1 + ScrollTrigger (`vendor/gsap/`, 라이선스 원문 포함), GSAP 공식 스킬 4개
  - 공정 모션 엔진 `js/sim/sim-core.js`, PVD 정지 단면도 `js/sim/pvd.js`
    → 장비 부품 패널의 "공정 챔버 원리 보기"에서 재사용 예정 (`ProcessSim.mount()` 추가 필요)
    - 남은 일: 전자 나선 표현·자석 극 배치 [검증 필요], 휴대폰에서 이름표·확대도 숨김 문제

## 다음에 할 일 (내용 작성 — 장비 개편과 별도, 한 번에 한 페이지)
1. 플라즈마 (`basics/plasma.html`)
2. 박막 성장 원리 (`basics/thin-film-growth.html`)
3. PVD (`equipment/pvd.html`)
