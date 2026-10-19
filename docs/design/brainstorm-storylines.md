# 스토리라인과 사건 후보 브레인스토밍 (#138, 2026-10-15)

사용자 요청(2026-10-15): 별도 Opus가 관할하는 Sonnet·Haiku 브레인스토밍 workflow를 따로 열어, 연구노트에 붙는 사건의 후보군을 늘리고 더 현실적인 내용으로 만든다. 이 문서는 설계 브레인스토밍이고, 팩 파일 형식 확정과 화면 연결은 design 세션과 조율한 뒤 후속 PR(풀 리퀘스트)에서 한다.

- 작성 과정: Sonnet 정찰 4명 + 조건 목록 1명 → Opus brief → Haiku 12명·Sonnet 4명 → Fable 감사 → Opus 정리.
  - 정찰은 대학원생·연구자 경험 기록을 읽고 현실 근거(anchor) 52개를 자기 말로 정리했다(§1). 조건 목록 담당은 엔진 상태 필드, 기록 키, 결정 지점을 모았다.
  - Opus brief는 한 줄 메모 brief 12개와 스토리라인 brief를 만들고, 근거 52개를 모두 최소 한 brief에 배정했다. Haiku 12명이 한 줄 메모를, Sonnet 4명이 스토리라인을 썼다.
  - Fable 감사는 한 줄마다 keep(유지)·revise(수정)·drop(삭제)을 정하고, #124 일상 문장 120줄도 같은 기준으로 판정했다.
  - Opus 정리는 판정을 반영하고, 감사 이유에만 적힌 조건 수정과 실명·영문 약어 두 건을 추가로 고쳤다. 정리 단계에서 고친 곳은 감사 칸에 "정리"로 따로 표시했다.
- 자동 거름: 초안 240줄, 길이 0·숫자 2·중복 0 제외, 감사 누락 id [].
- 감사 결과(한 줄 메모 238줄): 유지 139, 수정 97, 삭제 2. 스토리라인 24개: 유지 13, 수정 11, 삭제 0. 일상 문장 120줄: 유지 59, 수정 61, 삭제 0.
- 팩 파일: [`data/text/flavor.ko.json`](../../data/text/flavor.ko.json)(한 줄 메모 236줄과 일상 문장 120줄, 항목마다 `category`·`stage`·`text`·`tags`)과 [`data/text/storylines.ko.json`](../../data/text/storylines.ko.json)(스토리라인 24개). 감사를 통과한 후보만 담는다. 모든 항목은 `creative: true`다. 형식·문장 규칙과 실명 0건은 `scripts/validate-data.mjs`가 검사한다. 아래 본문의 `lines`·`daily`·`storylines`는 이 두 파일의 항목 묶음을 가리킨다.
- 규칙은 [brainstorm-random-lines.md](brainstorm-random-lines.md)를 따른다: 선택지 없는 한 줄, 15~45자, 숫자 없음, 실제 인물·학교·회사·기관·사업 이름 없음, 원작과 출처 문장 복사 없음. 이번 회차부터 문장은 현재형으로 쓴다(감사 기준). 결혼·자녀 상태는 엔진에 없으므로 배우자·자녀·손주 장면은 쓰지 않는다.

## 1. 현실 근거

정찰 4명이 공개된 경험 기록을 읽고 근거 52개(인문사회 26, 이공 26)로 정리했다. 아래는 근거마다 상황을 한 문장으로 요약한 것이고, 출처는 레코드 id로만 적는다(원문 인용 없음). 표의 출연연은 정부출연연구기관의 줄임말이다. "쓰인 곳"은 그 근거로 쓴 스토리라인이다(— 는 스토리라인 없음). 근거 52개는 모두 한 줄 메모 brief 중 적어도 하나에 들어갔다.

### 인문사회

| 단계 | 근거 | 상황 | 출처 레코드 | 쓰인 곳 |
|---|---|---|---|---|
| 입학 | hs-phd-01 | 직장인이나 중년 전문직, 석사 졸업자가 박사 진학을 고민한다. | nar-hs-admission-1, nar-hs-admission-3, nar-hs-admission-7 | — |
| 입학 | hs-phd-02 | 입학 전 지원자가 어느 학교와 어느 지도교수를 고를지 정보가 부족한 채 정해야 한다. | nar-hs-admission-2, nar-hs-admission-5, nar-hs-defense-2 | — |
| 입학 | hs-phd-03 | 지원자가 학업계획서와 지원서류를 쓰려는데 믿을 만한 정보가 부족하고 마감이 가깝다. | nar-hs-admission-4, nar-hs-admission-6 | — |
| 수업 기간 | hs-phd-04 | 직장을 다니는 학생이 야간 수업과 선수과목, 영어 논문 읽기, 통계 수업을 병행한다. | nar-hs-coursework-1, nar-hs-coursework-2, nar-hs-coursework-3 | — |
| 수업 기간 | hs-phd-05 | 박사과정에 올라가도 석사 때와 비슷한 개론 수업이 반복되고, 연구 방법과 논문 쓰기, 강의법은 수업에서 배울 수 없다. | nar-hs-coursework-4, nar-hs-coursework-5 | story-hs-phd-3 |
| 자격시험 | hs-phd-06 | 수료 단계에서 종합시험과 영어시험을 준비하고, 통과한 뒤에는 연구계획서 승인과 연구 방향 설정이 이어진다. | nar-hs-qualifying-1, nar-hs-qualifying-2, nar-hs-qualifying-3 | story-hs-phd-6 |
| 첫 논문 | hs-phd-07 | 학위 청구에 필요한 등재지 논문을 처음 투고한다. | nar-hs-first-paper-1, nar-hs-first-paper-2, nar-hs-first-paper-3 | — |
| 자금 | hs-phd-08 | 인문학 대학원생이 조교 근로로 학비와 생활비 일부를 충당하려 한다. | nar-hs-funding-2, nar-hs-funding-3, nar-hs-funding-11 | story-hs-phd-1 |
| 자금 | hs-phd-09 | 연구실 안에서 지도교수가 학생 인건비와 근로장학금을 걷거나, 연구실 짐을 나르는 일 같은 노동을 시킨다. | nar-hs-funding-9, nar-hs-funding-10, nar-hs-thesis-9 | story-hs-phd-5 |
| 자금 | hs-phd-10 | 박사과정생이 프로젝트 보조 일, 신진 연구자 사업, 학위논문 집필 장학금, 대학 자체 연구장학금 같은 지원 구조 사이에서 돈을 마련한다. | nar-hs-funding-4, nar-hs-funding-6, nar-hs-funding-8, nar-hs-funding-12 | — |
| 자금 | hs-phd-11 | 인문사회 대학원생이 등록금과 생활비를 과외, 논술 지도, 시간강사, 아르바이트, 학자금 대출로 메운다. | nar-hs-funding-1, nar-hs-funding-5, nar-hs-funding-13, nar-hs-thesis-6 | story-life-family-retire-2 |
| 학위논문 | hs-phd-12 | 학위논문 주제를 정하고 방법을 세우는 단계다. | nar-hs-thesis-1, nar-hs-thesis-2, nar-hs-thesis-3, nar-hs-thesis-4 | story-hs-phd-2 |
| 학위논문 | hs-phd-13 | 논문 단계에서 수료자가 시간강사와 다른 일을 병행하고, 글이 안 풀리고 건강이 상하며, 주변 동료가 대학원을 떠난다. | nar-hs-thesis-5, nar-hs-thesis-8, nar-hs-thesis-10, nar-hs-qualifying-4 | story-hs-phd-4, story-life-family-retire-1 |
| 학위 심사 | hs-phd-14 | 여러 차례 발표와 심사를 거쳐 학위를 받는다. | nar-hs-defense-1, nar-hs-defense-3 | — |
| 경력 초기 | hs-career-01 | 지방대 인문학 강사가 적은 강의 시수와 낮은 시간당 단가로 연 소득이 매우 적은 상태를 몇 해째 이어 간다. | nar-hs-early-career-1, nar-hs-early-career-12 | — |
| 경력 초기 | hs-career-02 | 강의가 없는 방학 두 달 동안 강의료가 끊기고 과외 등 부수입도 사라진다. | nar-hs-early-career-2, nar-hs-early-career-10, nar-hs-early-career-13 | — |
| 경력 초기 | hs-career-03 | 여러 번 임용에 지원했거나 공고를 지켜본 박사가 내정자가 있다는 판단으로 지원을 접는다. | nar-hs-early-career-4, nar-hs-early-career-15, nar-hs-early-career-19 | — |
| 경력 초기 | hs-career-04 | 학계에서 안정된 자리를 얻지 못한 연구자가 학계 밖 생계 수단을 검토하거나 대학을 떠난다. | nar-hs-early-career-3, nar-hs-early-career-7, nar-hs-early-career-20 | — |
| 경력 초기 | hs-career-05 | 강사 제도 개편을 전후해 대학은 강사 자리를 줄이고 비정년 전임을 늘렸고, 정부는 후속세대 지원사업을 개편해 대학 소속이 없어도 신청할 수 있게 했다. | nar-hs-early-career-8, nar-hs-early-career-9 | story-career-4 |
| 경력 초기 | hs-career-06 | 정년이 보장되지 않는 전임교원 자리나 신임교수 자리에 부임한 연구자가 수업 준비와 연구 성과 압박 사이에서 균형을 잡지 못한다. | nar-hs-early-career-5, nar-hs-early-career-6 | — |
| 경력 초기 | hs-career-07 | 전임으로 알고 지원했으나 강의전담 계약이거나, 기간제 연구원 계약을 쪼개 이어 가거나, 사립대 강사로서 처우 차이를 겪는다. | nar-hs-early-career-17, nar-hs-early-career-18, nar-hs-early-career-21 | — |
| 경력 중기 | hs-career-08 | 비정년 전임교원이 20년을 일하고도 승진하지 못한 채 같은 직급에 머문다. | nar-hs-mid-career-1, nar-hs-mid-career-4, nar-hs-mid-career-5 | story-career-6 |
| 경력 중기 | hs-career-09 | 박사 후 10년 안팎 시간강사로 일하는 연구자가 시급제 보수, 방학 무급, 배정 불확실성 속에서 매 학기를 시작한다. | nar-hs-mid-career-3, nar-hs-mid-career-6, nar-hs-mid-career-9 | — |
| 경력 중기 | hs-career-10 | 시간강사나 계약 연구교수가 정년트랙 진입 가능성이 보이지 않는 상황에서 학계에 남을지 떠날지 결정한다. | nar-hs-mid-career-2, nar-hs-mid-career-8 | story-life-family-retire-3 |
| 은퇴 | hs-career-11 | 정년퇴직한 교수가 시간이 느리게 흐르고 사회와 단절된 느낌을 받는다. | nar-hs-retirement-1, nar-hs-retirement-2 | story-life-family-retire-4 |
| 은퇴 | hs-career-12 | 정년을 앞둔 교수들은 강의·연구·평가·행정에 밀려 은퇴 준비를 못 하고 퇴임 한 학기 전에야 생각한다. | nar-hs-retirement-3, nar-hs-retirement-4, nar-hs-retirement-5 | story-life-family-retire-5 |

### 이공

| 단계 | 근거 | 상황 | 출처 레코드 | 쓰인 곳 |
|---|---|---|---|---|
| 입학 | stem-phd-01 | 학부 졸업을 앞둔 학생이 뚜렷한 연구 주제 없이 박사 진학을 고른다. | nar-stem-admission-1, nar-stem-admission-3, nar-stem-admission-4 | — |
| 입학 | stem-phd-02 | 지원자가 지도교수가 될 사람과 직접 접촉해 연구실을 탐색한다. | nar-stem-admission-2, nar-stem-admission-5, nar-stem-admission-7 | — |
| 입학 | stem-phd-03 | 입학시험 정보가 과목 목록뿐이라 준비 방법이 막막한 지원자가 있고, 한편에서는 정부 연구개발 예산 삭감으로 연구실이 신규 학생을 받지 못한다. | nar-stem-admission-6, nar-stem-admission-8, nar-stem-funding-9 | story-stem-phd-4 |
| 수업 기간 | stem-phd-04 | 신입 대학원생이 연구실이라는 새 환경에 적응한다. | nar-stem-coursework-3, nar-stem-coursework-6, nar-stem-coursework-7 | — |
| 수업 기간 | stem-phd-05 | 1~2년차 대학원생이 수업, 연구실 잡무, 회식, 병역 대체복무 준비, 전공 전환 보충 학습을 한꺼번에 소화한다. | nar-stem-coursework-1, nar-stem-coursework-2, nar-stem-coursework-4, nar-stem-coursework-5 | — |
| 자격시험 | stem-phd-06 | 박사과정생이 자격시험(과목 시험 또는 발표 심사)을 치른다. | nar-stem-qualifying-1, nar-stem-qualifying-2, nar-stem-qualifying-3 | — |
| 첫 논문 | stem-phd-07 | 첫 논문을 투고하고 거절과 수정 요구를 받는다. | nar-stem-first-paper-1, nar-stem-first-paper-2, nar-stem-first-paper-5 | story-stem-phd-6 |
| 첫 논문 | stem-phd-08 | 논문 저자 목록과 순서를 정하는 과정에서 첫 저자 학생이 지도교수나 떠난 선배의 요구와 부딪힌다. | nar-stem-first-paper-3, nar-stem-first-paper-4 | story-stem-phd-2 |
| 첫 논문 | stem-phd-09 | 박사 중후반의 연구자가 학회에서 비교로 자존감이 흔들리거나, 답이 알려져 있지 않은 질문 앞에서 연구의 의미를 새로 정의하고, 작업 방식을 정비한다. | nar-stem-first-paper-6, nar-stem-thesis-1, nar-stem-thesis-5 | story-stem-phd-6 |
| 자금 | stem-phd-10 | 대학원생의 인건비와 노동 조건이 연구실의 과제 구조에 묶여 있다. | nar-stem-funding-1, nar-stem-funding-2, nar-stem-funding-3, nar-stem-funding-5 | story-stem-phd-3 |
| 자금 | stem-phd-11 | 연구과제의 행정 규칙과 예산 변동이 실험의 흐름을 막는다. | nar-stem-funding-4, nar-stem-funding-10, nar-stem-funding-11, nar-stem-funding-12 | story-stem-phd-4 |
| 자금 | stem-phd-12 | 학생이 연구비와 장비 구축을 둘러싸고 선택한다. | nar-stem-funding-6, nar-stem-funding-7, nar-stem-funding-8 | story-stem-phd-1 |
| 학위논문 | stem-phd-13 | 지도교수와 학생의 소통 방식이 학위 과정을 좌우한다. | nar-stem-thesis-2, nar-stem-thesis-3, nar-stem-thesis-4 | story-stem-phd-5 |
| 학위 심사 | stem-phd-14 | 학위 심사 당일이다. | nar-stem-defense-1, nar-stem-defense-2, nar-stem-defense-3, nar-stem-defense-4 | — |
| 경력 초기 | stem-career-01 | 출연연 계약직 박사 연구원들이 기관 방침으로 계약 만료 몇 달 전에 나갈 준비를 하라는 말을 듣고, 노조·소송·지도교수 추천이 한꺼번에 얽힌 선택을 해야 한다. | nar-stem-early-career-1, nar-stem-early-career-2, nar-stem-early-career-16 | story-career-1 |
| 경력 초기 | stem-career-02 | 연구원이 1~3년 단위 계약을 반복하며 직급과 안정성 사이에서 계산한다. | nar-stem-early-career-3, nar-stem-early-career-5, nar-stem-early-career-7 | — |
| 경력 초기 | stem-career-03 | 국내 연구실에서만 지내던 연구자가 해외 학회나 방문 연구에서 훨씬 빠른 연구 속도와 토론 문화를 처음 보고 진로를 바꾼다. | nar-stem-early-career-8, nar-stem-early-career-9 | — |
| 경력 초기 | stem-career-04 | 미국 박사후연구원을 준비하는 졸업생이 지원 서류와 비자 단계에서 절차와 신원 확인에 막힌다. | nar-stem-early-career-10, nar-stem-early-career-11 | story-career-2 |
| 경력 초기 | stem-career-05 | 졸업 직후 실험 실패, 논문 거절, 무응답 메일이 겹치는 구직 시기를 지나며 이력서 갱신 압박을 느낀다. | nar-stem-early-career-12, nar-stem-early-career-14, nar-stem-early-career-15 | story-career-3 |
| 경력 초기 | stem-career-06 | 좋은 조건의 제안을 받은 지원자가 연봉보다 연구 자율성과 역할을 따져 선택한다. | nar-stem-early-career-6, nar-stem-mid-career-3 | — |
| 경력 초기 | stem-career-07 | 연구실에서 후배나 학생에게 일을 맡기고 저자 자리나 지도 방식을 어떻게 정할지 결정한다. | nar-stem-early-career-13, nar-stem-mid-career-7 | — |
| 경력 중기 | stem-career-08 | 연구자가 확신했던 증명이나 방법이 틀렸음을 늦게 알게 되고, 동시에 중간 평가에서 연구 실적 부족 경고를 받는다. | nar-stem-mid-career-1, nar-stem-mid-career-2 | story-career-5 |
| 경력 중기 | stem-career-09 | 대형 과제나 연구교수 연구비가 끝날 때가 가까워지면서 후속 과제 공백과 갱신 불확실성을 걱정한다. | nar-stem-mid-career-4, nar-stem-mid-career-6 | — |
| 경력 중기 | stem-career-10 | 지방대 연구실은 인력이 모자라 과제 수주와 졸업생 취업이 어렵고, 채용 시장에서는 해외 학위자가 선호된다. | nar-stem-mid-career-5, nar-stem-early-career-4 | — |
| 은퇴 | stem-career-11 | 정년을 맞은 원로 연구자의 노하우와 인맥은 논문과 특허에 남지 않고, 중소 제조업체와 스타트업에서 일할 길도 매끄럽지 않다. | nar-stem-retirement-1, nar-stem-retirement-2, nar-stem-retirement-3 | story-life-family-retire-6 |
| 은퇴 | stem-career-12 | 연구직 정년과 임금피크제를 두고 정년 연장, 인재 유출, 재채용 사례가 엇갈려 논의된다. | nar-stem-retirement-4, nar-stem-retirement-5 | — |

