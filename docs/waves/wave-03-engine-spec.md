# Wave 3 — 엔진·선택권·노동시장 스펙

## 목표
Wave 4가 구현할 공식을 전부 글로 정한다. 모든 확률은 Wave 2 레코드 id 또는 결정 기록을 근거로 적는다.

## 진입 조건
Wave 2 종료 조건. 단, 상태 모델 스펙은 Wave 2와 병행 가능.

## 체크리스트
- [x] (초안, 감사 전: `docs/superpowers/specs/2026-10-13-engine-state-design.md`) 상태 모델 스펙: 능력치(0~100) 목록과 의미, 단계(입학 전·박사과정 월·경력 연·기록 종료 80세), 저장 형식 버전. 완료 조건: `docs/superpowers/specs/<date>-engine-state-design.md` 승인. — issue #18
- [x] (초안, 감사 전: `2026-10-13-agency-model-design.md` §2·§3, 근거 표 conf 열 포함) 선택권 모델 공식: 입학 전 선택 6종과 결정 지점 7종 각각에 선택지·효과·확률 근거 레코드 id. 근거 없는 항목은 `assumed` 목록으로 분리. 완료 조건: 모든 확률에 근거 열이 채워짐. — issue #18
- [x] (초안, 감사 전: `2026-10-13-labor-market-news-design.md`) 노동시장·가상 뉴스 모델: 시간강사·교수·연구원 공고 확률 = 기준값(statistics-faculty-market) × 수요 계수; 월별 가상 뉴스가 수요 계수를 n개월 조정; 효과 크기·지속 기간·빈도는 결정 기록. 창작 표시 규칙. — issue #19
- [x] (초안, 감사 전: `docs/oracle/v35-comparison.md`, 29행 모두 사유 있음) v3.5 oracle 비교표: `docs/oracle/v35-recon.md`의 공식(논문 채택·학위 심사·연구 진행·자격시험·경력 전환) vs 우리 공식, 차이 사유. 완료 조건: 표의 모든 행에 사유.
- [x] (결정 기록 0014, 119항목, 상태 제안됨) 결정 기록: 확률 근거 없는 항목(assumed) 전체 목록과 각각의 설계 가정 사유.
- [ ] 스펙 감사: judge 프롬프트로 fable/Astra가 모호한 항목 0건 확인.

### Wave 2 회고에서 이관
출처: [wave-02 §회고](wave-02-statistics-packs.md).

