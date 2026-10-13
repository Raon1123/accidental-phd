# Wave 파일 규약

각 wave 파일은 이 순서의 섹션을 가진다.

1. `## 목표`
2. `## 진입 조건` — 이전 wave 종료 조건 그대로
3. `## 체크리스트` — 항목마다 검증 가능한 완료 조건과 담당 issue 번호
4. `## 종료 조건`
5. `## 모델·effort 표` — 역할 | Claude | ChatGPT | effort | 프롬프트 파일
6. `## 회고` — wave 종료 시 작성. 하위 항목: 실패한 체크리스트 항목 / 다음 wave 체크리스트에 추가할 항목 / 프롬프트 수정 diff(파일·줄) / 결정 기록으로 올릴 것

회고의 "다음 wave 체크리스트에 추가할 항목"은 다음 wave 파일 체크리스트에 **반드시** 옮긴다. 이것이 self-improve 루프다. 회고는 [weaver 프롬프트](../prompts/weaver-retro-any.md)로 작성하고, 회고가 비어 있는 wave는 종료된 것으로 치지 않는다.

현재 상태는 [STATUS.md](STATUS.md).

| 파일 | 내용 |
|---|---|
| [wave-00-planning.md](wave-00-planning.md) | 계획·협업 골격 |
| [wave-01-taxonomy-sources.md](wave-01-taxonomy-sources.md) | 분류 체계·출처 등록부 |
| [wave-02-statistics-packs.md](wave-02-statistics-packs.md) | 통계·서사 팩 수집 |
| [wave-03-engine-spec.md](wave-03-engine-spec.md) | 엔진·선택권·노동시장 스펙 |
| [wave-04-engine-impl.md](wave-04-engine-impl.md) | 엔진 구현 |
| [wave-05-ui-narrative.md](wave-05-ui-narrative.md) | UI·서사·가상 뉴스 |
| [wave-06-balance-retro.md](wave-06-balance-retro.md) | 밸런스·플레이테스트·회고 |
