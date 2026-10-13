# Wave 0 (계획·협업 골격) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wave 0의 산출물(협업 계약, 결정 기록, 데이터 스키마·검증기, CI, issue 템플릿, wave 파일, 프롬프트 세트, 라벨·issue·PR)을 repo에 넣어 어떤 agent나 사람이 이어받을 수 있는 상태를 만든다.

**Architecture:** 모든 상태는 markdown·JSON으로 repo에 둔다. 데이터 검증기는 의존성 없는 Node ESM 스크립트 하나(`scripts/validate-data.mjs`)이고 `node --test`로 테스트한다. GitHub 라벨·issue·PR은 `gh`로 만든다.

**Tech Stack:** Node 20+ (내장 `node:test`, `node:fs`), GitHub Actions, `gh` CLI. TypeScript·Vitest는 Wave 4에서 도입.

**Spec:** `docs/superpowers/specs/2026-10-13-accidental-phd-planning-design.md`

## Global Constraints

- 수치 레코드 필수 필드: `id, value, unit, source_id, table, page, population, denominator, year, checked_on, confidence, note` (spec §5).
- 서사 레코드(`data/packs/narratives/**`) 필수 필드: `id, track, stage, theme, summary, quote, source_id, page_or_url, year, checked_on, confidence`; `track` ∈ `인문사회 | 이공`; `quote`는 15단어 이하; 원문 저장 금지 (spec §5).
- 선택 단위는 학과(241개 모집 단위)까지; 세부전공은 NRF 중·소분류 그대로 (spec §4).
- `confidence` ∈ `verified | indexed | assumed`.
- 분모 없는 비율, source_id 없는 수치는 CI에서 거부 (spec §5).
- 결정 기록은 `## 상태`, `## 맥락`, `## 결정`, `## 결과` 4개 헤딩 필수 (spec §3).
- 라벨 집합: `wave/0`…`wave/6`, `area/{taxonomy,schools,departments,venues,salaries,statistics,narratives,engine,ui,workflow,docs}`, `claimed`, `blocked`, `needs-judge`, `stale`, `chatgpt-ready` (spec §7; `area/narratives`는 스펙 §5 개정으로 추가).
- 실행 중 판정(2026-10-13): `npm test`는 bare `node --test`(Node 20 CI는 glob·디렉터리 인자를 받지 않음). 펜스 정규식은 줄 머리 펜스만 인식. 상세는 `docs/waves/wave-00-planning.md` §회고.
- 모델 표: fable↔Astra high, opus↔Sol medium~high, sonnet↔Sol(확인 필요) medium, haiku↔Luna low (spec §8).
- 학교 표시명은 가상 유지. 친구 코드 복사 금지 (spec §10).
- 커밋 메시지 끝: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Claude `Agent()` 호출은 literal `model:` 필수 (사용자 CLAUDE.md).

## Review Focus

1. 빈 `records.json`(`[]`)은 검증을 통과해야 한다. Wave 0에서 모든 팩이 비어 있다. → Task 3 test `empty pack passes`.
2. `unit`이 `ratio` 또는 `percent`인데 `denominator`가 비어 있으면 실패해야 한다. → Task 3 test `ratio without denominator fails`.
3. `source_id`가 `data/sources/registry.json`에 없으면 실패해야 한다. → Task 3 test `unknown source_id fails`.
4. 결정 기록에 4개 헤딩 중 하나라도 없으면 실패해야 한다. → Task 3 test `decision missing heading fails`.
5. `docs/**/*.md`의 상대 링크가 존재하지 않는 파일을 가리키면 실패해야 한다. → Task 3 test `broken relative link fails`.
6. 서사 레코드의 `quote`가 16단어 이상이거나 `track`이 두 값 밖이면 실패해야 한다. → Task 3 test `narrative long quote fails`, `narrative bad track fails`.

---

## File Structure

```
README.md                                   (modify) 프로젝트 소개·시작 방법·문서 지도
docs/workflow.md                            협업 계약
docs/design/decisions/README.md             결정 기록 작성법 + 템플릿
docs/design/decisions/0001-tech-stack.md
docs/design/decisions/0002-reimplement-not-fork.md
docs/design/decisions/0003-open-venue-metrics.md
docs/design/decisions/0004-fictional-school-display-names.md
docs/design/decisions/0005-agency-over-randomness.md
docs/waves/STATUS.md                        보드
docs/waves/wave-00-planning.md … wave-06-balance.md
docs/prompts/README.md                      모델 매핑·사용법
docs/prompts/judge-any.md                   Astra/fable
docs/prompts/weaver-retro-any.md            Sol/opus
docs/prompts/taxonomy-mapper-wave1.md       Sol/sonnet
docs/prompts/stat-collector-wave2.md        Sol/sonnet
docs/prompts/narrative-collector-wave2.md   Sol/sonnet
docs/prompts/stat-validator-wave2.md        Luna/haiku
data/sources/registry.json
data/schema/record.schema.json              문서용 스키마 (검증기는 자체 검사)
data/schema/source.schema.json
data/packs/<pack>/README.md + records.json  (6개 수치 팩 + narratives/{humanities-social,stem}/records.json)
scripts/validate-data.mjs
scripts/setup-labels.sh
tests/validate-data.test.mjs
package.json                                scripts: test, validate
.github/ISSUE_TEMPLATE/{stat-collection,design-decision,wave-task,bug}.yml, config.yml
.github/workflows/validate-data.yml, test.yml
.github/pull_request_template.md
```

---

### Task 1: 협업 계약과 README