- [x] (2026-10-13 #18·#19 댓글, claim보다 먼저) 이관 전달: 이 목록에서 #18 또는 #19를 지목한 항목은 해당 issue에 댓글로도 남긴다. — 완료 조건: #18·#19 각각에 이 절을 링크하고 해당 항목을 나열한 댓글이 claim 댓글보다 먼저 있다.
- [x] (기준 커밋 146aae8, claim 댓글에 기재) 브랜치 기준점: #18·#19 작업 브랜치는 이 회고 PR이 머지된 main에서 갈라지고, claim 댓글에 기준 커밋 해시를 적는다. — 완료 조건: #18·#19 claim 댓글에 커밋 해시가 있고, 그 커밋의 `docs/waves/wave-03-engine-spec.md`에 "Wave 2 회고에서 이관" 절이 있다.
- [x] (선택권 스펙 §1; 근거 표마다 계열 체계 열) (#18) 계열 대응표: 게임 계열·트랙(NRF 대분류에서 유도, 결정 기록 0007), 한국표준교육분류(KSCED) 10계열(statistics-employment #12), KEDI 7 대계열(statistics-progress #13·faculty-market #14) 사이의 대응표를 스펙에 넣는다. — 완료 조건: 스펙에 세 체계를 잇는 표가 있고, statistics 레코드를 인용하는 스펙 행마다 어느 계열 체계의 값인지 적혀 있다.
- [x] (결정 기록 0013 §1에서 판정; needs-judge-employment.md 7행에 0013 링크 열 추가) (#18) `data/packs/statistics/needs-judge-employment.md`의 7항목을 판정한다. — 완료 조건: 새 결정 기록에 7항목 각각의 판정과 이유가 있고, needs-judge-employment.md 각 행이 그 결정 기록을 링크한다.
- [x] (0014 #87 규칙 (a), #88 규칙 (b), #57 규칙 (c), #58·#59 ewha는 `schools-ewha-social-tuition` 지정) (#18) Wave 2 판정이 Wave 3으로 넘긴 `assumed` 규칙 세 개를 assumed 목록에 넣는다. (a) 교원 급여 = `salaries-faculty-all-fulltime-mean`(2025 전국 평균) × 2017 직급 비율(`salaries-faculty-{national,private}-{professor,associate-professor,assistant-professor}-mean-2017` 6건). (b) 국립대 교원 초임 호봉 = 별표 24 경력연수 가감(`salaries-public-univ-career-adjust-*`), 박사 가산은 규정에 없음. (c) cs 계열을 공시하지 않는 6개교(hanyang·sogang·khu·pusan·uos·ewha)의 cs 등록금 = 공학 값. 이화(ewha)는 등록금 레코드가 인문·사회 두 건뿐이라 공학 값도 없다. — 완료 조건: 스펙 assumed 목록에 세 행이 있고 각 행에 근거 레코드 id와 가정 사유가 있으며, (c) 행이 ewha에 쓸 레코드 id를 따로 지정한다.
- [ ] (선택권 스펙 §10 규칙·22묶음 표 완료; 45건 note를 id로 바꾸는 치환은 데이터 수정이라 미실행, 확인 스크립트 출력도 아직 없음) (#18) `same_unit_as` 규칙: 두 트랙에 걸친 학과 레코드 42건은 `same_unit_as`를 note 자유 문장(예: "same_unit_as 건설및환경공학과(civil 항목)")으로만 적고 있다. 스펙이 같은 학과를 한 번만 세는 규칙과 대표 레코드 선택 기준을 정하고, 42건의 대상을 레코드 id로 바꾼다. — 완료 조건: 스펙에 규칙 절이 있고, 42건의 `same_unit_as` 대상이 전부 존재하는 `departments-*` id이며, 그 확인 스크립트 출력이 PR 본문에 있다.
- [x] (선택권 스펙 §11 키 형식 + 87행 표, 483건 중복 0 확인) (#18) 학과 slug: 결정 기록 0011이 Wave 4로 미룬 의미 있는 slug의 엔진 키 형식을 스펙에서 정한다. — 완료 조건: 스펙에 엔진 키 형식 절이 있고, 번호 접미사 slug(`-2`, `-3` 등)를 쓰는 departments 레코드 87건마다 새 키를 적은 표(87행)가 있다.
- [x] (결정 기록 0013 §8; 0011 §결과의 남은 "106"도 100으로 정정, 레코드 100 = 0011 = README) (#18) 수집자 메모 수 대조: 결정 기록 0011과 departments README의 "106건"을 레코드와 맞춘다. — 완료 조건: 0011과 README의 수가 departments 레코드 중 note에 "수집자 메모"가 있는 레코드 수와 같다.
- [x] (선택권 스펙 §12, 노동 스펙 §6, 상태 스펙 §8; indexed 행은 0014 항목이나 이월 재확인 항목에 연결) (#18·#19) 신뢰도 표시: 스펙의 확률·급여 근거 표에 confidence 열을 둔다. — 완료 조건: 근거 표의 모든 행에 인용 레코드의 confidence가 있고, `indexed`·`assumed` 레코드를 쓰는 행은 assumed 목록이나 이 절의 재확인 항목 중 하나에 연결된다.
- [x] (노동 스펙 §2·§3; 2024 연보 값 `-a`만 인용, `-b` 인용 0행) (#19) 노동시장 기준값: 교수·시간강사·연구원 공고 확률의 기준값을 statistics-faculty-market 레코드(`statistics-faculty-fulltime-stock-*`, `statistics-faculty-new-hires-*`, `statistics-faculty-retirements-all-*`)로 유도한다. 분야별 신규 임용과 공고 건수는 출처가 없으므로 `assumed`로 둔다. 2024 신규채용은 `-a`(연보)를 쓰고, 비전임 수요 추정에서는 명예교수(`statistics-faculty-honorary-all-*`)를 뺀다. — 완료 조건: #19 스펙의 기준값 표의 모든 행에 레코드 id 또는 assumed 사유가 있고, `statistics-faculty-new-hires-all-2024-b`를 인용하는 행이 0개다.
- [ ] registry 중복 정리: `kedi-2026-basic-stats-press`와 `kedi-2026-press-basic-stats`를 한 항목으로 합치고, 없애는 id를 쓰던 레코드(11건 또는 2건)의 `source_id`를 남는 id로 옮긴다. — 완료 조건: registry에 해당 보도자료 항목이 1건이고, 없앤 id를 `data/`에서 검색하면 0건이며, `npm run validate`가 통과한다.
- [ ] Scimago 재확인: 브라우저 세션으로 SJR 사분위 60건을 Scimago 원본과 대조한다. — 완료 조건: venues의 `*-sjr-quartile` 레코드 60건마다 confidence가 `verified`이거나 note에 브라우저 확인 실패 사유가 있고, `scimago-2026-portal` note에 "403"이 없다.
- [ ] CORE·wage 포털과 기업 연구직 임금: `core-2026-portal` note에 #7이 찾은 CSV export 경로를 적고, wage.go.kr·KOSIS를 브라우저 세션으로 다시 시도한다. #19 경력 전환의 기업 연구직 급여는 그 결과를 인용하거나 `assumed`로 둔다. — 완료 조건: `core-2026-portal` note에 "403"이 없고, `wage-2026-portal` note에 "ECONNRESET"이 없으며, salaries에 기업 연구직 임금 레코드가 1건 이상 있거나 #11 미수집 범위를 담은 후속 issue 번호가 이 항목에 적혀 있다.
- [ ] 모집요강 재확인: 부산대 2027학년도 전기 박사 모집요강(11월 공고 예정)과 KAIST 2차 요강으로 departments 레코드를 다시 확인한다. — 완료 조건: `departments-pusan-*`·`departments-kaist-*` 레코드의 `checked_on`이 해당 요강 공고일 이후이고 출처 id가 그 요강을 가리킨다. 또는 이 항목에 "미공고(확인일 YYYY-MM-DD)"가 적혀 있다.
- [ ] 결정 기록 0012 잔여 반영: 7개 팩 README 끝에 `## 판정 로그` 절을 만들고, `docs/workflow.md`의 수집 예시를 `registry.d/`로 고치며, 0012 §맥락의 충돌 수를 12로 고친다. — 완료 조건: `grep -l "^## 판정 로그" data/packs/*/README.md`가 7개 파일을 돌려주고, `docs/workflow.md`·두 수집 프롬프트에서 "registry.json에 추가" 문구가 0건이며, 0012 §맥락에 "13번"이 없다.
- [ ] 스펙 감사 기록: 스펙 감사(judge)는 감사한 근거 행마다 판정과 이유 한 줄을 표로 남긴다. — 완료 조건: 감사 커밋에 표가 있고, 그 행 수가 스펙의 확률·급여 근거 표 행 수와 같다.

## 종료 조건
엔진 스펙 승인 + 결정 기록 + oracle 비교표. Wave 4 issue 발행.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 스펙 초안·엮기 | opus | Sol | high | `../prompts/weaver-retro-any.md`(초안 모드) |
| 스펙 감사·판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 근거 레코드 조회·표 작성 | sonnet | Luna | medium | — |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
