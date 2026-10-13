# Wave 3 근거 레코드 색인

- 작성: 근거 레코드 조회·표 작성 역할(sonnet), 2026-10-13. 기준: 브랜치 `wave-3/engine-spec`, main `146aae8`. 이 파일은 레코드를 읽어 만든 색인이며 데이터와 결정 기록을 바꾸지 않는다.
- 용도: 스펙 초안 작성자(opus)가 record id를 정확히 인용하도록 모은 조회표. 값은 레코드 `value`를 그대로 옮겼고, "computed"로 표시한 것만 이 색인이 계산했다(레코드 아님).
- 약어: conf `v`=verified, `i`=indexed, `a`=assumed(설계 가정). NRF=한국연구재단 학술연구분야분류. KEDI=한국교육개발원. KSCED=한국표준교육분류. KRIVET=한국직업능력연구원. KISTEP=한국과학기술기획평가원. 정의는 [용어집](../../workflow.md#용어집).
- 계열 체계 태그(통계 행 population 칸 앞): `[KSCED10]` 한국표준교육분류 10계열, `[KEDI7]` KEDI 7 대계열, `[KISTEP]` 과학기술인력(자연·공학·의약학), `[NRF]` 대분류, `[game]` 인문사회/이공/기타. 대응표는 §6.
- id 표기: `{a/b}`는 택일, `{a,b,c}`는 나열(모두 존재), `{1..33}`은 번호 범위, `{year}`·`{school}`·`{계열}` 같은 이름은 치환 자리, `…`는 같은 패턴 전체. 시계열은 `-{year}` 접미사가 붙는다. 같은 접두에 `-2021-2024` 접미사가 붙은 것은 4년 합산이며 `year` 필드는 2024로 같으므로 id로만 구별한다.
- 금액 단위: `krw`=원, 만원은 이 색인이 환산한 표기(`만`).

## 1. 입학 전 선택 6종

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| ① 계열 선택지 (인문사회 / 이공) | taxonomy-nrf-a000000, taxonomy-nrf-b000000 → 인문사회; taxonomy-nrf-c000000, taxonomy-nrf-d000000 → 이공 | value 1 (대분류) | level | [NRF] 학술연구분야분류 대분류 | 2024 | v | note에 `계열 인문사회\|이공` 기록(결정 기록 0007). 선택지에서 빼는 대분류: taxonomy-nrf-e000000 의약학, -f000000 농수해양학, -g000000 예술체육학, -h000000 복합학(note 계열 기타). 8건 모두 verified. |
| ② 전공군: NRF 중분류 수 | taxonomy-nrf-{a/b/c/d}NN0000 (value 2) | A 24 + B 22 = 46 (인문사회); C 13 + D 28 = 41 (이공) | count of 중분류 | [NRF] | 2024 | v | 중분류 id는 `taxonomy-nrf-{code 소문자}`이며 note 첫 칸이 한글명, 둘째 칸이 `상위 {대분류}`. 범위 밖 E–H는 중분류 66건. |
| ② 전공군: 게임 트랙 26개 (대안 단위) | mapping-tracks.json (66행, 레코드 아님): primary 26행 + 보조 40행. 아래 "트랙 표" | 인문사회 10개, 이공 16개 | track | [game] 트랙 = 서사·방법 태그, 분류 축 아님(결정 기록 0007·0008) | 2026 | v 22 / i 16 / a 28 (행 기준) | primary가 중분류인 트랙 19개, 소분류인 트랙 7개. 전공군을 중분류로 할지 트랙으로 할지는 스펙 결정 사항. |
| ③ 세부전공: NRF 소분류 수 | taxonomy-nrf-{a/b/c/d}NNNN00 (value 3) | A 173 + B 258 = 431 (인문사회); C 135 + D 313 = 448 (이공) | count of 소분류 | [NRF] | 2024 | v | E–H 대분류는 소분류 레코드가 0건(중분류까지만 수록). 트랙별 선택지 수는 트랙 표의 "소분류 수"+"보조 후보 수". |

**트랙 표** (mapping-tracks.json, 결정 기록 0008. 소분류 수 = primary가 중분류면 그 아래 소분류 레코드 수, 소분류면 1. 학과 수 = departments 483건 중 note `track` 값. field 키 = 학교 등록금·학과 레코드의 분야 키)

| track | 계열 | primary record id | 이름 (수준) | conf | 소분류 수 | 보조 후보 수 | 학과 수 | field 키 |
|---|---|---|---|---|---|---|---|---|
| systems_biology | 이공 | taxonomy-nrf-c071600 | 생물정보학 (L3) | a | 1 | 3 | 5 | bio |
| semiconductor | 이공 | taxonomy-nrf-d120100 | 반도체 (L3) | v | 1 | 3 | 19 | engineering |
| energy | 이공 | taxonomy-nrf-d020700 | 에너지및동력공학 (L3) | i | 1 | 5 | 28 | engineering |
| computer | 이공 | taxonomy-nrf-d130000 | 컴퓨터학 (L2) | v | 21 | 0 | 29 | cs |
| ai | 이공 | taxonomy-nrf-d131100 | 인공지능 (L3) | v | 1 | 4 | 32 | cs |
| mathematics | 이공 | taxonomy-nrf-c020000 | 수학 (L2) | v | 9 | 0 | 17 | math |
| statistics | 이공 | taxonomy-nrf-c030000 | 통계학 (L2) | v | 9 | 0 | 13 | math |
| life_science | 이공 | taxonomy-nrf-c070000 | 생물학 (L2) | v | 19 | 0 | 25 | bio |
| bioengineering | 이공 | taxonomy-nrf-d070000 | 생물공학 (L2) | v | 9 | 4 | 27 | bio |
| neuroscience | 이공 | taxonomy-nrf-c070600 | 신경생물학 (L3) | i | 1 | 1 | 9 | bio |
| mechanical | 이공 | taxonomy-nrf-d020000 | 기계공학 (L2) | v | 8 | 0 | 27 | engineering |
| electrical | 이공 | taxonomy-nrf-d090000 | 전기공학 (L2) | v | 21 | 1 | 25 | engineering |
| chemical | 이공 | taxonomy-nrf-d050000 | 화학공학 (L2) | v | 22 | 1 | 19 | engineering |
| materials | 이공 | taxonomy-nrf-d100000 | 재료공학 (L2) | v | 10 | 0 | 26 | engineering |
| civil | 이공 | taxonomy-nrf-d140000 | 토목공학 (L2) | v | 19 | 6 | 19 | engineering |
| environmental | 이공 | taxonomy-nrf-d110000 | 환경공학 (L2) | i | 9 | 3 | 19 | engineering |
| sociology | 인문사회 | taxonomy-nrf-b080000 | 사회학 (L2) | v | 19 | 0 | 14 | social |
| economics | 인문사회 | taxonomy-nrf-b030000 | 경제학 (L2) | v | 11 | 0 | 15 | social |
| political | 인문사회 | taxonomy-nrf-b020000 | 정치외교학 (L2) | i | 7 | 0 | 16 | social |
| public_administration | 인문사회 | taxonomy-nrf-b140000 | 행정학 (L2) | v | 11 | 1 | 15 | social |
| psychology | 인문사회 | taxonomy-nrf-b210000 | 심리과학 (L2) | i | 20 | 0 | 13 | social |
| history | 인문사회 | taxonomy-nrf-a020000 | 역사학 (L2) | v | 7 | 0 | 18 | humanities |
| philosophy | 인문사회 | taxonomy-nrf-a030000 | 철학 (L2) | v | 6 | 0 | 15 | humanities |
| korean_literature | 인문사회 | taxonomy-nrf-a110000 | 한국어와문학 (L2) | v | 4 | 4 | 15 | humanities |
| english_literature | 인문사회 | taxonomy-nrf-a150000 | 영어와문학 (L2) | v | 4 | 2 | 15 | humanities |
| linguistics | 인문사회 | taxonomy-nrf-a090000 | 언어학 (L2) | v | 27 | 2 | 8 | humanities |

**학교·학과 선택지** (departments 팩: 모집 단위 483건 + 학과별 등록금 7건 = 490건. 483건은 `departments-{school}-{slug}`, 분야는 note의 `field`, 트랙은 `track`)

| school_id | 학과 수 | field별 수 | same_unit_as 표기 | -N 접미 slug | 수집자 메모 | 등록금 레코드 분야 |
|---|---|---|---|---|---|---|
| snu | 34 | cs:3 math:2 bio:7 engineering:9 social:6 humanities:7 | 0 | 9 | 6 | cs,math,bio,engineering,social,humanities |
| kaist | 25 | cs:8 math:1 bio:4 engineering:12 social:0 humanities:0 | 1 | 11 | 8 | all-tuition 1건 |
| postech | 17 | cs:2 math:1 bio:4 engineering:10 social:0 humanities:0 | 0 | 4 | 5 | all-tuition 1건 |
| gist | 13 | cs:3 math:0 bio:3 engineering:7 social:0 humanities:0 | 3 | 2 | 3 | all-tuition 1건 |
| dgist | 8 | cs:2 math:0 bio:3 engineering:3 social:0 humanities:0 | 2 | 0 | 1 | all-tuition 1건 |
| unist | 15 | cs:2 math:1 bio:2 engineering:10 social:0 humanities:0 | 4 | 2 | 4 | cs,math,bio,engineering |
| yonsei | 32 | cs:2 math:2 bio:3 engineering:15 social:5 humanities:5 | 4 | 7 | 9 | cs,math,bio,engineering,social,humanities |
| korea | 24 | cs:2 math:2 bio:4 engineering:6 social:5 humanities:5 | 0 | 1 | 3 | cs,math,bio,engineering,social,humanities |
| skku | 30 | cs:6 math:2 bio:5 engineering:9 social:4 humanities:4 | 2 | 8 | 7 | cs,math,bio,engineering,social,humanities |
| hanyang | 34 | cs:4 math:2 bio:2 engineering:15 social:6 humanities:5 | 2 | 10 | 11 | math,bio,engineering,social,humanities |
| sogang | 18 | cs:2 math:1 bio:2 engineering:4 social:4 humanities:5 | 2 | 0 | 2 | math,bio,engineering,social,humanities |
| khu | 26 | cs:3 math:1 bio:4 engineering:9 social:4 humanities:5 | 2 | 3 | 2 | math,bio,engineering,social,humanities |
| ewha | 26 | cs:3 math:2 bio:4 engineering:8 social:5 humanities:4 | 6 | 2 | 5 | social,humanities |
| cau | 24 | cs:2 math:2 bio:3 engineering:8 social:5 humanities:4 | 0 | 1 | 3 | cs,math,bio,engineering,social,humanities |
| konkuk | 23 | cs:2 math:2 bio:4 engineering:7 social:4 humanities:4 | 2 | 2 | 5 | cs,math,bio,engineering,social,humanities |
| pusan | 25 | cs:2 math:2 bio:2 engineering:9 social:5 humanities:5 | 4 | 1 | 5 | math,bio,engineering,social,humanities |
| uos | 21 | cs:3 math:1 bio:1 engineering:7 social:5 humanities:4 | 2 | 2 | 2 | math,bio,engineering,social,humanities |
| knu | 30 | cs:4 math:2 bio:3 engineering:12 social:5 humanities:4 | 0 | 7 | 6 | cs,math,bio,engineering,social,humanities |
| jnu | 30 | cs:5 math:2 bio:3 engineering:11 social:5 humanities:4 | 6 | 8 | 6 | cs,math,bio,engineering,social,humanities |
| cnu | 28 | cs:1 math:2 bio:3 engineering:11 social:5 humanities:6 | 0 | 7 | 7 | cs,math,bio,engineering,social,humanities |

합계: 학과 483, same_unit_as 표기 42, -N 접미 slug 87, 수집자 메모 100.

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| ② 학교·학과: 학과 수 (선택 단위) | departments-{school}-{slug} (483건, 학교 20곳) | 학교당 8–34건, 합 483 | count (value 1=존재 확인) | 일반대학원 박사과정 모집 단위, 2027학년도 전기 모집요강 | 2027 | v 480 / i 3 | indexed 3건(이번 차수 미모집): departments-pusan-psychology, departments-knu-mechanical, departments-knu-philosophy. 박사 모집인원은 숫자 필드가 없고, note에 적힌 레코드도 483건 중 1건뿐이다. |
| ② 같은 학과 한 번만 세기 (`same_unit_as`) | note에 `same_unit_as`가 있는 레코드 42건 (부록 A에 42건 → 대상 id 해석표) | 42건 → 22개 묶음 (쌍 21 + 부산대 정보융합공학과 3건) → 고유 학과 단위 460 (computed) | count | departments 483건 | 2027 | v | 표기가 한쪽에만 있는 묶음 원소 3건: departments-kaist-civil, departments-gist-environmental, departments-pusan-computer. 결정 기록 0011: "엔진은 같은 학과를 두 번 세지 않도록 `same_unit_as`로 묶는다". |
| ② 수집자 메모 수 대조 | note에 "수집자 메모"가 있는 departments 레코드 | 100건 (computed; 학과별 등록금 7건 중 해당 0건) | count | departments 490건 | 2027 | v | 결정 기록 0011 §맥락과 departments README는 "106건". 레코드 기준은 100건이므로 6건 불일치(이월 항목 "수집자 메모 수 대조"의 근거). |
| ② 번호 접미 slug | departments-{school}-{track}-2, -3 … (87건, 부록 B) | 87건 | count | departments 483건 | 2027 | v | 결정 기록 0011 §slug: 의미 있는 slug로의 변경은 Wave 4 엔진 키 결정. 부록 B에 87건의 id·학과명·NRF 코드·트랙을 나열(새 키 제안은 하지 않음). |
| ② 학과별 등록금 (학교 기본값과 다른 경우) | departments-snu-statistics-tuition, departments-snu-bioengineering-2-tuition, departments-snu-environmental-tuition, departments-cnu-statistics-tuition, departments-cnu-economics-tuition, departments-cnu-life_science-2-tuition, departments-cnu-bioengineering-tuition | snu-statistics=380.2만; snu-bioengineering-2=401.8만; snu-environmental=380.2만; cnu-statistics=339.3만; cnu-economics=268.9만; cnu-life_science-2=339.3만; cnu-bioengineering=401.7만 | krw → 만원/학기 | 해당 학과 박사과정 학기당 수업료 | 2026 | v | 입학금 별도. 이 7건 외 학과는 학교×field 기본값(§2 등록금 표)을 쓴다. |

**④ 자금 경로: 학교별 장학·장려금 레코드** (schools 팩, id = `schools-{school}-` + 아래 접미. 값은 만원 환산, `/월·학기·연` = note가 밝힌 지급 기간, `/?` = note 확인 필요, `×n` = 등록금 면제 비율. 선발형·보장형, 최대 학기 같은 조건은 각 note에 있다.)

| school_id | 건수 | 접미 = 값 (* = indexed) |
|---|---|---|
| snu | 7 | all-scholarship-living-presidential=200만/월; all-scholarship-living-phd-excellence=375만/학기; all-scholarship-living-brm-a=2,600만/연; all-stipend-ta-lecture-research=30만/월; all-stipend-ta-lecture-research-researcher=90만/월; all-scholarship-tuition-rate-lecture-research=×1; all-stipend-ta-major-ta=40만/월 |
| kaist | 4 | all-stipend-min=110만/월; all-scholarship-living-national=45만/월; all-stipend-ta-type1=55만/월; all-stipend-ta-type2=27.5만/월 |
| postech | 4 | all-stipend-min=220만/월; all-scholarship-living-ta=131.6만/월; all-scholarship-living-ktoptier=5,000만/연; all-scholarship-living-need=250만/연 |
| gist | 5 | all-stipend-ta=29.5만/월; all-stipend-min=100만/월; all-scholarship-living-presidential=150만/학기; all-scholarship-living-iref=300만/월; all-scholarship-tuition-rate=×1 |
| dgist | 5 | all-stipend-min-national=1,404만/연; all-stipend-min-dgistscholar=2,200만/연; all-scholarship-tuition-rate=×1; all-scholarship-living-supportexpense=64.5만/월; all-scholarship-living-senate=25만/월 |
| unist | 2 | all-stipend-min=110만/월; all-scholarship-tuition-rate=×1 |
| yonsei | 3 | all-scholarship-living-special=120만/학기; all-scholarship-living-dongheng=120만/학기; all-scholarship-living-foreign=300만/학기 |
| korea | 3 | all-scholarship-living-bk21=160만/월; all-scholarship-tuition-rate-ra=×1; all-scholarship-tuition-rate-ta=×1 |
| skku | 7 | all-scholarship-living-bk21=160만/월; social-scholarship-living-business=200만/월; social-scholarship-tuition-rate-business=×1; engineering-scholarship-tuition-rate-ece=×1; bio-scholarship-living-samsung=300만/학기; bio-scholarship-living-brain=300만/월; engineering-scholarship-living-display=180만/월 |
| hanyang | 4 | all-scholarship-tuition-rate-bk=×0.7; all-scholarship-tuition-rate-excellentphd=×0.7; all-scholarship-tuition-rate-erica=×0.7; all-scholarship-living-bk21=130만/월* |
| sogang | 5 | all-scholarship-tuition-rate-albatross=×1; all-scholarship-tuition-rate-sogang=×0.7; all-scholarship-tuition-rate-otheruniv=×0.5; all-scholarship-tuition-rate-linked=×1; all-scholarship-living-bk21=160만/월 |
| khu | 1 | all-scholarship-tuition-rate-alumni=×1 |
| ewha | 7 | all-scholarship-tuition-rate-bestewha=×1; all-scholarship-tuition-rate-ewharesearch=×1; all-scholarship-living-research=300만/학기; all-scholarship-living-kimhwalran=300만/학기; all-scholarship-living-ewhaplus=100만/학기; all-stipend-ta=400만/학기; all-scholarship-living-bk21=160만/월 |
| cau | 4 | all-scholarship-tuition-rate-grs=×1; all-scholarship-living-bk21=160만/월; all-scholarship-living-excellence=200만/학기; all-scholarship-living-cayss=50만/월 |
| konkuk | 6 | all-scholarship-living-kosaf=375만/학기; all-scholarship-living-kist=250만/월; all-scholarship-tuition-rate-kuresearch=×0.5; all-scholarship-tuition-rate-ra=×0.5; all-scholarship-tuition-rate-taa=×1; all-scholarship-tuition-rate-tac=×0.5 |
| pusan | 1 | all-stipend-min-stem=110만/월 |
| uos | 1 | all-scholarship-tuition-rate-ta=×1 |
| knu | 2 | all-scholarship-tuition-rate-fulltime=×1; all-scholarship-living-presidential=200만/월 |
| jnu | 5 | all-stipend-min-bk21=160만/월; all-stipend-ta=50만/월; all-stipend-ta-ra=50만/월; all-scholarship-living-doctoral-leap=1,000만/총액; all-scholarship-tuition-rate-first-semester=×1 |
| cnu | 3 | all-stipend-min-bk21=160만/월; all-stipend-ta=40만/월; all-stipend-ta-ra=40만/월 |

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| ④ 자금 경로 선택지 (장학·과제·자비) | schools-{school}-…-(stipend\|scholarship)-… (위 표), salaries-stipend-bk21-phd-min, salaries-stipend-bk21-phd-completer-min, salaries-stipend-bk21-master-min, salaries-stipend-stem-living-phd-min, salaries-stipend-stem-living-master-min | BK21 박사 160만·수료 130만·석사 100만 (월 하한); 이공계 연구생활장려금 박사 110만·석사 80만 (월 하한) | krw/월 | 4단계 BK21 지원 대학원생; 한국형 스타이펜드 참여대학 이공계 | 2023, 2025 | v | 하한 값. BK21 수혜 비율·학교별 선발 확률 레코드는 없다. |
| ④ 자비(등록금 부담) 경로 | schools-{school}-{field}-tuition (§2), schools-{school}-all-entrance-fee | §2 등록금 표 | krw | 학기당 수업료, 신입생 입학금 | 2024–2026 | v/i | 자금 경로별 입학자 비율(장학·과제·자비)은 어떤 팩에도 없음 → §9. |
| ⑤ 지도교수 유형 선호 | 없음 | 근거 없음, assumed | — | — | — | a | 어쩌다 박사 v3.5는 advisor{support, rigor, factor}를 쓰지만 출처가 없다(`docs/oracle/v35-recon.md`). 지도교수 유형 분포·효과 레코드가 없다. |
| ⑥ 운에 맡기기 | 없음 (설계 항목) | — | — | — | — | — | 레코드 불필요. 무작위 가중치로 쓸 수 있는 분포는 학과 수(위 표)와 §2 `statistics-phd-admitted-*`뿐이며 학교별 입학자 수 레코드는 없다. |

## 2. 박사과정 월 단위 진행

KEDI 교육통계 행은 `[KEDI7]` 계열(인문·사회·교육·공학·자연·의약·예체능)이고, KRIVET 박사조사 행과 KISTEP 행은 각 행에 적은 체계를 따른다. KEDI 박사과정 통계는 석·박사통합과정을 포함한다. 연율이므로 월 단위 환산은 스펙 결정 사항이다. 연도 접미사는 조사 연도(4월 1일 기준 재적·입학, 졸업은 전년 8월+당해 2월, 휴학·중도탈락은 전년 3월 1일–당해 2월 말).

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| 재적 (규모·계열 분포) | statistics-phd-enrolled-total-{year} | 2021:81,736 2022:84,967 2023:86,078 2024:87,354 2025:89,201 | count | [KEDI7] 국내 대학원 박사과정 재적학생, 국적 구분 없음 | 2021–2025 | v | 재적 = 재학+휴학+학사학위취득 유예. 계열 합 = total. |
| 재적: 계열별 2025 | statistics-phd-enrolled-{humanities/social/education/engineering/natural/medical/arts-sports}-2025 | 인문 10,174, 사회 16,674, 교육 5675, 공학 25,061, 자연 13,075, 의약 9487, 예체능 9055 | count | [KEDI7] 계열별 재적 | 2025 | v | 통합과정: statistics-phd-enrolled-integrated-{year} 2025 = 24,313(계열 합에 포함된 부분집합). |
| 입학 | statistics-phd-admitted-total-{year} | 2021:29,594 2022:30,896 2023:30,020 2024:31,299 2025:32,137 | count | [KEDI7] 박사과정 입학자(해당 연도 4월 1일 기준 입학생) | 2021–2025 | v | 계열별 statistics-phd-admitted-{계열}-{year}: 2025 인문 3497, 사회 6406, 교육 2140, 공학 8895, 자연 4339, 의약 3358, 예체능 3502. 통합과정 statistics-phd-admitted-integrated-2025 = 7147. |
| 학위취득 | statistics-phd-awarded-total-{year} | 2021:16,420 2022:17,760 2023:17,673 2024:18,714 2025:19,831 | count | [KEDI7] 박사과정 졸업생(박사학위 취득자), 외국인 포함 | 2021–2025 | v | 계열별 statistics-phd-awarded-{계열}-{year}: 2025 인문 1898, 사회 3694, 교육 1410, 공학 5171, 자연 2912, 의약 2254, 예체능 2492. 연령 분포 statistics-phd-awarded-age-*는 33세 이상이 마지막 구간(statistics-phd-awarded-age-33-or-more-share = 0.6267). |
| 휴학 (연 비율, 전체) | statistics-phd-leave-rate-{year}; 건수 statistics-phd-leave-count-{year} | 2020:0.167 2021:0.153 2022:0.163 2023:0.149 2024:0.14 ; 건수 2020:13,196 2021:12,513 2022:13,876 2023:12,792 2024:12,270 | ratio / count | [KEDI7] 박사과정 휴학생 ÷ 재적학생(예: 2024 분모 87,354명) | 2020–2024 | v | 기준 기간이 4월 1일 재적과 다름(전년 3월 1일–당해 2월 말). 휴학 기간 분포·복학률 없음. |
| 휴학: 계열·성별 2024 | statistics-phd-leave-rate-{계열}, statistics-phd-leave-rate-{male/female}-{year} | 인문 0.188, 사회 0.19, 교육 0.216, 공학 0.08, 자연 0.081, 의약 0.16, 예체능 0.173 ; 남 2020:0.142 2024:0.126 여 2020:0.201 2024:0.158 | ratio | [KEDI7] 계열별 재적 분모(예: 공학 23,647명) | 2024 | v | 계열별은 2024 단년만. 공학·자연 ≈ 0.08, 교육 0.216. |
| 중도탈락 (연 비율, 전체) | statistics-phd-dropout-rate-{year}; 건수 statistics-phd-dropout-count-{year} | 2020:0.055 2021:0.051 2022:0.053 2023:0.051 2024:0.053 ; 건수 2020:4313 2021:4192 2022:4509 2023:4402 2024:4614 | ratio / count | [KEDI7] 박사과정 제적 학생 ÷ 재적학생 | 2020–2024 | v | 제적 = 미등록·미복학·자퇴·학사경고·유급·연한 초과 등. note: 분모 표기가 표마다 "전년도 재적"과 "재적"으로 달라 검산으로 당해 4월 1일 재적을 분모로 확인. 졸업·수료 후 미학위 이탈, 타 대학 이동 구분 없음. |
| 중도탈락: 계열·성별 | statistics-phd-dropout-rate-{계열}, statistics-phd-dropout-rate-{male/female}-{year} | 인문 0.064, 사회 0.064, 교육 0.048, 공학 0.046, 자연 0.048, 의약 0.051, 예체능 0.049 ; 남 2020:0.056 2024:0.052 여 2020:0.053 2024:0.054 | ratio | [KEDI7] | 2024 | v | 계열별 건수 statistics-phd-dropout-count-{계열}도 있음. |
| 학위 소요 기간 (최신) | statistics-phd-duration-mean-years (전체); statistics-phd-duration-mean-years-{계열/fulltime/working/male/female} | 전체 5.2, 인문 6, 사회 5, 공학 5.5, 자연 5.5, 의약 4.2, 교육 5.4, 예체능 5.2, 학업전념 5.2, 직장병행 5.2 | years | [구 7계열: 인문·사회·공학·자연·의약·교육(사범)·예술/체육, KRIVET 박사조사; KEDI 7 대계열과 같은 체계인지 출처에 명시 없음] 2015 박사조사 응답자(외국인 제외) 입학부터 학위 취득까지 평균 | 2015 | v | 2015년이 최신. 석·박사통합자 제외 여부는 이 브리프에 명시되지 않음(note). 입학 연령 statistics-phd-entry-age-mean-years = 35.6, 취득 연령 statistics-phd-degree-age-mean-years = 40.9. |
| 학위 소요 기간 (2013) | statistics-phd-duration-mean-months-2013-{all/natural/engineering/stem} | 전체 61.2, 자연 63.4, 공학 65.5, 이공 64.7 | months | [KRIVET 박사조사, 이공계 중심; 계열 체계 미명시] 2013 박사조사 응답자, 석·박사통합자 제외 | 2013 | v | 2015 값(5.2년 ≈ 62.4개월)과 방법·응답자 범위가 달라 직접 비교 불가(note). 2013·2015 외 시점 없음. |
| 학위취득 연령 분포 (박사조사) | statistics-phd-degree-age-share-{under30/30s/50-or-more}-{2021/2024} | 2021: <30 0.043, 30대 0.519, 50+ 0.204 ; 2024: <30 0.052, 30대 0.536, 50+ 0.191 | ratio | KRIVET 박사조사 연령 응답자(무응답 제외, 연도별 n 미제시) | 2021, 2024 | v | 40대 비중은 레코드 없음(1−합으로 유도 가능하나 이 색인은 계산하지 않음). |
| 외국인 비율 (재적 기준) | statistics-phd-foreign-enrolled-share-{year}; 건수 statistics-phd-foreign-enrolled-{year} | 2021:0.1744 2022:0.1988 2023:0.2108 2024:0.2094 2025:0.1991 ; 건수 2021:14,252 2022:16,892 2023:18,141 2024:18,294 2025:17,762 2026:16,307 | ratio / count | 외국 국적 박사과정 학위과정 학생 ÷ 박사과정 재적학생(89,201명 등, 2025.4.1) | 2021–2025 (건수 2026까지) | v | 분모는 [KEDI7] 재적. 2026은 분모 문서에 없어 비율 레코드 없음. |
| 외국인 비율 (박사조사 응답자 기준) | statistics-phd-foreign-share-{year}; 응답 수 statistics-phd-foreign-respondents-{year} | 2021:0.143 2022:0.194 2023:0.227 2024:0.239 | ratio | KRIVET 박사조사 국적 응답자(2024: 내국인 8,626 + 외국인 2,707 = 11,333명) | 2021–2024 | v | 위 재적 기준과 모집단이 다르다(졸업자 응답 vs 재적). 둘을 섞지 말 것. 같은 박사조사 내국인만 쓰는 취업률은 외국인 제외. |
| 성별 (여성 비율) | statistics-phd-{enrolled/admitted/awarded}-female-share-{year}; 계열별 …-female-share-{계열} | 재적 2021:0.4277 2025:0.45 ; 입학 2021:0.4478 2025:0.4694 ; 학위 2021:0.3937 2025:0.4351 ; 2025 재적 공학 0.2274, 교육 0.733 | ratio | [KEDI7] 해당 총계 | 2021–2025 | v | 남성·여성 건수 statistics-phd-{enrolled/admitted/awarded}-{male/female}-{year}, 계열×성별 건수 …-female-{계열}(2025 단년)도 있음. |
| KISTEP 휴학 참고값 (v3.5 상수) | statistics-leave-all, statistics-leave-stem, statistics-leave-other | all 0.15, stem 0.125, other 0.188 | ratio | [KISTEP] 2022 신규 박사학위 취득자(내국인), 과학기술인력(자연·공학·의약학) vs 비과학기술인력 | 2022 | v | 졸업자 응답이며 위 KEDI 휴학률과 정의가 다름. needs-judge-employment 항목 5: 이공 대리값, assumed 표시(Wave 3 판정 대상). |

**등록금·입학금** (schools 팩, krw/학기. 중앙값은 학교별 레코드 값의 중앙값(computed). 분야 키는 학교 레코드 id의 `{field}`.)

| field | id 패턴 | 학교 수 | 최소 | 중앙값 | 최대 | 연도 분포 | 해당 학교 |
|---|---|---|---|---|---|---|---|
| humanities | schools-{school}-humanities-tuition | 15 | 240만 (pusan) | 521.7만 | 635만 (ewha) | 2024:1 2025:1 2026:13 | snu,yonsei,korea,skku,hanyang,sogang,khu,ewha,cau,konkuk,pusan,uos,knu,jnu,cnu |
| social | schools-{school}-social-tuition | 15 | 240만 (pusan) | 521.7만 | 635만 (ewha) | 2024:1 2025:1 2026:13 | snu,yonsei,korea,skku,hanyang,sogang,khu,ewha,cau,konkuk,pusan,uos,knu,jnu,cnu |
| math | schools-{school}-math-tuition | 15 | 291.9만 (uos) | 586.8만 | 660.8만 (cau) | 2024:1 2025:1 2026:13 | snu,unist,yonsei,korea,skku,hanyang,sogang,khu,cau,konkuk,pusan,uos,knu,jnu,cnu |
| bio | schools-{school}-bio-tuition | 15 | 291.9만 (uos) | 586.8만 | 660.8만 (cau) | 2024:1 2025:1 2026:13 | snu,unist,yonsei,korea,skku,hanyang,sogang,khu,cau,konkuk,pusan,uos,knu,jnu,cnu |
| engineering | schools-{school}-engineering-tuition | 15 | 311.2만 (uos) | 684.9만 | 750.7만 (cau) | 2024:1 2025:1 2026:13 | snu,unist,yonsei,korea,skku,hanyang,sogang,khu,cau,konkuk,pusan,uos,knu,jnu,cnu |
| cs | schools-{school}-cs-tuition | 10 | 332.7만 (jnu) | 543.3만 | 750.7만 (cau) | 2025:1 2026:9 | snu,unist,yonsei,korea,skku,cau,konkuk,knu,jnu,cnu |

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| 등록금 (분야별) | schools-{school}-{humanities/social/math/bio/engineering/cs}-tuition (표 위쪽 참조: 6개 분야 85건) | 위 표 | krw/학기 | 일반대학원 박사과정 학기당 수업료(입학금 별도), 학교 공시 최신 | 2024–2026 | v (85건 중 indexed 0) | 연도 혼재: 2026 76건, 2025 8건, 2024 5건(tuition 89건 기준 computed). 2025: cau 6건, postech·dgist all-tuition. 2024: uos 5건. 분야별 레코드가 없는 학교는 아래 all-tuition 또는 §9 결손. |
| 등록금 (분야 구분 없는 학교 4곳) | schools-kaist-all-tuition, schools-postech-all-tuition, schools-gist-all-tuition, schools-dgist-all-tuition | kaist 955.9만(2026,v); postech 517.2만(2025,i); gist 380.5만(2026,v); dgist 384.5만(2025,v) | krw/학기 | KAIST·POSTECH·GIST·DGIST: 모든 분야 단일 기준 | 2025–2026 | v/i | postech은 indexed(제3자 집계, 기간이 학기/연간 불확실). 이 4곳은 cs·math·bio·engineering 모두 이 값. gist·dgist 입학생 전원 국비/과기원 장학으로 납입금 면제(note). |
| 입학금 | schools-{school}-all-entrance-fee (17건) | 최소 0원(jnu 0) / 중앙값 980,000 / 최대 1,142,000(korea) | krw (1회) | 신입생 입학금 | 연도 2024:1 2025:3 2026:13 | v 15 / i 2 | indexed: schools-postech-all-entrance-fee, schools-ewha-all-entrance-fee. 입학금 레코드가 없는 학교: kaist, dgist, unist (§9). |
| 연구장려금 하한 (국가) | salaries-stipend-bk21-phd-min, salaries-stipend-bk21-phd-completer-min, salaries-stipend-bk21-master-min, salaries-stipend-stem-living-phd-min, salaries-stipend-stem-living-master-min | bk21-phd-min 1600000; bk21-phd-completer-min 1300000; stem-living-phd-min 1100000 | krw/월 | BK21 4단계 지원 대학원생; 이공계 연구생활장려금 참여대학 | 2023, 2025 | v | BK21 박사 입학 4년 미만 기준. 학교별 실제 수혜 비율 없음. |
| 학교별 장려금 | §1 자금 경로 표 (schools-{school}-all-stipend-*, -scholarship-living-*) | 학교별 월/학기/연 금액 | krw | 학교 공시 | 2025–2026 | v/i | BK21 연계: schools-{korea/skku/sogang/ewha/cau}-all-scholarship-living-bk21 = 160만/월, schools-hanyang-all-scholarship-living-bk21 = 130만/월 (indexed), jnu·cnu는 schools-{jnu/cnu}-all-stipend-min-bk21 = 160만. |

## 3. 결정 지점 7종

결정 지점 이름은 [결정 기록 0005](../../design/decisions/0005-agency-over-randomness.md)를 따른다. 선택지(2~4개)는 스펙이 정하며, 이 표는 각 선택지의 확률·힌트를 받칠 수 있는 레코드와 없는 곳을 가른다. 열은 §1과 같다. "없음"은 근거 레코드가 없다는 뜻이다.

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| [DP1 자격시험 직후] 계속 / 휴학 / 이탈 확률의 거시 기준 | statistics-phd-leave-rate-{year}, statistics-phd-leave-rate-{계열}, statistics-phd-dropout-rate-{year}, statistics-phd-dropout-rate-{계열} | 휴학 전체 2024 0.14; 공학 0.08; 인문 0.188. 중도탈락 전체 2024 0.053; 인문·사회 0.064, 공학 0.046 | ratio (연) | [KEDI7] 박사과정 재적학생(§2) | 2020–2024 | v | 연 비율이며 학차·자격시험 전후 구분이 없다. 월 환산·학차 배분은 스펙의 설계 가정(assumed). |
| [DP1] 휴학 참고 (v3.5 상수의 출처) | statistics-leave-stem, statistics-leave-other | 0.125 / 0.188 | ratio | [KISTEP] 2022 신규 박사학위 취득자 중 과학기술인력 vs 비과학기술인력 | 2022 | v | needs-judge-employment 항목 5: 이공 대리값, assumed 표시. KEDI 휴학률로 대체할지 결정 필요. |
| [DP1] 자격시험 합격률·응시 시점·재응시 | 없음 | 근거 없음, assumed | — | — | — | a | v3.5: 12개월째부터 6개월마다, skill≥44, 합격 min(0.95, 0.65+0.05×시도) (`docs/oracle/v35-recon.md`, 출처 없음). |
| [DP2 첫 논문 판정] 투고처 계층 힌트: 저널 SJR 사분위 | venues-journal-{slug}-sjr-quartile (60건) | Q1 46 / Q2 8 / Q3 5 / Q4 1 (분야군별 표 아래) | level (1–4) | 분야군 12개 × 3–6개 저널 (note의 `분야군`, 대표 NRF 중분류는 note) | 2025 | i | **사분위는 계층일 뿐 채택 확률이 아니다.** 60건 모두 RCSI 재게시 경로(indexed, Scimago 직접 접속 403). 이월 항목: 브라우저로 재확인 후 verified 승격. |
| [DP2] 국내 저널 등재 여부 (인문사회 선택지 근거) | venues-journal-{slug}-kci (43건) | 등재 42, 등재후보 1 (venues-journal-kosenv-journal-kci) | count (1/0) | KCI 등재지 목록, 분야군 12개 | 2026 | v | 영향력 지수는 수집하지 않음(결정 기록 0003). |
| [DP2] 학회 채택률 (이공 CS·AI 선택지) | venues-conf-{slug}-acceptance-{year} (14건): acl, chi, cvpr, dac, eccv, emnlp, iccv, iclr, icml, icra, neurips, osdi, sigmod, sp | acl 0.189; chi 0.253; cvpr 0.252; dac 0.2256; eccv 0.279; emnlp 0.2216; iccv 0.24; iclr 0.274; icml 0.269; icra 0.3779; neurips 0.2452; osdi 0.2003; sigmod 0.332; sp 0.1471 | ratio | 제출 편수(분모 종류가 학회마다 valid/reviewable/completed 등으로 다름, 각 note) | 2024–2026 | v 13 / i 1 | indexed: venues-conf-icml-acceptance-2025. 14건 모두 CS·AI·시스템·보안·HCI·로보틱스 학회. 저널 채택률·인문사회 학회 채택률·화학/생명 계열은 없음. |
| [DP2] 학회 CORE 등급 | venues-conf-{slug}-core-rank (23건) | A* 20 / A 2 (iros, isscc) / B 1 (icassp) | level (A*=4, A=3, B=2, C=1) | ICORE2026 (ICASSP는 CORE2023의 B 유지, ISSCC는 CORE2018 등급만 있어 indexed) | 2026 | v 22 / i 1 (venues-conf-isscc-core-rank) | 분야는 CORE 분야 코드(note). 국내 학회 존재 기록 venues-conf-{slug}-held-{year} (6건): icros, ieie-summer, kcc, kiee-summer, kroc, ksc. |
| [DP2] 논문 채택·수정·거절 확률, 심사 지연, 재투고 효과 | 없음 | 근거 없음, assumed | — | — | — | a | v3.5: 채택 = clamp(0.15 + quality×0.005 + (시도−1)×0.07, 0.25, 0.88); 수정 요구 = 채택 확률 + 0.29 이내; 심사 지연 18%. 모두 출처 없음. 학회 채택률은 CS 계열 학회 한정 참고값이다. |
| [DP3 자금 만료] 만료 후 선택지(연장·전환·휴학·자비) 금전 근거 | §1 자금 경로 표(schools-{school}-…-stipend/scholarship-…), salaries-stipend-bk21-phd-min, salaries-stipend-stem-living-phd-min | BK21 박사 하한 1,600,000; 이공 연구생활장려금 박사 하한 1,100,000 | krw/월 | BK21·한국형 스타이펜드 | 2023, 2025 | v | 학교별 장학의 최대 지급 학기(예: 서울대 대통령과학 박사 최대 8학기, KAIST 보장형 8학기)는 note에 문장으로만 있고 숫자 필드가 없다. |
| [DP3] 자금 만료 후 휴학·이탈 확률 | statistics-phd-leave-rate-{계열}, statistics-phd-dropout-rate-{계열} | §2 | ratio (연) | [KEDI7] | 2024 | v | 연구비 만료와 휴학·탈락의 인과 관계 자료는 없다. 만료 시점 분포·연장 승인율·과제 수주 확률: 없음(assumed). |
| [DP4 졸업 직전: 학계·산업·공공·창업] 계열별 취업률 | statistics-employed-{ict,engineering,natural-math,social,arts-humanities,edu,business-law,health,agri-vet,service} | 학업전념 박사, 2024: 정보통신기술 0.682; 공학, 제조 및 건설 0.625; 자연과학, 수학 및 통계학 0.587; 사회과학, 언론 및 정보학 0.47; 예술 및 인문학 0.408; 교육 0.627; 경영, 행정 및 법 0.408; 보건 및 복지 0.6; 농림어업 및 수의학 0.525; 서비스 0.544 | ratio | [KSCED10] 2024 학업전념 내국인 박사 응답자(무응답 제외); N 미공개(표 7에서 유도한 근사 N은 derived) | 2024 | v | 취업자에 박사후연구원·시간강사 확정자 포함(표 7 주). 4년 합산판 statistics-employed-{계열}-2021-2024도 있음(예: 정보통신기술 0.615, 사회과학 0.384, 예술·인문 0.34). 게임 계열과의 대응은 §6, 판정 7항목은 needs-judge-employment. |
| [DP4] 전체·성별·연령·직장병행 | statistics-employed-all, statistics-employed-total, statistics-employed-working, statistics-employed-{male,female}, statistics-employed-age-{30s-or-under,40s-or-over} | 학업전념 전체 0.582; 학업전념+직장병행 0.739; 직장병행 0.884; 남 0.6/여 0.547; 30대 이하 0.604/40대 이상 0.456 | ratio | [KSCED10]계열과 무관한 총계; 응답 수는 statistics-respondents-*, statistics-employed-count-* | 2024 | v | 게임의 "취업" 정의 = 박사후·시간강사 포함(needs-judge 항목 3). |
| [DP4] 고용형태 (취업 후 형태) | statistics-form-{permanent,fixed,part} | 학업전념 2024: 정규 0.45 / 비정규 풀타임 0.441 / 파트타임 0.109 | ratio | 학업전념 내국인 임금근로자(조건부; 정규+비정규 풀타임+파트타임=100) | 2024 | v | 비정규직(풀타임)은 "기간제"로 정의되지 않음(needs-judge 항목 4). 계열별은 정규직 비율만: statistics-form-permanent-{계열}-2021-2024 (정보통신기술 0.615; 공학, 제조 및 건설 0.566; 자연과학, 수학 및 통계학 0.396; 사회과학, 언론 및 정보학 0.25; 예술 및 인문학 0.185). 직장병행: statistics-form-{permanent,fixed,part}-working. |
| [DP4] 종사상 지위·비임금(창업·자영 대리) | statistics-status-{sangyong,imsi,ilyong}-fulltime-study, statistics-nonwage-share | 상용 0.64, 임시 0.33, 일용 0.005; 비임금근로자 0.025 (직장병행 0.177) | ratio | 학업전념 내국인 취업자 종사상 지위 응답 전체(=100) | 2024 | v | 비임금근로자는 창업·자영의 **대리값**일 뿐이며 창업 선택지 확률이 아니다. 계열별 상용 비율: statistics-status-sangyong-{계열}-2021-2024. |
| [DP4] 박사후 재원 (이공 박사후 선택지) | statistics-postdoc-funder-{university,government,public-institute,private-institute,private-company,other} | 대학 0.609, 정부 0.145, 공공연 0.137, 민간연 0.018, 기업 0.031, 기타 0.06 | ratio | [KISTEP] 2022 신규 박사학위 취득자 중 과학기술인력(자연·공학·의약학) 박사 후 과정 재원 응답 | 2022 | v | 재원인지 소속기관인지 불명확. 인문사회 박사후 재원: 없음(assumed, 판정 항목 6). |
| [DP4] 학계 진입 수요 (공고 확률 기준값) | §5 statistics-faculty-* | §5 | count | [KEDI7] 소속 학과 계열, 일반대학 | 2020–2026 | v (new-hires-all-2020·-2024-b는 i) | 분야별 신규 임용·공고 건수는 출처 없음(assumed). `statistics-faculty-new-hires-all-2024-b`는 인용 금지. |
| [DP4] 졸업 직후 진로 분포 (학계 / 산업 / 공공 / 창업 비율) | 없음 | 근거 없음, assumed | — | — | — | a | 취업 부문(대학·기업·출연연·공공) 비율 레코드가 없다. 대리: 박사후 재원 비율(이공), 비임금근로자 비율, 급여 레코드(§4). |
| [DP4] 급여 힌트 | §4 | §4 | krw | 경로별 | 2017–2026 | v/i/a | 출연연 초임·국립대 호봉·연구직공무원 호봉·신규 박사 연봉. 기업 연구직: 없음. |
| [DP5 경력 5년] 정규직 전환·이직·직급 확률 | 없음 | 근거 없음, assumed | — | — | — | a | 추적 조사가 없어 5년 시점 전환 확률을 줄 레코드가 없다. v3.5: 구직 p = 0.07 + skill×0.0007 + network×0.0005, 정규 32/기간제 48/시간제 15/자영 5, 박사후 확률 STEM 0.62·기타 0.25, 교수 연 9%(≥36개월 학계 근무 후) — 전부 출처 없음. |
| [DP5·DP6] 직급 분포 (횡단 스냅샷, 전이 확률 아님) | statistics-faculty-fulltime-rank-{professor,associate,assistant}-2025 | 교수 31,396 / 부교수 15,014 / 조교수 18,086 (computed 비중 48.7/23.3/28.0%) | count | 일반대학 전임교원(총·학장 제외) 2025.4.1 재직 스톡; 계열과 교차 제공 안 됨 | 2021–2025 | v | 시계열 2021–2025도 있음(교수 감소, 부교수 증가). 승진 연한·확률: 없음. |
| [DP5·DP6] 비전임 증가 추세 | statistics-faculty-nonfulltime-stock-all-{year}, statistics-faculty-lecturers-all-{year}, statistics-faculty-othernonft-all-{year}, statistics-faculty-adjunct-all-{year} | 비전임 2022:90,390 2026:102,932; 강사 2021:41,088 2025:40,180 | count | [KEDI7] 합산, 일반대학 스톡. 비전임에는 명예교수 포함 | 2021–2026 | v | 수요 추정에서는 `statistics-faculty-honorary-all-*` 제외(§5). |
| [DP5·DP6] 경력 경로별 급여 (5·10년차 비교) | §4 | §4 | krw | — | — | v/i/a | 국립대 호봉은 승급 규칙(연 1호봉 등)이 레코드에 없다. 호봉별 값만 있다(§9). |
| [DP7 은퇴 전] 정년·퇴직 연령 | 없음 | 근거 없음, assumed | — | — | — | a | v3.5: 은퇴 연령 U[60,67], 기록 종료 80세(사망 모형 없음). 교원 정년·은퇴 연령 분포 레코드 없음. |
| [DP7] 교원 연간 퇴직 규모 (위험률 대리) | statistics-faculty-retirements-all-{year} | 2021–2025: 2021:4216 2022:4503 2023:4237 2024:4175 2025:4376. 2025 ÷ 전임 스톡 statistics-faculty-fulltime-stock-all-2025 = 6.77% (computed) | count (연 플로우) | 일반대학 퇴직 교원, 직위 전체(총·학장 포함); 퇴직 사유 합(질병·사망·정년 등) | 2021–2025 | v | 연령별 퇴직이 아니다. 집계 기간이 표에 명시되지 않음. |
| [DP7] 퇴직 후 소득·연금 | 없음 | 근거 없음 | — | — | — | a | 국립대 호봉표는 재직 보수만. 연금·퇴직금 레코드 없음. |

**저널 분야군별 SJR 사분위·KCI 개수** (venues 팩 note의 `분야군`; 대표 NRF 중분류는 각 레코드 note)

| 분야군 | SJR Q1 | Q2 | Q3 | Q4 | KCI 등재 | KCI 등재후보 |
|---|---|---|---|---|---|---|
| 경제학 | 4 | 0 | 1 | 0 | 3 | 0 |
| 기계·전기전자공학 | 3 | 3 | 0 | 0 | 5 | 0 |
| 사회학 | 4 | 0 | 0 | 0 | 3 | 0 |
| 생명과학 | 5 | 1 | 0 | 0 | 3 | 0 |
| 수학 | 4 | 0 | 2 | 0 | 3 | 0 |
| 심리학 | 4 | 0 | 0 | 0 | 3 | 0 |
| 역사학·철학·한국문학 | 1 | 1 | 1 | 0 | 5 | 0 |
| 정치학·행정학 | 4 | 1 | 0 | 0 | 4 | 0 |
| 컴퓨터과학·인공지능 | 5 | 0 | 0 | 0 | 2 | 0 |
| 토목·환경공학 | 4 | 1 | 0 | 0 | 3 | 1 |
| 통계학 | 4 | 0 | 1 | 1 | 3 | 0 |
| 화학·재료공학 | 4 | 1 | 0 | 0 | 5 | 0 |

## 4. 경력 단계 급여

급여 레코드는 단위가 섞여 있다. 호봉표와 연구직 공무원은 월 봉급(수당·성과급 제외, 세전)이고 나머지는 연봉이다. 만원 환산은 이 색인이 한 것이다. 열은 §1과 같다.

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| 국립대 교원 호봉 (월 본봉) | salaries-public-univ-faculty-{1..33} (33건) | 1호봉 238만 ~ 33호봉 665.9만 (월). 10호봉 317.6만, 20호봉 453.8만, 30호봉 623.3만 | krw/월 | 국립대학 교원(교수·부교수·조교수) 교육공무원 봉급표(별표 12), 직급 구분 없음 | 2026 | v | 수당·성과급 제외. 직급은 초임 호봉 산정에서만 반영(아래 별표 24). 연 1호봉 승급 같은 승급 규칙은 레코드에 없다(§9). |
| 국립대 초임 호봉 산정: 경력연수 가감 (별표 24) | salaries-public-univ-career-adjust-{professor,associate-professor,assistant-professor,assistant} | 교수 -10, 부교수 -7, 조교수 -4, 조교 0 | years | 대학 졸업자 열, 초임 호봉 획정 입력값 | 2026 | v | **박사 학위 가산은 규정에 없다.** 박사 신임 조교수의 초임 호봉 규칙은 assumed(아래 규칙 (b)). 조교 공제 salaries-public-univ-assistant-deduction = 143,700원/월. 별표 15·16 초임호봉 획정과 전문대학 열은 미수집. |
| 연구직 공무원 호봉 (월 본봉) | salaries-public-researcher-{1..36} (연구사), salaries-public-research-officer-{1..32} (연구관) | 연구사 1호봉 231.7만 ~ 36호봉 514.5만; 연구관 1호봉 289.6만 ~ 32호봉 772.7만 | krw/월 | 연구직공무원 봉급표(2026-01-01 이후 지급분) | 2026 | v | 수당·성과급 제외 본봉. 연구사 임용 시 박사 초임 호봉 규칙은 레코드에 없다. |
| 대학 교원 평균 연봉 (직급·설립별 파편) | salaries-faculty-private-professor-mean, salaries-faculty-private-assistant-professor-mean, salaries-faculty-private-nontenure-mean, salaries-faculty-all-fulltime-mean, salaries-faculty-all-fulltime-mean-2020, salaries-faculty-college2yr-fulltime-mean, salaries-faculty-national-associate-professor-mean | private-professor-mean 10,139만(2024); private-assistant-professor-mean 5,557만(2021); private-nontenure-mean 3,871만(2020); all-fulltime-mean 10,009.8만(2025); all-fulltime-mean-2020 9,577.7만(2020); college2yr-fulltime-mean 6,696.7만(2025); national-associate-professor-mean 9,538만(2021) | krw/년 | 4년제 전임교원 평균, 사립 정교수/조교수 평균, 사립 비정년트랙 평균(교수신문 설문 88개교) 등 인원 미기재 | 2020–2025 | i | 교육부가 의원실에 제출한 자료의 언론 보도(2차 자료). 연도가 섞여 직접 비교 불가. 대학알리미에는 교원 급여 공시가 없다(salaries README). |
| 2017 직급 비율 (규칙 (a)의 입력) | salaries-faculty-national-professor-mean-2017, salaries-faculty-national-associate-professor-mean-2017, salaries-faculty-national-assistant-professor-mean-2017, salaries-faculty-private-professor-mean-2017, salaries-faculty-private-associate-professor-mean-2017, salaries-faculty-private-assistant-professor-mean-2017 | 국공립: 교수 9,557만 / 부교수 7,842만 / 조교수 6,519만; 사립: 교수 9,631만 / 부교수 7,466만 / 조교수 4,918만. 교수 대비 비율 (computed): 국공립 부교수 0.8206, 조교수 0.6821; 사립 부교수 0.7752, 조교수 0.5106 | krw/년 | 전국 4년제 직급·설립별 평균 급여, 2017 | 2017 | i | 6건 모두 indexed. **비율의 기준(교수=1 대 전체 평균=1)이 Wave 2 판정에 명시되지 않았다**(§9). 곱할 기준값은 salaries-faculty-all-fulltime-mean(2025) = 10,009.8만. |
| 학교별 정교수 평균 (학교 선택 힌트) | salaries-faculty-{school}-professor-mean (20건), salaries-faculty-{korea,skku,snu,yonsei}-professor-mean-2017 | 20개교: 최소 7,911.9만 (pusan,2017) ~ 최대 21,366.1만 (unist,2017); 중앙값 11,514.6만 (computed) | krw/년 | 학교별 정교수 평균 급여(연도 2017·2021·2024 혼재) | 2017–2024 | i | 연도 혼재라 학교 간 비교용으로만. salaries-faculty-snu-assistant-professor-mean(2021) = 8,848만. |
| 강사 시간당 강의료 | salaries-faculty-{all,national,private}-lecturer-hourly-hourly (2026), …-hourly-2025, …-hourly-2022 | all 2026 72,001 / 2025 70,543 / 2022 67,400; national 2026 97,492 / 2025 94,635 / 2022 89,000; private 2026 57,921 / 2025 57,276 / 2022 56,400 | krw/시간 | 일반대학·교대 강사 평균 시간당 강의료(총 강의시간 가중평균); 2026은 197개교, 지급인원 62,598명 | 2022, 2025, 2026 | 2026·2025 = **a**; 2022 = i | 전국·국공립·사립 2025·2026 6건은 수집자가 학교별 값을 합산한 파생값이라 assumed(2022 교육부 공표값과 0.1~0.8% 일치). DGIST·UNIST는 강사 0명. |
| 학교별 강사 시간당 강의료 | salaries-faculty-{school}-lecturer-hourly-hourly (18건) | 최소 54,344 ~ 최대 101,645; 중앙값 74,565 (computed) | krw/시간 | 학교별 2026 공시, 당해 1학기 평균 | 2026 | v | 월 수입 환산은 강의 시수 가정이 필요(레코드 없음, assumed). |
| 출연연 초임 (국가과학기술연구회 소속 7곳, 연구직 일반정규직) | salaries-institutes-{etri,kaeri,kimm,kist,kisti,kribb,krict}-{new-hire,senior-researcher,principal-researcher} | 원급 초임 4,500만~5,000만; 선임급 5,700만~6,700만; 책임급 7,100만~9,200만. 기관장 연봉 salaries-institutes-{기관}-head | krw/년 | 원급·선임급·책임급 초임(평균 보수 아님), ONE ST 공시 2025 | 2025 | v | ALIO에 없고 ONE ST 공시만. kribb 박사후연구원 salaries-institutes-kribb-postdoc = 5,172만(2026-3차, 1건뿐). 직급 승진 연한·승진 확률: 없음. |
| 출연연 (경제·인문사회연구회 소속 7곳) | salaries-institutes-{kdi,kedi,kihasa,kipa,kipf,kli,krivet}-{new-hire,regular-mean,head} | 신입 초임 3,033.2만~4,995만 (학사 기준 대졸 사무직 무경력); 일반정규직 평균 6,672.1만~9,584만 (연구·행정 합산) | krw/년 | ALIO 2025 결산 | 2025 | v | 박사 초임이 아니라 학사 신입 초임이다. 평균은 연구·행정 합산이라 연구직 평균이 아님. |
| 출연연 평균연봉 2022 (기사 표기) | salaries-institutes-{etri,kaeri,kimm,krict}-regular-mean-2022 | etri 11,710만; kaeri 10,379만; kimm 10,737만; krict 10,434만 | krw/년 | 언론 집계 평균연봉 | 2022 | i | 초임과 비교하지 않는다(판정 2026-10-13, salaries README). |
| 신규 박사 연봉 (취업자) | salaries-entry-all-annual-current-job-2021, salaries-entry-all-annual-current-job-2022, salaries-entry-nonscitech-annual-current-job-2021, salaries-entry-nonscitech-annual-current-job-2022, salaries-entry-scitech-annual-current-job-2021, salaries-entry-stem-employed-annual-total-income-2021 | all·current-job-2021 5,902.3만; all·current-job-2022 5,987.6만; nonscitech·current-job-2021 5,276만; nonscitech·current-job-2022 5,247.2만; scitech·current-job-2021 6,304.4만; stem-employed·total-income-2021 10,054만 | krw/년 | 내국인 신규 박사학위 취득자 중 취업자의 현 직장 연봉(과기=자연·공학·의약, 비과기=그 외); 총근로소득은 이공계 박사 취업자 | 2021, 2022 | v | **초임이 아니라 학위 취득 시점 응답의 현 직장 연봉**이며 세전 여부가 원문에 없다. N 미공개. 연도·계열이 한정(2022에는 과기 값 없음). |
| 기업 연구직 임금 | 없음 | 근거 없음 | — | — | — | a | wage.go.kr(임금직무정보시스템) 접속 실패(ECONNRESET, registry `wage-2026-portal`). salaries 팩에 기업 연구직 레코드 0건. 이월 항목은 후속 issue 또는 assumed 중 택일. v3.5 industry 320–520만/월은 출처 없음. |
| 대학원 재학 중 소득 (스티펜드 하한) | salaries-stipend-bk21-phd-min, salaries-stipend-stem-living-phd-min 외 3건 | §2·§1 | krw/월 | BK21; 한국형 스타이펜드 | 2023, 2025 | v | 학교별 장학·TA·RA 금액은 §1 자금 경로 표. |

**Wave 2가 Wave 3으로 넘긴 assumed 규칙 3건** (이월 항목 `#18`)

| 규칙 | 근거 레코드 id | 가정 사유 / 주의 | conf | 쓸 id가 따로 필요한 경우 |
|---|---|---|---|---|
| (a) 교원 급여 = 2025 전국 평균 × 2017 직급 비율 | salaries-faculty-all-fulltime-mean × salaries-faculty-{national,private}-{professor,associate-professor,assistant-professor}-mean-2017 (6건) | 직급별 현행 급여 공표가 없고 2017 직급·설립별 비율만 있어 조합. 2017→2025 직급 간 격차 변화·설립별 인원 가중은 반영 불가. 비율 기준 정의 필요. | 전부 i | 국공립/사립 구분은 6건이 갖고 있으나 곱셈 기준값(전국 평균)은 설립 구분이 없다. |
| (b) 국립대 교원 초임 호봉 = 별표 24 경력연수 가감, 박사 가산 없음 | salaries-public-univ-career-adjust-{professor,associate-professor,assistant-professor,assistant}, salaries-public-univ-faculty-{1..33} | 규정에 박사 학위 가산이 없어 초임 호봉 규칙(박사 신규 임용자의 경력 환산 연수)을 설계 가정으로 정해야 함. 별표 15·16 미수집. | v (입력) / 규칙 = a | — |
| (c) cs 등록금 없는 6개교는 공학 값 | 대상: hanyang, sogang, khu, pusan, uos → schools-{school}-engineering-tuition; ewha → 공학 레코드 없음 | cs 계열을 따로 공시하지 않는 학교. hanyang·sogang·khu·pusan·uos는 공학 레코드가 있다. **ewha는 humanities·social 두 건뿐이라 공학도 없다**: ewha가 쓸 수 있는 id는 schools-ewha-humanities-tuition, schools-ewha-social-tuition(둘 다 635만/학기) 뿐이며 cs·math·bio·engineering 학과 17곳(ewha 학과 중)에 쓸 레코드가 없다. | v (engineering-tuition 입력) / 규칙 = a | ewha: 스펙이 id를 지정해야 함(예: 다른 학교 공학 중앙값 또는 humanities/social 값). §9. |

## 5. 노동시장 기준값 (#19)

모든 교원 통계는 `[KEDI7]` 계열이며 "계열"은 교원 본인의 전공이 아니라 **소속 학과의 대계열**이다(README). 스톡은 조사 기준일(4월 1일) 재직 인원, 플로우는 연간 건수다. 일반대학(`all`)과 전체 고등교육기관(`allinst`)을 섞지 말 것. 신규채용 2024는 `statistics-faculty-new-hires-all-2024-a`만 쓴다(`-b`는 indexed, needs-judge, 인용 0건이어야 함).

| 용도 | record id(s) | value(s) | unit | population / denominator | year | conf | 비고 |
|---|---|---|---|---|---|---|---|
| 전임교원 스톡 인문 | statistics-faculty-fulltime-stock-humanities-{year} | 2022:9859 2023:9614 2024:9248 2025:8458 2026:8422 | count | [KEDI7] 인문계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 사회 | statistics-faculty-fulltime-stock-social-{year} | 2022:10,662 2023:10,335 2024:10,189 2025:9963 2026:9871 | count | [KEDI7] 사회계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 교육 | statistics-faculty-fulltime-stock-education-{year} | 2022:3290 2023:3209 2024:3214 2025:3128 2026:3077 | count | [KEDI7] 교육계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 공학 | statistics-faculty-fulltime-stock-engineering-{year} | 2022:14,893 2023:14,601 2024:14,661 2025:14,502 2026:14,587 | count | [KEDI7] 공학계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 자연 | statistics-faculty-fulltime-stock-natural-{year} | 2022:7706 2023:7536 2024:7406 2025:7258 2026:7360 | count | [KEDI7] 자연계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 의약 | statistics-faculty-fulltime-stock-medical-{year} | 2022:15,308 2023:15,585 2024:15,746 2025:15,659 2026:15,952 | count | [KEDI7] 의약계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 예체능 | statistics-faculty-fulltime-stock-arts-{year} | 2022:4847 2023:4864 2024:4732 2025:4738 2026:4691 | count | [KEDI7] 예체능계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 소속학과없음 | statistics-faculty-fulltime-stock-nodept-{year} | 2022:165 2023:195 2024:188 2025:206 2026:195 | count | [KEDI7] 소속학과없음계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2022–2026 | v |  |
| 전임교원 스톡 계열 공란 | statistics-faculty-fulltime-stock-undeclared-{year} | 2025:760 2026:764 | count | [KEDI7] 계열 공란계열 일반대학 전임교원(총·학장 포함), 4.1 기준 | 2025–2026 | v |  |
| 전임교원 스톡 합계 (일반대학) | statistics-faculty-fulltime-stock-all-{year} | 2022:66,730 2023:65,939 2024:65,384 2025:64,672 2026:64,919 | count | 일반대학 전임교원(총·학장 포함). 계열 9개 합과 일치(2025: 64,672) | 2022–2026 | v | 총·학장 제외 합계 statistics-faculty-fulltime-exclpres-all-{year} 2021–2025(2025: 64,496)는 연보 표 13-6 기준. |
| 비전임교원 스톡 인문 | statistics-faculty-nonfulltime-stock-humanities-{year} | 2022:17,654 2023:17,388 2024:17,657 2025:17,279 2026:17,552 | count | [KEDI7] 인문계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 사회 | statistics-faculty-nonfulltime-stock-social-{year} | 2022:13,171 2023:13,401 2024:14,078 2025:14,589 2026:15,068 | count | [KEDI7] 사회계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 교육 | statistics-faculty-nonfulltime-stock-education-{year} | 2022:6144 2023:6146 2024:6281 2025:6465 2026:6540 | count | [KEDI7] 교육계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 공학 | statistics-faculty-nonfulltime-stock-engineering-{year} | 2022:12,867 2023:13,620 2024:14,647 2025:15,259 2026:15,974 | count | [KEDI7] 공학계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 자연 | statistics-faculty-nonfulltime-stock-natural-{year} | 2022:8098 2023:8279 2024:8811 2025:8840 2026:9358 | count | [KEDI7] 자연계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 의약 | statistics-faculty-nonfulltime-stock-medical-{year} | 2022:10,210 2023:10,471 2024:11,241 2025:11,465 2026:12,248 | count | [KEDI7] 의약계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 예체능 | statistics-faculty-nonfulltime-stock-arts-{year} | 2022:17,014 2023:16,895 2024:17,390 2025:17,665 2026:17,924 | count | [KEDI7] 예체능계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 소속학과없음 | statistics-faculty-nonfulltime-stock-nodept-{year} | 2022:5232 2023:5944 2024:5948 2025:6176 2026:6836 | count | [KEDI7] 소속학과없음계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2022–2026 | v |  |
| 비전임교원 스톡 계열 공란 | statistics-faculty-nonfulltime-stock-undeclared-{year} | 2025:1447 2026:1432 | count | [KEDI7] 계열 공란계열 일반대학 비전임교원(강사·겸임·초빙·명예교수 등 포함), 4.1 기준 | 2025–2026 | v |  |
| 비전임교원 스톡 합계 | statistics-faculty-nonfulltime-stock-all-{year} | 2022:90,390 2023:92,144 2024:96,053 2025:99,185 2026:102,932 | count | 일반대학 비전임교원 전체 | 2022–2026 | v | 채용 수요 기준값으로는 과대 추정 위험(명예교수 등 상근 아님). 강사만의 계열별 값은 없음. |
| 강사 스톡 (계열 분해 없음) | statistics-faculty-lecturers-all-{year} | 2021:41,088 2022:42,255 2023:39,636 2024:39,879 2025:40,180 | count | 일반대학 비전임교원 중 강사(Lecturers), 종전 시간강사 포함 | 2021–2025 | v | 2020년 이후 강사가 비전임으로 분류. 시간강사 열 statistics-faculty-parttime-lecturers-all-2021 = 79(잔여, 2022년 이후 값 없음) → 강사 규모는 lecturers 열. |
| 명예교수 스톡 (수요 추정에서 차감) | statistics-faculty-honorary-all-{year} | 2021:16,676 2022:17,852 2023:19,103 2024:20,790 2025:22,124 | count | 일반대학 비전임 중 명예교수 | 2021–2025 | v | 상근 교원이 아니므로 비전임 수요 추정에서 뺀다(이월 항목). **계열 분해가 없다**: 계열별 비전임 수요(nonfulltime-stock-{계열} − honorary)를 만들려면 명예교수의 계열 배분 가정이 하나 더 필요하다(assumed). |
| 겸임·기타 비전임 스톡 | statistics-faculty-adjunct-all-{year}, statistics-faculty-othernonft-all-{year} | 2021:8586 2025:10,567 ; 기타 2021:20,507 2025:26,314 | count | 일반대학 비전임 중 겸임·기타 | 2021–2025 | v | 항등식 확인(computed): 2022–2025 모든 해에서 강사 + 겸임 + 명예 + 기타 = statistics-faculty-nonfulltime-stock-all-{year} (2025: 40,180 + 10,567 + 22,124 + 26,314 = 99,185). 따라서 전체 수준의 차감(비전임 − 명예)은 깔끔하다. 2021은 비교할 nonfulltime-stock-all 레코드가 없음. |
| 신규채용 (일반대학, 계열 분해 없음) | statistics-faculty-new-hires-all-{year}: 2021–2023, 2025; 2024는 statistics-faculty-new-hires-all-2024-a | 2021:5198 2022:3653 2023:4053 2024-a:4166 2025:4603 | count (연 플로우) | 일반대학 신규채용 교원, 직위 전체(총·학장 포함), 국·공·사립 | 2021–2025 | v | 플로우. 신규 박사학위 취득자 수가 아님. 타 대학 이동·비전임 전환 포함 여부 불명. 2020은 statistics-faculty-new-hires-all-2020(i, 언론 보도 2020학년도 값)이라 쓰지 말 것. 직급별 분해는 allinst만 있음. |
| 신규채용 (전체 고등교육기관: 쓰지 말 것) | statistics-faculty-new-hires-allinst-{all,professor,associate,assistant}-{year} | all 2021:6983 2025:6261; 2025 교수 330, 부교수 805, 조교수 5067 | count | 전문대학 등 포함 전체 고등교육기관 | 2021–2025 | v | 일반대학 기준값과 섞지 말 것(note). |
| 신규채용 2024 (인용 금지) | statistics-faculty-new-hires-all-2024-b | 4141 | count | 기사 서술(범위 불명) | 2024 | i | 연보 값(-a) 4166과 25명 차이로 needs-judge. 이월 항목: 인용 행 0개. |
| 퇴직 (일반대학, 계열 분해 없음) | statistics-faculty-retirements-all-{year} | 2021:4216 2022:4503 2023:4237 2024:4175 2025:4376 | count (연 플로우) | 일반대학 퇴직 교원, 직위 전체(총·학장 포함); 질병·사망·정년 등 합 | 2021–2025 | v | 집계 기간이 표에 명시되지 않음. |

**박사학위 취득자 (공급)** — `statistics-phd-awarded-{계열}-{year}`, 계열 키는 §2와 같음. 아래 값은 레코드 그대로.

| 계열 [KEDI7] | id 패턴 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|
| 인문 | statistics-phd-awarded-humanities-{year} | 1528 | 1668 | 1767 | 1809 | 1898 |
| 사회 | statistics-phd-awarded-social-{year} | 3094 | 3281 | 3210 | 3561 | 3694 |
| 교육 | statistics-phd-awarded-education-{year} | 890 | 1139 | 1152 | 1163 | 1410 |
| 공학 | statistics-phd-awarded-engineering-{year} | 4536 | 4688 | 4564 | 4872 | 5171 |
| 자연 | statistics-phd-awarded-natural-{year} | 2778 | 2890 | 2740 | 2792 | 2912 |
| 의약 | statistics-phd-awarded-medical-{year} | 2384 | 2428 | 2345 | 2373 | 2254 |
| 예체능 | statistics-phd-awarded-arts-sports-{year} | 1210 | 1666 | 1895 | 2144 | 2492 |
| 합계 | statistics-phd-awarded-total-{year} | 16,420 | 17,760 | 17,673 | 18,714 | 19,831 |

**공고 확률 기준값 예시 (computed, 레코드 아님).** 이 색인이 계산했다. 분자는 연간 신규채용(일반대학), 분모는 같은 연도 박사학위 취득자(외국인 포함, 의약·예체능·교육 포함)다. 신규채용이 계열별로 없으므로 계열별 값은 **분배 가정**(신규채용 × 계열별 전임 스톡 비중)을 얹은 것이며 근거 레코드가 없다(assumed).

| 연도 | 신규채용 (id) | 박사학위 취득자 (statistics-phd-awarded-total-) | 비율 (computed) | 연보 기준일 대비 비고 |
|---|---|---|---|---|
| 2021 | 5198 (new-hires-all-2021) | 16,420 | 0.3166 |  |
| 2022 | 3653 (new-hires-all-2022) | 17,760 | 0.2057 |  |
| 2023 | 4053 (new-hires-all-2023) | 17,673 | 0.2293 |  |
| 2024 | 4166 (new-hires-all-2024-a) | 18,714 | 0.2226 |  |
| 2025 | 4603 (new-hires-all-2025) | 19,831 | 0.2321 | 스톡·플로우·공급 세 계열이 모두 있는 최신 연도 |

2025 계열별 분배 예시 (분배 = 신규채용 4,603 × 계열 전임 스톡 비중, 가정):

| game 계열 | KEDI7 구성 | 전임 스톡 2025 (fulltime-stock) | 스톡 비중 | 박사학위 취득자 2025 (phd-awarded) | 분배된 신규채용 (assumed) | 비율 |
|---|---|---|---|---|---|---|
| 인문사회 (game): 인문+사회 | 인문+사회 | 18,421 | 28.5% | 5592 | 1311 | 0.2345 |
| 교육 (KEDI 교육계열 U03 → NRF 교육학 B120000, mapping-kedi 계열은 인문사회; 스펙 판정 필요) | 교육 | 3128 | 4.8% | 1410 | 223 | 0.1579 |
| 이공 (game) | 공학+자연 | 21,760 | 33.6% | 8083 | 1549 | 0.1916 |
| 기타 (game, 범위 밖): 의약+예체능 | 의약+예체능 | 20,397 | 31.5% | 4746 | 1452 | 0.3059 |
| 소속학과없음·계열 공란 | — | 966 | 1.5% | — | 69 | — |
| 합계 | — | 64,672 | 100% | 19,831 | 4603 | 0.2321 |

검산 (computed): 2025 신규채용 − 퇴직 = 4603 − 4376 = 227, 같은 기간 전임 스톡 증감 2025→2026 = 247. 두 값이 같은 모집단·기간이 아닐 수 있다(스톡은 총·학장 포함, 플로우는 직위 전체, 기간 정의 상이).

연도 의미 차이: 스톡·신규채용·퇴직의 `year`는 연보/조사 기준일(4월 1일) 판 연도이고, 박사학위 취득자의 `year`는 전년 8월+당해 2월 졸업을 묶은 조사 연도다. 한 해 어긋날 수 있다.

## 6. 계열 대응표

네 체계를 잇는다. 라벨은 레코드의 `population`·`note`에 적힌 그대로다. 게임 계열은 NRF 대분류에서 유도한다(결정 기록 0007). 아래 표의 "제안" 열은 판정되지 않은 후보이며, 판정은 새 결정 기록의 몫이다.

| game 계열 | NRF 대분류 [NRF] | game field 키 (schools·departments) | KSCED 10계열 라벨 [KSCED10] → statistics-employed-* | KEDI 7 대계열 라벨 [KEDI7] → statistics-phd-* / statistics-faculty-* 키 | 비고 |
|---|---|---|---|---|---|
| 인문사회 | A 인문학 (taxonomy-nrf-a000000) | humanities | 예술 및 인문학 → statistics-employed-arts-humanities (제안: humanities) | 인문계열 → phd `humanities` / faculty `humanities` | KSCED는 예술+인문을 묶어 인문 단독값이 아님. KEDI 인문(U01)의 소계열 20개 중 NRF A 17, B 2, H(기타) 1. |
| 인문사회 | B 사회과학 (taxonomy-nrf-b000000) | social | 사회과학, 언론 및 정보학 → statistics-employed-social (제안: social). 경영, 행정 및 법 → statistics-employed-business-law, 교육 → statistics-employed-edu 는 v3.5가 쓰지 않음 | 사회계열 → phd `social` / faculty `social`; 교육계열 → phd·faculty `education` | 교육계열(KEDI U03)은 NRF B120000 교육학으로 매핑되고 mapping-kedi 계열은 인문사회. 게임 인문사회에 넣을지는 판정 필요. |
| 이공 | C 자연과학 (taxonomy-nrf-c000000) | math, bio | 자연과학, 수학 및 통계학 → statistics-employed-natural-math (제안: math, bio) | 자연계열 → phd `natural` / faculty `natural` | KEDI 자연(U05)의 소계열 19개 중 NRF C 13, D 2, F(기타) 4. |
| 이공 | D 공학 (taxonomy-nrf-d000000) | engineering, cs | 공학, 제조 및 건설 → statistics-employed-engineering; 정보통신기술 → statistics-employed-ict (제안: cs) | 공학계열 → phd `engineering` / faculty `engineering` | cs는 공학 안에 있으나 취업률 라벨이 별도(정보통신기술). KEDI 공학(U04) 28개 중 NRF D 26, C 1, F(기타) 1. |
| 기타 | E 의약학 (taxonomy-nrf-e000000) | — | 보건 및 복지 → statistics-employed-health | 의약계열 → phd `medical` / faculty `medical` | 1차 범위 밖. |
| 기타 | F 농수해양학 (taxonomy-nrf-f000000) | — | 농림어업 및 수의학 → statistics-employed-agri-vet | KEDI에서는 자연(U05) 또는 공학(U04) 소계열로 분류됨 | 1차 범위 밖. 통계에는 자연·공학에 섞여 들어간다. |
| 기타 | G 예술체육학 (taxonomy-nrf-g000000) | — | 예술 및 인문학(일부), 서비스 → statistics-employed-service (대응 불확실) | 예체능계열 → phd `arts-sports` / **faculty `arts`** | 키 이름이 팩마다 다르다(phd arts-sports, faculty arts). |
| 기타 | H 복합학 (taxonomy-nrf-h000000) | — | 대응 없음 | 대응 없음(문헌정보학 H030000은 KEDI 인문 소계열) | 1차 범위 밖. |

**KEDI 대계열 → NRF 대분류 분포** (mapping-kedi.json primary 행 중 중계열·소계열 기준, 결정 기록 0009. 집계 전용 대분류 primary 10건 포함)

| KEDI 코드 | KEDI 대계열 라벨 | NRF 대분류(계열) 별 primary 행 수 | 대계열 행의 primary NRF |
|---|---|---|---|
| U01 | 인문계열 | A(인문사회) 19, H(기타) 1, B(인문사회) 2 | A000000 |
| U02 | 사회계열 | B(인문사회) 19 | B000000 |
| U03 | 교육계열 | B(인문사회) 5 | B120000 |
| U04 | 공학계열 | D(이공) 37, F(기타) 1, C(이공) 1 | D000000 |
| U05 | 자연계열 | F(기타) 5, C(이공) 16, D(이공) 2 | C000000 |
| U06 | 의약계열 | E(기타) 4 | E000000 |
| U07 | 예체능계열 | G(기타) 6 | G000000 |

mapping-kedi.json: 236행, KEDI 코드 125개(대 9행·중 78·소 149 행 수준별), primary 125행, 계열 분포 인문사회 48 / 이공 58 / 기타 19 (primary 기준). 결정 기록 0009 본문은 "교육·의약·예체능 12건"이 기타라고 쓰지만 데이터상 교육(U03)은 인문사회이고, 기타 12건은 의약 5 + 예체능 7이다(불일치, §9).

| 제안(미판정) | v3.5 field | 제안된 KSCED 10계열 라벨 | v3.5가 쓴 값 → record id |
|---|---|---|---|
| needs-judge-employment 항목 1 후보 | cs | 정보통신기술 | 0.682 → statistics-employed-ict |
| 〃 | math, bio | 자연과학, 수학 및 통계학 | 0.587 → statistics-employed-natural-math |
| 〃 | engineering | 공학, 제조 및 건설 | 0.625 → statistics-employed-engineering (cs·math·bio 외 공학 단일값) |
| 〃 | social | 사회과학, 언론 및 정보학 | 0.47 → statistics-employed-social |
| 〃 | humanities | 예술 및 인문학 | 0.408 → statistics-employed-arts-humanities (경영, 행정 및 법 0.408과 우연히 같음) |
| 〃 미사용 | — | 교육 0.627 / 경영, 행정 및 법 0.408 / 보건 및 복지 0.6 / 농림어업 및 수의학 0.525 / 서비스 0.544 | statistics-employed-{edu,business-law,health,agri-vet,service} |

## 7. 서사 커버리지

**stage × 트랙** (narratives 팩: 인문사회 `nar-hs-*` 47건, 이공 `nar-stem-*` 73건, 합 120건. stage 값은 narrative 스키마의 10개)

| stage | 인문사회 (hs) | 이공 (stem) | 합 | 인문사회 id 범위 | 이공 id 범위 |
|---|---|---|---|---|---|
| admission | 6 | 8 | 14 | nar-hs-admission-1…6 | nar-stem-admission-1…8 |
| coursework | 4 | 7 | 11 | nar-hs-coursework-1…4 | nar-stem-coursework-1…7 |
| qualifying | 3 | 3 | 6 | nar-hs-qualifying-1…3 | nar-stem-qualifying-1…3 |
| first-paper | 3 | 6 | 9 | nar-hs-first-paper-1…3 | nar-stem-first-paper-1…6 |
| funding | 6 | 12 | 18 | nar-hs-funding-1…6 | nar-stem-funding-1…12 |
| thesis | 4 | 5 | 9 | nar-hs-thesis-1…4 | nar-stem-thesis-1…5 |
| defense | 3 | 4 | 7 | nar-hs-defense-1…3 | nar-stem-defense-1…4 |
| early-career | 8 | 16 | 24 | nar-hs-early-career-1…8 | nar-stem-early-career-1…16 |
| mid-career | 5 | 7 | 12 | nar-hs-mid-career-1…5 | nar-stem-mid-career-1…7 |
| retirement | 5 | 5 | 10 | nar-hs-retirement-1…5 | nar-stem-retirement-1…5 |

**decision_point × 트랙** (선택 필드 `decision_point`. id는 접두 `nar-hs-` / `nar-stem-`를 뗀 형태)

| 결정 지점 | decision_point 값 | hs 건수 | hs id | stem 건수 | stem id | 해당 stage |
|---|---|---|---|---|---|---|
| 자격시험 직후 | qualifying-result (hs) / post-qualifying (stem) | 2 | qualifying-2, qualifying-3 | 2 | qualifying-2, qualifying-3 | qualifying |
| 첫 논문 판정 | first-paper-verdict | 3 | first-paper-1, first-paper-2, first-paper-3 | 3 | first-paper-1, first-paper-2, first-paper-5 | first-paper |
| 자금 만료 | funding-expiry | 2 | funding-4, funding-6 | 5 | funding-6, funding-8, funding-9, early-career-1, early-career-7 | funding/early-career |
| 졸업 직전 진로 | pre-graduation-path | 4 | early-career-3, early-career-4, early-career-5, early-career-7 | 6 | early-career-4, early-career-9, early-career-10, early-career-12, early-career-14, early-career-16 | early-career |
| 경력 5년 | career-5y | 4 | early-career-1, early-career-2, early-career-6, early-career-8 | 5 | early-career-3, early-career-5, early-career-6, mid-career-2, mid-career-6 | early-career/mid-career |
| 경력 10년 | career-10y | 5 | mid-career-1, mid-career-2, mid-career-3, mid-career-4, mid-career-5 | 2 | mid-career-4, mid-career-5 | mid-career |
| 은퇴 전 | pre-retirement | 5 | retirement-1, retirement-2, retirement-3, retirement-4, retirement-5 | 5 | retirement-1, retirement-2, retirement-3, retirement-4, retirement-5 | retirement |

decision_point 미표기: 인문사회 22건 / 이공 45건. 표기된 건수: 인문사회 25 / 이공 28. 서사 장면이 가장 얇은 곳: 자격시험 직후(hs 2·stem 2), 경력 10년 이공(2). 결정 지점 7종 모두 양쪽 트랙에 장면이 1건 이상 있다. confidence: 인문사회 verified 40 / indexed 7 (admission-3, funding-5, thesis-1, thesis-2, early-career-5, early-career-6, mid-career-5), 이공 verified 73.

**라벨 불일치**: 같은 결정 지점(자격시험 직후)에 인문사회는 `qualifying-result`, 이공은 `post-qualifying`을 쓴다. 스펙은 하나로 통일하고 narratives 팩의 값을 바꿀지 매핑할지 정해야 한다(§9). `defense` stage에는 대응하는 결정 지점이 없다(장면은 인문사회 3, 이공 4).

## 8. 신뢰도 요약

| pack | 파일 | 건수 | verified | indexed | assumed |
|---|---|---|---|---|---|
| taxonomy | taxonomy/records.json | 1040 | 1040 | 0 | 0 |
| taxonomy | taxonomy/mapping-tracks.json (행) | 66 | 22 | 16 | 28 |
| taxonomy | taxonomy/mapping-kedi.json (행) | 236 | 38 | 141 | 57 |
| schools | schools/records.json | 206 | 202 | 4 | 0 |
| departments | departments/records.json | 490 | 487 | 3 | 0 |
| salaries | salaries/records.json | 237 | 185 | 46 | 6 |
| statistics | statistics/records.json | 644 | 642 | 2 | 0 |
| venues | venues/records.json | 146 | 84 | 62 | 0 |
| narratives | narratives/humanities-social/records.json | 47 | 40 | 7 | 0 |
| narratives | narratives/stem/records.json | 73 | 73 | 0 | 0 |

registry: `data/sources/registry.json` 266건. 위 레코드의 `source_id`는 모두 registry.json에 있다(registry.d 항목 불필요, 결정 기록 0012). **수치가 README와 다른 곳**: schools는 verified 202 / indexed 4(README는 203 / 3), departments 483건 + 학과별 등록금 7건(README는 483만 서술).

**`assumed` 레코드 (salaries 6건, 전부 수집자 합산 파생값)**

| id | value | unit | year |
|---|---|---|---|
| salaries-faculty-all-lecturer-hourly-hourly | 72,001 | krw | 2026 |
| salaries-faculty-all-lecturer-hourly-hourly-2025 | 70,543 | krw | 2025 |
| salaries-faculty-national-lecturer-hourly-hourly | 97,492 | krw | 2026 |
| salaries-faculty-national-lecturer-hourly-hourly-2025 | 94,635 | krw | 2025 |
| salaries-faculty-private-lecturer-hourly-hourly | 57,921 | krw | 2026 |
| salaries-faculty-private-lecturer-hourly-hourly-2025 | 57,276 | krw | 2025 |

**`assumed` 매핑 행 (레코드 아님, 코드 기준)** — mapping-tracks.json 28행(트랙/NRF 코드, `*` = primary): systems_biology/C071600* systems_biology/C070100 systems_biology/C070200 systems_biology/C071500 semiconductor/D120700 semiconductor/C040600 energy/D030900 energy/D150400 energy/D180000 ai/D131500 ai/D131700 bioengineering/D092000 bioengineering/D250300 neuroscience/B210800 electrical/D120000 chemical/C060000 civil/D150000 civil/D240000 environmental/C080100 environmental/C070700 environmental/C100400 public_administration/B150000 korean_literature/A110100 korean_literature/A110400 korean_literature/A101300 english_literature/A150100 linguistics/A091900 linguistics/A091700. mapping-kedi.json 57행(KEDI→NRF, `*` = primary): U010111>A200000 U010112>A220000* U010112>A990000 U010202>A020600 U010202>B110000 U010202>G030000 U010205>A060000 U010208>A990000* U020104>B050600 U020107>B010000* U020107>B030100 U020107>B050100 U020301>C120100 U020301>C120200 U020302>B020500* U020302>B100000 U020302>B030800 U020302>B050800 U020303>B160200 U020308>B010000* U03>B000000 U0401>F030000 U040103>D150200 U040202>D150200* U040202>D140000 U040202>B140500 U040301>D191200 U0406>D000000* U0406>C040900 U040601>D091200 U040701>D090600 U040703>D100700 U040802>D131800 U040803>D120500 U041101>D080000* U041101>D020000 U041102>D990000* U041102>D160500 U041103>D010000* U05>F000000 U050103>D270000 U0502>D110000 U050201>D070000 U050203>C071000 U050204>D220000* U050204>F010000 U050206>C080100 U050206>C070700 U050301>C120100 U050301>C120300 U050302>F070000 U050303>G050000 U050304>C120000* U050304>C129900 U0504>B160000 U050406>C010000* U0702>G010000*.

**`indexed` 레코드 목록** (스펙 근거 표에서 쓰면 assumed 목록 또는 재확인 항목에 연결해야 함, 이월 항목 "신뢰도 표시")

| pack | indexed 건수 | id |
|---|---|---|
| schools | 4 | schools-postech-all-tuition, schools-postech-all-entrance-fee, schools-hanyang-all-scholarship-living-bk21, schools-ewha-all-entrance-fee |
| departments | 3 | departments-pusan-psychology, departments-knu-mechanical, departments-knu-philosophy |
| statistics | 2 | statistics-faculty-new-hires-all-2020, statistics-faculty-new-hires-all-2024-b |
| venues | 62 | 60건: venues-journal-{slug}-sjr-quartile 전부; 2건: venues-conf-icml-acceptance-2025, venues-conf-isscc-core-rank |
| salaries | 46 | salaries-faculty-all-fulltime-mean, salaries-faculty-all-fulltime-mean-2020, salaries-faculty-all-lecturer-hourly-hourly-2022, salaries-faculty-cau-professor-mean, salaries-faculty-cnu-professor-mean, salaries-faculty-college2yr-fulltime-mean, salaries-faculty-dgist-professor-mean, salaries-faculty-ewha-professor-mean, salaries-faculty-gist-professor-mean, salaries-faculty-hanyang-professor-mean, salaries-faculty-jnu-professor-mean, salaries-faculty-kaist-professor-mean, salaries-faculty-khu-professor-mean, salaries-faculty-knu-professor-mean, salaries-faculty-konkuk-professor-mean, salaries-faculty-korea-professor-mean, salaries-faculty-korea-professor-mean-2017, salaries-faculty-national-assistant-professor-mean-2017, salaries-faculty-national-associate-professor-mean, salaries-faculty-national-associate-professor-mean-2017, salaries-faculty-national-lecturer-hourly-hourly-2022, salaries-faculty-national-professor-mean-2017, salaries-faculty-postech-professor-mean, salaries-faculty-private-assistant-professor-mean, salaries-faculty-private-assistant-professor-mean-2017, salaries-faculty-private-associate-professor-mean-2017, salaries-faculty-private-lecturer-hourly-hourly-2022, salaries-faculty-private-nontenure-mean, salaries-faculty-private-professor-mean, salaries-faculty-private-professor-mean-2017, salaries-faculty-private-professor-mean-2019, salaries-faculty-pusan-professor-mean, salaries-faculty-skku-professor-mean, salaries-faculty-skku-professor-mean-2017, salaries-faculty-snu-assistant-professor-mean, salaries-faculty-snu-professor-mean, salaries-faculty-snu-professor-mean-2017, salaries-faculty-sogang-professor-mean, salaries-faculty-unist-professor-mean, salaries-faculty-uos-professor-mean, salaries-faculty-yonsei-professor-mean, salaries-faculty-yonsei-professor-mean-2017, salaries-institutes-etri-regular-mean-2022, salaries-institutes-kaeri-regular-mean-2022, salaries-institutes-kimm-regular-mean-2022, salaries-institutes-krict-regular-mean-2022 |
| narratives (hs) | 7 | nar-hs-admission-3, nar-hs-funding-5, nar-hs-thesis-1, nar-hs-thesis-2, nar-hs-early-career-5, nar-hs-early-career-6, nar-hs-mid-career-5 |

## 부록 A. `same_unit_as` 42건 → 대상 id (note 문장에서 기계 해석)

| # | 레코드 id (표기 있는 쪽) | 학과명 (note 첫 칸) | track | note가 가리키는 대상 문장 | 대상 id | 대상 존재 | 대상에도 표기 | 해석 방식 |
|---|---|---|---|---|---|---|---|---|
| 1 | departments-kaist-environmental | 건설및환경공학과 | environmental | 건설및환경공학과(civil 항목) | departments-kaist-civil | 예 | 아니오 | 이름+트랙 일치 |
| 2 | departments-gist-computer | 전기전자컴퓨터공학과 | computer | 전기전자컴퓨터공학과(electrical 항목) | departments-gist-electrical | 예 | 예 | 이름+트랙 일치 |
| 3 | departments-gist-electrical | 전기전자컴퓨터공학과 | electrical | 전기전자컴퓨터공학과(computer 항목) | departments-gist-computer | 예 | 예 | 이름+트랙 일치 |
| 4 | departments-gist-energy | 환경·에너지공학과 | energy | 환경·에너지공학과(environmental 항목) | departments-gist-environmental | 예 | 아니오 | 이름+트랙 일치 |
| 5 | departments-dgist-computer | 전기전자컴퓨터공학과 | computer | 전기전자컴퓨터공학과 (electrical) | departments-dgist-electrical | 예 | 예 | 이름+트랙 일치 |
| 6 | departments-dgist-electrical | 전기전자컴퓨터공학과 | electrical | 전기전자컴퓨터공학과 (computer) | departments-dgist-computer | 예 | 예 | 이름+트랙 일치 |
| 7 | departments-unist-chemical | 에너지화학공학과 | chemical | 에너지화학공학과 (energy) | departments-unist-energy | 예 | 예 | 이름+트랙 일치 |
| 8 | departments-unist-environmental | 지구환경도시건설공학과 | environmental | 지구환경도시건설공학과 (civil) | departments-unist-civil | 예 | 예 | 이름+트랙 일치 |
| 9 | departments-unist-civil | 지구환경도시건설공학과 | civil | 지구환경도시건설공학과 (environmental) | departments-unist-environmental | 예 | 예 | 이름+트랙 일치 |
| 10 | departments-unist-energy | 에너지화학공학과 | energy | 에너지화학공학과 (chemical) | departments-unist-chemical | 예 | 예 | 이름+트랙 일치 |
| 11 | departments-yonsei-life_science | 생명과학부 | life_science | 생명과학부 (systems_biology) | departments-yonsei-systems_biology | 예 | 예 | 이름+트랙 일치 |
| 12 | departments-yonsei-systems_biology | 생명과학부 | systems_biology | 생명과학부 (life_science) | departments-yonsei-life_science | 예 | 예 | 이름+트랙 일치 |
| 13 | departments-yonsei-civil | 건설환경공학과 | civil | 건설환경공학과 (environmental) | departments-yonsei-environmental | 예 | 예 | 이름+트랙 일치 |
| 14 | departments-yonsei-environmental | 건설환경공학과 | environmental | 건설환경공학과 (civil) | departments-yonsei-civil | 예 | 예 | 이름+트랙 일치 |
| 15 | departments-skku-computer | 전자전기컴퓨터공학과 | computer | 전자전기컴퓨터공학과 (electrical 항목) | departments-skku-electrical | 예 | 예 | 이름+트랙 일치 |
| 16 | departments-skku-electrical | 전자전기컴퓨터공학과 | electrical | 전자전기컴퓨터공학과 (computer 항목) | departments-skku-computer | 예 | 예 | 이름+트랙 일치 |
| 17 | departments-hanyang-english_literature | 영어영문학과 | english_literature | 영어영문학과 (linguistics 항목) | departments-hanyang-linguistics | 예 | 예 | 이름+트랙 일치 |
| 18 | departments-hanyang-linguistics | 영어영문학과 | linguistics | 영어영문학과 (english_literature 항목) | departments-hanyang-english_literature | 예 | 예 | 이름+트랙 일치 |
| 19 | departments-sogang-english_literature | 영어영문학과 | english_literature | 영어영문학과 (linguistics 항목) | departments-sogang-linguistics | 예 | 예 | 이름+트랙 일치 |
| 20 | departments-sogang-linguistics | 영어영문학과 | linguistics | 영어영문학과 (english_literature 항목) | departments-sogang-english_literature | 예 | 예 | 이름+트랙 일치 |
| 21 | departments-khu-english_literature | 영어영문학과 | english_literature | 영어영문학과 (linguistics 항목) | departments-khu-linguistics | 예 | 예 | 이름+트랙 일치 |
| 22 | departments-khu-linguistics | 영어영문학과 | linguistics | 영어영문학과 (english_literature 항목) | departments-khu-english_literature | 예 | 예 | 이름+트랙 일치 |
| 23 | departments-ewha-computer | 인공지능·소프트웨어학부 | computer | 인공지능·소프트웨어학부 (트랙 미기재) | departments-ewha-ai | 예 | 예 | 이름 일치 |
| 24 | departments-ewha-ai | 인공지능·소프트웨어학부 | ai | 인공지능·소프트웨어학부 (computer 항목과 같은 학부, 박사 전공에 인공지능 포함) | departments-ewha-computer | 예 | 예 | 이름+트랙 일치 |
| 25 | departments-ewha-electrical | 융합전자반도체공학부 | electrical | 융합전자반도체공학부 (트랙 미기재) | departments-ewha-semiconductor | 예 | 예 | 이름 일치 |
| 26 | departments-ewha-semiconductor | 융합전자반도체공학부 | semiconductor | 융합전자반도체공학부 (electrical 항목과 같은 학부, 전공 지능형반도체공학 포함) | departments-ewha-electrical | 예 | 예 | 이름+트랙 일치 |
| 27 | departments-ewha-chemical | 화공신소재공학과 | chemical | 화공신소재공학과 (트랙 미기재) | departments-ewha-materials | 예 | 예 | 이름 일치 |
| 28 | departments-ewha-materials | 화공신소재공학과 | materials | 화공신소재공학과 (chemical 항목과 같은 학과) | departments-ewha-chemical | 예 | 예 | 이름+트랙 일치 |
| 29 | departments-konkuk-civil | 사회환경공학부 | civil | 사회환경공학부 (트랙 미기재) | departments-konkuk-environmental | 예 | 예 | 이름 일치 |
| 30 | departments-konkuk-environmental | 사회환경공학부 | environmental | 사회환경공학부 (civil 항목과 같은 학부) | departments-konkuk-civil | 예 | 예 | 이름+트랙 일치 |
| 31 | departments-uos-computer-2 | 전자전기컴퓨터공학과 | computer | 전자전기컴퓨터공학과 (electrical 항목과 같은 학과) | departments-uos-electrical | 예 | 예 | 이름+트랙 일치 |
| 32 | departments-uos-electrical | 전자전기컴퓨터공학과 | electrical | 전자전기컴퓨터공학과 (트랙 미기재) | departments-uos-computer-2 | 예 | 예 | 이름 일치 |
| 33 | departments-pusan-ai | 정보융합공학과(AI전공) | ai | 정보융합공학과(컴퓨터공학전공) (트랙 미기재) | departments-pusan-computer | 예 | 아니오 | 이름 일치 |
| 34 | departments-pusan-civil | 사회환경시스템공학과 | civil | 사회환경시스템공학과(environmental) | departments-pusan-environmental | 예 | 예 | 이름+트랙 일치 |
| 35 | departments-pusan-environmental | 사회환경시스템공학과 | environmental | 사회환경시스템공학과(civil) | departments-pusan-civil | 예 | 예 | 이름+트랙 일치 |
| 36 | departments-pusan-bioengineering | 정보융합공학과(의생명융합전공) | bioengineering | 정보융합공학과(컴퓨터공학전공) (트랙 미기재) | departments-pusan-computer | 예 | 아니오 | 이름 일치 |
| 37 | departments-jnu-computer | 전자컴퓨터공학과(컴퓨터과학전공) | computer | 전자컴퓨터공학과(전자공학전공) (트랙 미기재) | departments-jnu-electrical-2 | 예 | 예 | 이름 일치 |
| 38 | departments-jnu-mathematics | 수학/통계학과(수학전공) | mathematics | 수학/통계학과(통계학전공) (트랙 미기재) | departments-jnu-statistics | 예 | 예 | 이름 일치 |
| 39 | departments-jnu-statistics | 수학/통계학과(통계학전공) | statistics | 수학/통계학과(수학전공) (트랙 미기재) | departments-jnu-mathematics | 예 | 예 | 이름 일치 |
| 40 | departments-jnu-electrical-2 | 전자컴퓨터공학과(전자공학전공) | electrical | 전자컴퓨터공학과(컴퓨터과학전공) (트랙 미기재) | departments-jnu-computer | 예 | 예 | 이름 일치 |
| 41 | departments-jnu-environmental | 환경에너지공학과 | environmental | 환경에너지공학과(energy) | departments-jnu-energy-2 | 예 | 예 | 이름+트랙 일치 |
| 42 | departments-jnu-energy-2 | 환경에너지공학과 | energy | 환경에너지공학과(environmental) | departments-jnu-environmental | 예 | 예 | 이름+트랙 일치 |

해석이 "이름 일치"만인 행은 note가 트랙을 쓰지 않았거나(ewha·konkuk·uos 등) 학과명에 괄호가 붙은 행이다. 대상에 표기가 없는 묶음 원소: departments-kaist-civil, departments-gist-environmental, departments-pusan-computer. 묶음 크기: 쌍 21 + 3건 묶음 1(부산대 정보융합공학과: pusan-computer, pusan-ai, pusan-bioengineering). 전부 같은 학교 안에서만 해석되었고 대상 id가 존재하지 않는 행은 0건이다. 기계 해석에서 학과명 안의 가운뎃점(환경·에너지공학과, 인공지능·소프트웨어학부, 융합전자반도체공학부)을 구분자로 보지 않아야 했으므로 4번(gist-energy), 23번(ewha-computer), 24번(ewha-ai), 25번(ewha-electrical)은 사람이 한 번 더 확인할 것.

## 부록 B. 번호 접미 slug 87건 (`departments-{school}-{slug}-N`)

| # | id | 학과명 (note 첫 칸) | NRF 코드 | track | field |
|---|---|---|---|---|---|
| 1 | departments-snu-computer-2 | [협]정보보호전공 | D132000 | computer | cs |
| 2 | departments-snu-neuroscience-2 | [협]뇌과학전공 | C070600 | neuroscience | bio |
| 3 | departments-snu-bioengineering-2 | 응용바이오공학과 | D070000 | bioengineering | bio |
| 4 | departments-snu-life_science-2 | [협]유전공학전공 | C070000 | life_science | bio |
| 5 | departments-snu-mechanical-2 | 항공우주공학과 | D040000 | mechanical | engineering |
| 6 | departments-snu-mechanical-3 | 조선해양공학과 | D190000 | mechanical | engineering |
| 7 | departments-snu-political-2 | 국제학과 | B020500 | political | social |
| 8 | departments-snu-history-2 | 동양사학과 | A020000 | history | humanities |
| 9 | departments-snu-history-3 | 서양사학과 | A020000 | history | humanities |
| 10 | departments-kaist-ai-2 | AI컴퓨팅학과 | D131100 | ai | cs |
| 11 | departments-kaist-ai-3 | AI시스템학과 | D131100 | ai | cs |
| 12 | departments-kaist-ai-4 | AX학과 | D131100 | ai | cs |
| 13 | departments-kaist-ai-5 | AI미래학과 | D131100 | ai | cs |
| 14 | departments-kaist-computer-2 | 정보보호대학원 | D132000 | computer | cs |
| 15 | departments-kaist-ai-6 | 데이터사이언스대학원 | D131100 | ai | cs |
| 16 | departments-kaist-bioengineering-2 | 공학생물학대학원 | D070000 | bioengineering | bio |
| 17 | departments-kaist-mechanical-2 | 항공우주공학과 | D040000 | mechanical | engineering |
| 18 | departments-kaist-environmental-2 | 환경에너지공학학제전공 | D110000 | environmental | engineering |
| 19 | departments-kaist-semiconductor-2 | 인공지능반도체대학원 | D120100 | semiconductor | engineering |
| 20 | departments-kaist-environmental-3 | 녹색성장지속가능대학원 | D110000 | environmental | engineering |
| 21 | departments-postech-systems_biology-2 | 융합대학원 합성생물학전공 | C071600 | systems_biology | bio |
| 22 | departments-postech-materials-2 | 첨단재료과학부 | D100000 | materials | engineering |
| 23 | departments-postech-energy-2 | 배터리공학과(친환경소재대학원) | D020700 | energy | engineering |
| 24 | departments-postech-materials-3 | 철강전공(친환경소재대학원 친환경소재학과) | D100000 | materials | engineering |
| 25 | departments-gist-ai-2 | AX학과 | D131100 | ai | cs |
| 26 | departments-gist-semiconductor-2 | 반도체특성화대학원 | D120100 | semiconductor | engineering |
| 27 | departments-unist-energy-2 | 원자력공학과 | D180000 | energy | engineering |
| 28 | departments-unist-energy-3 | 탄소중립대학원 | D020700 | energy | engineering |
| 29 | departments-yonsei-civil-2 | 도시공학과 | D140000 | civil | engineering |
| 30 | departments-yonsei-civil-3 | 건축공학과 | D150000 | civil | engineering |
| 31 | departments-yonsei-mechanical-2 | 항공우주공학과 | D040000 | mechanical | engineering |
| 32 | departments-yonsei-energy-2 | 기후변화에너지융합기술협동과정 | D020700 | energy | engineering |
| 33 | departments-yonsei-semiconductor-2 | 융합반도체협동과정 | D120100 | semiconductor | engineering |
| 34 | departments-yonsei-semiconductor-3 | 시스템반도체공학과 | D120100 | semiconductor | engineering |
| 35 | departments-yonsei-energy-3 | 이차전지융합공학과 | D020700 | energy | engineering |
| 36 | departments-korea-bioengineering-2 | 융합생명공학과 | D070000 | bioengineering | bio |
| 37 | departments-skku-computer-2 | 컴퓨터공학과(일반트랙) | D130000 | computer | cs |
| 38 | departments-skku-ai-2 | AI시스템공학과 | D131100 | ai | cs |
| 39 | departments-skku-ai-3 | AI응용공학과 | D131100 | ai | cs |
| 40 | departments-skku-ai-4 | 인공지능융합학과 | D131100 | ai | cs |
| 41 | departments-skku-bioengineering-2 | 융합생명공학과 | D070000 | bioengineering | bio |
| 42 | departments-skku-bioengineering-3 | 바이오메카트로닉스학과 | D070000 | bioengineering | bio |
| 43 | departments-skku-energy-2 | 저탄소에너지공학과 | D020700 | energy | engineering |
| 44 | departments-skku-energy-3 | 에너지과학과 | D020700 | energy | engineering |
| 45 | departments-hanyang-computer-2 | 정보시스템학과 | D130000 | computer | cs |
| 46 | departments-hanyang-ai-2 | 데이터사이언스학과 | D131100 | ai | cs |
| 47 | departments-hanyang-mechanical-2 | 미래자동차공학과 | D030000 | mechanical | engineering |
| 48 | departments-hanyang-electrical-2 | 전기공학과 | D090000 | electrical | engineering |
| 49 | departments-hanyang-materials-2 | 유기나노공학과 | D100000 | materials | engineering |
| 50 | departments-hanyang-energy-2 | 원자력공학과 | D180000 | energy | engineering |
| 51 | departments-hanyang-energy-3 | 배터리공학과 | D020700 | energy | engineering |
| 52 | departments-hanyang-environmental-2 | 환경과학과 | D110000 | environmental | engineering |
| 53 | departments-hanyang-semiconductor-2 | 나노반도체공학과 | D120100 | semiconductor | engineering |
| 54 | departments-hanyang-public_administration-2 | 정책학과 | B150000 | public_administration | social |
| 55 | departments-khu-computer-2 | 소프트웨어융합학과 | D131000 | computer | cs |
| 56 | departments-khu-life_science-2 | 유전생명공학과 | C070000 | life_science | bio |
| 57 | departments-khu-electrical-2 | 전자정보융합공학과 | D120000 | electrical | engineering |
| 58 | departments-ewha-ai-2 | 데이터사이언스학과 | D131100 | ai | cs |
| 59 | departments-ewha-life_science-2 | 바이오융합과학과 | C070000 | life_science | bio |
| 60 | departments-cau-energy-2 | 지능형에너지산업융합학과 | D020700 | energy | engineering |
| 61 | departments-konkuk-life_science-2 | 생명공학과 | D070000 | bioengineering | bio |
| 62 | departments-konkuk-bioengineering-2 | 생물공학과 | D070000 | bioengineering | bio |
| 63 | departments-uos-computer-2 | 전자전기컴퓨터공학과 | D130000 | computer | cs |
| 64 | departments-uos-public_administration-2 | 도시행정학과 | B140500 | public_administration | social |
| 65 | departments-pusan-chemical-2 | 화학소재학과 | D050000 | chemical | engineering |
| 66 | departments-knu-computer-2 | 소프트웨어학과 | D131000 | computer | cs |
| 67 | departments-knu-ai-2 | 데이터융합컴퓨팅학과 | D131100 | ai | cs |
| 68 | departments-knu-energy-2 | 에너지융합 및 기후변화학과 | D020700 | energy | engineering |
| 69 | departments-knu-materials-2 | 첨단소재공학부 금속재료공학전공 | D100000 | materials | engineering |
| 70 | departments-knu-materials-3 | 고분자공학과 | D060000 | materials | engineering |
| 71 | departments-knu-mechanical-2 | 정밀기계공학과 | D020000 | mechanical | engineering |
| 72 | departments-knu-bioengineering-2 | 의용생체공학과 | D250000 | bioengineering | bio |
| 73 | departments-jnu-life_science-2 | 생명과학기술학과 | C070000 | life_science | bio |
| 74 | departments-jnu-electrical-2 | 전자컴퓨터공학과(전자공학전공) | D120000 | electrical | engineering |
| 75 | departments-jnu-computer-2 | 지능전자컴퓨터공학과 | D130000 | computer | cs |
| 76 | departments-jnu-computer-3 | 컴퓨터공학과 | D130000 | computer | cs |
| 77 | departments-jnu-ai-2 | 빅데이터과학과 | D131100 | ai | cs |
| 78 | departments-jnu-materials-2 | 고분자공학과 | D060000 | materials | engineering |
| 79 | departments-jnu-energy-2 | 환경에너지공학과 | D020700 | energy | engineering |
| 80 | departments-jnu-civil-2 | 건설·환경공학과 | D140000 | civil | engineering |
| 81 | departments-cnu-history-2 | 국사학과 | A020000 | history | humanities |
| 82 | departments-cnu-electrical-2 | 전기공학과 | D090000 | electrical | engineering |
| 83 | departments-cnu-electrical-3 | 전파정보통신공학과 | D120000 | electrical | engineering |
| 84 | departments-cnu-materials-2 | 유기응용재료공학과 | D100000 | materials | engineering |
| 85 | departments-cnu-materials-3 | 고분자공학과 | D060000 | materials | engineering |
| 86 | departments-cnu-mechanical-2 | 메카트로닉스공학과 | D020000 | mechanical | engineering |
| 87 | departments-cnu-life_science-2 | 생화학과 | C060500 | life_science | bio |

건수 87 (computed). 새 엔진 키는 제안하지 않는다.

## 부록 C. v3.5 상수 → 레코드 id (oracle 비교표 입력)

| v3.5 항목 | v3.5 값 | 대응 record id | 레코드 값 | 일치 여부 |
|---|---|---|---|---|
| 취업률 cs | 0.682 | statistics-employed-ict | 0.682 | 일치 |
| 취업률 math, bio | 0.587 | statistics-employed-natural-math | 0.587 | 일치 |
| 취업률 engineering | 0.625 | statistics-employed-engineering | 0.625 | 일치 |
| 취업률 social | 0.470 | statistics-employed-social | 0.47 | 일치 |
| 취업률 humanities | 0.408 | statistics-employed-arts-humanities | 0.408 | 일치 |
| 비임금근로 비율 NON_WAGE_SHARE | 0.025 | statistics-nonwage-share | 0.025 | 일치 |
| 고용형태 정규 / 기간제(비정규 풀타임) / 시간제 | 45.0 / 44.1 / 10.9 | statistics-form-permanent, statistics-form-fixed, statistics-form-part | 0.45 / 0.441 / 0.109 | 일치 |
| 휴학 stem / other | 0.125 / 0.188 | statistics-leave-stem, statistics-leave-other | 0.125 / 0.188 | 일치 |
| 박사후 재원 대학 / 정부 / 공공연 / 민간연 / 기업 / 기타 | 60.9 / 14.5 / 13.7 / 1.8 / 3.1 / 6.0 | statistics-postdoc-funder-{university,government,public-institute,private-institute,private-company,other} | 0.609 / 0.145 / 0.137 / 0.018 / 0.031 / 0.06 | 일치 |
| 등록금 범위 cs (만원/학기) | [320, 570] | schools-{school}-cs-tuition (10건) | 333–751 | 다름: 사립 실값이 상한 초과(schools README 판정 "실제 값을 쓴다") |
| 등록금 범위 math | [280, 460] | schools-{school}-math-tuition (15건) | 292–661 | 〃 |
| 등록금 범위 bio | [350, 620] | schools-{school}-bio-tuition (15건) | 292–661 | 〃 |
| 등록금 범위 engineering | [330, 590] | schools-{school}-engineering-tuition (15건) | 311–751 | 〃 |
| 등록금 범위 social | [260, 470] | schools-{school}-social-tuition (15건) | 240–635 | 〃 |
| 등록금 범위 humanities | [250, 450] | schools-{school}-humanities-tuition (15건) | 240–635 | 〃 |
| 분야별 진행 속도 rate, 심사 개월, 요구 논문 수, 연구량 목표 | cs 7 [2,6] [1,2,2,3] 180 등 | 없음 | — | 근거 없음(v3.5 설계 가정) |
| 논문 채택 / 학위 심사 / 자격시험 공식 | clamp(0.15+q×0.005+…) 등 | 없음 | — | 근거 없음(§3) |
| 월급 범위 postdoc 250–380, lecturer 90–220, industry 320–520, institute 310–460, public 270–410, professor 360–520 (만원/월) | 출처 없음 | salaries-institutes-kribb-postdoc (postdoc); salaries-faculty-*-lecturer-hourly-hourly (lecturer, 시급); salaries-institutes-*-{new-hire,senior-researcher,principal-researcher}, salaries-public-researcher-*, salaries-public-univ-faculty-*, salaries-faculty-* (§4); industry 없음 | §4 참조 | 교체 가능(industry 제외) |
| 경력 소득 55 + min(150, 근속년×3.5) 만원, 대출 이자 3%, 한도 {1800,3000,4200} | 출처 없음 | 없음 | — | 근거 없음 |

## 9. 결손 목록

태그: **[결손]** 어떤 팩에도 레코드가 없다(스펙은 `assumed`로 등록하거나 결정 기록으로 정해야 함). **[불일치]** 레코드와 문서가 다르다. **[모호]** 규칙의 해석이 정해지지 않았다.

**입학 전 선택**

1. [결손] 지도교수 유형 선호의 분포와 효과 (v3.5 advisor.support·rigor·factor도 출처 없음).
2. [결손] 자금 경로(장학·과제·자비)별 입학자 비율과 학교별 장학 선발 확률.
3. [결손] 학교·학과별 입학 경쟁률, 박사 모집인원의 숫자 필드(모집인원은 note 문장에만 있음), 학교별 입학자 수.
4. [결손] 이화여대(ewha) 등록금: humanities·social 두 건뿐이라 cs·math·bio·engineering 학과 17곳에 쓸 레코드가 없다. 규칙 (c)는 cs만 다루므로 ewha의 나머지 세 분야도 스펙이 지정해야 한다.
5. [결손] cs 등록금 레코드가 없는 학교: hanyang, sogang, khu, pusan, uos, ewha(규칙 (c)). KAIST·POSTECH·GIST·DGIST는 분야 구분 없는 단일 값을 쓴다.
6. [결손] 입학금 레코드가 없는 학교: kaist, dgist, unist.
7. [모호] 등록금 연도 혼재: cau 6건·postech·dgist(2025), uos 5건(2024), 나머지 2026. POSTECH 등록금·입학금은 indexed이고 기간(학기/연간)이 불확실하다.

**박사과정 월 단위**

8. [결손] 자격시험 합격률·응시 시점·재응시 규칙.
9. [결손] 학위 소요 기간의 2016년 이후 값(2015·2013만 있음), 학차별 진행 속도, 월 단위 지연(stall) 확률, 연구 시간 비율.
10. [결손] 학위 심사 통과율, 심사 기간, 재심 횟수.
11. [결손] 휴학·중도탈락의 학차별·사유별 분포, 휴학 기간, 복학률, 학교별 값(연 단위 총계·계열·성별만 있음).
12. [결손] 생활비(월세·식비·교통비), 학자금 대출 이자율·한도, 조교·강사 근로 시간이 연구 시간에 주는 효과.
13. [모호] 휴학률 출처: KEDI 박사과정 휴학률(statistics-phd-leave-rate-*)과 KISTEP 졸업자 응답(statistics-leave-*)이 정의가 달라 어느 쪽을 쓸지 정해야 한다(판정 항목 5).

**결정 지점**

14. [결손] 저널 논문의 채택·수정·거절 확률과 심사 기간. SJR 사분위·KCI 등재는 계층 정보이며 확률이 아니다. 채택률은 CS·AI·시스템·보안·HCI·로보틱스 학회 14건뿐이다.
15. [결손] 인문사회 학회·저널의 채택률, 그리고 venues 분야군 12개 밖의 분야(언어학, 영어영문, 물리, 화학 단독, 교육 등)의 저널 레코드.
16. [결손] 졸업 직후 진로 분포(학계·산업·공공·창업). 대리값은 박사후 재원 비율(이공)과 비임금근로자 비율뿐이다.
17. [결손] 인문사회 박사후 재원 비율, 박사후 임기·인원·보수(KRIBB 채용 공고 1건 salaries-institutes-kribb-postdoc 외 없음).
18. [결손] 기업 연구직 임금과 채용 규모(wage.go.kr 접속 실패, salaries 팩에 레코드 0건).
19. [결손] 출연연·공공 연구기관의 채용 규모와 공고 건수.
20. [결손] 계열별 신규 임용 교원 수와 공고 건수. 시간강사 수요의 계열별 값(강사 스톡은 계열 분해 없음). 스펙에서 assumed로 확정해야 한다.
21. [결손] 경력 5년·10년 시점의 정규직 전환·이직·승진 확률과 승진 연한.
22. [결손] 호봉 승급 규칙(연 1호봉 등), 사립대 호봉표, 출연연 직급별 승진 급여 곡선, 강사 월 수입 환산용 강의 시수.
23. [결손] 교원 정년·은퇴 연령 분포, 퇴직금·연금.
24. [결손] 가상 뉴스의 효과 크기·지속 기간·빈도. 설계상 결정 기록으로 정하는 항목이며 근거 레코드가 없다.

**불일치·모호**

25. [불일치] "수집자 메모" 레코드 수: departments 레코드 기준 100건, 결정 기록 0011과 departments README는 106건.
26. [불일치] schools 신뢰도: 레코드는 verified 202 / indexed 4, README는 203 / 3. README는 "이화 수학 등록금" indexed를 말하지만 ewha-math 등록금 레코드는 없다.
27. [불일치] 결정 기록 0009 본문은 계열 기타 19건 중 "교육·의약·예체능 12건"이라 쓰지만, mapping-kedi.json에서 교육(U03)은 계열 인문사회이고 기타 12건은 의약 5 + 예체능 7이다.
28. [불일치] narratives decision_point 라벨: 자격시험 직후가 인문사회 `qualifying-result`, 이공 `post-qualifying`로 다르다.
29. [불일치] registry 중복이 아직 남아 있다: kedi-2026-basic-stats-press(레코드 11건 인용)와 kedi-2026-press-basic-stats(2건 인용).
30. [모호] 2017 직급 비율 규칙 (a): 비율 기준이 "교수=1"인지 "전임 평균=1"인지, 설립(국공립/사립)별 가중을 어떻게 할지 Wave 2 판정에 없다.
31. [모호] `same_unit_as` 규칙: 표기가 한쪽에만 있는 묶음 원소 3건(kaist-civil, gist-environmental, pusan-computer), 학과 하나에 전공이 둘 이상인 묶음(jnu 수학/통계학과, jnu 전자컴퓨터공학과, pusan 정보융합공학과)을 같은 단위로 셀지 정해야 한다.
32. [모호] 교육계열(KEDI U03 → NRF B120000)을 게임 인문사회에 포함할지. 포함하면 phd·faculty `education` 값이 인문사회 기준값에 들어간다(§5·§6).
33. [모호] 키 이름 불일치: 예체능이 phd는 `arts-sports`, faculty는 `arts`. `statistics-employed-*-2021-2024`와 단년 레코드는 `year`가 모두 2024라 id 접미사로만 구별된다.
34. [모호] 취업 정의(박사후·시간강사 포함), 고용형태 라벨(비정규직 풀타임 ≠ 기간제), 연도(2024 단년 vs 4년 합산)는 needs-judge-employment 7항목의 판정 대상이다.

---

### Handoff 2026-10-13
- 한 일: Wave 3 근거 레코드 색인 작성. 입학 전 선택 6종, 박사과정 월 단위 진행, 결정 지점 7종, 경력 단계 급여, 노동시장 기준값(공고 확률 예시 포함), 계열 대응표, 서사 커버리지, 신뢰도 요약, 결손 목록, 부록 3개(`same_unit_as` 42건 해석표, 번호 접미 slug 87건, v3.5 상수 대응). 값은 모두 레코드에서 스크립트로 옮겼고 계산값은 "computed"로 표시했다.
- 남은 일: 스펙 초안 작성자가 이 색인으로 근거 표를 만들고, §9의 [불일치]·[모호] 항목을 결정 기록으로 정한다. 새 결정 기록에서 needs-judge-employment 7항목을 판정한다. 스펙 감사는 인용한 근거 행마다 판정 한 줄을 남긴다.
- 막힌 것: 없음. 데이터와 결정 기록은 읽기만 했다. 계열별 신규 임용·공고 건수, 기업 연구직 임금, 자격시험·논문 채택 확률 같은 항목은 레코드가 없어 스펙에서 assumed로 정해야 한다.
- 다음 사람이 처음 읽을 파일: `docs/superpowers/specs/2026-10-13-wave3-evidence-index.md` §9, 이어서 `docs/waves/wave-03-engine-spec.md` "Wave 2 회고에서 이관"과 `data/packs/statistics/needs-judge-employment.md`.
- 브랜치/worktree: `wave-3/engine-spec` @ `D:/claude_projects/aphd-wave-3` (커밋·푸시 안 함).

