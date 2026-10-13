# Wave 2 — 통계·서사 팩 수집

## 목표
게임 확률·급여·학교·학과·저널·서사의 근거 데이터를 issue 단위로 병렬 수집한다. issue 1건 = 세션 1개 = worktree `stats/<topic>` = PR 1개.

## 진입 조건
Wave 1 종료 조건(매핑 표 26개, 결정 기록 0007). 단, 출처가 분류에 의존하지 않는 항목(salaries-public, statistics-employment, narratives)은 Wave 1과 병행 가능.

## 체크리스트
각 항목의 완료 조건: PR 머지 + `npm run validate` 통과 + 해당 팩 README의 issue 링크 기입 + handoff 댓글.

- [x] schools — 20개교 분야별 등록금·입학금·지원 제도 (대학 공시·대학알리미). 브랜치 `stats/schools` — issue #4 (2026-10-13 머지: 206건, PR #27)
- [x] departments — 241개 모집 단위 + NRF 코드 연결 (모집요강). `stats/departments` — issue #5 (2026-10-13 머지: 483 단위 + 등록금 7, PR #34, 결정 기록 0011)
- [x] venues-journals — 분야별 target 저널의 SJR 사분위·KCI 등재 (Scimago·KCI). `stats/venues-journals` — issue #6 (2026-10-13 머지: 103건(SJR indexed 60), PR #33)
- [x] venues-conferences — 분야별 학회 CORE 등급·공개 채택률 (CORE·학회 공지). `stats/venues-conferences` — issue #7 (2026-10-13 머지: 43건, PR #32)
- [x] salaries-public — 교육공무원·연구직 공무원 호봉표 (인사혁신처). `stats/salaries-public` — issue #8 (2026-10-13 머지: 106건, PR #22)
- [x] salaries-institutes — 출연연 직급별 보수 (ALIO). `stats/salaries-institutes` — issue #9 (2026-10-13 머지: 54건, PR #26)
- [x] salaries-faculty — 대학 교원 직급별 급여 (대학알리미). `stats/salaries-faculty` — issue #10 (2026-10-13 머지: 66건(급여 indexed), PR #31)
- [x] salaries-entry — 박사 초임·기업 연구직 임금·연구장려금 하한 (KRIVET·임금직무정보시스템·NRF 공고). `stats/salaries-entry` — issue #11 (2026-10-13 머지: 11건(기업 임금 미수집), PR #30)
- [x] statistics-employment — KRIVET 표 8·9·10 재수집(취업률·비임금·고용형태·휴학·박사후 재원). `stats/statistics-employment` — issue #12 (2026-10-13 머지: 111건, PR #23)
- [x] statistics-progress — KEDI 박사 배출 수·수료 기간·휴학·성별·연령 (교육통계). `stats/statistics-progress` — issue #13 (2026-10-13 머지: 362건, PR #29)
- [x] statistics-faculty-market — 분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수 (KEDI·대학알리미). 노동시장 모델의 기준값. `stats/statistics-faculty-market` — issue #14 (2026-10-13 머지: 171건, PR #28)
- [x] narratives-humanities-social — 인문사회 박사과정·연구자 수필·수기·질적 연구 장면 기록 (원문 저장 금지). `stats/narratives-hs` — issue #15 (2026-10-13 머지: 47건, PR #24)
- [x] narratives-stem — 이공 계열 동일. `stats/narratives-stem` — issue #16 (2026-10-13 머지: 73건(quote 11 제거), PR #25)

### Wave 1 회고에서 이관
출처: [wave-01 §회고](wave-01-taxonomy-sources.md).

