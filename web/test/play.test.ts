// 진행 화면(#55): 결정 지점 정지, 속도·자동 모드, 연구노트 최신순, 인생 지도 칸 수, 문자열 표가 엔진 키를 모두 덮는지.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSUMED, createLife, decide, newSeed, policyDecision, type LifeState, type Paper } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { BASE_MS, SPEEDS, autoRuleText, statusLine, decisionView, halted, intervalMs, ledgerRows, lifeMap, moneyView, noteText, notes, optionKey, setAuto, step, wonText } from '../src/play';
import { ko } from '../src/strings.ko';
import { paperView, statBars, venueLabel, workView } from '../src/view';

const data = loadData();
const CAP = 12 * 90;

/** 결정 지점이 걸릴 때까지 진행한다(자동 꺼짐, 포커스 유지). */
function untilPending(seed: string): LifeState {
  let s = createLife({}, newSeed(seed), data);
  while (!halted(s) && s.month < CAP) s = step(s, data);
  return s;
}

/** 사람이 고르듯 끝까지: 결정마다 화면 보기를 만들고 정책 번호로 고른다. 매 상태를 visit 에 넘긴다. */
function playManual(seed: string, visit: (s: LifeState) => void): LifeState {
  let s = createLife({}, newSeed(seed), data);
  visit(s);
  while (s.stage !== 'end' && s.month < CAP) {
    if (s.pending) s = decide(s, data, policyDecision(s, data, s.pending));
    else s = step(s, data);
    visit(s);
  }
  return s;
}

describe('stepping and decision stops (#55)', () => {
  const s = untilPending('play-pending');

  it('reaches a decision point and stops there', () => {
    expect(s.pending).not.toBeNull();
    expect(halted(s)).toBe(true);
  });

  it('does not call the engine while a decision is pending (same object back)', () => {
    expect(step(s, data)).toBe(s);
    expect(step(s, data, 'research')).toBe(s);
  });

  it('decision view has a prompt and one labelled option per engine option', () => {
    const v = decisionView(s, data, ko);
    expect(v.prompt.length).toBeGreaterThan(0);
    expect(v.options.map(o => o.key)).toEqual(s.pending!.options.map(o => o.key));
    for (const o of v.options) expect(o.label).toBe(ko.texts[optionKey(s.pending!, o.key) as keyof typeof ko.texts]);
    for (const o of v.options) if (o.unavailable) expect(o.hint).toBeUndefined();
  });

  it('turning auto on closes the open decision by policy', () => {
    const a = setAuto(s, data, true);
    expect(a.pending).toBeNull();
    expect(a.auto).toBe(true);
    expect(a.decisions.at(-1)).toMatchObject({ dp: s.pending!.dp, byPolicy: true });
    expect(setAuto(a, data, false).auto).toBe(false);
  });

  it('an ended life does not step', () => {
    const end = { ...s, pending: null, stage: 'end' as const };
    expect(step(end, data)).toBe(end);
  });

  it('thesis focus before qualifying is ignored instead of throwing', () => {
    const s0 = createLife({}, newSeed('play-thesis'), data);
    expect(() => step(s0, data, 'thesis')).not.toThrow();
  });
});

describe('speed and auto rule (#55)', () => {
  it('has five speeds 1× to 16×, each twice as fast as the last', () => {
    expect([...SPEEDS]).toEqual([1, 2, 4, 8, 16]);
    expect(SPEEDS.map(intervalMs)).toEqual([BASE_MS, BASE_MS / 2, BASE_MS / 4, BASE_MS / 8, BASE_MS / 16]);
  });

  it('auto rule text carries the policy constants', () => {
    const text = autoRuleText(ko);
    expect(text).not.toMatch(/[{}]/);
    expect(text).toContain(String(ASSUMED.POLICY.restThreshold));
    expect(text).toContain(String(ASSUMED.POLICY.writeP));
    for (const p of Object.values(ASSUMED.POLICY.postQualFocus)) expect(text).toContain(String(p));
  });
});