입학 단계 근거 6개(hs-phd-01·02·03, stem-phd-01·02·03)는 박사과정 4개월째 전에는 메모가 붙지 않으므로 회상 형태로만 썼다. 근거가 얇은 곳(정년트랙 중견 연구자, 공공 연구직, 인문 트랙별 실무, 실험실 장비 일상)은 제도를 지어내지 않도록 물건과 절차 수준으로만 썼다. 병역 대체복무는 엔진에 해당 상태가 없어 뺐다.

## 2. 한 줄 메모 후보

범주는 기존 다섯 개(연구실 일상, 연구와 논문, 돈과 일, 사람들, 박사 이후)를 그대로 쓴다. "조건"은 팩 파일의 `when`과 같다. 정리 단계가 brief의 조건과 각 줄의 태그(트랙 이름, 포커스, 수업 기간·논문 단계, 지도교수 유형, 경로·직급)로 기계적으로 만들었고, 태그만으로 조건이 안 나오는 줄은 줄마다 따로 정했다. 엔진 필드 이름은 조건 목록 담당이 모은 상태 필드를 따른다.

- 연구실 일상은 `field`에 트랙 id를 단다. 그 밖 범주에서 "인문사회"·"이공" 태그는 `choices.group` 조건으로 옮겼다.
- "구간"(하위·상위 구간)은 아직 수치가 없다. 연결 PR에서 가정 상수로 정한다.
- 감사 표시: 유지 = keep, 수정 = revise(고친 문장을 실음), 수정(정리) = 정리 단계에서 한 번 더 고침.
- 감사 플래그 처리: `가족 전제`(5줄)는 부모·배우자를 특정하는 말을 본가·가족·부모처럼 넓혀 고쳤다. `실명`(1줄)은 감사가 고친 문장에도 특정 지원 기관을 떠올리게 하는 이름이 남아 정리 단계에서 일반 표현으로 바꿨다. `분야 전제`(1줄)는 특정 분야 장비를 재료비로 일반화했다. `유사 중복`(1줄)은 용도를 갈라 고쳤다. `중복`(1줄)은 삭제했다.
- 국회 회의록과 국정감사는 특정 기관 이름이 아니라 제도를 가리키는 일반 명사로 보고 남겼다. 출연연(정부출연연구기관)도 연구기관 종류를 가리키는 일반 명사로 쓴다.

### 연구실 일상 (`phd-daily`)

유지 48, 수정 30, 삭제 0.

#### 연구실 일상: 인문 계열 다섯 트랙

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 영어 논문 발표 순서표에 자기 이름을 적고 읽을 쪽수를 세어 본다. | 역사학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=history AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 선수과목 수업이 조교 맡은 학부 강의와 겹쳐 청강 신청서를 다시 낸다. | 역사학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=history AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 마이크로필름 판독기에 롤을 걸고 연표 칸을 한 줄씩 채운다. | 역사학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=history AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 사료 원문과 번역본을 쪽마다 맞춰 펴 놓고 인용 표를 고친다. | 역사학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=history AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 번역어 후보 목록을 스터디 대화방에 올리고 답이 올 때까지 기다린다. | 철학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=philosophy AND phd.focus=network AND phd.coursework=true | 수정 |
| 박사과정 | 개념어 색인 카드를 강독 노트 뒤편에 한 장씩 덧붙인다. | 철학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=philosophy AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 원전 한 단락을 장 주석 자리에 옮기고 번역 대안을 나란히 적는다. | 철학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=philosophy AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 자격시험 통과 뒤 연구계획서 초안의 문제 제기 문단을 소리 내어 읽는다. | 철학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=philosophy AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 판본 대조를 맡은 조원과 옛 잡지 영인본을 나눠 들고 쪽 번호를 맞춘다. | 국문학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=korean_literature AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 시간강사가 맡은 수업의 일정 조정을 부탁하지 못하고 메모만 남긴다. | 국문학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=korean_literature AND phd.focus=network AND phd.coursework=true | 유지 |
| 박사과정 | 작가 연보의 빈칸을 잡지 발행 연도로 메우고 근거 쪽을 표시한다. | 국문학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=korean_literature AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 재간행본 판권지와 초판 판권지를 나란히 펴고 달라진 출판사 표기를 적는다. | 국문학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=korean_literature AND phd.focus=write AND phd.qualified=true | 수정 |
| 박사과정 | 강독용 번역 대조표를 전날 밤 복사해 원서와 함께 가방에 넣는다. | 영문학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=english_literature AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 스터디원들에게 영어 발표문 초안을 보내고 피드백 날짜를 정한다. | 영문학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=english_literature AND phd.focus=network AND phd.coursework=true | 유지 |
| 박사과정 | 판본 차이를 표로 만들고 본문 기준으로 삼을 판을 지도교수 메모와 맞춘다. | 영문학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=english_literature AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 학회 발표 원고의 영어 문장을 다듬으며 각주의 약어를 풀어 쓴다. | 영문학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=english_literature AND phd.focus=write AND phd.qualified=true | 수정 |
| 박사과정 | 말뭉치 검색 결과를 표 계산 파일로 옮기고 행마다 출처를 적는다. | 언어학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=linguistics AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 동기와 녹음 전사 파일 이름 규칙을 맞추고 공유 폴더에 올린다. | 언어학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=linguistics AND phd.focus=network AND phd.coursework=true | 유지 |
| 박사과정 | 예문 표의 항목마다 화자 코드와 녹음 날짜를 달아 집계표를 다시 짠다. | 언어학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=linguistics AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 음성 분석 화면의 포먼트 곡선을 캡처해 장 본문 그림 자리에 넣는다. | 언어학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=linguistics AND phd.focus=write AND phd.qualified=true | 유지 |

#### 연구실 일상: 사회과학 여섯 트랙

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 통계 수업 과제의 출력 결과를 용어 사전과 대조한다. | 사회학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=sociology AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 연구윤리 심의 신청서에 첨부할 동의서 양식을 학교 서식으로 고친다. | 사회학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=sociology AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 방법론 스터디에서 설문 척도 신뢰도 계산 과제를 나눠 맡는다. | 사회학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=sociology AND phd.focus=network AND phd.coursework=true | 수정 |
| 박사과정 | 국회 회의록에서 의원 발언을 날짜별로 뽑아 코딩표 빈칸을 채운다. | 정치학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=political AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 매주 금요일 영어 논문 발표 자료의 쟁점 슬라이드를 다시 만든다. | 정치학, 집필, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=political AND phd.focus=write AND phd.coursework=true | 유지 |
| 박사과정 | 자격시험 뒤 계획서 승인 요청서를 행정실에 제출하고 접수증을 받는다. | 정치학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=political AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 실험 참여자 모집 공고를 게시판 세 곳에 붙이고 사진을 찍어 둔다. | 심리학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=psychology AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 반응시간 자료의 이상치 기준을 과제 안내문에 적힌 대로 적용한다. | 심리학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=psychology AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 실험실 예약표에 다음 주 사용 시간을 적고 장비 점검 기록을 남긴다. | 심리학, 교류, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=psychology AND phd.focus=network AND phd.qualified=true | 수정 |
| 박사과정 | 선수과목 실험설계 강의 노트를 주차별로 묶어 정리해 둔다. | 심리학, 집필, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=psychology AND phd.focus=write AND phd.coursework=true | 수정 |
| 박사과정 | 공공 통계 자료를 내려받아 변수 정의 표의 단위 열을 고쳐 적는다. | 경제학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=economics AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 계량 수업 과제의 회귀 결과 표를 교수 양식에 맞춰 다시 짠다. | 경제학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=economics AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 앞선 논문의 변수 정의를 빌려 와도 되는지 출처별로 표에 적는다. | 경제학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=economics AND phd.focus=thesis AND phd.qualified=true | 유지 |
| 박사과정 | 종합시험 대비 스터디에서 미시경제 문제 풀이를 돌아가며 칠판에 적는다. | 경제학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=economics AND phd.focus=network AND phd.coursework=true | 수정 |
| 박사과정 | 정부 보고서의 예산 항목과 공문 수치를 한 줄씩 대조해 표로 만든다. | 행정학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=public_administration AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 기관 담당 주무관과 면담 일정을 잡고 질문지를 두 부 출력한다. | 행정학, 교류, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=public_administration AND phd.focus=network AND phd.qualified=true | 수정 |
| 박사과정 | 행정 이론 수업 발표 자료의 쟁점별 요약 카드를 한 장씩 넘겨 본다. | 행정학, 집필, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=public_administration AND phd.focus=write AND phd.coursework=true | 유지 |
| 박사과정 | 판례 검색 결과에서 원심 판결의 판시 사항을 찾아 각주 후보로 옮긴다. | 법학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=law AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 법령 개정 연혁표를 시행일 순서로 붙여 세미나 발제 자료에 넣는다. | 법학, 집필, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=law AND phd.focus=write AND phd.coursework=true | 수정 |
| 박사과정 | 학위청구논문 제출 요건 안내문을 출력해 지도교수 면담에 들고 간다. | 법학, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=law AND phd.focus=thesis AND phd.qualified=true | 수정 |

#### 연구실 일상: 수학·통계·생명 계열

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 칠판 증명의 보조정리 순서를 바꿔 노트에 다시 옮겨 적는다. | 수학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=mathematics AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 세미나 자료의 반례 그림을 노트에 옮겨 그린 뒤 자료를 다음 발표자에게 넘긴다. | 수학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=mathematics AND phd.focus=network AND phd.coursework=true | 수정 |
| 박사과정 | 수강 중인 해석학 과제에서 반례를 찾으려고 가정을 하나씩 지워 본다. | 수학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=mathematics AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 남의 논문 표에 나온 값을 재현하려고 공개 코드의 난수 시드를 맞춘다. | 통계학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=statistics AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 시뮬레이션 반복 실행이 공용 서버 대기열에 막혀 결과 파일을 기다린다. | 통계학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=statistics AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 결측치 처리 방법을 적은 부록 문단을 지도교수 의견대로 고쳐 쓴다. | 통계학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=statistics AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 배양 일정표에 맞춰 세포 계대 날짜를 적고 무균 작업대 예약을 옮긴다. | 생명과학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=life_science AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 시약 주문서의 재고 확인란을 채우고 지도교수 결재가 나기를 기다린다. | 생명과학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=life_science AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 실험동물 관리 당번표에 이번 주 사육실 점검 담당자 이름을 적는다. | 생명과학, 교류, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=life_science AND phd.focus=network AND phd.qualified=true | 유지 |
| 박사과정 | 공용 초고속 원심분리기 사용 기록부에 이번 주 사용 시간을 한 줄 적는다. | 생명과학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=life_science AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 뇌 영상 촬영실 예약 시간이 한 칸 밀려 피험자 안내문을 다시 출력한다. | 신경과학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=neuroscience AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 행동 실험 녹화 영상에서 반응 시점을 프레임 단위로 표시해 표 파일에 옮긴다. | 신경과학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=neuroscience AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 전극 준비실 세척 절차 순서를 벽에 붙은 종이에서 옮겨 적어 둔다. | 신경과학, 교류, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=neuroscience AND phd.focus=network AND phd.qualified=true | 유지 |
| 박사과정 | 방법 절차 문단에 촬영 조건과 피험자 제외 기준을 정리해 지도교수에게 보낸다. | 신경과학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=neuroscience AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 유전체 분석 서버의 작업 대기열을 확인하고 분석 작업을 야간 시간대로 미룬다. | 시스템생물학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=systems_biology AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 공개 데이터베이스 버전이 바뀌어 주석 파일의 열 이름부터 다시 대조한다. | 시스템생물학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=systems_biology AND phd.focus=research AND phd.qualified=true | 유지 |
| 박사과정 | 랩 공용 저장소에 분석 스크립트 사용법을 짧은 문서로 올려 둔다. | 시스템생물학, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=systems_biology AND phd.focus=network AND phd.coursework=true | 유지 |
| 박사과정 | 정제 컬럼 세척 횟수와 용출액 부피를 프로토콜에 맞춰 실험 노트에 다시 적는다. | 생명공학, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=bioengineering AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 멸균기 가동 기록지에 날짜와 서명을 적고 판독 결과를 사진으로 남긴다. | 생명공학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=bioengineering AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 실험 장비 사양을 표로 정리한 방법 장의 참고문헌 번호를 다시 확인한다. | 생명공학, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=bioengineering AND phd.focus=write AND phd.qualified=true | 수정 |

#### 연구실 일상: 컴퓨터·인공지능·공학 계열

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 연구실 공용 서버 접속 권한 신청서를 지도교수 결재함에 올려 둔다. | 컴퓨터, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=computer AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 학회 원고 빌드 스크립트가 깨져 그림 파일 경로부터 다시 맞춘다. | 컴퓨터, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=computer AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 공용 연산 서버 예약표에 이름을 적고 학습 재개 체크포인트 경로를 확인한다. | 인공지능, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=ai AND phd.focus=research AND phd.coursework=true | 수정 |
| 박사과정 | 옆 연구실 세미나에서 평가용 자료 분할 기준이 달라 질문이 오간다. | 인공지능, 교류, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=ai AND phd.focus=network AND phd.coursework=true | 유지 |
| 박사과정 | 시제품 가공 의뢰서에 도면 치수 공차를 적어 공작실에 제출한다. | 기계, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=mechanical AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 오실로스코프 채널 입력 결합을 교류에서 직류로 바꿔 파형을 다시 본다. | 전기전자, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=electrical AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 기판 납땜 부품 목록을 실험 절에 옮기며 부품 번호를 맞춘다. | 전기전자, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=electrical AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 반응기 온도 기록 파일을 열어 승온 구간마다 시료 채취 시각을 적는다. | 화학공학, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=chemical AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 배기 후드 점검표에 날짜를 적고 시약장 목록과 물질안전보건자료 철을 대조한다. | 화학공학, 학위논문, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=chemical AND phd.focus=thesis AND phd.coursework=true | 수정 |
| 박사과정 | 시편 절단기 냉각수 양을 확인하고 연마지 번호 순서대로 시편을 간다. | 재료, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=materials AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 전자현미경 예약 시간이 겹쳐 인장 시험 시편의 광학 사진을 먼저 찍어 둔다. | 재료, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=materials AND phd.focus=thesis AND phd.qualified=true | 수정 |
| 박사과정 | 현장 계측기 설치 허가를 받으려고 출입 신청 서류를 현장 사무소에 낸다. | 토목, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=civil AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 구조물 하중 시험 결과 표의 변위 단위를 원고 기준으로 통일한다. | 토목, 집필, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=civil AND phd.focus=write AND phd.qualified=true | 유지 |
| 박사과정 | 수질 시료병에 채취 날짜와 지점 이름을 쓰고 냉장 상자에 넣는다. | 환경, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=environmental AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 분석 의뢰서 접수 순서가 밀려 공용 분석실 담당자에게 전화로 확인한다. | 환경, 교류, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=environmental AND phd.focus=network AND phd.qualified=true | 유지 |
| 박사과정 | 글러브박스 안에서 코인셀 조립을 마치고 충방전기 채널에 물린다. | 에너지, 연구, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=energy AND phd.focus=research AND phd.qualified=true | 수정 |
| 박사과정 | 방진복 지퍼를 올리고 웨이퍼 운반 상자의 라벨 번호를 대조한다. | 반도체, 연구, 수업 기간 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=semiconductor AND phd.focus=research AND phd.coursework=true | 유지 |
| 박사과정 | 학위논문 공정 조건표에 쓸 웨이퍼 번호를 공정 일지와 맞춰 본다. | 반도체, 학위논문, 논문 단계 | stage=phd AND month>=4 AND phd.leave.active=false AND choices.track=semiconductor AND phd.focus=thesis AND phd.qualified=true | 수정 |

### 연구와 논문 (`research-paper`)

유지 10, 수정 9, 삭제 1.
삭제 사유: line-research-paper-03: 장비 예약표에 추가 실험을 잡는 상황이 -06과 사실상 같고, '비워 두고 가늠한다'는 행동이 모호하다.