**Files:**
- Create: `docs/workflow.md`
- Create: `scripts/setup-labels.sh`
- Modify: `README.md`

**Interfaces:**
- Produces: 라벨 이름 집합(Global Constraints 그대로). Task 7이 `scripts/setup-labels.sh`를 실행한다.

- [ ] **Step 1: `docs/workflow.md` 작성.** 다음 섹션을 이 순서로 포함한다.
  1. `# 협업 계약` — 한 문단: 상태는 repo와 issue에만 둔다.
  2. `## 역할과 모델` — spec §8 표를 그대로. Sonnet 행에 "ChatGPT 대응 확인 필요 (issue 참조)".
  3. `## 라벨` — Global Constraints 라벨 집합을 표로(라벨, 뜻, 누가 붙이나).
  4. `## claim 규약` — assignee + 댓글 `claimed by <이름> on <YYYY-MM-DD>`; 7일 무활동 → `stale`; `stale`은 누구나 재claim.
  5. `## handoff 댓글 형식` — 코드 블록:
     ```
     ### Handoff <YYYY-MM-DD>
     - 한 일:
     - 남은 일:
     - 막힌 것:
     - 다음 사람이 처음 읽을 파일:
     - 브랜치/worktree:
     ```
  6. `## 통계 수집 규약` — issue 1건 = 세션 1개 = worktree `stats/<topic>` = PR 1개. worktree 명령 예시 `git worktree add ../aphd-stats-<topic> -b stats/<topic>`. PR은 `validate-data` 통과 필수.
  7. `## 브랜치·PR 규약` — 브랜치 `wave-N/<slug>`, `stats/<topic>`, `adr/<slug>`. PR 본문은 `.github/pull_request_template.md`. squash merge.
  8. `## needs-judge` — 모호한 판정은 fable(Astra)에게. 결과는 결정 기록으로.
  9. `## ChatGPT 협업` — `docs/prompts/README.md` 링크. 출력은 사람이 issue/PR에 붙여넣는다.
  10. `## effort 조절` — wave 파일의 모델·effort 표가 우선. 기본값은 §2 표.

- [ ] **Step 2: `scripts/setup-labels.sh` 작성.**

```bash
#!/usr/bin/env bash
# Creates or updates the label set from docs/workflow.md. Idempotent.
set -euo pipefail
REPO="${1:-Raon1123/accidental-phd}"
mk() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null && echo "label: $1"; }
for n in 0 1 2 3 4 5 6; do mk "wave/$n" "0E8A16" "Wave $n 작업"; done
for a in taxonomy schools departments venues salaries statistics engine ui workflow docs; do mk "area/$a" "1D76DB" "영역: $a"; done
mk claimed      "FBCA04" "누군가 진행 중 (assignee + claimed 댓글)"
mk blocked      "B60205" "외부 요인으로 막힘"
mk needs-judge  "5319E7" "모호한 판정, fable/Astra 재판정 필요"
mk stale        "C5DEF5" "7일 무활동, 재claim 가능"
mk chatgpt-ready "BFD4F2" "ChatGPT 프롬프트로 바로 수행 가능"
```

- [ ] **Step 3: `README.md` 수정.** 제목 아래에: 한 문단 소개(1in8b.life 프레임 → 한국 연구자 life cycle, 어쩌다 박사 v3.5 고도화, 재구현), `## 시작하기`(`npm test`, `npm run validate`, issue 고르는 법 → `docs/workflow.md`), `## 문서 지도`(spec, plan, workflow, waves/STATUS.md, decisions, prompts, oracle 링크), `## 데이터 규율` 한 문단(spec §5 요약), `## 출처와 라이선스`(MIT; 1in8b.life·어쩌다 박사 v3.5는 참고 대상이며 코드 복사 없음).

- [ ] **Step 4: 링크 확인.** README와 workflow.md가 가리키는 파일 중 아직 없는 것은 이후 Task에서 만든다. Task 3의 링크 검사는 Task 6 이후에 통과한다.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/workflow.md scripts/setup-labels.sh
git commit -m "docs: collaboration contract, label script, README map

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 결정 기록 5건

**Files:**
- Create: `docs/design/decisions/README.md`
- Create: `docs/design/decisions/0001-tech-stack.md`, `0002-reimplement-not-fork.md`, `0003-open-venue-metrics.md`, `0004-fictional-school-display-names.md`, `0005-agency-over-randomness.md`

**Interfaces:**
- Produces: 4헤딩 형식. Task 3 검증기가 `docs/design/decisions/[0-9]*.md`를 검사한다.

- [ ] **Step 1: `README.md`** — 파일명 규칙 `NNNN-<slug>.md`, 템플릿:

```markdown
# NNNN. <제목>

## 상태
제안됨 | 승인됨 | 대체됨(→ NNNN) · <YYYY-MM-DD>

## 맥락
<왜 결정이 필요했나. 출처·수치가 있으면 링크>

## 결정
<무엇을 하기로 했나. 한 문단>

## 결과
<얻는 것 / 잃는 것 / 다시 볼 조건>
```

