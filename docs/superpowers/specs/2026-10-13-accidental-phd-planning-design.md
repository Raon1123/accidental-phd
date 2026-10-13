# 어쩌다 박사 고도화 — 계획 단계 설계 (Wave 0)

- 상태: 승인됨 (2026-10-13, 대화 승인)
- 작성: Claude Fable 5.1, 사용자(Raon1123) 검토
- 범위: 이 문서는 **계획 단계**의 설계다. 코드 아키텍처의 큰 틀, 데이터 규율, 협업 워크플로우, 프롬프트 세트의 형태를 정한다. 엔진 공식과 UI 세부는 Wave 3·5의 별도 스펙에서 정한다.

## 1. 목표와 성공 기준

**목표.** 1in8b.life("1 in 8 Billion", 통계로 굴러가는 임의의 한 사람의 일생 시뮬레이션)의 프레임을 **한국 연구자의 life cycle**로 옮긴 게임을 만든다. 친구(hslee0251)가 만든 "어쩌다 박사" v3.5를 고도화한다. 친구 게임의 소스는 접근할 수 없고 배포된 JS만 읽을 수 있으므로, 이 repo에서 **재구현**하되 배포본은 수치·행동 비교용 oracle로 쓴다.

**성공 기준 (계획 단계).**
1. 어떤 agent나 사람이 세션을 멈춰도 repo와 GitHub issue만 보고 이어갈 수 있다.
2. 통계 수집을 issue 1건 = 세션 1개 = worktree 1개 = PR 1개 단위로 병렬 진행할 수 있다.
3. 모든 설계 선택이 결정 기록(decision record)으로 남는다.
4. ChatGPT 사용자가 프롬프트 파일 하나를 붙여넣어 같은 출력 계약으로 기여할 수 있다.

**비목표.** 이번 단계에서 엔진 코드나 UI를 쓰지 않는다. 사망·수명 모델은 상속하지 않는다(80세 기록 종료, 친구 게임과 동일). 유료 데이터(Clarivate JCR 등)는 쓰지 않는다.

## 2. 원본과 oracle에서 상속하는 것

| 출처 | 상속 | 상속하지 않음 |
|---|---|---|
| 1in8b.life | 통계 기반 생성, 0–100 능력치 4개 원리("숫자는 확률을 올릴 뿐 결정하지 않는다"), 연 단위 focus 선택, 나이별 결정 지점, "같은 순간 태어난 다른 사람" 비교, 출처 명시 footer, 속도 조절·자동 모드, 브라우저 로컬 저장 | 국가·수명·사망 원인 모델, 메모리얼/공유 커뮤니티 |
| 어쩌다 박사 v3.5 | 월 단위 박사과정 엔진 구조, 학교 20개·학과 241개 범위, 가상 표시명 관례(서월대학교 등), 출처 캐비앗 관례(statistics.js 헤더), 졸업 후 경력·은퇴 단계, 자동 진행 cohort 정책 | 코드 자체(라이선스 미표기), "전공만 선택" 구조, 출처 없는 급여 범위 |

v3.5 모듈 지도와 공식은 부록 A에 둔다.

## 3. Repo 구조

```
docs/
  design/decisions/NNNN-<topic>.md   결정 기록: 상태·맥락·결정·결과 4필드 필수
  waves/wave-NN-<name>.md            wave 파일: 목표·진입조건·체크리스트·종료조건·모델표·회고
  waves/STATUS.md                    보드. PR마다 갱신. 세션 복원의 단일 진실
  prompts/<role>-<wave>.md           ChatGPT·Claude 공용 프롬프트
  workflow.md                        협업 계약: claim 규약·라벨·모델/effort 표·handoff 형식
  oracle/v35-recon.md                친구 v3.5 모듈 지도·공식 (비교 기준)
data/
  sources/registry.json              출처 등록부
  schema/*.schema.json               팩별 JSON 스키마
  packs/{taxonomy,schools,departments,venues,salaries,statistics,narratives}/
engine/                              순수 함수. UI 의존 없음 (Wave 4)
web/                                 정적 사이트, localStorage (Wave 5)
.github/ISSUE_TEMPLATE/{stat-collection,design-decision,wave-task,bug}.yml
.github/workflows/{validate-data,test}.yml
```

