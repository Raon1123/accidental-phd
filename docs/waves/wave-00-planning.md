# Wave 0 — 계획·협업 골격

## 목표
어떤 agent나 사람이 repo와 issue만 보고 이어갈 수 있는 상태를 만든다. 스펙·계획·협업 계약·결정 기록·데이터 검증기·CI·issue 템플릿·프롬프트 세트·issue 등록·PR.

## 진입 조건
사용자 승인된 설계 스펙 `docs/superpowers/specs/2026-10-13-accidental-phd-planning-design.md`.

## 체크리스트
- [x] Task 1 협업 계약·라벨 스크립트·README — 완료 조건: 커밋 존재, `bash -n scripts/setup-labels.sh` 통과
- [x] Task 2 결정 기록 0001~0005 — 완료 조건: 4헤딩 검사 통과
- [x] Task 3 검증기·출처 등록부·스키마·빈 팩 — 완료 조건: `npm test` 15/15, `npm run validate` 통과(Task 6 이후)
- [x] Task 4 CI 워크플로우·issue 템플릿·PR 템플릿 — 완료 조건: 템플릿 필수 키 검사 통과
- [x] Task 5 wave 파일 7개·STATUS 보드 — 완료 조건: 링크 검사 통과
- [x] Task 6 프롬프트 세트 6개 — 완료 조건: `npm run validate` 통과
- [ ] Task 7 라벨 23개·issue 19건(#1~#19)·PR — 완료 조건: PR CI 통과, STATUS에 번호 기입 (PR #20)

## 종료 조건
PR 머지. Wave 1~3 issue가 열려 있고 `chatgpt-ready` 라벨이 붙어 있다.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 전체(설계·문서·스크립트) | fable (main thread) | Astra | high | — |

## 회고
### 실패한 체크리스트 항목
(wave 종료 시 작성)
### 다음 wave 체크리스트에 추가할 항목
(wave 종료 시 작성)
### 프롬프트 수정 diff
(wave 종료 시 작성)
### 결정 기록으로 올릴 것
(wave 종료 시 작성)
