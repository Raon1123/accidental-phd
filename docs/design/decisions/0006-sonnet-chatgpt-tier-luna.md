# 0006. Sonnet의 ChatGPT 대응 등급은 Luna

## 상태
승인됨 · 2026-10-13 (issue #17)

## 맥락
모델 매핑은 fable↔Astra, opus↔Sol, haiku↔Luna로 확정되어 있었고, Sonnet(출처 독해·통계 추출·초고·구현 역할)에 대응하는 ChatGPT 등급만 비어 있었다. 선택지는 Sol(품질 우선, 비용 상승)과 Luna(비용 우선)였다. Wave 2의 통계 수집은 표를 옮기는 작업이 대부분이고, 판단이 필요한 항목은 `needs-judge`로 fable/Astra에게 넘기는 구조라 중간 등급의 품질 차이가 결과를 좌우하지 않는다.

## 결정
Sonnet ↔ Luna. 역할 표는 다음과 같다.

| 역할 | Claude | ChatGPT | 기본 effort |
|---|---|---|---|
| 판정·스펙 감사·재판정 | fable | Astra | high |
| 엮기·회고·결정 기록 | opus | Sol | medium~high |
| 출처 독해·추출 초안·구현 | sonnet | Luna | medium |
| 정형화·기계 검증 | haiku | Luna | low |

Luna는 두 역할을 맡으므로 effort(medium vs low)로 구분한다. 문서의 "Sol (확인 필요)" 표기는 전부 "Luna"로 치환했다.

## 결과
얻는 것: ChatGPT 쪽 비용 절감, 프롬프트 파일의 미정 표기 제거. 잃는 것: 출처 독해 품질이 떨어지면 `needs-judge` 건수가 늘 수 있음. 다시 볼 조건: Wave 2 회고에서 Luna 산출물의 거부율(stat-validator 거부 목록)이 사람이 다시 읽어야 할 만큼 높을 때.
