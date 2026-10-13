# Wave 2 — 통계·서사 팩 수집

## 목표
게임 확률·급여·학교·학과·저널·서사의 근거 데이터를 issue 단위로 병렬 수집한다. issue 1건 = 세션 1개 = worktree `stats/<topic>` = PR 1개.

## 진입 조건
Wave 1 종료 조건(매핑 표 26개, 결정 기록 0006). 단, 출처가 분류에 의존하지 않는 항목(salaries-public, statistics-employment, narratives)은 Wave 1과 병행 가능.

## 체크리스트
각 항목의 완료 조건: PR 머지 + `npm run validate` 통과 + 해당 팩 README의 issue 링크 기입 + handoff 댓글.

- [ ] schools — 20개교 분야별 등록금·입학금·지원 제도 (대학 공시·대학알리미). 브랜치 `stats/schools` — issue #4
- [ ] departments — 241개 모집 단위 + NRF 코드 연결 (모집요강). `stats/departments` — issue #5
- [ ] venues-journals — 분야별 target 저널의 SJR 사분위·KCI 등재 (Scimago·KCI). `stats/venues-journals` — issue #6
- [ ] venues-conferences — 분야별 학회 CORE 등급·공개 채택률 (CORE·학회 공지). `stats/venues-conferences` — issue #7
- [ ] salaries-public — 교육공무원·연구직 공무원 호봉표 (인사혁신처). `stats/salaries-public` — issue #8
- [ ] salaries-institutes — 출연연 직급별 보수 (ALIO). `stats/salaries-institutes` — issue #9
- [ ] salaries-faculty — 대학 교원 직급별 급여 (대학알리미). `stats/salaries-faculty` — issue #10
- [ ] salaries-entry — 박사 초임·기업 연구직 임금·연구장려금 하한 (KRIVET·임금직무정보시스템·NRF 공고). `stats/salaries-entry` — issue #11
- [ ] statistics-employment — KRIVET 표 8·9·10 재수집(취업률·비임금·고용형태·휴학·박사후 재원). `stats/statistics-employment` — issue #12
- [ ] statistics-progress — KEDI 박사 배출 수·수료 기간·휴학·성별·연령 (교육통계). `stats/statistics-progress` — issue #13
- [ ] statistics-faculty-market — 분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수 (KEDI·대학알리미). 노동시장 모델의 기준값. `stats/statistics-faculty-market` — issue #14
- [ ] narratives-humanities-social — 인문사회 박사과정·연구자 수필·수기·질적 연구 장면 기록 (원문 저장 금지). `stats/narratives-hs` — issue #15
- [ ] narratives-stem — 이공 계열 동일. `stats/narratives-stem` — issue #16

## 종료 조건
13개 issue 전부 closed, 7개 팩 모두 `npm run validate` 통과, `needs-judge` 항목 0건.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 출처 독해·수치 추출 초안 | sonnet | Sol (확인 필요) | medium | `../prompts/stat-collector-wave2.md` |
| 서사 장면 추출 초안 | sonnet | Sol (확인 필요) | medium | `../prompts/narrative-collector-wave2.md` |
| 정형화·기계 검증 | haiku | Luna | low | `../prompts/stat-validator-wave2.md` |
| 출처 충돌·분류 판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 회고 | opus | Sol | medium | `../prompts/weaver-retro-any.md` |

effort 올리는 기준: 같은 수치에 출처가 둘 이상이고 값이 다를 때. 내리는 기준: 표 한 장을 그대로 옮기는 작업.

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
