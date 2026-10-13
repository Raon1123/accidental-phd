# Wave 1 — 분류 체계·출처 등록부

## 목표
세부전공 선택지의 기준이 될 한국연구재단 학술연구분야분류를 수집하고, 교육통계 학과 분류와 게임 트랙 26개를 거기에 매핑한다. Wave 2가 쓸 출처 계급을 등록부에 미리 넣는다.

## 진입 조건
Wave 0 PR 머지.

## 체크리스트
- [x] NRF 학술연구분야분류 대·중·소분류 코드 수집 → `data/packs/taxonomy/records.json` (value=수준, unit=level, note에 한글명·상위 코드). 완료 조건: 대분류 전부, 중·소분류는 인문사회·이공 계열 전부. 출처 URL·고시 연도 registry 등록. — issue #1 (2026-10-13: 1,040건, 대 8·중 153·소 879, 출처 `nrf-2024-classification`)
- [x] (부분 완료, §회고 참조) 교육통계(KEDI) 학과 분류 ↔ NRF 매핑 → `taxonomy/mapping-kedi.json`. 완료 조건: 241개 학과가 쓰는 모든 KEDI 코드에 NRF 코드 1개 이상. — issue #2 (2026-10-13: KEDI 125코드·236행, 인문·사회·공학·자연 소계열 전부, 판정은 결정 기록 0009. "241개 학과" 대조는 departments 팩 수집(#5)에서 확인)
- [x] 게임 트랙 26개 ↔ NRF 소분류 매핑 → `taxonomy/mapping-tracks.json`. 완료 조건: 26개 전부, 1:N은 전부 나열 후 `needs-judge` 판정 완료. — issue #3 (2026-10-13: 66행, 판정은 결정 기록 0008)
- [x] (부분 완료, §회고 참조) `registry.json`에 출처 계급 7종(NRF/KEDI, 대학 공시, 모집요강, Scimago/KCI/CORE, 인사혁신처/ALIO/대학알리미/KRIVET, KRIVET/KISTEP/KEDI 통계, 수필·수기) 각 1건 이상. 완료 조건: `npm run validate` 통과. (2026-10-13: 포털 7건 등록. 모집요강·수필·수기·인사혁신처는 개별 수집 issue에서 등록 — 포털이 없는 계급)
- [x] 결정 기록 0007: 분류 기준으로 NRF를 택한 이유와 계열(인문사회·이공) 유도 규칙. (2026-10-13 승인)

## 종료 조건
`npm run validate` 통과, 매핑 표에 26개 트랙 전부, 결정 기록 0007 승인.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 분류 수집·매핑 초안 | sonnet | Luna | medium | `../prompts/taxonomy-mapper-wave1.md` |
| 1:N 매핑 판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 정형화·검증 | haiku | Luna | low | `../prompts/stat-validator-wave2.md` |
| 회고 | opus | Sol | medium | `../prompts/weaver-retro-any.md` |

