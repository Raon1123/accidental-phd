# venues 팩

**목적.** 분야별 target 저널·학회와 공개 지표. 저널은 Scimago SJR 사분위와 KCI 등재 여부, 학회는 CORE 등급. 공개된 채택률만 기록한다. Journal Impact Factor는 수집하지 않는다(결정 기록 0003).

**1차 출처 계급.** Scimago Journal & Country Rank, 한국연구재단 KCI, CORE Conference Ranking, 학회 공식 공지(채택률).

**id 규칙.** `venues-journal-<slug>-<item>`, `venues-conf-<slug>-<item>`. `item` ∈ `sjr-quartile`(value 1~4, unit `level`), `kci`(value 1/0, unit `count`), `core-rank`(value: A*=4, A=3, B=2, C=1, unit `level`), `acceptance`(unit `ratio`, denominator 필수). `note`에 분야(NRF 코드)와 정식 명칭.

**담당 issue.** Wave 2 — journals: #6 · conferences: #7
