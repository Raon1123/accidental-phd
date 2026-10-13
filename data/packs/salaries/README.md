# salaries 팩

**목적.** 연구자 경력 단계별 현실적 급여와 호봉 테이블. 출처 계급별로 하위 파일을 나눈다. 약어(ALIO, KRIVET, BK21, NRF)는 [용어집](../../../docs/workflow.md#용어집).

**하위 파일과 1차 출처 계급.**

| 파일 | 내용 | 출처 |
|---|---|---|
| `records.json` | 통합(모든 하위 레코드를 여기에 둔다; 하위 파일은 작업용) | — |
| `public.json` | 교육공무원 봉급표, 연구직 공무원 봉급표(호봉별) | 인사혁신처 공무원 보수규정 별표 |
| `institutes.json` | 정부출연연구기관 직급별 평균 보수 | ALIO 공공기관 경영정보 공시 |
| `faculty.json` | 대학 교원 직급별 평균 급여 | 대학알리미 |
| `entry.json` | 박사 초임(분야·고용형태별), 기업 연구직 임금 | KRIVET 박사조사, 고용노동부 임금직무정보시스템 |
| `stipends.json` | BK21 연구장려금 하한, 이공계 박사 연구장려금 하한, 학교별 보장액 | 교육부·NRF 공고, 학교 공시 |

작업용 하위 파일에 모았다가 PR 전에 `records.json`으로 합친다. 검증기는 `records.json`만 검사한다.

**id 규칙.** `salaries-<class>-<grade>-<step>`. 예: `salaries-public-research-5`(연구직 5호봉), `salaries-faculty-assistant-mean`. `unit`은 `krw`(연봉 원) 또는 `krw-10k`(월 만원). `note`에 연도·세전/세후·수당 포함 여부.

**faculty 하위 집합 규칙(2026-10-13, #10 판정).** 대학알리미에는 교원 급여 공시 항목이 없다(강사 강의료만 공시). 직급별 교원 급여는 교육부가 의원실에 제출한 자료의 언론 보도만 있어 `indexed`이며 연도가 섞여 있다(2017 직급·설립별 전국표, 2021 일부 학교, 2024·2025 전국 평균). 강사 시간당 강의료는 2026 공시 학교별 `verified`(DGIST·UNIST는 강사 0명). 전국·국공립·사립 평균 6건은 학교값을 수집자가 합산한 파생값이라 `assumed`(2022 공표값과 0.8% 이내 일치). 게임은 교원 급여에 2025 전국 평균(1억 98만 원)과 2017 직급 비율을 조합해 쓰되 Wave 3에서 `assumed`로 표시한다. 대학알리미 접근 경로: POST /popup/pubinfo0420/selectSearchDataList.do → /popup/pubinfo2020/selectGraphDataList.do (schlId, svyYr, menuIdx=04).
**institutes 하위 집합 규칙(2026-10-13, #9).** 국가과학기술연구회 소속 출연연은 ALIO에 없고 ONE ST(onest.re.kr) 공시만 있어 직급별 초임(원급·선임급·책임급)과 기관장 연봉을 기록했다(평균 보수 아님). 경제·인문사회연구회 소속은 ALIO 일반정규직 평균(연구·행정 합산), 신입사원 초임(학사 기준), 기관장 연봉. 2022년 평균 4건(ETRI·KIMM·KRICT·KAERI)은 언론 집계라 `indexed`로 유지하되 초임과 비교하지 않는다(판정 2026-10-13). 박사후연구원 보수는 KRIBB 공고 1건만. 단위는 연봉 원(월급은 ×12, note에 환산 표기).
**public 하위 집합 규칙(2026-10-13, #8).** 국립대 교원 봉급표(별표 12)는 직급 열이 없어 `salaries-public-univ-faculty-<호봉>` 하나로 둔다. 직급은 초임 호봉 산정(별표 24 경력연수 가감: 교수 −10, 부교수 −7, 조교수 −4, 조교 0 → `salaries-public-univ-career-adjust-*`, unit `years`)으로만 반영된다. 박사 학위 가산은 규정에 없으므로 게임의 초임 호봉 규칙은 Wave 3에서 `assumed`로 정한다. 조교 공제(별표 12 비고 3)는 `salaries-public-univ-assistant-deduction`. 별표 15·16 초임호봉 획정 규칙과 전문대학 열은 미수집.

**담당 issue.** Wave 2 — public: #8 · institutes: #9 · faculty: #10 · entry: #11
