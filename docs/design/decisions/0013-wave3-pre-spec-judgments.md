# 0013. Wave 3 스펙 작성 전 판정 — 통계 사용 규칙과 모호점 정리

## 상태
승인됨 · 2026-10-13 (PR #36 머지, 결정 기록 0010 §3 (b); 판정자 fable/main thread; issue #18·#19 스펙이 이 규칙을 인용한다)

## 맥락
근거 레코드 색인(`docs/superpowers/specs/2026-10-13-wave3-evidence-index.md`)이 스펙 작성 전에 판정이 필요한 항목을 드러냈다: `data/packs/statistics/needs-judge-employment.md`의 7항목(Wave 2에서 이관), 휴학률 출처 두 가지, 한국교육개발원(KEDI) 교육계열(U03)의 게임 계열, 교원 급여 2017 직급 비율의 기준, `same_unit_as` 학과 묶음의 집계 방식, 서사 팩의 결정 지점 id 불일치, 계열별 신규 임용 배분, 가상 뉴스 효과의 범위.

## 결정

### 1. 취업 통계(statistics/employment) 사용 규칙 — needs-judge-employment.md 7항목
| 항목 | 판정 |
|---|---|
| 전공계열 매핑 | 한국표준교육분류(KSCED) 10계열 → 게임 트랙: computer·ai → 정보통신기술; mathematics·statistics·life_science·systems_biology·neuroscience → 자연과학·수학·통계; 공학 트랙 전부(mechanical·electrical·chemical·materials·civil·environmental·energy·semiconductor·bioengineering) → 공학·제조·건설; sociology·political·psychology → 사회과학·언론·정보학; economics·public_administration → 경영·행정·법; history·philosophy·korean_literature·english_literature·linguistics → 예술 및 인문학. 교육·보건·농림어업·수의학은 미사용. |
| 연도 | 2024 단년(`statistics-employed-<field>`)을 기본값으로 쓰고, 2021–2024 합산(`-2021-2024`)은 UI의 변동폭 표시에만 쓴다. |
| 취업 정의 | 게임의 "취업"은 출처와 같이 박사후연구원·시간강사를 포함한 임금 있는 자리다. 자리의 종류(교수·박사후·강사·기업·출연연·공공)는 별도 분기 확률로 정한다(§5). |
| 고용형태 | 정규/비정규 전일/시간제 비율(`statistics-form-*`)은 계열 공통값으로 쓴다. 계열별 차이는 그림 11 정규직 비율(`statistics-form-permanent-<field>-2021-2024`, 2021–2024 합산값만 존재하므로 "2024 단년 기본"의 예외)로만 반영한다. |
| 휴학 | 엔진은 KEDI 연간 휴학률(`statistics-phd-leave-rate-<계열>-<year>`, 재적 분모, verified)을 월 단위 위험률로 환산해 쓴다. 한국과학기술기획평가원(KISTEP) 휴학 경험률(.125/.188)은 서사 톤에만 쓰고 확률에 쓰지 않는다. |
| 박사후 재원 | 과학기술인력 비율은 이공 계열에만 적용한다. 인문사회 박사후 재원 분포는 `assumed`로 두고 대학 비율을 높인 가정값을 쓴다(스펙이 수치 제안). |
| 분모 미공개 | 레코드 그대로 쓰고 UI 출처 표기에 "표본 미공개"를 붙인다. |

### 2. 계열 대응
- NRF 대분류 → 게임 계열: A 인문학·B 사회과학 → 인문사회, C 자연과학·D 공학 → 이공, E~H → 기타(결정 기록 0007).
- KEDI 7 대계열 → 게임 계열: 인문·사회·**교육** → 인문사회, 공학·자연 → 이공, 의약·예체능 → 기타. 교육계열(U03)은 NRF 교육학(B120000, 사회과학)에 매핑되므로 인문사회다. 결정 기록 0009의 "교육·의약·예체능 12건" 서술은 "의약 5·예체능 7"로 정정한다(교육은 인문사회).
- KSCED 10계열은 §1 표로 트랙에 연결한다.

### 3. 교원 급여 조합 규칙(assumed)
- 교원 연봉(직급 r, 연도 t) = `salaries-faculty-all-fulltime-mean`(2025 전국 전임교원 평균) × ratio_r. ratio_r = pay_2017_r / mean(pay_2017_professor, pay_2017_associate, pay_2017_assistant), 설립 유형(national/private)별로 따로 계산. 분모는 세 직급 단순 평균이다(인원 가중치 없음, 출처에 인원 없음).
- 국립대 교원은 호봉표(`salaries-public-univ-faculty-<호봉>`)를 쓰고 초임 호봉은 별표 24 가감(`salaries-public-univ-career-adjust-*`)에 박사 가산 0을 더한다(assumed: 박사 학위 경력 인정 없음).
- cs 등록금이 없는 6개교(hanyang·sogang·khu·pusan·uos·ewha)는 공학 등록금을 쓴다. 이화(ewha)는 공학 레코드도 없으므로 `schools-ewha-social-tuition`에 서울 사립대 공학/사회 등록금 중앙 비율(스펙이 계산해 명시)을 곱한 값을 assumed로 쓴다.

### 4. same_unit_as 집계
- 선택 화면과 통계 집계에서 `same_unit_as`로 묶인 레코드는 학과 하나로 센다(42건 → 22묶음, 고유 단위 460). 대표 레코드는 묶음 안에서 id가 사전순으로 가장 앞선 것(v3.5 slug가 있으면 그것). 묶음의 다른 트랙은 그 학과의 "세부 트랙 선택지"로 노출한다.
- 수집자가 표시를 빠뜨린 묶음 구성원 3건(kaist-civil, gist-environmental, pusan-computer)은 이번 PR에서 note에 `same_unit_as`를 보완한다.
- 한 학과에 전공이 둘인 경우(전남대 수학/통계학과 등)는 학과 하나·전공 선택지 둘로 센다.

### 5. 결정 지점 id와 진로 분기
- 정본 id: `post-qualifying`, `first-paper-verdict`, `funding-expiry`, `pre-graduation-path`, `career-5y`, `career-10y`, `pre-retirement`. 인문사회 서사 팩의 `qualifying-result`는 `post-qualifying`으로 이번 PR에서 치환한다.
- 졸업 직전 진로 분기(학계·산업·공공·창업)는 출처가 없으므로 다음을 조합한 assumed 분포로 둔다: 고용형태(§1), 박사후 재원 비율(이공), 교원 신규 임용/박사 배출 비율(§6). 스펙이 수치를 제안하고 근거 레코드 id와 가정을 행마다 적는다.

### 6. 노동시장 기준값과 계열 배분(#19)
- 교수 공고 확률 기준값(연) = 신규 임용 전임교원 수(`statistics-faculty-new-hires-all-<year>`, 2024는 `-a`) ÷ 박사 학위 취득자 수(`statistics-phd-awarded-total-<year>`). 2025 전 분야 값은 색인의 computed 예시(0.2321)와 같은 방법으로 스펙이 다시 계산해 적는다.
- 계열별 배분: 신규 임용에 계열 분해가 없으므로 전임교원 스톡의 계열 비중(`statistics-faculty-fulltime-stock-<계열>-<year>`)으로 배분한다(assumed). 비전임 수요는 비전임 스톡에서 명예교수(`statistics-faculty-honorary-all-<year>`)를 뺀 값으로 잡는다.
- 시간강사·출연연·기업 공고 확률은 출처가 없으므로 assumed로 두고, 출연연은 ONE ST 초임 레코드가 있는 7기관을 대표로 쓴다.

### 7. 가상 뉴스 효과(#19) 범위
- 뉴스 한 건은 계열 또는 중분류 하나를 겨냥하고, 수요 계수를 −30% ~ +30% 범위에서 조정하며, 지속 기간은 3~12개월, 빈도는 월 1건 이하(전 분야 합산)로 둔다. 범위 안의 구체값과 분포는 스펙이 정하고 전부 `assumed`로 표시한다. 뉴스 텍스트는 창작이며 UI에 "창작" 표시를 한다(결정 기록 0005).

### 8. 기타 정정
- 결정 기록 0011과 departments README의 "수집자 메모 106건"은 레코드 기준 100건으로 정정한다(이번 PR).
- schools README의 신뢰도 "203/3"은 "202/4"로 정정하고, 존재하지 않는 이화 수학 등록금 언급을 지운다(이번 PR).
- 서사 팩의 결정 지점 id 통일(§5)과 `same_unit_as` 보완(§4)은 데이터 수정이므로 이번 PR에 포함한다.

## 결과
얻는 것: 스펙 초안이 판정 없이 바로 근거 id를 인용할 수 있고, assumed 목록의 경계가 분명해짐. 잃는 것: §3·§5·§6·§7은 설계 가정이라 Wave 6 플레이테스트에서 분포가 어긋날 수 있음. 다시 볼 조건: 기업 연구직 임금·계열별 신규 임용 출처가 생길 때, Wave 6 분포 비교 결과.