#### 연구와 논문: 심사 대기·수정·거절·저자·시험·학위 심사·제출

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 투고 시스템의 상태 표시가 아직 심사 중으로 남아 있다. | 심사 대기, 투고, 인문사회 | stage=phd AND phd.papers[]에 status=submitted가 몇 달째 유지 AND choices.group=인문사회 | 유지 |
| 박사과정 | 지도교수와 학회 초록을 논문보다 먼저 낼지를 두고 이야기한다. | 심사 대기, 지도교수, 인문사회 | stage=phd AND phd.papers[]에 status=submitted가 몇 달째 유지 AND choices.group=인문사회 | 수정 |
| 박사과정 | 서로 어긋나는 심사위원 지적 두 건에 답변서 항목을 따로 나눠 쓴다. | 수정, 심사위원 의견, 인문사회 | stage=phd AND 그 달 기록 decision.first-paper-verdict.revise.* AND choices.group=인문사회 | 수정 |
| 박사과정 | 지도교수가 고쳐 온 문단과 원래 원고의 문체를 나란히 놓고 대조한다. | 수정, 문체 대조, 인문사회 | stage=phd AND 그 달 기록 decision.first-paper-verdict.revise.* AND choices.group=인문사회 | 유지 |
| 박사과정 | 추가 실험 요구 항목마다 장비 예약표에 날짜를 넣어 본다. | 수정, 추가 실험, 이공 | stage=phd AND 그 달 기록 decision.first-paper-verdict.revise.* AND choices.group=이공 | 유지 |
| 박사과정 | 거절 통보를 받고 심사평에서 되풀이된 지적만 따로 뽑아 적는다. | 탈락, 재투고 준비, 이공 | stage=phd AND 그 달 기록 decision.first-paper-verdict.reject.* AND choices.group=이공 | 유지 |
| 박사과정 | 한 단계 낮은 학술지 목록을 동료와 비교해 다음 투고처를 고른다. | 탈락, 학술지 선택, 인문사회 | stage=phd AND 그 달 기록 decision.first-paper-verdict.reject.* AND choices.group=인문사회 | 유지 |
| 박사과정 | 거절된 원고의 서론 첫 두 문단을 새 투고용으로 고쳐 쓴다. | 탈락, 재투고 준비 | stage=phd AND 그 달 기록 decision.first-paper-verdict.reject.* | 유지 |
| 박사과정 | 실험을 도와준 동료의 이름이 공저자 대신 감사의 글에만 남는다. | 저자, 감사의 글, 이공 | stage=phd AND phd.papers[] 중 하나가 draft에서 submitted로 바뀐 달 AND choices.group=이공 | 수정 |
| 박사과정 | 떠난 선배가 공저자 자리를 요구하는 메일을 지도교수에게 전달한다. | 저자, 저자 순서, 인문사회 | stage=phd AND phd.papers[] 중 하나가 draft에서 submitted로 바뀐 달 AND choices.group=인문사회 | 유지 |
| 박사과정 | 외국어시험 점수가 기준에 못 미쳐 재응시 신청서를 낸다. | 자격시험, 불합격, 인문사회 | stage=phd AND 그 달 기록 log.qual-fail AND choices.group=인문사회 | 유지 |
| 박사과정 | 학과 게시판에 붙은 종합시험 합격자 명단에서 수험번호를 찾는다. | 자격시험, 합격, 인문사회 | stage=phd AND 그 달 기록 log.qual-pass AND choices.group=인문사회 | 수정 |
| 박사과정 | 발표 심사에서 해석이 부족하다는 지적을 받고 재심사 일정 규정을 찾아본다. | 자격시험, 불합격, 이공 | stage=phd AND 그 달 기록 log.qual-fail AND choices.group=이공 | 수정 |
| 박사과정 | 심사위원끼리의 비공개 논의가 끝나고 복도에서 통과 판정을 전해 듣는다. | 학위 심사, 통과, 인문사회 | stage=phd AND 그 달 기록 log.defense-pass AND choices.group=인문사회 | 수정 |
| 박사과정 | 통계 방법을 캐묻는 질문이 이어지더니 판정은 수정 후 재심사로 나온다. | 학위 심사, 불통과, 이공 | stage=phd AND 그 달 기록 log.defense-fail AND choices.group=이공 | 수정 |
| 박사과정 | 발표용 노트북과 포인터를 미리 연결해 두고 예상 질문 목록을 다시 본다. | 학위 심사, 통과, 이공 | stage=phd AND 그 달 기록 log.defense-pass AND choices.group=이공 | 수정 |
| 박사과정 | 심사 뒤 수정본을 인준지와 함께 행정실에 낸다. | 제출, 인준지 서명, 인문사회 | stage=phd AND 그 달 기록 log.degree AND choices.group=인문사회 | 유지 |
| 박사과정 | 제본소에서 찾은 논문 한 부를 도서관 제출 서류와 맞춰 본다. | 제출, 제본, 이공 | stage=phd AND 그 달 기록 log.degree AND choices.group=이공 | 유지 |
| 경력 | 출연연 과제 결과를 묶은 원고를 보내기 전에 공저자 순서를 마지막으로 확인한다. | 경력 논문, 연구직, 이공 | stage=career AND career.route=institute AND career.careerPapers가 늘어난 해 AND choices.group=이공 | 수정 |

### 돈과 일 (`money-work`)

유지 9, 수정 11, 삭제 0.

#### 돈과 일: 박사과정의 조교·과제·근로·재정 위기·휴학 근로

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 방학 중에도 평일 종일 조교 근무가 배정되어 있다. | 조교 근무, 방학 | stage=phd AND phd.fundingState.dutyHours>0 AND month%12 in {4,5,10,11}(방학 달) | 유지 |
| 박사과정 | 종합시험 접수 마감일 학과 사무실에 혼자 남아 접수 명단을 확인한다. | 조교 근무, 학과 행정 | stage=phd AND phd.fundingState.dutyHours>0 | 유지 |
| 박사과정 | 조교 순번제를 건의하러 학과장실 앞까지 갔다가 문을 두드리지 못하고 돌아선다. | 조교 근무, 신입 | stage=phd AND phd.fundingState.dutyHours>0 AND month<=12 | 수정 |
| 박사과정 | 연구비 인건비 지급 명세서에서 세금을 떼고 남은 실수령액을 다시 확인한다. | 과제 참여, 명세서 | stage=phd AND phd.fundingState.route=project AND phd.participation>0 AND month%6==0(학기 경계) | 수정 |
| 박사과정 | 과제비 증빙 영수증을 품목별로 붙이느라 금요일 저녁 사무실 불이 늦게 꺼진다. | 과제 참여, 증빙 | stage=phd AND phd.fundingState.route=project AND phd.participation>0 | 유지 |
| 박사과정 | 재료비 잔액으로는 시약이 모자라지만 활동비 항목에서 옮겨 올 수 없다. | 과제 참여, 예산 | stage=phd AND phd.fundingState.route=project AND phd.participation>0 AND choices.group=이공 | 수정 |
| 박사과정 | 장학금도 과제 인건비도 없어 적금을 깨서 등록금 고지서 금액을 낸다. | 자비, 저축 | stage=phd AND phd.fundingState.route=self AND phd.fundingState.dutyHours=0 AND month%6==0(등록금 달) | 수정 |
| 박사과정 | 다음 달 생활비를 항목별로 나눈 표를 다시 짜며 식비 칸부터 줄인다. | 자비, 생활비 | stage=phd AND phd.fundingState.route=self AND phd.fundingState.dutyHours=0 AND phd.familySupport=0 | 수정 |
| 박사과정 | 과외 시간이 세미나와 겹쳐 학부모에게 요일을 옮겨 달라는 문자를 보낸다. | 아르바이트, 시간표 | stage=phd AND phd.partTime.kind=job | 수정 |
| 박사과정 | 모의고사 지문을 출제 기준표에 맞춰 쓰고 학원 실장에게 메일로 넘긴다. | 아르바이트, 출제 | stage=phd AND phd.partTime.kind=job | 유지 |
| 박사과정 | 녹취 파일을 한 줄씩 풀어 적다가 인터뷰 음성이 끊기는 구간을 표시한다. | 아르바이트, 녹취 | stage=phd AND phd.partTime.kind=job | 유지 |
| 박사과정 | 첫 강의 전날 강의안 두 번째 쪽을 다시 고쳐 쓴다. | 강의, 강의 준비 | stage=phd AND phd.partTime.kind가 lecture로 바뀐 달 | 유지 |
| 박사과정 | 수강생의 성적 이의 메일에 채점 기준표를 붙여 답장을 보낸다. | 강의, 수강생 | stage=phd AND phd.partTime.kind=lecture | 수정 |
| 박사과정 | 카드 한도와 학자금 대출 한도가 모두 찼고 다음 입금일이 아직 멀다. | 돈 위기, 대출 | stage=phd AND money.debt>0 AND 대출 한도 소진 | 유지 |
| 박사과정 | 월세 입금일을 며칠 미뤄 달라고 집주인에게 문자를 보내 놓고 답을 기다린다. | 돈 위기, 생활비 | stage=phd AND phd.crisisMonths>0 | 수정 |
| 박사과정 | 통장 잔액이 모자라 자동이체 두 건이 출금되지 못했다는 문자가 온다. | 돈 위기, 자동이체 | stage=phd AND phd.crisisMonths>0 | 수정 |
| 박사과정 | 장학 유지 심사에서 탈락해 재심 신청 기간을 행정실에 문의한다. | 지원 만료, 장학 | stage=phd AND 그 달 기록 log.scholarship-review-failed | 유지 |
| 박사과정 | 연구장려금 지급 종료일을 학과에서 온 공문 날짜와 다시 맞춰 본다. | 지원 만료, 연장 신청 | stage=phd AND 그 달 기록 decision.funding-expiry.*(cause=until) | 수정 |
| 박사과정 | 휴학계를 낸 다음 주부터 물류 창고에서 주 사흘 야간 근무표를 받는다. | 휴학 근로, 야간 근무 | stage=phd AND 그 달 기록 decision.funding-expiry.D (휴학 시작) | 수정 |
| 박사과정 | 휴학 중 일당 정산서를 모아 세금 신고 자료로 따로 보관한다. | 휴학 근로, 정산 | stage=phd AND phd.leave.active=true AND ledger에 leave-work | 유지 |

### 사람들 (`people`)

유지 24, 수정 16, 삭제 0.

#### 사람들: 지도교수 유형과 연구실 동료

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 랩미팅 전날 지도교수가 식사 자리에서 중간 결과부터 먼저 보자고 한다. | 지원형 지도교수, 랩미팅 | stage=phd AND month>=3 AND phd.advisor.type=support | 유지 |
| 박사과정 | 지도교수가 결과 그림을 받아 보고 그 자리에서 해석 두 줄을 적어 준다. | 지원형 지도교수, 면담 | stage=phd AND month>=3 AND phd.advisor.type=support | 유지 |
| 박사과정 | 공유 폴더에 올린 발표 자료에 지도교수의 댓글이 밤늦게 달린다. | 지원형 지도교수, 연구 기록 | stage=phd AND month>=3 AND phd.advisor.type=support | 수정 |
| 박사과정 | 랩미팅에서 지도교수가 그래프 축 단위부터 따져 묻고 발표를 멈춘다. | 엄격형 지도교수, 랩미팅 | stage=phd AND month>=3 AND phd.advisor.type=strict | 유지 |
| 박사과정 | 지도교수가 슬라이드에서 근거 없는 문장마다 표시를 달아 돌려준다. | 엄격형 지도교수, 피드백 | stage=phd AND month>=3 AND phd.advisor.type=strict | 유지 |
| 박사과정 | 새로 해 본 실험이 없다고 하자 지도교수가 다음 면담을 미룬다. | 엄격형 지도교수, 면담 | stage=phd AND month>=3 AND phd.advisor.type=strict | 수정 |
| 박사과정 | 면담 신청 메일에 답이 없어 연구실 일정표에 직접 시간을 적어 넣는다. | 방임형 지도교수, 면담 | stage=phd AND month>=3 AND phd.advisor.type=free | 수정 |
| 박사과정 | 지도교수가 학회 마감만 알려 주고 실험 순서는 손대지 않는다. | 방임형 지도교수, 실험 계획 | stage=phd AND month>=3 AND phd.advisor.type=free | 수정 |
| 박사과정 | 지도교수가 중간 자료를 다른 대학 연구자에게 보낸 메일에 참조로 들어가 있다. | 연결형 지도교수, 외부 협업 | stage=phd AND month>=3 AND phd.advisor.type=connected | 수정 |
| 박사과정 | 지도교수 소개로 출연연 연구원과 점심을 같이 하고 과제 얘기를 나눈다. | 연결형 지도교수, 연구 주제 | stage=phd AND month>=3 AND phd.advisor.type=connected | 유지 |
| 박사과정 | 지도교수와의 주간 면담이 두 번 연속 취소되어 결과를 메일로 보낸다. | 지도교수 관계, 면담 | stage=phd AND month>=3 AND stats.relation 하위 구간 | 유지 |
| 박사과정 | 지도교수와의 면담이 요즘은 질문 하나 없이 몇 분 만에 끝난다. | 지도교수 관계, 랩미팅 | stage=phd AND month>=3 AND stats.relation 하위 구간 | 수정 |
| 박사과정 | 옮긴 뒤 새 연구실 첫 랩미팅에서 이전 자료를 정리해 발표한다. | 지도교수 변경, 옮김 | stage=phd AND month>=3 AND decisions에 decision.post-qualifying.pass.C AND phd.advisor.type이 바뀐 뒤 첫 달 | 유지 |
| 박사과정 | 다른 교수 면담이 거절되어 기존 지도교수 아래에서 실험을 이어 간다. | 지도교수 변경, 못 옮김 | stage=phd AND month>=3 AND decisions에 decision.post-qualifying.pass.C AND phd.advisor.type 그대로 | 유지 |
| 박사과정 | 동기가 연구실을 떠나며 공용 장비 사용 기록을 넘겨준다. | 동료, 연구실 생활 | stage=phd AND month>=3 AND phd.focus=network OR stats.relation 상위 구간 | 유지 |
| 박사과정 | 선배가 다른 연구실 교수의 평판을 식사 자리에서 조용히 알려 준다. | 동료, 선배 | stage=phd AND month>=3 AND phd.focus=network OR stats.relation 상위 구간 | 유지 |
| 박사과정 | 학부 후배에게 실험 일부를 맡기며 결과가 나오면 저자 순서를 상의하자고 한다. | 동료, 저자 기여 | stage=phd AND month>=3 AND phd.focus=network OR stats.relation 상위 구간 | 유지 |
| 박사과정 | 옆 연구실 대학원생과 공용 장비 예약 시간을 주간 메모로 나눠 쓴다. | 동료, 장비 | stage=phd AND month>=3 AND phd.focus=network OR stats.relation 상위 구간 | 수정 |
| 박사과정 | 입학을 고민하는 후배가 교수 평판을 물어 와 아는 만큼만 답한다. | 회상, 입학 준비 | stage=phd AND month>=3 AND month>=24 AND phd.focus=network | 수정 |
| 박사과정 | 연구참여생 시절 새벽에 퇴근하는 대학원생을 보았던 복도를 떠올린다. | 회상, 연구실 생활 | stage=phd AND month>=3 AND month 3~24 | 유지 |

