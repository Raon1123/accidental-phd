# 선택권 모델 스펙 (Wave 3, issue #18 항목 2)

- 상태: 감사 반영 · 2026-10-13 (초안 opus, 감사 fable, §13). PR #36 머지로 승인(결정 기록 0010 §3 (b)); 감사 변경 전파 누락은 Wave 4 PR에서 정리.
- 범위: 계열 대응, 입학 전 선택 6종, 결정 지점 7종, 월 포커스 루프와 위험률, 돈의 흐름, 논문 생애주기, 자격시험·학위 심사, 졸업 직전 진로 분포, 경력 단계 급여·전환·은퇴, `same_unit_as` 규칙, 학과 엔진 키. 상태 필드·공통 확률 함수 `odds`·난수 규칙은 [상태 모델 스펙](2026-10-13-engine-state-design.md), 공고 확률과 가상 뉴스는 [노동시장·뉴스 스펙](2026-10-13-labor-market-news-design.md)에 있다.
- 원칙: 선택과 능력치는 확률을 바꿀 뿐 결과를 결정하지 않는다([결정 기록 0005](../../design/decisions/0005-agency-over-randomness.md)). 그래서 모든 확률은 상태 스펙 §4의 `odds`로 계산하고 하한·상한을 둔다. 결정적인 문턱(예: v3.5의 자격시험 "역량 ≥ 44")은 두지 않는다.
- 근거 표기: 레코드 id는 [근거 색인](2026-10-13-wave3-evidence-index.md)에서만 인용한다. 근거가 없으면 "assumed (결정 기록 0014 #n)"이며 [결정 기록 0014](../../design/decisions/0014-assumed-probabilities.md)에 값·사유·교체 위치가 있다. 판정 규칙은 [결정 기록 0013](../../design/decisions/0013-wave3-pre-spec-judgments.md)이다.
- 근거 표의 열: 항목 | 값 | 근거 | 계열 체계 | conf. 계열 체계 태그는 `[NRF]` 한국연구재단 학술연구분야분류 대분류, `[KEDI7]` 한국교육개발원 7 대계열, `[KSCED10]` 한국표준교육분류 10계열, `[KISTEP]` 한국과학기술기획평가원 과학기술인력 구분, `[game]` 인문사회·이공이다. 약어 정의는 [용어집](../../workflow.md#용어집). conf `v`·`i`·`a`는 verified·indexed·assumed.

## 1. 계열 대응표

결정 기록 0007(NRF → 게임 계열), 0013 §1(KSCED → 트랙), 0013 §2(KEDI → 게임 계열)를 한 표로 묶는다. 플레이어의 KEDI 대계열은 트랙 primary의 NRF 대분류에서 정한다. 근거는 결정 기록 0009의 대계열 primary 행(U01 → A000000, U02 → B000000, U04 → D000000, U05 → C000000)이다.

| game 계열 | NRF 대분류 | 게임 트랙 | game field 키 | KSCED 10계열 (`statistics-employed-*` 키) | KEDI 7 대계열 (`statistics-phd-*` / `statistics-faculty-*` 키) |
|---|---|---|---|---|---|
| 인문사회 | A 인문학 | history, philosophy, korean_literature, english_literature, linguistics | humanities | 예술 및 인문학 (`arts-humanities`) | 인문 (`humanities` / `humanities`) |
| 인문사회 | B 사회과학 | sociology, political, psychology | social | 사회과학, 언론 및 정보학 (`social`) | 사회 (`social` / `social`) |
| 인문사회 | B 사회과학 | economics, public_administration, law (#70) | social | 경영, 행정 및 법 (`business-law`) | 사회 (`social` / `social`) |
| 인문사회 | (B120000 교육학) | 트랙 없음 | — | 교육 (`edu`, 미사용) | 교육 (`education` / `education`): 노동시장 기준값의 인문사회 합산에만 들어간다(0013 §2) |
| 이공 | C 자연과학 | mathematics, statistics, life_science, neuroscience, systems_biology | math, bio | 자연과학, 수학 및 통계학 (`natural-math`) | 자연 (`natural` / `natural`) |
| 이공 | D 공학 | computer, ai | cs | 정보통신기술 (`ict`) | 공학 (`engineering` / `engineering`) |
| 이공 | D 공학 | mechanical, electrical, chemical, materials, civil, environmental, energy, semiconductor, bioengineering | engineering, bio | 공학, 제조 및 건설 (`engineering`) | 공학 (`engineering` / `engineering`) |
| 기타 | E·F·G·H | 범위 밖 | — | 보건·농림어업·서비스 (미사용) | 의약 (`medical`), 예체능 (phd `arts-sports` / faculty `arts`) |

- 0013 §1은 economics·public_administration을 "경영·행정·법"에 넣는다. 위 표는 그 판정을 따른다.
- KEDI 계열과 트랙의 대응은 "트랙 primary NRF 대분류 → KEDI 대계열" 한 단계다. KEDI 소계열 수준의 1:N 매핑(결정 기록 0009)은 쓰지 않는다. 엔진은 대계열 통계만 쓰기 때문이다.
- 0013 §1이 언급한 statistics-regular-share-(field)라는 id(존재하지 않는 id)는 레코드에 없다. 계열별 정규직 비율 레코드의 실제 id는 `statistics-form-permanent-<field>-2021-2024`(그림 11, 4년 합산)이며 이 스펙은 그 id를 인용한다. 계열별 값은 합산판만 있으므로 0013 §1의 "2024 단년 기본" 규칙의 예외로 둔다(§8).

## 2. 입학 전 선택 6종

모든 선택에 "운에 맡기기"가 있다. 운에 맡기기는 `luck` 스트림(상태 스펙 §6.2)으로 아래 분포에서 뽑고, 결과를 `choices`에 `byLuck: true`로 저장한다. 앞 선택이 뒤 선택의 선택지를 좁힌다.

### 2.1 계열

- 선택지: 인문사회, 이공. 출처: `taxonomy-nrf-a000000`·`taxonomy-nrf-b000000` → 인문사회, `taxonomy-nrf-c000000`·`taxonomy-nrf-d000000` → 이공(4건, conf v). 대분류 E–H(`taxonomy-nrf-e000000` 등 4건)는 선택지에서 뺀다(결정 기록 0007).
- 운에 맡기기: P(이공) = 0.5720, P(인문사회) = 0.4280.

```
P(이공) = (공학 8895 + 자연 4339) / (인문 3497 + 사회 6406 + 공학 8895 + 자연 4339) = 13234 / 23137 = 0.5720
```

- 바꾸는 상태: `choices.group`, 서사 팩(`nar-hs-*` 또는 `nar-stem-*`), 트랙 선택지, 진로 분포(§8), 자금 경로 분포(§2.5).

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 2025 입학자 인문·사회·공학·자연 | 3497, 6406, 8895, 4339 | `statistics-phd-admitted-{humanities,social,engineering,natural}-2025` | [KEDI7] | v |
| 입학자 비중을 운에 맡기기 가중치로 쓰고 교육계열을 뺌 | P(이공) 0.5720 | assumed (결정 기록 0014 #12) | [game] | a |

### 2.2 전공군

- 판정: 전공군은 게임 트랙 26개로 한다. NRF 중분류(인문사회 46, 이공 41)는 학과·서사·학술지가 트랙 키로 연결되어 있지 않아 쓰지 않는다. 화면은 트랙 이름 옆에 primary NRF 이름을 함께 보여준다(예: "ai · 인공지능 D131100").
- 선택지 출처: `mapping-tracks.json` primary 26행(인문사회 10, 이공 16, 결정 기록 0008).
- 운에 맡기기: 계열 안에서 트랙 가중치 = 그 트랙의 고유 학과 단위 수. `same_unit_as` 묶음(§10)에 속한 단위는 묶음 크기 k로 나눠 각 트랙에 1/k씩 센다.

| 트랙 | 가중치 | 트랙 | 가중치 | 트랙 | 가중치 |
|---|---|---|---|---|---|
| ai | 30.83 | electrical | 22 | sociology | 14 |
| mechanical | 27 | chemical | 18 | political | 16 |
| energy | 26.5 | semiconductor | 18.5 | psychology | 13 |
| bioengineering | 26.33 | mathematics | 16.5 | economics | 15 |
| materials | 25.5 | civil | 16.5 | public_administration | 15 |
| computer | 25.33 | environmental | 15.5 | history | 18 |
| life_science | 24.5 | statistics | 12.5 | philosophy | 15 |
| neuroscience | 9 | systems_biology | 4.5 | korean_literature | 15 |
|  |  |  |  | english_literature | 13.5 |
|  |  |  |  | linguistics | 6.5 |
|  |  |  |  | law | 11 |

이공 합 319, 인문사회 합 141, 전체 460(= 고유 단위 수). 출처: departments 레코드 483건 note의 `track`과 `same_unit_as`(conf v 480 / i 3). 학과 수를 가중치로 쓰는 것은 assumed (결정 기록 0014 #13).

- 바꾸는 상태: `choices.track`, `choices.ksced`(§1), 세부전공 선택지, 학과 선택지, 투고처 분야군(§6.3), 뉴스 표적 일치 여부(노동시장 스펙 §5).

### 2.3 세부전공

- 선택지: 트랙 primary가 중분류면 그 아래 NRF 소분류 전부, 소분류면 그 하나, 여기에 `mapping-tracks.json` 보조 후보를 더한다. 출처 패턴 `taxonomy-nrf-{a/b/c/d}NNNN00`(소분류 879건, conf v). 트랙별 수는 근거 색인 §1 트랙 표(예: computer 21 + 0, civil 19 + 6)이고, 보조 후보가 primary의 소분류와 겹치면 한 번만 센다(civil은 보조 6건 중 D140100·D140600·D141000·D141100이 `taxonomy-nrf-d140000`의 소분류라 선택지 21개).
- 운에 맡기기: 선택지 균등 (결정 기록 0014 #14).
- 바꾸는 상태: `choices.subfield`. 능력치·확률은 바꾸지 않는다. 뉴스가 중분류를 표적으로 할 때 일치 여부만 바꾼다(노동시장 스펙 §5.2).

### 2.4 학교·학과

- 선택지: 트랙이 같은 departments 레코드(`departments-{school}-{slug}`, 483건 중 해당분). 같은 묶음의 레코드는 한 번만 보여주고, 묶음의 다른 트랙은 그 학과의 "세부 트랙 선택지"로 보여준다(§10). 이번 차수 미모집 3건(`departments-pusan-psychology`, `departments-knu-mechanical`, `departments-knu-philosophy`, conf i)은 "이번 모집 없음" 표시와 함께 고를 수 있다. 학교 표시명은 가상 이름이다(결정 기록 0004).
- 운에 맡기기: 트랙 안의 고유 학과 단위 균등 (결정 기록 0014 #15). 학교별 입학자 수 레코드가 없다(근거 색인 §9 결손 3).
- 바꾸는 상태: `choices.school`, `choices.department`, 등록금(§5.1), 장학·장려금 선택지(§5.2), 생활비 지역(§5.3), 시간강사 시급의 학교(§9.1).

### 2.5 자금 경로

- 선택지 3개: 장학(학교 장학 선발형), 과제(지도교수 과제의 연구 인건비), 자비. 금액 출처: 학교별 `schools-{school}-…-(stipend|scholarship)-…` 레코드(20개교 79건, 근거 색인 §1 자금 경로 표), 국가 하한 `salaries-stipend-bk21-phd-min`(160만 원/월), `salaries-stipend-stem-living-phd-min`(110만 원/월). 금액 규칙은 §5.2.
- 고른 경로가 그대로 정해지지 않는다. 장학은 선발, 과제는 배정이 확률로 결정된다(§5.2). 실패하면 다음 경로로 넘어가고 화면에 그 확률을 미리 보여준다.
- 운에 맡기기 분포 (결정 기록 0014 #16):

| 학교·계열 | 장학 | 과제 | 자비 |
|---|---|---|---|
| 이공, 과학기술원 5곳(kaist, postech, gist, dgist, unist) | 0.40 | 0.55 | 0.05 |
| 이공, 그 밖의 15곳 | 0.25 | 0.55 | 0.20 |
| 인문사회 | 0.30 | 0.20 | 0.50 |

- 바꾸는 상태: `phd.fundingState`, 초기 마음(자비 −5, 결정 기록 0014 #17), 등록금 감면율.

### 2.6 지도교수 유형 선호

- 선택지 4개와 파라미터 (결정 기록 0014 #18). 근거 레코드 없음(근거 색인 §1 ⑤). v3.5의 advisor{support, rigor, factor}도 출처가 없다.

| 유형 | 키 | support | rigor | network |
|---|---|---|---|---|
| 지원형 | `support` | 75 | 45 | 45 |
| 엄격형 | `strict` | 40 | 80 | 50 |
| 방임형 | `free` | 30 | 30 | 35 |
| 연결형 | `connected` | 45 | 45 | 80 |

- 선호가 결과를 정하지 않는다. 실제 배정: P(선호 유형) = 0.6, 나머지 세 유형 각 0.4/3 (결정 기록 0014 #19). 운에 맡기기는 네 유형 균등(0.25).
- 효과 (결정 기록 0014 #20):

```
진척 배수 A = 0.75 + 0.003·support + 0.002·rigor          (support = rigor = 50이면 1.00)
논문 질 보정 = 0.1 · (rigor − 50)
관계 월 변화 += 0.02 · (support − 50)
네트워크 포커스 이득 × (1 + (network − 50) / 100)
방임형: 마음 월 +0.5
```

## 3. 결정 지점 7종

정본 id는 결정 기록 0013 §5를 따른다. 결정 지점에 도달하면 시간이 멈추고(상태 스펙 §7.1의 10번), 선택지마다 확률 힌트와 근거 표기를 보여준다. 자동 진행과 동기는 §4.4 정책으로 고른다.

### 3.1 `post-qualifying` 자격시험 직후

- 트리거: 자격시험 결과가 나온 달. 합격과 불합격 모두.
- 선택지(합격): (A) 바로 학위논문 단계: 진척 +5, 마음 −3. (B) 한 학기 쉬고 온다: 자발 휴학 6개월(§4.5 휴학 규칙 적용). (C) 주제·지도교수를 바꾼다: 진척 × 0.6, 성공하면 지도교수 재배정(§2.6 규칙), 실패하면 관계 −10.
- 선택지(불합격): (A) 6개월 뒤 재응시: 역량 +3, 마음 −5. (B) 한 학기 쉬고 온다. (C) 석사 수료로 마치고 나간다: `end.reason = exit-master`, 경력 단계로 넘어가며 학계 경로는 닫힌다.
- 확률:

```
P(지도교수 변경 성공) = odds(0.70, 0.6·z(network) + 0.4·z(relation), lo 0.2, hi 0.9)
P(휴학 중 이탈, 월) = 2 × h_dropout(§4.5)
석사 수료 이탈자의 경력: 산업·공공·임시직 채용 기준값 × 0.7, 급여 × 0.85
(#85: 이탈·재학연한 초과·재정 파탄으로 학위 없이 끝난 사람도 같은 규칙으로 경력 단계에 들어간다)
```

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 선택지 효과(진척 +5 등) | 위 목록 | assumed (결정 기록 0014 #29) | — | a |
| 지도교수 변경 성공 | 0.70, 계수 0.6·0.4 | assumed (결정 기록 0014 #30) | — | a |
| 휴학 중 이탈 배수 | ×2 | assumed (결정 기록 0014 #31) | — | a |
| 석사 수료 이탈 보정 | 채용 ×0.7, 급여 ×0.85 | assumed (결정 기록 0014 #32) | — | a |
| 힌트: 휴학률 | 공학 0.08, 자연 0.081, 인문 0.188, 사회 0.19 | `statistics-phd-leave-rate-{engineering,natural,humanities,social}` | [KEDI7] | v |
| 힌트: 중도탈락률 | 공학 0.046, 자연 0.048, 인문 0.064, 사회 0.064 | `statistics-phd-dropout-rate-{…}` | [KEDI7] | v |
| 서사 | 장면 4건 | `nar-hs-qualifying-2`, `nar-hs-qualifying-3`, `nar-stem-qualifying-2`, `nar-stem-qualifying-3` | — | v |

### 3.2 `first-paper-verdict` 첫 논문 판정

- 트리거: 플레이어의 첫 투고 논문에 첫 판정(채택·수정 요구·거절)이 나온 달.
- 선택지(거절): (A) 같은 계층에 다시 투고: `attempts + 1`. (B) 한 계층 낮춰 투고(T4는 T4 유지). (C) 접고 새 주제: 논문 `dropped`, 진척 +3, 마음 −5.
- 선택지(수정 요구): (A) 전면 수정: 2개월 집필, 질 +8, 재심 채택 로짓 +0.8. (B) 최소 수정: 1개월 집필, 질 +2, 로짓 +0.4. (C) 철회하고 한 계층 낮춰 투고.
- 선택지(채택): (A) 후속 논문 바로: 새 초고 writing 20에서 시작. (B) 학회 발표·교류: 네트워크 +8, 현금 −50만 원. (C) 학위논문 집중: 진척 +5.
- 확률: 재투고와 수정 후 채택은 §6.4 공식에 위 로짓 보정을 더한다.

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 선택지 효과 | 위 목록 | assumed (결정 기록 0014 #33) | — | a |
| 계층 기준 채택 확률 | §6.4 | §6.4 표 | — | v/i/a |
| 서사 | 장면 6건 | `nar-hs-first-paper-{1,2,3}`, `nar-stem-first-paper-{1,2,5}` | — | v |

### 3.3 `funding-expiry` 자금 만료

- 트리거: `fundingState.until`에 도달한 달, 장학 유지 판정 실패(학기 경계), 재정 위기(§5.5) 중 먼저 오는 것.
- 선택지: (A) 연장·재선발 신청. (B) 조교·강의 근로로 전환: 월 수입 = 학교의 `schools-{school}-all-stipend-ta*` 레코드 중 id 사전순 첫 레코드의 월 환산값, 없으면 40만 원; 주당 의무 10시간. (C) 자비·대출로 버틴다: 장려금 0. (D) 휴학하고 일한다: 휴학 12개월, 월 근로 수입 200만 원.

```
P(연장 성공) = odds(0.50, 0.6·z(relation) + 0.4·z(skill), + 0.3·min(채택 논문 수, 2), lo 0.10, hi 0.90)
성공: 과제는 24개월 연장, 장학은 남은 학기 유지
실패: 다음 달 B·C·D 중에서 다시 고른다
```

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 연장 성공 기준·계수 | 0.50, 0.6·0.4·0.3 | assumed (결정 기록 0014 #34) | — | a |
| 조교 수입 대체값·의무 시간 | 40만 원/월, 주 10시간 | assumed (결정 기록 0014 #35) | — | a |
| 조교 수입(학교 값) | 예: snu 30만/월, kaist 55만/월, cnu 40만/월 | `schools-snu-all-stipend-ta-lecture-research`, `schools-kaist-all-stipend-ta-type1`, `schools-cnu-all-stipend-ta` | — | v |
| 휴학 중 근로 수입 | 200만 원/월 | assumed (결정 기록 0014 #36) | — | a |
| 국가 하한(힌트) | BK21 박사 160만, 이공 연구생활장려금 110만 | `salaries-stipend-bk21-phd-min`, `salaries-stipend-stem-living-phd-min` | — | v |
| 서사 | 장면 7건 | `nar-hs-funding-{4,6}`, `nar-stem-funding-{6,8,9}`, `nar-stem-early-career-{1,7}` | — | v |

### 3.4 `pre-graduation-path` 졸업 직전 진로

- 트리거: 심사 준비 단계에 처음 들어선 달. 심사 준비 단계 = 자격시험 합격, 진척 ≥ 90, 채택 논문 ≥ `requiredPapers`. 학위 심사 자격(§7.2, 진척 ≥ 100 포함)보다 앞선다.
- 선택지: 학계, 산업, 공공, 창업. 학계는 박사후·시간강사·비정년·교수 공고를, 산업은 기업 공고를, 공공은 출연연·연구직 공무원 공고를 찾는다. 창업은 학위 취득 달에 시작한다.
- 효과: `phd.path` 설정. 결정한 다음 달부터 학위 취득 달까지 구직 하위 단계를 월 틱 8단계 안에서 함께 돈다(결정은 결정 지점 단계에서 내려지므로 결정한 달의 8단계는 이미 지났다). 진척 90에서 100까지 평균 약 5–7개월이 걸리도록 g_k를 보정하므로(§4.2) 구직 기간은 대략 6개월이다 (결정 기록 0014 #37).
- 확률: 경로별 공고·채용 확률은 노동시장 스펙 §3–4. 운에 맡기기와 동기 정책은 §8의 분포를 쓴다. 힌트는 계열별 취업률이다.

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 힌트: 학업전념 박사 취업률 2024 | ict 0.682, engineering 0.625, natural-math 0.587, social 0.47, business-law 0.408, arts-humanities 0.408 | `statistics-employed-{ict,engineering,natural-math,social,business-law,arts-humanities}` | [KSCED10] | v |
| 힌트: 변동폭(2021–2024 합산) | 예: ict 0.615 | `statistics-employed-{…}-2021-2024` | [KSCED10] | v |
| 경로 분포 | §8 표 | §8 | [KSCED10]·[KISTEP] | v + a |
| 서사 | 장면 10건 | `nar-hs-early-career-{3,4,5,7}`, `nar-stem-early-career-{4,9,10,12,14,16}` | — | v / i(`nar-hs-early-career-5`) |

취업률 레코드의 "취업"은 박사후연구원·시간강사를 포함한다(0013 §1). 표본 수가 공개되지 않았으므로 화면 출처 표기에 "표본 미공개"를 붙인다.

### 3.5 `career-5y` 경력 5년

- 트리거: `degreeMonth + 60`이 지난 첫 연 틱.
- 선택지: (A) 지금 자리에서 승진·정규 전환에 도전(§9.3 표). (B) 경로를 바꾼다: 목표 경로 구직 시작, 채용 기준값 × 0.8. (C) 연구 밖으로 나간다: 임시직(브리지) 또는 기업 비연구직 구직. (D) 학계 비정규(박사후·강사·비정년)만: 한 번 더 버틴다(구직 유지, 마음 −5).

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 승진·전환 확률 | §9.3 표 | assumed (결정 기록 0014 #94) | — | a |
| 경로 변경 보정 | × 0.8 | assumed (결정 기록 0014 #96) | — | a |
| 직급 분포(힌트, 전이 확률 아님) | 교수 31,396 / 부교수 15,014 / 조교수 18,086 | `statistics-faculty-fulltime-rank-{professor,associate,assistant}-2025` | 일반대학 전체 | v |
| 서사 | 장면 9건 | `nar-hs-early-career-{1,2,6,8}`, `nar-stem-early-career-{3,5,6}`, `nar-stem-mid-career-{2,6}` | — | v / i(`nar-hs-early-career-6`) |

### 3.6 `career-10y` 경력 10년

- 트리거: `degreeMonth + 120`이 지난 첫 연 틱.
- 선택지: (A) 리더 역할 도전(다음 직급, §9.3). (B) 연구에 집중: 역량 +5, 네트워크 −3, 그해 경력 논문 확률 +0.2. (C) 경로를 바꾼다(× 0.8). (D) 독립: 창업 시작.

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 선택지 효과 | 위 목록 | assumed (결정 기록 0014 #38) | — | a |
| 서사 | 장면 7건 | `nar-hs-mid-career-{1,2,3,4,5}`, `nar-stem-mid-career-{4,5}` | — | v / i(`nar-hs-mid-career-5`) |

### 3.7 `pre-retirement` 은퇴 전

- 트리거: 나이 = `retireAge − 2`.
- 선택지: (A) 정년(정해진 은퇴 나이)까지. (B) 지금 조기 은퇴: 노후 월수입 × 0.85. (C) 은퇴 뒤에도 연구(명예·자문·초빙): 은퇴 후 5년 동안 월 50만 원 추가 수입을 확률 0.6으로 얻는다.

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 조기 은퇴 감액 | × 0.85 | assumed (결정 기록 0014 #97) | — | a |
| 은퇴 후 연구 | 월 50만 원, 5년, 확률 0.6 | assumed (결정 기록 0014 #98) | — | a |
| 힌트: 교원 연간 퇴직 | 2025 4376명 | `statistics-faculty-retirements-all-2025` | 일반대학 전체 | v |
| 서사 | 장면 10건 | `nar-hs-retirement-{1..5}`, `nar-stem-retirement-{1..5}` | — | v |

## 4. 월 포커스 루프와 위험률

### 4.1 포커스 6종의 효과

플레이어는 매월 포커스 하나를 고른다(바꾸지 않으면 유지). `thesis`는 자격시험 합격 후에만 고를 수 있다. 값은 전부 assumed (결정 기록 0014 #39).

| 포커스 | 키 | 진척 배수 f | 체력 | 마음 | 역량 | 관계 | 네트워크 | 그 밖 |
|---|---|---|---|---|---|---|---|---|
| 연구 | `research` | 1.0 | −1.5 | −0.5 | +0.8 | 0 | 0 | — |
| 집필 | `write` | 0.3 | −1.0 | 0 | +0.3 | 0 | 0 | 활성 초고 writing += 12 + 0.2·skill (결정 기록 0014 #41) |
| 네트워크 | `network` | 0.3 | −0.5 | +0.5 | 0 | +0.5 | +2.0 | 현금 −10만 원 |
| 근로 | `work` | 0.4 | −1.0 | −0.5 | 0 | 0 | +0.3 | 월 100만 원 (결정 기록 0014 #40) |
| 휴식 | `rest` | 0 | +4 | +3 | 0 | +0.5 | 0 | — |
| 학위논문 | `thesis` | 1.2 | −2.0 | −1.0 | +0.3 | 0 | 0 | 합격 후만 |

### 4.2 진척 공식

```
Δproject = g_k × U(0.65, 1.50) × (0.65 + skill/140) × researchTime × E × A × f × (0.2 if blocked)
researchTime = max(0.12, (44 − dutyHours − jobHours − 6·coursework) / 44)
E = 0.5 + health/100
A = §2.6
blocked: 매월 P = 0.16 (트랙 mathematics·statistics는 0.24)
```

- `U(0.65, 1.50)`, `0.65 + skill/140`, `researchTime`의 44시간·6시간, 막힘 0.16/0.24는 v3.5 공식을 그대로 가져온 assumed (결정 기록 0014 #42). `E`의 형태는 assumed (결정 기록 0014 #43).
- 식의 skill·health는 이번 달 포커스 효과(§4.1)를 적용하기 전 값이다. 집필 포커스의 writing 증가분(§4.1)도 같은 값을 쓴다. 틱 순서는 상태 §7.1 4행.
- `g_k`(계열별 기준 진척)는 학위 소요 기간 레코드로 보정한다.

```
g_k = 100 / ((12·T_k − 6) × M̄)
T_k: statistics-phd-duration-mean-years-{humanities = 6, social = 5, natural = 5.5, engineering = 5.5}
6: 심사·졸업 준비로 남겨 두는 개월
M̄: 자동 진행 정책에서 g 외 배수들의 기댓값. 초기 추정 0.68 → g = 인문 2.23, 사회 2.72, 자연·공학 2.45
Wave 4는 1,000개 seed 모의실험으로 M̄를 추정하고, 동기 중앙 학위 기간이 T_k ± 0.5년에 들도록 g_k를 고정한다.
보정(2026-10-14, docs/oracle/calibration-wave4.md): M̄ = 0.40 → g = 인문 3.79, 사회 4.63, 자연·공학 4.17. 실현된 g 외 배수 평균은 0.46–0.48이므로
이 M̄는 측정값이 아니라 학위 기간 중앙값을 T_k에 맞추는 상수다(논문 요건이 병목이라 §4.4 합격 후 포커스 가중치와 함께 바꿨다).
```

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 학위 소요 기간 | 인문 6, 사회 5, 자연 5.5, 공학 5.5년 | `statistics-phd-duration-mean-years-{humanities,social,natural,engineering}` | KRIVET 2015 구 7계열을 [KEDI7] 키로 대응 | v |
| 구 7계열 → KEDI 키 대응, 2015 값을 2027 입학자에 적용 | — | assumed (결정 기록 0014 #44) | — | a |
| 준비 개월·M̄ | 6, 0.40 (초안 0.68; 보정 2026-10-14) | assumed (결정 기록 0014 #45) | — | a |

### 4.3 수입과 시간

`dutyHours`는 자금 경로의 의무 시간(조교 10시간, 그 밖 0), `jobHours`는 근로 포커스일 때 20시간이다(결정 기록 0014 #40). 수업 기간(`coursework = 1`)은 입학 후 24개월이다.

### 4.4 자동 진행·동기 정책

자동 모드와 동기는 같은 정책을 쓴다(`policy` 스트림). 값은 assumed (결정 기록 0014 #46).

```
포커스: 체력 < 30 또는 마음 < 30 → rest
        활성 초고가 있고 writing < 100 → write (확률 0.6), 아니면 research
        자격시험 합격 후 → thesis 0.3, research 0.1, write 0.5, network 0.1   (보정 2026-10-14: 0.5/0.2/0.2/0.1에서 집필 가중으로, docs/oracle/calibration-wave4.md)
        졸업 직전 구직 중 → network 0.3, thesis 0.7
결정 지점: 각 선택지의 표시 확률로 기대 효용을 매기지 않고, 선택지별 고정 가중치로 뽑는다
        post-qualifying 합격 (A 0.7, B 0.2, C 0.1) · 불합격 (A 0.7, B 0.2, C 0.1)
        first-paper-verdict 거절 (A 0.3, B 0.6, C 0.1) · 수정 (A 0.6, B 0.3, C 0.1) · 채택 (A 0.5, B 0.2, C 0.3)
        funding-expiry (A 0.5, B 0.3, C 0.1, D 0.1)
        pre-graduation-path: §8 분포
        career-5y (A 0.6, B 0.2, C 0.1, D 0.1) · career-10y (A 0.5, B 0.3, C 0.1, D 0.1) · pre-retirement (A 0.6, B 0.2, C 0.2)
```

### 4.5 휴학·이탈·번아웃

KEDI 휴학률·중도탈락률(0013 §1)을 월 위험률로 바꿔 쓴다. KISTEP 휴학 경험률(`statistics-leave-stem` 0.125, `statistics-leave-other` 0.188)은 서사 문구에만 쓰고 확률에 쓰지 않는다(0013 §1).

```
h_leave(k)   = hazard_month(r_leave,k)   × exp(−0.8·z(mind) − 0.4·z(health))
h_dropout(k) = 0.5 × hazard_month(r_drop,k) × exp(−0.8·z(mind) − 0.5·z(relation))
번아웃: health < 15 또는 mind < 15인 달마다 P = 0.10 → 강제 휴학 6개월
휴학 기간: 6개월 또는 12개월, 각 0.5
휴학 중: 등록금·장려금 없음, 진척 정지, 체력·마음 각 월 +3, 근로 가능(월 200만 원, 결정 기록 0014 #36)
```

| KEDI 계열 | 연 휴학률 (2024) | 월 h_leave | 연 중도탈락률 (2024) | 월 hazard_month | 배경 이탈(× 0.5) |
|---|---|---|---|---|---|
| 인문 | 0.188 | 0.01720 | 0.064 | 0.00550 | 0.00275 |
| 사회 | 0.19 | 0.01741 | 0.064 | 0.00550 | 0.00275 |
| 자연 | 0.081 | 0.00701 | 0.048 | 0.00409 | 0.00205 |
| 공학 | 0.08 | 0.00692 | 0.046 | 0.00392 | 0.00196 |

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| 연 휴학률 | 위 표 | `statistics-phd-leave-rate-{humanities,social,natural,engineering}` | [KEDI7] 재적 분모 | v |
| 연 중도탈락률 | 위 표 | `statistics-phd-dropout-rate-{humanities,social,natural,engineering}` | [KEDI7] 재적 분모 | v |
| 재적 대비 휴학생 비율을 연 발생률로 읽고 월로 환산 | 공식 | assumed (결정 기록 0014 #47) | — | a |
| 능력치 보정 계수 | 0.8·0.4·0.5 | assumed (결정 기록 0014 #48) | — | a |
| 배경 이탈 비중 | 0.5 (나머지는 자격시험 3회 불합격·재학연한·재정 파탄·자발 이탈로 생긴다) | assumed (결정 기록 0014 #49) | — | a |
| 휴학 기간 | 6 또는 12개월 | assumed (결정 기록 0014 #50) | — | a |
| 번아웃 | 문턱 15, 월 0.10, 휴학 6개월 | assumed (결정 기록 0014 #51) | — | a |

### 4.6 보정 목표 (Wave 4·6 모의실험)

| 목표 | 기준값 | 근거 | 허용 범위 |
|---|---|---|---|
| 학위 기간 중앙값 | 계열별 T_k | `statistics-phd-duration-mean-years-{…}` (v) | ± 0.5년 |
| 휴학 비율(레코드와 같은 스톡 정의: 휴학 달 ÷ 재적 달; 보조 지표로 12개월 창 안 휴학 경험 비율) | 계열별 연 휴학률(휴학생 ÷ 재적) | `statistics-phd-leave-rate-{…}` (v) | ± 30% |
| 연간 이탈 비율(모든 경로 합) | 계열별 연 중도탈락률 | `statistics-phd-dropout-rate-{…}` (v) | ± 30% |
| 학위 취득 후 1년 안 취업 비율 | KSCED 계열별 취업률 | `statistics-employed-{…}` (v) | ± 0.10 |

허용 범위는 assumed (결정 기록 0014 #52).

## 5. 돈: 등록금·장려금·생활비·대출

### 5.1 등록금

- 학기 경계 달(3월·9월)에 청구한다. 휴학 중이면 청구하지 않는다.
- 값 선택 순서: (1) 학과별 등록금 레코드 7건(`departments-snu-statistics-tuition` 등, 근거 색인 §1), (2) `schools-{school}-{field}-tuition`, (3) `schools-{school}-all-tuition`(kaist, postech, gist, dgist), (4) 아래 규칙 (c).
- 수업 기간이 끝난 뒤(수료)는 연구등록금으로 등록금의 0.1을 낸다 (결정 기록 0014 #53).
- 입학금은 0개월째 한 번: `schools-{school}-all-entrance-fee`(17건). 레코드가 없는 kaist·dgist·unist는 0원 (결정 기록 0014 #54).
- 연도가 섞인 등록금(2024·2025·2026)은 보정 없이 그대로 쓰고, 게임 기간 내내 고정한다 (결정 기록 0014 #55).
- 감면: 장학 경로는 학교의 `-scholarship-tuition-rate*` 레코드 중 가장 높은 비율, 과제 경로는 id에 `-ra` 또는 `-ta`가 들어간 감면 레코드가 있으면 그 비율, 자비는 0 (결정 기록 0014 #21).

**규칙 (c): cs 등록금이 없는 학교** (0013 §3, 이월 항목 assumed 규칙 (c))

| 학교 | cs·engineering에 쓰는 값 | math·bio에 쓰는 값 | 근거 | conf |
|---|---|---|---|---|
| hanyang, sogang, khu, pusan, uos | `schools-{school}-engineering-tuition` | 레코드 그대로 | assumed (결정 기록 0014 #57) | v (입력) |
| ewha | 7,341,000원 = 서울 사립 8곳 공학 등록금 중앙값 (감사 변경, 0014 #58) | 6,367,500원 = 같은 8곳 math 등록금 중앙값 (감사 변경, 0014 #59) | assumed (결정 기록 0014 #58, 결정 기록 0014 #59) | v (입력) |

"서울 사립 8곳"은 공학·사회 등록금 레코드가 모두 있는 서울 소재 사립(yonsei, korea, skku, hanyang, sogang, khu, cau, konkuk)이다. uos는 공립이라 빼고, ewha는 대상이라 뺀다. 8곳에서 math와 bio 등록금은 학교마다 같다. 중앙값은 `schools-{yonsei,korea,skku,hanyang,sogang,khu,cau,konkuk}-{engineering,math}-tuition` 8건을 정렬한 4·5번째 값의 평균이다. 감사(2026-10-13) 전에는 8곳의 engineering÷social·math÷social 비율 중앙값을 `schools-ewha-social-tuition`에 곱했으나, 결과가 관측 최대(cau 7,507,000원)를 넘어 관측 중앙값으로 바꿨다(0014 #58·#59, §13). Wave 4 엔진 테스트가 이 중앙값을 레코드에서 다시 계산해 엔진 상수와 비교한다.

### 5.2 장려금

| 경로 | 월액 규칙 | 기간 | 선발·배정 확률 |
|---|---|---|---|
| 장학 | 학교의 `-scholarship-living-*` 레코드 중 하나를 균등 추첨해 월 환산(학기 ÷ 6, 연 ÷ 12, 총액 ÷ 48). 레코드가 없는 학교(unist, khu, pusan, uos)는 생활 장학 0, 감면만 | 48개월 (결정 기록 0014 #24) | `odds(0.60, 0.8·z(skill))` (결정 기록 0014 #22) |
| 과제 | 학교의 `-stipend-min*` 레코드(있으면 첫 번째). 없으면 이공은 `salaries-stipend-stem-living-phd-min` 110만 원, 인문사회는 학교의 BK21 연계 레코드(`-scholarship-living-bk21`, `-stipend-min-bk21`), 그것도 없으면 60만 원 (결정 기록 0014 #27) | 24개월, 끝나면 `funding-expiry` (결정 기록 0014 #26) | 이공 0.85, 인문사회 0.50 (결정 기록 0014 #25) |
| 자비 | 0 | — | 1 |

- 장학 선발에 실패하면 과제 배정을, 과제 배정에 실패하면 자비를 적용한다. 장학 레코드 추첨 규칙은 assumed (결정 기록 0014 #23).
- 가족 지원: 월 0원·30만 원·60만 원을 확률 0.5·0.3·0.2로 정한다 (결정 기록 0014 #11).

| 항목 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| BK21 박사 하한 | 1,600,000원/월 | `salaries-stipend-bk21-phd-min` | — | v |
| 이공 연구생활장려금 박사 하한 | 1,100,000원/월 | `salaries-stipend-stem-living-phd-min` | 이공 | v |
| 학교별 장학·장려금 | 근거 색인 §1 자금 경로 표 | `schools-{school}-…` 79건 | — | v (indexed 1: `schools-hanyang-all-scholarship-living-bk21`, 결정 기록 0014 #28) |

### 5.3 생활비

| 지역 | 학교 | 월 생활비 | 근거 |
|---|---|---|---|
| 수도권 | snu, yonsei, korea, skku, hanyang, sogang, khu, ewha, cau, konkuk, uos | 160만 원 | assumed (결정 기록 0014 #60) |
| 비수도권 | kaist, postech, gist, dgist, unist, pusan, knu, jnu, cnu | 130만 원 | assumed (결정 기록 0014 #60) |

생활비 레코드는 어느 팩에도 없다(근거 색인 §9 결손 12).

### 5.4 대출

```
매월: cash < 0 이면 부족분을 대출(debt += −cash, cash = 0), debt ≤ loanLimit
이자: debt × 0.03 / 12 를 매월 debt에 더한다
loanLimit = 4,200만 원   (보정 2026-10-14: 3,000만 → 4,200만, v3.5 최상위 한도; docs/oracle/calibration-wave4.md)
```

이자율 3%와 한도는 assumed (결정 기록 0014 #61). v3.5는 연 3%, 한도 1,800·3,000·4,200만 원 세 단계다. 초안은 중간값 3,000만 원이었고, Wave 4 보정이 최상위 4,200만 원으로 올렸다(0015 §4).

### 5.5 재정 위기와 종료

`debt ≥ loanLimit`이고 `cash < 0`인 달이 3개월 이어지면 `funding-expiry`를 강제로 띄운다. 그 뒤 다시 3개월 이어지면 `end.reason = financial` (결정 기록 0014 #62). 박사과정은 끝나지만 생애는 경력 단계로 이어진다: 남은 부채를 안고 비학계 경로로 구직한다(§3.1 석사 수료 이탈 규칙, #85).

## 6. 논문 생애주기

### 6.1 졸업 요건 논문 수

`requiredPapers`: 이공 2편(계층 무관), 인문사회 1편(T3 이상). assumed (결정 기록 0014 #63). v3.5는 분야별로 cs [1,2,2,3] 등 출처 없는 분포를 쓴다.

### 6.2 생성과 질

- 집필 포커스에서 활성 초고가 없으면 새 초고를 만든다. writing이 100이 되면 투고한다.

```
quality = clamp(30 + 0.45·skill + 0.08·relation + U(−9, 9) + 0.1·(rigor − 50), 0, 100)
```

앞 네 항은 v3.5 공식(assumed, 결정 기록 0014 #64), 마지막 항은 §2.6.

### 6.3 투고처 계층

| 계층 | 저널 (SJR 사분위) | 학회 (CORE 등급) | 국내 (KCI) | 근거 레코드 패턴 | conf |
|---|---|---|---|---|---|
| T1 | Q1 | A* | — | `venues-journal-{slug}-sjr-quartile` = 1, `venues-conf-{slug}-core-rank` = A* | i (SJR 60건) / v (CORE 22건) |
| T2 | Q2 | A | — | sjr-quartile = 2, core-rank = A | i / v·i(`venues-conf-isscc-core-rank`) |
| T3 | Q3 | B | 등재 | sjr-quartile = 3, core-rank = B, `venues-journal-{slug}-kci` 등재 | i / v / v |
| T4 | Q4 | C | 등재후보 | sjr-quartile = 4, `venues-journal-kosenv-journal-kci` 등 | i / — / v |

- 사분위·등급은 계층일 뿐 채택 확률이 아니다(근거 색인 §3). SJR 60건은 indexed이며 이월 항목 "Scimago 재확인"이 끝나면 verified로 바뀐다.
- 트랙 → venues 분야군 대응 (결정 기록 0014 #65): computer·ai → 컴퓨터과학·인공지능; mathematics → 수학; statistics → 통계학; life_science·neuroscience·systems_biology·bioengineering → 생명과학; mechanical·electrical·semiconductor·energy → 기계·전기전자공학; chemical·materials → 화학·재료공학; civil·environmental → 토목·환경공학; sociology → 사회학; economics → 경제학; political·public_administration → 정치학·행정학; psychology → 심리학; history·philosophy·korean_literature → 역사학·철학·한국문학; english_literature·linguistics·law(#70) → 분야군 없음(이름 없는 "가상 학술지 T1–T4"를 쓰고 화면에 창작 표시).
- 학회는 computer·ai 트랙에서만 투고처로 나온다(채택률·CORE 레코드가 CS 계열 학회뿐이다).

### 6.4 판정

```
p_acc = odds(p_tier, γ·(quality − 55) + 0.25·(attempts − 1) + 수정 보정(§3.2), lo 0.05, hi 0.90),  γ = 0.04
u < p_acc                                   → 채택
u < p_acc + min(0.95 − p_acc, 0.29)         → 수정 요구
그 밖                                        → 거절
심사 기간 = U{field 범위} 개월, 확률 0.18로 1–3개월 지연
field 범위(v3.5): cs [2,6], math [4,10], bio [3,8], engineering [3,7], social [4,9], humanities [4,10]
수정 후 재심 기간 = ceil(심사 기간 / 2)
```

계층 기준 채택 확률 `p_tier`:

| 계층 | p_tier | 근거 | conf |
|---|---|---|---|
| 채택률 레코드가 있는 학회 14곳 | 그 학회 값: acl 0.189, chi 0.253, cvpr 0.252, dac 0.2256, eccv 0.279, emnlp 0.2216, iccv 0.24, iclr 0.274, icml 0.269, icra 0.3779, neurips 0.2452, osdi 0.2003, sigmod 0.332, sp 0.1471 | `venues-conf-{slug}-acceptance-{year}` 14건 | v 13 / i 1(`venues-conf-icml-acceptance-2025`, 결정 기록 0014 #70) |
| T1 | 0.25 | assumed (결정 기록 0014 #66); 기준점: 14개 학회 채택률 중앙값 (0.2452 + 0.252) / 2 = 0.2486 | a |
| T2 | 0.35 | assumed (결정 기록 0014 #66) | a |
| T3 | 0.45 | assumed (결정 기록 0014 #66) | a |
| T4 | 0.60 | assumed (결정 기록 0014 #66) | a |

- 학회 채택률의 분모는 학회마다 다르다(valid·reviewable·completed 제출 등, 각 note). 저널·인문사회 학술지 채택률 레코드는 없다(근거 색인 §9 결손 14·15).
- 질 계수 γ, 재투고 +0.25, 경계 0.05/0.90, 수정 구간 0.29, 지연 0.18, 심사 기간 범위, 재심 절반은 assumed (결정 기록 0014 #67, 결정 기록 0014 #68, 결정 기록 0014 #69).
- 첫 논문이 아닌 논문의 거절·수정 요구는 결정 지점이 아니다. 화면 설정 "투고 방침"(같은 계층 재투고 / 한 계층 낮춤, 기본값 한 계층 낮춤)을 따른다.
- 채용 확률에 쓰는 논문 점수: `S = Σ w(tier)`, w = T1 3, T2 2, T3 1.5, T4 1 (결정 기록 0014 #71).

## 7. 자격시험과 학위 심사

### 7.1 자격시험

```
응시 창: enrolledMonths = 12, 18, 24, …  (창마다 응시 여부를 고른다. 자동 정책은 skill ≥ 45면 응시, 아니면 확률 0.3으로 응시)
P(합격) = odds(0.70, 1.2·z(skill) + 0.3·z(health), + 0.25·(시도 − 1), lo 0.10, hi 0.95)
3회 불합격 → end.reason = dropout
```

- 기준점: v3.5 합격 확률 `min(0.95, 0.65 + 0.05 × 시도)`의 첫 시도 값 0.70을 기준 확률로 쓴다. v3.5의 응시 자격 "역량 ≥ 44"는 결정적 문턱이라 쓰지 않고, 역량을 로짓 항으로 옮겼다. 12개월째부터 6개월 간격도 v3.5에서 가져왔다.
- 기준 0.70, 계수, 경계, 3회 상한, 응시 창, 자동 응시 규칙은 assumed (결정 기록 0014 #72). 자격시험 합격률 레코드는 없다(근거 색인 §9 결손 8).

### 7.2 학위 심사

```
자격: qualified, project ≥ 100, 채택 논문 ≥ requiredPapers, pre-graduation-path 결정 완료
P(통과) = odds(0.73, 1.0·z(skill) + 0.4·z(relation) + 0.3·z(health), + 0.6·(시도 − 1), lo 0.40, hi 0.95)
불합격 → 6개월 뒤 재심
통과 → 다음 학기 경계 달에 학위 취득, stage = career
```

- 기준점: v3.5 `clamp(0.35 + skill·0.004 + relationship·0.001 + energy·0.001 + attempts·0.08, 0.40, 0.94)`에 모든 능력치 50, 첫 시도를 넣은 값 0.35 + 0.20 + 0.05 + 0.05 + 0.08 = 0.73. 하한 0.40도 v3.5를 따랐다.
- 기준·계수·경계·재심 간격은 assumed (결정 기록 0014 #73). 심사 통과율 레코드는 없다(근거 색인 §9 결손 10).

## 8. 졸업 직전 진로 분기 분포 (0013 §5)

운에 맡기기와 동기 정책이 `pre-graduation-path`에서 쓰는 분포다. 플레이어가 직접 고르면 이 분포는 쓰지 않는다. 출처가 없으므로 세 레코드 묶음을 조합한 assumed 분포다.

```
P(창업) = w_self                                  # 비임금근로자 비율
P(경로 r) = (1 − w_self) × [ perm_f × A_r + (1 − perm_f) × F_r ]     r ∈ {학계, 공공, 산업}
perm_f: KSCED 계열 f의 정규직 비율
A_r: 정규직 일자리의 경로 배분(가정)
F_r: 비정규직(박사후 등) 일자리의 경로 배분 = 박사후 재원 비율
```

| 입력 | 값 | 근거 | 계열 체계 | conf |
|---|---|---|---|---|
| w_self | 0.025 | `statistics-nonwage-share` (창업·자영의 대리값) | [KSCED10] 합산 | v |
| perm_f | ict 0.615, engineering 0.566, natural-math 0.396, social 0.25, business-law 0.344, arts-humanities 0.185 | `statistics-form-permanent-{f}-2021-2024` | [KSCED10] | v |
| F_r (이공) | 학계 = 대학 0.609 + 기타 0.06 = 0.669; 공공 = 정부 0.145 + 공공연 0.137 = 0.282; 산업 = 민간연 0.018 + 기업 0.031 = 0.049 | `statistics-postdoc-funder-{university,other,government,public-institute,private-institute,private-company}` | [KISTEP] 과학기술인력 | v |
| F_r (인문사회) | 학계 0.80, 공공 0.15, 산업 0.05 | assumed (결정 기록 0014 #74); 0013 §1 "대학 비율을 높인 가정값" | [game] | a |
| A_r (이공) | 산업 0.60, 공공 0.25, 학계 0.15 | assumed (결정 기록 0014 #75) | [game] | a |
| A_r (인문사회) | 학계 0.35, 공공 0.30, 산업 0.35 | assumed (결정 기록 0014 #75) | [game] | a |
| 4년 합산 perm_f를 쓰는 것 | 계열별 값이 합산판만 있음 | assumed (결정 기록 0014 #76) | — | a |
| 비임금근로자 비율을 창업 확률로 쓰는 것 | — | assumed (결정 기록 0014 #77) | — | a |

결과 분포:

| KSCED 계열 | 해당 트랙 | 학계 | 공공 | 산업 | 창업 |
|---|---|---|---|---|---|
| ict | computer, ai | 0.341 | 0.256 | 0.378 | 0.025 |
| engineering | 공학 9개 트랙 | 0.366 | 0.257 | 0.352 | 0.025 |
| natural-math | 자연 5개 트랙 | 0.452 | 0.263 | 0.261 | 0.025 |
| social | sociology, political, psychology | 0.670 | 0.183 | 0.122 | 0.025 |
| business-law | economics, public_administration, law (#70) | 0.629 | 0.197 | 0.149 | 0.025 |
| arts-humanities | 인문 5개 트랙 | 0.699 | 0.173 | 0.103 | 0.025 |

검산 예(ict): 0.975 × [0.615 × 0.15 + 0.385 × 0.669] = 0.975 × 0.3498 = 0.341.

## 9. 경력 단계: 급여, 5·10년 전환, 은퇴

### 9.1 경로별 급여

모든 금액은 세전 연봉(원)이다. 호봉표 값은 월 본봉이므로 × 12 × 수당 배수로 바꾼다.

| 경로 | 시작 연봉 | 근거 | conf | 해마다 |
|---|---|---|---|---|
| 교수(사립) 조교수 / 부교수 / 교수 | 5,177만 / 7,860만 / 10,139만 | 규칙 (a) 감사 수정(0014 #87): 교수 = `salaries-faculty-private-professor-mean`(2024), 아래 직급 = 교수 × 2017 직급 비(4,918/9,631, 7,466/9,631) | i (입력 7건) | 직급 안에서 고정 (결정 기록 0014 #78) |
| 교수(국립) | 호봉 n의 월봉 × 12 × 1.3 | 규칙 (b): `salaries-public-univ-faculty-{n}`, `salaries-public-univ-career-adjust-{assistant-professor,associate-professor,professor}` | v (입력) / a (규칙) | +1호봉 (결정 기록 0014 #79) |
| 비정년트랙 교원 | 3,871만 | `salaries-faculty-private-nontenure-mean` | i (결정 기록 0014 #80) | +3% (결정 기록 0014 #78) |
| 박사후(출연연) | 5,172만 | `salaries-institutes-kribb-postdoc` | v | 계약 기간 고정 |
| 박사후(대학) | 3,780만 | assumed (결정 기록 0014 #81); v3.5 박사후 월 250–380만의 중간 315만 × 12 | a | 계약 기간 고정 |
| 시간강사 | 박사 학교의 시급 × 주 6시간 × 32주. 박사 학교에 레코드가 없으면(dgist, unist: 강사 0명) 18건 중앙값 74,565원 | `salaries-faculty-{school}-lecturer-hourly-hourly`(18건, 중앙값 74,565원 → 14,316,480원) | v / 시수 a (결정 기록 0014 #82) | 시급 고정 |
| 출연연(이공) 원급 / 선임 / 책임 | 기관별 레코드 | `salaries-institutes-{etri,kaeri,kimm,kist,kisti,kribb,krict}-{new-hire,senior-researcher,principal-researcher}` | v | +3% (결정 기록 0014 #78) |
| 출연연(인문사회) | 5,247.2만 | `salaries-entry-nonscitech-annual-current-job-2022`를 대리값으로 사용 (결정 기록 0014 #83) | v (값) / a (사용) | +3% |
| 연구직 공무원 연구사 / 연구관 | 호봉 n의 월봉 × 12 × 1.3 | `salaries-public-researcher-{n}`, `salaries-public-research-officer-{n}` | v (입력) / a (규칙, 결정 기록 0014 #90) | +1호봉 |
| 기업(이공) | 6,304.4만 | `salaries-entry-scitech-annual-current-job-2021`을 대리값으로 사용 (결정 기록 0014 #84) | v (값) / a (사용) | +3%, 승진 시 +10% |
| 기업(인문사회) | 5,247.2만 | `salaries-entry-nonscitech-annual-current-job-2022`를 대리값으로 사용 (결정 기록 0014 #84) | v (값) / a (사용) | +3%, 승진 시 +10% |
| 창업 | 해마다 로그정규(중앙값 3,000만, σ = 0.8) | assumed (결정 기록 0014 #85) | a | 매년 새로 추첨 |
| 임시직(브리지) | 2,400만 | assumed (결정 기록 0014 #86); v3.5 bridge 월 170–240만 | a | 고정 |

출연연(이공) 기관별 값:

| 기관 | 원급 초임 | 선임급 초임 | 책임급 초임 | conf |
|---|---|---|---|---|
| etri | 4,500만 | 5,800만 | 7,300만 | v |
| kaeri | 5,000만 | 6,600만 | 9,100만 | v |
| kimm | 4,700만 | 6,200만 | 7,900만 | v |
| kist | 4,800만 | 6,700만 | 9,200만 | v |
| kisti | 4,600만 | 5,700만 | 7,100만 | v |
| kribb | 4,600만 | 6,100만 | 8,100만 | v |
| krict | 4,800만 | 6,700만 | 8,600만 | v |

출연연 채용은 7기관 중 하나를 균등하게 뽑는다(0013 §6 "ONE ST 초임 레코드가 있는 7기관을 대표로"). 선임·책임 승진 때 그 기관의 해당 직급 초임으로 바꾼다.

**규칙 (a): 사립대 교원 급여 조합** (0013 §3, 이월 항목 assumed 규칙 (a), 결정 기록 0014 #87, 감사 변경 2026-10-13)

```
연봉(사립, 교수)   = salaries-faculty-private-professor-mean                              (2024, i) = 10,139만
연봉(사립, 부교수) = 교수 × pay2017_{사립,부교수} / pay2017_{사립,교수} = 10,139만 × 7,466 / 9,631 = 7,860만
연봉(사립, 조교수) = 교수 × pay2017_{사립,조교수} / pay2017_{사립,교수} = 10,139만 × 4,918 / 9,631 = 5,177만
```

| 설립 | 교수 2017 | 부교수 2017 | 조교수 2017 | 직급 비(교수 기준) 부교수 / 조교수 | 연봉 교수 / 부교수 / 조교수 |
|---|---|---|---|---|---|
| 사립 | 9,631만 | 7,466만 | 4,918만 | 0.7752 / 0.5106 | 10,139만 / 7,860만 / 5,177만 |
| 국공립 | 9,557만 | 7,842만 | 6,519만 | (참고만) | 규칙 (b) 호봉표 |

연봉은 반올림하지 않은 비로 계산했다(네 자리 비로 곱하면 ±1만 원 차이). 입력: `salaries-faculty-private-professor-mean`(2024, conf i), `salaries-faculty-private-{professor,associate-professor,assistant-professor}-mean-2017`(3건, conf i). 감사 전 방식(전 직급 평균 `salaries-faculty-all-fulltime-mean` × 2017 직급 비)은 사립 교수가 관측 평균보다 약 30% 높게 나와 폐기했다(0014 #87, §13). 국공립 2017 값(`salaries-faculty-national-{professor,associate-professor,assistant-professor}-mean-2017`)은 규칙 (b)의 수당 배수 기준점(0014 #89)에만 쓴다.

**규칙 (b): 국립대 교원·연구직 공무원 초임 호봉** (0013 §3, 이월 항목 assumed 규칙 (b))

```
초임 호봉 n0 = clamp(기산 8 + (임용 나이 − 24) + 가감_r, 1, 33)       # 박사 학위 가산 0
가감_r: 교수 −10, 부교수 −7, 조교수 −4   (salaries-public-univ-career-adjust-*, v)
연봉 = salaries-public-univ-faculty-{n} × 12 × 1.3,  해마다 n += 1
연구직 공무원 연구사: 같은 식에 가감 −4, 상한 36, salaries-public-researcher-{n}
연구관 승진: n_officer = max(1, n_researcher − 5), salaries-public-research-officer-{n}
```

| 항목 | 값 | 근거 | conf |
|---|---|---|---|
| 기산 호봉 8, 학사 졸업 24세, 졸업 후 모든 기간 경력 인정 | — | assumed (결정 기록 0014 #88); 별표 15·16 미수집 | a |
| 박사 가산 | 0 | 0013 §3, `salaries-public-univ-career-adjust-*` (박사 가산 규정 없음) | v (입력) |
| 수당 배수 | 1.3 | assumed (결정 기록 0014 #89); 기준점 `salaries-faculty-national-professor-mean-2017` 9,557만 ÷ (`salaries-public-univ-faculty-30` 6,232,600 × 12) = 1.278 (연도 다름) | a (기준점 i·v) |
| 연구관 호봉 환산 | −5 | assumed (결정 기록 0014 #90) | a |
| 국립대 비율 | 교수 채용 중 국립 0.3 | assumed (결정 기록 0014 #91) | a |

예: 35세 신임 국립대 조교수는 n0 = 8 + 11 − 4 = 15, 연봉 = 3,816,100 × 12 × 1.3 = 59,531,160원(`salaries-public-univ-faculty-15`, v).

### 9.2 경력 중 논문

학계·출연연 경로에서는 해마다 경력 논문 1편(T2 상당, 점수 2)을 `odds(0.50, 1.0·z(skill))`로 얻는다 (결정 기록 0014 #92). `career-10y`의 연구 집중 선택은 기준을 0.70으로 올린다.

### 9.3 5·10년 전환과 계약

모든 승진·전환 확률은 `odds(p0, 0.8·z(skill) + 0.4·z(network) + 0.4·z(relation) + 0.15·min(S, 10), lo 0.05, hi 0.95)`이다. S는 §6.4 논문 점수(박사과정 + 경력). 계수는 assumed (결정 기록 0014 #93).

| 경로 | 시점 | 전환 | p0 | 근거 |
|---|---|---|---|---|
| 교수 | career-5y | 조교수 → 부교수 | 0.75 | assumed (결정 기록 0014 #94) |
| 교수 | career-10y | 부교수 → 교수 | 0.75 | assumed (결정 기록 0014 #94) |
| 비정년트랙 | career-5y | 정년트랙 조교수 전환 | 0.15 | assumed (결정 기록 0014 #94) |
| 출연연 | career-5y | 원급 → 선임급 | 0.70 | assumed (결정 기록 0014 #94) |
| 출연연 | career-10y | 선임급 → 책임급 | 0.60 | assumed (결정 기록 0014 #94) |
| 연구직 공무원 | career-10y | 연구사 → 연구관 | 0.40 | assumed (결정 기록 0014 #94) |
| 기업 | career-5y, career-10y | 승진(연봉 +10%) | 0.60 | assumed (결정 기록 0014 #94) |
| 박사후 | 계약 만료(2년) | 재계약 | 0.50 | assumed (결정 기록 0014 #95) |
| 시간강사 | 계약 만료(1년) | 재계약 | 0.70 | assumed (결정 기록 0014 #95) |
| 창업 | 매년 | 폐업 | 0.20 | assumed (결정 기록 0014 #85) |

승진 연한·확률 레코드는 없다(근거 색인 §9 결손 21). 실패하면 직급을 유지하고 다음 결정 지점까지 다시 시도하지 않는다. 재계약에 실패하거나 폐업하면 구직(노동시장 스펙 §3)으로 돌아간다.

### 9.4 은퇴와 노후 수입

```
retireAge: 교수(국립·사립) 65, 출연연 61, 연구직 공무원 60, 그 밖 U{60, …, 67}
노후 월수입 = 55만 원 + min(0.6 × W_last, a_route × 근속연수 × W_last)
   W_last: 은퇴 시점 월 급여(연봉 ÷ 12; 평균 급여를 저장하는 필드가 없어 평균 대신 쓴다), a_route: 공적연금 경로(교수·연구직 공무원) 0.019, 그 밖 0.010
```

- 정년 나이 65·61·60은 법령·기관 규정을 수집하지 않아 assumed (결정 기록 0014 #99). U{60…67}은 v3.5 상수를 기준점으로 한 assumed (결정 기록 0014 #100). 기록은 80세에 끝난다(상태 스펙 §2).
- 노후 월수입 공식은 assumed (결정 기록 0014 #101). 기준점: v3.5 `55 + min(150, 근속연수 × 3.5)` 만원. 55만 원 항을 그대로 쓰고, 근속 항을 급여에 비례하게 바꿔 경로 차이를 남겼다. 연금·퇴직금 레코드는 없다(근거 색인 §9 결손 23).

## 10. `same_unit_as` 규칙

- 근거: 결정 기록 0011(두 트랙에 걸친 학과는 트랙마다 레코드를 두고 note에 `same_unit_as`), 0013 §4(한 번만 세기, 대표 레코드, 보완 3건).
- 현재 데이터: note에 `same_unit_as`가 있는 레코드 45건(0013 PR 전 42건 + 보완 3건 `departments-kaist-civil`, `departments-gist-environmental`, `departments-pusan-computer`). 묶음 22개(쌍 21, 3건 묶음 1), 고유 학과 단위 460 = 483 − 23.

**규칙**

1. 묶음은 같은 학교 안에서 같은 학과를 가리키는 레코드의 집합이다. 아래 표가 정본이다.
2. 선택 화면, 운에 맡기기 가중치(§2.2), 통계 집계는 묶음을 학과 하나로 센다. 트랙별 가중치는 묶음 크기 k로 나눠 1/k씩 준다.
3. 대표 레코드: (1) 번호 접미(`-2`, `-3` …)가 없는 레코드를 먼저, (2) 그 안에서 id 사전순 첫 레코드. 0013 §4는 "id 사전순 첫 레코드, v3.5 slug가 있으면 그것"이라고 했다. v3.5 단위는 모두 번호 접미가 없지만(결정 기록 0011), 접미가 없다고 v3.5 단위인 것은 아니다(추가 단위 243건 중 접미가 붙은 것은 87건뿐). 그래서 레코드만으로 확인할 수 있는 근사로 "접미 없음 우선"을 쓴다. 이 근사가 사전순 규칙과 다른 묶음은 17번(uos)과 22번(jnu 환경에너지공학과) 두 개다. v3.5 단위 여부는 확인하지 않았다(v3.5 `department-data.js` 대조는 Wave 4).
4. 묶음의 학과는 대표 레코드의 NRF 코드·학과명으로 보여주고, 다른 구성원의 트랙은 "세부 트랙 선택지"로 보여준다. 플레이어가 고른 세부 트랙이 `choices.track`이 된다.
5. 한 학과에 전공이 둘 이상인 묶음(18 pusan 정보융합공학과, 20 jnu 전자컴퓨터공학과, 21 jnu 수학/통계학과)은 학과 하나, 전공 선택지 여럿으로 센다(0013 §4).
6. 학과별 등록금 레코드(§5.1)는 구성원 레코드 기준으로 찾는다. 대표가 아닌 구성원에 등록금 레코드가 있으면 그 값을 쓴다.

**묶음 표 (22개)**

| # | 구성원 레코드 | 학과명(대표 note 첫 칸) | 대표 레코드 | 엔진 단위 키 |
|---|---|---|---|---|
| 1 | departments-kaist-civil, departments-kaist-environmental | 건설및환경공학과 | departments-kaist-civil | `kaist/civil` |
| 2 | departments-gist-computer, departments-gist-electrical | 전기전자컴퓨터공학과 | departments-gist-computer | `gist/computer` |
| 3 | departments-gist-energy, departments-gist-environmental | 환경·에너지공학과 | departments-gist-energy | `gist/energy` |
| 4 | departments-dgist-computer, departments-dgist-electrical | 전기전자컴퓨터공학과 | departments-dgist-computer | `dgist/computer` |
| 5 | departments-unist-chemical, departments-unist-energy | 에너지화학공학과 | departments-unist-chemical | `unist/chemical` |
| 6 | departments-unist-civil, departments-unist-environmental | 지구환경도시건설공학과 | departments-unist-civil | `unist/civil` |
| 7 | departments-yonsei-life_science, departments-yonsei-systems_biology | 생명과학부 | departments-yonsei-life_science | `yonsei/life_science` |
| 8 | departments-yonsei-civil, departments-yonsei-environmental | 건설환경공학과 | departments-yonsei-civil | `yonsei/civil` |
| 9 | departments-skku-computer, departments-skku-electrical | 전자전기컴퓨터공학과 | departments-skku-computer | `skku/computer` |
| 10 | departments-hanyang-english_literature, departments-hanyang-linguistics | 영어영문학과 | departments-hanyang-english_literature | `hanyang/english_literature` |
| 11 | departments-sogang-english_literature, departments-sogang-linguistics | 영어영문학과 | departments-sogang-english_literature | `sogang/english_literature` |
| 12 | departments-khu-english_literature, departments-khu-linguistics | 영어영문학과 | departments-khu-english_literature | `khu/english_literature` |
| 13 | departments-ewha-ai, departments-ewha-computer | 인공지능·소프트웨어학부 | departments-ewha-ai | `ewha/ai` |
| 14 | departments-ewha-electrical, departments-ewha-semiconductor | 융합전자반도체공학부 | departments-ewha-electrical | `ewha/electrical` |
| 15 | departments-ewha-chemical, departments-ewha-materials | 화공신소재공학과 | departments-ewha-chemical | `ewha/chemical` |
| 16 | departments-konkuk-civil, departments-konkuk-environmental | 사회환경공학부 | departments-konkuk-civil | `konkuk/civil` |
| 17 | departments-uos-computer-2, departments-uos-electrical | 전자전기컴퓨터공학과 | departments-uos-electrical (사전순 첫 id와 다름) | `uos/electrical` |
| 18 | departments-pusan-ai, departments-pusan-bioengineering, departments-pusan-computer | 정보융합공학과(AI전공) | departments-pusan-ai | `pusan/ai` |
| 19 | departments-pusan-civil, departments-pusan-environmental | 사회환경시스템공학과 | departments-pusan-civil | `pusan/civil` |
| 20 | departments-jnu-computer, departments-jnu-electrical-2 | 전자컴퓨터공학과(컴퓨터과학전공) | departments-jnu-computer | `jnu/computer` |
| 21 | departments-jnu-mathematics, departments-jnu-statistics | 수학/통계학과(수학전공) | departments-jnu-mathematics | `jnu/mathematics` |
| 22 | departments-jnu-energy-2, departments-jnu-environmental | 환경에너지공학과 | departments-jnu-environmental (사전순 첫 id와 다름) | `jnu/environmental` |

**데이터 치환은 감사 커밋에서 실행했다(45건, 구 표기는 `same_unit_as(구 표기)`로 보존, 검사 출력은 PR #36 본문).** 이월 항목의 완료 조건은 45건 note의 `same_unit_as` 대상을 레코드 id로 바꾸는 것이다. 그것은 데이터 수정이라 스펙 초안 역할의 범위 밖이다. 위 표의 구성원 → 대표 대응이 치환 입력이다(예: `departments-kaist-environmental` note → `same_unit_as departments-kaist-civil`). 근거 색인 부록 A의 42건 해석과 이 표는 모두 일치하고, 보완 3건의 대상은 `departments-kaist-civil` → `departments-kaist-environmental`, `departments-gist-environmental` → `departments-gist-energy`, `departments-pusan-computer` → `departments-pusan-ai`·`departments-pusan-bioengineering`이다.

## 11. 학과 엔진 키 형식

결정 기록 0011이 Wave 4로 미룬 "의미 있는 slug"의 형식을 정한다.

- 레코드 id(`departments-{school}-{slug}`)는 바꾸지 않는다. 엔진 키는 레코드 id와 별개의 대응표로 둔다. 데이터 출처 추적을 깨지 않기 위해서다.
- **단위 키**: `<school_id>/<unit_slug>`. `unit_slug`는 소문자 ASCII, 숫자, `-`, `_`만 쓰고 32자 이하다.
  - 번호 접미가 없는 레코드: 현재 slug 그대로(예: `snu/computer`, `jnu/life_science`). v3.5 단위와 저장 호환을 지킨다.
  - 번호 접미 레코드 87건: 학과명(note 첫 칸)을 짧은 영어 이름으로 옮긴 slug(아래 표).
- **레코드 키**: 묶음(§10)에 속하지 않으면 단위 키와 같다. 묶음에 속하면 `<대표의 단위 키>@<track>`(예: `uos/electrical@computer`).
- 유일성: 483건 전체에서 레코드 키가 서로 다르고, 단위 키(`@` 앞)는 460개다. 이 표는 스크립트로 검사했다(중복 0).
- 같은 이름이 다른 학교에 있으면 학교 접두로 구별한다(예: `snu/aerospace`, `kaist/aerospace`, `yonsei/aerospace`; `knu/polymer`, `jnu/polymer`, `cnu/polymer`).
- 새 키를 정하지 못한 레코드는 없다.

**번호 접미 slug 87건 → 엔진 키**

| # | 레코드 id | 학과명 | track | 엔진 키 | 비고 |
|---|---|---|---|---|---|
| 1 | departments-snu-computer-2 | [협]정보보호전공 | computer | `snu/information-security` | — |
| 2 | departments-snu-neuroscience-2 | [협]뇌과학전공 | neuroscience | `snu/brain-science` | — |
| 3 | departments-snu-bioengineering-2 | 응용바이오공학과 | bioengineering | `snu/applied-bioengineering` | — |
| 4 | departments-snu-life_science-2 | [협]유전공학전공 | life_science | `snu/genetic-engineering` | — |
| 5 | departments-snu-mechanical-2 | 항공우주공학과 | mechanical | `snu/aerospace` | — |
| 6 | departments-snu-mechanical-3 | 조선해양공학과 | mechanical | `snu/naval-ocean` | — |
| 7 | departments-snu-political-2 | 국제학과 | political | `snu/international-studies` | — |
| 8 | departments-snu-history-2 | 동양사학과 | history | `snu/asian-history` | — |
| 9 | departments-snu-history-3 | 서양사학과 | history | `snu/western-history` | — |
| 10 | departments-kaist-ai-2 | AI컴퓨팅학과 | ai | `kaist/ai-computing` | — |
| 11 | departments-kaist-ai-3 | AI시스템학과 | ai | `kaist/ai-systems` | — |
| 12 | departments-kaist-ai-4 | AX학과 | ai | `kaist/ax` | — |
| 13 | departments-kaist-ai-5 | AI미래학과 | ai | `kaist/ai-future` | — |
| 14 | departments-kaist-computer-2 | 정보보호대학원 | computer | `kaist/information-security` | — |
| 15 | departments-kaist-ai-6 | 데이터사이언스대학원 | ai | `kaist/data-science` | — |
| 16 | departments-kaist-bioengineering-2 | 공학생물학대학원 | bioengineering | `kaist/engineering-biology` | — |
| 17 | departments-kaist-mechanical-2 | 항공우주공학과 | mechanical | `kaist/aerospace` | — |
| 18 | departments-kaist-environmental-2 | 환경에너지공학학제전공 | environmental | `kaist/environmental-energy` | — |
| 19 | departments-kaist-semiconductor-2 | 인공지능반도체대학원 | semiconductor | `kaist/ai-semiconductor` | — |
| 20 | departments-kaist-environmental-3 | 녹색성장지속가능대학원 | environmental | `kaist/green-growth-sustainability` | — |
| 21 | departments-postech-systems_biology-2 | 융합대학원 합성생물학전공 | systems_biology | `postech/synthetic-biology` | — |
| 22 | departments-postech-materials-2 | 첨단재료과학부 | materials | `postech/advanced-materials` | — |
| 23 | departments-postech-energy-2 | 배터리공학과(친환경소재대학원) | energy | `postech/battery` | — |
| 24 | departments-postech-materials-3 | 철강전공(친환경소재대학원 친환경소재학과) | materials | `postech/steel` | — |
| 25 | departments-gist-ai-2 | AX학과 | ai | `gist/ax` | — |
| 26 | departments-gist-semiconductor-2 | 반도체특성화대학원 | semiconductor | `gist/semiconductor-specialized` | — |
| 27 | departments-unist-energy-2 | 원자력공학과 | energy | `unist/nuclear` | — |
| 28 | departments-unist-energy-3 | 탄소중립대학원 | energy | `unist/carbon-neutrality` | — |
| 29 | departments-yonsei-civil-2 | 도시공학과 | civil | `yonsei/urban-planning` | — |
| 30 | departments-yonsei-civil-3 | 건축공학과 | civil | `yonsei/architectural-engineering` | — |
| 31 | departments-yonsei-mechanical-2 | 항공우주공학과 | mechanical | `yonsei/aerospace` | — |
| 32 | departments-yonsei-energy-2 | 기후변화에너지융합기술협동과정 | energy | `yonsei/climate-energy-program` | — |
| 33 | departments-yonsei-semiconductor-2 | 융합반도체협동과정 | semiconductor | `yonsei/semiconductor-program` | — |
| 34 | departments-yonsei-semiconductor-3 | 시스템반도체공학과 | semiconductor | `yonsei/system-semiconductor` | — |
| 35 | departments-yonsei-energy-3 | 이차전지융합공학과 | energy | `yonsei/secondary-battery` | — |
| 36 | departments-korea-bioengineering-2 | 융합생명공학과 | bioengineering | `korea/convergence-bioengineering` | — |
| 37 | departments-skku-computer-2 | 컴퓨터공학과(일반트랙) | computer | `skku/computer-engineering-general` | — |
| 38 | departments-skku-ai-2 | AI시스템공학과 | ai | `skku/ai-systems` | — |
| 39 | departments-skku-ai-3 | AI응용공학과 | ai | `skku/applied-ai` | — |
| 40 | departments-skku-ai-4 | 인공지능융합학과 | ai | `skku/ai-convergence` | — |
| 41 | departments-skku-bioengineering-2 | 융합생명공학과 | bioengineering | `skku/convergence-bioengineering` | — |
| 42 | departments-skku-bioengineering-3 | 바이오메카트로닉스학과 | bioengineering | `skku/biomechatronics` | — |
| 43 | departments-skku-energy-2 | 저탄소에너지공학과 | energy | `skku/low-carbon-energy` | — |
| 44 | departments-skku-energy-3 | 에너지과학과 | energy | `skku/energy-science` | — |
| 45 | departments-hanyang-computer-2 | 정보시스템학과 | computer | `hanyang/information-systems` | — |
| 46 | departments-hanyang-ai-2 | 데이터사이언스학과 | ai | `hanyang/data-science` | — |
| 47 | departments-hanyang-mechanical-2 | 미래자동차공학과 | mechanical | `hanyang/future-automotive` | — |
| 48 | departments-hanyang-electrical-2 | 전기공학과 | electrical | `hanyang/electrical-engineering` | — |
| 49 | departments-hanyang-materials-2 | 유기나노공학과 | materials | `hanyang/organic-nano` | — |
| 50 | departments-hanyang-energy-2 | 원자력공학과 | energy | `hanyang/nuclear` | — |
| 51 | departments-hanyang-energy-3 | 배터리공학과 | energy | `hanyang/battery` | — |
| 52 | departments-hanyang-environmental-2 | 환경과학과 | environmental | `hanyang/environmental-science` | — |
| 53 | departments-hanyang-semiconductor-2 | 나노반도체공학과 | semiconductor | `hanyang/nano-semiconductor` | — |
| 54 | departments-hanyang-public_administration-2 | 정책학과 | public_administration | `hanyang/policy-studies` | — |
| 55 | departments-khu-computer-2 | 소프트웨어융합학과 | computer | `khu/software-convergence` | — |
| 56 | departments-khu-life_science-2 | 유전생명공학과 | life_science | `khu/genetic-bioengineering` | — |
| 57 | departments-khu-electrical-2 | 전자정보융합공학과 | electrical | `khu/electronic-info-convergence` | — |
| 58 | departments-ewha-ai-2 | 데이터사이언스학과 | ai | `ewha/data-science` | — |
| 59 | departments-ewha-life_science-2 | 바이오융합과학과 | life_science | `ewha/bio-convergence` | — |
| 60 | departments-cau-energy-2 | 지능형에너지산업융합학과 | energy | `cau/intelligent-energy-industry` | — |
| 61 | departments-konkuk-life_science-2 | 생명공학과 | bioengineering | `konkuk/biotechnology` | slug 트랙(life_science) ≠ note track(bioengineering) |
| 62 | departments-konkuk-bioengineering-2 | 생물공학과 | bioengineering | `konkuk/biological-engineering` | — |
| 63 | departments-uos-computer-2 | 전자전기컴퓨터공학과 | computer | `uos/electrical@computer` | 묶음 17(same_unit_as) |
| 64 | departments-uos-public_administration-2 | 도시행정학과 | public_administration | `uos/urban-administration` | — |
| 65 | departments-pusan-chemical-2 | 화학소재학과 | chemical | `pusan/chemical-materials` | — |
| 66 | departments-knu-computer-2 | 소프트웨어학과 | computer | `knu/software` | — |
| 67 | departments-knu-ai-2 | 데이터융합컴퓨팅학과 | ai | `knu/data-convergence-computing` | — |
| 68 | departments-knu-energy-2 | 에너지융합 및 기후변화학과 | energy | `knu/energy-climate-change` | — |
| 69 | departments-knu-materials-2 | 첨단소재공학부 금속재료공학전공 | materials | `knu/metallurgical-materials` | — |
| 70 | departments-knu-materials-3 | 고분자공학과 | materials | `knu/polymer` | — |
| 71 | departments-knu-mechanical-2 | 정밀기계공학과 | mechanical | `knu/precision-mechanical` | — |
| 72 | departments-knu-bioengineering-2 | 의용생체공학과 | bioengineering | `knu/biomedical-engineering` | — |
| 73 | departments-jnu-life_science-2 | 생명과학기술학과 | life_science | `jnu/life-science-technology` | — |
| 74 | departments-jnu-electrical-2 | 전자컴퓨터공학과(전자공학전공) | electrical | `jnu/computer@electrical` | 묶음 20(same_unit_as) |
| 75 | departments-jnu-computer-2 | 지능전자컴퓨터공학과 | computer | `jnu/intelligent-electronic-computer` | — |
| 76 | departments-jnu-computer-3 | 컴퓨터공학과 | computer | `jnu/computer-engineering` | — |
| 77 | departments-jnu-ai-2 | 빅데이터과학과 | ai | `jnu/big-data-science` | — |
| 78 | departments-jnu-materials-2 | 고분자공학과 | materials | `jnu/polymer` | — |
| 79 | departments-jnu-energy-2 | 환경에너지공학과 | energy | `jnu/environmental@energy` | 묶음 22(same_unit_as) |
| 80 | departments-jnu-civil-2 | 건설·환경공학과 | civil | `jnu/civil-environmental` | — |
| 81 | departments-cnu-history-2 | 국사학과 | history | `cnu/korean-history` | — |
| 82 | departments-cnu-electrical-2 | 전기공학과 | electrical | `cnu/electrical-engineering` | — |
| 83 | departments-cnu-electrical-3 | 전파정보통신공학과 | electrical | `cnu/radio-info-communication` | — |
| 84 | departments-cnu-materials-2 | 유기응용재료공학과 | materials | `cnu/organic-materials` | — |
| 85 | departments-cnu-materials-3 | 고분자공학과 | materials | `cnu/polymer` | — |
| 86 | departments-cnu-mechanical-2 | 메카트로닉스공학과 | mechanical | `cnu/mechatronics` | — |
| 87 | departments-cnu-life_science-2 | 생화학과 | life_science | `cnu/biochemistry` | — |

## 12. 신뢰도 표시와 재확인 연결

이월 항목 "신뢰도 표시"에 따라, 이 스펙의 근거 표에서 `indexed` 또는 `assumed` 레코드를 쓰는 행을 0014 항목이나 이월 재확인 항목에 연결한다.

| 레코드 | conf | 쓰는 곳 | 연결 |
|---|---|---|---|
| `venues-journal-{slug}-sjr-quartile` 60건 | i | §6.3 계층 | 이월 항목 "Scimago 재확인" |
| `venues-conf-icml-acceptance-2025` | i | §6.4 p_tier | 결정 기록 0014 #70 |
| `venues-conf-isscc-core-rank` | i | §6.3 T2 | 결정 기록 0014 #70 |
| `salaries-faculty-private-{professor,associate-professor,assistant-professor}-mean-2017` | i | §9.1 규칙 (a) 직급 비 | 결정 기록 0014 #87 |
| `salaries-faculty-national-professor-mean-2017` | i | §9.1 규칙 (b) 수당 배수 기준점 | 결정 기록 0014 #89 |
| `salaries-faculty-private-nontenure-mean` | i | §9.1 비정년 | 결정 기록 0014 #80 |
| `salaries-faculty-private-professor-mean` | i | §9.1 규칙 (a) 감사 수정 후 사립 교수 기준값(계산에 씀) | 결정 기록 0014 #87 |
| `schools-postech-all-tuition`, `schools-postech-all-entrance-fee`, `schools-ewha-all-entrance-fee` | i | §5.1 | 결정 기록 0014 #56 |
| `schools-hanyang-all-scholarship-living-bk21` | i | §5.2 | 결정 기록 0014 #28 |
| `departments-pusan-psychology`, `departments-knu-mechanical`, `departments-knu-philosophy` | i | §2.4 | 이월 항목 "모집요강 재확인" |
| `nar-hs-early-career-5`, `nar-hs-early-career-6`, `nar-hs-mid-career-5` | i | §3 서사 | 서사는 확률에 쓰지 않음(장면 근거만) |

## 13. 감사 변경 요약 (2026-10-13, fable)

- §5.1 ewha 등록금: 비율 곱 대신 서울 사립 8곳 관측 중앙값(공학 7,341,000 · math 6,367,500). 0014 #58·#59.
- §9.1 규칙 (a) 사립 교원: 교수를 관측 평균(10,139만, 2024)에 고정하고 부교수·조교수는 2017 직급 비로 산출. 전 직급 평균 × 1.31 방식은 폐기. 국립대 값은 호봉표(규칙 b) 그대로. 0014 #87.
- 교수 채용 확률 상한 0.10 (노동 §2.3, 0014 #104).
- 감사 표: `docs/superpowers/specs/2026-10-13-wave3-audit.md`.
