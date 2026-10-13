# taxonomy 팩

**목적.** 한국연구재단 학술연구분야분류(대·중·소분류)를 기준 체계로 삼아, 교육통계(KEDI) 학과 분류와 게임용 연구 트랙을 거기에 매핑한다. 세부전공 선택지는 이 분류의 중·소분류를 그대로 쓰고, 계열(인문사회·이공) 구분은 대분류에서 유도한다.

**1차 출처 계급.** 한국연구재단(NRF) 학술연구분야분류표(최신 고시), 한국교육개발원(KEDI) 교육통계 학과(전공) 분류. 약어는 [용어집](../../../docs/workflow.md#용어집).

**파일.**
- `records.json` — 분류 코드 레코드. `value`는 분류 수준(1=대, 2=중, 3=소), `unit`은 `level`, `id`는 `taxonomy-nrf-<code>`. `note`에 한글 명칭과 상위 코드.
- `mapping-kedi.json` — `[{kedi_code, kedi_name, kedi_level, nrf_code, nrf_name, nrf_level, confidence, primary, 계열, note}]`. KEDI 코드당 primary 1행 = KEDI 단위 전체를 담는 가장 좁은 NRF 코드(결정 기록 0009). NRF→KEDI 조회는 primary nrf_code가 조상인 행 중 kedi_level이 가장 깊은 것.
- `mapping-tracks.json` — `[{track, nrf_code, nrf_name, level, confidence, primary, 계열, note}]`. 트랙당 primary 1행(중분류면 그 소분류가 세부전공 선택지), 보조 후보는 primary=false. 판정은 결정 기록 0008.

**id 규칙.** `taxonomy-<scheme>-<code>`.

**담당 issue.** Wave 1 — NRF 코드: #1 · KEDI 매핑: #2 · 트랙 매핑: #3
