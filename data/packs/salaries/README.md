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

**담당 issue.** Wave 2 — public: #8 · institutes: #9 · faculty: #10 · entry: #11