- [x] (#5 handoff: 대조 35개, 없는 코드 0개) departments(issue #5): 241개 모집 단위마다 KEDI 소계열(또는 중계열) 코드를 note에 적고, 그 코드가 `taxonomy/mapping-kedi.json`에 primary 행으로 있는지 대조한다. 없는 코드는 행을 추가하고 판정을 받는다. — 완료 조건: #5 handoff 댓글에 "대조한 KEDI 코드 N개, mapping-kedi.json에 없는 코드 0개"가 적혀 있다.
- [x] (#5 handoff: 재대조 변경 0건, 단 모집요강에 코드 미인쇄) departments(issue #5): 레코드가 참조하는 NRF 코드를 NRF 원본 분류표와 다시 대조한다(2024년 개정 반영 중 코드 변경 가능 주석 때문). — 완료 조건: registry `nrf-2024-classification`의 `checked_on`이 #5 작업일로 바뀌고, note에 "재대조: 변경 코드 N건"이 있으며, departments 레코드의 NRF 코드가 전부 `taxonomy/records.json`에 있다.
- [x] (#13: 요청 시 제공만, 공개 파일 없음 — 시도 경로 handoff) statistics-progress(issue #13): KEDI 2023년판(또는 최신판) 학과(전공) 분류 자료집 원본을 다시 찾는다. — 완료 조건: registry에 해당 판본 항목이 추가되고 U 표 코드 대조 결과가 note에 있다. 또는 시도한 경로와 실패 사유가 #13 handoff 댓글에 있다.
- [x] (모집요강 23건 #5, 수필·수기 39건 #15·#16) 출처 계급 빈칸 채우기: 모집요강 계급은 issue #4 또는 #5에서, 수필·수기 계급은 issue #15 또는 #16에서 registry에 1건 이상 등록한다. — 완료 조건: `data/sources/registry.json`에 note가 "출처 계급: 모집요강"인 항목 1건 이상, "출처 계급: 수필·수기"인 항목 1건 이상.
- [ ] (부분: alio 갱신·접속 확인, scimago·core·wage는 여전히 차단 — 브라우저 세션 필요) 자동 접속이 실패한 포털 4건(`scimago-2026-portal`, `core-2026-portal`, `alio-2026-portal`, `wage-2026-portal`)은 각 수집 issue(#6, #7, #9, #11)에서 브라우저로 확인하고 확인 수단을 note에 적는다. — 완료 조건: 네 항목의 note에 "403"·"실패"·"ECONNRESET" 문자열이 없고 `checked_on`이 갱신되었다.
- [x] (검증기 규칙으로 강제, PR #21) 포털 항목은 레코드의 출처로 쓰지 않는다. 수치는 하위 id(`<publisher>-<year>-<topic>`)로 등록한다. — 완료 조건: Wave 2에서 추가된 레코드 중 `source_id`가 `-portal`로 끝나는 것이 0건(검증기 규칙으로 넣으면 `npm run validate`가 검사).
- [x] (PR #21) 이 파일 §진입 조건의 "결정 기록 0006"을 "결정 기록 0007"로 고친다. 커밋 e79f4e8이 0006을 Sonnet↔Luna 결정에 쓰면서 wave-01만 고쳤다. — 완료 조건: 이 파일 §진입 조건이 0007을 가리킨다.
- [ ] (템플릿 줄은 추가됨 PR #21; Wave 2 PR 본문에는 출력 없음 — 미이행) (Wave 0에서 이관 안 됨) Node 20 실행 확인을 PR 템플릿에 넣는다. — 완료 조건: `.github/pull_request_template.md` 체크리스트에 "CI와 같은 Node 메이저(20)로 실행, `node --version` 출력을 본문에" 줄이 있고, Wave 2 PR 본문마다 그 출력이 있다.
- [x] (PR #21) (Wave 0에서 이관 안 됨) 약어 규칙을 PR 템플릿에 넣는다. — 완료 조건: `.github/pull_request_template.md` 체크리스트에 "독립 단위(issue 본문·프롬프트·팩 README)의 약어는 첫 등장에 풀어쓰거나 용어집 링크" 줄이 있다.
- [ ] (미이행: Wave 2 판정은 결정 기록·README 문단으로만 남김, 행 단위 표 없음) `needs-judge` 행이 10행을 넘으면 판정자는 행마다 판정(유지·변경·삭제)과 이유 한 줄을 표로 남기고 `data/packs/<pack>/needs-judge-*.md`에 커밋한다. — 완료 조건: Wave 2의 각 판정 커밋에서 그 표의 행 수가 수집자가 올린 `needs-judge` 행 수와 같다.
- [ ] Wave 2 회고는 이관 항목을 같은 PR에서 wave-03 §체크리스트에 붙여넣는다. — 완료 조건: Wave 2 회고 PR의 변경 파일 목록에 `docs/waves/wave-03-engine-spec.md`가 있고, 그 파일에 "Wave 2 회고에서 이관" 하위 절이 있다.

## 종료 조건
13개 issue 전부 closed, 7개 팩 모두 `npm run validate` 통과, `needs-judge` 항목 0건.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 출처 독해·수치 추출 초안 | sonnet | Luna | medium | `../prompts/stat-collector-wave2.md` |
| 서사 장면 추출 초안 | sonnet | Luna | medium | `../prompts/narrative-collector-wave2.md` |
| 정형화·기계 검증 | haiku | Luna | low | `../prompts/stat-validator-wave2.md` |
| 출처 충돌·분류 판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 회고 | opus | Sol | medium | `../prompts/weaver-retro-any.md` |

effort 올리는 기준: 같은 수치에 출처가 둘 이상이고 값이 다를 때. 내리는 기준: 표 한 장을 그대로 옮기는 작업.

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
