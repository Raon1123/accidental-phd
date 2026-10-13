# taxonomy 팩

**목적.** 한국연구재단 학술연구분야분류(대·중·소분류)를 기준 체계로 삼아, 교육통계(KEDI) 학과 분류와 게임용 연구 트랙을 거기에 매핑한다. 세부전공 선택지는 이 분류의 중·소분류를 그대로 쓰고, 계열(인문사회·이공) 구분은 대분류에서 유도한다.

**1차 출처 계급.** 한국연구재단(NRF) 학술연구분야분류표(최신 고시), 한국교육개발원(KEDI) 교육통계 학과(전공) 분류. 약어는 [용어집](../../../docs/workflow.md#용어집).

**파일.**
- `records.json` — 분류 코드 레코드. `value`는 분류 수준(1=대, 2=중, 3=소), `unit`은 `level`, `id`는 `taxonomy-nrf-<code>`. `note`에 한글 명칭과 상위 코드.
- `mapping-kedi.json` — `[{kedi_code, kedi_name, nrf_code, confidence, note}]` (Wave 1에서 생성)
- `mapping-tracks.json` — `[{track, nrf_code, nrf_name, confidence, note}]`. 트랙 26개는 `docs/oracle/v35-recon.md` 참고. 1:N 매핑은 전부 나열하고 `needs-judge`.

**id 규칙.** `taxonomy-<scheme>-<code>`.

**담당 issue.** Wave 1 — NRF 코드: #1 · KEDI 매핑: #2 · 트랙 매핑: #3
