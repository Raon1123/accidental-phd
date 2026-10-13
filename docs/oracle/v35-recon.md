# Reconnaissance: accidental-phd v3.5 (deployed at accidental-phd.hslee0251.chatgpt.site), fetched 2026-10-13

## Module map (ES modules, static site)
- app.js (UI/orchestration, 32.6 KB) -> engine.js (facade: `export * from './life-engine.js'`; v1/v2 saves use frozen engines)
- life-engine.js (adapter; imports realistic-engine.js, school-study-engine.js, stories.js, cohort.js, departments.js, statistics.js)
- school-study-engine.js (doctoral-stage rules; imports legacy-engine.js, cohort.js, departments.js, school-model.js)
- realistic-engine.js (VERSION 2; imports legacy-engine.js)
- departments.js -> department-data.js (241 entries, 20 schools, revision KR-DEPARTMENTS-2026-10-11) + research-tracks.js (26 tracks, fictional)
- schools.js (20 schools, SCHOOL_REVISION KR-20-2026-10-11, tuition/entrance/research fee per field in KRW, support programs, selectionProbability all null)
- school-names.js (fictional display names: 서월대학교, 한국과제기술원(KQIST), ...)
- statistics.js (revision KR-2024/2022.1; KRIVET 2025-03-31 report tables 8/9/10; KISTEP 2023 이공계인력 지표집 B-3-12/B-3-15)
- cohort.js (COHORT_REVISION 'typical-1'; weighted auto focus/choice policy)
- life-views.js, school-views.js (views)
- NOT fetched: legacy-engine.js, stories.js, school-model.js, research/department-sources.json (redirects to landing page)

## State model (v2/v3)
stats: energy, morale, relationship, skill, network (0-100); project 0-100; papers[] {status draft/revision/review/accepted, writing, due, quality, attempts}; money, debt, researchBudget, tuitionPaid, job{name,hours}, ledger[], transactions[], history[], log[]; profile {name, age 24-36, university/schoolId, departmentId, advisor{support,rigor,factor}, climate, funding{type,amount,untilMonth,dutyHours}, living{rent,food,transport,utilities,other}, tuition, tuitionRate, housing, family{label,support}}; focus (research/write/network/teach/rest/thesis); qualified; leave; end{reason,route}; education/career/arrears (life stage); seed 'LIFE-xxx'.
localStorage: accidental-phd.current.v1 / archive.v1 (15 records) / settings.v1.

## Field MODEL table
| field | rate | review months | tuition 만원/term | papers req | evidence target |
| cs 7 [2,6] [320,570] [1,2,2,3] 180 | math 5.9 [4,10] [280,460] [1,1,2] 175 | bio 5.8 [3,8] [350,620] [1,2,2] 180 | engineering 6.5 [3,7] [330,590] [1,2,2] 185 | social 5.5 [4,9] [260,470] [1,1,2] 175 | humanities 5.2 [4,10] [250,450] [0,1,1] 180 |
Stall: math 24%/month, others 16%.

## Key formulas
- progress gain = base × (0.65+rand×0.85) × (0.65+skill/140) × researchTime × energyFactor × advisor.factor × (0.2 if blocked)
- researchTime = max(0.12, (44 − dutyHours − jobHours − 6·coursework)/44)
- paper quality0 = 30 + skill×0.45 + relationship×0.08 + U(−9,9); accept = clamp(0.15 + q×0.005 + (attempts−1)×0.07, 0.25, 0.88); revision if roll < min(0.95, accept+0.29); review delay 18% (+1–3 mo)
- qual exam: from month 12, every 6; needs skill≥44; pass min(0.95, 0.65+attempts×0.05)
- defenseChance = clamp(0.35 + skill×0.004 + relationship×0.001 + energy×0.001 + attempts×0.08, 0.40, 0.94)
- loan interest debt×0.0025/month (3%/yr); credit limit {1800,3000,4200}
- ends: phd / time (month 108) / financial / new-path; max residence 96 (+extension)
- career: job search p = 0.07 + skill×0.0007 + network×0.0005; forms permanent 32 / fixed 48 / part 15 / self 5; postdoc if fixed & STEM 0.62 (other 0.25); professor 9%/yr after ≥36 academic work months; retirement age U[60,67]; income 55 + min(150, workYears×3.5) 만원; record ends age 80 (no mortality modelled)
- monthly pay 만원: postdoc 250–380, contract 240–360, lecturer 90–220, freelance 100–240, industry 320–520, institute 310–460, public 270–410, independent 100–400, professor 360–520, bridge 170–240 (game assumptions, not sourced)

## Statistics constants (sourced)
FIELD_DATA employed: cs .682, math/bio .587, engineering .625, social .470, humanities .408 (KRIVET 2024 학업전념 박사)
NON_WAGE_SHARE .025 (conditional on employment, table 9); EMPLOYMENT_FORMS permanent 45.0 / fixed 44.1 / part 10.9 (table 10); LEAVE_REFERENCE stem .125 other .188; POSTDOC_FUNDERS 대학교 60.9 / 정부기관 14.5 / 공공연구소 13.7 / 민간연구소 1.8 / 민간기업 3.1 / 기타 6.0 (KISTEP 2022)
Header caveat: "A graduate survey is NOT a longitudinal study of all doctoral entrants."

## Gaps vs user goals
- No journals / conferences / impact factor; papers are abstract
- Salaries are uniform ranges, unsourced; no 호봉 table; no faculty/출연연/공무원 pay scales
- Taxonomy is a gameplay classification (6 fields × 26 tracks), not NRF/KEDI official codes
- No design-decision records; no multi-agent / GitHub issue workflow; no tests visible
- Time-to-degree, completion/attrition rates, advisor distribution are design assumptions
