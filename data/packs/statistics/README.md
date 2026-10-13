# statistics 팩

**목적.** 게임 확률의 근거가 되는 집계 통계. 취업률, 고용형태, 휴학, 수료 기간, 배출 수, 성별·연령 분포, 분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수.

**1차 출처 계급.** 한국직업능력연구원(KRIVET) 국내 신규 박사학위 취득자 조사, 한국과학기술기획평가원(KISTEP) 이공계인력 지표집, 한국교육개발원(KEDI) 교육통계연보·고등교육통계, 대학알리미(교원 현황). 약어는 [용어집](../../../docs/workflow.md#용어집).

**캐비앗 보존.** 출처가 밝힌 한계를 `note`에 그대로 옮긴다. 예: "졸업자 조사이며 입학자 종단조사가 아님", "고용형태는 임금근로자 조건부, 분야 합산".

**id 규칙.** `statistics-<topic>-<key>`. 예: `statistics-employed-cs`, `statistics-form-permanent`, `statistics-leave-stem`, `statistics-faculty-new-hires-humanities`. 비율은 `unit: ratio`, `denominator` 필수.

**id 규칙 보충(2026-10-13, #14 판정).** 시계열은 `statistics-<topic>-<key>-<field>-<year>`처럼 연도 접미사를 붙인다(검증기가 id 중복을 거부하므로). 단년 레코드는 연도 접미사 없이 둔다. 같은 수치에 출처가 둘이면 `-a`(1차 출처: 연보·공시)와 `-b`(2차: 기사·보고서 요약)로 두고 게임은 `-a`를 쓴다. 계열은 교원 소속 학과의 7 대계열이며 교원 본인의 전공계열(연보 표 13-8)이 아니다. 비전임교원에는 명예교수가 포함되므로 수요 추정 시 `honorary-all`을 뺀다.

**담당 issue.** Wave 2 — employment: #12 · progress: #13 · faculty-market: #14
