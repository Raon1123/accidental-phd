# Wave 4 — 엔진 구현

## 목표
Wave 3 스펙을 순수 함수로 구현한다. UI 의존 없음, 결정론적 seed, 테스트 우선.

## 진입 조건
Wave 3 종료 조건.

## 체크리스트
- [ ] TypeScript·Vitest 도입(결정 기록 0001). 완료 조건: `npm test`가 node:test와 vitest를 모두 실행, CI 통과.
- [ ] `createLife(config, seed)`: 입학 전 선택 6종(각각 "운에 맡기기" 허용)과 seed로 초기 상태 생성. 완료 조건: 같은 입력 → 같은 상태 테스트.
- [ ] `advanceMonth(state)`: 박사과정 월 단위 진행. 완료 조건: 스펙 공식별 단위 테스트, 경계값(능력치 0·100, 현금 음수).
- [ ] `advanceYear(state)`: 경력 단계 연 단위 진행과 노동시장 수요 계수·가상 뉴스 적용. 완료 조건: 뉴스 효과가 n개월 후 소멸하는 테스트.
- [ ] `decide(state, optionIndex)`: 결정 지점 처리. 완료 조건: 7종 결정 지점 각각 선택지별 테스트.
- [ ] `branch(state, decisionId)`: "다른 선택 보기"용 분기(같은 seed, 결정 지점부터 재생). 완료 조건: 분기 전 상태 동일성 테스트.
- [ ] v3.5 oracle 스냅샷 테스트: `docs/oracle/v35-recon.md` 공식에 같은 입력을 넣은 기대값과 우리 공식의 차이가 Wave 3 비교표의 사유 범위 안. 
- [ ] 커버리지: 공식 함수 100%, 전체 90% 이상.

### Wave 3 회고에서 이관
출처: [wave-03 §회고](wave-03-engine-spec.md).

앞의 세 항목은 PR #36 머지 전에 고치기를 권한다. 고쳤으면 커밋 해시를 적고 체크한다. Wave 4 issue를 발행할 때 각 issue 본문에 이 절을 링크하고 그 issue가 맡는 항목을 나열한다(회고 프롬프트 출력 계약 (c)).