- [ ] **Step 2: 0001 tech-stack** — 결정: TypeScript ESM + Vitest(Wave 4부터), 정적 GitHub Pages, 백엔드 없음, localStorage; Wave 0~3 스크립트는 의존성 없는 Node ESM + `node:test`. 맥락: 친구 게임과 1in8b.life 모두 정적 사이트. 결과: 서버 비용 0, 다중 기기 동기화 없음.
- [ ] **Step 3: 0002 reimplement-not-fork** — 맥락: v3.5 소스 접근 불가, 라이선스 미표기. 결정: 코드 복사 금지, `docs/oracle/v35-recon.md`의 공식·수치만 비교용. 결과: 초기 속도 느림, 권리 깨끗.
- [ ] **Step 4: 0003 open-venue-metrics** — 맥락: Clarivate JCR 유료. 결정: Scimago SJR 사분위, CORE 학회 등급, KCI 등재 여부만 사용. 결과: 한국 인문사회 저널은 KCI로 커버, 국제 IF 수치는 노출하지 않음.
- [ ] **Step 5: 0004 fictional-school-display-names** — 맥락: v3.5 관례(서월대학교 등), 공시 데이터 사용. 결정: 데이터는 실명·공식 출처, 표시명은 가상. 매핑 표는 `data/packs/schools/README.md`. 결과: 법적·톤 리스크 최소.
- [ ] **Step 6: 0005 agency-over-randomness** — 맥락: 사용자 요구 "완전한 랜덤보다 선택이 삶을 바꾸는 것". 1in8b.life 원칙 인용 "Higher numbers raise the odds; they never decide the outcome." 결정: 입학 전 선택 6종(계열→전공군→세부전공(NRF 중·소분류)→학교·학과→자금→지도교수 선호) + 결정 지점 7종(spec §4), 각 항목 "운에 맡기기" 유지, 인문사회·이공 계열은 서사·사건 팩 분리, 확률은 데이터 팩 근거 또는 `assumed` 표시, "다른 선택 보기"·"동기 4명" 장치. 결과: Wave 3 스펙이 공식을 정함.
- [ ] **Step 7: Commit**

```bash
git add docs/design/decisions
git commit -m "docs: decision records 0001-0005

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 데이터 스키마·출처 등록부·빈 팩·검증기 (TDD)

**Files:**
- Create: `package.json`, `scripts/validate-data.mjs`, `tests/validate-data.test.mjs`
- Create: `data/sources/registry.json`, `data/schema/record.schema.json`, `data/schema/source.schema.json`
- Create: `data/packs/{taxonomy,schools,departments,venues,salaries,statistics}/README.md`, `.../records.json`

**Interfaces:**
- Produces: `validate(rootDir) → { errors: string[] }` (export from `scripts/validate-data.mjs`); CLI `node scripts/validate-data.mjs [root]` exit 1 on errors. Task 4 CI가 `npm run validate`와 `npm test`를 호출한다.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "accidental-phd",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "node --test",
    "validate": "node scripts/validate-data.mjs"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성** `tests/validate-data.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate } from '../scripts/validate-data.mjs';

const REC = {
  id: 'phd-employed-cs', value: 0.682, unit: 'ratio', source_id: 'krivet-2025-phd',
  table: '표 8', page: 140, population: '2024 학업전념 박사', denominator: '유효 응답자',
  year: 2024, checked_on: '2026-10-13', confidence: 'verified', note: ''
};
const SRC = { id: 'krivet-2025-phd', title: 't', publisher: 'KRIVET', year: 2025, url: 'https://x', checked_on: '2026-10-13' };

function fixture({ records = [], sources = [SRC], decision = null, md = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aphd-'));
  mkdirSync(join(root, 'data/sources'), { recursive: true });
  mkdirSync(join(root, 'data/packs/statistics'), { recursive: true });
  mkdirSync(join(root, 'docs/design/decisions'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.json'), JSON.stringify(sources));
  writeFileSync(join(root, 'data/packs/statistics/records.json'), JSON.stringify(records));
  if (decision !== null) writeFileSync(join(root, 'docs/design/decisions/0001-x.md'), decision);
  if (md !== null) writeFileSync(join(root, 'docs/a.md'), md);
  return root;
}

test('empty pack passes', () => {
  assert.deepEqual(validate(fixture()).errors, []);
});
test('valid record passes', () => {
  assert.deepEqual(validate(fixture({ records: [REC] })).errors, []);
});
test('ratio without denominator fails', () => {
  const r = validate(fixture({ records: [{ ...REC, denominator: '' }] }));
  assert.ok(r.errors.some(e => e.includes('denominator')));
});
test('unknown source_id fails', () => {
  const r = validate(fixture({ records: [{ ...REC, source_id: 'nope' }] }));
  assert.ok(r.errors.some(e => e.includes('source_id')));
});
test('missing field fails', () => {
  const { note, ...rest } = REC;
  const r = validate(fixture({ records: [rest] }));
  assert.ok(r.errors.some(e => e.includes('note')));
});
test('bad confidence fails', () => {
  const r = validate(fixture({ records: [{ ...REC, confidence: 'maybe' }] }));
  assert.ok(r.errors.some(e => e.includes('confidence')));
});
test('decision missing heading fails', () => {
  const r = validate(fixture({ decision: '# 0001. x\n\n## 상태\n승인됨\n\n## 맥락\nc\n\n## 결정\nd\n' }));
  assert.ok(r.errors.some(e => e.includes('결과')));
});
test('decision with all headings passes', () => {
  const r = validate(fixture({ decision: '# 0001. x\n\n## 상태\n\n## 맥락\n\n## 결정\n\n## 결과\n' }));
  assert.deepEqual(r.errors, []);
});
const NAR = {
  id: 'nar-stem-qual-exam-1', track: '이공', stage: 'qualifying', theme: 'exam-anxiety',
  summary: '자격시험 전날 실험 장비가 고장나 지도교수와 일정을 조정한다.', quote: '',
  source_id: 'krivet-2025-phd', page_or_url: 'p.12', year: 2024, checked_on: '2026-10-13', confidence: 'verified'
};
function narFixture(rec) {
  const root = fixture();
  mkdirSync(join(root, 'data/packs/narratives/stem'), { recursive: true });
  writeFileSync(join(root, 'data/packs/narratives/stem/records.json'), JSON.stringify([rec]));
  return root;
}
test('narrative record passes', () => {
  assert.deepEqual(validate(narFixture(NAR)).errors, []);
});
test('narrative long quote fails', () => {
  const r = validate(narFixture({ ...NAR, quote: 'a b c d e f g h i j k l m n o p' }));
  assert.ok(r.errors.some(e => e.includes('quote')));
});
test('narrative bad track fails', () => {
  const r = validate(narFixture({ ...NAR, track: '예체능' }));
  assert.ok(r.errors.some(e => e.includes('track')));
});
test('broken relative link fails', () => {
  const r = validate(fixture({ md: '[x](./missing.md)' }));
  assert.ok(r.errors.some(e => e.includes('missing.md')));
});
test('external and anchor links are ignored', () => {
  const r = validate(fixture({ md: '[a](https://x.y) [b](#sec)' }));
  assert.deepEqual(r.errors, []);
});
test('links inside code fences and inline code are ignored', () => {
  const r = validate(fixture({ md: '```\n[x](./missing.md)\n```\nand `[y](./gone.md)`' }));
  assert.deepEqual(r.errors, []);
});
```

- [ ] **Step 3: 실패 확인.** Run: `npm test`. Expected: FAIL, `Cannot find module '../scripts/validate-data.mjs'`.

- [ ] **Step 4: 구현** `scripts/validate-data.mjs`

```js
#!/usr/bin/env node
// Validates data packs, the source registry, decision records and markdown links.
// No dependencies. Usage: node scripts/validate-data.mjs [rootDir]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORD_FIELDS = ['id','value','unit','source_id','table','page','population','denominator','year','checked_on','confidence','note'];
export const SOURCE_FIELDS = ['id','title','publisher','year','url','checked_on'];
export const CONFIDENCE = ['verified','indexed','assumed'];
export const DECISION_HEADINGS = ['## 상태','## 맥락','## 결정','## 결과'];
export const NARRATIVE_FIELDS = ['id','track','stage','theme','summary','quote','source_id','page_or_url','year','checked_on','confidence'];
export const TRACKS = ['인문사회','이공'];
const RATIO_UNITS = ['ratio','percent'];
const QUOTE_MAX_WORDS = 15;

function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== '.git') walk(p, pred, out); }
    else if (pred(p)) out.push(p);
  }
  return out;
}

