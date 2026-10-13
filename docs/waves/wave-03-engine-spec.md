# Wave 3 — 엔진·선택권·노동시장 스펙

## 목표
Wave 4가 구현할 공식을 전부 글로 정한다. 모든 확률은 Wave 2 레코드 id 또는 결정 기록을 근거로 적는다.

## 진입 조건
Wave 2 종료 조건. 단, 상태 모델 스펙은 Wave 2와 병행 가능.

## 체크리스트
- [ ] 상태 모델 스펙: 능력치(0~100) 목록과 의미, 단계(입학 전·박사과정 월·경력 연·기록 종료 80세), 저장 형식 버전. 완료 조건: `docs/superpowers/specs/<date>-engine-state-design.md` 승인. — issue #18
- [ ] 선택권 모델 공식: 입학 전 선택 6종과 결정 지점 7종 각각에 선택지·효과·확률 근거 레코드 id. 근거 없는 항목은 `assumed` 목록으로 분리. 완료 조건: 모든 확률에 근거 열이 채워짐. — issue #18
- [ ] 노동시장·가상 뉴스 모델: 시간강사·교수·연구원 공고 확률 = 기준값(statistics-faculty-market) × 수요 계수; 월별 가상 뉴스가 수요 계수를 n개월 조정; 효과 크기·지속 기간·빈도는 결정 기록. 창작 표시 규칙. — issue #19
- [ ] v3.5 oracle 비교표: `docs/oracle/v35-recon.md`의 공식(논문 채택·학위 심사·연구 진행·자격시험·경력 전환) vs 우리 공식, 차이 사유. 완료 조건: 표의 모든 행에 사유.
- [ ] 결정 기록: 확률 근거 없는 항목(assumed) 전체 목록과 각각의 설계 가정 사유.
- [ ] 스펙 감사: judge 프롬프트로 fable/Astra가 모호한 항목 0건 확인.

## 종료 조건
엔진 스펙 승인 + 결정 기록 + oracle 비교표. Wave 4 issue 발행.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 스펙 초안·엮기 | opus | Sol | high | `../prompts/weaver-retro-any.md`(초안 모드) |
| 스펙 감사·판정 | fable | Astra | high | `../prompts/judge-any.md` |
| 근거 레코드 조회·표 작성 | sonnet | Luna | medium | — |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
