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

## 회고 (2026-10-13, PR #20 리뷰 반영)
### 실패한 체크리스트 항목
- Task 3 첫 실행: `node --test tests/`(디렉터리 인자)가 Node 24에서 MODULE_NOT_FOUND — 원인: 계획이 Node 버전별 CLI 차이를 확인하지 않음 — 근거: 커밋 7f71f08.
- Task 7 첫 CI: `node --test "tests/**/*.test.mjs"`(glob)가 Node 20 CI에서 "Could not find" — 원인: 로컬(Node 24)과 CI(Node 20) 불일치 — 근거: PR #20 run 실패 → 커밋 7a8f307에서 bare `node --test`로 수정.
- Task 3 링크 검사: 계획 문서 안의 JS 문자열에 든 백틱 3개가 펜스를 조기 종료시켜 거짓 양성 — 원인: 펜스 정규식이 줄 머리 조건 없이 작성됨 — 근거: 커밋 7f71f08 테스트 `a backtick triple inside a fenced line does not close the fence`.
- 리뷰 발견: 스키마 설명이 검증기가 하지 않는 검사를 약속함(연도 정수, 날짜 형식, stage enum, 공백 분모) — 원인: 계획이 "자체 검사"와 "스키마 참고"의 경계를 명시하지 않음 — 근거: 리뷰 Important 2 → 검사 4종·테스트 4건 추가.
- 리뷰 발견: 실행 중 판정(ruling)이 git-ignore된 ledger에만 남음 — 원인: 계획이 회고를 "wave 종료 시"로 미룸 — 근거: 리뷰 Important 1 → 이 섹션.
### 다음 wave 체크리스트에 추가할 항목
- [ ] (Wave 1~) 모든 스크립트는 CI와 같은 Node 메이저(20)로 한 번 실행해 본다 — 완료 조건: PR 본문에 `node --version` 출력.
- [ ] (Wave 1~) 세션 중 판정은 ledger가 아니라 issue 댓글 또는 wave 파일 §회고에 즉시 적는다 — 완료 조건: PR마다 §회고 또는 issue 댓글에 판정 1줄 이상, 없으면 "판정 없음".
- [ ] (Wave 4) 검증·테스트 도구를 바꿀 때 `node --test` 자동 탐색이 `.ts`를 잡지 않음을 전제로 설계한다 — 완료 조건: 결정 기록 0001 갱신.
- [ ] (Wave 1~) 독립 단위(issue 본문·프롬프트·팩 README)에서 약어는 첫 등장에 풀어쓰거나 용어집을 링크한다 — 완료 조건: PR 리뷰 체크 항목.
### 프롬프트 수정 diff
- `docs/prompts/stat-validator-wave2.md` §과제 2: before "stage ∈ README 목록" → after "stage ∈ README 목록(검증기 STAGES 상수와 동일)" — 이유: CI가 같은 목록을 강제하게 되었음.
### 결정 기록으로 올릴 것
- 판정: 라벨 `area/narratives` 추가(스펙 §5 서사 팩 추가에 따름) — 스펙 §7·계획 Global Constraints에 반영.
- 판정: 펜스 정규식은 줄 머리 펜스만 인식하고 더 긴 펜스가 짧은 펜스를 포함할 수 있다 — 검증기 주석과 테스트로 고정.
- 판정: 워크트리 없이 `wave-0/planning` 브랜치에서 직접 실행 — repo가 비어 있어 병행 작업 없음.
- 판정: `narrative.schema.json`과 salaries 작업용 하위 파일 구조(README에만)는 스펙 개정분 반영.