#### 사람들: 부모·형제·친척과 학계 밖 친구

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 박사과정 | 매달 들어오는 집 송금을 등록금 계좌로 바로 옮겨 둔다. | 가족, 생계 | stage=phd AND phd.familySupport>0 (재등장 간격 48개월) | 수정 |
| 박사과정 | 용돈 명목으로 받은 현금을 생활비 봉투에 나눠 넣는다. | 가족, 생계 | stage=phd AND phd.familySupport>0 (재등장 간격 48개월) | 유지 |
| 박사과정 | 가족 카드로 찍은 학회 등록비를 명세서에서 찾아 표시해 둔다. | 가족, 학회 | stage=phd AND phd.familySupport>0 AND ledger에 conference가 있는 달 (재등장 간격 48개월) | 유지 |
| 박사과정 | 장학금 탈락 안내를 닫고 조교 모집 공고를 다시 열어 본다. | 생계, 조교 | stage=phd AND phd.familySupport=0 AND 그 달 기록 log.scholarship-review-failed (재등장 간격 48개월) | 수정 |
| 박사과정 | 논문 교정 아르바이트 정산 메일이 밀려 있어 날짜별로 정리한다. | 생계, 아르바이트 | stage=phd AND phd.familySupport=0 AND phd.partTime.kind=job (재등장 간격 48개월) | 수정 |
| 박사과정 | 관리비 자동이체가 빠져나간 통장 잔고를 보고 조교비 입금일까지 날을 센다. | 생계, 통장 | stage=phd AND phd.familySupport=0 AND phd.fundingState.dutyHours>0 (재등장 간격 48개월) | 수정 |
| 박사과정 | 휴학 신청서 사본을 고향 집 식탁 서랍에 넣어 두고 방을 치운다. | 휴학, 고향 | stage=phd AND leave.start가 있는 달 (재등장 간격 48개월) | 유지 |
| 박사과정 | 고향 집 작은방 책상 위에 노트북과 읽지 않은 논문 복사본을 쌓아 둔다. | 휴학, 고향 | stage=phd AND phd.leave.active=true (재등장 간격 48개월) | 유지 |
| 박사과정 | 본가 현관 신발장에 학교 출입증이 그대로 걸려 있다. | 휴학, 가족 | stage=phd AND phd.leave.active=true (재등장 간격 48개월) | 수정 |
| 박사과정 | 취업한 대학 동기가 보낸 회사 채용 공고 링크를 열어 보고 닫는다. | 친구, 진로 | stage=phd AND month>=24 (재등장 간격 48개월) | 유지 |
| 경력 | 예전 직장 동료와 점심 약속을 잡다가 연구실 세미나 시간에 막힌다. | 친구, 일정 | stage=career AND career.route in {professor, nontenure, lecturer, postdoc} (재등장 간격 48개월) | 유지 |
| 경력 | 학계 밖 친구가 전공을 묻자 한 단어로 줄여 답하고 다음 이야기로 넘어간다. | 친구, 설명 | stage=career (재등장 간격 48개월) | 유지 |
| 박사과정 | 고향 친구가 회사 야근 얘기를 하는 동안 휴대폰으로 학회 발표 자료를 고친다. | 친구, 시간 | stage=phd AND month>=3 (재등장 간격 48개월) | 유지 |
| 박사과정 | 학위 가운 대여 신청서를 접수하고 졸업식 날짜를 가족 대화방에 올린다. | 학위, 가족 | stage=phd AND 그 달 기록 log.defense-pass (재등장 간격 48개월) | 수정 |
| 경력 | 수여식 참석자 명단에 가족 이름과 옛 직장 동료 이름을 나란히 적는다. | 학위, 친구 | stage=career AND career.degree=phd AND 학위 취득 뒤 첫해 (재등장 간격 48개월) | 유지 |
| 경력 | 부모 진료 예약표를 출력해 운전석 햇빛가리개에 끼워 둔다. | 부모, 돌봄 | stage=career AND ageMonths>=540(45세) (재등장 간격 48개월) | 수정 |
| 경력 | 병원 수납창구에서 이번 달 치료비 영수증을 받아 정산 파일에 넣는다. | 부모, 돌봄 | stage=career AND ageMonths>=540(45세) (재등장 간격 48개월) | 유지 |
| 경력 | 학교를 떠나 입시학원으로 옮긴다는 말을 꺼내기 전에 계약서 조항을 다시 읽는다. | 진로, 가족 | stage=career AND career.route in {lecturer, nontenure} AND 그 해 기록 decision.career-5y.C (재등장 간격 48개월) | 유지 |
| 경력 | 구직 사이트 알림을 끄고 지원서 양식을 열어 경력 기술서 항목을 고친다. | 진로, 구직 | stage=career AND career.route=none (재등장 간격 48개월) | 유지 |
| 경력 | 본가 거실에서 새 직장 출근 안내 메일을 소리 내어 읽어 드린다. | 진로, 가족 | stage=career AND 그 해 기록 log.hired (재등장 간격 48개월) | 수정 |

### 박사 이후 (`after-phd`)

유지 48, 수정 31, 삭제 1.
삭제 사유: line-retirement-19: '중소 제조업체 사장이 공정 문제를 말로만 설명해' 구절이 outside-09와 같은 묶음 안에서 사실상 중복이다.

#### 박사 이후: 교수·비정년 교원·시간강사

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 경력 | 방학 동안 강의료는 끊기는데 건강보험료 고지서가 그대로 날아온다. | 시간강사, 급여, 보험 | stage=career AND career.route=lecturer AND month%12 in {4,5,10,11}(방학) (재등장 간격 48개월) | 유지 |
| 경력 | 중간고사 무렵부터 다음 학기 과목 배정을 기다린다. | 시간강사, 강의 배정 | stage=career AND career.route=lecturer (재등장 간격 48개월) | 유지 |
| 경력 | 수강 정정 기간이 끝나도 강의 수는 확정되지 않아 학과 공지를 기다린다. | 시간강사, 강의 배정, 폐강 | stage=career AND career.route=lecturer (재등장 간격 48개월) | 유지 |
| 경력 | 대출 상담 창구에서 계약 기간이 짧아 소득 증빙이 안 된다는 말을 듣는다. | 시간강사, 대출, 소득 증빙 | stage=career AND career.route=lecturer (재등장 간격 48개월) | 수정 |
| 경력 | 학과 교수가 석사생 몫이던 녹취 풀기 일감을 건넨다. | 시간강사, 일감, 선후배 | stage=career AND career.route=lecturer (재등장 간격 48개월) | 수정 |
| 경력 | 학기 말 추가 강의 제안을 받고 거절할 말을 고르다 답장을 미룬다. | 시간강사, 추가 강의, 계약 | stage=career AND career.route=lecturer (재등장 간격 48개월) | 수정 |
| 경력 | 올해 재계약 여부를 알리는 공문이 개강 직전에야 도착한다. | 시간강사, 재계약, 계약 기간 | stage=career AND career.route=lecturer AND 그 해 기록 log.career-year (재등장 간격 48개월) | 유지 |
| 경력 | 정년트랙인 줄 알고 지원했는데 계약서에는 비정년 강의전담이라 적혀 있다. | 비정년 교원, 계약 조건 | stage=career AND career.route=nontenure AND 그 해 기록 log.hired(nontenure) (재등장 간격 48개월) | 수정 |
| 경력 | 연 단위 계약서의 갱신 조항을 펴고 연장 가능한 상한 문장을 다시 읽는다. | 비정년 교원, 계약 갱신 | stage=career AND career.route=nontenure AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 유지 |
| 경력 | 이달 급여명세서에 수당 항목이 빠져 있어 행정실에 문의한다. | 비정년 교원, 급여, 행정실 | stage=career AND career.route=nontenure (재등장 간격 48개월) | 수정 |
| 경력 | 학과 회의 안건 표결에서 투표권이 없어 발언만 회의록에 남는다. | 비정년 교원, 학과 회의 | stage=career AND career.route=nontenure (재등장 간격 48개월) | 유지 |
| 경력 | 행정 업무 배정표에서 신임 교원 이름 옆 담당 칸이 가장 길다. | 비정년 교원, 행정 업무 | stage=career AND career.route=nontenure AND career.yearsInRoute<=1 (재등장 간격 48개월) | 수정 |
| 경력 | 다섯 해째 재계약 서류에 강의 실적만 적고 연구 칸은 비워 둔다. | 비정년 교원, 재계약 | stage=career AND career.route=nontenure AND career.yearsInRoute>=5 (재등장 간격 48개월) | 유지 |
| 경력 | 신임 교원 면접 때 낸 장비 목록을 지금 구매 품의서와 맞춰 본다. | 교수, 조교수, 연구비 | stage=career AND career.route=professor AND career.rank=assistant AND career.yearsInRoute<=1 (재등장 간격 48개월) | 유지 |
| 경력 | 중간 평가 결과 실적 부족 경고 공문을 받고 학과장실에서 나온다. | 교수, 조교수, 중간 평가 | stage=career AND career.route=professor AND career.rank=assistant AND career.yearsInRoute 3~4 (재등장 간격 48개월) | 유지 |
| 경력 | 지원서가 한 건도 없어 연구실 모집 공고를 학과 게시판에 다시 올린다. | 교수, 조교수, 학생 모집 | stage=career AND career.route=professor AND career.rank=assistant (재등장 간격 48개월) | 유지 |
| 경력 | 정년 심사 서류의 논문 목록을 등재지 구분에 맞춰 다시 나눈다. | 교수, 부교수, 정년 심사 | stage=career AND career.route=professor AND career.rank=associate (재등장 간격 48개월) | 수정 |
| 경력 | 과제 종료 뒤 연구원이 출연연으로 떠나 채용 공고를 다시 낸다. | 교수, 부교수, 연구 인력 | stage=career AND career.route=professor AND career.rank=associate (재등장 간격 48개월) | 유지 |
| 경력 | 채용 회의에서 해외 학위와 국내 학위 지원자의 기준을 두고 의견이 갈린다. | 교수, 정교수, 채용 | stage=career AND career.route=professor AND career.rank=full (재등장 간격 48개월) | 유지 |
| 경력 | 계획서 마감과 중간고사 채점이 겹쳐 채점 순서부터 정한다. | 교수, 정교수, 연구비 마감 | stage=career AND career.route=professor AND career.rank=full (재등장 간격 48개월) | 유지 |

#### 박사 이후: 박사후연구원·출연연·공공 연구직

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 경력 | 지도교수 과제 종료일과 같은 날짜로 계약 만료일이 적힌 서류를 확인한다. | 박사후연구원, 계약, 과제 | stage=career AND career.route=postdoc AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 수정 |
| 경력 | 과제비 집행 잔액 표를 행정실에서 받아 월 급여 항목과 대조한다. | 박사후연구원, 과제비, 급여 | stage=career AND career.route=postdoc (재등장 간격 48개월) | 유지 |
| 경력 | 계약서 초안에 사대보험 항목이 빠져 있어 행정실에 정정을 요청한다. | 박사후연구원, 계약, 급여 | stage=career AND career.route=postdoc AND 그 해 기록 log.hired(postdoc) (재등장 간격 48개월) | 수정 |
| 경력 | 지원한 기관에서 답이 없어 채용 공고 게시판의 진행 상태를 날마다 확인한다. | 박사후연구원, 지원, 채용 | stage=career AND career.route=postdoc AND career.searching 있음 (재등장 간격 48개월) | 수정 |
| 경력 | 시차에 맞춘 새벽 화상 면접 접속 링크를 미리 시험 연결해 본다. | 박사후연구원, 면접, 시차 | stage=career AND career.route=postdoc AND career.searching 있음 (재등장 간격 48개월) | 유지 |
| 경력 | 과제 선정 결과 발표 전날 계약 만료 안내 메일이 먼저 와 있다. | 박사후연구원, 계약 만료, 과제 | stage=career AND career.route=postdoc AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 수정 |
| 경력 | 개인 연구 과제 신청서의 소속 기관란에 쓸 문구를 행정실에 문의한다. | 박사후연구원, 인문사회, 지원서 | stage=career AND career.route=postdoc AND choices.group=인문사회 (재등장 간격 48개월) | 수정(정리) |
| 경력 | 비자 면접 대기실에서 앞 사람의 거절 서류 이야기를 옆에서 듣는다. | 박사후연구원, 비자, 해외 | stage=career AND career.route=postdoc AND career.searching 있음 (재등장 간격 48개월) | 유지 |
| 경력 | 계약 갱신 평가 결과가 나오지 않아 인사팀 게시판 목록을 매일 확인한다. | 출연연, 재계약, 심사 | stage=career AND career.route=institute AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 유지 |
| 경력 | 기관장 방침으로 계약 만료 전에 나갈 준비를 하라는 구두 통보를 받는다. | 출연연, 계약 만료, 기관장 | stage=career AND career.route=institute AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 유지 |
| 경력 | 재료비 청구서 결재가 밀려 실험 일정을 다음 달로 미룬다. | 출연연, 과제비, 실험 | stage=career AND career.route=institute AND news.rnd-budget-cut 유효 (재등장 간격 48개월) | 수정 |
| 경력 | 급여 명세서의 직급 호봉 항목을 지난달 명세서와 나란히 놓고 대조한다. | 출연연, 급여, 직급 | stage=career AND career.route=institute AND 그 해 기록 log.promotion (재등장 간격 48개월) | 수정 |
| 경력 | 대형 과제가 끝나 후속 지원 공고를 기다리는 동안 인력 배치표를 고친다. | 출연연, 과제비, 인력 | stage=career AND career.route=institute (재등장 간격 48개월) | 유지 |
| 경력 | 성과 보고서 추진 경과 칸에 실험 공백 기간을 어떻게 적을지 담당자에게 묻는다. | 출연연, 성과 보고서, 연구 흐름 | stage=career AND career.route=institute (재등장 간격 48개월) | 수정 |
| 경력 | 동료의 권유로 노동조합 모임 안내문을 받아 들고 시간과 장소를 적어 둔다. | 출연연, 노동조합, 동료 | stage=career AND career.route=institute AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 유지 |
| 경력 | 예산 집행 실적을 부처 양식에 옮겨 적는 일로 매주 금요일 오후가 간다. | 공공 연구직, 예산, 행정 | stage=career AND career.route=public (재등장 간격 48개월) | 수정 |
| 경력 | 인건비 집행 내역을 감사 자료로 요청받아 표를 다시 정리한다. | 공공 연구직, 인건비, 감사 | stage=career AND career.route=public (재등장 간격 48개월) | 유지 |
| 경력 | 계약 만료 안내 공문이 와서 재임용 서류 목록을 확인한다. | 공공 연구직, 계약 만료, 인사 | stage=career AND career.route=public AND career.contractUntil 12개월 이내 (재등장 간격 48개월) | 유지 |
| 경력 | 연구 대신 기관 평가 회의 자료 준비에 한 주가 다 간다. | 공공 연구직, 회의 자료, 업무 | stage=career AND career.route=public (재등장 간격 48개월) | 수정 |
| 경력 | 국정감사 자료 요청 공문에 답할 표를 만들어 결재선 첫 칸에 올린다. | 공공 연구직, 결재, 국정감사 | stage=career AND career.route=public AND career.rank=researcher (재등장 간격 48개월) | 수정 |

#### 박사 이후: 기업·창업·브리지(임시 일자리)·구직 중

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 경력 | 민간 연구소 처우 안내문의 상여와 복리후생 항목을 표로 옮겨 적는다. | 기업, 급여, 제안서 | stage=career AND career.route=industry AND 그 해 기록 log.hired(industry) (재등장 간격 48개월) | 수정 |
| 경력 | 민간 연구소 채용 공고의 입사일을 박사후연구원 계약 만료일과 나란히 적어 본다. | 기업, 회고, 일정 | stage=career AND career.route=postdoc AND career.searching.routes에 industry (재등장 간격 48개월) | 수정 |
| 경력 | 학계에서 쓰던 연구 계획서를 사내 보고서 양식의 목차로 다시 짠다. | 기업, 보고서, 첫해 | stage=career AND career.route=industry AND 그 해 기록 log.hired(industry) (재등장 간격 48개월) | 유지 |
| 경력 | 사회보험과 소득세를 뺀 실수령액을 급여명세서와 대조한다. | 기업, 급여, 명세서 | stage=career AND career.route=industry (재등장 간격 48개월) | 유지 |
| 경력 | 맡을 과제의 범위를 팀장과 문서로 확인하고 착수 날짜를 맞춘다. | 기업, 연구 자율성, 계약 | stage=career AND career.route=industry AND 그 해 기록 log.hired(industry) (재등장 간격 48개월) | 수정 |
| 경력 | 기업 적성검사 문제지를 시간 재며 풀고 응시 날짜를 수첩에 적는다. | 기업, 적성검사, 일정 | stage=career AND career.searching.routes에 industry (재등장 간격 48개월) | 유지 |
| 경력 | 작은 가게 임대 조건표의 보증금과 월세 항목을 줄 그어 비교한다. | 창업, 임대, 가족 | stage=career AND 그 해 기록 decision.career-10y.D 또는 log.hired(startup) (재등장 간격 48개월) | 수정 |
| 경력 | 법인 카드 영수증을 모아 월말 정산표의 항목별 칸에 옮겨 적는다. | 창업, 정산, 회계 | stage=career AND career.route=startup (재등장 간격 48개월) | 유지 |
| 경력 | 중소 제조업체 사장이 공정 문제를 말로만 설명해 연구 언어로 옮겨야 한다. | 창업, 공정, 고객 | stage=career AND career.route=startup (재등장 간격 48개월) | 유지 |
| 경력 | 시제품 외주 업체에 공차 도면을 보내고 납품 일정을 확인한다. | 창업, 시제품, 외주 | stage=career AND career.route=startup AND choices.group=이공 (재등장 간격 48개월) | 유지 |
| 경력 | 학교 연구실 장비 대장을 정리하고 사무실 비품 목록을 새로 작성한다. | 창업, 첫해, 비품 | stage=career AND career.route=startup AND 그 해 기록 log.hired(startup) (재등장 간격 48개월) | 유지 |
| 경력 | 학원 근무표에 대학 강의 요일을 옮겨 적고 겹치는 칸을 본다. | 브리지, 학원, 시간표 | stage=career AND career.route=bridge (재등장 간격 48개월) | 유지 |
| 경력 | 학과 홈페이지 연구자 명단에서 이름이 빠진 것을 캡처해 파일에 넣는다. | 브리지, 명단, 기록 | stage=career AND career.route=bridge AND 그 해 기록 decision.career-5y.C (재등장 간격 48개월) | 유지 |
| 경력 | 학교를 나와 쓴 책이 서점 진열대에 오른 날 온라인 재고 수량을 적어 둔다. | 브리지, 출판, 재고 | stage=career AND career.route=bridge AND choices.group=인문사회 (재등장 간격 48개월) | 수정 |
| 경력 | 비영리 연구 단체에서 보고서, 회계 장부, 후원 공문을 한 사람이 맡는다. | 브리지, 비영리, 회계 | stage=career AND career.route=bridge (재등장 간격 48개월) | 유지 |
| 경력 | 운전 일을 하며 배차 앱 정산 내역을 주 단위로 표 파일에 옮겨 적는다. | 브리지, 운전, 정산 | stage=career AND career.route=bridge (재등장 간격 48개월) | 유지 |
| 경력 | 이력서 경력 칸에 과제 참여 기간을 근무 기간 형식으로 맞춰 적는다. | 구직 중, 이력서, 경력 | stage=career AND career.route=none (재등장 간격 48개월) | 유지 |
| 경력 | 면접 날짜가 학회 발표와 겹쳐 발표 순서 변경을 요청한다. | 구직 중, 면접, 학회 | stage=career AND career.route=none AND career.searching.routes에 학계 경로 (재등장 간격 48개월) | 유지 |
| 경력 | 경력 상담 메모를 다시 펴서 이번 주에 할 항목만 남기고 지운다. | 구직 중, 상담, 일정 | stage=career AND career.route=none (재등장 간격 48개월) | 수정 |
| 경력 | 학계를 나온 뒤 아침마다 오는 교수 채용 공고 알림을 하나씩 지운다. | 구직 중, 첫해, 알림 | stage=career AND career.route=none AND career.academicMonths>0 (재등장 간격 48개월) | 수정 |

