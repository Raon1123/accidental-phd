# Wave 4 엔진 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wave 3 스펙 세 편을 TypeScript 순수 함수 엔진(`engine/`)으로 구현하고, Vitest 테스트·v3.5 oracle 스냅샷·보정 하네스·이관 항목 16건을 한 PR(`wave-4/engine`)로 올린다.

**Architecture:** 엔진은 `(state, data, input) → state` 꼴의 순수 함수 다섯 개(`createLife`, `advanceMonth`, `advanceYear`, `decide`, `branch`)를 내보낸다. 난수는 이름 붙은 슬롯 해시(`draw(seed, stream, month, slot)`)라 분기·동기·재생이 결정론적이다. 데이터 팩은 `loadData()`가 Node `fs`로 읽어 `DataBundle`(레코드 id → 값·confidence)로 만들고, 엔진 모듈은 그 번들만 본다. 설계 가정 119건은 `engine/src/assumed.ts` 한 파일에 `// 0014#n` 주석과 함께 둔다.

**Tech Stack:** TypeScript 5(ES2022 모듈, `strict`), Vitest 3, Node 20 (CI). 기존 `scripts/*.mjs`·`tests/*.test.mjs`(node:test)는 그대로 둔다. devDependency는 `typescript`, `vitest`, `@types/node`, `tsx`(보정 CLI 실행용)만.

**Spec:**
- 상태 모델: `docs/superpowers/specs/2026-10-13-engine-state-design.md` (아래 "상태 §n")
- 선택권 모델: `docs/superpowers/specs/2026-10-13-agency-model-design.md` ("선택권 §n")
- 노동시장·뉴스: `docs/superpowers/specs/2026-10-13-labor-market-news-design.md` ("노동 §n")
- 설계 가정 목록: `docs/design/decisions/0014-assumed-probabilities.md` ("0014 #n")
- v3.5 비교표: `docs/oracle/v35-comparison.md` (29행), v3.5 공식: `docs/oracle/v35-recon.md`
- 체크리스트: `docs/waves/wave-04-engine-impl.md` (본 8 + 이관 16)
- 협업 계약: `docs/workflow.md`

## Global Constraints

