# 프롬프트 세트

Claude와 ChatGPT가 같은 출력 계약으로 기여하기 위한 프롬프트 파일. 파일 하나가 역할 하나다.

## 모델 매핑

| 역할 | Claude | ChatGPT | 기본 effort | 파일 |
|---|---|---|---|---|
| 판정·스펙 감사·모호한 결정 재판정 | fable | Astra | high | [judge-any.md](judge-any.md) |
| 엮기·회고·결정 기록 작성 | opus | Sol | high | [weaver-retro-any.md](weaver-retro-any.md) |
| 분류 수집·매핑 초안 | sonnet | Luna | medium | [taxonomy-mapper-wave1.md](taxonomy-mapper-wave1.md) |
| 출처 독해·수치 추출 초안 | sonnet | Luna | medium | [stat-collector-wave2.md](stat-collector-wave2.md) |
| 서사 장면 추출 초안 | sonnet | Luna | medium | [narrative-collector-wave2.md](narrative-collector-wave2.md) |
| 정형화·기계 검증 | haiku | Luna | low | [stat-validator-wave2.md](stat-validator-wave2.md) |

Sonnet↔Luna는 사용자가 2026-10-13에 확정했다(결정 기록 0006, issue #17).

약어(NRF, KEDI, KRIVET, KISTEP, KCI, SJR, CORE, JCR, BK21, ALIO)는 [협업 계약의 용어집](../workflow.md#용어집)에 정의한다. 프롬프트 파일을 ChatGPT에 붙여넣을 때 용어집 표도 함께 붙여넣는다.

## 사용법

**ChatGPT.** 파일 전체를 새 대화에 붙여넣는다. `<<맥락>>` 블록 안의 항목을 repo에서 복사해 채운다(ChatGPT는 repo를 읽지 못한다). 출력은 issue 댓글이나 PR에 사람이 붙여넣을 수 있는 markdown·JSON이다. 파일 머리의 `model:`에 적힌 ChatGPT 등급을 고른다.

**Claude.** 하위 agent로 띄울 때 `Agent(model: "<파일 머리의 Claude 모델>", effort: "<effort>", prompt: <파일 내용 + 채운 맥락>)`. `model:`은 반드시 literal로 넘긴다. main thread에서 직접 수행할 때도 같은 출력 계약을 지킨다.

## 공통 구조

모든 프롬프트 파일은 다섯 부분으로 되어 있다.

1. **맥락 블록** — 붙여넣을 것의 목록. `<<맥락>>` … `<</맥락>>`.
2. **과제** — 무엇을 하는가, 무엇을 하지 않는가.
3. **출력 계약** — 출력의 정확한 형식. JSON은 `data/schema/`의 스키마와 일치.
4. **자기 검증 체크리스트** — 출력 전에 스스로 확인.
5. **handoff 형식** — `docs/workflow.md`의 handoff 댓글 형식 그대로.

## effort 조절

파일 머리의 `effort:` 줄은 기본값이다. 각 wave 파일(`docs/waves/`)의 모델·effort 표가 우선한다. 올리는 기준: 판정이 필요하거나 출처가 충돌할 때. 내리는 기준: 표 한 장을 그대로 옮기는 작업.
