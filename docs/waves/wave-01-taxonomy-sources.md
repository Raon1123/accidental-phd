# Wave 1 — 분류 체계·출처 등록부

## 목표
세부전공 선택지의 기준이 될 한국연구재단 학술연구분야분류를 수집하고, 교육통계 학과 분류와 게임 트랙 26개를 거기에 매핑한다. Wave 2가 쓸 출처 계급을 등록부에 미리 넣는다.

## 진입 조건
Wave 0 PR 머지.

## 체크리스트
- [x] NRF 학술연구분야분류 대·중·소분류 코드 수집 → `data/packs/taxonomy/records.json` (value=수준, unit=level, note에 한글명·상위 코드). 완료 조건: 대분류 전부, 중·소분류는 인문사회·이공 계열 전부. 출처 URL·고시 연도 registry 등록. — issue #1 (2026-10-13: 1,040건, 대 8·중 153·소 879, 출처 `nrf-2024-classification`)
- [x] 교육통계(KEDI) 학과 분류 ↔ NRF 매핑 → `taxonomy/mapping-kedi.json`. 완료 조건: 241개 학과가 쓰는 모든 KEDI 코드에 NRF 코드 1개 이상. — issue #2 (2026-10-13: KEDI 125코드·236행, 인문·사회·공학·자연 소계열 전부, 판정은 결정 기록 0009. "241개 학과" 대조는 departments 팩 수집(#5)에서 확인)
- [x] 게임 트랙 26개 ↔ NRF 소분류 매핑 → `taxonomy/mapping-tracks.json`. 완료 조건: 26개 전부, 1:N은 전부 나열 후 `needs-judge` 판정 완료. — issue #3 (2026-10-13: 66행, 판정은 결정 기록 0008)
- [x] `registry.json`에 출처 계급 7종(NRF/KEDI, 대학 공시, 모집요강, Scimago/KCI/CORE, 인사혁신처/ALIO/대학알리미/KRIVET, KRIVET/KISTEP/KEDI 통계, 수필·수기) 각 1건 이상. 완료 조건: `npm run validate` 통과. (2026-10-13: 포털 7건 등록. 모집요강·수필·수기·인사혁신처는 개별 수집 issue에서 등록 — 포털이 없는 계급)
- [x] 결정 기록 0007: 분류 기준으로 NRF를 택한 이유와 계열(인문사회·이공) 유도 규칙. (2026-10-13 승인)

## 종료 조건
`npm run validate` 통과, 매핑 표에 26개 트랙 전부, 결정 기록 0007 승인.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 분류 수집·매핑 초안 | sonnet | Luna | medium | `../prompts/taxonomy-mapper-wave1.md` |
| 1:N 매핑 판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 정형화·검증 | haiku | Luna | low | `../prompts/stat-validator-wave2.md` |
| 회고 | opus | Sol | medium | `../prompts/weaver-retro-any.md` |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