export function validate(root) {
  const errors = [];
  const regPath = join(root, 'data/sources/registry.json');
  const sources = existsSync(regPath) ? readJson(regPath) : [];
  const ids = new Set();
  sources.forEach((s, i) => {
    for (const f of SOURCE_FIELDS) if (!(f in s)) errors.push(`registry[${i}]: missing ${f}`);
    if (s.id) { if (ids.has(s.id)) errors.push(`registry: duplicate id ${s.id}`); ids.add(s.id); }
  });
  for (const file of walk(join(root, 'data/packs'), p => p.endsWith('records.json'))) {
    const rel = file.slice(root.length + 1);
    const recs = readJson(file);
    if (!Array.isArray(recs)) { errors.push(`${rel}: not an array`); continue; }
    const seen = new Set();
    const isNarrative = /[\\/]narratives[\\/]/.test(file);
    recs.forEach((r, i) => {
      const at = `${rel}[${i}]`;
      if (isNarrative) {
        for (const f of NARRATIVE_FIELDS) if (!(f in r)) errors.push(`${at}: missing ${f}`);
        if (!TRACKS.includes(r.track)) errors.push(`${at}: track must be one of ${TRACKS.join('|')}`);
        if (typeof r.quote === 'string' && r.quote.trim() && r.quote.trim().split(/\s+/).length > QUOTE_MAX_WORDS) errors.push(`${at}: quote exceeds ${QUOTE_MAX_WORDS} words`);
        if (!ids.has(r.source_id)) errors.push(`${at}: unknown source_id ${r.source_id}`);
        if (!CONFIDENCE.includes(r.confidence)) errors.push(`${at}: confidence must be one of ${CONFIDENCE.join('|')}`);
        if (r.id) { if (seen.has(r.id)) errors.push(`${at}: duplicate id ${r.id}`); seen.add(r.id); }
        return;
      }
      for (const f of RECORD_FIELDS) if (!(f in r)) errors.push(`${at}: missing ${f}`);
      if (typeof r.value !== 'number') errors.push(`${at}: value must be a number`);
      if (!ids.has(r.source_id)) errors.push(`${at}: unknown source_id ${r.source_id}`);
      if (!CONFIDENCE.includes(r.confidence)) errors.push(`${at}: confidence must be one of ${CONFIDENCE.join('|')}`);
      if (RATIO_UNITS.includes(r.unit) && !r.denominator) errors.push(`${at}: ${r.unit} needs denominator`);
      if (r.id) { if (seen.has(r.id)) errors.push(`${at}: duplicate id ${r.id}`); seen.add(r.id); }
    });
  }
  for (const file of walk(join(root, 'docs/design/decisions'), p => /[\\/][0-9]{4}-[^\\/]+\.md$/.test(p))) {
    const text = readFileSync(file, 'utf8');
    for (const h of DECISION_HEADINGS) if (!text.includes(h)) errors.push(`${file.slice(root.length + 1)}: missing heading ${h}`);
  }
  for (const file of walk(join(root, 'docs'), p => p.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const clean = target.split('#')[0];
      if (!existsSync(resolve(dirname(file), clean))) errors.push(`${file.slice(root.length + 1)}: broken link ${target}`);
    }
  }
  return { errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const { errors } = validate(root);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('validate-data: ok');
}
```

- [ ] **Step 5: 통과 확인.** Run: `npm test`. Expected: 14 pass.

- [ ] **Step 6: 출처 등록부** `data/sources/registry.json` — v3.5가 인용한 두 출처를 시드로.

```json
[
  { "id": "krivet-2025-phd-jobs", "title": "국내 신규 박사학위 취득자의 특성 및 일자리 변화", "publisher": "한국직업능력연구원(KRIVET)", "year": 2025, "url": "https://krivet.re.kr/kor/sub.do?menuSn=23&pstNo=NH0000000325", "checked_on": "2026-10-13", "note": "2021–2024 박사조사. 응답자 45,561명. 졸업자 조사이며 입학자 종단조사가 아님." },
  { "id": "kistep-2024-st-indicators", "title": "2023 이공계인력 지표집", "publisher": "한국과학기술기획평가원(KISTEP)", "year": 2024, "url": "https://www.hrstpolicy.re.kr/kistep/upload/file/202406177_1397100000.pdf", "checked_on": "2026-10-13", "note": "2022년 국내 신규 박사 조사 재분석. 외국인 제외." }
]
```

- [ ] **Step 7: 스키마 문서** `data/schema/record.schema.json`, `source.schema.json` — JSON Schema draft-07 형식으로 위 필드·enum을 기술(검증기는 자체 검사를 쓰고 스키마는 ChatGPT·사람 참고용). `record.schema.json`의 `required`는 `RECORD_FIELDS` 12개 전부, `confidence.enum`은 3값.

- [ ] **Step 8: 빈 팩 6개 + narratives 2개** — 각 `data/packs/<pack>/records.json`은 `[]`. `narratives/humanities-social/records.json`, `narratives/stem/records.json`도 `[]`. `narratives/README.md`에 저작권 규율(원문 저장 금지, quote 15단어 이하 1개, summary는 상황·갈등·선택·결과 구조만, 창작 표시)과 `stage` 값 목록(`admission, coursework, qualifying, first-paper, funding, thesis, defense, early-career, mid-career, retirement`), `theme` 자유 태그. 또한 `data/schema/narrative.schema.json`을 추가한다. 각 `README.md`는: 팩 목적(spec §5 표의 해당 행), 1차 출처 계급, 레코드 `id` 명명 규칙(`<pack>-<topic>-<key>` 예: `statistics-employed-cs`), 담당 issue 링크 자리(`issue: #N`은 Task 7 후 기입). `schools/README.md`에는 가상 표시명 매핑 표 20행을 `docs/oracle/v35-recon.md`가 아닌 school-names 조사 결과에서 옮긴다: snu 서월대학교, kaist 한국과제기술원(KQIST), postech 포옹공과대학교(POSTASK), gist 광주과제기술원(GQIST), dgist 대구경북과제기술원(DGQIST), unist 울산과제기술원(UQIST), yonsei 연새대학교, korea 고래대학교, skku 성균원대학교, hanyang 한냥대학교, sogang 서광대학교, khu 경이대학교, ewha 이파여자대학교, cau 중양대학교, konkuk 건귤대학교, uos 서월시립대학교, pusan 부싼대학교, knu 경붓대학교, jnu 전낭대학교, cnu 충낭대학교.

- [ ] **Step 9: 실제 repo 검증.** Run: `npm run validate`. Expected: `validate-data: ok` (링크 검사는 Task 6까지 끝난 뒤 다시 실행해 확인).

- [ ] **Step 10: Commit**

```bash
git add package.json scripts/validate-data.mjs tests data
git commit -m "feat: data validator, source registry, empty packs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: CI 워크플로우·issue 템플릿·PR 템플릿

**Files:**
- Create: `.github/workflows/validate-data.yml`, `.github/workflows/test.yml`
- Create: `.github/ISSUE_TEMPLATE/stat-collection.yml`, `design-decision.yml`, `wave-task.yml`, `bug.yml`, `config.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: `validate-data.yml`**

```yaml
name: validate-data
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm run validate
```

- [ ] **Step 2: `test.yml`** — 같은 골격, `run: npm test`.

- [ ] **Step 3: `stat-collection.yml`** (GitHub issue form)

```yaml
name: 통계 수집
description: 데이터 팩 한 주제를 별도 세션에서 수집한다 (issue 1건 = 세션 1개 = worktree 1개 = PR 1개)
title: "[stats] <pack>/<topic>"
labels: ["wave/2", "chatgpt-ready"]
body:
  - type: input
    id: pack
    attributes: { label: 대상 팩 파일, placeholder: data/packs/salaries/records.json }
    validations: { required: true }
  - type: textarea
    id: scope
    attributes: { label: 수집 범위, description: 어떤 수치를, 어떤 분해(분야·연도·기관)로 }
    validations: { required: true }
  - type: textarea
    id: sources
    attributes: { label: 후보 출처, description: 발행처·제목·연도·URL. registry.json에 없으면 함께 추가 }
    validations: { required: true }
  - type: input
    id: branch
    attributes: { label: worktree 브랜치, placeholder: stats/salaries-public-researcher }
    validations: { required: true }
  - type: checkboxes
    id: acceptance
    attributes:
      label: 수용 체크리스트
      options:
        - label: 모든 레코드에 12개 필드가 있고 `npm run validate`가 통과한다
        - label: 비율 레코드에 분모·모집단이 적혀 있다
        - label: 출처 캐비앗(조사 한계)을 note에 옮겼다
        - label: 추정값은 confidence=assumed로 표시했다
        - label: 세션 종료 시 handoff 댓글을 남겼다
  - type: dropdown
    id: model
    attributes:
      label: 권장 모델·effort
      options: ["sonnet / Sol · medium", "haiku / Luna · low", "opus / Sol · high", "fable / Astra · high"]
```

- [ ] **Step 4: `design-decision.yml`** — 필드: 제목, 맥락(textarea, required), 선택지(textarea), 추천(textarea), 영향 받는 팩/문서(input). labels `["needs-judge"]`. title `"[adr] <topic>"`.

- [ ] **Step 5: `wave-task.yml`** — 필드: wave 번호(dropdown 0–6), 체크리스트 항목(input), 산출 파일(input), 완료 조건(textarea required), 권장 모델·effort(dropdown, Step 3과 동일). title `"[wave N] <task>"`.

- [ ] **Step 6: `bug.yml`** — 재현 단계, 기대, 실제, 환경. labels `["area/engine"]` 없이 비움(사람이 붙임).

- [ ] **Step 7: `config.yml`** — `blank_issues_enabled: false`, contact link로 `docs/workflow.md`.

- [ ] **Step 8: `pull_request_template.md`**

```markdown
## 연결 issue
Closes #

## 바뀐 것

## 체크리스트
- [ ] `npm run validate` 통과
- [ ] `npm test` 통과
- [ ] 새 수치는 모두 source_id·denominator·checked_on 있음
- [ ] 설계 선택이 있으면 결정 기록 추가/갱신
- [ ] `docs/waves/STATUS.md` 갱신
- [ ] 세션 handoff 댓글을 issue에 남김
```

- [ ] **Step 9: Commit**

```bash
git add .github
git commit -m "ci: validate-data and test workflows, issue and PR templates

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Wave 파일 7개와 STATUS 보드

**Files:**
- Create: `docs/waves/STATUS.md`, `docs/waves/README.md`
- Create: `docs/waves/wave-00-planning.md`, `wave-01-taxonomy-sources.md`, `wave-02-statistics-packs.md`, `wave-03-engine-spec.md`, `wave-04-engine-impl.md`, `wave-05-ui-narrative.md`, `wave-06-balance-retro.md`

**Interfaces:**
- Produces: 각 wave 파일의 섹션 순서(아래). Task 7 issue 본문이 wave 파일의 체크리스트 항목을 가리킨다.

- [ ] **Step 1: `docs/waves/README.md`** — wave 파일 필수 섹션과 self-improve 루프 설명:

```markdown
# Wave 파일 규약
각 wave 파일은 이 순서의 섹션을 가진다.
1. `## 목표`
2. `## 진입 조건` — 이전 wave 종료 조건 그대로
3. `## 체크리스트` — 항목마다 검증 가능한 완료 조건과 담당 issue 번호
4. `## 종료 조건`
5. `## 모델·effort 표` — 역할 | Claude | ChatGPT | effort | 프롬프트 파일
6. `## 회고` — wave 종료 시 작성. 하위 항목: 실패한 체크리스트 항목 / 다음 wave 체크리스트에 추가할 항목 / 프롬프트 수정 diff(파일·줄) / 결정 기록으로 올릴 것
회고의 "추가할 항목"은 다음 wave 파일 체크리스트에 **반드시** 옮긴다. 이것이 self-improve 루프다.
```

- [ ] **Step 2: `wave-00-planning.md`** — 체크리스트는 이 plan의 Task 1~7을 항목으로(각각 완료 조건 = 해당 커밋 존재·CI 통과·issue 번호). 모델표: 전부 main thread(fable), effort high. 회고 섹션은 비워 두되 하위 4항목 헤딩은 둔다.

- [ ] **Step 3: `wave-01-taxonomy-sources.md`** — 체크리스트:
  - NRF 학술연구분야분류 대·중·소 코드 수집(출처 URL, 고시 연도) → `data/packs/taxonomy/records.json`에 코드 레코드(value는 코드 수준 1/2/3, unit `level`)
  - 교육통계 학과 분류(KEDI) ↔ NRF 매핑 표 → `taxonomy/mapping-kedi.json`
  - 게임 트랙 26개 ↔ NRF 소분류 매핑 → `taxonomy/mapping-tracks.json`
  - `registry.json`에 출처 계급 6종(spec §5 표) 최소 1건씩 등록
  - 결정 기록: 분류 기준으로 NRF를 택한 이유
  종료 조건: validate 통과 + 매핑 표에 26개 트랙 전부. 모델표: 수집 sonnet/Sol medium, 매핑 판정 fable/Astra high, 정형화 haiku/Luna low.

- [ ] **Step 4: `wave-02-statistics-packs.md`** — 체크리스트는 issue 단위(각 항목이 Task 7의 issue 하나): schools(20개교 등록금·지원제도), departments(241, 각 학과를 NRF 중·소분류 코드에 연결), venues-journals(SJR·KCI), venues-conferences(CORE), salaries-public(호봉표), salaries-institutes(ALIO), salaries-faculty(대학알리미), salaries-entry(KRIVET 초임·기업), statistics-employment(KRIVET 표 8·9·10 재수집), statistics-progress(KEDI 배출·수료 기간·휴학), statistics-faculty-market(분야별 신규 임용 교원 수·시간강사 수·채용 공고 건수; KEDI 교육통계·대학알리미), narratives-humanities-social(수필·수기·질적 연구 장면 기록), narratives-stem(동일). 각 항목: 완료 조건 "PR 머지 + validate 통과 + README의 issue 링크". 종료 조건: 13개 issue 전부 closed. 모델표 Step 3과 동일 + 재판정 needs-judge.

- [ ] **Step 5: `wave-03-engine-spec.md`** — 체크리스트: 상태 모델 스펙, 선택권 모델 공식(입학 전 6종·결정 지점 7종 각각 확률 근거 레코드 id 명시), 노동시장 모델(시간강사·교수·연구원 공고 확률 = 기준값(statistics-faculty-market) × 수요 계수; 월별 가상 뉴스 이벤트가 수요 계수를 n개월간 조정, 효과 크기와 지속 기간은 결정 기록), v3.5 oracle 비교표(부록 A 공식 vs 우리 공식, 차이 사유), 결정 기록(확률 근거 없는 항목은 assumed 목록). 종료 조건: spec 파일 + 결정 기록 승인. 모델표: 스펙 초안 opus/Sol high, 감사 fable/Astra high.

- [ ] **Step 6: `wave-04-engine-impl.md`** — 체크리스트: TypeScript·Vitest 도입(0001), 순수 함수 `createLife(config, seed)`, `advanceMonth(state)`, `advanceYear(state)`, `decide(state, optionIndex)`, 결정론적 seed 테스트, oracle 스냅샷 테스트, 커버리지 기준(공식 함수 100%). 모델표: 구현 sonnet medium, 리뷰 opus high.

- [ ] **Step 7: `wave-05-ui-narrative.md`** — 체크리스트: 정적 사이트 골격, 1in8b.life 상속 UI(속도·자동·기록·life map·동기 4명·다른 선택 보기), 서사 텍스트 팩(학과별 장면, 친구 research-tracks처럼 창작 명시), 가상 분야 뉴스 텍스트 팩(계열·분야별 월간 뉴스 헤드라인과 수요 효과 태그, 창작 명시), 가상 학교명 표시 함수, 출처 footer. 모델표: 서사 초안 sonnet/Sol medium, UI opus high.

- [ ] **Step 8: `wave-06-balance-retro.md`** — 체크리스트: 1000회 자동 플레이 분포 vs 통계 팩 비교(취업률·수료 기간), 플레이테스트 3인 이상, 회고 → 다음 사이클 wave 파일. 모델표: 분석 sonnet, 판정 fable.

- [ ] **Step 9: `STATUS.md`**

```markdown
# 보드 (PR마다 갱신)
갱신: 2026-10-13

| Wave | 상태 | 열린 issue | 다음 행동 |
|---|---|---|---|
| 0 계획 | 진행 중 (PR #?) | — | PR 머지 |
| 1 분류·출처 | 대기 | #? | issue claim |
| 2 통계 팩 | 대기 | #?… | Wave 1 종료 후 claim |
| 3 엔진 스펙 | 대기 | #? | Wave 2 종료 후 |
| 4~6 | 대기 | — | — |

## 막힌 것
- Sonnet의 ChatGPT 대응 이름 미정 (issue #?)
```
  (`#?`는 Task 7에서 실제 번호로 치환.)

- [ ] **Step 10: Commit**

```bash
git add docs/waves
git commit -m "docs: wave files 00-06 and STATUS board

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 프롬프트 세트

**Files:**
- Create: `docs/prompts/README.md`, `judge-any.md`, `weaver-retro-any.md`, `taxonomy-mapper-wave1.md`, `stat-collector-wave2.md`, `stat-validator-wave2.md`

**Interfaces:**
- Produces: 프롬프트 파일 공통 구조. Task 7 issue 본문이 해당 프롬프트 파일을 링크한다.

- [ ] **Step 1: `README.md`** — 모델 매핑 표(spec §8, Sonnet 행 "확인 필요"), 사용법(ChatGPT: 파일 전체를 붙여넣고 `<<맥락>>` 블록을 채움; Claude: `Agent(model: <표의 값>, effort: <표의 값>)`), 공통 구조 5부: ① 맥락 블록(붙여넣을 것 목록) ② 과제 ③ 출력 계약 ④ 자기 검증 체크리스트 ⑤ handoff 형식(`docs/workflow.md` §5 그대로). effort 조절 규칙: 파일 머리의 `effort:` 줄을 wave 파일 표가 덮어쓴다.

- [ ] **Step 2: `stat-collector-wave2.md`** — 머리: `model: sonnet | Sol(확인 필요)`, `effort: medium`. 맥락 블록: issue 본문, `data/schema/record.schema.json`, `data/sources/registry.json` 발췌, 해당 팩 README. 과제: 후보 출처를 읽고 레코드 초안 작성. 출력 계약: ① `registry.json`에 추가할 출처 JSON 배열 ② `records.json`에 추가할 레코드 JSON 배열(12필드 전부, 비율은 분모) ③ 캐비앗 목록 ④ 확신 없는 값은 `assumed`. 자기 검증: 필드 12개, source_id 일치, 연도·확인일, 표·쪽 번호, 분모. handoff 형식.

- [ ] **Step 3: `stat-validator-wave2.md`** — `model: haiku | Luna`, `effort: low`. 과제: 수집자 출력을 받아 기계 검사(필드 누락·enum·중복 id·분모)와 정형화(id 명명 규칙, 숫자형). 출력: 수정된 JSON + 거부 사유 목록. 판단이 필요한 항목은 `needs-judge`로 표시만.

- [ ] **Step 3b: `narrative-collector-wave2.md`** — `model: sonnet | Sol(확인 필요)`, `effort: medium`. 맥락: `data/packs/narratives/README.md`, 대상 track. 과제: 공개된 수필·수기·인터뷰·질적 연구에서 박사과정·연구자 생활의 장면을 찾아 레코드 초안 작성. 출력 계약: ① registry 출처 배열 ② 서사 레코드 배열(11필드, summary는 상황·갈등·선택·결과, quote 15단어 이하 1개 이하) ③ 시나리오 후보 메모(어느 결정 지점에 쓸 수 있는지). 금지: 원문 문단 복사, 비공개 글, 실명 사적 정보.

- [ ] **Step 4: `taxonomy-mapper-wave1.md`** — `model: sonnet | Sol(확인 필요)`, `effort: medium`. 맥락: NRF 분류표, 트랙 26개 목록(`docs/oracle/v35-recon.md`). 출력: `mapping-tracks.json` 항목(`{track, nrf_code, nrf_name, confidence, note}`). 1:N 매핑은 전부 나열하고 `needs-judge`.

- [ ] **Step 5: `judge-any.md`** — `model: fable | Astra`, `effort: high`. 과제: `needs-judge` 항목 재판정. 출력: 결정 기록 4헤딩 형식 초안 + 판정 근거 + 반대 근거. 금지: 새 데이터 수집.

- [ ] **Step 6: `weaver-retro-any.md`** — `model: opus | Sol`, `effort: high`. 과제: wave 종료 시 회고 섹션 작성. 입력: wave 파일, 닫힌 issue handoff 댓글, PR 목록. 출력: 회고 4하위 항목 + 다음 wave 파일에 넣을 체크리스트 diff.

- [ ] **Step 7: 링크 검사 통과 확인.** Run: `npm run validate`. Expected: `validate-data: ok`. 깨진 링크가 있으면 고친다.

- [ ] **Step 8: Commit**

```bash
git add docs/prompts
git commit -m "docs: prompt set v1 for Claude and ChatGPT roles

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 라벨·issue·PR 등록

**Files:**
- Modify: `docs/waves/STATUS.md` (issue 번호 치환), `data/packs/*/README.md` (issue 링크)

**Interfaces:**
- Consumes: `scripts/setup-labels.sh`(Task 1), issue 템플릿(Task 4), wave 체크리스트(Task 5), 프롬프트 파일(Task 6).

- [ ] **Step 1: 라벨 생성.** Run: `bash scripts/setup-labels.sh`. Expected: 22줄 `label: …`.

- [ ] **Step 2: Wave 1 issue 3건** (`gh issue create --label "wave/1" --label "area/taxonomy"` …): (a) NRF 분류 코드 수집, (b) KEDI 매핑, (c) 트랙 26개 매핑. 본문: 목표, 산출 파일, 완료 조건(wave-01 체크리스트 그대로), 프롬프트 파일 링크, 권장 모델·effort, worktree 브랜치명.

- [ ] **Step 3: Wave 2 통계·서사 issue 13건** — wave-02 체크리스트 항목 하나당 1건. 서사 issue 2건은 프롬프트 `narrative-collector-wave2.md`를 링크하고 저작권 규율을 본문에 반복한다. 라벨 `wave/2`, `area/<pack>`, `chatgpt-ready`. 본문은 stat-collection 템플릿 필드를 채운 형태(대상 팩, 범위, 후보 출처, 브랜치 `stats/<topic>`, 수용 체크리스트, 권장 모델).

- [ ] **Step 4: 결정·스펙 issue 3건** — (a) "Sonnet의 ChatGPT 대응 이름 확정" 라벨 `needs-judge`, `area/workflow`; (b) "Wave 3 엔진·선택권 스펙 작성" 라벨 `wave/3`, `area/engine`; (c) "Wave 3 노동시장·가상 뉴스 모델 스펙" 라벨 `wave/3`, `area/engine` (공고 확률 기준값, 뉴스 효과 크기·지속 기간, 창작 표시).

- [ ] **Step 5: 번호 치환.** `STATUS.md`의 `#?`와 각 팩 README의 `issue: #N`을 실제 번호로. Run: `npm run validate`. Expected ok.

- [ ] **Step 6: Commit + push + PR.**

```bash
git add docs/waves/STATUS.md data/packs
git commit -m "docs: link issues into STATUS board and pack READMEs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin wave-0/planning
gh pr create --title "Wave 0: planning, collaboration contract, data validator, issue set" --body-file <PR 본문: 템플릿 채움 + 🤖 Generated with [Claude Code](https://claude.com/claude-code)>
```

- [ ] **Step 7: CI 확인.** Run: `gh pr checks --watch`. Expected: validate-data, test 모두 pass. 실패하면 고치고 다시 push.

- [ ] **Step 8: STATUS.md의 Wave 0 행에 PR 번호 기입 후 커밋·push.**

---

## Self-Review

- **Spec coverage:** §3 구조 → Task 1·3·4·5·6; §4 선택권 → ADR 0005 + wave-03; §5 데이터 규율 → Task 3; §6 wave → Task 5; §7 hold-safe → Task 1·4·7; §8 모델·프롬프트 → Task 6; §9 검증 → Task 3·4; §10 위험 → ADR 0002·0003·0004. 누락 없음.
- **Placeholder scan:** `#?`는 Task 7 Step 5가 치환하는 명시적 자리표시자. "확인 필요"는 spec이 정한 표기.
- **Type consistency:** `validate(root) → {errors}`, `RECORD_FIELDS` 12개, `CONFIDENCE` 3값이 Task 3·4·6에서 동일.
- **Review Focus:** 5항목 모두 Task 3 테스트에 있음.