- [x] (PR #36 커밋 349c317에서 복원; Wave 4 재검증 2026-10-13: `node scripts/compare-notes.mjs d00ba5c` → 손실 문장 0, 수집자 메모 100건) 수집자 메모 복원: `same_unit_as` 치환(커밋 72ad355·f6e713f)이 departments note에서 지운 수집자 메모 10건을 d00ba5c의 note에서 되살린다. 대상은 `departments-{unist-civil,unist-energy,yonsei-systems_biology,yonsei-civil,yonsei-environmental,ewha-materials,konkuk-environmental,uos-computer-2,pusan-environmental,jnu-energy-2}`이다. 같은 치환이 지운 나머지 3건(kaist-environmental, gist-electrical, dgist-computer)은 `same_unit_as` 뜻을 되풀이한 문장이라 복원하지 않아도 된다. PR #36에서 고쳤으면 그 커밋 해시를 적고 체크한다. — 완료 조건: departments 레코드 중 note에 "수집자 메모"가 있는 것이 100건으로 결정 기록 0011·departments README의 수와 같고, d00ba5c 대비 문장 단위 비교에서 `same_unit_as` 문장과 위 3건 밖에서 사라진 문장이 0건이며, 그 비교 출력이 PR 본문에 있다.
- [x] (PR #36 커밋 349c317에서 대부분 반영; 선택권 §9.1 규칙 (a) 절의 폐기 공식·옛 값과 §12·비교표 근거 열은 Wave 4 PR에서 정리) 감사 변경 전파: 스펙 감사가 바꾼 0014 #87(사립 교원 연봉)과 #104(교수 채용 확률 상한 0.10)를 아직 옛 값을 쓰는 위치에 반영한다. PR #36에서 고쳤으면 그 커밋 해시를 적고 체크한다. — 완료 조건: 선택권 스펙 §9.1 "규칙 (a)" 절과 `docs/oracle/v35-comparison.md` "월급: 교수" 행에서 13,137.1·10,183.9·6,708.4가 0건이다. 노동 스펙 §3.3 표와 비교표 "교수 전환" 행의 인문 교수 연 채용 확률이 0.10(월 공고 π0 0.0874)이다. 선택권 §12에 "계산에 쓰지 않음"이 0건이고, 비교표 머리말에 "감사 전"이 없다.
- [x] (PR #36 커밋 349c317에서 값 수정; 레코드 재계산 테스트는 Wave 4 `engine/test/tuition.test.ts`) ewha 등록금 재계산: 0014 #58·#59는 "서울 사립 8곳 중앙값"이라고 적지만 값 7,342,000원·6,298,000원은 둘 다 yonsei 레코드 값이다. 8곳 레코드의 중앙값(4·5번째 평균)은 공학 7,341,000원, math 6,367,500원이다. PR #36에서 고쳤으면 그 커밋 해시를 적고 체크한다. — 완료 조건: 0014 #58·#59와 선택권 §5.1 표의 값이 8곳 레코드에서 계산한 중앙값과 같다. 다른 값을 쓰면 0014 행에 그 이유가 있고 "중앙값"이라는 말이 없다. 선택권 §5.1에 "0013 §3 규칙을 그대로 따른 결과다"가 0건이다. 엔진 테스트가 이 값을 레코드에서 다시 계산해 엔진 상수와 비교한다.
- [ ] 절 단위 표 파서: 스펙 markdown의 표를 엔진 데이터로 옮기는 스크립트는 절 제목으로 읽을 범위를 정한다. Wave 3의 첫 `same_unit_as` 치환은 선택권 §10 묶음 표 22행과 §11 slug 표 87행을 함께 읽어 109묶음·132건을 고쳤다. — 완료 조건: `scripts/`의 표 파서가 절 제목을 인자로 받고, 테스트가 선택권 §10에서 22행, §11에서 87행을 읽으며, 없는 절 제목을 주면 오류로 끝난다. 이 파서로 데이터를 고치는 스크립트는 쓰기 전에 기대 건수가 다르면 멈추고, 바꾼 레코드마다 바꾸려던 마커 밖에서 사라진 문장 수를 출력한다. 그 수가 0이라는 출력이 PR 본문에 있다.
- [ ] `same_unit_as` 한 번 세기 테스트: — 완료 조건: 엔진 테스트가 departments note의 `same_unit_as:` 마커로 묶음을 만들고 묶음 22개, 구성원 45건, 학과 단위 460개(학과 레코드 483건 기준, 학과별 등록금 레코드 7건 제외)를 확인한다. 각 묶음의 대표 레코드가 선택권 §10 표와 같다(17번 uos, 22번 jnu 예외 포함).
- [ ] 학과 엔진 키: — 완료 조건: 엔진이 레코드 id를 선택권 §11 형식(`<school_id>/<unit_slug>`, 묶음 구성원은 `<대표의 단위 키>@<track>`)으로 바꾸는 함수를 내보낸다. 테스트가 레코드 키 483개 중복 0, 단위 키 460개, `unit_slug`가 `^[a-z0-9_-]{1,32}$`에 맞음, 번호 접미 레코드 87건이 §11 표의 키를 받음을 확인한다.
- [ ] assumed 상수 주석: 0014는 "번호는 Wave 4 코드 상수 주석에서 `0014#n`으로 인용한다"고 정했다. — 완료 조건: 엔진 소스의 assumed 상수마다 `0014#n` 주석이 있다. 검사 스크립트가 1~119 중 엔진 소스에 없는 번호와 범위 밖 번호를 출력하고, 범위 밖 번호는 0건이다. 엔진에 없는 번호마다 "UI 전용" 또는 "엔진 밖" 사유가 `engine/README.md`에 있다.
- [ ] 보정 하네스: 119개 assumed 항목이 관측 통계와 맞는지는 모의실험 전에는 알 수 없다. — 완료 조건: seed N개(기본 1000) 모의실험 명령이 선택권 §4.6 보정 목표 4종(계열별)과 노동 §4.3 보정 목표 3종에 대해 모의값·기준값·허용 범위·통과 여부를 표로 출력하고, 그 표를 `docs/oracle/calibration-wave4.md`에 커밋한다. 허용 범위 밖으로 남은 목표는 같은 문서에 원인 후보와 바꾼 0014 번호·새 값을 적는다.
- [ ] v3.5 oracle 스냅샷 테스트의 완료 조건 보강(위 "v3.5 oracle 스냅샷 테스트" 항목에 완료 조건이 없다). — 완료 조건: `docs/oracle/v35-comparison.md` 29행마다 테스트 케이스가 하나 있다. 케이스는 같은 입력에서 v3.5 식과 우리 식의 값을 내고 차이가 그 행의 사유와 맞는지 단언한다. 같은 입력을 넣을 수 없는 행은 `skip`과 사유를 적고, 케이스 수 + skip 수 = 29다. 기대값은 감사 변경이 반영된 비교표(이 절 2번 항목)에서 가져온다.
- [ ] 레코드 id 존재 검사: 결정 기록 0013 §1은 없는 id `statistics-regular-share-<field>`를 인용했고 스펙 초안 역할이 고쳤다(d00ba5c). — 완료 조건: `npm run validate`(또는 테스트)가 `docs/design/decisions/*.md`와 `docs/superpowers/specs/*.md`의 백틱 안 레코드 id와 id 패턴(`{…}`, `<…>`, `*` 포함)마다 레코드를 1건 이상 찾고, 못 찾으면 실패한다. HEAD에서 실패 0건이고, `statistics-regular-share-<field>`를 넣은 테스트 입력은 실패한다.
- [ ] indexed 근거 노출: 스펙이 인용하는 `indexed` 레코드는 재확인 대상이므로 엔진이 confidence를 숨기지 않는다. — 완료 조건: 엔진 데이터 적재기가 레코드에서 온 값마다 confidence를 함께 돌려준다. 테스트가 선택권 §12 표의 레코드(SJR 사분위 60건, 교원 급여 7건, POSTECH 등록금·입학금, ewha 입학금, 한양 BK21 장려금, ICML 채택률, ISSCC CORE 등급, departments 3건)가 `indexed`로 나오는지 확인한다. 아래 Scimago 재확인으로 `verified`가 된 레코드는 기대값을 바꾼다.
- [x] (2026-10-13 커밋 95de056: `data/sources/registry.d/47-retirement-rules.json` 3건, 0014 #99 "바꾸는 곳"에 id 기입; `git diff main...HEAD -- data/sources/registry.json` 비어 있음은 PR 본문에서 확인) 출처는 registry.d로: Wave 4가 더하는 출처(예: 감사 #99가 권한 정년 규정)는 결정 기록 0012대로 issue 단위 파일에 쓴다. — 완료 조건: Wave 4 PR마다 `git diff main...HEAD -- data/sources/registry.json`이 비어 있고 새 출처는 `data/sources/registry.d/<issue>-<topic>.json`에 있다. 교육공무원·국가공무원·출연연 정년 규정 출처가 registry.d에 있고, 0014 #99 "출처가 생기면 바꾸는 곳" 칸에 그 id가 적혀 있다.
- [ ] (Wave 2 회고에서, Wave 3 미완) Scimago 재확인: 브라우저 세션으로 SJR 사분위 60건을 Scimago 원본과 대조한다. — 완료 조건: venues의 `*-sjr-quartile` 레코드 60건마다 confidence가 `verified`이거나 note에 브라우저 확인 실패 사유가 있고, `scimago-2026-portal` note에 "403"이 없다.
- [ ] (Wave 2 회고에서, Wave 3 미완) CORE·wage 포털과 기업 연구직 임금: `core-2026-portal` note에 #7이 찾은 CSV export 경로를 적고, wage.go.kr·KOSIS를 브라우저 세션으로 다시 시도한다. #19 경력 전환의 기업 연구직 급여는 그 결과를 인용하거나 `assumed`로 둔다(Wave 3은 `assumed` 0014 #84로 두었다). — 완료 조건: `core-2026-portal` note에 "403"이 없고, `wage-2026-portal` note에 "ECONNRESET"이 없으며, salaries에 기업 연구직 임금 레코드가 1건 이상 있거나 #11 미수집 범위를 담은 후속 issue 번호가 이 항목에 적혀 있다.
- [ ] (Wave 2 회고에서, Wave 3 미완) 모집요강 재확인: 부산대 2027학년도 전기 박사 모집요강(11월 공고 예정)과 KAIST 2차 요강으로 departments 레코드를 다시 확인한다. — 완료 조건: `departments-pusan-*`·`departments-kaist-*` 레코드의 `checked_on`이 해당 요강 공고일 이후이고 출처 id가 그 요강을 가리킨다. 또는 이 항목에 "미공고(확인일 YYYY-MM-DD)"가 적혀 있다.
- [x] (2026-10-13 커밋 95de056: 7개 팩 README에 `## 판정 로그`; 둘째·셋째 조건은 f6e713f에서 충족) (Wave 2 회고에서, Wave 3 부분 완료) 결정 기록 0012 잔여 반영: 7개 팩 README 끝에 `## 판정 로그` 절을 만들고, `docs/workflow.md`의 수집 예시를 `registry.d/`로 고치며, 0012 §맥락의 충돌 수를 12로 고친다. f6e713f 기준으로 둘째·셋째 조건은 이미 충족했고 첫째(0/7)가 남았다. — 완료 조건: `grep -l "^## 판정 로그" data/packs/*/README.md`가 7개 파일을 돌려주고, `docs/workflow.md`·두 수집 프롬프트에서 "registry.json에 추가" 문구가 0건이며, 0012 §맥락에 "13번"이 없다.

## 종료 조건
테스트 전부 통과, CI 녹색, 엔진 API 문서(`engine/README.md`).

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 구현(TDD) | sonnet | Luna | medium | — |
| 코드 리뷰·엮기 | opus | Sol | high | — |
| 스펙 불일치 판정 | fable | Astra | high | `../prompts/judge-any.md` |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
