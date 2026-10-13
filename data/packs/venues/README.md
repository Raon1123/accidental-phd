# venues 팩

**목적.** 분야별 target 저널·학회와 공개 지표. 저널은 Scimago Journal Rank(SJR) 사분위와 한국학술지인용색인(KCI) 등재 여부, 학회는 CORE(Computing Research and Education Association of Australasia) 등급. 공개된 채택률만 기록한다. Journal Impact Factor(Clarivate JCR)는 수집하지 않는다(결정 기록 0003). 약어는 [용어집](../../../docs/workflow.md#용어집).

**1차 출처 계급.** Scimago Journal & Country Rank, 한국연구재단 KCI, CORE Conference Ranking, 학회 공식 공지(채택률).

**id 규칙.** `venues-journal-<slug>-<item>`, `venues-conf-<slug>-<item>`. `item` ∈ `sjr-quartile`(value 1~4, unit `level`), `kci`(value 1/0, unit `count`), `core-rank`(value: A*=4, A=3, B=2, C=1, unit `level`), `acceptance`(unit `ratio`, denominator 필수). `note`에 분야(NRF 코드)와 정식 명칭.

**journals 보충(2026-10-13, #6 판정).** Scimago(scimagojr.com)는 자동 접근이 403이라 SJR 사분위 60건은 RCSI 저널 랭크 DB(journalrank.rcsi.science, Scimago 사분위를 재게시) 경로로 읽어 `indexed`로 둔다. 사분위는 저널의 여러 Scimago 카테고리 중 해당 NRF 중분류에 맞는 카테고리를 primary로 고르고 대안은 note에 적는다(예: CSAM Q4 통계 vs Q3 응용수학). KCI 등재 여부 43건은 KCI 직접 조회로 `verified`(등재후보는 value 0). Wave 3 이관: 브라우저 세션에서 Scimago 원본으로 사분위를 재확인해 `verified`로 올릴 것.

**담당 issue.** Wave 2 — journals: #6 · conferences: #7