#### 은퇴 전후: 정년 앞의 해, 퇴임 직후, 연금, 은퇴 뒤 연구, 기록의 끝

| 단계 | 문장 | 태그 | 조건 | 감사 |
|---|---|---|---|---|
| 경력 | 학과장이 은퇴 계획을 묻고 답변 기한을 적어 둔다. | 정년 앞, 행정 | stage=career AND 그 해 기록 decision.pre-retirement.* AND career.route=professor (재등장 간격 48개월) | 유지 |
| 경력 | 임금피크제 첫 달 급여명세서를 펴 놓고 과제 신청서를 덮는다. | 정년 앞, 급여, 과제 | stage=career AND 그 해 기록 decision.pre-retirement.* AND career.route in {institute, public} (재등장 간격 48개월) | 유지 |
| 경력 | 해외 연구기관의 초청 메일을 출력해 연구실 서랍에 넣는다. | 정년 앞, 초청 | stage=career AND 그 해 기록 decision.pre-retirement.* (재등장 간격 48개월) | 유지 |
| 경력 | 오래 쓴 분석 스크립트에 주석이 없어 후임에게 넘길 설명 메모를 따로 쓴다. | 정년 앞, 인수인계, 자료 | stage=career AND 그 해 기록 decision.pre-retirement.* AND choices.group=이공 (재등장 간격 48개월) | 수정 |
| 은퇴 | 퇴임식 다음 날 달력에 적힌 일정이 하나도 없다. | 퇴임 직후, 일정 | stage=retired AND 그 해 기록 log.retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 학내 시스템 접근 권한이 빠졌다는 자동 메시지가 로그인 화면에 뜬다. | 퇴임 직후, 행정, 계정 | stage=retired AND 그 해 기록 log.retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 도서관 대출 권한이 바뀌었다는 안내문을 출입구 게시판에서 읽는다. | 퇴임 직후, 도서관 | stage=retired AND 그 해 기록 log.retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 연금 정산 통지서가 도착해 봉투를 뜯지 않고 책상 위에 둔다. | 연금, 행정 | stage=retired AND ledger에 pension (재등장 간격 48개월) | 유지 |
| 은퇴 | 퇴직 후 생활비 이체일을 벽걸이 달력에 옮겨 적고 빨간 동그라미를 친다. | 연금, 생활비 | stage=retired AND ledger에 pension (재등장 간격 48개월) | 수정 |
| 은퇴 | 건강보험 납부 고지서와 연금 입금 내역을 나란히 펴 놓고 맞춰 본다. | 연금, 생활비, 행정 | stage=retired AND ledger에 pension (재등장 간격 48개월) | 유지 |
| 은퇴 | 지하 개인 연구실 문패는 아직 없고 임시 종이가 붙어 있다. | 은퇴 뒤 연구, 공간 | ledger에 post-retire-research (postRetireResearchUntil까지) (재등장 간격 48개월) | 유지 |
| 은퇴 | 논문 데이터베이스 기관 이용권이 끝나 개인 결제 화면에서 가격을 확인한다. | 은퇴 뒤 연구, 계정, 비용 | ledger에 post-retire-research (postRetireResearchUntil까지) (재등장 간격 48개월) | 수정 |
| 은퇴 | 퇴직 후 자문을 맡은 분석 회사 회의에서 낸 품질 지적이 가볍게 넘어간다. | 은퇴 뒤 연구, 품질, 회의 | ledger에 post-retire-research (postRetireResearchUntil까지) (재등장 간격 48개월) | 수정 |
| 은퇴 | 퇴직자 연구 공간 배정 신청을 냈으나 결과 안내 메일이 오지 않는다. | 자리 없음, 행정 | 그 해 기록 decision.pre-retirement.C.declined (재등장 간격 48개월) | 수정 |
| 은퇴 | 오래 묵힌 단행본 원고 폴더를 열어 장마다 쪽수를 세어 본다. | 저술, 원고 | stage=retired (재등장 간격 48개월) | 수정 |
| 은퇴 | 옛 질문을 적어 둔 노트를 꺼내 아직 답이 없는 항목에 밑줄을 긋는다. | 저술, 질문 | stage=retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 심사 요청 메일에 답하지 않은 채 원고 교정본을 두 번째로 훑는다. | 저술, 심사 | stage=retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 지역 도서관 재능기부 등록 안내문을 펴 두고 신청란을 비워 둔다. | 자문, 지역 | stage=retired (재등장 간격 48개월) | 유지 |
| 은퇴 | 마지막 기록 파일을 저장하고 외장 저장장치를 서랍에 넣은 뒤 닫는다. | 기록 끝, 자료 | 그 해 기록 log.end-age80 (재등장 간격 48개월) | 수정(정리) |

## 3. 스토리라인 후보

스토리라인은 두 개에서 네 개의 메모(beat)가 몇 달 또는 몇 해 간격으로 이어지는 짧은 이야기다. 시작 조건이 맞으면 예약되고, 각 메모는 "이어질 조건"이 맞을 때만 붙는다. 조건이 깨지면 결말에 적힌 마무리 메모를 붙이거나 조용히 끊는다. 간격은 개월 수이고, 경력·은퇴 단계는 한 칸이 1년이므로 12의 배수로 적었다. 결말은 좋게·나쁘게·흐지부지 셋 중 하나이고, 노조·소송·연구비 부정 같은 제도 개입은 처벌·복직 결과를 단정하지 않도록 흐지부지로 묶었다.

감사: 유지 13, 수정 11, 삭제 0. 삭제된 스토리라인은 없다.

### 조교 근무표 (`story-hs-phd-1`, 인문사회)

- 근거: hs-phd-08
- 시작 조건: stage=phd AND phd.fundingState.dutyHours>0 AND month 3~18

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 방학 중 평일 종일 근무표가 하루 단위로 행정실 공지에 올라온다. | 0 | dutyHours>0 AND NOT leave.active |
| 2 | 신입 조교들이 순번제를 부탁하러 갔다가 건방지다는 말을 듣는다. | 1-3 | dutyHours>0 AND NOT leave.active |
| 3 | 비밀유지 서약서 서명 안내가 오고 근무표는 그대로 붙어 있다. | 1-3 | 항상 |

- 결말: 흐지부지 (근무표는 그대로이고 서약서 안내가 온다). 중간 마무리: phd.leave.active가 시작되면 끊김 대신 '휴학 신청 전에 근무표 인수 서류를 후배 조교에게 넘긴다.'
- 감사: 유지. dutyHours>0·month 3~18은 엔진 값으로 판정되고, 방학 근무표·순번제 부탁·비밀유지 서약서는 행정조교 현실의 구체적 순서다.

### 먼저 나온 논문 (`story-hs-phd-2`, 인문사회)

- 근거: hs-phd-12
- 시작 조건: stage=phd AND phd.qualified=true AND phd.project 하위 구간 AND phd.focus in {research, thesis} AND choices.track in {sociology, political, psychology, public_administration}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 검색 결과에서 같은 질문을 다룬 최근 논문을 찾아 초록을 인쇄한다. | 0 | phd.qualified=true AND phd.project 하위 구간 유지 |
| 2 | 그 논문의 연구 틀을 빌려도 되는지 선행연구 목록 옆에 적어 둔다. | 1-2 | phd.focus in {research, thesis} AND NOT leave.active |
| 3 | 지도교수에게 주제를 바꾸겠다고 하자 질문부터 다시 써 보라는 답이 돌아온다. | 1-3 | phd.project가 첫 메모 시점보다 증가 AND NOT leave.active |
| 4 | 워크숍에서 받은 과학성 질문을 정리해 연구 질문을 좁혀 다시 쓴다. | 2-4 | 항상 |

- 결말: 좋게 (질문을 좁혀 다시 쓰기 시작한다). 중간 마무리: leave.start가 생기면 '휴학 전에 선행 논문 초록과 질문지 초안을 한 폴더에 모아 둔다.'
- 감사: 유지. 선행 논문 발견→틀 빌리기 메모→지도교수의 '질문부터' 답→워크숍 뒤 질문 좁히기가 인문사회 수료생의 흐름으로 이어지고 phd.project 증가 조건도 판정 가능하다.

### 첫 강의 학기 (`story-hs-phd-3`, 인문사회)

- 근거: hs-phd-05
- 시작 조건: stage=phd AND phd.partTime.kind=lecture

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 첫 강의 전날 강의안 순서를 여러 번 바꿔 인쇄한다. | 0 | partTime.kind=lecture |
| 2 | 수강생 상담 메일에 답하고 나면 연구에 쓸 저녁 시간이 남지 않는다. | 1-3 | partTime.kind=lecture AND 학기 말(month%6==0 전후)에 도달 |
| 3 | 강의 평가의 서술 의견을 한 줄 읽고 나머지 파일은 열지 않는다. | 2-4 | stats.mind 하위 구간 AND 다음 학기 경계까지 부분 시간 근무가 lecture에서 벗어남 |
| 4 | 다음 학기 강사 지원 기간이 끝나도 지원서는 서랍에 그대로 있다. | 4-7 | 항상 |

- 결말: 나쁘게 (다음 학기 강사 지원서가 서랍에 남는다; 마지막 메모는 mind 하위 구간이고 partTime.kind가 더 이상 lecture가 아닐 때만 붙는다). 중간 마무리: leave.start가 생기면 '휴학 전 학기의 성적 입력은 끝내 둔다.'
- 감사: 수정(문장 2, 4번째) · 정리 단계 조건 수정: 결말 설명의 강의 신청서를 강사 지원서로 맞춤. 두 번째 메모는 상담 메일에 답하는 일이 '강의 준비로 채워진다'는 결과와 맞지 않고, 마지막의 '강의 신청서'는 시간강사 채용이 지원서로 이뤄지는 현실과 어긋나 두 줄만 고친다.

### 떠난 동기의 책상 (`story-hs-phd-4`, 인문사회)

- 근거: hs-phd-13
- 시작 조건: stage=phd AND phd.qualified=true AND month>=36

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 강의와 패스트푸드점 근무를 같이 하던 동기가 급여를 못 받았다고 말한다. | 0 | stage=phd |
| 2 | 동기가 연구실 책상을 비운 뒤 남은 책과 머그컵 상자가 복도에 놓여 있다. | 2-4 | 항상 |

- 결말: 나쁘게 (빈 자리와 남은 짐). 중간 마무리: leave.start가 생기면 '휴학원을 내러 가는 복도에 동기의 짐 상자가 아직 있다.'
- 감사: 유지. 패스트푸드점 근무 동기의 미지급 급여에서 책과 머그컵 상자까지 두 메모가 짧지만 month>=36·qualified 조건과 '나쁘게' 결말이 맞고, 어느 급여인지 모호한 점만 남는다.

### 공동 계좌 내역 (`story-hs-phd-5`, 인문사회)

- 근거: hs-phd-09
- 시작 조건: stage=phd AND phd.fundingState.route=project AND stats.relation 하위 구간

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 과제 인건비 일부를 공동 계좌로 모으라는 안내가 단체방에 또 올라온다. | 0 | route=project AND NOT leave.active |
| 2 | 같은 과제의 선배와 입금 내역을 나란히 놓고 비교해 본다. | 1-3 | route=project AND NOT leave.active |
| 3 | 비교한 내역을 폴더에 모아 두기만 하고 아직 어디에도 내지 않는다. | 2-4 | 항상 |

- 결말: 흐지부지 (내역을 모아 둔 파일만 남고, 신고나 처분 결과는 쓰지 않는다; 지도교수 유형과 무관). 중간 마무리: leave.start가 생기면 '휴학 신청 뒤 단체방 알림을 끄고 내역 파일만 남겨 둔다.'
- 감사: 유지. 공동 계좌 안내가 단체방에 '또' 올라오고 선배와 입금 내역을 비교한 뒤 폴더에만 두는 흐름은 인건비 공동관리 문제를 처분 결과 없이 서사로 끝낸다.

### 계획서 접수 대기 (`story-hs-phd-6`, 인문사회)

- 근거: hs-phd-06
- 시작 조건: stage=phd AND log.qual-pass가 있는 달 이후 AND choices.track in {history, philosophy, korean_literature, english_literature, linguistics}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 학위논문 계획서를 학과에 내고 접수 확인서만 받은 채 심사 순서를 기다린다. | 0 | log.qual-pass 존재 AND NOT leave.active |
| 2 | 대기가 다음 학기로 넘어간 뒤 학과 게시판에 심사 일정 공지가 붙는다. | 2-4 | 학기 경계(month%6==0)를 한 번 이상 지남 AND stage=phd |

- 결말: 좋게 (심사 일정 공지가 붙는다; 승인 여부는 쓰지 않는다). 중간 마무리: leave.start가 생기면 '휴학 전에 접수 확인서를 클리어파일 맨 앞에 끼워 둔다.'
- 감사: 유지. 계획서 심사 대기가 학기 경계를 넘는 설정은 인문계 현실에 맞으나 학과가 '접수 확인서'를 내주는 일은 드물어 무난한 수준에 머문다.

### 장비 도면과 장학 신청서 (`story-stem-phd-1`, 이공)

- 근거: stem-phd-12
- 시작 조건: stage=phd AND month 6~12 AND phd.fundingState.route=project AND choices.track in {mechanical, materials, electrical, chemical, energy, semiconductor}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 과제용 진공 장비의 마지막 배관 도면을 지도교수와 다시 고친다. | 0 | phd.leave.active=false |
| 2 | 지도교수가 장학금 신청서의 연구 성과 문단을 함께 읽으며 고친다. | 1-2 | phd.leave.active=false |
| 3 | 신청서를 접수 시스템에 올리고 확인서를 파일철에 끼운다. | 1-2 | 항상 (결과는 엔진에 없으므로 제출에서 끝낸다) |

- 결말: 흐지부지
- 감사: 수정(문장 2번째). 제목이 약속한 장학 신청서가 본문 어디에도 없고 '연구비 얘기는 빼고'가 뜻이 닿지 않아 둘째 메모에 장학금 신청서를 명시한다.

### 감사의 글 한 줄 (`story-stem-phd-2`, 이공)

- 근거: stem-phd-08
- 시작 조건: stage=phd AND choices.track in {life_science, neuroscience, systems_biology, bioengineering} AND phd.papers[]의 어떤 논문이 draft에서 submitted로 바뀐 달

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 투고 직전 동료가 돌려 준 대조 실험이 감사의 글 한 줄로 정리된다. | 0 | 해당 논문 status in {submitted, revision, accepted, rejected} |
| 2 | 연구실을 나간 선배가 공저자 자리를 요구하는 메일을 보낸다. | 2-4 | 해당 논문 status != dropped |
| 3 | 동료에게 미안한 채 감사의 글 문장을 다시 고친다. | 1-3 | 항상 |

- 결말: 나쁘게
- 감사: 수정 판정이나 고친 문장이 없고 이유가 유지 근거여서 원래 문장을 실었다. 대조 실험을 돌려 준 동료가 감사의 글에 머물고 나간 선배가 공저자를 요구하는 전개는 생명과학 연구실의 저자권 갈등을 구체적으로 담고 papers[] status 조건으로 판정된다.

### 인건비 명세서와 설문 (`story-stem-phd-3`, 이공)

- 근거: stem-phd-10
- 시작 조건: stage=phd AND month>=24 AND phd.fundingState.route=project AND phd.participation>=0.75 AND choices.track in {statistics, mathematics}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 연구와 무관한 자료 입력 작업이 이어지는 달의 인건비 명세서를 받는다. | 0 | phd.fundingState.route=project (monthly 변화 없음, 인상은 쓰지 않는다) |
| 2 | 총학생회 설문의 체류 시간과 최저임금 항목이 게시판에 붙는다. | 2-5 | 항상 (게시판에 붙는 데서 끝낸다) |

- 결말: 흐지부지
- 감사: 유지. 자료 입력 작업 달의 인건비 명세서와 총학생회 설문의 체류 시간·최저임금 항목은 참여율 0.75 이상 조건과 맞물리고 게시판에 붙는 데서 끝나 숫자 효과가 없다.

### 예산 칸막이와 출장 반려 (`story-stem-phd-4`, 이공)