describe('research notes and life map (#55)', () => {
  it('notes are newest first, skip the monthly filler line, and keep the creative mark', () => {
    let s = createLife({ auto: true }, newSeed('play-notes'), data);
    while (s.stage === 'phd' && s.month < 30) s = step(s, data);
    const list = notes(s, ko).filter(n => !n.scene);   // 장면 줄(#57)은 scenes.test.ts 가 본다
    const expected = s.log.filter(e => e.textKey !== 'log.month').reverse();
    expect(list.map(n => n.month)).toEqual(expected.map(e => e.month));
    expect(list.map(n => n.creative)).toEqual(expected.map(e => e.creative));
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.month).toBeGreaterThanOrEqual(list[i]!.month);
    expect(s.log.some(e => e.textKey === 'log.month')).toBe(true);
  });

  // 기본 상수에서 자동 생애 대부분이 박사과정 중 재정 파탄으로 끝난다(Wave 6 보정 대상). 경력까지 가는 seed 21·29 를 넣었다.
  const MAP_SEEDS = [0, 2, 13, 21, 29];
  it(`life map cells equal months in the PhD and years after it, at every step of ${MAP_SEEDS.length} lives`, () => {
    let careerLives = 0;
    for (const i of MAP_SEEDS) {
      let s = createLife({ auto: true }, newSeed(`play-map${i}`), data);
      let years = 0;
      while (s.stage !== 'end' && s.month < CAP) {
        const wasPhd = s.stage === 'phd';
        s = step(s, data);
        if (!wasPhd) years += 1;
        const m = lifeMap(s);
        if (s.career) {
          expect(m.phdMonths).toBe(s.career.degreeMonth);
          expect(m.careerYears).toBe(years);
        } else {
          expect(m).toEqual({ phdMonths: s.month, careerYears: 0 });
        }
      }
      if (s.career) careerLives += 1;
    }
    expect(careerLives).toBe(MAP_SEEDS.length);   // 학위 없이 끝나도 경력으로 이어지므로(#85) 모든 생애가 경력 칸에 닿는다
  });
});