## 회고 (2026-10-13, PR #21 리뷰 전)
약어는 [용어집](../workflow.md#용어집)을 따른다.

### 실패한 체크리스트 항목
판정 요약. 완료 3건: 한국연구재단(NRF) 코드 수집(issue #1), 트랙 매핑(issue #3), 결정 기록 0007. 부분 완료 2건: 한국교육개발원(KEDI) 매핑(issue #2), 출처 계급 등록. 부분 완료 2건도 체크박스는 `[x]`로 표시되어 있다. 아래 목록은 이 2건과, 체크리스트 밖에서 드러난 실패다.

완료 항목의 참고 사항. NRF 코드는 1,040건(대 8·중 153·소 879)이고, 분류표 주석이 "2024년 개정 내용 시스템 반영 과정에서 분야코드가 변경될 수 있음"이라고 밝힌다. 표제는 "학술표준분류표 (2025. 11.)"인데 `year`는 개정 연도 2024로 적었다(issue #1 handoff, 커밋 d09e123). 트랙 매핑은 트랙 26개·primary 26개·`needs-judge` 0건이고, primary 수준은 중분류 21개·소분류 5개로 결정 기록 0008 최종 표와 일치한다(커밋 21dd139). 항목 문장은 "NRF 소분류 매핑"이라 결과와 맞지 않는다. 결정 기록 0007은 커밋 e79f4e8에서 번호가 0006에서 0007로 옮겨졌다.
- KEDI 학과 분류 ↔ NRF 매핑(부분 완료). 완료 조건 "241개 학과가 쓰는 모든 KEDI 코드에 NRF 코드 1개 이상"을 확인하지 않았다. 매핑은 4년제 대학 표(U 코드) 163개 중 125개이고, 교육·의약·예체능 계열은 중계열까지만 매핑했다(소계열 38개 제외). — 원인: 범위 과다. 완료 조건이 Wave 2 departments 팩(issue #5)의 241개 모집 단위 목록에 의존해서 Wave 1 안에서는 검증할 수 없었다. — 근거: issue #2 handoff, 커밋 b07165b, 이 파일 체크리스트 둘째 항목의 주석.
- KEDI 매핑의 출처 연도(부분 완료). KEDI 교육통계가 쓰는 2023년판 학과(전공) 분류 자료집 원본을 찾지 못했다. 2020년판을 쓰고 2024년 제3자 사본으로 4년제 대학 표 163개 코드가 바뀌지 않았음을 확인했다. — 원인: 출처 부족. 교육통계서비스(KESS)에서 2023·2024년판 원본을 찾지 못했다. — 근거: registry `kedi-2020-major-classification`·`kedi-2024-major-classification-summary`·`moe-2024-graduate-employment-release`의 note, 결정 기록 0009 §결과, PR #21 "열린 것".
- registry 출처 계급 7종 각 1건 이상(부분 완료). 7종 중 5종만 등록했다. 모집요강과 수필·수기 계급은 항목이 없다. 등록한 포털 7건 중 4건(Scimago, CORE, ALIO, 고용노동부 임금직무정보시스템)은 자동 접속이 HTTP 403 또는 연결 종료로 실패해서, 등록은 했지만 접속은 확인하지 못했다. — 원인: 범위 과다. 포털이 있는 계급과 문서마다 출처가 다른 계급(모집요강·수필·수기)을 한 항목에 섞었고, 완료 조건 `npm run validate`는 "7종"이라는 항목 문장 자체를 검사하지 않는다. — 근거: `data/sources/registry.json`의 `*-portal` 항목 note, 커밋 21dd139, 이 파일 체크리스트 넷째 항목의 주석.
- Wave 0 회고의 이관 항목 4건이 이 파일 체크리스트로 옮겨지지 않았다. [wave 규약](README.md)은 "반드시 옮긴다"고 정한다. — 원인: 프롬프트 모호. `weaver-retro-any.md` 출력 계약은 회고 markdown과 STATUS 한 줄만 요구하고, 다음 wave 파일에 붙여넣는 일을 요구하지 않는다. Wave 0 회고는 PR #20 리뷰 단계에서 작성되었고, 그때 이 파일은 이미 있었다. — 근거: 커밋 421a514(wave-00 파일만 수정, wave-01 파일은 변경 없음).
- 위 4건의 이행 여부. (1) Node 20 실행 확인: 미이행. PR #21 본문에 `node --version` 출력이 없다. 로컬은 v24.14.1이었고, CI(Node 20)의 test·validate는 통과했다. (2) 판정을 repo에 즉시 기록: 이행. 판정은 같은 날 결정 기록 0008·0009, `needs-judge-*.md`, issue #2·#3 handoff 댓글에 남았다. (3) `node --test`의 `.ts` 탐색: Wave 4 항목이라 Wave 1의 판정 대상이 아니다. (4) 약어 규칙: 부분 이행. taxonomy 팩 README는 용어집을 링크하지만, 완료 조건인 "PR 리뷰 체크 항목"이 PR 템플릿에 없다. — 원인: 프롬프트 모호. 앞 항목과 같은 원인이다. 이관되지 않아서 Wave 1 작업자가 이 항목들을 체크리스트에서 보지 못했다. — 근거: PR #21 본문, `.github/pull_request_template.md`(이 브랜치에서 변경 없음).
- `needs-judge` 판정을 행 단위로 추적할 수 없다. 수집자(sonnet)가 KEDI 87행·트랙 49행을 올렸고, 판정자(fable, main thread)가 같은 날 전부 판정했다. KEDI 쪽 primary 변경은 0건, 트랙 쪽 primary 변경은 2건이다. 이와 별도로 결정 기록 0008이 코드 5종(E300000, H070000, H060000, B081000, B150900)을 지웠고, 트랙 매핑 행 수는 72에서 66이 되었다. 결정 기록 0009는 쟁점 5개와 catch-all 코드를 개별로 다루고, 나머지는 "수집자의 primary를 승인"으로 일괄 처리했다. 수집자가 만든 행별 `needs-judge` 표는 커밋되지 않았고, `needs-judge-*.md`에는 판정 후 요약만 있다. 그래서 87행 각각이 검토되었는지 repo만 보고 확인할 수 없다. 0008·0009에는 judge 프롬프트 출력 계약의 "반대 근거" 절이 없고, 상태 줄은 "제안됨"을 거치지 않고 판정자가 직접 "승인됨"으로 썼다. — 원인: 프롬프트 모호. `judge-any.md`는 쟁점 하나에 판정 하나를 전제하고, 수십 행을 한 번에 판정할 때의 기록 형식이 없다. — 근거: 커밋 21dd139·b07165b(`needs-judge-*.md`는 각 커밋 1회, 요약본만), 결정 기록 0008·0009 §상태, `docs/prompts/judge-any.md` §과제 4·§출력 계약.

### 다음 wave 체크리스트에 추가할 항목
아래 항목은 [wave-02-statistics-packs.md](wave-02-statistics-packs.md) §체크리스트 "Wave 1 회고에서 이관"에 옮겼다.

- [ ] departments(issue #5): 241개 모집 단위마다 KEDI 소계열(또는 중계열) 코드를 note에 적고, 그 코드가 `taxonomy/mapping-kedi.json`에 primary 행으로 있는지 대조한다. 없는 코드는 행을 추가하고 판정을 받는다. — 완료 조건: #5 handoff 댓글에 "대조한 KEDI 코드 N개, mapping-kedi.json에 없는 코드 0개"가 적혀 있다.
- [ ] departments(issue #5): 레코드가 참조하는 NRF 코드를 NRF 원본 분류표와 다시 대조한다(2024년 개정 반영 중 코드 변경 가능 주석 때문). — 완료 조건: registry `nrf-2024-classification`의 `checked_on`이 #5 작업일로 바뀌고, note에 "재대조: 변경 코드 N건"이 있으며, departments 레코드의 NRF 코드가 전부 `taxonomy/records.json`에 있다.
- [ ] statistics-progress(issue #13): KEDI 2023년판(또는 최신판) 학과(전공) 분류 자료집 원본을 다시 찾는다. — 완료 조건: registry에 해당 판본 항목이 추가되고 U 표 코드 대조 결과가 note에 있다. 또는 시도한 경로와 실패 사유가 #13 handoff 댓글에 있다.
- [ ] 출처 계급 빈칸 채우기: 모집요강 계급은 issue #4 또는 #5에서, 수필·수기 계급은 issue #15 또는 #16에서 registry에 1건 이상 등록한다. — 완료 조건: `data/sources/registry.json`에 note가 "출처 계급: 모집요강"인 항목 1건 이상, "출처 계급: 수필·수기"인 항목 1건 이상.
- [ ] 자동 접속이 실패한 포털 4건(`scimago-2026-portal`, `core-2026-portal`, `alio-2026-portal`, `wage-2026-portal`)은 각 수집 issue(#6, #7, #9, #11)에서 브라우저로 확인하고 확인 수단을 note에 적는다. — 완료 조건: 네 항목의 note에 "403"·"실패"·"ECONNRESET" 문자열이 없고 `checked_on`이 갱신되었다.
- [ ] 포털 항목은 레코드의 출처로 쓰지 않는다. 수치는 하위 id(`<publisher>-<year>-<topic>`)로 등록한다. — 완료 조건: Wave 2에서 추가된 레코드 중 `source_id`가 `-portal`로 끝나는 것이 0건(검증기 규칙으로 넣으면 `npm run validate`가 검사).
- [ ] wave-02 §진입 조건의 "결정 기록 0006"을 "결정 기록 0007"로 고친다. 커밋 e79f4e8이 0006을 Sonnet↔Luna 결정에 쓰면서 wave-01만 고쳤다. — 완료 조건: wave-02 §진입 조건이 0007을 가리킨다.
- [ ] (Wave 0에서 이관 안 됨) Node 20 실행 확인을 PR 템플릿에 넣는다. — 완료 조건: `.github/pull_request_template.md` 체크리스트에 "CI와 같은 Node 메이저(20)로 실행, `node --version` 출력을 본문에" 줄이 있고, Wave 2 PR 본문마다 그 출력이 있다.
- [ ] (Wave 0에서 이관 안 됨) 약어 규칙을 PR 템플릿에 넣는다. — 완료 조건: `.github/pull_request_template.md` 체크리스트에 "독립 단위(issue 본문·프롬프트·팩 README)의 약어는 첫 등장에 풀어쓰거나 용어집 링크" 줄이 있다.
- [ ] `needs-judge` 행이 10행을 넘으면 판정자는 행마다 판정(유지·변경·삭제)과 이유 한 줄을 표로 남기고 `data/packs/<pack>/needs-judge-*.md`에 커밋한다. — 완료 조건: Wave 2의 각 판정 커밋에서 그 표의 행 수가 수집자가 올린 `needs-judge` 행 수와 같다.
- [ ] Wave 2 회고는 이관 항목을 같은 PR에서 wave-03 §체크리스트에 붙여넣는다. — 완료 조건: Wave 2 회고 PR의 변경 파일 목록에 `docs/waves/wave-03-engine-spec.md`가 있고, 그 파일에 "Wave 2 회고에서 이관" 하위 절이 있다.

### 프롬프트 수정 diff
- `docs/prompts/taxonomy-mapper-wave1.md` §과제 3: before "각 게임 트랙에 NRF 소분류 코드를 붙인다. 소분류가 없으면 중분류." → after "각 게임 트랙에 primary NRF 코드 1개를 붙인다. 트랙이 중분류 하나를 통째로 덮으면 중분류를, 일부만 가리키면 소분류를 primary로 둔다. 나머지 후보는 primary=false 행으로 전부 나열한다(결정 기록 0008)." — 이유: 트랙 수집자가 이 문장과 달리 중분류 primary를 골랐고 판정자가 0008에서 그 선택을 규칙으로 승인했다.
- `docs/prompts/taxonomy-mapper-wave1.md` §과제 2: before "각 KEDI 학과 코드에 NRF 코드를 1개 이상 붙인다." → after "각 KEDI 학과 코드에 primary NRF 코드 1개를 붙인다. primary는 KEDI 단위 전체를 담는 가장 좁은 NRF 코드이고 중분류·대분류도 허용한다. 횡단 후보는 primary=false 행으로 나열한다(결정 기록 0009)." — 이유: 이 과제에는 수준 규칙이 없어서 KEDI 수집자가 규칙을 스스로 정했고, 판정자가 0009에서 그것을 승인했다.
- `docs/prompts/taxonomy-mapper-wave1.md` §출력 계약 (3): before "`[{ \"track\": \"computer\", \"nrf_code\": \"...\", \"nrf_name\": \"...\", \"confidence\": \"verified\", \"note\": \"\" }`" → after "트랙: `[{ \"track\": \"computer\", \"nrf_code\": \"...\", \"nrf_name\": \"...\", \"level\": 2, \"confidence\": \"verified\", \"primary\": true, \"계열\": \"이공\", \"note\": \"\" }]` · KEDI: `[{ \"kedi_code\": \"...\", \"kedi_name\": \"...\", \"kedi_level\": 3, \"nrf_code\": \"...\", \"nrf_name\": \"...\", \"nrf_level\": 2, \"confidence\": \"indexed\", \"primary\": true, \"계열\": \"이공\", \"note\": \"\" }]`" — 이유: 커밋 b07165b가 taxonomy 팩 README에 적은 필드(`level`·`nrf_level`·`kedi_level`·`primary`·`계열`)가 프롬프트에 없어서, 이 프롬프트를 그대로 쓰면 다른 모양의 JSON이 나온다.
- `docs/prompts/taxonomy-mapper-wave1.md` §handoff 형식: before "- 브랜치/worktree: stats/taxonomy" → after "- 브랜치/worktree: stats/taxonomy-<nrf|kedi|tracks>" — 이유: 실제 브랜치는 `stats/taxonomy-nrf`이고 issue #2·#3 본문은 `stats/taxonomy-kedi`·`stats/taxonomy-tracks`를 쓴다.
- `docs/prompts/judge-any.md` §과제 4: before "4. 판정한다. 판정은 하나다." → after "4. 판정한다. 판정은 쟁점마다 하나다. `needs-judge` 행이 10행을 넘으면 행마다 판정(유지·변경·삭제)과 이유 한 줄을 표로 쓰고, 그 표를 `data/packs/<pack>/needs-judge-*.md`에 그대로 남긴다." — 이유: Wave 1에서 87행을 일괄 승인한 기록만 남아 행 단위 검토 여부를 확인할 수 없다.
- `docs/prompts/stat-collector-wave2.md` §과제 1: before "1. 후보 출처 각각에 대해 registry 항목을 만든다(이미 있으면 id만 쓴다)." → after "1. 후보 출처 각각에 대해 registry 항목을 만든다(이미 있으면 id만 쓴다). `-portal`로 끝나는 항목은 출처 계급의 입구일 뿐이므로 레코드의 `source_id`로 쓰지 않고, 수치를 읽은 문서마다 `<publisher>-<year>-<topic>` 항목을 새로 만든다. 포털 note에 접속 실패가 적혀 있으면 이번 확인 결과와 확인 수단(자동·브라우저)으로 note와 `checked_on`을 갱신한다." — 이유: Wave 1 포털 항목은 "개별 수치는 하위 id로"라는 규칙을 note에만 담고 있고, 4건은 접속 실패 상태로 남아 있다.
- `docs/prompts/weaver-retro-any.md` §출력 계약: before "그 뒤에 `docs/waves/STATUS.md`의 해당 행을 갱신한 표 한 줄." → after "그 뒤에 (a) 다음 wave 파일 `## 체크리스트` 끝에 붙일 `### Wave NN 회고에서 이관` 블록과 (b) `docs/waves/STATUS.md`의 해당 행을 갱신한 표 한 줄. (a)는 회고와 같은 커밋에 넣는다." — 이유: Wave 0 회고의 이관 항목 4건이 wave-01 체크리스트로 옮겨지지 않았다(커밋 421a514).

### 결정 기록으로 올릴 것
- 의존 관계가 있는 issue 여러 건을 worktree 하나·PR 하나로 묶을 수 있는가 — 쟁점: [workflow 규약](../workflow.md)은 "issue 1건 = 세션 1개 = worktree 1개 = PR 1개"인데, Wave 1은 #2·#3이 #1에 의존해서 세 issue를 `stats/taxonomy-nrf` 하나와 PR #21 하나로 처리했다(issue #2·#3 본문은 별도 브랜치를 지정). 예외 조건을 규약에 넣을지 정해야 한다.
- 이전 wave PR이 머지되기 전에 다음 wave를 시작할 수 있는가 — 쟁점: Wave 1 진입 조건은 "Wave 0 PR 머지"인데 issue #1 claim 댓글은 PR #20 머지 전에 `wave-0/planning`에서 분기하고 나중에 rebase했다고 적었다. 진입 조건을 "리뷰 통과"로 완화할지, 분기 예외를 기록하는 방식으로 둘지 정해야 한다.
- 결정 기록의 상태를 "승인됨"으로 바꾸는 주체 — 쟁점: `judge-any.md`는 "제안됨"을 내도록 정하지만, 0007~0009는 수집을 지휘한 같은 main thread가 PR 리뷰 없이 "승인됨"으로 썼다. 사용자 승인, PR 머지, 별도 판정자 중 무엇이 상태를 바꾸는지 정해야 한다.
- registry의 포털 항목과 하위 id 규칙 — 쟁점: "포털은 출처 계급의 입구이고 개별 수치는 하위 id로 등록한다"는 규칙이 포털 항목 note에만 있다. 결정 기록이나 `data/sources/` 문서로 올리고 검증기 규칙(`source_id`가 `-portal`이면 실패)으로 강제할지 정해야 한다.
- 정형화·검증 역할(haiku) 미사용 — 쟁점: 이 파일 모델 표에는 haiku 정형화·검증 역할이 있지만 issue #1~#3 claim 댓글에는 fable과 sonnet만 있고, 기계 검증은 `npm run validate`가 맡았다. Wave 2 모델 표에서 이 행을 유지할지 정해야 한다.