- 근거: stem-phd-11, stem-phd-03
- 시작 조건: stage=phd AND news.rnd-budget-cut 유효 AND choices.track in {computer, ai}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 재료비 칸 잔액으로는 연산 장비 부품을 못 산다는 공지가 온다. | 0 | news.rnd-budget-cut 유효 (깨지면 조용히 끊김) |
| 2 | 신규 학생을 받지 못한다는 말이 돌고 출장 신청서는 반려된다. | 2-4 | 항상 |

- 결말: 나쁘게
- 감사: 유지. 재료비 비목 잔액으로 연산 장비 부품을 못 산다는 공지와 출장 신청서 반려는 news.rnd-budget-cut 유효 조건에 묶인 전산 분야의 작은 행정 디테일이다.

### 지도교수를 바꾸다 (`story-stem-phd-5`, 이공)

- 근거: stem-phd-13
- 시작 조건: stage=phd AND decisions에 decision.post-qualifying.pass.C 존재 (시작 시점의 phd.advisor.type을 기록해 둔다)

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 정해진 면담 시간에 들어가자 지도교수가 그동안 무엇을 시도해 봤는지 묻는다. | 0 | phd.leave.active=false AND log.degree 없음 |
| 2 | 제출 기한 한 달 전부터 지도교수와 연락이 끊겨 초안만 공유 폴더에 있다. | 3-6 | log.degree 없음 AND log.end-dropout 없음 |
| 3 | 지도교수가 더는 함께 일하기 어렵겠다는 짧은 메일을 보낸다. | 1-3 | log.degree 없음 AND log.end-dropout 없음 [조건 깨짐 시 마무리 메모: 공유 폴더의 초안 파일이 마지막 수정 그대로 남는다.] |
| 4 | 새 연구실 첫 랩미팅에서 교수의 가설을 검증할 대안 실험 계획을 발표한다. | 3-6 | 갈래 A(좋게): phd.advisor.type이 시작 시점 값에서 바뀌었음 -> 이 메모. 갈래 B(흐지부지): 값이 안 바뀜 -> '옮길 연구실을 찾지 못해 기존 연구실 책상이 그대로 남는다.' |

- 결말: 좋게
- 감사: 수정(문장 1, 3번째). 첫 메모가 주인공을 '학생에게'로 삼인칭 서술하고 셋째의 '통보서'는 한국 지도교수가 쓰는 형식이 아니라 메일로 바꾼다; advisor.type 변화로 가르는 갈래는 판정 가능하다.

### 첫 논문의 긴 심사 (`story-stem-phd-6`, 이공)

- 근거: stem-phd-07, stem-phd-09
- 시작 조건: stage=phd AND decisions에 decision.first-paper-verdict.reject.A 또는 decision.first-paper-verdict.reject.B AND choices.track not in {computer, ai, mathematics, statistics}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 거절 메일의 세 심사평을 인쇄해 사흘 뒤 줄을 치며 끝까지 읽는다. | 0 | 해당 논문 status in {rejected, submitted, revision} AND phd.papers[].attempts>=1 |
| 2 | 추가 실험 요구 항목에 맞춰 장비 예약표의 빈 시간을 확인한다. | 1-3 | 해당 논문 status in {submitted, revision, accepted, rejected} |
| 3 | 재투고 뒤 받은 수정 요청에 심사자별 답변서를 여러 번 고쳐 올린다. | 3-6 | 해당 논문 status in {revision, accepted} OR attempts>=2 [조건 깨짐 시 마무리 메모: 심사평 인쇄본이 서랍에 접힌 채 남는다.] |
| 4 | 학회 포스터 세션 뒤 숙소에서 옆 포스터와 견준 강점 목록을 적는다. | 3-6 | 갈래 A(좋게): 해당 논문 status=accepted -> 이 메모. 갈래 B(나쁘게): status=rejected이고 attempts가 늘어남 -> '거절 통지서가 또 와서 심사평 파일이 폴더 하나를 채운다.' |

- 결말: 좋게
- 감사: 수정(문장 3번째). 거절 뒤에는 '수정 요청서'가 오지 않으므로 셋째 메모를 재투고 뒤 심사자별 답변서로 바꾸고, 사흘·세는 한글 수사라 숫자 규칙에 걸리지 않는다.

### 계약 만료 통보 (`story-career-1`, 이공)

- 근거: stem-career-01
- 시작 조건: stage=career, career.route in {institute, postdoc}, career.contractUntil이 12개월 이내

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 계약 만료 전에 나갈 준비를 하라는 구두 통보를 복도에서 듣는다. | 0 | 항상 |
| 2 | 동료의 권유로 노조 모임에 나가 구제 신청 서류 양식을 받아 온다. | 12 | 항상 |
| 3 | 추천서를 부탁하러 간 자리에서 책임자가 구제 신청 철회를 넌지시 말한다. | 12-24 | career.route in {institute, postdoc} 또는 log.contract-ended |
| 4 | 반납한 출입증 대신 임시 방문증을 받아 목에 건다. | 12-24 | log.contract-ended |

- 결말: 나쁘게 (log.contract-ended가 있을 때 마지막 메모). 끊김 마무리: 계약이 연장되어 contract-ended가 없으면 '노조 모임 안내문을 접어 수첩 사이에 끼워 둔다.'로 흐지부지 처리
- 감사: 수정(문장 2, 3번째) · 정리 단계 조건 수정: 둘째 메모 continue_if를 항상으로(계약 12개월 이내에서 시작하므로). 셋째·넷째 메모가 전제하는 소송이 앞 메모에 없어 둘째에 구제 신청을 심고, 박사후·출연연 상급자를 '지도교수'가 아닌 책임자로 바꾼다; contractUntil 12개월 이내인데 둘째 간격 12개월이면 계약이 이미 끝나므로 continue_if는 항상 또는 log.contract-ended가 맞다.

### 해외 박사후 자리의 서류 (`story-career-2`, 이공)

- 근거: stem-career-04
- 시작 조건: stage=phd, phd.path=academia, phd.graduationMonth까지 6개월 이내

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 졸업을 앞두고 연구실 책상에서 해외 박사후 지원서를 고친다. | 0 | 항상 |
| 2 | 연구소가 인턴 경력 확인용 옛 담당자 연락처를 요구해 밤새 파일을 뒤진다. | 2-4 | phd.path=academia |
| 3 | 비자 면접 대기실에서 거절 사례를 듣고 합격 통지서를 다시 확인한다. | 12 | stage=career 이고 log.hired(postdoc)가 있을 때 |

- 결말: 좋게 (경력 첫해 log.hired 태그 postdoc). 끊김 마무리: 경력 첫해 career.route=none이면 '답이 오지 않은 지원서 사본을 연구실 공유 폴더에 남겨 둔다.'로 흐지부지 처리
- 감사: 수정(문장 1번째). 시작 조건이 graduationMonth 6개월 이내의 stage=phd인데 첫 메모가 '졸업 뒤에도'로 시작해 시점이 어긋나 졸업 전으로 고친다; 인턴 경력 확인과 비자 대기실은 그럴듯하다.

### 지원서를 쌓는 해들 (`story-career-3`, 공통)

- 근거: stem-career-05
- 시작 조건: stage=career, career.searching이 학계 경로(professor, postdoc, lecturer 등)를 포함

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 새벽 화상 면접을 마치고 지원 현황 표에 응답 없음 칸을 늘린다. | 0 | 항상 |
| 2 | 지원서 업적 칸에서 오래된 논문을 뺄지 목록을 놓고 따져 본다. | 12-24 | career.searching이 학계 경로를 포함 |
| 3 | 실패담을 써 달라는 후배의 요청에 빈 문서만 열어 둔다. | 12-36 | 구직이 3년 넘게 이어지고 log.hired가 없음 |

- 결말: 나쁘게 (구직이 3년 넘게 이어질 때 실패담 원고). 갈래: log.hired가 있으면 좋게, 마지막 메모 '거절이 이어진 주 뒤 제안 전화를 받고 현황 표를 닫는다.'
- 감사: 유지. 새벽 화상 면접 뒤 현황 표의 응답 없음 칸, 업적 칸의 오래된 논문, 후배가 청한 실패담의 빈 문서는 긴 구직의 해마다 다른 장면이고 log.hired 갈래도 판정된다.

### 강사 제도 개편 무렵 (`story-career-4`, 인문사회)

- 근거: hs-career-05
- 시작 조건: stage=career, career.route=lecturer, news.lecturer-policy 유효, choices.group=인문사회

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 강사 제도 개편 직전에 학과가 다음 학기 강의 배정 축소를 통보한다. | 0 | 항상 |
| 2 | 저서와 번역 실적을 정리하며 신청서 기관란에 쓸 말을 고른다. | 12 | career.route=lecturer |
| 3 | 지역 인문학 박사들이 만든 협동조합 회의록에 이름이 오른다. | 12-24 | career.route=lecturer 또는 career.searching |

- 결말: 흐지부지 (협동조합 회의록에 이름만 남는다)
- 감사: 유지. 강사 제도 개편은 고유명이 아닌 일반 서술이고, 배정 축소→기관란 고민→협동조합 회의록 이름은 소속 없는 인문학 박사의 실제 경로를 짚는다.

### 증명의 오류와 중간 평가 (`story-career-5`, 이공)

- 근거: stem-career-08
- 시작 조건: stage=career, career.route=professor, career.rank=assistant, career.yearsInRoute 2~5, choices.track in {mathematics, statistics}

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 몇 달 쓴 증명에서 반례가 나와 칠판 사진을 지운다. | 0 | 항상 |
| 2 | 정년 보장 서류철 앞장에 반례 노트에서 정리한 조건을 끼운다. | 12-24 | log.promotion이 있음 (promotion-failed이면 갈래 메모) |

- 결말: 좋게 (log.promotion이 있을 때 마지막 메모). 갈래: log.promotion-failed가 있으면 나쁘게, 마지막 메모 '심사 통보서를 서랍에 넣고 복도 끝에 한참 서 있는다.'
- 감사: 유지 · 정리 단계 조건 수정: 반례·칠판 장면이라 수학·통계 트랙으로 제한. 반례로 칠판 사진을 지우는 장면은 수학·통계에서만 성립하므로 start_when에 track 제한을 더해야 하고, 중간 평가 공지 없이 두 메모만으로 끝나 얇지만 promotion 갈래는 판정 가능하다.

### 비정년의 긴 시간 (`story-career-6`, 인문사회)

- 근거: hs-career-08
- 시작 조건: stage=career, career.route=nontenure, career.yearsInRoute>=5

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 정년트랙 절반 수준인 급여명세서를 받고 다음 학기 강의 시수를 센다. | 0 | 항상 |
| 2 | 승진 규정 표에서 비정년 교원이 들어갈 항목을 찾지 못한다. | 24-36 | career.route=nontenure |
| 3 | 자신보다 높은 직급으로 부임하는 신임 교수 소개 공지를 읽는다. | 24-48 | career.route=nontenure 이고 log.promotion이 없음 |
| 4 | 연금 가입 기간을 계산한 메모지를 서랍 속 서류철에 끼운다. | 24-48 | career.route=nontenure 이고 log.promotion이 없음 |

- 결말: 흐지부지 (연금 계산 메모지가 서류철에 남는다)
- 감사: 유지. 급여명세서·승진 규정 표·신임 교수 소개 공지·연금 메모지는 비정년 교원이 해마다 마주치는 서로 다른 문서이고 '절반 수준'은 숫자가 아니다.

### 멈춘 논문과 운동화 (`story-life-family-retire-1`, 공통)

- 근거: hs-phd-13
- 시작 조건: stage=phd 이고 phd.leave.active=true 이고 leave.start 태그가 burnout

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 이틀 밤을 새운 몸으로 휴학 서류에 지도교수 서명을 받는다. | 0 | 항상 |
| 2 | 신발장 안쪽에서 오래 안 신은 운동화가 나온다. | 2-3 | stage=phd 이고 phd.leave.active=true |
| 3 | 병원에서 진단이 바뀌었다는 말을 듣고 논문 파일을 닫아 둔다. | 2-3 | stage=phd 이고 phd.leave.active=true |
| 4 | 복학 첫 주, 운동화를 현관에 두고 하루 끝에 진전을 짧게 적는다. | 2-3 | phd.leave.active=false 이고 stage=phd. 박사과정이 끝나거나 휴학이 이어지면 조용히 끊긴다. 마무리 메모: 휴학 서류철이 학과 사무실 서랍에서 다른 서류 아래로 밀려난다. |

- 결말: 좋게
- 감사: 수정(문장 2번째). 운동화가 '서랍'에서 나오는 사물 배치가 어색해 신발장으로 바꾸고, leave.start=burnout에서 복학까지 여섯~아홉 달은 학기 단위 휴학과 맞는다.

### 제본한 논문을 건넨 날 (`story-life-family-retire-2`, 공통)

- 근거: hs-phd-11
- 시작 조건: stage=phd 이고 month>=36 이고 (phd.partTime.kind=job 또는 phd.familySupport=0)

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 등록금 고지서와 학자금 대출 안내문 사이에 과외 일정을 끼워 넣는다. | 0 | 항상 |
| 2 | 통과 뒤 제본한 논문 한 권을 가족에게 건네고 그동안 든 비용을 짚어 본다. | 12-24 | log.degree가 있을 때 이 메모. log.end-dropout 또는 log.end-financial이면 이 메모 대신 결말의 마무리 메모. |

- 결말: 갈래: log.degree가 있으면 좋게(제본 메모로 끝). log.end-dropout 또는 log.end-financial이면 흐지부지(마무리 메모: 과외 교재를 끈으로 묶어 현관 앞에 내놓는다.)
- 감사: 수정(문장 2번째) · 정리 단계 조건 수정: 결말 표기와 이어질 조건의 갈래를 하나로 맞춤. '부모에게 건네며 비용을 말한다'는 부모 생존을 전제하고 familySupport=0과도 어긋나 가족으로 넓히며, ending 표기 흐지부지와 continue_if의 '좋게 갈래'가 서로 다르니 하나로 맞춰야 한다.

### 노부모 수납 영수증 (`story-life-family-retire-3`, 공통)

- 근거: hs-career-10
- 시작 조건: stage=career 이고 career.route in {lecturer, nontenure, postdoc} 이고 ageMonths 가 45세에 해당하는 달 이상

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 노부모의 병원 수납 영수증이 계약서 사본 옆에 매달 쌓인다. | 0 | 항상 |
| 2 | 학원 면접 일정이 잡힌 날, 가족은 대학을 떠나지 말라고 말한다. | 12-24 | stage=career 이고 career.route 가 lecturer, nontenure, postdoc 중 하나 |
| 3 | 도서관 출입증 갱신 신청서를 쓰다 말고 서랍에 넣는다. | 12-24 | stage=career. 조건이 깨지면 마무리 메모 없이 조용히 끊긴다. |

- 결말: 흐지부지
- 감사: 수정(문장 1, 3번째) · 정리 단계 조건 수정: 제목의 노모를 노부모로. 노모는 성별까지 정하므로 노부모로 바꾸되 부모 생존 전제는 남고, 학부 때부터 쓴 열람증이 사십대 중반까지 유효하다는 설정은 비현실적이라 갱신 신청서로 고친다; 제목의 노모도 같이 바꿀 것.

### 비어 있는 달력 (`story-life-family-retire-4`, 공통)

- 근거: hs-career-11
- 시작 조건: stage=retired 이고 log.retired 존재

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 퇴임식 다음 날, 달력에 적힌 일정이 하나도 없다. | 0 | 항상 |
| 2 | 도서관 대출 권한이 퇴직자 등급으로 바뀐다는 안내문이 온다. | 12-24 | stage=retired. log.end-age80 이 먼저 오면 이 메모 대신 마무리 메모: 달력은 여전히 벽에 걸려 있다. |
| 3 | 후배에게 보낼 안부 문자를 쓰다 지우고 달력을 넘긴다. | 12-24 | stage=retired. log.end-age80 이면 마무리 메모만 붙는다. |

- 결말: 나쁘게
- 감사: 유지. 퇴직자 등급 안내문이 퇴임 일이 년 뒤에 오는 간격은 연 단위 틱 때문이라 다소 늦지만, 빈 달력과 쓰다 지운 안부 문자는 end-age80 마무리까지 서사로만 끝난다.

### 지하 연구실의 서가 (`story-life-family-retire-5`, 인문사회)

- 근거: hs-career-12
- 시작 조건: decision.pre-retirement.A 선택 AND career.route=professor AND choices.group=인문사회

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 학과장이 퇴임 뒤 계획을 묻는데 아직 정해 둔 것이 없다. | 0 | 항상 |
| 2 | 대학이 강의를 맡기겠다고 하지만 후배 강사 자리를 생각해 거절한다. | 12-24 | decision.pre-retirement.A 이고 stage=career 또는 log.retired |
| 3 | 건물 지하의 작은 연구실로 서가를 옮기고 책등 순서를 맞춘다. | 12-24 | log.retired 존재. 조건이 깨지면 마무리 메모 없이 조용히 끊긴다. |

