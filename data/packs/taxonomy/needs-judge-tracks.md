# 트랙 매핑 needs-judge 목록 — 판정 완료

2026-10-13 수집자(sonnet)가 49행을 `needs-judge`로 올렸고, 같은 날 판정자(fable)가 전부 판정했다. 판정 내용과 최종 primary 표는 [결정 기록 0008](../../../docs/design/decisions/0008-track-mapping-judgments.md)에 있다. `mapping-tracks.json`에는 더 이상 `needs-judge` 행이 없다(66행, 트랙 26개, primary 26개).

요약:
- primary 수준 규칙: 트랙이 중분류를 통째로 덮으면 중분류, 일부면 소분류.
- 변경: korean_literature → A110000, english_literature → A150000.
- 삭제: 의약학·복합학 코드(E300000, H070000, H060000)와 이공 트랙의 인문사회 후보(B081000, B150900).
