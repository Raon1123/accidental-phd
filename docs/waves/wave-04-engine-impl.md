# Wave 4 — 엔진 구현

## 목표
Wave 3 스펙을 순수 함수로 구현한다. UI 의존 없음, 결정론적 seed, 테스트 우선.

## 진입 조건
Wave 3 종료 조건.

## 체크리스트
- [ ] TypeScript·Vitest 도입(결정 기록 0001). 완료 조건: `npm test`가 node:test와 vitest를 모두 실행, CI 통과.
- [ ] `createLife(config, seed)`: 입학 전 선택 6종(각각 "운에 맡기기" 허용)과 seed로 초기 상태 생성. 완료 조건: 같은 입력 → 같은 상태 테스트.
- [ ] `advanceMonth(state)`: 박사과정 월 단위 진행. 완료 조건: 스펙 공식별 단위 테스트, 경계값(능력치 0·100, 현금 음수).
- [ ] `advanceYear(state)`: 경력 단계 연 단위 진행과 노동시장 수요 계수·가상 뉴스 적용. 완료 조건: 뉴스 효과가 n개월 후 소멸하는 테스트.
- [ ] `decide(state, optionIndex)`: 결정 지점 처리. 완료 조건: 7종 결정 지점 각각 선택지별 테스트.
- [ ] `branch(state, decisionId)`: "다른 선택 보기"용 분기(같은 seed, 결정 지점부터 재생). 완료 조건: 분기 전 상태 동일성 테스트.
- [ ] v3.5 oracle 스냅샷 테스트: `docs/oracle/v35-recon.md` 공식에 같은 입력을 넣은 기대값과 우리 공식의 차이가 Wave 3 비교표의 사유 범위 안. 
- [ ] 커버리지: 공식 함수 100%, 전체 90% 이상.

## 종료 조건
테스트 전부 통과, CI 녹색, 엔진 API 문서(`engine/README.md`).

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 구현(TDD) | sonnet | Luna | medium | — |
| 코드 리뷰·엮기 | opus | Sol | high | — |
| 스펙 불일치 판정 | fable | Astra | high | `../prompts/judge-any.md` |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