**기술 선택.** TypeScript ES 모듈, Vitest, GitHub Pages 정적 배포, 백엔드 없음. 한국어 우선, 문자열은 분리해 영어·일본어 추가 가능. 이 선택은 결정 기록 0001로 남긴다.

## 4. 선택권 모델 (핵심 차별점)

친구 게임은 전공만 고르고 나머지는 운이다. 우리는 플레이어가 고르고 그 선택이 삶을 바꾸는 것을 보여준다.

**단계.** 입학 전 → 박사과정(월 단위) → 경력(연 단위) → 기록 종료(80세).

**입학 전 선택.** 계열(인문사회·이공) → 전공군 → 세부전공(한국연구재단 학술연구분야분류 중·소분류) → 학교·학과(241개 박사 모집 단위까지) → 자금 경로(장학·과제·자비) → 지도교수 유형 선호. 선택 단위는 학과까지 내려간다. 각 항목에 "운에 맡기기"를 둬 전부 랜덤 플레이도 가능하다.

**계열 분리.** 인문사회계열과 이공계열은 서사·사건·경력 경로를 별도 팩으로 관리한다. 연구 방법(실험실·현장·문헌·데이터)과 자금 구조(BK21·과제 vs 장학·강사)가 다르기 때문이다.

**결정 지점.** 시간을 멈추고 묻는다. 자격시험 직후, 첫 논문 판정, 자금 만료, 졸업 직전(학계·산업·공공·창업), 경력 5년·10년, 은퇴 전. 선택지는 2~4개. 각 선택지에 통계에서 유도한 확률 힌트를 보여준다.

**원칙.** 선택과 능력치는 확률을 바꿀 뿐 결과를 결정하지 않는다. 모든 확률은 데이터 팩 수치나 결정 기록에 근거를 둔다. 근거 없는 확률은 "설계 가정"으로 표시한다(v3.5 realistic-engine 헤더 관례).

**노동시장과 가상 뉴스.** 시간강사·교수·연구원 채용은 "공고 확률"로 모델링한다. 기준값은 통계(분야별 신규 임용 교원 수, 시간강사 수, 공고 건수)에서 오고, 매월 "가상의" 학문 분야 뉴스 이벤트(예: 특정 분야 정부 투자 발표, 학과 통폐합, 신기술 유행)가 그 달과 이후 몇 달의 수요 계수를 올리거나 내린다. 뉴스는 창작이며 창작 표시를 하고, 효과 크기는 결정 기록에 근거를 둔다. 운이 좋으면 수요가 늘어난 달에 공고를 만난다. 공식은 Wave 3에서 정하고, 뉴스 텍스트 팩은 Wave 5에서 쓴다.

**선택의 효과를 보여주는 장치.**
- "다른 선택 보기": 같은 seed로 결정 지점에서 다시 분기.
- "같은 해 입학한 동기 4명": 같은 통계, 다른 선택을 나란히 표시.

세부 공식은 Wave 3 스펙에서 정한다.

## 5. 데이터 팩과 출처 규율

**레코드 형식.** 모든 수치는 다음 필드를 가진다.

```
{ id, value, unit, source_id, table, page, population, denominator,
  year, checked_on, confidence: "verified"|"indexed"|"assumed", note }
```

분모 없는 비율, source_id 없는 수치는 CI에서 거부한다. `confidence: assumed`는 설계 가정이며 UI에서 "게임 설정"으로 표시한다.

**팩별 내용과 1차 출처 계급.**