- 모든 수치 상수는 레코드 id(`data.get('…')`) 또는 `assumed.ts`의 상수(`// 0014#n` 주석)에서 온다. 소스에 맨 숫자를 새로 적지 않는다. (0014 §결정 "번호는 Wave 4 코드 상수 주석에서 `0014#n`으로 인용한다")
- 확률은 전부 `odds(p0, terms, lo, hi)` 또는 `hazardMonth(r)`로 계산한다. 기본 경계 `lo = 0.02`, `hi = 0.95` (0014 #9). 결정적 문턱으로 결과를 정하지 않는다(결정 기록 0005).
- 난수는 `draw(seed, stream, month, slot)`만 쓴다. `Math.random` 금지. 같은 달·같은 슬롯 이름은 한 번만 쓴다(상태 §6.2). 스트림 이름은 `init|luck|progress|paper|exam|hazard|funding|labor|news|life|policy`.
- 금액 단위는 원(krw) 정수. 능력치는 0–100 정수(갱신 뒤 `clamp`·반올림). `month` 0 = 2027년 3월.
- 엔진 함수는 입력 객체를 바꾸지 않는다(새 객체 반환). `structuredClone` 사용 가능(Node 20).
- 파일 소유: 각 Task 는 자기 `Files` 에 적힌 파일만 만들거나 고친다. `assumed.ts`·`types.ts` 는 Task 1 뒤 읽기 전용이다. 고쳐야 하면 작업을 멈추고 이유를 보고한다.
- 테스트 위치: `engine/test/<module>.test.ts` (Vitest). `tests/*.test.mjs` 는 node:test 전용.
- `npm test` = `node --test && vitest run`. `npm run validate` 통과. 둘 다 Node 20 CI 에서 돈다.
- 약어는 첫 등장에 풀어쓴다(`docs/workflow.md` 용어집). 한국어 식별자 금지, 주석은 한국어 가능.
- 새 출처는 `data/sources/registry.json` 이 아니라 `data/sources/registry.d/<issue>-<topic>.json` 에 쓴다(결정 기록 0012).

## Review Focus

1. **결정 지점이 걸린 상태에서 `advanceMonth` 호출**: 시간이 멈춰야 한다. `pending` 이 있으면 `advanceMonth`·`advanceYear` 는 예외를 던진다. → Task 7 테스트 `throws while pending`.
2. **휴학 중 틱**: 등록금·장려금 0, 진척 정지, 체력·마음 +3, `enrolledMonths` 증가 없음. 휴학 상한 36개월 도달 시 복학 강제. → Task 6 테스트 `leave month`.
3. **현금 음수 → 대출 → 한도 초과 3개월**: `funding-expiry` 강제, 다시 3개월이면 `end.reason = financial`. 부채는 절대 음수가 아니고 현금은 대출 뒤 0. → Task 5 테스트 `financial crisis sequence`.
4. **같은 달에 같은 경로 공고가 둘 이상 뜨지 않는다**; 여러 경로 동시 구직은 경로마다 슬롯이 다르다(`post:professor`, `post:industry`). → Task 8 테스트 `one posting per route per month`.
5. **`branch` 뒤 분기와 원본이 선택과 무관한 사건(뉴스, 다른 논문 판정)에서 같은 난수를 받는다**. → Task 9 테스트 `news identical across branches`.

---

## 파일 구조

```
package.json                     devDeps, scripts (test/validate/build/calibrate/check-assumed)
package-lock.json                커밋
tsconfig.json                    strict, ES2022, moduleResolution bundler, include engine/
vitest.config.ts                 include: ['engine/test/**/*.test.ts'], coverage thresholds
.github/workflows/test.yml       npm ci 추가
engine/
  README.md                      API 문서, 0014 번호 중 엔진에 없는 것의 사유
  src/
    index.ts                     public API 재수출
    types.ts                     상태 객체 타입 (상태 §3)
    rng.ts                       xmur3, mulberry32, draw, drawNormal, newSeed, cohortSeed
    odds.ts                      clamp, z, sigmoid, logit, odds, hazardMonth
    assumed.ts                   0014 #1–#119 상수
    data/
      load.ts                    loadData, DataBundle, get, dataRevision
      departments.ts             레코드 파싱, 묶음 22, 단위 460, 엔진 키, 트랙 가중치
      tuition.ts                 등록금·입학금·감면 (선택권 §5.1), ewha 중앙값
      funding.ts                 장학·장려금 레코드 선택 (선택권 §5.2)
      salaries.ts                교원 규칙 (a)/(b), 호봉표, 출연연, 강사 시급 (선택권 §9.1)
      statistics.ts              휴학·탈락·학위기간·취업률·정규직·박사후재원·교원 스톡 (선택권 §4.5·§8, 노동 §2)
      venues.ts                  트랙 → 분야군, 계층 T1–T4, 학회 채택률 (선택권 §6.3·§6.4)
      taxonomy.ts                트랙 26, group/field/kedi/ksced 대응 (선택권 §1), 소분류 선택지
    pre/
      createLife.ts              입학 전 선택 6종 + 운 + 초기화 (선택권 §2, 상태 §1.4·§3)
    phd/
      focus.ts                   포커스 효과 (선택권 §4.1), 자연 변화 (상태 §1.5)
      progress.ts                Δproject, g_k (선택권 §4.2)
      money.ts                   현금 흐름·대출·재정 위기 (선택권 §5.3–§5.5)
      papers.ts                  초고·투고·판정 (선택권 §6)
      exams.ts                   자격시험·학위 심사 (선택권 §7)
      hazards.ts                 휴학·이탈·번아웃 (선택권 §4.5)
      triggers.ts                결정 지점 트리거 (선택권 §3)
      tick.ts                    advanceMonth 순서 (상태 §7.1)
    career/
      labor.ts                   B_k, h, π0, 공고·채용 (노동 §2–§4)
      news.ts                    수요 계수·뉴스 17종 (노동 §5)
      pay.ts                     경로별 급여·승진·계약·은퇴·노후 (선택권 §9)
      path.ts                    졸업 직전 진로 분포 (선택권 §8)
      tick.ts                    advanceYear (상태 §7.2·§7.3)
    decide.ts                    결정 지점 7종 선택지·효과 (선택권 §3)
    policy.ts                    자동 진행·동기 정책 (선택권 §4.4)
    branch.ts                    스냅샷 분기 (상태 §6.3)
    save.ts                      저장 객체·마이그레이션 (상태 §5)
  test/*.test.ts                 모듈별 Vitest
  test/oracle/v35.ts             v3.5 공식(테스트 전용 참조 구현)
  test/oracle/v35-comparison.test.ts   29행 케이스
  sim/calibrate.ts               seed N 모의실험 CLI
docs/oracle/calibration-wave4.md 보정 결과표
scripts/check-assumed.mjs        0014#n 주석 검사
scripts/md-table.mjs             절 단위 표 파서
scripts/compare-notes.mjs        departments note 문장 단위 비교 (d00ba5c 대비)
scripts/validate-data.mjs        레코드 id 존재 검사 추가
tests/md-table.test.mjs, tests/validate-data.test.mjs(추가 케이스)
```

## 공유 인터페이스 (모든 Task 가 따른다)

```ts
// engine/src/types.ts  (Task 1 이 만든다 — 여기 적힌 이름이 정본)
export type Group = '인문사회' | '이공';
export type Field = 'cs' | 'math' | 'bio' | 'engineering' | 'social' | 'humanities';
export type Kedi = 'humanities' | 'social' | 'natural' | 'engineering';
export type Ksced = 'ict' | 'natural-math' | 'engineering' | 'social' | 'business-law' | 'arts-humanities';
export type Stage = 'pre' | 'phd' | 'career' | 'retired' | 'end';
export type Focus = 'research' | 'write' | 'network' | 'work' | 'rest' | 'thesis';
export type FundingRoute = 'scholarship' | 'project' | 'self';
export type AdvisorType = 'support' | 'strict' | 'free' | 'connected';
export type Path = 'academia' | 'industry' | 'public' | 'startup';
export type Route = 'professor' | 'nontenure' | 'lecturer' | 'postdoc' | 'institute' | 'public' | 'industry' | 'startup' | 'bridge' | 'none';
export type Tier = 'T1' | 'T2' | 'T3' | 'T4';
export type DecisionId = 'post-qualifying' | 'first-paper-verdict' | 'funding-expiry' | 'pre-graduation-path' | 'career-5y' | 'career-10y' | 'pre-retirement';
export type EndReason = 'degree' | 'dropout' | 'residence' | 'financial' | 'exit-master' | 'age80';
export type Confidence = 'verified' | 'indexed' | 'assumed';

export interface Stats { health: number; mind: number; skill: number; relation: number; network: number }
export interface Choices {
  group: Group; track: string; subfield: string; department: string; departmentRecord: string; school: string;
  funding: FundingRoute; advisorPref: AdvisorType; kedi: Kedi; ksced: Ksced; field: Field;
  byLuck: { group: boolean; track: boolean; subfield: boolean; department: boolean; funding: boolean; advisorPref: boolean };
}
export interface Paper { id: string; status: 'draft' | 'submitted' | 'revision' | 'accepted' | 'rejected' | 'dropped'; writing: number; quality: number; tier?: Tier; venueId?: string; attempts: number; dueMonth?: number; submittedMonth?: number; logitBonus: number }
export interface FundingState { route: FundingRoute; monthly: number; tuitionWaiver: number; until: number; dutyHours: number; recordIds: string[] }
export interface PhdState {
  enrolledMonths: number; leave: { active: boolean; until: number; totalMonths: number }; coursework: boolean;
  project: number; blocked: boolean; qualified: boolean; qualAttempts: number; defenseAttempts: number;
  papers: Paper[]; requiredPapers: number; advisor: { type: AdvisorType; support: number; rigor: number; network: number };
  fundingState: FundingState; focus: Focus; focusHistory: { from: number; focus: Focus }[]; path?: Path;
  crisisMonths: number; postCrisisMonths: number; familySupport: number; nextDefenseMonth?: number; graduationMonth?: number;
  statCarry: Stats;   // 능력치의 소수 변화 누적분(stats 는 정수). |carry| ≥ 1 이면 stats 로 옮긴다
}
export interface CareerState {
  degreeMonth: number; degree: 'phd' | 'master-exit' | 'none'; route: Route; rank?: string;
  employer?: { kind: 'university' | 'institute' | 'government' | 'company' | 'self'; schoolId?: string; instituteId?: string; national?: boolean };
  annualPay: number; step?: number; yearsInRoute: number; workYears: number; academicMonths: number;
  searching?: { routes: Route[]; since: number; penalty: number }; retireAge?: number; pensionMonthly?: number;
  contractUntil?: number; paperScore: number; careerPapers: number; postRetireResearchUntil?: number;
}
export interface NewsEffect { id: string; type: string; startMonth: number; untilMonth: number; effect: number; target: { kind: 'group' | 'kedi' | 'track' | 'nrf2' | 'all'; values: string[] }; routes: Route[] }
export interface PendingDecision { dp: DecisionId; month: number; context: Record<string, unknown>; options: { key: string; textKey: string }[] }
export interface Snapshot { dp: DecisionId; month: number; decisionIndex: number; state: LifeState }
export interface LifeState {
  version: 1; engineRevision: string; dataRevision: string; seed: string; stage: Stage; month: number; ageMonths: number;
  stats: Stats; choices: Choices; money: { cash: number; debt: number; loanLimit: number };
  ledger: { month: number; kind: string; amount: number; recordId?: string }[];
  news: NewsEffect[]; decisions: { dp: DecisionId; month: number; option: string; byPolicy: boolean }[];
  log: { month: number; textKey: string; tags: string[]; creative: boolean }[];
  phd?: PhdState; career?: CareerState; end?: { reason: EndReason; month: number };
  pending: PendingDecision | null; snapshots: Snapshot[]; auto: boolean;
  newsSeed: string;   // 뉴스 추첨에 쓰는 seed. 플레이어는 자기 seed, 동기(상태 §6.4)는 플레이어 seed — 그래서 다섯 명이 같은 뉴스를 겪는다
}
export interface LifeConfig {
  group?: Group; track?: string; subfield?: string; department?: string; school?: string; funding?: FundingRoute; advisorPref?: AdvisorType;
  // 비어 있는 항목은 "운에 맡기기" (선택권 §2)
  auto?: boolean;  // 자동 진행(동기 정책) — 기본 false
  cohortOf?: string;  // 동기(상태 §6.4)일 때 플레이어 seed. 주어지면 group 은 플레이어와 같아야 하고 newsSeed = cohortOf
}
export interface MonthInput { focus?: Focus; takeExam?: boolean; apply?: Partial<Record<Route, boolean>> }
```

```ts
// engine/src/data/load.ts
export interface DataRecord { id: string; value: number; unit: string; confidence: Confidence; note: string; source_id: string; year: number }
export interface DataValue { value: number; confidence: Confidence; id: string; unit: string }
export interface DataBundle { records: Map<string, DataRecord>; dataRevision: string; root: string; narratives: Map<string, { id: string; track: string; stage: string; confidence: Confidence }> }
export function loadData(root?: string): DataBundle           // 기본 root = repo 루트(package.json 위치)
export function get(data: DataBundle, id: string): DataValue  // 없으면 throw new Error(`record not found: ${id}`)
export function has(data: DataBundle, id: string): boolean
export function find(data: DataBundle, prefix: string): DataRecord[]   // id.startsWith(prefix), id 사전순
```

```ts
// engine/src/rng.ts
export function xmur3(str: string): () => number
export function mulberry32(a: number): () => number
export function draw(seed: string, stream: Stream, month: number, slot: string): number   // [0,1)
export function drawNormal(seed: string, stream: Stream, month: number, slot: string): number  // N(0,1), 슬롯 `${slot}:a`·`:b`
export function newSeed(entropy: string): string          // 'APHD-' + base32 8자리
export function cohortSeed(seed: string, k: 1|2|3|4): string

// engine/src/odds.ts
export function clamp(x: number, lo: number, hi: number): number
export function z(x: number): number                       // (x − 50) / 50
export function odds(p0: number, terms: number, lo = ASSUMED.ODDS_LO, hi = ASSUMED.ODDS_HI): number
export function hazardMonth(rYear: number): number
```

```ts
// engine/src/index.ts  (공개 API)
export function createLife(config: LifeConfig, seed: string, data: DataBundle): LifeState
export function advanceMonth(state: LifeState, data: DataBundle, input?: MonthInput): LifeState
export function advanceYear(state: LifeState, data: DataBundle, input?: { apply?: Partial<Record<Route, boolean>> }): LifeState
export function decide(state: LifeState, data: DataBundle, optionIndex: number): LifeState
export function branch(state: LifeState, data: DataBundle, decisionId: DecisionId): LifeState
export function describeOptions(state: LifeState, data: DataBundle): { key: string; probabilityHint?: { p: number; basis: string } }[]
export { loadData, get, has, find } from './data/load'
export { ASSUMED } from './assumed'
export { toSave, fromSave, SAVE_VERSION } from './save'
```

---

### Task 0: 머지 전 이관 3건의 완료 조건 검증과 문서 정리 (main thread)

**Files:**
- Create: `scripts/compare-notes.mjs`
- Modify: `docs/superpowers/specs/2026-10-13-agency-model-design.md` §9.1 규칙 (a), §5.1 ewha 비율 표, §12 행
- Modify: `docs/oracle/v35-comparison.md` "월급: 교수" 행
- Modify: `docs/waves/wave-04-engine-impl.md` 이관 1~3 체크 + 커밋 해시
- Modify: `docs/design/decisions/0013-*.md`, `0014-*.md` 상태 줄 → `승인됨 · 2026-10-13 (PR #36 머지, 결정 기록 0010 §3 (b))`
- Modify: 스펙 세 편 머리 "초안 … 감사 전" → "감사 반영 · 2026-10-13 (PR #36 머지로 승인)"
- Modify: `docs/waves/wave-03-engine-spec.md` `same_unit_as` 체크 메모(45건 id 치환 완료, 커밋 72ad355·f6e713f·50cda9c)
- Modify: `docs/waves/STATUS.md` Wave 3 → 완료, Wave 4 → 진행 중

- [ ] **Step 1: 문장 단위 비교 스크립트**

```js
#!/usr/bin/env node
// departments note를 기준 커밋과 비교해, 바꾸려던 마커(same_unit_as) 밖에서 사라진 문장을 센다.
// Usage: node scripts/compare-notes.mjs <base-commit> [--exclude id,id,...]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [base, ...rest] = process.argv.slice(2);
const exclude = new Set((rest.find(a => a.startsWith('--exclude='))?.slice(10) ?? '').split(',').filter(Boolean));
const FILE = 'data/packs/departments/records.json';
const before = JSON.parse(execFileSync('git', ['show', `${base}:${FILE}`], { encoding: 'utf8' }));
const after = JSON.parse(readFileSync(FILE, 'utf8'));
const split = s => (s ?? '').split(/\s*·\s*|(?<=[.。])\s+/).map(t => t.trim()).filter(Boolean);
const isMarker = t => /same_unit_as|대표 departments-/.test(t);
const afterById = new Map(after.map(r => [r.id, r]));
let lost = 0, changed = 0;
for (const r of before) {
  const a = afterById.get(r.id); if (!a) { console.log(`missing record ${r.id}`); lost++; continue; }
  const bs = split(r.note), as = new Set(split(a.note));
  const gone = bs.filter(t => !as.has(t) && !isMarker(t));
  if (gone.length) { changed++; if (!exclude.has(r.id)) { lost += gone.length; console.log(`${r.id}: ${gone.length} lost outside marker: ${gone.join(' | ')}`); } }
}
console.log(`records ${before.length} → ${after.length}; changed ${changed}; lost sentences outside marker (excluding ${exclude.size}): ${lost}`);
process.exit(lost ? 1 : 0);
```

- [ ] **Step 2: 실행** `node scripts/compare-notes.mjs d00ba5c --exclude=departments-kaist-environmental,departments-gist-electrical,departments-dgist-computer` → 기대 `lost … : 0`, exit 0. 출력을 PR 본문용으로 보관.
- [ ] **Step 3: 수집자 메모 수** `node -e "..."` 로 note에 "수집자 메모"가 있는 레코드 100건 확인(0011·README 와 같음).
- [ ] **Step 4: 규칙 (a) 절 재작성**: 선택권 §9.1 "규칙 (a)" 를 감사 후 방식(교수 = `salaries-faculty-private-professor-mean`, 부·조교수 = 교수 × 2017 사립 직급 비 7,466/9,631·4,918/9,631; 국립은 규칙 (b))으로 바꾸고 폐기된 공식·표·확인 메모(13,137.1·10,183.9·6,708.4)를 지운다. `salaries-faculty-all-fulltime-mean` 은 규칙 (a) 입력에서 빠지므로 §12 행과 비교표 "월급: 교수" 근거 열에서도 뺀다(0014 #87 "쓰이는 곳"과 일치). §5.1 ewha 비율 계산 표는 "감사 전 계산(참고)" 한 줄로 줄이거나 지운다.
- [ ] **Step 5: 검사** `grep -c "13,137.1\|10,183.9\|6,708.4" docs/superpowers/specs/2026-10-13-agency-model-design.md docs/oracle/v35-comparison.md` → 0. `grep -c "감사 전" docs/oracle/v35-comparison.md` → 0. `grep -c "0013 §3 규칙을 그대로" …agency…` → 0.
- [ ] **Step 6: 상태 줄·체크박스·STATUS 갱신**, `npm run validate` 통과, 커밋 `docs(wave-4): verify three pre-merge carry-overs; approve 0013/0014; spec headers`.

### Task 1: 스캐폴드 — TypeScript·Vitest·CI, rng, odds, types, assumed

**Files:**
- Create: `tsconfig.json`, `vitest.config.ts`, `engine/src/types.ts`, `engine/src/rng.ts`, `engine/src/odds.ts`, `engine/src/assumed.ts`, `engine/test/rng.test.ts`, `engine/test/odds.test.ts`, `engine/test/assumed.test.ts`
- Modify: `package.json` (devDeps, scripts), `.github/workflows/test.yml` (`npm ci`), `.gitignore` (`coverage/`, `dist/`)

**Interfaces:** Produces 위 "공유 인터페이스"의 `types.ts`, `rng.ts`, `odds.ts`, `ASSUMED`.

- [ ] **Step 1: package.json**

```json
{
  "name": "accidental-phd", "private": true, "type": "module", "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test && vitest run",
    "test:engine": "vitest run",
    "coverage": "vitest run --coverage",
    "validate": "node scripts/validate-data.mjs",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "calibrate": "tsx engine/sim/calibrate.ts",
    "check-assumed": "node scripts/check-assumed.mjs"
  },
  "devDependencies": { "@types/node": "^20.14.0", "@vitest/coverage-v8": "^3.2.0", "tsx": "^4.19.0", "typescript": "^5.6.0", "vitest": "^3.2.0" }
}
```

`npm install` 후 `package-lock.json` 커밋. `.github/workflows/test.yml` 의 `- run: npm test` 앞에 `- run: npm ci` 를 넣는다(validate-data.yml 은 의존성이 없으므로 그대로).

- [ ] **Step 2: tsconfig / vitest.config**

```json
{ "compilerOptions": { "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "strict": true, "noUncheckedIndexedAccess": true, "types": ["node"], "skipLibCheck": true, "noEmit": true }, "include": ["engine/**/*.ts", "vitest.config.ts"] }
```
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['engine/test/**/*.test.ts'], coverage: { provider: 'v8', include: ['engine/src/**'], thresholds: { lines: 90, functions: 90 } } } });
```

- [ ] **Step 3: rng 실패 테스트** (`engine/test/rng.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { draw, drawNormal, newSeed, cohortSeed } from '../src/rng';
describe('draw', () => {
  it('is deterministic and in [0,1)', () => {
    const a = draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict');
    expect(a).toBe(draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict'));
    expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(1);
  });
  it('differs by slot, month, stream, seed', () => {
    const base = draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict');
    expect(draw('APHD-AAAAAAAA', 'paper', 3, 'p2:verdict')).not.toBe(base);
    expect(draw('APHD-AAAAAAAA', 'paper', 4, 'p1:verdict')).not.toBe(base);
    expect(draw('APHD-AAAAAAAA', 'exam', 3, 'p1:verdict')).not.toBe(base);
    expect(draw('APHD-BBBBBBBB', 'paper', 3, 'p1:verdict')).not.toBe(base);
  });
  it('drawNormal has mean≈0 sd≈1 over 2000 slots', () => {
    const xs = Array.from({ length: 2000 }, (_, i) => drawNormal('APHD-AAAAAAAA', 'init', 0, `n${i}`));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    expect(Math.abs(m)).toBeLessThan(0.08); expect(Math.abs(sd - 1)).toBeLessThan(0.08);
  });
  it('newSeed matches APHD-[A-Z2-7]{8}; cohortSeed is stable', () => {
    expect(newSeed('x')).toMatch(/^APHD-[A-Z2-7]{8}$/);
    expect(cohortSeed('APHD-AAAAAAAA', 1)).toBe(cohortSeed('APHD-AAAAAAAA', 1));
    expect(cohortSeed('APHD-AAAAAAAA', 1)).not.toBe(cohortSeed('APHD-AAAAAAAA', 2));
  });
});
```

- [ ] **Step 4: 실행해 실패 확인** `npx vitest run engine/test/rng.test.ts` → 모듈 없음으로 실패.
- [ ] **Step 5: rng 구현** — xmur3·mulberry32 는 공개 참조 구현(bryc). `draw` = `mulberry32(xmur3(`${seed}|${stream}|${month}|${slot}`)())()`. `drawNormal` = Box–Muller(`u1 = max(draw(..,`${slot}:a`), 1e-12)`, `u2 = draw(..,`${slot}:b`)`). `newSeed` = `'APHD-' + base32(xmur3(entropy)())` 8자, 알파벳 `A–Z2–7`. `cohortSeed(seed,k)` = `'APHD-' + base32(xmur3(`${seed}|cohort|${k}`)())` (상태 §6.4).
- [ ] **Step 6: odds 테스트·구현** — 테스트: `odds(0.7, 0)` = 0.7(±1e-12); `odds(0.7, +10)` = 0.95(상한), `odds(0.7, −10)` = 0.02(하한); `odds(0.5, 0, 0.1, 0.6)` = 0.5; `hazardMonth(0.188)` ≈ 0.01720(±1e-4, 선택권 §4.5 표); `hazardMonth(0)` = 0; `z(50)` = 0, `z(0)` = −1, `z(100)` = 1.
- [ ] **Step 7: types.ts** — 위 공유 인터페이스를 그대로 옮긴다(이름 변경 금지).
- [ ] **Step 8: assumed.ts** — 0014 표 119행 전부. 형식:

```ts
/** 결정 기록 0014 설계 가정. 번호 주석 `0014#n` 은 scripts/check-assumed.mjs 가 센다. 값을 바꾸면 0014 를 함께 고친다. */
export const ASSUMED = {
  INIT_STAT_MEAN: 50, INIT_STAT_SD: 8, INIT_STAT_MIN: 30, INIT_STAT_MAX: 70,            // 0014#1
  HEALTH_DRIFT: -0.5, MIND_REVERT: 0.02,                                              // 0014#2
  ENTRY_AGE_DIST: { 25: 0.15, 26: 0.20, 27: 0.20, 28: 0.15, 29: 0.10, 30: 0.05, 31: 0.04, 32: 0.03, 33: 0.03, 34: 0.02, 35: 0.03 }, // 0014#3
  RESIDENCE_MONTHS: 96, RESIDENCE_EXTENSION: 12,                                       // 0014#4
  LEAVE_CAP_MONTHS: 36,                                                                // 0014#5
  COURSEWORK_MONTHS: 24,                                                               // 0014#6
  END_AGE: 80,                                                                         // 0014#7
  INIT_CASH: 5_000_000,                                                                // 0014#8
  ODDS_LO: 0.02, ODDS_HI: 0.95,                                                        // 0014#9
  ARCHIVE_MAX: 20,                                                                     // 0014#10
  // … #11–#119 같은 방식. 표 모양 항목(#3, #16, #18, #39, #69, #94, #114, #115, #119)은 객체·배열 상수.
} as const;
```
   규칙: 한 번호당 주석 한 개 이상, 번호 1–119 전부 등장, 범위 밖 번호 없음. 뉴스 17종(#119)은 `NEWS_TYPES: NewsType[]` 배열(id, target kind/values, routes, effect [lo,hi], months [lo,hi], weight) 로 노동 §5.3 표를 그대로 옮긴다. 포커스 표(#39)는 `FOCUS: Record<Focus, {f, health, mind, skill, relation, network, cash}>`.
- [ ] **Step 9: assumed 테스트** — `engine/test/assumed.test.ts`: 소스 텍스트를 읽어 `/0014#(\d+)/g` 로 번호 집합을 만들고 1–119 가 전부 있고 범위 밖이 없음을 단언. `ASSUMED.NEWS_TYPES.length === 17`, 가중치 합 67, 모든 효과 범위가 [−0.30, 0.30] 안, 기간 3–12.
- [ ] **Step 10: `npm test` 통과, `npm run typecheck` 통과, 커밋** `feat(engine): scaffold TypeScript+Vitest, rng/odds, assumed constants 0014#1-119`.

### Task 2: 데이터 적재기와 학과 데이터

**Files:**
- Create: `engine/src/data/load.ts`, `engine/src/data/departments.ts`, `engine/src/data/taxonomy.ts`, `engine/test/load.test.ts`, `engine/test/departments.test.ts`, `engine/test/taxonomy.test.ts`

**Interfaces:**
- Consumes: `types.ts`.
- Produces:

```ts
// departments.ts
export interface DeptRecord { id: string; school: string; slug: string; name: string; field: Field; track: string; nrf: string; kedi?: string; confidence: Confidence; sameUnitAs: string[]; representative: string | null; bundle: number | null; numbered: boolean; noAdmission: boolean }
export interface DeptIndex { records: Map<string, DeptRecord>; bundles: { n: number; members: string[]; representative: string }[]; unitKeys: Map<string, string>; recordKeys: Map<string, string>; units: string[] /* 460 unit keys */ }
export function indexDepartments(data: DataBundle): DeptIndex
export function unitKey(rec: DeptRecord, idx: DeptIndex): string          // 선택권 §11: `<school>/<unit_slug>`
export function recordKey(rec: DeptRecord, idx: DeptIndex): string        // 묶음 구성원은 `<대표 단위 키>@<track>`
export function trackWeights(idx: DeptIndex): Record<string, number>     // 선택권 §2.2 표 (ai 30.83 …), 묶음은 1/k
export function unitsForTrack(idx: DeptIndex, track: string): string[]    // 대표 레코드 id 목록(묶음은 한 번), id 사전순
// taxonomy.ts
export const TRACKS: readonly string[]  // mapping-tracks.json primary 26
export function groupOf(track: string): Group
export function fieldOf(track: string): Field          // 선택권 §1 "game field 키"; bio = life_science·neuroscience·systems_biology·bioengineering
export function kediOf(track: string): Kedi
export function kscedOf(track: string): Ksced
export function subfieldsOf(data: DataBundle, track: string): string[]   // 선택권 §2.3
export function tracksOf(group: Group): string[]
export const NUMBERED_SLUGS: Record<string, string>  // 선택권 §11 표 87행 (record id → unit_slug)
```

- [ ] **Step 1: load 테스트** — `loadData()` 가 레코드 수 206+490+237+644+146+1040 = 2763 을 담는다(`data.records.size`); `get(data,'salaries-stipend-bk21-phd-min')` → `{value:1600000, confidence:'verified', unit:'krw'}`; `get(data,'nope')` throws `/record not found/`; `dataRevision` 은 같은 입력에서 같고 16자리 hex; `find(data,'statistics-postdoc-funder-')` 길이 6. 서사 팩: `data.narratives.size` ≥ 120 (`data/packs/narratives/{humanities-social,stem}/**/*.json` 을 재귀로 읽고 `id` 가 `nar-` 로 시작하는 객체).
- [ ] **Step 2: 실패 확인 후 구현** — `loadData` 는 `data/packs/*/records.json` 을 읽고(`taxonomy/records.json` 포함), `dataRevision` = 읽은 파일 내용 각각의 sha256 을 파일명 사전순으로 이어 다시 sha256 한 앞 16자(`node:crypto`). `root` 기본값은 `import.meta.url` 에서 `package.json` 을 위로 찾는다.
- [ ] **Step 3: departments 테스트 (이관 항목 "same_unit_as 한 번 세기"·"학과 엔진 키" 완료 조건을 그대로 단언)**

```ts
it('bundles 22, members 45, units 460 of 483 department records', () => {
  const idx = indexDepartments(data);
  expect(idx.records.size).toBe(483);            // 490 − 7 (`-tuition`)
  expect(idx.bundles.length).toBe(22);
  expect(idx.bundles.reduce((s, b) => s + b.members.length, 0)).toBe(45);
  expect(idx.units.length).toBe(460);
});
it('representatives match agency spec §10 (incl. uos 17, jnu 22)', () => {
  const rep = (id: string) => idx.bundles.find(b => b.members.includes(id))!.representative;
  expect(rep('departments-uos-computer-2')).toBe('departments-uos-electrical');
  expect(rep('departments-jnu-energy-2')).toBe('departments-jnu-environmental');
  expect(rep('departments-pusan-computer')).toBe('departments-pusan-ai');
  expect(rep('departments-kaist-environmental')).toBe('departments-kaist-civil');
});
it('record keys unique (483), unit keys 460, slug regex, 87 numbered rows', () => {
  const rks = [...idx.recordKeys.values()];
  expect(new Set(rks).size).toBe(483);
  expect(new Set([...idx.unitKeys.values()]).size).toBe(460);
  for (const k of idx.unitKeys.values()) expect(k.split('/')[1]).toMatch(/^[a-z0-9_-]{1,32}$/);
  expect(Object.keys(NUMBERED_SLUGS).length).toBe(87);
  expect(idx.recordKeys.get('departments-uos-computer-2')).toBe('uos/electrical@computer');
  expect(idx.recordKeys.get('departments-snu-computer-2')).toBe('snu/information-security');
  expect(idx.recordKeys.get('departments-snu-computer')).toBe('snu/computer');
});
it('track weights equal agency spec §2.2 (sum 460)', () => {
  const w = trackWeights(idx);
  expect(w.ai).toBeCloseTo(30.83, 2); expect(w.neuroscience).toBe(9); expect(w.linguistics).toBe(6.5);
  expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(460, 6);
});
```

   note 파싱 규칙: `·` 로 나눈 토큰에서 `field X`, `track Y`, `NRF CODE 이름`, `KEDI CODE …`, `same_unit_as: departments-…`(여러 개면 `·` 로 또 나뉨), `대표 departments-… (묶음 N)`. 이름 = 첫 토큰. `noAdmission` = note 에 "이번 모집 없음" 또는 "미모집" 포함. 묶음은 `same_unit_as:` 마커로 union-find. 대표 = 접미 없는 레코드 우선, 그 안에서 id 사전순(선택권 §10 규칙 3) — 단 note 의 `대표 departments-…` 가 있으면 그것을 쓰고 둘이 다르면 throw. 번호 접미 87건의 slug 는 `NUMBERED_SLUGS` 표(선택권 §11 표를 그대로 옮긴 상수)로 받는다.
- [ ] **Step 4: taxonomy 테스트** — `TRACKS.length === 26`; `groupOf('ai') === '이공'`, `fieldOf('ai') === 'cs'`, `fieldOf('bioengineering') === 'bio'`, `kediOf('economics') === 'social'`, `kscedOf('economics') === 'business-law'`, `kscedOf('mathematics') === 'natural-math'`; `subfieldsOf(data,'computer').length === 21`, `subfieldsOf(data,'civil').length === 25`(19 + 6, 선택권 §2.3); `tracksOf('인문사회').length === 10`.
- [ ] **Step 5: 구현·통과·커밋** `feat(engine): data loader with confidence, department bundles/keys, taxonomy mapping`.

### Task 3: 데이터 접근 모듈 — 등록금·장려금·급여·통계·투고처

**Files:**
- Create: `engine/src/data/tuition.ts`, `funding.ts`, `salaries.ts`, `statistics.ts`, `venues.ts`, 각 `engine/test/<name>.test.ts`

**Interfaces:**
- Consumes: `load.ts`, `departments.ts`, `taxonomy.ts`, `ASSUMED`.
- Produces:

```ts
// tuition.ts (선택권 §5.1)
export function tuitionPerSemester(data, school: string, field: Field, departmentRecord: string): DataValue & { ruleTag: 'department' | 'school-field' | 'school-all' | 'rule-c' | 'ewha-median' }
export function entranceFee(data, school: string): DataValue      // 없으면 {value:0, confidence:'assumed', id:'0014#54'}
export function waiverRate(data, school: string, route: FundingRoute): DataValue   // 0014#21
export function ewhaMedian(data, field: 'engineering' | 'math'): number            // 8곳 레코드 중앙값(4·5번째 평균)
// funding.ts (선택권 §5.2)
export function scholarshipOptions(data, school: string): DataRecord[]  // `schools-{school}-all-scholarship-living-*`
export function monthlyFromRecord(rec: DataRecord): number              // 학기÷6, 연÷12, 총액÷48 (note 또는 unit 으로 판정: 'krw-per-semester'|'krw-per-year'|'krw-total'|'krw-per-month')
export function projectStipend(data, school: string, group: Group): DataValue      // 0014#27 규칙
export function taStipend(data, school: string): DataValue                         // 0014#35
// salaries.ts (선택권 §9.1)
export function privateFacultyPay(data, rank: 'assistant' | 'associate' | 'professor'): DataValue  // 규칙 (a) 감사 후
export function nationalStep0(ageYears: number, rank): number                                      // 규칙 (b)
export function stepPay(data, table: 'univ-faculty' | 'researcher' | 'research-officer', step: number): DataValue // 호봉 × 12 × 1.3
export function institutePay(data, institute: string, grade: 'new-hire' | 'senior-researcher' | 'principal-researcher'): DataValue
export const INSTITUTES: readonly string[]  // etri kaeri kimm kist kisti kribb krict
export function lecturerAnnual(data, school: string): DataValue        // 시급 × 6 × 32, 없으면 18건 중앙값
export function industryPay(data, group: Group): DataValue
// statistics.ts
export function leaveRate(data, kedi: Kedi): DataValue           // statistics-phd-leave-rate-{kedi}
export function dropoutRate(data, kedi): DataValue
export function durationYears(data, kedi): DataValue             // statistics-phd-duration-mean-years-{kedi}
export function employedRate(data, ksced: Ksced): DataValue
export function permanentShare(data, ksced): DataValue           // statistics-form-permanent-{ksced}-2021-2024
export function postdocFunders(data): Record<'university'|'other'|'government'|'public-institute'|'private-institute'|'private-company', DataValue>
export function facultyMarket(data, year = 2025): { newHiresAll: DataValue; phdAwardedTotal: DataValue; stock: Record<string, DataValue>; stockAll: DataValue; phdAwarded: Record<Kedi | 'education', DataValue>; nonFulltime: Record<Kedi, DataValue>; honorary: DataValue }
export function admittedShares(data): Record<'humanities'|'social'|'engineering'|'natural', DataValue>
// venues.ts (선택권 §6.3·§6.4)
export function fieldGroupOf(track: string): string | null       // 0014#65
export function venueOptions(data, track: string, tier: Tier): { venueId: string | null; pTier: DataValue }[]
export function tierBaseRate(data, tier: Tier, venueId?: string): DataValue   // 학회면 채택률 레코드, 아니면 0014#66
export function reviewMonths(field: Field): [number, number]                  // 0014#69
```

- [ ] **Step 1: tuition 테스트 (이관 "ewha 등록금 재계산" 완료 조건)**

```ts
it('ewha median recomputed from 8 Seoul private records equals engine constants', () => {
  expect(ewhaMedian(data, 'engineering')).toBe(7_341_000);
  expect(ewhaMedian(data, 'math')).toBe(6_367_500);
  expect(tuitionPerSemester(data, 'ewha', 'cs', 'departments-ewha-ai').value).toBe(7_341_000);
  expect(tuitionPerSemester(data, 'ewha', 'bio', 'departments-ewha-life_science-2').value).toBe(6_367_500);
});
it('department-level tuition record wins', () => {
  expect(tuitionPerSemester(data, 'snu', 'math', 'departments-snu-statistics').id).toBe('departments-snu-statistics-tuition');
});
it('rule (c) uses engineering tuition for cs at hanyang', () => {
  expect(tuitionPerSemester(data, 'hanyang', 'cs', 'departments-hanyang-computer').id).toBe('schools-hanyang-engineering-tuition');
});
it('kaist entrance fee is 0 (0014#54)', () => expect(entranceFee(data, 'kaist').value).toBe(0));
```
- [ ] **Step 2: salaries 테스트** — `privateFacultyPay(data,'professor').value === 101_390_000`; associate ≈ 101_390_000 × 7466/9631 (±1), assistant ≈ × 4918/9631; `nationalStep0(35,'assistant') === 15`; `stepPay(data,'univ-faculty',15).value === 3_816_100*12*1.3` (= 59,531,160); `lecturerAnnual(data,'dgist').value === 74_565*6*32` (= 14,316,480); `institutePay(data,'kribb','new-hire').value === 46_000_000`; `industryPay(data,'이공').value === 63_044_000`.
- [ ] **Step 3: statistics 테스트** — `leaveRate(data,'humanities').value === 0.188`; `durationYears(data,'social').value === 5`; `permanentShare(data,'ict').value === 0.615`; `facultyMarket(data).newHiresAll.value === 4603`, `.phdAwardedTotal.value === 19831`, `.stockAll.value === 64672`; `admittedShares(data).engineering.value === 8895`.
- [ ] **Step 4: venues 테스트** — `fieldGroupOf('linguistics') === null`; `tierBaseRate(data,'T1').value === 0.25` (confidence assumed); `tierBaseRate(data,'T1','venues-conf-icml-acceptance-2025')` 가 레코드 값·`indexed`; T1 학회 목록에 CORE A* 레코드만; `reviewMonths('cs')` = [2,6].
- [ ] **Step 5: 이관 "indexed 근거 노출" 테스트** (`engine/test/confidence.test.ts`): 선택권 §12 표의 레코드가 전부 `indexed` 로 나온다 — `venues-journal-*-sjr-quartile` 60건, `salaries-faculty-{national,private}-{professor,associate-professor,assistant-professor}-mean-2017` 6건 + `salaries-faculty-all-fulltime-mean`, `salaries-faculty-private-nontenure-mean`, `salaries-faculty-private-professor-mean`, `schools-postech-all-tuition`, `schools-postech-all-entrance-fee`, `schools-ewha-all-entrance-fee`, `schools-hanyang-all-scholarship-living-bk21`, `venues-conf-icml-acceptance-2025`, `venues-conf-isscc-core-rank`, `departments-pusan-psychology`, `departments-knu-mechanical`, `departments-knu-philosophy`. (Scimago 재확인으로 `verified` 가 된 뒤에는 기대값을 바꾼다 — 그 사실을 테스트 주석에 적는다.)
- [ ] **Step 6: 구현·통과·커밋** `feat(engine): tuition/funding/salaries/statistics/venues accessors with confidence`.

### Task 4: createLife — 입학 전 선택 6종과 초기화

**Files:**
- Create: `engine/src/pre/createLife.ts`, `engine/test/createLife.test.ts`

**Interfaces:**
- Consumes: Task 1–3 전부.
- Produces: `createLife(config, seed, data): LifeState` (stage `phd`, month 0, pending null). 내부 헬퍼 `pickWeighted(u: number, weights: Record<string, number>): string` 를 `engine/src/util.ts` 에 두고 내보낸다(뒤 Task 가 쓴다).

- [ ] **Step 1: 테스트**

```ts
it('same input → same state', () => {
  const a = createLife({}, 'APHD-AAAAAAAA', data), b = createLife({}, 'APHD-AAAAAAAA', data);
  expect(a).toEqual(b);
});
it('explicit choices are kept, byLuck false; luck fills the rest', () => {
  const s = createLife({ group: '이공', track: 'ai', funding: 'self' }, 'APHD-AAAAAAAA', data);
  expect(s.choices.group).toBe('이공'); expect(s.choices.byLuck.group).toBe(false); expect(s.choices.byLuck.school).toBe(true);
  expect(s.choices.field).toBe('cs'); expect(s.choices.ksced).toBe('ict'); expect(s.choices.kedi).toBe('engineering');
  expect(s.stats.mind).toBeLessThanOrEqual(70 - 5 + 0); // 자비 −5 (0014#17) 뒤 30–70 범위 안
});
it('initial stats within 30–70, cash 5,000,000, ageMonths from 0014#3 support', () => {
  const s = createLife({}, 'APHD-AAAAAAAA', data);
  for (const v of Object.values(s.stats)) { expect(v).toBeGreaterThanOrEqual(30); expect(v).toBeLessThanOrEqual(70); expect(Number.isInteger(v)).toBe(true); }
  expect(s.money.cash).toBe(5_000_000); expect([25,26,27,28,29,30,31,32,33,34,35]).toContain(s.ageMonths / 12);
});
it('luck group ratio ≈ 0.572 over 2000 seeds', () => {
  let stem = 0; for (let i = 0; i < 2000; i++) if (createLife({}, newSeed(`s${i}`), data).choices.group === '이공') stem++;
  expect(stem / 2000).toBeGreaterThan(0.54); expect(stem / 2000).toBeLessThan(0.60);
});
it('advisor preference matched with p≈0.6 (0014#19)', () => { /* 2000 seeds, advisorPref:'strict', count phd.advisor.type==='strict' in 0.56–0.64 */ });
it('funding route resolves: scholarship fails → project → self (0014#22,#25)', () => { /* seed scan: 적어도 한 seed 에서 funding:'scholarship' 지정이 fundingState.route 'project' 또는 'self' 로 끝남, recordIds 비어 있지 않음 */ });
```
- [ ] **Step 2: 구현** 순서(선택권 §2): group(`luck`/`group`) → track(가중치 §2.2, 슬롯 `track`) → subfield(균등, `subfield`) → department(트랙 안 대표 단위 균등, `department`; `departmentRecord` = 대표 id, `department` = 단위 키) → funding(§2.5 표, `funding`) → advisorPref(균등, `advisorPref`). 초기 능력치: `clamp(round(50 + 8·N), 30, 70)` 슬롯 `stat:health` 등(`init` 스트림). 나이: 0014#3 분포(`init`, `age`). 지도교수 실제 유형(0014#19, `init`, `advisor`), 파라미터 0014#18. 자금 확정: 장학 `odds(0.60, 0.8·z(skill))` (`funding`, `scholarship`), 과제 0014#25 (`funding`, `project`), 실패 시 다음 경로; `fundingState` 채움(§5.2: monthly·until·tuitionWaiver·dutyHours·recordIds). 가족 지원 0014#11 (`init`, `family`) → `phd.familySupport`. `requiredPapers` 0014#63. `coursework = true`, `focus = 'research'`, `focusHistory = [{from:0, focus:'research'}]`. 입학금(§5.1)은 month 0 ledger 에 즉시 반영(`cash −= entranceFee`), 등록금은 첫 틱(month 0→1 이 아니라 학기 경계 규칙에 따라 month 0 청구)을 Task 5 가 맡으므로 여기서는 청구하지 않는다.
- [ ] **Step 3: 통과·커밋** `feat(engine): createLife with six pre-admission choices and luck`.

### Task 5: 박사과정 월 틱의 재료 ① — 포커스·진척·돈

**Files:**
- Create: `engine/src/phd/focus.ts`, `engine/src/phd/progress.ts`, `engine/src/phd/money.ts`, `engine/test/focus.test.ts`, `engine/test/progress.test.ts`, `engine/test/money.test.ts`

**Interfaces:**
- Produces:

```ts
export function applyFocus(state: LifeState, data: DataBundle): LifeState        // 선택권 §4.1 (능력치·초고 writing·근로 수입 기록은 ledger kind 'work')
export function applyDrift(state: LifeState): LifeState                            // 상태 §1.5
export function gK(data: DataBundle, kedi: Kedi): number                           // 선택권 §4.2 g_k = 100 / ((12·T_k − 6) × M̄)
export function researchTime(state: LifeState): number
export function applyProgress(state: LifeState, data: DataBundle): LifeState      // 막힘 추첨 (`progress`, `blocked`), U(0.65,1.50) (`progress`, `gain`)
export function applyCashflow(state: LifeState, data: DataBundle): LifeState      // §5.3–§5.5: 수입(장려금·가족·근로) − 생활비 − 등록금(학기 경계) − 이자, 대출, 위기 카운터
export function isSemesterBoundary(month: number): boolean                         // month mod 6 === 0
```

- [ ] **Step 1: focus 테스트** — `research` 한 달: health −1.5→ 정수 반올림 규칙(누적은 실수로 두고 저장 시 반올림? → **규칙: `stats` 는 정수. 소수 변화는 `state.phd.statCarry: Stats` 에 누적하고 1 이상이 되면 옮긴다.** `types.ts` 의 `PhdState` 에 `statCarry` 를 Task 1 에서 추가한다) ; `write` 는 활성 초고가 없으면 새 초고 `p1` 생성 후 `writing += 12 + 0.2·skill`; `network` 는 cash −100,000; `work` 는 ledger 에 +1,000,000; `rest` 는 health +4 mind +3; `thesis` 는 `qualified` 아니면 throw.
- [ ] **Step 2: progress 테스트** — `gK(data,'humanities')` ≈ 2.23(±0.01, M̄ 0.68), social ≈ 2.72, natural·engineering ≈ 2.45; 막힌 달은 ×0.2; `researchTime` 수업 중 조교 = max(0.12,(44−10−0−6)/44); 100 에서 더 오르지 않음; health 0 → E 0.5.
- [ ] **Step 3: money 테스트 (Review Focus 3)**

```ts
it('negative cash borrows up to limit, then crisis after 3 months forces funding-expiry, 3 more → financial end', () => {
  let s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, 'APHD-AAAAAAAA', data);
  s = { ...s, money: { ...s.money, cash: 0, debt: s.money.loanLimit } };
  for (let i = 0; i < 3; i++) s = applyCashflow(s, data);
  expect(s.phd!.crisisMonths).toBe(3); expect(s.money.debt).toBe(s.money.loanLimit); expect(s.money.cash).toBe(0);
  // tick.ts 가 crisisMonths ≥ 3 → pending funding-expiry, 그 뒤 postCrisisMonths ≥ 3 → end financial 을 맡는다(Task 7 테스트).
});
it('semester boundary charges tuition × (1 − waiver) and research-registration 0.1 after coursework', () => { /* month 6 vs month 30 비교 */ });
it('interest = debt × 0.03 / 12, rounded to integer won', () => { /* debt 12,000,000 → +30,000 */ });
```
- [ ] **Step 4: 구현·통과·커밋** `feat(engine): focus effects, progress formula, cash flow and loan rules`.

### Task 6: 박사과정 월 틱의 재료 ② — 논문·시험·위험률

**Files:**
- Create: `engine/src/phd/papers.ts`, `engine/src/phd/exams.ts`, `engine/src/phd/hazards.ts`, 테스트 3개

**Interfaces:**
```ts
// papers.ts (선택권 §6)
export function submitIfReady(state, data): LifeState            // writing ≥ 100 → status submitted, quality 추첨 (`paper`, `${id}:quality`), tier 선택(투고 방침: 첫 논문 T1 부터? → 규칙: 첫 투고 계층 = 이공 T1, 인문사회 T3; 거절 뒤 방침 "한 계층 낮춤"), venueId, dueMonth = month + 심사 기간 (`paper`, `${id}:review`), 지연 (`paper`, `${id}:delay`)
export function resolveVerdicts(state, data): { state: LifeState; verdicts: { paperId: string; verdict: 'accepted' | 'revision' | 'rejected'; first: boolean }[] }  // dueMonth === month 인 논문 판정 (`paper`, `${id}:verdict:${attempts}`)
export function paperScore(papers: Paper[]): number                 // 0014#71
export function acceptProbability(state, data, paper: Paper): number
// exams.ts (선택권 §7)
export function qualWindowOpen(state): boolean                      // enrolledMonths ∈ {12,18,24,…}, !qualified, qualAttempts < 3
export function takeQual(state, data): { state: LifeState; passed: boolean }       // (`exam`, `qual:${attempt}`)
export function defenseEligible(state): boolean
export function takeDefense(state, data): { state: LifeState; passed: boolean }    // (`exam`, `defense:${attempt}`), 통과 → graduationMonth = 다음 학기 경계
// hazards.ts (선택권 §4.5)
export function applyHazards(state, data): LifeState   // 휴학 (`hazard`, `leave`), 이탈 (`hazard`, `dropout`), 번아웃 (`hazard`, `burnout`); 휴학 기간 (`hazard`, `leave:months`)
```
- [ ] **Step 1: papers 테스트** — 평균 능력치·attempts 1·quality 55 에서 T1 `acceptProbability` = 0.25; 수정 요구 구간 = `min(0.95 − p, 0.29)`; `resolveVerdicts` 는 due 가 아닌 논문을 건드리지 않음; 거절 뒤 자동 방침은 한 계층 낮춰 재투고(T4 유지); 2000 seed 평균 채택 비율이 0.25 ± 0.03 (T1, 평균 능력치).
- [ ] **Step 2: exams 테스트** — 창은 12·18·24; 평균 능력치 첫 시도 합격 확률 0.70 (`odds` 값 직접 비교); 3회 불합격 → `end.reason === 'dropout'`; 학위 심사 자격 조건 4개(qualified, project ≥ 100, 채택 ≥ requiredPapers, path 설정); 통과 시 `graduationMonth` 가 다음 학기 경계.
- [ ] **Step 3: hazards 테스트 (Review Focus 2)** — 평균 능력치 인문: 월 휴학 확률 = hazardMonth(0.188) ≈ 0.0172, 이탈 = 0.5 × hazardMonth(0.064); 휴학 중 틱은 `enrolledMonths` 증가 없음·health/mind +3·진척 불변(Task 7 과 함께 검증); 누적 36개월에서 더 휴학하지 않음; health 10 → 번아웃 추첨 0.10.
- [ ] **Step 4: 구현·통과·커밋** `feat(engine): paper lifecycle, qualifying/defense exams, leave/dropout/burnout hazards`.

### Task 7: advanceMonth — 틱 순서, 결정 지점 트리거, 종료

**Files:**
- Create: `engine/src/phd/triggers.ts`, `engine/src/phd/tick.ts`, `engine/src/policy.ts`, `engine/test/advanceMonth.test.ts`, `engine/test/policy.test.ts`

**Interfaces:**
```ts
export function advanceMonth(state, data, input?: MonthInput): LifeState   // pending 이면 throw new Error('decision pending')
export function checkTriggers(state, data, events: { verdicts: …; qualResult?: boolean; fundingExpired: boolean }): PendingDecision | null   // 선택권 §3 트리거, 우선순위: post-qualifying > funding-expiry > first-paper-verdict > pre-graduation-path
export function policyFocus(state, data): Focus                             // 선택권 §4.4 (`policy`, `focus`)
export function policyDecision(state, data, pending: PendingDecision): number   // 선택지 가중치 (`policy`, `decide:${dp}`)
```
- [ ] **Step 1: 테스트**

```ts
it('throws while pending (Review Focus 1)', () => { const s = { ...life, pending: { dp: 'post-qualifying', month: 12, context: {}, options: [] } }; expect(() => advanceMonth(s, data)).toThrow(/pending/); });
it('tick order: month+1, news, semester, focus, drift, cash, papers, milestones, hazards, triggers, end, log', () => { /* ledger·log 순서로 확인: month 6 에 'tuition' ledger 가 'work' 보다 앞 */ });
it('deterministic: 60 months twice give equal states', () => { /* auto:true 두 번 재생 → toEqual */ });
it('auto life reaches degree or an end within 120 months for 50 seeds, and median degree months for engineering within 5.5y ± 0.5y band is reported (not asserted here)', () => { /* 각 seed 를 pending 이면 policy 로 decide */ });
it('leave month: no tuition, no stipend, project unchanged, +3 health/mind', () => { /* phd.leave.active 상태 조작 후 한 틱 */ });
it('residence 96(+12) → end residence; financial crisis chain → end financial', () => { /* enrolledMonths 95 → 틱 → 연장 1회 … */ });
```
- [ ] **Step 2: 구현** — 상태 §7.1 순서 그대로. 결정 지점이 걸리면 `pending` 을 채우고 `snapshots.push({dp, month, decisionIndex: decisions.length, state: <pending 을 채우기 직전 상태 복제>})`(상태 §6.3). `auto` 상태면 틱 안에서 `policyFocus`·`policyDecision` 으로 바로 처리하되 `decisions[].byPolicy = true`. 뉴스 갱신은 Task 8 의 `updateNews` 를 쓴다 — Task 8 이 먼저 끝나지 않았으면 `career/news.ts` 의 `updateNews` 시그니처만 보고 스텁 없이 import 한다(의존 순서: 8 → 7 로 바꿔 실행해도 된다).
- [ ] **Step 3: 통과·커밋** `feat(engine): advanceMonth tick order, decision triggers, auto policy`.

### Task 8: 경력 단계 — 노동시장·뉴스·급여·진로 분포·advanceYear

**Files:**
- Create: `engine/src/career/labor.ts`, `news.ts`, `pay.ts`, `path.ts`, `career/tick.ts`, 테스트 5개

**Interfaces:**
```ts
// labor.ts (노동 §2–§4)
export function professorBaseline(data, kedi: Kedi): { B: number; h: number }         // B_k 표: humanities 0.3172 … ; h = min(0.10, 0.5·B)
export function lecturerH(data, kedi): number                                          // clamp(0.15·L, 0.20, 0.85)
export function routeH(data, route: Route, group: Group, kedi: Kedi): number           // 노동 §3.2 표
export function postingProbability(data, route, group, kedi, demand: number): number  // clamp(π0·D, 0.005, 0.60)
export function hireProbability(state, data, route): number                           // 노동 §4.1 odds(s0, …)
export function searchMonth(state, data, month: number, input?): { state: LifeState; postings: Route[]; hired?: Route }
// news.ts (노동 §5)
export function updateNews(state, data): LifeState            // 만료 제거 → 발생 (`news`, `arrive`/`news:type`/`news:size`/`news:months`)
export function demand(state, route: Route): number           // D_r,u(t), 0.70–1.30
// pay.ts (선택권 §9)
export function startingPay(state, data, route, employer): { annualPay: number; step?: number; rank?: string; recordIds: string[] }
export function yearEnd(state, data): LifeState               // 나이·근속·호봉·+3%·계약 만료·창업 존속·경력 논문
export function promotion(state, data, dp: 'career-5y' | 'career-10y'): { state: LifeState; promoted: boolean }
export function retireAge(state, data): number                // (`life`, `retire`)
export function pensionMonthly(state): number
// path.ts (선택권 §8)
export function pathDistribution(data, ksced: Ksced, group: Group): Record<Path, number>
// career/tick.ts
export function advanceYear(state, data, input?): LifeState   // 상태 §7.2·§7.3; pending 이면 throw
```
- [ ] **Step 1: labor 테스트** — `professorBaseline(data,'humanities')` → B ≈ 0.3172(±5e-4), h = 0.10; engineering h ≈ 0.0998; `lecturerH(data,'humanities')` = 0.85, social ≈ 0.454; `postingProbability(data,'professor','인문사회','humanities',1)` ≈ 0.0874(±5e-4); 같은 달 같은 경로 공고 ≤ 1 (Review Focus 4: 슬롯 `post:professor` 한 번).
- [ ] **Step 2: news 테스트** — `demand` 가 뉴스 없으면 1; 효과 −0.3 둘이 겹쳐도 0.70 하한; 17종 중 표적 `track ai` 뉴스는 `choices.track === 'computer'` 플레이어도 덮는다; 만료 달에 제거; 2000개월 평균 발생률 0.5 ± 0.04.
- [ ] **Step 3: pay·path 테스트** — `pathDistribution(data,'ict','이공').academia ≈ 0.341`(±0.002), arts-humanities academia ≈ 0.699; `startingPay(..,'professor', {national:true})` 35세 조교수 = 59,531,160; 사립 조교수 = privateFacultyPay assistant; 박사후 대학 37,800,000; `retireAge` 교수 65, 출연연 61, 공무원 60, 그 밖 60–67; `pensionMonthly` 공식 0014#101.
- [ ] **Step 4: advanceYear 테스트** — 월 하위 단계 12회 뒤 `month += 12`; 구직 중 공고→채용→`route` 전환; 뉴스 효과가 `untilMonth` 뒤 사라짐(이관 완료 조건 "뉴스 효과가 n개월 후 소멸"); `career-5y` 트리거는 `degreeMonth + 60` 을 지난 첫 연 틱에 한 번만; `retired` 단계에서 연 틱은 나이 +1·연금 ×12; 80세 → `end.reason 'age80'`.
- [ ] **Step 5: 구현·통과·커밋** `feat(engine): labor market, fictional news, pay/promotion/retirement, advanceYear`.

### Task 9: decide·branch·save·index

**Files:**
- Create: `engine/src/decide.ts`, `engine/src/branch.ts`, `engine/src/save.ts`, `engine/src/index.ts`, `engine/test/decide.test.ts`, `engine/test/branch.test.ts`, `engine/test/save.test.ts`

- [ ] **Step 1: decide 테스트** — 7종 × 선택지마다 한 케이스(선택권 §3 표 효과를 그대로 단언: `post-qualifying` 합격 A → project +5, mind −3; 불합격 C → `end.reason 'exit-master'` 와 `career.degree 'master-exit'`; `first-paper-verdict` 수정 A → 해당 논문 `logitBonus 0.8`, quality +8, dueMonth = month + 2 + ceil(심사/2); `funding-expiry` B → `fundingState.monthly` = 조교 레코드 월 환산, dutyHours 10; D → 휴학 12개월·ledger 'leave-work' 2,000,000; `pre-graduation-path` → `phd.path`; `career-5y` A → `promotion`; `pre-retirement` B → `retireAge = 현재 나이`, pension ×0.85). `decide` 는 `pending` 을 비우고 `decisions` 에 추가하며 `optionIndex` 범위 밖이면 throw.
- [ ] **Step 2: branch 테스트 (Review Focus 5)**

```ts
it('branch returns the snapshot before the decision; state is unchanged; news identical across branches', () => {
  // auto life → first decision (수동: auto:false, pending 까지 전진)
  const before = structuredClone(s);
  const b = branch(s, data, s.decisions[0]!.dp);
  expect(s).toEqual(before);
  expect(b.pending?.dp).toBe(s.decisions[0]!.dp); expect(b.decisions.length).toBe(0);
  const a1 = decide(b, data, 0), a2 = decide(b, data, 1);
  // 12개월 전진 후 news 배열 동일
  let x = a1, y = a2; for (let i = 0; i < 12; i++) { x = x.pending ? decide(x, data, 0) : advanceMonth(x, data); y = y.pending ? decide(y, data, 0) : advanceMonth(y, data); }
  expect(x.news).toEqual(y.news);
});
it('branch throws when dataRevision differs', () => { expect(() => branch({ ...s, dataRevision: 'x' }, data, dp)).toThrow(/dataRevision/); });
```
- [ ] **Step 3: save 테스트** — `toSave(state)` 는 `{version:1, snapshot, replay:{seed, choices, decisions, focusHistory}}`; `fromSave(obj)` 는 version > 현재면 throw `/newer/`; `migrations` 배열은 비어 있고(v1) 테스트는 "v1 → v1 항등" 고정 예시 하나를 둔다(상태 §5.2 규칙 5 의 자리 표시).
- [ ] **Step 4: index.ts** — 공개 API 재수출 + `describeOptions`. `engineRevision` = `'wave4-' + package.json version` 또는 `git rev-parse` 없이 상수 `'wave4'`.
- [ ] **Step 5: 통과·커밋** `feat(engine): decide (7 decision points), snapshot branch, save format v1, public API`.

### Task 10: v3.5 oracle 스냅샷 테스트 29행

**Files:**
- Create: `engine/test/oracle/v35.ts` (v3.5 공식의 참조 구현, `docs/oracle/v35-recon.md` §Key formulas 그대로), `engine/test/oracle/v35-comparison.test.ts`

- [ ] **Step 1: 비교표 29행마다 `it(...)` 하나.** 같은 입력(능력치 50, 첫 시도, quality 55 등)에서 v3.5 값과 우리 값을 내고 차이가 그 행의 "차이 사유"와 맞는지 단언한다. 예:

```ts
it('row 7 자격시험: v3.5 first-attempt 0.70 equals our p0 at mean stats; skill threshold removed', () => {
  expect(v35.qualPass(1)).toBeCloseTo(0.70, 6);
  expect(qualProbability({ ...meanStats }, 1)).toBeCloseTo(0.70, 6);
  expect(qualProbability({ ...meanStats, skill: 30 }, 1)).toBeGreaterThan(0.10); // v3.5 는 skill<44 이면 응시 불가
});
it('row 8 학위 심사: our p0 0.73 = v3.5 at mean stats, lo 0.40 kept', () => { expect(v35.defense(50,50,50,1)).toBeCloseTo(0.73, 6); });
it.skip('row 29 경력 소득 증가: v3.5 has no per-route rule — skip (사유: 정찰 기록에 상승 규칙 없음)', () => {});
```
   같은 입력을 넣을 수 없는 행은 `it.skip` 과 사유. 마지막에 `expect(cases + skips).toBe(29)` 를 소스 자기 검사로 둔다(파일을 읽어 `it(`·`it.skip(` 개수를 센다).
- [ ] **Step 2: 통과·커밋** `test(engine): v3.5 oracle comparison, 29 rows (cases + skips = 29)`.

### Task 11: 보정 하네스와 결과표

**Files:**
- Create: `engine/sim/calibrate.ts`, `docs/oracle/calibration-wave4.md`, `engine/test/calibrate.test.ts`(N=20 smoke)

- [ ] **Step 1: CLI** `npm run calibrate -- --seeds 1000 [--out docs/oracle/calibration-wave4.md]`. seed 마다 `createLife({auto:true})` → 박사과정은 `advanceMonth`, 경력은 `advanceYear` 를 `end` 까지(상한 월 수 = 80세). 집계: 계열별 학위 기간 중앙값(년), 연간 휴학 경험 비율, 연간 이탈 비율, 학위 후 1년 안 취업 비율(KSCED 계열별), 경로·계열별 장기 평균 수요 계수, 졸업 후 10년 안 교수 경험 비율. 표 열: 목표 | 계열 | 모의값 | 기준값(레코드 id) | 허용 범위(0014#52) | 통과.
- [ ] **Step 2: M̄ 추정** — 선택권 §4.2: 1,000 seed 로 M̄ 를 추정해 학위 기간 중앙값이 T_k ± 0.5 에 들도록 `ASSUMED.PROGRESS_MBAR`(0014#45) 를 고정한다. 바꾼 값은 `docs/oracle/calibration-wave4.md` 와 0014 #45 행에 함께 적는다(값 변경은 main thread 가 판정).
- [ ] **Step 3: 결과표 커밋** 허용 범위 밖 목표는 같은 문서에 원인 후보·바꾼 0014 번호·새 값. 커밋 `docs(oracle): Wave 4 calibration table, N=1000`.

### Task 12: 스크립트 — 0014 주석 검사, 절 단위 표 파서, 레코드 id 존재 검사

**Files:**
- Create: `scripts/check-assumed.mjs`, `scripts/md-table.mjs`, `tests/md-table.test.mjs`
- Modify: `scripts/validate-data.mjs` (레코드 id 존재 검사), `tests/validate-data.test.mjs` (케이스 2개)

- [ ] **Step 1: check-assumed** — `engine/src/**/*.ts` 에서 `/0014#(\d+)/g` 수집 → 1–119 중 없는 번호·범위 밖 번호 출력, 범위 밖이 있으면 exit 1. 없는 번호는 `engine/README.md` 의 "엔진 밖 0014 번호" 표에 사유가 있어야 하고(파싱: `| n |` 행), 없으면 exit 1.
- [ ] **Step 2: md-table 테스트 (node:test)**

```js
test('reads 22 rows from agency §10 and 87 from §11; unknown heading throws', () => {
  const spec = 'docs/superpowers/specs/2026-10-13-agency-model-design.md';
  assert.equal(readTable(spec, '## 10. `same_unit_as` 규칙', 0).length, 22);
  assert.equal(readTable(spec, '## 11. 학과 엔진 키 형식', 0).length, 87);
  assert.throws(() => readTable(spec, '## 99. 없음', 0), /heading not found/);
});
```
   `readTable(file, heading, tableIndex)` 는 그 제목부터 같은 수준 이상의 다음 제목 전까지만 읽고, `tableIndex` 번째 표를 `{header: string[], rows: string[][]}` 로 돌려준다(`rows` 는 객체 배열로 변환하는 `toObjects` 도 내보냄). 데이터 수정 스크립트가 이 파서를 쓸 때의 규칙(기대 건수 불일치 시 중단, 마커 밖 손실 문장 수 출력)은 파일 머리 주석에 적는다.
- [ ] **Step 3: 레코드 id 존재 검사** — `validate()` 에 추가: `docs/design/decisions/*.md`·`docs/superpowers/specs/*.md` 의 백틱 안 토큰 중 접두 `schools-|departments-|salaries-|statistics-|venues-|taxonomy-|nar-hs-|nar-stem-` 로 시작하는 것을 모아, 패턴(`{a,b}`, `{a/b}`, `{1..5}`, `{…}`, `<…>`, `*`, `…`, `NNNN`) 을 정규식으로 바꿔 레코드 id(서사 포함) 1건 이상과 맞는지 확인; 0건이면 `errors` 에 `${file}: no record matches id pattern ${token}`. 테스트: fixture 의 spec 에 `` `statistics-regular-share-<field>` `` 를 넣으면 실패, `` `statistics-employed-{ict,social}` `` 과 `` `nar-hs-funding-{4,6}` `` 은 통과. **HEAD 에서 0건**이 되도록 0014 #76 행·0014 §결과·선택권 §1 의 그 id 언급은 백틱을 빼고 "(존재하지 않는 id)" 로 적는다(Task 13 가 고친다).
- [ ] **Step 4: 통과·커밋** `feat(scripts): assumed-comment checker, section-scoped markdown table parser, record-id existence check`.

### Task 13: 문서·이관 정리 — README, 프롬프트 diff, 결정 기록 0015, 출처, 판정 로그

**Files:**
- Create: `engine/README.md`, `docs/design/decisions/0015-wave3-retro-rules.md`, `data/sources/registry.d/<issue>-retirement-rules.json`
- Modify: `docs/prompts/judge-any.md`, `docs/prompts/weaver-retro-any.md` (Wave 3 회고 §프롬프트 수정 diff 6건 그대로), `data/packs/*/README.md` 7개 (`## 판정 로그` 절), `docs/design/decisions/README.md`(0015 행), `docs/design/decisions/0014-*.md` (#99 "출처가 생기면 바꾸는 곳" 에 registry.d id; #76 백틱 제거), 선택권 §1 줄 26 백틱 제거, `docs/waves/wave-04-engine-impl.md` (체크·메모), `docs/waves/STATUS.md`

- [ ] **Step 1: engine/README.md** — 공개 API 5개 시그니처·예시, 상태 객체 요약(상태 §3 링크), 난수 슬롯 규칙, 저장 형식, `npm` 스크립트, **"엔진 밖 0014 번호" 표**(예: #10 보관 수 → UI 전용, #7 80세 → 엔진 사용 … 실제로 소스에 없는 번호만, 사유 "UI 전용" 또는 "엔진 밖").
- [ ] **Step 2: 프롬프트 diff 6건 적용** (before → after 문자열을 wave-03 §프롬프트 수정 diff 에서 그대로).
- [ ] **Step 3: 결정 기록 0015** — 제목 "Wave 3 회고 반영: 감사 변경 반영 주체·데이터 수정 검사·감사자 독립성·보정 값 변경 절차·결정 기록 승인 시점". 상태 "제안됨 · 2026-10-13". 네 헤딩. 결정 5개(회고 §결정 기록으로 올릴 것 5건에 하나씩): (1) 감사 '변경' 판정의 반영은 초안 역할, 판정자는 반영 뒤 옛 값 저장소 검색 0건을 PR 본문에; (2) 판정 뒤 데이터 수정 스크립트는 `scripts/md-table.mjs` 를 쓰고 기대 건수·손실 문장 0 을 PR 본문에; (3) 감사 대상에 감사자 자신의 작업이 있으면 새 세션 또는 다른 모델(Astra)로; (4) 보정으로 바꾼 assumed 값은 0014 행 수정 + 보정 결과표 링크, Wave 4 종료 조건에 결과표 포함, 허용 범위 밖은 Wave 6 이월 목록에; (5) 결정 기록 승인은 PR 머지 시 상태 줄에 PR 번호를 적어 남기고, 회고 후보는 다음 wave 첫 PR 에서 결정 기록으로 만든다. "반대 근거" 절 포함(0010 §3).
- [ ] **Step 4: 정년 규정 출처** — `data/sources/registry.d/<wave-4 docs issue 번호>-retirement-rules.json` 에 교육공무원법 제47조(정년 65세), 국가공무원법 제74조(60세), 과학기술분야 정부출연연구기관 등의 설립·운영 및 육성에 관한 법률 + 기관 인사규정(61세) 항목 3건(id `law-2026-educational-public-officials-act`, `law-2026-state-public-officials-act`, `law-2026-research-institutes-retirement`; url 은 law.go.kr 조문 링크, checked_on 2026-10-13). 0014 #99 "바꾸는 곳" 칸에 그 id 를 적는다. 값은 여전히 assumed(레코드로 올리지 않음) — 출처 등록까지가 이번 범위.
- [ ] **Step 5: 판정 로그 절** 7개 팩 README 끝에 `## 판정 로그` + "이 팩의 레코드에 영향을 준 결정 기록: …(번호 나열)" 한 줄.
- [ ] **Step 6: `npm run validate` 통과, 커밋** `docs(wave-4): engine README, prompt diffs from Wave 3 retro, decision 0015, retirement-rule sources, pack judgment logs`.

### Task 14: 리뷰·엮기(opus)와 PR

- [ ] **Step 1:** `npm test`, `npm run typecheck`, `npm run coverage`(공식 함수 100%, 전체 90%), `npm run check-assumed`, `npm run validate`.
- [ ] **Step 2:** opus 리뷰(effort high): 스펙 절 ↔ 코드 대조 — 특히 틱 순서(상태 §7.1), 슬롯 이름 중복, `assumed.ts` 외 맨 숫자, 결정 지점 효과표. 발견 항목은 main thread(fable) 가 스펙 불일치 여부를 판정하고 수정 지시.
- [ ] **Step 3:** wave-04 체크리스트 전 항목 체크/메모, STATUS 갱신, 각 issue 에 handoff 댓글, PR 본문(템플릿 + compare-notes 출력 + 파서 행 수 + record-id 검사 0건 + `node --version` + 보정표 링크 + provenance `91_Handoffs/_HANDOFF-2026-10-13.md`).