- 결말: 좋게
- 감사: 유지 · 정리 단계 조건 수정: '(권장)'을 지우고 계열 조건을 AND로 확정. 학과장의 질문, 후배 강사 자리를 생각한 거절, 지하 연구실 서가의 책등 맞추기는 명예교수 현실과 맞고 decision.pre-retirement.A로 판정되나 '(권장)' 표기는 엔진 조건이 아니므로 지우거나 AND로 확정해야 한다.

### 넘기지 못한 요령 (`story-life-family-retire-6`, 이공)

- 근거: stem-career-11
- 시작 조건: decision.pre-retirement.C 선택 이고 choices.group=이공

| 순서 | 문장 | 간격(개월) | 이어질 조건 |
|---|---|---|---|
| 1 | 퇴임을 앞두고 장비 운용 요령을 후배에게 넘기려 하나 문서가 없다. | 0 | 항상 |
| 2 | 자문을 맡은 제조업체 첫 회의에서 장비 운용 노트를 꺼내 놓는다. | 12-24 | ledger 에 post-retire-research 수입이 있고 decision.pre-retirement.C.declined 가 아님. declined 이면 이 단계 대신 짧게 나쁘게 끝나는 마무리 메모: 연구 자리 거절 통지서가 장비 운용 노트 위에 놓인다. |
| 3 | 제조업체 사장이 품질 문제를 말로만 설명하고 측정 자료는 없다. | 12-24 | post-retire-research 수입 유지 이고 career.postRetireResearchUntil 이전 |
| 4 | 보안 서약서의 책임 범위 문구를 고치다 서명란을 비워 둔다. | 12-24 | career.postRetireResearchUntil 이전. 그 달에 수입이 끝나면 흐지부지 끊긴다. |

- 결말: 나쁘게
- 감사: 수정(문장 2, 3번째). 둘째의 스타트업과 셋째의 중소 제조업체가 다른 회사처럼 읽히고 둘 다 품질 지적이 넘어가는 같은 갈등이라 둘째를 운용 노트를 꺼내는 장면으로 바꿔 첫 메모와 잇는다.

## 4. #124 일상 문장 감사 결과

[brainstorm-daily-life.md](brainstorm-daily-life.md)의 120줄을 같은 감사 기준으로 판정했다. id는 범주 key와 표의 행 순서다(`daily-<범주>-NN`). 유지 줄은 원문 그대로, 수정 줄은 고친 문장을 팩 파일 `daily`에 담았다. 공통 단계 줄은 `stage: "all"`로 적었다.

| 범주 | 유지 | 수정 | 삭제 |
|---|---|---|---|
| 식사와 집 (`meal-home`) | 20 | 0 | 0 |
| 수면과 건강 (`sleep-health`) | 0 | 20 | 0 |
| 이동과 날씨와 계절 (`move-weather`) | 0 | 20 | 0 |
| 가족과 명절 (`family-holiday`) | 10 | 10 | 0 |
| 친구와 취미 (`friends-hobby`) | 16 | 4 | 0 |
| 소비와 살림 (`money-chores`) | 13 | 7 | 0 |

| id | 판정 | 고친 문장 | 이유 |
|---|---|---|---|
| daily-meal-home-01 | 유지 |  | 싱크대에 쌓인 컵을 씻는 자취방 디테일이 구체적이고 현재형 규칙에 맞는다. |
| daily-meal-home-02 | 유지 |  | 라면 물을 올리고 뚜껑을 살짝 열어 두는 동작이 야식 현실 그대로다. |
| daily-meal-home-03 | 유지 |  | 두부 유통기한을 확인하는 장보기 장면, 숫자 없이 사물로 서술했다. |
| daily-meal-home-04 | 유지 |  | 기숙사 세탁실 건조기는 박사과정 단계에 맞는 공간이다. |
| daily-meal-home-05 | 유지 |  | 식은 커피를 전자레인지에 데우는 작은 행동, 과장 없이 현재형이다. |
| daily-meal-home-06 | 유지 |  | 김치통을 씻어 신발장 위에 두는 돌려주기 절차가 자연스럽다. |
| daily-meal-home-07 | 유지 |  | 빵 부스러기를 종이에 버리는 손동작은 평범하지만 어색하지 않다. |
| daily-meal-home-08 | 유지 |  | 냉장고 반찬 그릇을 하나씩 살펴보는 관찰 한 줄로 충분하다. |
| daily-meal-home-09 | 유지 |  | 양말 한 짝이 흔들리는 행위자 없는 관찰 서술은 규칙이 허용하는 형태다. |
| daily-meal-home-10 | 유지 |  | 달걀 한 판의 '한'은 수량 단어라 숫자 금지에 걸리지 않는다. |
| daily-meal-home-11 | 유지 |  | 퇴근길 편의점 삼각김밥은 경력 단계의 저녁 풍경으로 그럴듯하다. |
| daily-meal-home-12 | 유지 |  | 굳은 간장병 뚜껑을 비트는 동작이 사물 중심이라 좋다. |
| daily-meal-home-13 | 유지 |  | 세탁기 헹굼을 기다리며 베란다 창을 닦는 집안일 연결이 현실적이다. |
| daily-meal-home-14 | 유지 |  | 이사 상자 접시를 수건 위에 말리는 세부가 경력 단계의 이사와 맞는다. |
| daily-meal-home-15 | 유지 |  | 시장 나물을 참기름에 무치는 조리 장면에 상호·지명이 없다. |
| daily-meal-home-16 | 유지 |  | 아침마다 같은 찻잔에 보리차를 따르는 반복은 은퇴 단계의 느린 시간에 맞는다. |
| daily-meal-home-17 | 유지 |  | 이웃 할머니의 열무김치는 daily-meal-home-06의 김치통과 소재가 겹치나 먹는 동작이라 둘 다 둔다. |
| daily-meal-home-18 | 유지 |  | 텃밭 상추를 채반에 받치는 은퇴 살림이 구체적이다. |
| daily-meal-home-19 | 유지 |  | 비 오는 날 현관에 우산 세우기는 공통 단계에 맞는 사실 서술이다. |
| daily-meal-home-20 | 유지 |  | 남은 과자를 종이 접시에 옮기는 간식 처리가 무난하다. |
| daily-sleep-health-01 | 수정 | 새벽에 깼다가 다시 잠들지 못해 천장의 무늬만 한참 본다. | '보았다'를 '본다'로 바꿔 현재형 규칙에 맞춘다; 새벽 불면 디테일은 좋다. |
| daily-sleep-health-02 | 수정 | 모니터를 끄고 의자에 등을 기댄 채 잠깐 눈을 붙인다. | '붙였다'를 '붙인다'로; 모니터 끄고 쪽잠 자는 연구실 장면은 그대로 둔다. |
| daily-sleep-health-03 | 수정 | 목 뒤가 뻐근해서 고개를 천천히 좌우로 돌려 푼다. | '풀었다'만 '푼다'로 고친다; 목 뒤 뻐근함 묘사는 구체적이다. |
| daily-sleep-health-04 | 수정 | 두통약 한 알을 물과 함께 삼키고 책상 위 물컵을 비운다. | '비웠다'를 '비운다'로; 두통약 한 알의 '한'은 수량 단어라 허용된다. |
| daily-sleep-health-05 | 수정 | 점심 뒤 몰려오는 졸음을 쫓으려 승강기 대신 계단으로 오른다. | 졸음과 계단 오르기 사이 인과가 빠져 '쫓으려'를 넣고 '올랐다'를 현재형으로 고친다. |
| daily-sleep-health-06 | 수정 | 약국에서 산 연고를 허리 아픈 자리에 얇게 펴 바른다. | 연고는 약국에서 '받은' 것이 아니라 산 것이고 '발랐다'도 현재형으로 바꾼다. |
| daily-sleep-health-07 | 수정 | 퇴근길 공원을 한 바퀴 돌며 땀이 날 때까지 가볍게 뛴다. | '뛰었다'를 '뛴다'로; 박사과정의 퇴근길 표현은 대학원 관행상 어색하지 않다. |
| daily-sleep-health-08 | 수정 | 안과에서 받은 안약을 넣고 한동안 눈을 감은 채 쉰다. | '쉬었다'를 '쉰다'로; 안과 안약은 모니터 앞에 오래 앉는 사람에게 그럴듯하다. |
| daily-sleep-health-09 | 수정 | 늦은 밤 마신 커피 탓에 잠자리에 누워서도 뒤척이기만 한다. | '뒤척이기만 했다'를 현재형으로; 커피 탓 불면은 박사과정 단계에 맞는다. |
| daily-sleep-health-10 | 수정 | 책을 덮고 어깨를 돌리며 창밖의 나무를 한동안 바라본다. | '바라보았다'를 '바라본다'로; daily-sleep-health-02·03과 휴식 동작이 겹치지만 창밖 나무 장면이 달라 유지한다. |
| daily-sleep-health-11 | 수정 | 회의가 길어져 점심을 거르고 나니 머리가 맑지 않다. | '맑지 않았다'를 '맑지 않다'로; 회의로 점심 거르기는 경력 단계에 맞다. |
| daily-sleep-health-12 | 수정 | 아침 일찍 일어나 스트레칭 매트를 펴고 허리를 천천히 숙인다. | '숙였다'를 '숙인다'로; 스트레칭 매트를 펴는 동작이 사물 중심이다. |
| daily-sleep-health-13 | 수정 | 병원 대기실 의자에 앉아 이름이 불리기를 기다리며 물을 마신다. | '마셨다'를 '마신다'로; 대기실에서 이름 불리기를 기다리는 절차가 병원 그대로다. |
| daily-sleep-health-14 | 수정 | 주말에 자전거를 타고 강변을 달리니 다리가 가볍게 풀린다. | '달리자…풀렸다'를 '달리니…풀린다'로; 강변 자전거는 상호 없는 일반 장소다. |
| daily-sleep-health-15 | 수정 | 오후 내내 앉아 있던 탓에 종아리가 묵직하게 부어 있다. | '부어 있었다'를 '부어 있다'로; 종아리 부기는 앉아 일하는 직군의 현실이다. |
| daily-sleep-health-16 | 수정 | 아침마다 혈압계를 꺼내 팔에 띠를 감는다. | '혈압 재는 기계'를 혈압계로 줄이고 '감았다'를 현재형으로 바꾼다. |
| daily-sleep-health-17 | 수정 | 느긋하게 걷는 산책길에서 무릎이 시큰거려 벤치에 잠시 앉는다. | '손주 생각하며'는 가족 전제라 빼고, 쉬는 동작을 벤치로 구체화해 현재형으로 쓴다. |
| daily-sleep-health-18 | 수정 | 오래 앓던 감기가 떨어지지 않아 따뜻한 차를 자주 마신다. | '마셨다'를 '마신다'로; 오래 가는 감기와 따뜻한 차는 은퇴 단계 건강 서술로 무난하다. |
| daily-sleep-health-19 | 수정 | 물을 여러 잔 마시고 나니 얼굴의 부기가 조금 가라앉는다. | '가라앉았다'를 '가라앉는다'로; 얼굴 부기 디테일은 평범하다. |
| daily-sleep-health-20 | 수정 | 밤사이 이불을 걷어차고 자서 아침에 목이 잠겨 있다. | '잠겨 있었다'를 '잠겨 있다'로; 이불 걷어찬 뒤 목 잠김은 환절기 현실이다. |
| daily-move-weather-01 | 수정 | 통학 버스 창가에 앉아 젖은 우산을 무릎에 올려 둔다. | '올려 두었다'를 '올려 둔다'로; 통학 버스의 젖은 우산은 박사과정 등교 장면에 맞다. |
| daily-move-weather-02 | 수정 | 비가 그친 아침 캠퍼스 길에 물웅덩이가 남아 있다. | '남아 있었다'를 현재형으로; 물웅덩이는 행위자 없는 관찰 서술로 허용된다. |
| daily-move-weather-03 | 수정 | 지하철 문이 열리자 습한 바람이 들어와 가방 끈이 눅눅해진다. | 바람이 가방 끈을 '적셨다'는 물리적으로 어색해 눅눅해진다로 고치고 현재형으로 맞춘다. |
| daily-move-weather-04 | 수정 | 황사가 낀 날에는 마스크 끈이 자꾸 귀를 누른다. | '눌렀다'를 '누른다'로; 황사철 마스크 끈이 귀를 누르는 사물 디테일이 구체적이다. |
| daily-move-weather-05 | 수정 | 은행나무 잎이 떨어진 산책로를 천천히 걸어 연구실로 돌아온다. | '돌아왔다'를 '돌아온다'로; 은행나무 길과 연구실 복귀는 가을 캠퍼스 그대로다. |
| daily-move-weather-06 | 수정 | 더위에 지친 저녁, 버스 손잡이의 차가운 금속을 오래 잡고 있다. | '잡고 있었다'를 '잡고 있다'로; 냉방 버스 손잡이의 차가운 금속은 더위와 대비돼 그럴듯하다. |
| daily-move-weather-07 | 수정 | 퇴근길 버스 정류장에서 눈발이 처음 흩날리는 것을 본다. | '보았다'를 '본다'로; 정류장 첫 눈발은 daily-move-weather-14의 첫눈 아침과 시점·단계가 달라 유지한다. |
| daily-move-weather-08 | 수정 | 장마가 길어져 신발이 현관에서 며칠째 마르지 않는다. | '마르지 않았다'를 '마르지 않는다'로; 장마철 신발이 안 마르는 것은 자취 현실이다. |
| daily-move-weather-09 | 수정 | 계절이 바뀌는 사이 옷장 앞에서 얇은 외투를 고른다. | '골랐다'를 '고른다'로; 환절기 옷장 앞 외투 고르기는 무난하다. |
| daily-move-weather-10 | 수정 | 캠퍼스 벤치에 앉아 점심 도시락을 천천히 비운다. | '비웠다'를 '비운다'로; 도시락은 이동·날씨 묶음과 거리가 있으나 야외 벤치라 둔다. |
| daily-move-weather-11 | 수정 | 출근길 지하철에서 젖은 우산을 다리 사이에 세우고 손잡이를 잡는다. | '신문 대신'은 시대에 안 맞는 디테일이라 빼고 젖은 우산 두는 동작을 구체화해 현재형으로 쓴다. |
| daily-move-weather-12 | 수정 | 폭염 주의보가 울린 오후, 에어컨 바람이 닿는 자리로 옮긴다. | '옮겼다'를 '옮긴다'로; 폭염 주의보 재난문자가 울리는 오후는 구체적이다. |
| daily-move-weather-13 | 수정 | 비 오는 퇴근길, 횡단보도 신호가 바뀌기를 우두커니 기다린다. | '기다렸다'를 '기다린다'로; 횡단보도 신호 대기는 사실 서술 한 줄이다. |
| daily-move-weather-14 | 수정 | 첫눈이 내린 아침 출근 버스 창에 입김 자국이 남는다. | '남았다'를 '남는다'로; daily-move-weather-07과 첫눈이 겹치나 입김 자국이라는 사물이 달라 둘 다 둔다. |
| daily-move-weather-15 | 수정 | 봄바람에 벚꽃 잎이 가방 위로 떨어져 내려앉는다. | '내려앉았다'를 '내려앉는다'로; 벚꽃 잎과 가방은 과장 없는 봄 관찰이다. |
| daily-move-weather-16 | 수정 | 동네 산책길에서 늦가을 낙엽이 발끝에 밟히는 소리를 듣는다. | '들었다'를 '듣는다'로; 낙엽 밟히는 소리는 은퇴 산책 장면에 맞다. |
| daily-move-weather-17 | 수정 | 장마철 버스 창으로 흐린 하늘을 오래 바라본다. | '바라보았다'를 '바라본다'로; 장마철 버스 창의 흐린 하늘은 은퇴 단계의 느린 시간에 어울린다. |
| daily-move-weather-18 | 수정 | 비 그친 오후, 집 앞 공원 벤치의 물기를 손수건으로 닦는다. | '닦았다'를 '닦는다'로; 손수건으로 벤치 물기 닦기는 은퇴 세대 습관으로 그럴듯하다. |
| daily-move-weather-19 | 수정 | 우산을 챙기지 않은 날, 처마 아래에서 빗줄기를 지켜본다. | '지켜보았다'를 '지켜본다'로; 처마 아래 비 피하기는 공통 단계에 맞다. |
| daily-move-weather-20 | 수정 | 창문을 열자 바깥 공기에서 늦가을 냄새가 난다. | '났다'를 '난다'로; 늦가을 냄새는 daily-move-weather-16의 낙엽과 계절이 같지만 감각이 달라 유지한다. |
| daily-family-holiday-01 | 유지 |  | 설거지를 하며 부모님 전화를 받는 동작이 구체적이고 부모는 범주에 내재한다. |
| daily-family-holiday-02 | 유지 |  | 차례상 전을 식지 않게 덮어 두는 사물 묘사가 명절 아침과 맞는다. |
| daily-family-holiday-03 | 수정 | 조카가 명절에 그려 준 그림을 자취방 냉장고 문에 붙인다. | '방에서 그린'은 어느 방인지 불분명해 명절·자취방으로 장소를 고정했다. |
| daily-family-holiday-04 | 유지 |  | 고향 집 감나무 가지가 늘어진 관찰은 숫자 없이 계절감을 준다. |
| daily-family-holiday-05 | 유지 |  | 제사 뒤 식은 국을 데우는 행동은 02의 차례상 덮기와 다른 장면이다. |
| daily-family-holiday-06 | 수정 | 사촌이 보낸 안부 문자에 짧게 답장을 보낸다. | '사촌 형'은 화자를 남성으로 전제하므로 사촌으로 바꿨다. |
| daily-family-holiday-07 | 유지 |  | 연휴 막바지 기차표를 손에 쥔 귀경 장면은 흔하나 종이표는 요즘 드물다. |
| daily-family-holiday-08 | 유지 |  | 밑반찬 통이 가방 속에서 달그락거리는 소리 디테일이 좋다. |
| daily-family-holiday-09 | 유지 |  | 할아버지 기일에 향을 피우는 장면은 박사과정 나이에 자연스럽다. |
| daily-family-holiday-10 | 수정 | 동생이 사 온 떡국 떡을 끓이니 유난히 쫄깃하다. | '쫄깃하다고 말했다'는 말한 사람이 불분명해 관찰 서술로 바꿨다. |
| daily-family-holiday-11 | 유지 |  | 밀린 보고서를 띄운 채 열차에 오르는 경력 단계의 귀성이 현실적이다. |
| daily-family-holiday-12 | 수정 | 연휴 첫날 아침 직장 단체 대화방에 인사말이 한꺼번에 쌓인다. | '회사 메신저'는 연구자 경력에 맞지 않고 메신저에 문자가 쌓인다는 표현이 어긋난다. |
| daily-family-holiday-13 | 유지 |  | 퇴근길 시장에서 송편 봉지를 집는 짧은 동작이 명절 전날과 맞는다. |
| daily-family-holiday-14 | 수정 | 연휴에 집에 못 가서 부모님께 영상통화로 차례 음식을 본다. | '연휴 내내 부모님께 전화'는 01과 겹쳐 귀성 못 한 상황으로 바꿨다. |
| daily-family-holiday-15 | 수정 | 명절 저녁 식구들과 상에 둘러앉아 오래된 노래를 같이 듣는다. | '아내가 차린 상'은 배우자와 성별을 전제해 식구들로 바꿨다. |
| daily-family-holiday-16 | 수정 | 연휴 손님이 다녀간 뒤 현관의 흐트러진 슬리퍼를 가지런히 놓는다. | 손주들을 전제하고, 다녀간 뒤 '남은 신발'은 앞뒤가 맞지 않아 손님 슬리퍼로 바꿨다. |
| daily-family-holiday-17 | 유지 |  | 마당 멍석에 콩을 말리는 은퇴 장면은 시골 전형이지만 규칙 위반은 없다. |
| daily-family-holiday-18 | 수정 | 벌초 가는 길에 낫과 장갑을 챙겨 선산 비탈을 천천히 오른다. | 은퇴 단계에서 아버지와 선산을 오르는 설정은 나이가 맞지 않아 벌초 장면으로 바꿨다. |
| daily-family-holiday-19 | 수정 | 오랜만에 모인 식구들이 한 줄로 서서 단체 사진을 찍는다. | '같은 사진 앞에서 섰다'는 사진을 찍는지 보는지 모호해 찍는 동작으로 고쳤다. |
| daily-family-holiday-20 | 수정 | 식구들이 까먹은 귤 껍질이 상 위에 수북하다. | '나눠 먹을 귤'의 껍질이 이미 수북하다는 시제 충돌을 없앴다. |
| daily-friends-hobby-01 | 유지 |  | 학회 준비 탓에 친구 연락을 며칠 뒤 확인하는 일은 대학원생에게 흔하다. |
| daily-friends-hobby-02 | 유지 |  | 동아리 산행 뒤 국밥은 구체적이고 숫자나 실명이 없다. |
| daily-friends-hobby-03 | 유지 |  | 미뤄 둔 소설을 밤마다 조금씩 읽는 독서 취미 서술이 무리 없다. |
| daily-friends-hobby-04 | 수정 | 연구실 동기와 영화를 보고 나와 포장마차 의자에 앉는다. | '실험실 동기'는 실험 분야 트랙에만 맞아 연구실로 바꿨다. |
| daily-friends-hobby-05 | 유지 |  | 고무나무 잎 하나 떨어진 관찰은 10의 화분 물 주기와 다른 순간이다. |
| daily-friends-hobby-06 | 유지 |  | 친구가 보낸 음악 목록을 통근길에 듣는 것은 무난하며 대학원생도 출퇴근이라 말한다. |
| daily-friends-hobby-07 | 유지 |  | 탁구 모임에서 손목이 시큰거리는 신체 감각이 구체적이다. |
| daily-friends-hobby-08 | 유지 |  | 자료를 덮고 산책로 한 바퀴는 취미 범주로는 밋밋하지만 다른 줄과 겹치지 않는다. |
| daily-friends-hobby-09 | 유지 |  | 대학 시절 친구에게 전화해 안부를 묻는 줄은 01의 늦은 확인과 방향이 다르다. |
| daily-friends-hobby-10 | 유지 |  | 잎끝 마른 부분을 떼어내는 손동작이 화분 돌보기를 잘 보여 준다. |
| daily-friends-hobby-11 | 유지 |  | 보드게임 판을 새벽까지 이어 가는 경력 단계 저녁은 가능하나 흔하지는 않다. |
| daily-friends-hobby-12 | 유지 |  | 회식 뒤 동료와 밤공기를 쐬며 걷는 장면은 직장 생활과 맞는다. |
| daily-friends-hobby-13 | 수정 | 공원 달리기 모임에서 아침 코스를 마치고 벤치에서 땀을 닦는다. | '러닝 모임과 아침 달리기를 마치고'는 문장 성분이 어긋나 고쳤다. |
| daily-friends-hobby-14 | 유지 |  | 축의금 봉투를 챙겨 결혼식에 가는 사물 디테일이 한국 경력 초반과 맞는다. |
| daily-friends-hobby-15 | 유지 |  | 재즈 음반을 거실에서 틀어 두는 줄은 브랜드나 실명 없이 취미를 보여 준다. |
| daily-friends-hobby-16 | 유지 |  | 바둑 한 판 뒤 찻집 식혜는 은퇴 단계에 어울리나 찻집 메뉴로는 조금 어색하다. |
| daily-friends-hobby-17 | 수정 | 옛 제자가 보내 준 동영상을 돋보기를 쓰고 천천히 들여다본다. | 손주를 전제하므로 연구자 생애에 맞는 옛 제자로 바꿨다. |
| daily-friends-hobby-18 | 유지 |  | 화단 상추를 아침마다 솎는 텃밭 취미는 은퇴 단계에 무난하다. |
| daily-friends-hobby-19 | 수정 | 책장 위 오래된 단체 사진을 한참 들여다보다 커피가 식는다. | '웃는 얼굴'과 '커피를 식혔다'는 감상 어투라 사물 중심으로 바꿨다. |
| daily-friends-hobby-20 | 유지 |  | 서점에서 낡은 엽서를 고르는 줄은 괜찮으나 새 서점에 낡은 엽서는 약간 어색하다. |
| daily-money-chores-01 | 유지 |  | 통신비 명세서의 요금제를 들여다보는 행동은 학생 가계에 맞는다. |
| daily-money-chores-02 | 유지 |  | 교통카드를 찍고 개찰구를 지나는 줄은 살림 범주와 연결이 약하지만 규칙은 지킨다. |
| daily-money-chores-03 | 유지 |  | 구독 해지 화면에서 손가락이 멈추는 순간이 요즘 소비 현실과 맞는다. |
| daily-money-chores-04 | 유지 |  | 배수 펌프 수리 기사가 부품 번호를 적어 가는 절차 디테일이 좋다. |
| daily-money-chores-05 | 유지 |  | 택배 테이프를 뜯다 칼날이 손등을 스치는 작은 사고가 구체적이다. |
| daily-money-chores-06 | 유지 |  | 중고 장터에 올린 의자가 팔리는 줄은 14의 중고 구매와 방향이 반대다. |
| daily-money-chores-07 | 수정 | 연말정산 서류 제출 안내를 보고 월세 계약서 사본을 찾는다. | 세금 서류를 우체통에 넣는 절차는 요즘 한국에서 거의 없어 연말정산 장면으로 바꿨다. |
| daily-money-chores-08 | 유지 |  | 냉장고 고무 패킹이 헐거워진 관찰은 자취 가전의 흔한 고장이다. |
| daily-money-chores-09 | 수정 | 적금 자동이체 날짜를 조교 급여 입금일 뒤로 옮긴다. | 자동이체 목록을 훑으며 한숨 쉬는 줄은 01·18의 명세서 보기와 겹쳐 날짜 옮기기로 바꿨다. |
| daily-money-chores-10 | 유지 |  | 우산살을 갈아 끼우는 수선은 드물어졌지만 살림 범주에 들어맞는다. |
| daily-money-chores-11 | 수정 | 전기요금 자동 납부를 신청하려고 점심시간에 은행 앱에서 계좌를 인증한다. | 고지서를 자동 납부로 바꾸느라 점심이 늦어진다는 인과가 약해 점심시간 행동으로 고쳤다. |
| daily-money-chores-12 | 수정 | 이사 다음 날 주민센터에서 전입신고를 하고 등본 한 통을 뗀다. | '주소 변경 신고서'와 '관공서 창구'는 전입신고라는 실제 절차보다 막연하다. |
| daily-money-chores-13 | 수정 | 노트북 충전기 케이블의 벗겨진 자리를 절연 테이프로 감는다. | 끊어진 케이블을 땜질하고 테이프로 감는다는 순서가 앞뒤가 맞지 않는다. |
| daily-money-chores-14 | 유지 |  | 중고 전자제품의 나사 풀린 덮개를 살피는 줄은 점검 디테일이 있으나 상황이 다소 추상적이다. |
| daily-money-chores-15 | 수정 | 직장 근처 세탁소에서 맡긴 셔츠를 찾아와 옷걸이에 건다. | '회사 근처'는 연구자 경력과 어긋나 직장으로 바꿨다. |
| daily-money-chores-16 | 유지 |  | 여름옷을 햇볕에 말리고 정리하는 계절 살림은 은퇴 단계에 무리가 없다. |
| daily-money-chores-17 | 유지 |  | 시계 건전지를 갈고 줄을 늘리는 작은 수선이 은퇴 생활에 맞는다. |
| daily-money-chores-18 | 유지 |  | 은행 창구 대신 휴대폰으로 공과금 내역을 보는 줄은 09를 고친 뒤 겹치지 않는다. |
| daily-money-chores-19 | 수정 | 우편함에 꽂힌 광고 전단지를 빼서 종이 분리수거함에 넣는다. | '말없이'는 꾸밈말이라 빼고 분리수거 동작만 남겼다. |
| daily-money-chores-20 | 유지 |  | 외투 단추가 떨어져 서랍 속 실과 바늘을 찾는 장면이 구체적이다. |
## 5. 엔진·화면 연결 제안

