# narratives 팩

**목적.** 박사과정·연구자 생활을 다룬 수필·수기·인터뷰·질적 연구에서 장면 단위 기록을 뽑아 시나리오 작성(Wave 5)의 근거로 쓴다. 인문사회와 이공 계열은 연구 방법·자금 구조·경력 경로가 달라 하위 팩을 분리한다.

- `humanities-social/records.json` — 인문사회 계열
- `stem/records.json` — 이공 계열

**저작권 규율.**
1. 원문을 저장하지 않는다. `summary`는 장면의 구조(상황·갈등·선택·결과)만 2~3문장으로 적고, 저자의 문장을 옮기지 않는다. 창작 각색은 허용한다.
2. `quote`는 15단어 이하 인용 1개 이하. 없으면 빈 문자열. 검증기가 단어 수를 검사한다.
3. 비공개 글, 사적 정보, 실명 제3자에 대한 서술은 수집하지 않는다.
4. 시나리오에 쓸 때는 창작임을 UI에 표시한다(어쩌다 박사 v3.5 research-tracks 관례).

**1차 출처 계급.** 출판 수필·에세이집, 대학원생 수기 공모 수상작, 공개 블로그·브런치, 질적 연구 논문(면담 발췌), 언론 인터뷰.

**필드.** `data/schema/narrative.schema.json`. `stage` 값: `admission, coursework, qualifying, first-paper, funding, thesis, defense, early-career, mid-career, retirement`. `theme`는 자유 태그. 선택 필드 `decision_point`에 어느 결정 지점에 쓸 수 있는지 적는다.

**id 규칙.** `nar-<track>-<stage>-<n>`. track은 `hs`(인문사회) 또는 `stem`. 예: `nar-hs-funding-2`.

**담당 issue.** Wave 2 — humanities-social: #N · stem: #N
