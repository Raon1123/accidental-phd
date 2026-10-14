# 엔진 상태 모델 스펙 (Wave 3, issue #18 항목 1)

- 상태: 감사 반영 · 2026-10-13 (초안 opus, 감사 fable). PR #36 머지로 승인(결정 기록 0010 §3 (b)).
- 범위: 능력치, 단계, 상태 객체 필드, 공통 확률 함수, 저장 형식, seed와 결정론, 틱 처리 순서. 선택지·결정 지점 공식은 [선택권 모델 스펙](2026-10-13-agency-model-design.md), 노동시장·가상 뉴스는 [노동시장·뉴스 스펙](2026-10-13-labor-market-news-design.md)에 있다.
- 근거 규칙: 모든 수치 기본값은 레코드 id(값은 [근거 색인](2026-10-13-wave3-evidence-index.md)에서 옮김) 또는 "assumed (결정 기록 0014 #n)"을 근거로 적는다. [결정 기록 0014](../../design/decisions/0014-assumed-probabilities.md)는 설계 가정 전체 목록이다. 판정 규칙은 [결정 기록 0013](../../design/decisions/0013-wave3-pre-spec-judgments.md)을 따른다.
- 약어: KEDI(한국교육개발원), KRIVET(한국직업능력연구원), KISTEP(한국과학기술기획평가원), NRF(한국연구재단), KSCED(한국표준교육분류). 정의는 [용어집](../../workflow.md#용어집). conf 열의 `v`·`i`·`a`는 레코드 confidence(verified·indexed·assumed)다.

## 1. 능력치

### 1.1 세 체계 비교

| 1in8b.life 축 (0–100) | 어쩌다 박사 v3.5 축 (0–100) | 이 게임 축 | 대응 |
|---|---|---|---|
| Health | energy | 체력 | 1:1 |
| Happiness | morale | 마음 | 1:1 |
| Knowledge | skill | 역량 | 1:1 |
| Relationships | relationship | 관계 | 1in8b의 Relationships를 둘로 나눈 쪽 1 |
| (없음) | network | 네트워크 | 1in8b의 Relationships를 둘로 나눈 쪽 2 |

1in8b.life 축 이름은 2026-10-13에 공개 페이지(https://1in8b.life/)에서 읽었다. v3.5 축은 [v3.5 정찰 기록](../../oracle/v35-recon.md) §State model에 있다.

### 1.2 다섯 축을 고른 이유

- 이 게임은 1in8b.life의 원리 "숫자는 확률을 올릴 뿐 결과를 결정하지 않는다"를 상속하되, 축 수는 v3.5의 다섯을 쓴다.
- 1in8b.life의 Relationships를 관계와 네트워크로 나눈 이유는 연구자 경력에서 두 관계가 다른 확률을 움직이기 때문이다. 관계(지도교수·연구실·가족)는 학위 심사, 자금 연장, 휴학·이탈 위험을 움직인다. 네트워크(학회·외부 연구자)는 공고 발견과 채용 성공을 움직인다. 하나로 합치면 "네트워크 집중"과 "연구 집중" 사이의 맞바꿈이 사라진다.
- 축을 더 늘리지 않는다. 돈·부채·논문·학위논문 진척은 능력치가 아니라 자원·진척 필드로 둔다(§3).

### 1.3 축 정의

| 축 | 키 | 범위 | 뜻 | 주로 움직이는 확률 |
|---|---|---|---|---|
| 체력 | `health` | 0–100 정수 | 몸의 여력. 연구 시간 효율과 번아웃 위험 | 진척 효율, 휴학 위험, 번아웃 |
| 마음 | `mind` | 0–100 정수 | 동기와 정서 상태 | 휴학·이탈 위험, 결정 지점의 기본 선택 성향(동기 자동 진행) |
| 역량 | `skill` | 0–100 정수 | 연구 능력과 지식 | 진척, 논문 질, 자격시험, 학위 심사, 채용 |
| 관계 | `relation` | 0–100 정수 | 지도교수·연구실·가족과의 관계 | 학위 심사, 자금 연장, 이탈 위험 |
| 네트워크 | `network` | 0–100 정수 | 학계 밖·연구실 밖 연결 | 공고 도달, 채용 성공, 경로 전환 |

### 1.4 초기화

```
각 축 x0 = clamp(round(50 + N(0, 8)), 30, 70)
```

평균 50, 표준편차 8, 범위 30–70은 assumed (결정 기록 0014 #1). 입학 전 선택이 초기값을 조정하는 규칙(예: 자비 경로 마음 −5)은 선택권 스펙 §2에 있다.

### 1.5 월별 자연 변화

```
health ← health − 0.5                         (매월, 포커스 효과와 별개)
mind   ← mind + 0.02 × (50 − mind)            (매월 50 쪽으로 2% 회귀)
skill, relation, network: 자연 변화 없음
모든 축은 매 갱신 후 0–100으로 자른다.
```

두 값은 assumed (결정 기록 0014 #2).

## 2. 단계

| 단계 | 키 | 시간 단위 | 시작 | 끝 |
|---|---|---|---|---|
| 입학 전 | `pre` | 없음(선택 6종) | 새 게임 | 6종 선택 완료 |
| 박사과정 | `phd` | 월 | 2027년 3월(전기 입학) | 학위 취득, 이탈, 재학연한 초과, 재정 파탄 |
| 경력 | `career` | 연(내부는 월 단위 하위 단계 12회) | 박사과정 종료 다음 달 | 은퇴 |
| 은퇴 | `retired` | 연 | 은퇴 나이 | 80세 |
| 기록 종료 | `end` | 없음 | 80세 생일 달 | — |

- 입학 시점 2027년 3월은 departments 레코드의 모집 학년도(`departments-{school}-{slug}`, year 2027, conf v)를 따른다.
- 입학 나이 분포는 assumed (결정 기록 0014 #3). KRIVET 입학 연령 평균 `statistics-phd-entry-age-mean-years`(35.6세, conf v)는 직장병행 응답자를 포함하므로 학업전념 플레이어의 나이 분포에 쓰지 않는다. 이 게임은 학업전념 박사과정생만 모델링한다(취업률도 학업전념 레코드를 쓴다).
- 재학연한 96개월과 연장 1회 12개월은 assumed (결정 기록 0014 #4). 연장은 신청 없이 자동으로 적용되어 `enrolledMonths`가 108을 넘는 달에 `end.reason = residence`로 끝난다. 휴학 개월은 재학연한에 넣지 않고, 휴학 누적 상한은 36개월이다(결정 기록 0014 #5).
- 수업(coursework) 기간은 입학 후 24개월(4학기)이다(결정 기록 0014 #6). 이 기간에는 연구 시간이 줄어든다(선택권 스펙 §4).
- 경력 단계는 화면에 연 단위로 보이지만, 공고 발생과 가상 뉴스는 월 단위로 처리한다. 결정 기록 0005가 뉴스를 "매월"로 정했기 때문이다. 그래서 연 틱 하나 안에서 월 하위 단계를 12번 돈다(§7.2).
- 기록 종료 80세는 계획 단계 설계(사망 모형 없음)를 따른다(결정 기록 0014 #7).

## 3. 상태 객체 필드

타입 표기: `int`, `num`(실수), `str`, `bool`, `enum{…}`, `T[]`, `T?`(없을 수 있음). 금액 단위는 원(krw) 정수다. 화면 표시는 만원으로 환산한다.

### 3.1 최상위

| 필드 | 타입 | 범위 | 초기화 |
|---|---|---|---|
| `version` | int | 1 | 1 (§5) |
| `engineRevision` | str | — | 엔진 빌드 식별자 |
| `dataRevision` | str | — | 데이터 팩 묶음 해시(§5.3) |
| `seed` | str | `APHD-` + 8자리 base32 | 새 게임에서 생성 |
| `stage` | enum{pre, phd, career, retired, end} | — | `pre` |
| `month` | int | 0– | 0 = 2027년 3월. 박사과정·경력 모두 이 카운터를 쓴다 |
| `ageMonths` | int | — | 입학 나이 × 12 (§2) |
| `stats` | {health, mind, skill, relation, network} | 각 0–100 int | §1.4 |
| `choices` | Choices | — | 선택권 스펙 §2. "운에 맡기기"로 정해진 값도 확정값으로 저장하고 `byLuck: bool`을 붙인다 |
| `money` | {cash: int, debt: int, loanLimit: int} | debt ≥ 0 | cash 5,000,000원(결정 기록 0014 #8), debt 0, loanLimit은 선택권 스펙 §5 |
| `ledger` | {month, kind, amount, recordId?}[] | — | 빈 배열. `recordId`는 금액의 근거 레코드 id |
| `news` | NewsEffect[] | — | 빈 배열(노동시장 스펙 §5) |
| `decisions` | {dp, month, option, byPolicy: bool}[] | — | 빈 배열. `dp`는 결정 지점 정본 id(결정 기록 0013 §5) |
| `log` | {month, textKey, tags[], creative: bool}[] | — | 빈 배열. `creative`는 창작 문구 표시 |
| `phd` | PhdState? | — | `stage = phd`에서 생성 |
| `career` | CareerState? | — | `stage = career`에서 생성 |
| `end` | {reason: enum{degree, dropout, residence, financial, exit-master, age80}, month}? | — | 종료 시 기록 |

### 3.2 Choices (입학 전 선택 6종의 결과)

| 필드 | 타입 | 값 출처 |
|---|---|---|
| `group` | enum{인문사회, 이공} | NRF 대분류 A·B → 인문사회, C·D → 이공(결정 기록 0007) |
| `track` | str | 게임 트랙 26개 키(`mapping-tracks.json` primary) |
| `subfield` | str | NRF 소분류 코드(예: `D131100`) |
| `department` | str | 엔진 학과 키(선택권 스펙 §11) |
| `departmentRecord` | str | 대표 레코드 id `departments-…` |
| `school` | str | school_id 20개 중 하나 |
| `funding` | enum{scholarship, project, self} | 선택권 스펙 §2.5 |
| `advisorPref` | enum{support, strict, free, connected} | 선택권 스펙 §2.6 |
| `kedi` | enum{humanities, social, natural, engineering} | NRF 대분류 → KEDI 대계열(선택권 스펙 §1) |
| `ksced` | enum{ict, natural-math, engineering, social, business-law, arts-humanities} | 결정 기록 0013 §1 표 |

### 3.3 PhdState

| 필드 | 타입 | 범위 | 초기화 |
|---|---|---|---|
| `enrolledMonths` | int | 0–108 | 0 (휴학 개월 제외) |
| `leave` | {active: bool, until: int, totalMonths: int} | totalMonths ≤ 36 | {false, −1, 0} |
| `coursework` | bool | — | true, `enrolledMonths ≥ 24`이면 false |
| `project` | num | 0–100 | 0. 학위논문 진척 |
| `blocked` | bool | — | false. 이번 달 연구 막힘 |
| `qualified` | bool | — | false |
| `qualAttempts` | int | 0–3 | 0 |
| `defenseAttempts` | int | 0– | 0 |
| `papers` | Paper[] | — | 빈 배열 |
| `requiredPapers` | int | 1–2 | 선택권 스펙 §6.1 |
| `advisor` | {type, support, rigor, network} | 각 0–100 | 선택권 스펙 §2.6 |
| `fundingState` | {route, monthly: int, tuitionWaiver: num, until: int, dutyHours: int, recordIds: str[]} | waiver 0–1 | 선택권 스펙 §5 |
| `focus` | enum{research, write, network, work, rest, thesis} | — | `research` |
| `focusHistory` | {from: int, focus}[] | — | 연속 구간만 저장(같은 포커스가 이어지면 기록하지 않음) |
| `path` | enum{academia, industry, public, startup}? | — | `pre-graduation-path` 결정 후 |

### 3.4 Paper

| 필드 | 타입 | 범위 | 뜻 |
|---|---|---|---|
| `id` | str | `p1`, `p2` … | 생성 순서. seed 파생의 슬롯 이름에 쓴다(§6) |
| `status` | enum{draft, submitted, revision, accepted, rejected, dropped} | — | 상태 |
| `writing` | num | 0–100 | 초고 진척 |
| `quality` | num | 0–100 | 선택권 스펙 §6.2 |
| `tier` | enum{T1, T2, T3, T4}? | — | 투고 계층(선택권 스펙 §6.3) |
| `venueId` | str? | — | 이름 있는 투고처 레코드 id(`venues-journal-…`, `venues-conf-…`) |
| `attempts` | int | 0– | 같은 논문 투고 횟수 |
| `dueMonth` | int? | — | 판정이 나오는 달 |

### 3.5 CareerState

| 필드 | 타입 | 뜻 |
|---|---|---|
| `degreeMonth` | int | 학위 취득 달(이탈이면 이탈 달) |
| `degree` | enum{phd, master-exit, none} | 박사, 석사 수료 이탈, 이탈 |
| `route` | enum{professor, nontenure, lecturer, postdoc, institute, public, industry, startup, bridge, none} | 현재 자리 종류 |
| `rank` | str? | 경로별 직급(예: `assistant`, `senior`, `researcher`) |
| `employer` | {kind, schoolId?, instituteId?, national?: bool}? | 고용주. 학교·출연연은 레코드 id의 키 |
| `annualPay` | int | 연봉(원). 선택권 스펙 §9.1 |
| `step` | int? | 호봉(국립대 교원·연구직 공무원) |
| `yearsInRoute` | int | 현재 경로 근속 |
| `workYears` | int | 총 근속 |
| `academicMonths` | int | 학계 자리(박사후·강사·비정년·교수) 누적 개월 |
| `searching` | {routes: str[], since: int}? | 구직 중인 경로 |
| `retireAge` | int? | 정해진 은퇴 나이 |
| `pensionMonthly` | int? | 은퇴 후 월 수입 |

## 4. 공통 확률 함수

모든 확률은 아래 두 함수 중 하나로 계산한다. 어떤 능력치 조합에서도 확률이 0이나 1이 되지 않는다.

```
z(x) = (x − 50) / 50                                   # 능력치 0–100 → −1…+1
odds(p0, terms, lo, hi) = clamp( σ( logit(p0) + Σ βᵢ·zᵢ + Σ γⱼ·wⱼ ), lo, hi )
   σ(t) = 1 / (1 + e^(−t)),  logit(p) = ln(p / (1 − p))
   zᵢ: 능력치 항, wⱼ: 횟수·누적 항(예: 재시도 횟수, 논문 점수)
hazard_month(r_year) = 1 − (1 − r_year)^(1/12)          # 연 비율 → 월 위험률
```

- 기본 하한·상한은 `lo = 0.02`, `hi = 0.95`다(결정 기록 0014 #9). 개별 공식이 다른 경계를 쓰면 그 공식 옆에 적는다.
- 중심 50은 초기값 평균(§1.4)과 같게 둔 것이다. 그래서 평균 능력치의 플레이어는 정확히 기준 확률 `p0`를 받는다. 기준 확률이 레코드에서 오면 평균 플레이어가 통계값을 재현한다.
- 화면은 `odds`의 결과를 숫자 대신 구간(낮음·보통·높음)과 근거 표기(레코드 출처 또는 "게임 설정")로 보여준다. 구간 경계는 Wave 5 UI 스펙이 정한다.

## 5. 저장 형식

### 5.1 형식

- 저장 위치: 브라우저 localStorage(결정 기록 0001). 키는 `aphd.save.v1`(진행 중 1건), `aphd.archive.v1`(끝난 기록, 최대 20건), `aphd.settings.v1`. v3.5의 `accidental-phd.*` 키와 겹치지 않는다. 보관 20건은 assumed (결정 기록 0014 #10).
- 저장 객체는 JSON이며 최상위에 `version: 1`이 있다. 저장 내용은 §3 상태 전체(스냅샷)와 재생 입력(seed, 선택 6종, 결정 기록, 포커스 구간)이다. 결정론(§6) 덕분에 재생 입력만으로도 상태를 다시 만들 수 있다. 스냅샷은 빠른 불러오기용이다.

### 5.2 마이그레이션 규칙

1. 저장 형식이 바뀌면 `version`을 1 올리고 `migrations[n]: (save_n) → save_{n+1}` 함수를 하나 추가한다. 함수는 입력을 바꾸지 않고 새 객체를 돌려준다.
2. 불러올 때 `version < 현재`이면 마이그레이션을 차례로 적용한다. 중간 단계를 건너뛰지 않는다.
3. `version > 현재`(새 버전에서 만든 저장)이면 불러오지 않고 "새 버전에서 만든 기록" 안내를 띄운다.
4. 필드를 지울 때는 한 버전 동안 무시 필드로 남긴 뒤 다음 버전에서 지운다.
5. 마이그레이션마다 Wave 4 테스트에 "v(n) 저장 예시 → v(n+1) 기대값" 고정 예시를 하나 둔다.

### 5.3 데이터 개정과 재현성

- `dataRevision`은 엔진이 읽은 팩 파일들의 내용 해시를 이어 붙여 다시 해시한 값이다.
- 불러온 저장의 `dataRevision`이 현재와 다르면 스냅샷으로 이어서 진행하되, "다른 선택 보기"(§6.3)는 "데이터가 갱신되어 같은 조건으로 다시 계산할 수 없음"으로 막는다. 같은 seed라도 레코드 값이 바뀌면 결과가 달라지기 때문이다.

## 6. seed와 결정론

### 6.1 보장

같은 `seed`, 같은 `dataRevision`, 같은 엔진, 같은 입력(선택 6종, 결정 지점 선택, 포커스 구간)은 같은 상태 열을 만든다. Wave 4 테스트가 이 성질을 고정 seed로 검사한다.

### 6.2 난수 생성: 이름 붙은 슬롯

순서에 의존하는 난수열 하나를 쓰지 않는다. 난수 하나하나를 "무엇을 위한 몇 번째 달의 추첨인가"로 이름 붙여 해시에서 바로 뽑는다.

```
draw(seed, stream, month, slot) → [0, 1)
  h = xmur3(seed + "|" + stream + "|" + month + "|" + slot)()    # 32비트 문자열 해시
  return mulberry32(h)() 의 첫 출력                                # 32비트 PRNG, 1회 출력
```

- `stream` 목록: `init`(초기 능력치·나이), `luck`(운에 맡기기), `progress`(진척 잡음·막힘), `paper`(논문 질·판정·심사 기간), `exam`(자격시험·학위 심사), `hazard`(휴학·이탈·번아웃), `funding`(선발·연장), `labor`(공고·채용·승진), `news`(뉴스 발생·종류·크기·기간), `life`(은퇴 나이·노후), `policy`(동기 자동 선택).
- `slot` 예: `leave`, `dropout`, `p3:verdict`, `p3:quality`, `qual:2`, `post:professor`, `apply:professor:7`, `news:type`.
- 같은 슬롯 이름은 한 달에 한 번만 쓴다. 한 달에 같은 종류를 여러 번 뽑으면 슬롯에 순번을 붙인다(`apply:industry:0`, `:1`).
- 정규분포가 필요하면 같은 이름의 두 슬롯(`…:a`, `…:b`)으로 Box–Muller 변환을 한다.

이 방식의 이유: 한 분기에서 추첨이 하나 늘어도 다른 사건의 난수가 밀리지 않는다. 그래서 "다른 선택 보기"에서 선택과 무관한 사건(뉴스, 다른 논문의 판정)이 두 분기에서 같게 나온다.

### 6.3 "다른 선택 보기" 분기

1. 결정 지점에 도달하면 엔진은 그 직전 상태의 스냅샷을 저장한다.
2. 다른 선택지로 분기하면 스냅샷에서 다시 시작하고, seed와 `stream`·`slot` 규칙은 그대로다.
3. 분기 이후 두 기록은 같은 달·같은 슬롯에서 같은 난수를 받는다. 결과가 갈라지는 원인은 선택과 그 선택이 바꾼 상태뿐이다.
4. 분기 기록은 `decisions` 배열의 접두가 같고 분기한 원소부터 다르다. 화면은 접두가 같은 두 기록을 나란히 보여준다.

### 6.4 "같은 해 입학한 동기 4명"

- 동기 k(k = 1…4)의 seed는 `cohortSeed(k) = "APHD-" + base32(xmur3(seed + "|cohort|" + k)())`다. 동기 수 4는 결정 기록 0005를 따른다.
- 동기는 플레이어와 입학 연월(2027년 3월)과 계열이 같다. 나머지 입학 전 선택은 "운에 맡기기" 분포(선택권 스펙 §2)를 동기 자신의 `luck` 스트림으로 뽑는다.
- 동기의 월 포커스와 결정 지점 선택은 자동 진행 정책(선택권 스펙 §4.4)이 `policy` 스트림으로 정한다.
- 동기는 플레이어와 같은 `news` 스트림을 쓴다. 뉴스는 세계의 사건이므로 동기 다섯 명(플레이어 포함)이 같은 뉴스를 겪는다. 구현: 뉴스 추첨에는 플레이어 seed를 쓰고 동기 seed를 쓰지 않는다.

## 7. 틱 처리 순서

### 7.1 박사과정 월 틱

| 순서 | 처리 | 정의된 곳 |
|---|---|---|
| 1 | `month += 1`, `ageMonths += 1`, 휴학이 아니면 `enrolledMonths += 1` | 이 문서 §3 |
| 2 | 가상 뉴스: 만료 제거 → 새 뉴스 추첨 → 수요 계수 갱신 | 노동시장 스펙 §5 |
| 3 | 학기 경계(3월·9월, `month mod 6 = 0`): 장학 유지 판정, 수업 기간 종료 확인(등록금 청구는 6단계) | 선택권 스펙 §5 |
| 4 | 진척(이번 달 갱신 전 능력치로 계산), 포커스 효과: 능력치, 논문 초고 | 선택권 스펙 §4 |
| 5 | 자연 변화 | 이 문서 §1.5 |
| 6 | 현금 흐름: 수입 − 생활비 − (경계 달이면) 등록금 − 이자, 부족분 대출 | 선택권 스펙 §5 |
| 7 | 논문 파이프라인: 심사 시계, 판정 추첨 | 선택권 스펙 §6 |
| 8 | 마일스톤: 자격시험 창, 학위 심사, 졸업 직전 구직 하위 단계(§3.4, 진로 결정 다음 달부터), 학위 취득(`stage = career`). 학위 취득 달은 여기서 끝나고 9단계 이후를 거치지 않는다(그 달에 나온 첫 논문 판정은 결정 지점을 열지 않고 판정대로 상태만 남긴다, §3.2의 예외) | 선택권 스펙 §7, §3.4 |
| 9 | 위험률: 휴학, 이탈, 번아웃 | 선택권 스펙 §4.5 |
| 10 | 종료 확인: 재학연한, 재정 파탄. 종료가 걸리면 11단계를 열지 않는다 | 선택권 스펙 §5.5 |
| 11 | 결정 지점 트리거 확인. 걸리면 시간 정지 | 선택권 스펙 §3 |
| 12 | 기록(log) | — |

- 학위 취득 달에 졸업 직전 진로 결정(`pre-graduation-path`)이 이미 끝나 있어야 한다. 트리거는 심사 준비 단계에 처음 들어선 달이다(선택권 스펙 §3.4). 그 결정의 다음 달부터 학위 취득 달까지 구직 하위 단계(§7.2의 2·3)를 박사과정 월 틱 8단계 안에서 함께 돈다.

### 7.2 경력 연 틱

연 틱 하나는 다음 순서다.

1. 월 하위 단계 12회. 각 회차: (1) 가상 뉴스 갱신, (2) 구직 중이면 공고 추첨, (3) 공고가 나오면 지원 여부 결정(플레이어 또는 자동 정책)과 채용 추첨, (4) 월 현금 흐름: 연봉 ÷ 12 − 생활비(선택권 §5.3). 대출·이자·재정 위기(선택권 §5.4–§5.5)는 박사과정 규칙이라 적용하지 않는다. 현금은 음수가 될 수 있고, 박사과정에서 남은 부채는 경력 단계에서 바뀌지 않는다(상환·이자 없음, Wave 6 밸런스 대상).
2. 연말 처리: 나이, 근속, 호봉 승급, 연봉 인상, 계약 만료, 창업 존속 판정.
3. 결정 지점 트리거 확인(`career-5y`, `career-10y`, `pre-retirement`).
4. 은퇴 확인: 나이가 `retireAge` 이상이면 `stage = retired`.
5. 기록.

### 7.3 은퇴 연 틱

나이 +1, 노후 월수입 × 12를 현금에 더한다. 80세 생일 달에 `stage = end`, `end.reason = age80`.

## 8. 이 문서의 수치 근거 표

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 초기 능력치 분포 | 50 + N(0, 8), 30–70 | assumed (결정 기록 0014 #1) | — | a |
| 월 자연 변화 | 체력 −0.5, 마음 50 회귀 2% | assumed (결정 기록 0014 #2) | — | a |
| 입학 시점 | 2027년 3월 | `departments-{school}-{slug}` year 2027 | — | v |
| 입학 나이 분포 | 25–35세 이산 분포 | assumed (결정 기록 0014 #3); 참고 `statistics-phd-entry-age-mean-years` 35.6 (미사용) | KRIVET 전체 | a (참고 v) |
| 재학연한 | 96개월 + 연장 12개월 1회 | assumed (결정 기록 0014 #4); v3.5 상수 96개월 | — | a |
| 휴학 누적 상한 | 36개월 | assumed (결정 기록 0014 #5) | — | a |
| 수업 기간 | 24개월 | assumed (결정 기록 0014 #6) | — | a |
| 기록 종료 | 80세 | assumed (결정 기록 0014 #7); 계획 설계 §1 | — | a |
| 초기 현금 | 500만 원 | assumed (결정 기록 0014 #8) | — | a |
| 확률 하한·상한 | 0.02 / 0.95 | assumed (결정 기록 0014 #9) | — | a |
| 기록 보관 수 | 20건 | assumed (결정 기록 0014 #10) | — | a |
| 동기 수 | 4명 | 결정 기록 0005 | — | 결정 |

## 9. 열린 문제

- 성별은 상태에 넣지 않는다. 성별 통계(`statistics-phd-leave-rate-{male/female}-{year}` 등)가 있으나 게임이 성별로 위험률을 바꾸면 고정관념을 확률로 굳힌다는 우려가 있어 Wave 3에서는 쓰지 않는다. Wave 6 플레이테스트 뒤 다시 본다.
- 외국인 학생은 모델링하지 않는다(취업률·고용형태 레코드가 내국인 응답자 기준이다).