연결은 [brainstorm-random-lines.md](brainstorm-random-lines.md) §5의 방향을 그대로 잇는다. 엔진은 바꾸지 않고, 문장 선택은 화면 쪽 순수 함수가 한다. 코드는 `web/src/flavor.ts`(선택 함수)와 `web/src/play.ts`의 `notes()`(기록마다 문장을 붙이는 자리)에 들어가며, 화면 구성을 다루는 design 세션과 조율한 뒤 후속 PR에서 한다.

### 5.1 스토리라인 예약

- 매달(경력·은퇴 단계는 매년) 기록을 붙일 때, 진행 중인 스토리라인이 없으면 각 스토리라인의 `start_when`을 확인한다. 맞는 것이 있으면 하나를 골라 예약한다. 예약에는 스토리라인 id, 다음 메모 순서, 그 메모가 붙을 수 있는 달의 범위(지금 달 + `gap_months`)를 적는다.
- 예약된 메모의 범위에 들어온 달에 `continue_if`가 맞으면 그 메모를 붙인다. 이 메모는 무작위 한 줄 메모보다 먼저다. 원작 구조에서 예약된 후속 장면이 먼저 나오던 것과 같은 순서다.
- `continue_if`가 깨지면 결말에 적힌 마무리 메모를 붙이고 스토리라인을 끝낸다. 마무리 메모가 없으면 조용히 끝낸다. 범위의 마지막 달까지 조건이 맞지 않아도 같은 방식으로 끝낸다.
- 한 번에 진행하는 스토리라인은 하나로 둔다(제안). 같은 스토리라인은 한 생애에 한 번만 나온다.
- 추첨 seed는 저장 seed + `storyline`으로 따로 둔다. 무작위 메모의 seed(저장 seed + `flavor`)나 엔진 추첨과 섞지 않으므로, 팩이 바뀌어도 게임 결과는 그대로다.

### 5.2 한 달 최대 한 줄 규칙과의 관계

- 기존 규칙은 그대로다: 한 달에 붙는 창작 문장은 최대 한 줄이고, 그 달에 결정 결과 문장이나 `logScene` 장면 문장이 이미 있으면 무작위 메모는 붙이지 않는다.
- 스토리라인 메모도 이 한 줄에 포함된다. 결정 결과나 장면 문장이 있는 달에는 메모를 버리지 않고 다음 달로 미룬다. 미룬 달이 `gap_months` 범위를 벗어나면 범위 끝에서 한 번 더 확인하고, 그래도 안 되면 마무리 메모 규칙으로 끝낸다.
- 우선순위: 결정 결과·장면 문장 > 스토리라인 메모 > 무작위 한 줄 메모(`lines`) > 일상 문장(`daily`). 일상 문장은 그 달 다른 문장이 없을 때만 후보가 된다.

### 5.3 팩 파일과 검사

- `lines[].when`과 `storylines[].start_when`·`continue_if`는 지금 사람이 읽는 조건 문자열이다. 연결 PR에서 판정 가능한 형식(필드·연산자·값 목록)으로 바꾸고, `scripts/validate-data.mjs`에 형식 검사(15~45자, 숫자 없음, 범주·태그 필수, 조건 필드가 실제 상태 필드인지)를 더한다.
  - 스토리라인은 #190에서 바꿨다. 조건은 `web/src/flavor.ts` atom 형식(`AND`·`OR`·`NOT`)이고, 사람이 읽던 `ending` 산문은 `ending`(좋게·나쁘게·흐지부지), `interrupt`(열린 동안 휴학이 시작되면 붙는 문장), 비트별 `break_text`·`break_if`(조건이 끝내 깨질 때 문장)로 나눴다. 비트 문장은 그대로다. 해석 못 한 원자 0건은 `web/test/storylines.test.ts`가, 간격 형식·끝맺음 값·새 문장의 문장 규칙은 `scripts/validate-data.mjs`가 검사한다. 진행 규칙은 `web/src/storylines.ts` 머리 주석.
- `daily[].stage`의 `"all"`은 공통 단계다. 일상 문장은 범주와 단계만 있고 상태 조건이 없다.
- 재등장 간격(박사과정 30개월, 그 밖 48개월)과 같은 첫 태그 감쇠는 brainstorm-random-lines.md §3을 따른다.
- 테스트: 같은 seed면 같은 문장, 예약된 메모가 무작위 메모보다 먼저, 장면 문장이 있는 달에는 미룸, 조건이 깨지면 마무리 메모, 실명 목록(비공개 대응표의 해시, #113)과 겹침 0건.

## 6. 남은 일

- 연결 PR: §5의 예약 방식과 조건 형식을 design 세션과 정한 뒤 `web/src/flavor.ts`·`play.ts`에 구현한다. 그 전에 "하위 구간"·"상위 구간"(관계, 마음, 학위논문 진척)의 수치를 가정 상수로 정한다.
- 일상 문장 시제: 감사가 수면과 건강, 이동과 날씨 줄은 현재형으로 고쳤지만, 가족과 명절·친구와 취미·소비와 살림의 유지 줄 다수는 원문의 과거형 그대로다. 유지 줄은 원문을 바꾸지 않는다는 원칙에 따라 그대로 실었으므로, 시제 통일을 할지 따로 정한다.
- 일상 문장의 부모 전제: "부모님 전화", "어머니가 싸 준 밑반찬", "아버지와 향" 같은 줄은 감사가 유지로 판정했다. 엔진에는 부모 생존 상태가 없으므로, 부모 줄을 `phd.familySupport>0`일 때만 내보낼지 연결 PR에서 정한다.
- 실명 대조: 이번 정리는 눈으로 한 검사다. 비공개 대응표(#113)와의 기계 대조는 연결 PR의 테스트에서 한다.
- 얇은 스토리라인: `story-hs-phd-4`와 `story-career-5`는 메모가 두 개뿐이다. `story-career-5`는 감사가 지적한 중간 평가 메모를 더할 수 있다.
- 아직 비어 있는 곳: 입학 전(pre) 단계와 `life.start` 줄, 승진 성공·실패(`log.promotion`·`log.promotion-failed`)에 직접 붙는 한 줄, 학교 소식형 사건(등록금, 학생 복지, 연구 윤리, 장학 공고)은 이번 회차에서 쓰지 않았다.
- 뺀 것: 병역 대체복무, 배우자·자녀·손주 장면(엔진에 상태 없음). 지도교수의 인건비 징수는 한 줄 메모에서 빼고 `story-hs-phd-5` 하나로만 두었다.