describe('text coverage (#55)', () => {
  const root = resolve(__dirname, '../..');
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));

  it('every literal log/decision key in engine/src has a text', () => {
    const keys = new Set<string>();
    for (const f of walk(join(root, 'engine', 'src'))) {
      for (const m of readFileSync(f, 'utf8').matchAll(/['`]((?:log|decision|leave|life)\.[a-z0-9.-]*[a-z0-9])['`]/g)) keys.add(m[1]!);
    }
    expect(keys.size).toBeGreaterThan(15);
    expect([...keys].filter(k => !Object.hasOwn(ko.texts, k))).toEqual([]);
  });

  it('every decision point, outcome and option has a text and a prompt', () => {
    const table: [string, string[], string[]][] = [
      ['post-qualifying', ['pass', 'fail'], ['A', 'B', 'C']],
      ['first-paper-verdict', ['accept', 'revise', 'reject'], ['A', 'B', 'C']],
      ['funding-expiry', [''], ['A', 'B', 'C', 'D']],
      ['pre-graduation-path', [''], ['A', 'B', 'C', 'D']],
      ['career-5y', [''], ['A', 'B', 'C', 'D']],
      ['career-10y', [''], ['A', 'B', 'C', 'D']],
      ['pre-retirement', [''], ['A', 'B', 'C']],
    ];
    const missing: string[] = [];
    for (const [dp, outcomes, keys] of table) {
      for (const o of outcomes) {
        const p = o ? `${dp}.${o}` : dp;
        if (!Object.hasOwn(ko.play.prompts, p)) missing.push(`prompt ${p}`);
        for (const k of keys) if (!Object.hasOwn(ko.texts, `decision.${p}.${k}`)) missing.push(`decision.${p}.${k}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('notes and decision screens of 8 played lives resolve every key', () => {
    const dps = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const s = playManual(`play-cover${i}`, st => {
        if (st.pending) { dps.add(st.pending.dp); expect(() => decisionView(st, data, ko)).not.toThrow(); }
      });
      for (const e of s.log) expect(() => noteText(e, ko)).not.toThrow();
    }
    expect(dps.size).toBeGreaterThanOrEqual(3);
  });
});

describe('money card', () => {
  it('the preview for the next tick equals the ledger the tick writes (stipend, family, living, tuition)', () => {
    let checked = 0;
    for (let k = 0; k < 6; k++) {
      let s = createLife({}, newSeed(`money-${k}`), data);
      for (let i = 0; i < 40 && s.stage === 'phd' && !s.pending; i++) {
        const v = moneyView(s, data);
        const before = s.ledger.length;
        const month = s.month;
        s = step(s, data);
        if (s.stage !== 'phd' && s.stage !== 'end') break;
        const added = s.ledger.slice(before).filter(e => e.month === month + 1);   // 틱은 월을 먼저 올리고 정산한다
        const sum = (kind: string) => added.filter(e => e.kind === kind).reduce((a, e) => a + e.amount, 0);
        expect(sum('stipend')).toBe(v.flow!.stipend);
        expect(sum('family')).toBe(v.flow!.family);
        expect(sum('living') + 0).toBe(0 - v.flow!.living + 0);
        expect(sum('tuition') + 0).toBe(0 - v.flow!.tuition + 0);   // -0 과 +0 을 같게 본다
        expect(v.flow!.netWithTuition).toBe(v.flow!.net - v.flow!.tuition);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('#96: after the PhD the preview for the next month equals the first month the year tick settles', () => {
    let checked = 0;
    for (let k = 0; k < 40 && checked < 20; k++) {
      let s = createLife({ auto: true }, newSeed(`money-career-${k}`), data);
      while (s.stage === 'phd') s = step(s, data);
      for (let y = 0; y < 30 && (s.stage === 'career' || s.stage === 'retired'); y++) {
        const v = moneyView(s, data);
        expect(v.flow).toBeUndefined();
        const f = v.careerFlow!;
        const hiring = s.stage === 'career' && s.career!.searching !== undefined;   // 그달 채용되면 급여가 바뀐다
        const before = s.ledger.length, month = s.month;
        s = step(s, data);
        if (hiring) continue;
        const first = s.ledger.slice(before).filter(e => e.month === month + 1);
        const sum = (...kinds: string[]) => first.filter(e => kinds.includes(e.kind)).reduce((a, e) => a + e.amount, 0);
        expect(sum('pay')).toBe(f.pay);
        expect(sum('pension')).toBe(f.pension);
        expect(sum('living') + 0).toBe(0 - f.living + 0);
        expect(sum('interest') + 0).toBe(0 - f.interest + 0);
        expect(sum('repay') + 0).toBe(0 - f.repay + 0);
        expect(sum('loan')).toBe(f.loan);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it('#96: ledgerRows puts pay, pension and repayment in their own columns', () => {
    let s = createLife({ auto: true }, newSeed('money-career-rows'), data);
    while (s.stage === 'phd' || (s.stage === 'career' && s.career!.route === 'none')) s = step(s, data);
    const rows = ledgerRows(s, 1000);
    const total = (kind: string) => s.ledger.filter(e => e.kind === kind).reduce((a, e) => a + e.amount, 0);
    expect(rows.reduce((a, r) => a + r.pay, 0)).toBe(total('pay'));
    expect(rows.reduce((a, r) => a + r.repay, 0)).toBe(total('repay'));
    expect(rows.reduce((a, r) => a + r.work, 0)).toBe(s.ledger.filter(e => ['work', 'leave-work', 'network-cost', 'part-time', 'lecture'].includes(e.kind)).reduce((a, e) => a + e.amount, 0));
  });

  it('cash and debt come from the life; ledgerRows is newest first and sums by kind', () => {
    let s = createLife({}, newSeed('money-rows'), data);
    for (let i = 0; i < 14 && !halted(s); i++) s = step(s, data);
    const v = moneyView(s, data);
    expect(v.cash).toBe(s.money.cash);
    expect(v.debt).toBe(s.money.debt);
    const rows = ledgerRows(s, 12);
    expect(rows.length).toBeLessThanOrEqual(12);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.month).toBeGreaterThan(rows[i]!.month);
    const living = s.ledger.filter(e => e.kind === 'living').reduce((a, e) => a + e.amount, 0);
    expect(ledgerRows(s, 1000).reduce((a, r) => a + r.living, 0)).toBe(living);
  });

  it('wonText shows man-won with one decimal at most', () => {
    expect(wonText(12_345_000, ko)).toBe('1,234.5만 원');
    expect(wonText(-1_300_000, ko)).toBe('-130만 원');
    expect(wonText(0, ko)).toBe('0만 원');
  });
});

describe('stat bars (#89)', () => {
  it('splits each bar into an unchanged part and a changed part, and signs the delta', () => {
    const s = createLife({ track: 'computer' }, newSeed('bars'), data);
    const prev = { ...s.stats, health: s.stats.health + 5, mind: s.stats.mind - 3 };
    const bars = statBars(s, prev, ko);
    const h = bars.find(b => b.key === 'health')!, m = bars.find(b => b.key === 'mind')!;
    expect(h.delta).toBe(-5); expect(h.base).toBe(h.pct); expect(h.changed).toBe(5);
    expect(m.delta).toBe(3); expect(m.base).toBeCloseTo(m.pct - 3); expect(m.changed).toBe(3);
    expect(statBars(s, undefined, ko).every(b => b.delta === 0 && b.changed === 0)).toBe(true);
  });
});

describe('paper view (#105)', () => {
  it('lists drafts with writing progress, subfield as topic and accepted-over-required', () => {
    const s0 = createLife({ track: 'computer' }, newSeed('papers'), data);
    expect(s0.phd).toBeDefined();
    const s = { ...s0, phd: { ...s0.phd!, papers: [
      { id: 'p1', status: 'accepted' as const, writing: 100, quality: 1, attempts: 1, logitBonus: 0 },
      { id: 'p2', status: 'draft' as const, writing: 37.4, quality: 0, attempts: 0, logitBonus: 0 },
    ] } };
    const v = paperView(s, ko, data)!;
    expect(v.accepted).toBe(1);
    expect(v.required).toBe(s0.phd!.requiredPapers);
    expect(v.rows.map(r => r.value)).toEqual([100, 37]);
    expect(v.rows[1]!.status).toBe(ko.play.papers.status.draft);
    expect(v.rows[1]!.venue).toBe(ko.play.papers.notYet);
    expect(v.rows[0]!.topic.length).toBeGreaterThan(0);
  });
});

describe('venue label (user rule 2026-10-15: no real venue names, quartiles only)', () => {
  it('shows Q1–Q4 from the tier and the venue kind, never the venue record name', () => {
    const P = ko.play.papers;
    const paper = (tier: Paper['tier'], venueId?: string): Paper => ({ id: 'p', status: 'submitted', writing: 100, quality: 50, attempts: 1, logitBonus: 0, tier, ...(venueId ? { venueId } : {}) });
    expect(venueLabel(paper('T1', 'venues-conf-x-core-rank'), ko)).toBe(`Q1 ${P.venueKind.conference}`);
    expect(venueLabel(paper('T3', 'venues-journal-y-kci'), ko)).toBe(`Q3 ${P.venueKind.journal}`);
    expect(venueLabel(paper('T2'), ko)).toBe(`Q2 ${P.venueKind.journal}`);
  });
});

describe('work view (#110)', () => {
  it('subtracts part-time hours and half the participation from growth, and caps part-time at 40 - duty - participation', () => {
    const s = createLife({ track: 'computer' }, newSeed('work'), data);
    expect(s.phd).toBeDefined();
    const base = workView(s, data)!;
    expect(base.cap).toBeGreaterThanOrEqual(0);
    expect(base.growth).toBeLessThanOrEqual(1);
    expect(base.growth).toBeCloseTo(Math.max(0, 1 - base.weekHours / 40 - base.participation / 2));
    const job = workView(s, data, { partTime: { kind: 'job', hours: Math.min(10, base.cap) } })!;
    expect(job.weekHours).toBe(Math.min(10, base.cap));
    expect(job.growth).toBeLessThanOrEqual(base.growth);
    // 상한을 넘기는 초안은 무시하고 지금 값을 보이며, 버려졌음을 알린다
    const over = workView(s, data, { partTime: { kind: 'job', hours: 999 } })!;
    expect(over.weekHours).toBe(base.weekHours);
    expect(over.cleared).toBe(true);
    expect(base.cleared).toBe(false);
  });
});

describe('status line (#83)', () => {
  const S = ko.play.status;
  const life = (): LifeState => createLife({ auto: true }, newSeed('status-line'), data);
  const phdAt = (enrolledMonths: number, extra: Partial<NonNullable<LifeState['phd']>> = {}): LifeState => {
    const s = life();
    return { ...s, phd: { ...s.phd!, enrolledMonths, coursework: enrolledMonths < ASSUMED.COURSEWORK_MONTHS, ...extra } };
  };
  const careerOf = (s: LifeState, c: Partial<NonNullable<LifeState['career']>>): LifeState => ({
    ...s, stage: 'career', month: 100,
    career: { degreeMonth: 90, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0, ...c },
  });

  it('counts semesters from enrolled months, and shows leave and completed coursework', () => {
    expect(statusLine(phdAt(0), ko)).toBe('박사과정 1학기 재학');
    expect(statusLine(phdAt(13), ko)).toBe('박사과정 3학기 재학');
    expect(statusLine(phdAt(13, { leave: { active: true, until: 20, totalMonths: 1 } }), ko)).toBe('박사과정 3학기 · 휴학 중');
    expect(statusLine(phdAt(ASSUMED.COURSEWORK_MONTHS), ko)).toBe(`박사수료 (${ASSUMED.COURSEWORK_MONTHS / 6 + 1}학기째)`);
  });

  it('shows the search after a degree, after a master exit, and after leaving the PhD', () => {
    const s = life();
    expect(statusLine(careerOf(s, { searching: { routes: ['postdoc'], since: 90, penalty: 1 } }), ko)).toBe(S.searching);
    expect(statusLine(careerOf(s, { degree: 'master-exit', searching: { routes: ['industry'], since: 90, penalty: 1 } }), ko)).toBe(S.searchingAfterMaster);
    expect(statusLine(careerOf(s, { degree: 'none', searching: { routes: ['industry'], since: 90, penalty: 1 } }), ko)).toBe(S.searchingAfterDropout);
    expect(statusLine({ ...careerOf(s, { searching: { routes: ['postdoc'], since: 100, penalty: 1 } }), month: 90 }, ko)).toBe(`${S.degree} · ${S.searching}`);
  });

  it('names the job: route, employer, regular or not, year in route, and the contract end for contract jobs', () => {
    const s = life();
    expect(statusLine(careerOf(s, { route: 'industry', employer: { kind: 'company' }, yearsInRoute: 2 }), ko)).toBe('기업 · 기업 · 정규직 · 3년째');
    expect(statusLine(careerOf(s, { route: 'professor', employer: { kind: 'university' } }), ko)).toBe('교수 · 대학 · 정규직 · 1년째');
    // 0개월째 = 2027년 3월 → 118개월째 = 2037년 1월
    expect(statusLine(careerOf(s, { route: 'postdoc', employer: { kind: 'university' }, contractUntil: 118 }), ko)).toBe('박사후연구원 · 대학 · 비정규직 · 1년째 · 계약 2037년 1월까지');
    expect(statusLine(careerOf(s, { route: 'bridge', employer: { kind: 'company' } }), ko)).toBe('임시직 · 기업 · 비정규직 · 1년째');
    expect(statusLine(careerOf(s, { route: 'startup', employer: { kind: 'self' } }), ko)).toBe('창업 · 자기 사업 · 자영 · 1년째');
  });

  it('covers retirement and the end of the record', () => {
    const s = life();
    expect(statusLine({ ...s, stage: 'retired' }, ko)).toBe(S.retired);
    expect(statusLine({ ...s, stage: 'end', end: { reason: 'financial', month: 40 } }, ko)).toBe('기록 종료 · 재정 파탄');
    expect(statusLine({ ...s, stage: 'pre' }, ko)).toBe(S.pre);
  });
});
