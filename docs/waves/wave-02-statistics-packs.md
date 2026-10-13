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
- [x] (이 회고 PR에서 이행) Wave 2 회고는 이관 항목을 같은 PR에서 wave-03 §체크리스트에 붙여넣는다. — 완료 조건: Wave 2 회고 PR의 변경 파일 목록에 `docs/waves/wave-03-engine-spec.md`가 있고, 그 파일에 "Wave 2 회고에서 이관" 하위 절이 있다.

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

## 회고 (2026-10-13, 회고 PR 리뷰 전)
약어는 [용어집](../workflow.md#용어집)을 따른다. 용어집에 없는 기관·시스템 이름은 첫 등장에 풀어쓴다.

### 실패한 체크리스트 항목
판정 요약. 수집 13건은 모두 PR 머지, CI(validate·test) 통과, 팩 README의 issue 링크, handoff 댓글을 갖춰 체크박스 완료 조건을 채웠다. 수집 범위 기준으로는 완료 9건(#4 schools, #5 departments, #6 venues-journals, #7 venues-conferences, #8 salaries-public, #9 salaries-institutes, #12 statistics-employment, #15 narratives-hs, #16 narratives-stem)과 부분 완료 4건(#10, #11, #13, #14)이다. 부분 완료 4건도 체크박스는 `[x]`다. Wave 1 이관 11건은 완료 7건, 부분 완료 1건(포털 4건 확인), 미이행 2건(Node 20 출력, 행 단위 판정 표), 이 회고 PR에서 이행 1건(wave-03 붙여넣기)이다. 종료 조건은 부분 충족이다. issue 13건이 닫혔고 13개 PR의 CI가 모두 통과했지만, `needs-judge-employment.md`의 7항목이 Wave 3 #18로 넘어가 "needs-judge 0건"을 문자 그대로는 채우지 못했다.

완료 항목의 참고 사항.
- 신뢰도. venues-journals(#6)의 Scimago Journal Rank(SJR) 사분위 60건은 전부 `indexed`다. scimagojr.com이 HTTP 403을 돌려줘서 러시아 과학인용색인(RCSI) 저널 순위 DB가 재게시한 사분위를 읽었다. salaries 팩은 237건 중 `indexed` 46건, `assumed` 6건이다. schools의 현재 값은 PR #27 본문의 "verified 203·indexed 3"이 아니라 커밋 084a076(한양 BK21 장려금 하향) 뒤의 202·4다.
- 범위 변경. departments 항목 문장은 "241개 모집 단위"지만 결과는 483개다(결정 기록 0011).
- 근거 위치. Wave 1 이관 첫 항목(KEDI 코드 대조)의 완료 조건은 "#5 handoff 댓글"인데, 수치("대조한 KEDI 코드 35개, 없는 코드 0개")는 PR #34 본문에만 있다.
- 약어 규칙 줄은 PR #21로 PR 템플릿에 들어갔다. 그러나 Wave 2 PR 13건의 본문 체크리스트에는 이 줄과 Node 줄이 모두 없다. 완료 조건이 템플릿만 검사하므로 완료로 판정했다.
- 결정 기록 0011과 departments README는 수집자 메모가 남은 단위를 106건이라고 적는다. departments 레코드 중 note에 "수집자 메모"가 있는 것은 100건이다.

- salaries-faculty(#10) 부분 완료. 항목은 "대학알리미의 직급별 교원 급여"인데 대학알리미에는 교원 급여 공시 항목이 없다(강사 강의료만 공시). 직급별 급여의 최신 전국표는 2017년이고, 교원 급여 레코드는 전부 언론 보도를 거친 `indexed`다. 전국·국공립·사립 강의료 평균 6건은 수집자가 학교값을 합산한 `assumed`다. — 원인: 출처 부족. issue가 지정한 1차 출처에 해당 항목이 없고, 교육부 원 자료는 검색 예산이 떨어져 찾지 못했다. — 근거: issue #10 handoff, PR #31, salaries README §faculty 하위 집합 규칙.
- salaries-entry(#11) 부분 완료. 기업 연구직 임금은 0건이다. 레코드 11건은 KISTEP 신규 박사 취업자 연봉 6건과 연구장려금 하한 5건이다. — 원인: 출처 부족. 고용노동부 임금직무정보시스템(wage.go.kr)은 접속 시간 초과였고, 국가통계포털(KOSIS)은 표 목록이 JavaScript로만 열렸다. — 근거: issue #11 handoff, PR #30 제목과 "Closes #11 (부분)".
- statistics-progress(#13) 부분 완료. 학위 소요 기간은 2015년(5.2년)과 2013년(61.2개월) 두 값뿐이고 기준 창이 달라 비교할 수 없다. 2026년 박사 분리 수치도 없다. — 원인: 출처 부족. 2016년 이후 공표가 없고, 교육통계서비스(KESS) 2026 주요지표 표는 스크립트 접근이 막혔다. — 근거: issue #13 handoff, PR #29 §주의.
- statistics-faculty-market(#14) 부분 완료. 항목이 지정한 "분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수" 중 분야별 신규 임용, 계열별 강사 수, 공고 건수가 없다. 있는 것은 계열별 교원 스톡과 직위·학교급별 신규채용·퇴직이다. — 원인: 출처 부족. 교육통계연보는 신규 임용을 직위·학교급으로만 나누고, 공고 건수는 연간 집계가 없으며, KESS 지표 endpoint는 스크립트를 막았다. — 근거: issue #14 handoff, PR #28 §미수집.
- 종료 조건 "needs-judge 0건" 부분 충족. #12가 올린 7항목(계열 매핑·연도·취업 정의·고용형태·휴학·박사후 재원·분모)은 데이터 오류가 아니라 게임이 수치를 쓰는 방식에 대한 판정이고, Wave 3 #18로 넘겼다. — 원인: 판정 지연. 수치 사용 방식은 엔진 스펙이 정해야 판정할 수 있어서 Wave 2 안에서 닫을 수 없었다. 이 7항목은 #18의 범위이므로 Wave 3 진입을 막지 않는 것으로 보고, wave-03 이관 절에서 추적한다. — 근거: `data/packs/statistics/needs-judge-employment.md`, PR #23.
- (Wave 1 이관) 포털 4건 확인 부분 완료. `alio-2026-portal`만 갱신되었다(커밋 6e67adb). `scimago-2026-portal`·`core-2026-portal`·`wage-2026-portal`의 note에는 "403"·"ECONNRESET"이 남아 있다. CORE는 #7 수집자가 CSV export 경로로 접속에 성공했는데도 포털 note가 그대로다. — 원인: 판정 지연과 출처 부족. 포털 항목을 만든 PR #21이 08:25에 머지되기 전에 #6·#7·#11 브랜치가 Wave 0 머지 커밋 00fd0fa에서 갈라져 이 브랜치들에는 포털 항목이 없었다. Scimago와 wage.go.kr은 브라우저 세션 없이 열리지 않았다. — 근거: 커밋 1e99379·d79e2e5·7d46a24의 부모 시점 registry에 포털 항목 0건, PR #26 체크리스트("이 브랜치엔 항목 없음"), venues README §conferences 보충.
- (Wave 1 이관) Node 20 실행 출력 미이행. PR #22~#34 본문 어디에도 `node --version` 출력이 없다. — 원인: 판정 지연. 템플릿 줄은 PR #21에서 들어갔는데, 수집 브랜치 13개 중 12개는 그 전 커밋 00fd0fa에서 갈라져 템플릿에 그 줄이 없었다. 줄이 있던 #34(stats/departments)도 본문에서 이 줄을 뺐다. — 근거: PR #22~#34 본문, 12개 브랜치 기준점의 `.github/pull_request_template.md`(해당 줄 0건).
- (Wave 1 이관) `needs-judge` 행 단위 판정 표 미이행. Wave 2에서 새로 커밋된 `needs-judge-*.md`는 `needs-judge-employment.md` 하나이고 7행이다. 10행을 넘은 판정은 #5의 NRF 대안 코드 40건과 수집자 메모 단위 100건(0011은 106건)이다. 결정 기록 0011이 이를 규칙 문단으로 일괄 판정했고 행별 표는 없다. — 원인: 프롬프트 모호. `judge-any.md`의 규칙은 수집자가 `needs-judge`로 표시한 행에만 걸리는데, #5 수집자는 논쟁 행을 "수집자 메모"로 적었다. 이 규칙 문장도 PR #21 브랜치에만 있어서 Wave 2 시작 시점의 main에는 없었다. — 근거: 결정 기록 0011, departments 레코드 note, PR #34 §판정, 커밋 c1dc722.

체크리스트 밖에서 드러난 실패.
- Wave 1 이관 항목이 수집 브랜치 12개에 들어가지 않았다. issue #4·#6~#16의 claim 댓글은 모두 "worktree stats/<topic> from main"이라는 같은 문장을 쓰고 `<topic>` 자리도 채우지 않았다. 실제 기준점은 00fd0fa(PR #20 머지)다. 그래서 Wave 1 회고가 고친 프롬프트 7건, PR 템플릿 두 줄, wave-02의 이관 항목 절, 포털 항목이 이 브랜치들에 없었다. 이행된 이관 항목(#15·#16의 출처 계급 등록 등)은 wave 파일이 아닌 경로로 수집자에게 전달된 것이다. — 원인: 판정 지연과 프롬프트 모호. 결정 기록 0010 §2는 리뷰를 마친 이전 wave PR 브랜치에서 갈라지는 것을 허용만 하고, 이관 항목이 있을 때 그렇게 하라고 요구하지 않는다. claim 규약은 기준 커밋을 적게 하지 않는다. — 근거: issue #4·#6~#16 claim 댓글, 데이터 커밋 12개(29e8fa8 등)의 부모 00fd0fa, #5만 PR #21 브랜치의 6e67adb 기준(PR #34 §스택).
- 수집 PR 13건 중 12건이 머지 직전에 충돌했다. 충돌 파일은 `data/sources/registry.json`, 팩별 `records.json`, 팩 README의 같은 앵커(`**담당 issue.**` 앞)다. main session이 id 합집합·양쪽 유지 스크립트로 풀었다. 결정 기록 0012 §맥락은 "13번 연속"이라고 적지만 해결 커밋은 12개다(#34가 먼저 머지되어 충돌 없음). — 원인: 프롬프트 모호. 두 수집 프롬프트의 출력 계약이 모든 수집자에게 같은 배열 끝과 같은 README 위치에 덧붙이게 했다. — 근거: 머지 커밋 9cda4af·fa3c01c·7c68d0f·16befc0·2bd56f0·3d38e7b·54b420c·1913af4·a3a769c·4740a1f·a65144b·24e6764, 결정 기록 0012.
- 같은 보도자료가 registry에 두 번 등록되었다. `kedi-2026-basic-stats-press`(#13, 레코드 11건, KESS 게시물 URL, 공표일 2026-08-25)와 `kedi-2026-press-basic-stats`(#14, 레코드 2건, KEDI 누리집 URL, 보도일 2026.8.26)는 같은 "2026년 교육기본통계 조사 결과 발표"다. id가 달라서 id 합집합 머지가 둘 다 남겼다. — 원인: 프롬프트 모호. `stat-collector-wave2.md` §과제 1의 "이미 있으면 id만 쓴다"는 병렬 브랜치가 서로의 registry를 볼 수 없을 때 작동하지 않는다. — 근거: `data/sources/registry.json`의 두 항목, 머지 커밋 3d38e7b·54b420c.
- 시계열 id 규칙이 issue마다 달랐다. #13 수집자는 최신 연도에 접미사를 붙이지 않았고, 판정자가 #14 규칙(모든 연도에 `-<year>`)으로 일괄 변경했다. 남은 불일치가 있다. `statistics-phd-duration-mean-months-2013-all`은 연도가 id 중간에 있다. salaries의 교원 급여는 `salaries-faculty-korea-professor-mean`(2021)과 `salaries-faculty-korea-professor-mean-2017`이 섞여 있어 id만으로 연도를 알 수 없다. — 원인: 프롬프트 모호. 팩 README의 id 규칙과 수집 프롬프트 출력 계약에 시계열 규칙이 없었고, #14 판정 규칙은 statistics README에만 들어갔다. — 근거: PR #28·#29 §판정, statistics README §id 규칙 보충, `data/packs/salaries/records.json`.
- narratives-stem(#16)의 quote 11건을 감사에서 전부 지웠다. 수집자가 요약 도구를 거친 문구를 quote로 적어 원문과 대조할 수 없었다. — 원인: 프롬프트 모호. `narrative-collector-wave2.md` §과제 3은 quote의 길이만 제한하고, 직접 열람한 페이지에서 옮긴 문구여야 한다고 정하지 않는다. — 근거: PR #25 §감사, 커밋 8474ba9.
- 보조 agent의 작업 기록이 repo에 없다. 수집자들이 sonnet 보조를 띄웠지만(#4 7명, #7 3명, #5 5명) 보조의 수, 결과 회수 경로, 회수 실패가 handoff에 없다. main session 보고에 따르면 보조 결과가 수집자에게 돌아오지 않아 main session을 거쳐 전달된 경우가 있었다. #5 handoff의 "DGIST 요강 URL 현재 오류 페이지(helper 판독만)"는 보조 한 명의 판독에만 기댄 레코드가 있다는 뜻이다. — 원인: 프롬프트 모호. 두 수집 프롬프트에 보조 결과를 받는 형식과 회수 실패 시 처리가 없다. — 근거: PR #27 §바뀐 것, issue #7 handoff, 결정 기록 0011 §맥락, issue #5 handoff.
- 검색 예산이 떨어져 미수집 범위가 남았다. #6·#7·#10 handoff가 "검색 예산 소진"을 막힌 것으로 적었다. — 원인: 범위 과다. issue 하나가 저널 103건, 학회 23개, 20개교 급여처럼 많은 출처를 다뤄 agent 하나의 검색 횟수로 끝낼 수 없었다. — 근거: issue #6·#7·#10 handoff.
- 자동 접속 차단이 여러 issue에서 반복되었다. Scimago 403(#6), ACM Digital Library 403과 CORE HTML 간헐 403(#7), wage.go.kr 시간 초과(#11), KESS 지표 endpoint 차단(#13·#14), KRIVET PDF의 User-Agent 요구와 CAPTCHA(#12, 우회하지 않음)가 있었다. 대학알리미 동적 페이지는 POST 경로로 풀었지만(#10) 이 경로는 salaries README에만 있다. — 원인: 출처 부족. Wave 2에는 브라우저 세션으로 수집하는 경로가 없었다. — 근거: issue #6·#7·#11·#12·#13·#14 handoff, salaries README §faculty 하위 집합 규칙, PR #23 §접근 메모.
- PR 운영이 규약과 달랐다. `docs/workflow.md` §브랜치·PR 규약은 squash 머지와 같은 PR 안의 STATUS 갱신을 정한다. 실제로는 13건 모두 merge commit으로 머지되었고, 본문은 "STATUS — 머지 후 일괄"이었다. 리뷰와 댓글은 13건 모두 0건이고, 머지는 08:29~08:40 사이 11분 안에 끝났다. 결정 기록 0010 §3이 PR 머지를 결정 기록 승인으로 보므로 0011은 독립 리뷰 없이 "승인됨"이 되었다. — 원인: 프롬프트 모호. squash 머지는 규약에 있었지만 지켜지지 않았다. 규약이 정하지 않은 것은 main을 merge commit으로 받아 충돌을 푼 브랜치를 어떻게 머지할지와, 병렬 PR 여러 건이 같은 STATUS 행을 고칠 때의 순서다. — 근거: "Merge pull request #22~#34" 머지 커밋, PR #22~#34 본문, 13개 PR의 리뷰·댓글 0건.
- 결정 기록 0012의 반영이 끝나지 않았다. 7개 팩 README 중 `## 판정 로그` 절이 있는 것은 0개다. `stat-collector-wave2.md` §과제 1의 registry.d·판정 로그 문장은 이 회고 worktree에 미커밋 상태로만 있다. 같은 파일 §출력 계약 (1), `narrative-collector-wave2.md`, `docs/workflow.md`의 수집 예시는 여전히 `registry.json`을 가리킨다. — 원인: 판정 지연. 0012는 13건 머지가 끝난 뒤 커밋 6c1b147에서 정해졌다. — 근거: `data/packs/*/README.md`의 "판정 로그" 검색 0건, 커밋 6c1b147, 위 세 파일.

### 다음 wave 체크리스트에 추가할 항목
아래 항목은 [wave-03-engine-spec.md](wave-03-engine-spec.md) §체크리스트 "Wave 2 회고에서 이관"에 옮겼다.

- [ ] 이관 전달: 이 목록에서 #18 또는 #19를 지목한 항목은 해당 issue에 댓글로도 남긴다. — 완료 조건: #18·#19 각각에 이 절을 링크하고 해당 항목을 나열한 댓글이 claim 댓글보다 먼저 있다.
- [ ] 브랜치 기준점: #18·#19 작업 브랜치는 이 회고 PR이 머지된 main에서 갈라지고, claim 댓글에 기준 커밋 해시를 적는다. — 완료 조건: #18·#19 claim 댓글에 커밋 해시가 있고, 그 커밋의 `docs/waves/wave-03-engine-spec.md`에 "Wave 2 회고에서 이관" 절이 있다.
- [ ] (#18) 계열 대응표: 게임 계열·트랙(NRF 대분류에서 유도, 결정 기록 0007), 한국표준교육분류(KSCED) 10계열(statistics-employment #12), KEDI 7 대계열(statistics-progress #13·faculty-market #14) 사이의 대응표를 스펙에 넣는다. — 완료 조건: 스펙에 세 체계를 잇는 표가 있고, statistics 레코드를 인용하는 스펙 행마다 어느 계열 체계의 값인지 적혀 있다.
- [ ] (#18) `data/packs/statistics/needs-judge-employment.md`의 7항목을 판정한다. — 완료 조건: 새 결정 기록에 7항목 각각의 판정과 이유가 있고, needs-judge-employment.md 각 행이 그 결정 기록을 링크한다.
- [ ] (#18) Wave 2 판정이 Wave 3으로 넘긴 `assumed` 규칙 세 개를 assumed 목록에 넣는다. (a) 교원 급여 = `salaries-faculty-all-fulltime-mean`(2025 전국 평균) × 2017 직급 비율(`salaries-faculty-{national,private}-{professor,associate-professor,assistant-professor}-mean-2017` 6건). (b) 국립대 교원 초임 호봉 = 별표 24 경력연수 가감(`salaries-public-univ-career-adjust-*`), 박사 가산은 규정에 없음. (c) cs 계열을 공시하지 않는 6개교(hanyang·sogang·khu·pusan·uos·ewha)의 cs 등록금 = 공학 값. 이화(ewha)는 등록금 레코드가 인문·사회 두 건뿐이라 공학 값도 없다. — 완료 조건: 스펙 assumed 목록에 세 행이 있고 각 행에 근거 레코드 id와 가정 사유가 있으며, (c) 행이 ewha에 쓸 레코드 id를 따로 지정한다.
- [ ] (#18) `same_unit_as` 규칙: 두 트랙에 걸친 학과 레코드 42건은 `same_unit_as`를 note 자유 문장(예: "same_unit_as 건설및환경공학과(civil 항목)")으로만 적고 있다. 스펙이 같은 학과를 한 번만 세는 규칙과 대표 레코드 선택 기준을 정하고, 42건의 대상을 레코드 id로 바꾼다. — 완료 조건: 스펙에 규칙 절이 있고, 42건의 `same_unit_as` 대상이 전부 존재하는 `departments-*` id이며, 그 확인 스크립트 출력이 PR 본문에 있다.
- [ ] (#18) 학과 slug: 결정 기록 0011이 Wave 4로 미룬 의미 있는 slug의 엔진 키 형식을 스펙에서 정한다. — 완료 조건: 스펙에 엔진 키 형식 절이 있고, 번호 접미사 slug(`-2`, `-3` 등)를 쓰는 departments 레코드 87건마다 새 키를 적은 표(87행)가 있다.
- [ ] (#18) 수집자 메모 수 대조: 결정 기록 0011과 departments README의 "106건"을 레코드와 맞춘다. — 완료 조건: 0011과 README의 수가 departments 레코드 중 note에 "수집자 메모"가 있는 레코드 수와 같다.
- [ ] (#18·#19) 신뢰도 표시: 스펙의 확률·급여 근거 표에 confidence 열을 둔다. — 완료 조건: 근거 표의 모든 행에 인용 레코드의 confidence가 있고, `indexed`·`assumed` 레코드를 쓰는 행은 assumed 목록이나 이 절의 재확인 항목 중 하나에 연결된다.
- [ ] (#19) 노동시장 기준값: 교수·시간강사·연구원 공고 확률의 기준값을 statistics-faculty-market 레코드(`statistics-faculty-fulltime-stock-*`, `statistics-faculty-new-hires-*`, `statistics-faculty-retirements-all-*`)로 유도한다. 분야별 신규 임용과 공고 건수는 출처가 없으므로 `assumed`로 둔다. 2024 신규채용은 `-a`(연보)를 쓰고, 비전임 수요 추정에서는 명예교수(`statistics-faculty-honorary-all-*`)를 뺀다. — 완료 조건: #19 스펙의 기준값 표의 모든 행에 레코드 id 또는 assumed 사유가 있고, `statistics-faculty-new-hires-all-2024-b`를 인용하는 행이 0개다.
- [ ] registry 중복 정리: `kedi-2026-basic-stats-press`와 `kedi-2026-press-basic-stats`를 한 항목으로 합치고, 없애는 id를 쓰던 레코드(11건 또는 2건)의 `source_id`를 남는 id로 옮긴다. — 완료 조건: registry에 해당 보도자료 항목이 1건이고, 없앤 id를 `data/`에서 검색하면 0건이며, `npm run validate`가 통과한다.
- [ ] Scimago 재확인: 브라우저 세션으로 SJR 사분위 60건을 Scimago 원본과 대조한다. — 완료 조건: venues의 `*-sjr-quartile` 레코드 60건마다 confidence가 `verified`이거나 note에 브라우저 확인 실패 사유가 있고, `scimago-2026-portal` note에 "403"이 없다.
- [ ] CORE·wage 포털과 기업 연구직 임금: `core-2026-portal` note에 #7이 찾은 CSV export 경로를 적고, wage.go.kr·KOSIS를 브라우저 세션으로 다시 시도한다. #19 경력 전환의 기업 연구직 급여는 그 결과를 인용하거나 `assumed`로 둔다. — 완료 조건: `core-2026-portal` note에 "403"이 없고, `wage-2026-portal` note에 "ECONNRESET"이 없으며, salaries에 기업 연구직 임금 레코드가 1건 이상 있거나 #11 미수집 범위를 담은 후속 issue 번호가 이 항목에 적혀 있다.
- [ ] 모집요강 재확인: 부산대 2027학년도 전기 박사 모집요강(11월 공고 예정)과 KAIST 2차 요강으로 departments 레코드를 다시 확인한다. — 완료 조건: `departments-pusan-*`·`departments-kaist-*` 레코드의 `checked_on`이 해당 요강 공고일 이후이고 출처 id가 그 요강을 가리킨다. 또는 이 항목에 "미공고(확인일 YYYY-MM-DD)"가 적혀 있다.
- [ ] 결정 기록 0012 잔여 반영: 7개 팩 README 끝에 `## 판정 로그` 절을 만들고, `docs/workflow.md`의 수집 예시를 `registry.d/`로 고치며, 0012 §맥락의 충돌 수를 12로 고친다. — 완료 조건: `grep -l "^## 판정 로그" data/packs/*/README.md`가 7개 파일을 돌려주고, `docs/workflow.md`·두 수집 프롬프트에서 "registry.json에 추가" 문구가 0건이며, 0012 §맥락에 "13번"이 없다.
- [ ] 스펙 감사 기록: 스펙 감사(judge)는 감사한 근거 행마다 판정과 이유 한 줄을 표로 남긴다. — 완료 조건: 감사 커밋에 표가 있고, 그 행 수가 스펙의 확률·급여 근거 표 행 수와 같다.

### 프롬프트 수정 diff
- `docs/prompts/stat-collector-wave2.md` §과제 1: before "…수치를 읽은 문서마다 `<publisher>-<year>-<topic>` 항목을 새로 만든다. 포털 note에 접속 실패가 적혀 있으면…" → after "…수치를 읽은 문서마다 `<publisher>-<year>-<topic>` 항목을 새로 만든다. 새 출처는 `data/sources/registry.json`이 아니라 `data/sources/registry.d/<issue>-<topic>.json`에 issue 단위 파일로 쓴다(결정 기록 0012). 팩 README에 문단을 더할 때는 파일 끝 `## 판정 로그` 절에 날짜순으로 덧붙이고 기존 앵커 앞에 끼워 넣지 않는다. 포털 note에 접속 실패가 적혀 있으면…" — 이유: 결정 기록 0012. 이 문장은 회고 worktree에 미커밋으로 적용되어 있으므로 회고 PR에 함께 커밋한다.
- `docs/prompts/stat-collector-wave2.md` §출력 계약 (1): before "// (1) data/sources/registry.json에 추가할 출처" → after "// (1) data/sources/registry.d/<issue>-<topic>.json에 쓸 출처. 쓰기 전에 registry.json과 registry.d/*.json에서 같은 문서(제목·발행처·공표일)가 다른 id로 있는지 찾고, 있으면 그 id를 쓴다" — 이유: §과제 1과 출력 계약이 서로 다른 파일을 가리키고, KEDI 2026 보도자료가 두 id로 등록되었다.
- `docs/prompts/stat-collector-wave2.md` §출력 계약 (2): before "`\"id\": \"<pack>-<topic>-<key>\"`" → after "`\"id\": \"<pack>-<topic>-<key>[-<year>][-a|-b]\"`. 같은 key에 연도가 둘 이상이면 모든 연도에 `-<year>`를 id 끝에 붙이고, 단년 레코드는 붙이지 않는다. 출처가 둘이면 `-a`(1차: 연보·공시)와 `-b`(2차: 기사·보고서 요약)를 연도 뒤에 붙인다" — 이유: #12·#13·#14가 서로 다른 id 규칙을 쓰다가 판정자가 맞췄고, 그 규칙은 statistics README에만 있다.
- `docs/prompts/stat-collector-wave2.md` §과제 5와 §handoff 형식: before "5. 수집하지 못한 범위를 명시한다." → after "5. 수집하지 못한 범위를 명시한다. 6. 보조 agent를 띄우면 각 보조에게 결과를 worktree 안 `data/packs/<pack>/_inbox/<보조 이름>.json` 파일로 쓰게 하고, 메시지 회신에만 기대지 않는다. 정해진 시간 안에 파일이 없는 보조의 범위는 미수집으로 적는다. `_inbox/`는 records.json에 합친 뒤 지우고 커밋하지 않는다."; before "- 막힌 것: <접근 불가 출처 등>" → after "- 막힌 것: <접근 불가 출처 등> · 보조 agent <N>명 중 결과 회수 <M>명, 미회수 범위 <…>" — 이유: 보조 결과가 수집자에게 돌아오지 않아 main session을 거쳐 전달된 경우가 있었고, 그 사실이 repo에 남지 않았다.
- `docs/prompts/narrative-collector-wave2.md` §과제 (수집 모드) 1: before "1. 출처마다 registry 항목을 만든다." → after "1. 출처마다 registry 항목을 `data/sources/registry.d/<issue>-<topic>.json`에 만든다(결정 기록 0012). 팩 README에 문단을 더할 때는 파일 끝 `## 판정 로그` 절에 날짜순으로 덧붙인다." — 이유: 이 프롬프트에는 0012가 반영되지 않았고, #15·#16도 registry.json 충돌을 겪었다(머지 커밋 4740a1f·a65144b).
- `docs/prompts/narrative-collector-wave2.md` §출력 계약 (1): before "// (1) data/sources/registry.json에 추가" → after "// (1) data/sources/registry.d/<issue>-<topic>.json에 추가" — 이유: §과제 1과 같은 파일을 가리키게 한다.
- `docs/prompts/narrative-collector-wave2.md` §과제 (수집 모드) 3: before "`quote`는 15단어 이하 1개 이하, 없으면 빈 문자열." → after "`quote`는 직접 열람한 원문 페이지(`page_or_url`)에서 그대로 옮긴 15단어 이하 1개 이하이고, 없으면 빈 문자열이다. 검색 결과 스니펫이나 요약 도구 출력에서 가져온 문구는 quote로 쓰지 않는다." — 이유: #16의 quote 11건이 요약 도구를 거친 문구라 감사에서 전부 지웠다(PR #25).
- `docs/prompts/narrative-collector-wave2.md` §handoff 형식: before "- 막힌 것:" → after "- 막힌 것: <접근 불가 출처 등> · 보조 agent <N>명 중 결과 회수 <M>명, 미회수 범위 <…>" — 이유: stat-collector와 같은 보조 agent 회수 기록을 남기게 한다. §과제 (수집 모드)에도 stat-collector §과제 6과 같은 `_inbox/` 문장을 6번으로 더한다.
- `docs/prompts/judge-any.md` §과제 4: before "`needs-judge` 행이 10행을 넘으면 행마다 판정(유지·변경·삭제)과 이유 한 줄을 표로 쓰고, 그 표를 `data/packs/<pack>/needs-judge-*.md`에 그대로 남긴다." → after "판정 대상이 10행을 넘으면(수집자가 `needs-judge`로 표시한 행뿐 아니라 '수집자 메모'나 대안 코드처럼 수집자 판단이 들어간 행 포함) 행마다 판정(유지·변경·삭제)과 이유 한 줄을 표로 쓴다. 표는 결정 기록이 아니라 `data/packs/<pack>/needs-judge-<topic>.md`에 커밋하고, PR 본문에 '판정 표 N행 = 대상 N행'을 적는다." — 이유: #5의 NRF 대안 40건과 수집자 메모 100건이 `needs-judge` 표시 없이 결정 기록 0011에서 일괄 판정되었다.
- `docs/prompts/weaver-retro-any.md` §출력 계약: before "(a)는 회고와 같은 커밋에 넣는다." → after "(a)는 회고와 같은 커밋에 넣는다. (c) 이관 항목 중 특정 issue를 지목하는 것은 그 issue에 댓글로도 남긴다." — 이유: Wave 2 수집 브랜치 12개가 이관 항목이 들어가기 전의 main에서 갈라져, wave 파일에만 적힌 이관 항목을 보지 못했다.

### 결정 기록으로 올릴 것
- 다음 wave의 브랜치 기준점과 이관 전달 — 쟁점: 0010 §2는 이전 wave PR 브랜치에서 갈라지는 것을 허용만 해서, Wave 2는 13개 중 12개가 이관 항목이 없는 00fd0fa에서 갈라졌다. 이전 wave PR 머지 전에는 claim을 막을지, PR 브랜치 기준을 의무로 할지, issue 댓글 전달로 충분하다고 볼지 정해야 한다.
- 병렬 PR의 머지 방식과 STATUS 갱신 시점 — 쟁점: 규약은 squash 머지와 같은 PR 안의 STATUS 갱신을 정하지만, Wave 2는 merge commit으로 머지하고 STATUS는 머지 뒤 한 번에 고쳤다. 병렬 PR에서 무엇을 규칙으로 삼을지, 그리고 id 합집합 충돌 해결 스크립트를 repo 도구로 둘지 정해야 한다.
- 리뷰 없는 머지와 결정 기록 승인 — 쟁점: 0010 §3은 PR 머지를 승인으로 보는데, Wave 2 PR 13건은 리뷰 0건으로 11분 안에 머지되었고, 판정자와 머지한 쪽이 같은 main session일 수 있다. 결정 기록이 든 PR에는 별도 리뷰나 사용자 승인 댓글을 요구할지 정해야 한다. 0012의 상태 근거 "사용자 지적"이 0010 §3의 (a) 사용자 승인에 해당하는지도 같은 기록에서 확인한다.
- 보조 agent 사용 규칙 — 쟁점: 수집자가 sonnet 보조를 최대 7명까지 띄웠지만 보조의 수, 모델, 결과 회수, 보조 한 명의 판독에만 기댄 레코드의 confidence(예: #5의 DGIST 요강)에 대한 규칙이 없다.
- 2차 경유·파생 수치의 엔진 사용 방식 — 쟁점: 미러 경유 SJR(`indexed`), 언론 보도 교원 급여(`indexed`), 수집자 합산 평균(`assumed`)을 엔진이 `verified`와 같게 쓸지, 표시나 가중을 달리할지 Wave 3 스펙 전에 정해야 한다.
- 시계열 id 규칙을 팩 공통 규칙으로 올릴지 — 쟁점: #14 판정 규칙(모든 연도에 `-<year>`)은 statistics README에만 있고, salaries 교원 급여 id는 연도가 섞여 있다. 공통 규칙으로 올리고 검증기 경고로 강제할지 정해야 한다.
- 브라우저 세션 수집 경로 — 쟁점: Scimago, ACM Digital Library, wage.go.kr, KESS 지표가 자동 접속을 막았다. 브라우저 세션 수집을 허용할지, 누가 하는지, CAPTCHA 우회 금지를 어떻게 적을지 정해야 한다.
- Node 20 실행 출력 요구 유지 여부 — 쟁점: 이 요구는 Wave 1과 Wave 2에서 연속으로 이행되지 않았고, CI가 Node 20으로 test·validate를 이미 돌린다. 요구를 지울지, CI 실행 링크로 대체할지 정해야 한다.
