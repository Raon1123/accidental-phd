# departments 팩

**목적.** 20개교의 박사 모집 단위(학과·학부·대학원) 241개를 공식 모집요강으로 기록하고, 각 학과를 taxonomy 팩의 NRF 중·소분류 코드에 연결한다. 플레이어의 선택 단위가 학과까지 내려가므로 이 팩이 선택지 목록이 된다.

**1차 출처 계급.** 각 대학원 박사 신입생 모집요강(최신 학년도), 학과 홈페이지.

**id 규칙.** `departments-<school_id>-<slug>`. 예: `departments-snu-computer`. `value`는 1(존재 확인), `unit`은 `count`. `note`에 한글 학과명·모집 단위 종류·NRF 코드. 학과별 등록금이 학교 기본값과 다르면 `departments-<school_id>-<slug>-tuition` 레코드를 따로 둔다.

**담당 issue.** Wave 2 — #5
