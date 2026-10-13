# 엔진 (`engine/`)

이 디렉터리는 게임 규칙을 계산하는 TypeScript 엔진이다. 공개 함수는 모두 `(상태, 데이터, 입력) → 새 상태` 꼴의 순수 함수이고, 입력 객체를 바꾸지 않는다. 화면(UI)·저장 위치·문구 번역에 의존하지 않는다. 난수는 seed 문자열과 이름 붙은 슬롯에서 해시로 뽑으므로 같은 seed·같은 데이터·같은 입력은 항상 같은 상태 열을 만든다. 수치는 데이터 팩 레코드(`loadData()`로 읽은 `DataBundle`) 또는 `src/assumed.ts`의 설계 가정 상수에서만 온다.

정본 문서: 상태 모델 [상태 스펙](../docs/superpowers/specs/2026-10-13-engine-state-design.md)(아래 "상태 §n"), 선택권 모델 [선택권 스펙](../docs/superpowers/specs/2026-10-13-agency-model-design.md)("선택권 §n"), [노동시장·뉴스 스펙](../docs/superpowers/specs/2026-10-13-labor-market-news-design.md)("노동 §n"), 설계 가정 목록 [결정 기록 0014](../docs/design/decisions/0014-assumed-probabilities.md)("0014 #n"). 약어는 [용어집](../docs/workflow.md#용어집)을 따른다.

## 1. 공개 API

진입점은 `engine/src/index.ts`다. 패키지 `main`이 없으므로 저장소 안에서 경로로 가져온다.

| 함수 | 하는 일 | 던지는 경우 |
|---|---|---|
| `createLife(config: LifeConfig, seed: string, data: DataBundle): LifeState` | 입학 전 선택 6종을 확정하고(비어 있으면 운에 맡기기, `luck` 스트림) 능력치·나이·지도교수·가족 지원을 뽑아 `stage: 'phd'`, `month: 0` 상태를 만든다(선택권 §2, 상태 §1.4) | 알 수 없는 group·track·school·funding·advisorPref, `cohortOf`가 있는데 `group`이 없음, 학과가 그 학교에 없음, 트랙이 계열에 속하지 않음, 세부전공이 트랙의 선택지가 아님, 그 학교에 트랙의 학과 단위가 없음 |
| `advanceMonth(state, data, input?: MonthInput): LifeState` | 박사과정 월 틱 한 번(아래 5절). `input.focus`로 이달 포커스, `takeExam`으로 자격시험 응시, `apply`로 경로별 지원 여부를 준다. `auto: true`면 포커스와 결정을 정책으로 정해 틱 안에서 처리한다 | `pending`이 있으면 던진다(시간 정지) |
| `advanceYear(state, data, input?: { apply? }): LifeState` | 경력 연 틱 한 번(상태 §7.2). `stage: 'retired'`이면 은퇴 연 틱(§7.3), `stage: 'end'`면 입력을 그대로 돌려준다. `auto: true`면 걸린 결정을 정책으로 바로 닫는다 | `pending`이 있으면 던진다. 단계가 `career`·`retired`·`end`가 아니면(박사과정 중이면) 던진다 |
| `decide(state, data, optionIndex: number, byPolicy = false): LifeState` | 걸린 결정의 `pending.options[optionIndex]` 효과를 적용하고 `decisions`에 기록한 뒤 `pending`을 비운다. `byPolicy`는 정책이 골랐을 때 `true` | `pending` 없음, 인덱스가 범위 밖, 고를 수 없는 선택지(휴학 누적 상한 초과, 이미 시도한 연장 신청) |
| `branch(state, data, decisionId: DecisionId): LifeState` | 그 결정 지점의 가장 마지막 스냅샷으로 돌아간다. 돌려준 상태에는 그 질문이 `pending`으로 걸려 있고 `decisions`에는 그 결정이 없다(상태 §6.3). 원래 상태는 그대로다 | 상태와 데이터의 `dataRevision`이 다름, 그 결정의 스냅샷 없음, 스냅샷에 질문이 없고 그 결정이 지금 걸려 있지도 않음 |
| `describeOptions(state, data): OptionInfo[]` | 걸린 결정의 선택지마다 `{ key, probabilityHint?: { p, basis }, unavailable? }`. 확률 힌트는 선택권 §3이 확률을 주는 선택지에만 있다 | `pending` 없음 |
| `loadData(root?)`, `get(data, id)`, `has(data, id)`, `find(data, prefix)` | 데이터 팩 적재와 레코드 조회(아래 8절). `find`는 id 접두 일치를 id 사전순으로 돌려준다 | `loadData`: `records.json` 없음, 레코드 id 중복. `get`: `record not found: <id>` |
| `toSave(state)`, `fromSave(obj)`, `SAVE_VERSION` | 저장 객체 만들기와 읽기(아래 7절) | `fromSave`: 객체가 아님, 버전 값이 잘못됨, 더 새 버전의 저장, 스냅샷 없음, 스냅샷이 상태 모양이 아님 |
| `ASSUMED` | 0014 설계 가정 상수 묶음(읽기 전용). 줄마다 `// 0014#n` 주석이 붙어 있다 | — |

타입은 `export type * from './types'`로 함께 나간다. seed 생성(`newSeed`, `cohortSeed`)과 자동 정책(`policyFocus`, `policyDecision`)도 `index.ts`에서 내보낸다.

```ts
import { loadData, createLife, advanceMonth, describeOptions, decide, branch, toSave, fromSave } from './engine/src/index';
const data = loadData();
let s = createLife({ group: '이공', track: 'computer' }, 'APHD-ABCDEFGH', data);   // 나머지 선택은 운에 맡긴다
while (!s.pending && s.stage === 'phd') s = advanceMonth(s, data, { focus: 'research' });
if (s.pending) {
  console.log(s.pending.dp, describeOptions(s, data));      // 선택지별 확률 힌트
  const a = decide(s, data, 0);                             // 첫 선택지
  const b = decide(branch(a, data, s.pending.dp), data, 1); // 같은 결정 지점에서 두 번째 선택지로 분기
  const restored = fromSave(JSON.parse(JSON.stringify(toSave(b))));
}
```

## 2. 상태 객체

`LifeState`의 필드 정의는 상태 §3이고 타입 정본은 `src/types.ts`다.

| 필드 묶음 | 내용 | 상태 스펙 |
|---|---|---|
| `version`, `engineRevision`, `dataRevision`, `seed` | 형식 버전 1, 엔진 식별자(현재 상수 `'wave4'`), 데이터 팩 해시, `APHD-` + base32 8자리 | §3.1, §5 |
| `stage`, `month`, `ageMonths`, `end` | 단계(`pre`·`phd`·`career`·`retired`·`end`), 월 카운터(0 = 2027년 3월), 나이(개월), 종료 사유와 달 | §2, §3.1 |
| `stats` | 체력·마음·역량·관계·네트워크, 각 0–100 정수 | §1, §3.1 |
| `choices` | 입학 전 선택 6종의 확정값, 파생 분류(`kedi`, `ksced`, `field`), 운에 맡긴 항목 표시 `byLuck` | §3.2 |
| `money`, `ledger` | 현금·부채·대출 한도(원 정수)와 금액마다 근거 레코드 id를 단 원장 | §3.1 |
| `phd`, `career` | 박사과정 상태(재학 개월, 휴학, 진척, 논문, 지도교수, 자금, 포커스 이력)와 경력 상태(경로, 직급, 급여, 구직) | §3.3–§3.5 |
| `news`, `decisions`, `log` | 진행 중인 가상 뉴스 효과, 결정 기록, 문구 키 기록(`creative`는 창작 문구 표시) | §3.1, 노동 §5 |
| `pending` | 걸린 결정 지점(`{ dp, month, context, options[] }`). `null`이 아니면 시간이 멈춘다 | §7.1 10번 |
| `snapshots` | 결정 지점마다 결정 직전 상태(질문 포함)와 `decisionIndex`. `branch`가 쓴다 | §6.3 |
| `auto` | 자동 진행 여부. `true`면 포커스와 결정을 정책(선택권 §4.4)으로 정한다 | §6.4 |
| `newsSeed` | 뉴스 추첨용 seed. 플레이어는 자기 seed, 동기는 플레이어 seed라 다섯 명이 같은 뉴스를 겪는다 | §6.4 |

`LifeConfig`는 입학 전 선택 `group`, `track`, `subfield`, `department`, `school`, `funding`, `advisorPref`와 `auto`, `cohortOf`를 받는다. 비워 둔 선택 항목은 운에 맡기기(선택권 §2)로 뽑는다. `auto`의 기본값은 `false`다. `cohortOf`는 동기를 만들 때 플레이어 seed를 넣는다. 이때 `group`이 필수이고 `newsSeed = cohortOf`가 된다. `createLife`는 `stage: 'pre'` 상태를 따로 내보내지 않고 선택을 확정한 뒤 바로 `stage: 'phd'`로 시작한다.

## 3. 난수 규칙

난수는 `src/rng.ts`의 `draw(seed, stream, month, slot)` 하나로만 뽑는다(상태 §6.2). 입력 문자열 `seed|stream|month|slot`을 xmur3로 해시하고 mulberry32의 첫 출력을 [0, 1) 값으로 쓴다. 정규분포는 `drawNormal`이 슬롯 `${slot}:a`·`${slot}:b` 두 개로 Box–Muller 변환을 한다. `Math.random`은 쓰지 않는다.

- 스트림: `init`(초기 능력치·나이), `luck`(운에 맡기기), `progress`(진척 잡음·막힘), `paper`(논문 질·판정·심사 기간), `exam`(자격시험·학위 심사), `hazard`(휴학·이탈·번아웃), `funding`(선발·연장), `labor`(공고·채용·승진), `news`(뉴스), `life`(은퇴 나이·노후), `policy`(자동 진행 선택).
- 슬롯 예: `stat:health`, `leave`, `dropout`, `qual:2`, `defense:1`, `p3:verdict`, `post:professor`, `apply:industry:0`, `news:type`, `focus`, `decide:funding-expiry`.
- 같은 달에 같은 슬롯 이름은 한 번만 쓴다. 같은 종류를 여러 번 뽑으면 순번을 붙인다(`apply:industry:0`, `:1`). 경로마다 공고 슬롯이 따로라 한 경로의 공고는 한 달에 하나다.

순서에 의존하는 난수열을 쓰지 않는 이유: 한 분기에서 추첨이 하나 늘어도 다른 사건의 난수가 밀리지 않는다. 그래서 `branch`로 갈라진 두 기록은 선택과 무관한 사건(뉴스, 다른 논문의 판정)에서 같은 값을 받고, 결과 차이는 선택과 그 선택이 바꾼 상태에서만 생긴다. 동기도 같은 규칙으로 플레이어와 같은 뉴스를 받는다.

`newSeed(entropy)`는 entropy 문자열에서 `APHD-` + base32 8자리 seed를 만든다(같은 entropy면 같은 seed). 시각 같은 entropy는 호출하는 쪽이 만든다. `cohortSeed(seed, k)`는 동기 k(1–4)의 seed를 `seed|cohort|k`의 해시로 만든다. 두 함수는 현재 `index.ts`가 재수출하지 않아 `src/rng.ts`에서 가져온다.

## 4. 틱 순서

박사과정 월 틱(`advanceMonth`, 상태 §7.1):

| 순서 | 처리 | 담당 모듈 |
|---|---|---|
| 1 | `month`·`ageMonths` +1, 휴학이 아니면 `enrolledMonths` +1 | `phd/tick.ts` |
| 2 | 가상 뉴스: 만료 제거, 새 뉴스 추첨, 수요 계수 | `career/news.ts` (`updateNews`) |
| 3 | 학기 경계(`month mod 6 = 0`): 등록금 청구, 장학 유지 판정, 수업 기간 종료 | `phd/money.ts` (`tuitionCharge`, `updateCoursework`), `phd/tick.ts` |
| 4 | 포커스 효과: 능력치, 진척, 논문 초고 | `phd/focus.ts`, `phd/progress.ts`, `phd/papers.ts` |
| 5 | 능력치 자연 변화 | `phd/focus.ts` (`applyDrift`) |
| 6 | 현금 흐름, 부족분 대출, 재정 위기 카운터 | `phd/money.ts` (`applyCashflow`) |
| 7 | 논문 파이프라인: 투고, 심사 시계, 판정 추첨 | `phd/papers.ts` |
| 8 | 자격시험 창, 학위 심사 | `phd/exams.ts` |
| 9 | 위험률: 휴학, 이탈, 번아웃 | `phd/hazards.ts` |
| 10 | 결정 지점 트리거. 걸리면 스냅샷을 쌓고 `pending`을 채운다 | `phd/triggers.ts` |
| 11 | 종료 확인: 학위 취득, 재학연한, 재정 파탄 | `phd/tick.ts` |
| 12 | 기록 | `phd/tick.ts` |

`pre-graduation-path`를 고른 달부터 학위 취득까지 구직 하위 단계(`career/labor.ts`의 `searchMonth`)가 월 틱 안에서 함께 돈다.

경력 연 틱(`advanceYear`, `career/tick.ts`): 월 하위 단계 12회(뉴스 → 구직 중이면 공고·지원·채용 → 월 현금 흐름) 뒤 연말 처리(`career/pay.ts`의 `yearEnd`: 나이, 근속, 호봉, 연봉 인상, 계약 만료, 창업 존속, 경력 논문)를 한다. 그 다음 은퇴 확인을 먼저 하고 결정 지점 트리거를 본다. 상태 §7.2는 트리거를 은퇴 확인 앞에 두지만, 은퇴 나이에 이른 해에 결정 지점을 열어도 효과가 없어 코드는 은퇴를 먼저 처리한다. 한 틱에 결정 지점은 하나이고 우선순위는 `pre-retirement` > `career-10y` > `career-5y`다. 은퇴 연 틱은 나이 +1과 노후 월수입 × 12를 더하고, 80세가 되면 `end.reason = 'age80'`이다(상태 §7.3). `advanceYear`는 자동 정책을 적용하지 않는다.

## 5. 결정 지점

7종의 정본 id는 결정 기록 0013 §5, 선택지와 효과는 선택권 §3, 구현은 `src/decide.ts`다.

| id | 트리거 | 선택지 | `pending.context` |
|---|---|---|---|
| `post-qualifying` | 자격시험 결과가 나온 달(합격·불합격 모두) | A–C | `{ passed: boolean }` |
| `first-paper-verdict` | 첫 투고 논문에 첫 판정이 나온 달 | A–C | `{ paperId, verdict }` |
| `funding-expiry` | 자금 기한 도달, 장학 유지 판정 실패, 재정 위기 중 먼저 오는 것 | A–D, 연장 실패 뒤 다시 열리면 B–D | `{ cause: 'until' \| 'scholarship-review' \| 'crisis', retry? }` |
| `pre-graduation-path` | 심사 준비 단계(자격시험 합격, 진척 ≥ 90, 채택 논문 ≥ 요구 편수)에 처음 들어선 달 | A–D = 학계·산업·공공·창업 | `{}` |
| `career-5y` | `degreeMonth + 60`을 지난 첫 연 틱 | A–C, 학계 비정규(박사후·강사·비정년)는 A–D | `{ route, rank?, target? }` |
| `career-10y` | `degreeMonth + 120`을 지난 첫 연 틱 | A–D | `{ route, rank?, target? }` |
| `pre-retirement` | 나이가 `retireAge − 2`가 된 연 틱 | A–C | `{ route, rank?, target? }` |

선택지의 문구 키(`options[].textKey`)는 `decision.<dp>.<letter>`다(예: `decision.career-5y.D`). 결정한 뒤 남는 기록 줄의 키는 결과 갈래가 있는 결정이면 `decision.<dp>.<갈래>.<letter>`(갈래: `pass`·`fail`·`accept`·`revise`·`reject`), 없으면 `decision.<dp>.<letter>`다.

자동 진행·동기 정책(선택권 §4.4, 0014 #46, `src/policy.ts`)은 기대 효용을 계산하지 않는다. 포커스는 체력 또는 마음 < 30이면 `rest`, 진로가 정해져 구직 중이면 `network` 0.3·`thesis` 0.7, 자격시험 합격 뒤면 `thesis` 0.5·`research` 0.2·`write` 0.2·`network` 0.1, 그 밖에는 쓰는 중인 초고가 있으면 확률 0.6으로 `write`, 아니면 `research`다(코드가 확인하는 순서). 결정은 선택지별 고정 가중치로 뽑고, `pre-graduation-path`만 선택권 §8의 진로 분포를 쓴다. 고를 수 없는 선택지는 가중치 0으로 거른다. 난수는 `policy` 스트림의 `focus`, `decide:<dp>` 슬롯이다.

## 6. 저장 형식

저장 위치와 직렬화는 UI가 맡고, 엔진은 객체 모양만 정한다(상태 §5). UI가 쓰는 localStorage 키는 `aphd.save.v1`(진행 중 1건), `aphd.archive.v1`(끝난 기록, 최대 20건, 0014 #10), `aphd.settings.v1`이다.

- `toSave(state)`는 `{ version: SAVE_VERSION, snapshot, replay: { seed, choices, decisions, focusHistory } }`를 돌려준다. `snapshot`은 빠른 불러오기용 상태 전체이고, `replay`는 결정론(상태 §6) 덕분에 상태를 다시 만들 수 있는 입력이다.
- `fromSave(obj)`는 저장 객체를 `LifeState`로 읽는다. 옛 버전이면 마이그레이션을 차례로 적용하고, 더 새 버전이면 던진다. `dataRevision`은 확인하지 않는다. 데이터가 바뀐 저장도 이어서 진행할 수 있고, 같은 조건의 재계산이 필요한 `branch`만 막는다(상태 §5.3).
- 마이그레이션 규칙(상태 §5.2): 형식이 바뀌면 `SAVE_VERSION`을 1 올리고 `src/save.ts`의 `migrations`에 `v(n) → v(n+1)` 함수를 하나 더한다. 함수는 입력을 바꾸지 않는다. 불러올 때 중간 단계를 건너뛰지 않는다. 필드를 지울 때는 한 버전 동안 무시 필드로 남긴다. 마이그레이션마다 고정 예시 테스트를 하나 둔다. 현재 v1이라 `migrations`는 비어 있다.

## 7. 데이터와 신뢰도

`loadData(root?)`는 저장소 루트(`package.json` 위치)의 `data/packs/*/records.json`과 `data/packs/narratives/**/*.json`의 서사 배열을 읽어 `DataBundle { records, dataRevision, root, narratives }`를 만든다. 엔진 모듈은 이 번들만 본다. `get`이 돌려주는 `DataValue`는 `{ value, confidence, id, unit }`이고, 레코드에서 온 값은 모두 `confidence`(`verified`·`indexed`·`assumed`)를 함께 지닌다. 화면은 이 값으로 근거 수준을 표시한다.

`dataRevision`은 `data/packs/*/records.json`, `data/packs/narratives/**/*.json`, `data/packs/taxonomy/mapping-tracks.json`의 내용을 줄바꿈을 LF로 맞춘 뒤 파일마다 SHA-256 해시하고, 경로 사전순으로 이어 붙여 다시 SHA-256 한 값의 앞 16자리다.

데이터 접근 모듈(`src/data/`):

- `load.ts`: 적재, `get`·`has`·`find`.
- `departments.ts`: 학과 레코드 note 파싱, 묶음과 고유 학과 단위, 엔진 키, 트랙 가중치.
- `taxonomy.ts`: 트랙 26종의 계열·분야·교육통계 분류 대응과 세부전공 선택지.
- `tuition.ts`: 등록금·입학금·감면율.
- `funding.ts`: 장학·과제·조교 장려금 레코드 선택과 월 환산.
- `salaries.ts`: 교원 급여 규칙, 호봉표, 출연연 보수, 강사 연 수입, 산업 급여.
- `statistics.ts`: 휴학률·탈락률·학위 기간·취업률·정규직 비율·박사후 재원·교원 시장.
- `venues.ts`: 트랙별 분야군, 투고처 계층 T1–T4와 채택률, 분야별 심사 기간.

## 8. npm 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm test` | `node --test tests/*.test.mjs`(스크립트 테스트) 뒤 `vitest run`(엔진 테스트) |
| `npm run test:engine` | `engine/test/**/*.test.ts`만 Vitest로 실행 |
| `npm run coverage` | Vitest 커버리지 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate` | 데이터 팩 검사(`scripts/validate-data.mjs`) |
| `npm run calibrate -- --seeds 1000` | seed N개 모의실험으로 보정 목표와 비교(`engine/sim/calibrate.ts`, Task 11) |
| `npm run check-assumed` | 소스의 `0014#n` 주석을 0014 번호 1–121과 대조하고, 소스에 없는 번호는 아래 절에 사유 행이 있는지 확인 |

## 엔진 밖 0014 번호

현재 소스에 인용되지 않은 번호 없음(check-assumed 기준). 0014 #1–#121이 모두 `engine/src`에 `0014#n` 주석으로 인용되어 있다. 보관 수 20건(0014 #10, `ASSUMED.ARCHIVE_MAX`)처럼 값을 실제로 쓰는 곳이 UI인 상수도 `assumed.ts`에 두어 한 곳에서 관리한다. 앞으로 소스에서 빠지는 번호가 생기면 이 절에 `| 번호 | 항목 | 사유 |` 표를 두고, 사유 칸에 "UI 전용" 또는 "엔진 밖"을 적는다.

Provenance: 91_Handoffs/_HANDOFF-2026-10-13.md (APD)
