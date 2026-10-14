# Wave 5 — UI·서사·가상 뉴스

## 목표
플레이 가능한 정적 사이트. 1in8b.life에서 상속한 UI 장치와 narratives 팩에 근거한 창작 서사.

## 진입 조건
Wave 4 종료 조건.

## 체크리스트
- [x] (PR #63 커밋 09ccdf2·1d07f3a, Pages 배포 사용자 확인 2026-10-14, #53) 정적 사이트 골격(`web/`), GitHub Pages 배포, localStorage 저장·불러오기·기록 보관(최근 10개).
- [x] (커밋 6d02e7a, `web/test/select.test.ts` 6건, #54) 입학 전 선택 화면: 하고 싶은 분야(전공군 26개, 계열별로 묶음) 하나만 고르거나 분야도 운에 맡긴다. 세부전공(NRF) → 학교·학과 → 자금 → 지도교수 선호는 운에 맡긴다(사용자 결정 2026-10-14; 처음 계획은 여섯 단계 모두 화면에서 고르기였다). 엔진 `createLife`는 여섯 단계 설정을 그대로 받으므로 단계를 더 열 때는 화면만 더한다.
- [x] (`engine/test/taxonomy.test.ts`·`departments.test.ts` 등 전공군 수 27·인문사회 11 갱신, #70) 인문사회에 법학 전공군 추가. 사용자 결정(2026-10-14)으로 범위에 넣고 전공군은 `law` 하나. 법학과 박사 모집 11개교 레코드(모집요강 `verified`), 결정 기록 0008 추가 판정.
- [x] (#68) 세부전공은 학과(대학별 전공)를 먼저 정한 뒤 그 학과의 NRF 코드 하위 소분류에서 균등 추첨한다. 같은 seed의 세부전공·학과 결과가 이전과 달라진다. `engine/test/createLife.test.ts` 3건.
- [x] (#69, 취소) 학교 선택은 만들지 않는다. 학교는 운이고 플레이어는 분야(전공)만 고른다(사용자 결정 2026-10-14). 대학별 개설 전공 차이는 학교·학과 추첨과 세부전공 추첨(#68)에 반영된다.
- [x] (커밋 821e2b4, `web/test/play.test.ts` 13건, 헤드리스 Chrome 클릭 확인, #55) 1in8b.life 상속 UI: 속도 조절(1×~16×), 자동 모드, 연구노트(기록, 최신순), life map(1칸=1개월 또는 1년), 결정 지점에서 시간 정지.
- [x] (커밋 7b1add6, `web/test/cohort.test.ts` 7건, `engine/test/branch.test.ts` +2건, 헤드리스 Chrome 클릭 확인, #56) "같은 해 입학한 동기 4명" 패널과 "다른 선택 보기" 분기 화면.
- [x] (커밋 468a128, `engine/test/continueAfterPhd.test.ts` 4건, #85) 학위 없이 박사과정이 끝나도(이탈·재학연한·재정 파탄) 경력 단계로 넘어가 80세까지 이어진다(사용자 요청 2026-10-14). `end.reason`은 기록으로 남고, 채용·급여 보정은 0014 #32를 학위 없는 경력 전체로 넓혔다.
- [x] (커밋 58f4297, `data/text/scenes.ko.json` 45건, `web/test/scenes.test.ts` 11건, fable 감사 pass 17·revise 29 반영, #57) 서사 텍스트 팩: narratives 팩 레코드에 근거한 학과·계열별 장면 텍스트(창작 표시). 완료 조건: 모든 장면이 narratives 레코드 id 또는 `assumed`를 참조. 박사 이후 다른 분야로 옮겨 일을 이어가는 장면(채용 장면의 첫 일자리·전환·학위 없이)을 넣었다(사용자 요청 2026-10-14).
- [x] (`engine/test/advanceYear.test.ts` +1건, `web/test/play.test.ts` +2건, #96) 박사 졸업 뒤에도 월 정산: 경력·은퇴 단계에서 달마다 급여·연금, 생활비, 부채 이자, 상환(소득의 20%까지), 부족분 대출을 원장에 적는다(0014 #122·#123, 선택권 §5.6). 자금 카드용 미리보기(`moneyView().careerFlow`)와 계산서 열(급여·연금·상환)을 더했다. 화면 표시(renderMoneyCard)는 design 세션 PR #91 머지 뒤에 붙인다.
- [x] (커밋 9c67ed7, `data/text/news.ko.json` 34건, `web/test/news.test.ts` 7건, fable 감사 pass 29·revise 5 반영, #58) 가상 분야 뉴스 텍스트 팩: 계열·분야별 월간 헤드라인과 수요 효과 태그(창작 표시). 완료 조건: 뉴스마다 효과 크기·지속 기간이 Wave 3 결정 기록 범위 안.
- [x] (커밋 257f7a9, `web/test/schoolName.test.ts` 7건: 매핑 표 일치, 화면 경로 하나, 자동 생애 8개 실명 0건, #59) 가상 학교명 표시 함수: 화면·공유 카드·로그에 실명이 나가지 않는 테스트(결정 기록 0004).
- [x] (커밋 8428f02, `web/test/sources.test.ts` 6건, 헤드리스 Chrome 확인, #60) 출처 footer: registry.json과 registry.d에서 자동 생성.
- [x] (커밋 f13daff, `web/test/a11y.test.ts` 6건, 헤드리스 Chrome 키보드 전용 조작 확인, #61) 접근성: 키보드 조작, 본문 건너뛰기, 명도 대비.

- [x] (`data/packs/narratives/humanities-social/records.json` +27건, 출처 `data/sources/registry.d/81-hs-news.json` 21건, fable 감사 pass 12·revise 14·drop 3 반영, #81) 인문사회 서사 레코드 보강: 기사·인터뷰·수기에서 장려금·과제, 아르바이트·조교, 학자금대출, 시간강사·비정규직, 전직, 질병·휴학 장면을 수집했다(원문 미저장, 사용자 요청 2026-10-14). 검증기에 출처 URL 중복 검사를 더했다.

### Wave 4 회고에서 이관
출처: [wave-04 §회고](wave-04-engine-impl.md). Wave 5 issue를 발행할 때 각 issue 본문에 이 절을 링크하고 그 issue가 맡는 항목을 나열한다(회고 프롬프트 출력 계약 (c)).

- [x] (PR #62 커밋 768fec0, #52) 분기 논문 판정 동일성 테스트(구현 계획 Review Focus 5의 나머지 절). — 완료 조건: `engine/test/branch.test.ts`에 결정 지점 전에 투고한 논문의 판정 달과 결과가 서로 다른 선택을 한 두 분기에서 같다는 테스트가 있고, 테스트 이름에 "Review Focus 5"가 있다.
- [x] (PR #64 커밋 d937ab5·268e384 감사 표, f0a297a 스펙 반영, 0748022 구현 반영, #51) 스펙·구현 차이 감사(결정 기록 0015 §3, 새 세션 fable). UI 화면 문구가 이 판정을 따르므로 UI 결정 지점 화면보다 먼저 한다. — 완료 조건: 틱 순서 구부린 곳 (a)~(e)와 PR #49 단순화 목록을 합친 서로 다른 차이 13행마다 스펙 절, 구현 위치(파일·함수), 결과가 달라지는 입력 예 하나, 판정(스펙을 고침·구현을 고침·차이 유지)이 있는 표가 `docs/superpowers/specs/2026-10-14-wave4-divergence-audit.md`에 있다. "스펙을 고침" 판정마다 해당 스펙 절이 바뀌었고, "구현을 고침" 판정마다 테스트가 있다.
- [x] (PR #62 커밋 768fec0, #52) 스펙 결정 시점 상수 주석. — 완료 조건: `engine/src/career/tick.ts`의 5년·10년·정년 2년 전 상수마다 선택권 스펙 §3.5·§3.6·§3.7 인용 주석이 있다.
- [x] (커밋 8428f02, #60) UI의 근거 신뢰도 표시. — 완료 조건: 화면이 레코드에서 온 값을 보여줄 때 `indexed`·`assumed` 값에 표시가 붙고, 출처 footer가 그 값의 레코드 id 또는 0014 번호를 보여준다. 테스트가 `indexed` 레코드 하나와 `assumed` 상수 하나의 표시를 확인한다.
- [ ] 브라우저 재확인 묶음(#48): Scimago SJR 60건, CORE·wage 포털과 기업 연구직 임금, 모집요강. — 완료 조건: [wave-04 체크리스트](wave-04-engine-impl.md)의 세 항목 완료 조건 그대로다. `verified`가 된 SJR 레코드마다 `engine/test/confidence.test.ts` 기대값을 바꾼다. 세 번째 이월이므로, 이번 wave 안에 브라우저 세션을 열지 못하면 각 레코드 note에 시도 날짜와 실패 사유를 적고 항목을 닫는다.
- [x] (PR #64 커밋 d937ab5·f0a297a, 0016 승인, #51) 결정 기록 0016(Wave 4 회고 후보 3건: 묶음 PR 병합 방식, 스펙과 구현이 다를 때의 정본, 보정에서 자동 정책의 지위). — 완료 조건: `docs/design/decisions/0016-*.md`가 세 쟁점마다 판정과 반대 근거를 담고, 병합 방식 판정이 `docs/workflow.md` §브랜치·PR 규약에 반영돼 있다.
- [x] (#75) 자금 카드: 현금·부채·다음 한 칸 정산 예정(지원, 가족 지원, 생활비, 등록금, 월 수지)과 월별 계산서를 좌측에 둔다. 속도와 포커스는 드롭다운 대신 버튼을 나열한다. 미리보기가 실제 틱의 원장과 같은지 `web/test/play.test.ts`가 확인한다.

## 종료 조건
한 판을 처음부터 80세 기록 종료까지 플레이 가능, CI 녹색, 실명 누출 테스트 통과.

## 모델·effort 표
| 역할 | Claude | ChatGPT | effort | 프롬프트 파일 |
|---|---|---|---|---|
| 서사·뉴스 초안 | sonnet | Luna | medium | `../prompts/narrative-collector-wave2.md`(창작 모드) |
| UI 구현·엮기 | opus | Sol | high | — |
| 톤·창작 표시 감사 | fable | Astra | high | `../prompts/judge-any.md` |
| 문자열 정형화·i18n 키 추출 | haiku | Luna | low | — |

## 회고
### 실패한 체크리스트 항목
### 다음 wave 체크리스트에 추가할 항목
### 프롬프트 수정 diff
### 결정 기록으로 올릴 것