| 팩 | 내용 | 출처 계급 |
|---|---|---|
| taxonomy | 한국연구재단 학술연구분야분류(대·중·소) ↔ 교육통계 학과 분류 ↔ 게임 트랙 매핑. 세부전공 선택지는 이 분류의 중·소분류를 그대로 쓴다. 계열(인문사회/이공) 구분도 이 분류의 대분류에서 유도 | NRF, KEDI 교육통계 |
| schools | 20개교 등록금·입학금·연구 지원 제도. 표시명은 가상 | 각 대학 공시, 대학알리미 |
| departments | 241개 박사 모집 단위 | 각 대학원 모집요강 |
| venues | 저널(SJR 사분위, KCI 등재), 학회(CORE 등급), 공개된 채택률 | Scimago, KCI, CORE |
| salaries | 교육공무원·연구직 공무원 호봉표, 출연연(ALIO), 대학 교원(대학알리미), 박사 초임(KRIVET), BK21·연구장려금 하한, 기업 연구직 임금(임금직무정보시스템) | 인사혁신처, ALIO, KRIVET, 고용노동부 |
| statistics | 취업률, 고용형태, 휴학, 수료 기간, 배출 수, 성별·연령 분포, 분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수 | KRIVET 박사조사, KISTEP 지표집, KEDI 교육통계, 대학알리미 |
| narratives | 박사과정·연구자 수필·수기·인터뷰·질적 연구에서 뽑은 장면 단위 기록. 인문사회/이공 하위 팩으로 분리. 시나리오 작성의 근거 | 출판 수필, 대학원생 수기 공모, 브런치·블로그(공개), 질적 연구 논문, 언론 인터뷰 |

**narratives 팩의 규율.** 원문을 저장하지 않는다. 레코드는 `{id, track: 인문사회|이공, stage, theme, summary(요약 2~3문장, 창작 가능), quote(15단어 이하 1개 이하), source_id, page_or_url, year, checked_on, confidence}`이며 summary는 저작권 침해 없이 장면의 구조(상황·갈등·선택·결과)만 적는다. 시나리오 작성 wave는 이 팩을 근거로 창작하고, 창작임을 UI에 표시한다(v3.5 research-tracks 관례).

**캐비앗 보존.** 출처가 명시한 한계("졸업자 조사는 입학자 종단조사가 아니다")를 레코드 note에 그대로 옮긴다.

## 6. Wave 워크플로우

| Wave | 내용 | 종료 조건 |
|---|---|---|
| 0 | 계획·협업 계약·템플릿·CI 골격·프롬프트 v1·issue 등록 | PR 머지, issue 발행 |
| 1 | 분류 체계 + 출처 등록부 | taxonomy 팩 스키마 통과 |
| 2 | 통계·서사 팩 수집 (issue 단위 병렬, 별도 세션) | 7개 팩 모두 provenance lint 통과 |
| 3 | 엔진·선택권 모델 명세 + v3.5 oracle 비교 | 결정 기록 + 공식표 |
| 4 | 엔진 구현 (TDD) | 테스트 통과 |
| 5 | UI + 서사 콘텐츠 | 플레이 가능 |
| 6 | 밸런스·플레이테스트·회고 | 다음 사이클 계획 |

**wave 파일 필수 섹션.** 목표, 진입 조건, 체크리스트(완료 조건이 검증 가능한 문장), 종료 조건, 모델·effort 표, 회고(실패 항목 → 다음 wave 체크리스트 추가 항목 → 프롬프트 수정 diff). 회고 섹션이 self-improve 루프다.

**통계 수집 규약 (Wave 2).** issue 1건 = 세션 1개 = worktree `stats/<topic>` = PR 1개. issue 템플릿에 대상 팩 파일, 후보 출처, 필수 필드, 수용 체크리스트를 둔다.

## 7. Hold-safe 협업 규약

- 라벨: `wave/N`, `area/{taxonomy,schools,departments,venues,salaries,statistics,narratives,engine,ui,workflow,docs}`, `claimed`, `blocked`, `needs-judge`, `stale`, `chatgpt-ready`.
- claim: assignee 지정 + "claimed by <이름> on <날짜>" 댓글. 7일 무활동이면 `stale`로 바꾸고 누구나 이어간다.
- 세션 종료 시 issue에 handoff 댓글: 한 일, 남은 일, 막힌 것, 다음 사람이 처음 읽을 파일.
- `needs-judge`: 모호한 판정은 Fable(Astra)이 재판정하고 결정 기록으로 남긴다.
- 상태는 repo와 issue에만 둔다. 채팅 세션에만 있는 정보는 없는 것으로 친다.

## 8. 모델·effort 표와 프롬프트 세트

