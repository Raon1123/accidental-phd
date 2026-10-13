# venues 팩

**목적.** 분야별 target 저널·학회와 공개 지표. 저널은 Scimago Journal Rank(SJR) 사분위와 한국학술지인용색인(KCI) 등재 여부, 학회는 CORE(Computing Research and Education Association of Australasia) 등급. 공개된 채택률만 기록한다. Journal Impact Factor(Clarivate JCR)는 수집하지 않는다(결정 기록 0003). 약어는 [용어집](../../../docs/workflow.md#용어집).

**1차 출처 계급.** Scimago Journal & Country Rank, 한국연구재단 KCI, CORE Conference Ranking, 학회 공식 공지(채택률).

**id 규칙.** `venues-journal-<slug>-<item>`, `venues-conf-<slug>-<item>`. `item` ∈ `sjr-quartile`(value 1~4, unit `level`), `kci`(value 1/0, unit `count`), `core-rank`(value: A*=4, A=3, B=2, C=1, unit `level`), `acceptance`(unit `ratio`, denominator 필수). `note`에 분야(NRF 코드)와 정식 명칭.

**conferences 보충(2026-10-13, #7 판정).** CORE 판본은 ICORE2026(포털 기본)이며 CSV export 경로(`portal.core.edu.au/conf-ranks/?...&do=Export`)가 curl + 브라우저 UA로 열린다. `item` 추가: `held`(value 1, unit count — 국내 학술대회처럼 등급·채택률이 공표되지 않는 학회의 존재 기록). ICASSP는 ICORE2026에서 Multiconference(등급 없음)라 CORE2023의 B를 유지, ISSCC는 CORE2018 등급만 있어 `indexed`. 채택률 중 산출값(OSDI·S&P·DAC·ICRA)은 note에 표기. 분모 종류(valid/reviewable/completed)가 학회마다 달라 비교 시 note 확인.

**담당 issue.** Wave 2 — journals: #6 · conferences: #7