| 역할 | Claude | ChatGPT | 기본 effort |
|---|---|---|---|
| 판정·스펙 감사·모호한 결정 재판정 | fable | Astra | high |
| 엮기·회고·결정 기록 작성 | opus | Sol | medium~high |
| 출처 독해·통계 추출 초안 | sonnet | Luna | medium |
| 스키마 검증·일괄 정형화 | haiku | Luna | low |

Sonnet의 ChatGPT 대응은 Luna다(사용자 확정 2026-10-13, 결정 기록 0006). wave별 effort는 wave 파일 표에서 조정한다. Claude 쪽 spawn은 사용자 CLAUDE.md 규칙대로 literal `model:`을 항상 넘긴다.

**프롬프트 파일 구성.** 붙여넣을 맥락 블록, 과제, 출력 계약(issue에 바로 붙일 markdown 또는 스키마에 맞는 JSON), 자기 검증 체크리스트, handoff 형식. ChatGPT는 `gh`가 없으므로 출력은 사람이 붙여넣는 형태로 통일한다.

## 9. 검증

- CI `validate-data`: JSON 스키마 검증, provenance lint(수치마다 source_id·denominator), 문서 링크 검사, 결정 기록 4필드 검사.
- CI `test`: 엔진 단위 테스트(Wave 4부터), v3.5 공식 스냅샷 비교(부록 A 기준).
- Wave 0에서는 스키마와 lint 스크립트 골격만 두고 빈 팩으로 통과시킨다.

## 10. 위험과 대응

| 위험 | 대응 |
|---|---|
| 영향력 지표 유료 | SJR·CORE·KCI만 사용. 결정 기록 0002 |
| 졸업자 조사 ≠ 종단 코호트 | 캐비앗을 레코드에 보존, UI 문구에 반영 |
| 급여 출처 분산 | salaries 팩을 출처 계급별 하위 파일로 분리 |
| 친구 코드 라이선스 미표기 | 코드 복사 금지. 공식·수치만 oracle 부록에 기록 |
| 실명 학교 데이터 민감도 | 표시명 가상 유지, 데이터는 공시 자료만 |

## 부록 A. 어쩌다 박사 v3.5 oracle 요약

전체는 `docs/oracle/v35-recon.md`. 핵심만 적는다.

- 모듈: app.js → engine.js → life-engine.js → {school-study-engine.js, realistic-engine.js, legacy-engine.js}; departments.js → {department-data.js(241), research-tracks.js(26)}; schools.js(20); statistics.js; cohort.js; stories.js; school-model.js. legacy-engine.js, stories.js, school-model.js, research/department-sources.json은 읽지 못했다.
- 능력치: energy, morale, relationship, skill, network (0–100). focus: research/write/network/teach/rest/thesis.
- 분야 모델(rate, 심사 개월, 등록금 만원/학기, 요구 논문, 연구량 목표): cs 7 [2,6] [320,570] [1,2,2,3] 180 · math 5.9 [4,10] [280,460] [1,1,2] 175 · bio 5.8 [3,8] [350,620] [1,2,2] 180 · engineering 6.5 [3,7] [330,590] [1,2,2] 185 · social 5.5 [4,9] [260,470] [1,1,2] 175 · humanities 5.2 [4,10] [250,450] [0,1,1] 180.
- 논문 채택 = clamp(0.15 + quality×0.005 + (attempts−1)×0.07, 0.25, 0.88). 학위 심사 = clamp(0.35 + skill×0.004 + relationship×0.001 + energy×0.001 + attempts×0.08, 0.40, 0.94).
- 출처 있는 통계: 취업률 cs .682 / math,bio .587 / engineering .625 / social .470 / humanities .408 (KRIVET 2025-03-31, 2024 학업전념 박사); 고용형태 정규 45.0 / 비정규 전일 44.1 / 시간제 10.9; 휴학 stem .125 / other .188; 박사후 재원 대학 60.9 / 정부 14.5 / 공공연 13.7 / 민간연 1.8 / 기업 3.1 / 기타 6.0 (KISTEP 2023 지표집).
- 경력 월급(만원, 설계 가정): postdoc 250–380, contract 240–360, industry 320–520, institute 310–460, public 270–410, professor 360–520. 은퇴 U[60,67], 기록 종료 80세.
