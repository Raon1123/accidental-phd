import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { ACADEMIC_ROUTES } from '../src/career/pay';
import { applyHire } from '../src/career/labor';
import { loadData } from '../src/data/load';
import { decide, extensionProbability, fundingExpired, optionUnavailable } from '../src/decide';
import { odds, z } from '../src/odds';
import { advanceMonth } from '../src/index';
import { checkTriggers } from '../src/phd/triggers';
import { createLife } from '../src/pre/createLife';
import { draw } from '../src/rng';
import type { LifeConfig, LifeState, MonthInput, Paper, PhdState, Stats, Tier } from '../src/types';

const data = loadData();
const SEED = 'APHD-TICK0001';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };
const ENG: LifeConfig = { group: '이공', track: 'computer', school: 'snu' };
const HUM: LifeConfig = { group: '인문사회', track: 'philosophy', school: 'snu' };

const SELF = { route: 'self' as const, monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] as string[] };
interface Over { phd?: Partial<PhdState>; stats?: Partial<Stats>; month?: number; top?: Partial<LifeState> }
/** 평균 능력치로 맞춘 박사과정 상태. phd·top 으로 필드를 덮어쓴다. */
function make(config: LifeConfig, over: Over = {}, seed = SEED): LifeState {
  const s = createLife(config, seed, data);
  // 자금은 기한 없는 자비로 고정한다: 무작위 장려금의 기한(24·48개월)이 다른 결정 지점을 끼워 넣지 않게.
  return { ...s, month: over.month ?? s.month, stats: { ...MEAN, ...over.stats }, ...over.top, phd: { ...s.phd!, fundingState: { ...SELF }, ...over.phd } };
}
const seedOf = (prefix: string, i: number): string => `APHD-${prefix}${String(i).padStart(4, '0')}`;
/** pred 를 만족하는 첫 seed. 못 찾으면 던진다(테스트가 seed 운에 기대지 않도록 결정론적으로 고른다). */
function findSeed(prefix: string, pred: (seed: string) => boolean, max = 600): string {
  for (let i = 0; i < max; i++) { const sd = seedOf(prefix, i); if (pred(sd)) return sd; }
  throw new Error(`no seed found for ${prefix}`);
}
const paper = (id: string, over: Partial<Paper> = {}): Paper =>
  ({ id, status: 'accepted', writing: 100, quality: 70, tier: 'T1', attempts: 1, submittedMonth: 5, logitBonus: 0, ...over });
const ticks = (s: LifeState, n: number, input?: MonthInput): LifeState => { let x = s; for (let i = 0; i < n && x.stage === 'phd'; i++) x = advanceMonth(x, data, input); return x; };
/** 걸린 결정 지점마다 고를 수 있는 첫 선택지(또는 pick 번째)를 골라 해결한다. */
const settle = (s: LifeState, pick = 0): LifeState => {
  let x = s;
  while (x.pending) {
    const open = x.pending.options.map((o, i) => [o, i] as const).filter(([o]) => !optionUnavailable(x, x.pending!, o.key));
    x = decide(x, data, (open[Math.min(pick, open.length - 1)] ?? open[0]!)[1]);
  }
  return x;
};
const play = (s: LifeState, n: number, input?: MonthInput, pick = 0): LifeState => { let x = s; for (let i = 0; i < n && x.stage === 'phd'; i++) x = advanceMonth(settle(x, pick), data, input); return x; };
const ledgerOf = (s: LifeState, month: number) => s.ledger.filter(e => e.month === month);
/** lenient: 대출 한도를 없애 재정 파탄을 끄고 나머지 틱 규칙만 본다(경제 상수 보정 전의 민감도 측정용). */
const runAuto = (config: LifeConfig, seed: string, max: number, lenient = false): { state: LifeState; ticks: number } => {
  let s = createLife({ ...config, auto: true }, seed, data), n = 0;
  if (lenient) s = { ...s, money: { ...s.money, loanLimit: Number.MAX_SAFE_INTEGER } };
  while (s.stage === 'phd' && n < max) { s = advanceMonth(s, data); n++; }
  return { state: s, ticks: n };
};
const opt = (dp: string, key: string) => ({ key, textKey: `decision.${dp}.${key}` });
const A = (dp: string) => opt(dp, 'A'), B = (dp: string) => opt(dp, 'B'), C = (dp: string) => opt(dp, 'C');
const median = (xs: number[]): number | undefined => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : undefined);


/** 학위 없이 박사과정이 끝나면 끝난 이유를 남기고 경력 단계로 넘어가 비학계 경로 구직을 시작한다(#85). */
function expectNoDegreeCareer(s: LifeState, reason: 'dropout' | 'residence' | 'financial', month: number): void {
  expect(s.stage).toBe('career');
  expect(s.end).toEqual({ reason, month });
  expect(s.career).toMatchObject({ degree: 'none', degreeMonth: month, route: 'none' });
  expect(s.career!.searching!.routes).toEqual(['institute', 'public', 'industry', 'bridge']);
  expect(s.log.some(e => e.textKey === `log.end-${reason}` && e.month === month)).toBe(true);
}

describe('advanceMonth guards', () => {
  it('throws while pending (Review Focus 1)', () => {
    const s = { ...make(ENG), pending: { dp: 'post-qualifying' as const, month: 12, context: {}, options: [] } };
    expect(() => advanceMonth(s, data)).toThrow(/pending/);
  });
  it('throws outside the phd stage', () => {
    expect(() => advanceMonth({ ...make(ENG), stage: 'career' }, data)).toThrow(/phd/);
    expect(() => advanceMonth({ ...make(ENG), stage: 'end' }, data)).toThrow(/phd/);
  });
  it('thesis focus before the qualifying exam throws before anything changes', () => {
    const s = make(ENG);
    expect(() => advanceMonth(s, data, { focus: 'thesis' })).toThrow(/qualified/);
    expect(advanceMonth({ ...s, phd: { ...s.phd!, qualified: true } }, data, { focus: 'thesis' }).phd!.focus).toBe('thesis');
  });
  it('does not mutate its input', () => {
    const s = make(ENG, { phd: { papers: [paper('p1', { status: 'submitted', dueMonth: 6 })] } });
    const frozen = structuredClone(s);
    advanceMonth(s, data, { focus: 'write' });
    expect(s).toEqual(frozen);
  });
});

describe('focus input', () => {
  it('records a change in focusHistory at the new month; the same focus again adds nothing', () => {
    const s0 = make(ENG);
    const s1 = advanceMonth(s0, data, { focus: 'rest' });
    expect(s1.phd!.focus).toBe('rest');
    expect(s1.phd!.focusHistory).toEqual([{ from: 0, focus: 'research' }, { from: 1, focus: 'rest' }]);
    const s2 = advanceMonth(s1, data, { focus: 'rest' });
    const s3 = advanceMonth(s2, data);   // 입력이 없으면 유지
    expect(s3.phd!.focusHistory).toHaveLength(2);
    expect(s3.phd!.focus).toBe('rest');
  });
  it('auto mode chooses by policy, an explicit input still wins', () => {
    const s = make(ENG, { stats: { health: 20 }, top: { auto: true } });   // 체력 < 30 → rest
    expect(advanceMonth(s, data).phd!.focus).toBe('rest');
    expect(advanceMonth(s, data, { focus: 'research' }).phd!.focus).toBe('research');
  });
});

describe('tick order (상태 §7.1)', () => {
  it('news(2) → focus income(4) → living and tuition(6) → month log(12), semester boundary month', () => {
    const newsSeed = findSeed('N', sd => draw(sd, 'news', 6, 'arrive') < ASSUMED.NEWS_MONTHLY_P);
    const s0 = make(ENG, { month: 5, phd: { focus: 'work', enrolledMonths: 5 }, top: { newsSeed, auto: false } });
    // 자비·가족 지원 0 으로 두어 원장 순서만 본다
    const s = { ...s0, phd: { ...s0.phd!, fundingState: { ...s0.phd!.fundingState, route: 'self' as const, monthly: 0, tuitionWaiver: 0, until: -1 }, familySupport: 0 } };
    const out = advanceMonth(s, data);
    expect(out.month).toBe(6);
    const kinds = ledgerOf(out, 6).map(e => e.kind);
    expect(kinds.indexOf('work')).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf('work')).toBeLessThan(kinds.indexOf('living'));
    expect(kinds.indexOf('living')).toBeLessThan(kinds.indexOf('tuition'));
    const month6 = out.log.filter(l => l.month === 6);
    const news = month6.findIndex(l => l.tags.includes('news'));
    expect(news).toBeGreaterThanOrEqual(0);
    expect(month6.at(-1)!.textKey).toBe('log.month');
    expect(news).toBeLessThan(month6.length - 1);
  });
  it('month, age and enrolled months advance together; coursework ends at 24 enrolled months', () => {
    const s = make(ENG, { phd: { enrolledMonths: 23 } });
    const out = advanceMonth(s, data);
    expect([out.month, out.ageMonths, out.phd!.enrolledMonths]).toEqual([s.month + 1, s.ageMonths + 1, 24]);
    expect(out.phd!.coursework).toBe(false);
    expect(advanceMonth(make(ENG, { phd: { enrolledMonths: 22 } }), data).phd!.coursework).toBe(true);
  });
  it('a normal month ends with the month log line and, with a decision pending, still logs it', () => {
    const out = advanceMonth(make(ENG), data);
    expect(out.log.at(-1)).toMatchObject({ month: 1, textKey: 'log.month' });
  });
});

describe('deterministic', () => {
  it('60 auto months twice give equal states', () => {
    const run = (): LifeState => ticks(createLife({ ...ENG, auto: true }, 'APHD-DET00001', data), 60);
    const a = run(), b = run();
    expect(a).toEqual(b);
    expect(a.month).toBeGreaterThan(0);
  });
  it('manual play with the same inputs twice gives equal states', () => {
    const run = (): LifeState => play(make(HUM, {}, 'APHD-DET00002'), 30, { focus: 'research' });
    expect(run()).toEqual(run());
  });
});

describe('auto lives', () => {
  const N = 50;
  it('reach a degree or an end within the residence bound for 50 seeds, and report median degree months', () => {
    // 재학연한은 휴학 개월을 세지 않으므로 틱 수의 상한은 108(+1) + 휴학 상한 36 이다. 스펙 목표 5.5년은 보정(Task 11) 몫이라 단언하지 않는다.
    const bound = ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION + 1 + ASSUMED.LEAVE_CAP_MONTHS;
    const report: Record<string, unknown> = {};
    for (const [name, config, lenient] of [['engineering', ENG, false], ['humanities', HUM, false], ['engineering, no loan limit', ENG, true], ['humanities, no loan limit', HUM, true]] as const) {
      const degrees: number[] = [], ends: Record<string, number> = {};
      let within120 = 0;
      for (let i = 0; i < N; i++) {
        const { state, ticks: n } = runAuto(config, seedOf('AUTO', i), bound, lenient);
        expect(state.stage, `${name} seed ${i} ran ${n} ticks`).not.toBe('phd');
        expect(state.pending).toBeNull();
        if (n <= 120) within120++;
        if (state.stage === 'career' && state.career?.degree === 'phd') { degrees.push(state.career.degreeMonth); expect(state.end).toBeUndefined(); }
        else { const r = state.end?.reason ?? 'none'; ends[r] = (ends[r] ?? 0) + 1; }
      }
      report[name] = { degrees: degrees.length, medianDegreeMonths: median(degrees), ends, within120ticks: within120 };
      expect(degrees.length + Object.values(ends).reduce((a, b) => a + b, 0)).toBe(N);
    }
    console.log('auto lives, 50 seeds each:', JSON.stringify(report));
  });
  it('never throws and keeps its invariants across 50 seeds × 200 ticks (lucky choices)', () => {
    for (let i = 0; i < N; i++) {
      let s = createLife({ auto: true }, seedOf('LUCK', i), data);
      let prevMonth = s.month;
      for (let n = 0; n < 200 && s.stage === 'phd'; n++) {
        s = advanceMonth(s, data);
        expect(s.pending).toBeNull();
        expect(s.month).toBe(prevMonth + 1); prevMonth = s.month;
        for (const v of Object.values(s.stats)) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
        expect(s.money.debt).toBeGreaterThanOrEqual(0);
        expect(s.phd!.project).toBeLessThanOrEqual(100);
      }
      expect(s.stage).not.toBe('phd');
    }
  });
});

describe('leave month (Review Focus 2)', () => {
  const onLeave = (until: number, extra: Partial<PhdState> = {}): Over => ({
    month: 11, stats: { health: 40, mind: 50 },
    phd: {
      leave: { active: true, until, totalMonths: 2 }, enrolledMonths: 11, project: 37,
      fundingState: { route: 'project', monthly: 1_100_000, tuitionWaiver: 0.5, until: 100, dutyHours: 0, recordIds: [] }, ...extra,
    },
  });
  const quiet = (over: Over): string => findSeed('LV', sd => advanceMonth(make(HUM, over, sd), data).stage === 'phd');

  it('semester boundary on leave: no tuition, no stipend, project and enrolled months unchanged, +3 health and mind', () => {
    const over = onLeave(15), sd = quiet(over);
    const out = advanceMonth(make(HUM, over, sd), data);
    expect(out.month).toBe(12);   // 학기 경계
    expect(ledgerOf(out, 12).map(e => e.kind)).not.toContain('tuition');
    expect(ledgerOf(out, 12).map(e => e.kind)).not.toContain('stipend');
    expect(out.phd!.project).toBe(37);
    expect(out.phd!.enrolledMonths).toBe(11);
    expect(out.phd!.leave).toEqual({ active: true, until: 15, totalMonths: 3 });
    expect(out.stats.mind).toBe(53);
    expect(out.stats.health).toBe(42);   // +3 에서 자연 변화 −0.5 의 올림 몫 −1 이 carry 로 빠진다
    expect(out.ageMonths).toBe(make(HUM, over, sd).ageMonths + 1);
  });
  it('the leave ends on its until month; the next month counts as enrolled again', () => {
    const over = onLeave(12);
    const a = advanceMonth(make(HUM, over, quiet(over)), data);
    expect(a.phd!.leave.active).toBe(false);
    expect(a.phd!.enrolledMonths).toBe(11);
    const b = findSeed('LV2', sd => advanceMonth(advanceMonth(make(HUM, over, sd), data), data).stage === 'phd');
    const c = ticks(make(HUM, over, b), 2);
    expect(c.phd!.enrolledMonths).toBe(12);
  });
  it('leave-work (0014#36): a funding-expiry D leave pays 2,000,000 won each leave month and nothing else', () => {
    const over = onLeave(20, { fundingState: { route: 'self', monthly: ASSUMED.LEAVE_JOB_INCOME, tuitionWaiver: 0, until: 20, dutyHours: 0, recordIds: ['0014#36'] }, familySupport: 0 });
    const s = make(HUM, over, quiet(onLeave(20, { fundingState: { route: 'self', monthly: ASSUMED.LEAVE_JOB_INCOME, tuitionWaiver: 0, until: 20, dutyHours: 0, recordIds: ['0014#36'] }, familySupport: 0 })));
    const out = advanceMonth(s, data);
    const month = ledgerOf(out, 12);
    expect(month.filter(e => e.kind === 'leave-work')).toEqual([{ month: 12, kind: 'leave-work', amount: ASSUMED.LEAVE_JOB_INCOME, recordId: '0014#36' }]);
    expect(month.map(e => e.kind)).not.toContain('stipend');
    expect(out.money.cash - s.money.cash + out.money.debt - s.money.debt).toBeGreaterThan(0);   // 2,000,000 − 생활비(≤ 1,600,000)
  });
  it('no leave-work without the 0014#36 mark, and none after the leave', () => {
    const over = onLeave(15);
    expect(ledgerOf(advanceMonth(make(HUM, over, quiet(over)), data), 12).map(e => e.kind)).not.toContain('leave-work');
  });
});

describe('end conditions', () => {
  it('residence: ends the month enrolledMonths passes 96 + 12 (the one extension is automatic)', () => {
    const limit = ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION;
    const at = (n: number) => (sd: string) => make(ENG, { month: 100, phd: { enrolledMonths: n } }, sd);
    const sdEnd = findSeed('RS', sd => advanceMonth(at(limit)(sd), data).end?.reason === 'residence');
    const out = advanceMonth(at(limit)(sdEnd), data);
    expectNoDegreeCareer(out, 'residence', 101);
    expect(out.phd!.enrolledMonths).toBe(limit + 1);
    // 96 을 넘어도 연장 12개월 동안은 계속 다닌다
    const sdOk = findSeed('RS2', sd => advanceMonth(at(ASSUMED.RESIDENCE_MONTHS)(sd), data).stage === 'phd');
    expect(advanceMonth(at(ASSUMED.RESIDENCE_MONTHS)(sdOk), data).phd!.enrolledMonths).toBe(ASSUMED.RESIDENCE_MONTHS + 1);
    const sdOk2 = findSeed('RS3', sd => advanceMonth(at(limit - 1)(sd), data).stage === 'phd');
    expect(advanceMonth(at(limit - 1)(sdOk2), data).stage).toBe('phd');
  });
  it('leave months do not use up residence', () => {
    const limit = ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION;
    const over: Over = { month: 100, phd: { enrolledMonths: limit, leave: { active: true, until: 110, totalMonths: 4 } } };
    const sd = findSeed('RS4', x => advanceMonth(make(ENG, over, x), data).stage === 'phd');
    const out = advanceMonth(make(ENG, over, sd), data);
    expect(out.stage).toBe('phd');
    expect(out.phd!.enrolledMonths).toBe(limit);
  });

  // 재정 위기 연쇄 (Review Focus 3): 현금 0, 부채 한도, 장려금·가족 지원 0 이라 달마다 생활비만큼 현금이 음수로 깊어진다
  const broke = (over: Partial<LifeState> = {}, seed = SEED): LifeState => {
    const s = make(ENG, { phd: { focus: 'rest', crisisMonths: 0, postCrisisMonths: 0, familySupport: 0, fundingState: { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] } } }, seed);
    return { ...s, money: { cash: 0, debt: s.money.loanLimit, loanLimit: s.money.loanLimit }, ...over };
  };
  it('manual: 3 crisis months force funding-expiry (time stops), 3 more after the decision end the life as financial', () => {
    const sd = findSeed('FN', x => play(broke({ auto: false }, x), 8, undefined, 1).end?.reason === 'financial');
    let s = ticks(broke({ auto: false }, sd), 2);
    expect(s.pending).toBeNull();
    expect(s.phd!.crisisMonths).toBe(2);
    s = advanceMonth(s, data);
    expect(s.month).toBe(3);
    expect(s.pending).toMatchObject({ dp: 'funding-expiry', month: 3, context: { cause: 'crisis' } });
    expect(s.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(() => advanceMonth(s, data)).toThrow(/pending/);
    s = decide(s, data, 1);   // B: 조교로 전환해도 생활비를 못 채운다
    expect(s.decisions).toEqual([{ dp: 'funding-expiry', month: 3, option: 'B', byPolicy: false }]);
    for (let i = 0; i < 2; i++) { s = advanceMonth(s, data); expect(s.stage).toBe('phd'); expect(s.pending).toBeNull(); }
    s = advanceMonth(s, data);
    expectNoDegreeCareer(s, 'financial', 6);
    expect(s.money.debt).toBeGreaterThanOrEqual(0);
  });
  it('auto: the forced funding-expiry is decided by policy and the life still ends as financial', () => {
    const sd = findSeed('FA', x => ticks(broke({ auto: true }, x), 8).end?.reason === 'financial');
    let s = broke({ auto: true }, sd), seenDecision = false;
    for (let i = 0; i < 12 && s.stage === 'phd'; i++) { s = advanceMonth(s, data); expect(s.pending).toBeNull(); seenDecision ||= s.decisions.length > 0; }
    expect(s.decisions[0]).toMatchObject({ dp: 'funding-expiry', month: 3, byPolicy: true });
    expect(seenDecision).toBe(true);
    expect(s.end).toEqual({ reason: 'financial', month: 6 });
  });
  it('a life whose cash recovers never reaches the crisis', () => {
    const s = ticks(make(ENG, { phd: { focus: 'rest', familySupport: 0, fundingState: { route: 'project', monthly: 5_000_000, tuitionWaiver: 1, until: 100, dutyHours: 0, recordIds: [] } } }), 8);
    expect(s.phd?.crisisMonths ?? 0).toBe(0);
    expect(s.decisions.filter(d => d.dp === 'funding-expiry')).toEqual([]);
  });
});

describe('decision points', () => {
  describe('post-qualifying', () => {
    const exam = (sd: string, top: Partial<LifeState> = {}): LifeState => make(ENG, { month: 10, stats: { skill: 70 }, phd: { enrolledMonths: 11 }, top }, sd);
    it('the month a qualifying result arrives, time stops with a snapshot taken just before the prompt', () => {
      const sd = findSeed('QP', x => advanceMonth(exam(x), data).pending?.dp === 'post-qualifying');
      const s = advanceMonth(exam(sd), data);
      expect(s.phd!.qualAttempts).toBe(1);
      expect(s.pending).toMatchObject({ dp: 'post-qualifying', month: 11, context: { passed: s.phd!.qualified } });
      expect(s.pending!.options).toEqual([A('post-qualifying'), B('post-qualifying'), C('post-qualifying')]);
      expect(s.snapshots).toHaveLength(1);
      const snap = s.snapshots[0]!;
      expect([snap.dp, snap.month, snap.decisionIndex]).toEqual(['post-qualifying', 11, 0]);
      expect(snap.state.pending).toEqual(s.pending);
      expect(snap.state.snapshots).toEqual([]);
      expect(snap.state.decisions).toEqual([]);
      expect(snap.state.phd!.qualAttempts).toBe(1);
      expect(s.log.at(-1)!.textKey).toBe('log.month');
      expect(() => advanceMonth(s, data)).toThrow(/pending/);
      const next = advanceMonth(decide(s, data, 0), data);   // A
      expect(next.month).toBe(12);
    });
    it('auto: decided immediately by policy, recorded byPolicy', () => {
      const sd = findSeed('QA', x => { const o = advanceMonth(exam(x, { auto: true }), data); return o.stage === 'phd' && o.decisions.length === 1; });
      const s = advanceMonth(exam(sd, { auto: true }), data);
      expect(s.pending).toBeNull();
      expect(s.decisions).toMatchObject([{ dp: 'post-qualifying', month: 11, byPolicy: true }]);
      expect(s.snapshots).toHaveLength(1);
      expect(s.snapshots[0]!.state.pending?.dp).toBe('post-qualifying');
    });
    it('takeExam false skips the window; auto takes it when skill ≥ 45, otherwise with probability 0.3', () => {
      const sd = findSeed('QX', x => advanceMonth(exam(x), data, { takeExam: false }).stage === 'phd');
      const skipped = advanceMonth(exam(sd), data, { takeExam: false });
      expect(skipped.phd!.qualAttempts).toBe(0);
      expect(skipped.pending).toBeNull();
      let tookLow = 0, expectedLow = 0;
      for (let i = 0; i < 60; i++) {
        const sdi = seedOf('QZ', i);
        const low = make(ENG, { month: 10, stats: { skill: 30 }, phd: { enrolledMonths: 11 }, top: { auto: true } }, sdi);
        const out = advanceMonth(low, data);
        if (out.stage !== 'phd' && out.end?.reason === 'dropout' && out.phd!.qualAttempts === 0) continue;
        const wants = draw(sdi, 'policy', 11, 'qual:auto') < ASSUMED.QUAL_EXAM.autoP;
        expectedLow += wants ? 1 : 0; tookLow += out.phd!.qualAttempts;
        expect(out.phd!.qualAttempts).toBe(wants ? 1 : 0);
      }
      expect(tookLow).toBe(expectedLow);
      expect(expectedLow).toBeGreaterThan(0); expect(expectedLow).toBeLessThan(60);
      const high = advanceMonth(make(ENG, { month: 10, stats: { skill: ASSUMED.QUAL_EXAM.autoSkill }, phd: { enrolledMonths: 11 }, top: { auto: true } }, findSeed('QH', x => advanceMonth(make(ENG, { month: 10, stats: { skill: 45 }, phd: { enrolledMonths: 11 }, top: { auto: true } }, x), data).phd!.qualAttempts === 1)), data);
      expect(high.phd!.qualAttempts).toBe(1);
    });
    it('three failed attempts end the life as a dropout without a prompt', () => {
      const bad = (x: string): LifeState => make(ENG, { month: 28, stats: { skill: 0, health: 0 }, phd: { enrolledMonths: 29, qualAttempts: 2 } }, x);
      const sd = findSeed('Q3', x => advanceMonth(bad(x), data).end?.reason === 'dropout' && advanceMonth(bad(x), data).phd!.qualAttempts === 3);
      const out = advanceMonth(bad(sd), data);
      expectNoDegreeCareer(out, 'dropout', out.month); expect(out.pending).toBeNull();
    });
  });

  describe('first-paper-verdict', () => {
    const due = (sd: string, top: Partial<LifeState> = {}, extra: Partial<PhdState> = {}): LifeState =>
      make(ENG, { month: 10, phd: { enrolledMonths: 10, papers: [paper('p1', { status: 'submitted', dueMonth: 11 })], ...extra }, top }, sd);
    it('the first verdict opens the decision with the paper and its verdict', () => {
      const sd = findSeed('FV', x => advanceMonth(due(x), data).pending?.dp === 'first-paper-verdict');
      const s = advanceMonth(due(sd), data);
      const p = s.phd!.papers[0]!;
      expect(p.dueMonth).toBeUndefined();
      expect(s.pending).toMatchObject({ dp: 'first-paper-verdict', month: 11, context: { paperId: 'p1', verdict: p.status } });
      expect(s.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C']);
      expect(s.snapshots.map(x => x.dp)).toEqual(['first-paper-verdict']);
    });
    it('is deferred, not lost, when a post-qualifying prompt takes the same month', () => {
      const both = (x: string): LifeState => due(x, { stats: { ...MEAN, skill: 70 } }, { enrolledMonths: 11 });
      const sd = findSeed('FD', x => {
        const a = advanceMonth(both(x), data);
        if (a.pending?.dp !== 'post-qualifying') return false;
        const b = advanceMonth(decide(a, data, 0), data);
        return b.pending?.dp === 'first-paper-verdict';
      });
      const a = advanceMonth(both(sd), data);
      expect(a.pending!.dp).toBe('post-qualifying');
      expect(a.phd!.papers[0]!.status).not.toBe('submitted');   // 판정은 이미 났다
      expect(a.phd!.deferredFirstVerdict).toEqual({ paperId: 'p1', verdict: a.phd!.papers[0]!.status });
      expect(a.log.some(l => l.textKey === 'log.first-verdict-deferred')).toBe(true);   // 기록은 남는다
      const b = advanceMonth(decide(a, data, 0), data);
      expect(b.pending).toMatchObject({ dp: 'first-paper-verdict', month: 12, context: { paperId: 'p1', verdict: a.phd!.papers[0]!.status } });
      expect('deferredFirstVerdict' in b.phd!).toBe(false);   // 프롬프트가 열리며 지워진다
      // log 는 기록일 뿐이다: 기록을 지워도 상태만으로 다시 걸린다
      const decided = decide(a, data, 0);
      const noLog = advanceMonth({ ...decided, log: decided.log.filter(l => l.textKey !== 'log.first-verdict-deferred') }, data);
      expect(noLog.pending).toMatchObject({ dp: 'first-paper-verdict', month: 12 });
    });
  });

  describe('funding-expiry', () => {
    // 기한 14: 달 14·재학 14개월째는 자격시험 창(12, 18, …)도 학기 경계도 아니다
    const project = (until: number): Over => ({
      month: until - 1, phd: { enrolledMonths: until - 1, familySupport: 0, fundingState: { route: 'project', monthly: 1_100_000, tuitionWaiver: 0.3, until, dutyHours: 0, recordIds: [] } },
    });
    it('the month fundingState.until is reached, then a failed extension reopens B–D the next month, and B settles it', () => {
      const run = (x: string) => {
        const a = advanceMonth(make(ENG, project(14), x), data);
        if (a.pending?.dp !== 'funding-expiry') return undefined;
        const failed = decide(a, data, 0);
        if (failed.phd!.fundingState.until !== 14) return undefined;   // 연장 실패만
        const b = advanceMonth(failed, data);
        return b.pending?.dp === 'funding-expiry' ? { a, failed, b } : undefined;
      };
      const sd = findSeed('FE', x => run(x) !== undefined);
      const { a, b } = run(sd)!;
      expect(a.pending).toMatchObject({ dp: 'funding-expiry', month: 14, context: { cause: 'until' } });
      expect(a.pending!.context).not.toHaveProperty('retry');
      expect(a.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C', 'D']);
      expect(extensionProbability(a)).toBeGreaterThan(0);
      expect(b.pending).toMatchObject({ dp: 'funding-expiry', month: 15, context: { cause: 'until', retry: true } });
      expect(b.pending!.options.map(o => o.key)).toEqual(['B', 'C', 'D']);
      expect(b.pending!.options.map(o => o.textKey)).toEqual(['decision.funding-expiry.B', 'decision.funding-expiry.C', 'decision.funding-expiry.D']);
      const settled = decide(b, data, 0);   // B
      expect(fundingExpired(settled)).toBe(false);
      expect(advanceMonth(settled, data).pending).toBeNull();
    });
    it('a successful extension moves until forward by 24 months and no retry follows', () => {
      const ok = (x: string) => { const a = advanceMonth(make(ENG, project(14), x), data); return a.pending?.dp === 'funding-expiry' && decide(a, data, 0).phd!.fundingState.until > 14 ? a : undefined; };
      const sd = findSeed('FK', x => ok(x) !== undefined);
      const done = decide(ok(sd)!, data, 0);
      expect(done.phd!.fundingState.until).toBe(14 + ASSUMED.PROJECT_MONTHS);
      expect(advanceMonth(done, data).pending).toBeNull();
    });
    it('a failed scholarship review at a semester boundary opens funding-expiry (cause scholarship-review) and pulls until to that month', () => {
      const sch = (x: string): LifeState => make(ENG, {
        month: 5, phd: { enrolledMonths: 5, fundingState: { route: 'scholarship', monthly: 800_000, tuitionWaiver: 0.5, until: 48, dutyHours: 0, recordIds: [] } },
      }, x);
      const keep = odds(ASSUMED.SCHOLARSHIP_SELECT_P0, ASSUMED.SCHOLARSHIP_SELECT_BETA_SKILL * z(MEAN.skill));
      const failSeed = findSeed('SF', x => draw(x, 'funding', 6, 'scholarship:keep') >= keep && advanceMonth(sch(x), data).pending?.dp === 'funding-expiry');
      const out = advanceMonth(sch(failSeed), data);
      expect(out.pending).toMatchObject({ dp: 'funding-expiry', month: 6, context: { cause: 'scholarship-review', originalUntil: 48 } });
      // 같은 달 연장 신청(A)이 성공하면 장학은 원래 기한(48)으로 돌아간다. month + 48 이 아니다
      const backSeed = findSeed('SX', x => { const o = advanceMonth(sch(x), data); return o.pending?.dp === 'funding-expiry' && decide(o, data, 0).phd!.fundingState.until > 6; });
      expect(decide(advanceMonth(sch(backSeed), data), data, 0).phd!.fundingState.until).toBe(48);
      expect(out.phd!.fundingState.until).toBe(6);
      expect(out.log.map(l => l.textKey)).toContain('log.scholarship-review-failed');
      const keepSeed = findSeed('SK', x => draw(x, 'funding', 6, 'scholarship:keep') < keep && advanceMonth(sch(x), data).stage === 'phd');
      const kept = advanceMonth(sch(keepSeed), data);
      expect(kept.phd!.fundingState.until).toBe(48);
      expect(kept.pending).toBeNull();
    });
    it('no scholarship review on a non-boundary month, on leave, or for other routes', () => {
      const keep = odds(ASSUMED.SCHOLARSHIP_SELECT_P0, ASSUMED.SCHOLARSHIP_SELECT_BETA_SKILL * z(MEAN.skill));
      const fund = { route: 'scholarship' as const, monthly: 800_000, tuitionWaiver: 0.5, until: 48, dutyHours: 0, recordIds: [] };
      for (let i = 0; i < 200; i++) {
        const x = seedOf('SN', i);
        if (draw(x, 'funding', 6, 'scholarship:keep') < keep) continue;
        const leave = advanceMonth(make(ENG, { month: 5, phd: { enrolledMonths: 5, fundingState: fund, leave: { active: true, until: 9, totalMonths: 0 } } }, x), data);
        if (leave.stage === 'phd') expect(leave.phd!.fundingState.until).toBe(48);
        const proj = advanceMonth(make(ENG, { month: 5, phd: { enrolledMonths: 5, fundingState: { ...fund, route: 'project' } } }, x), data);
        if (proj.stage === 'phd') expect(proj.phd!.fundingState.until).toBe(48);
        const mid = advanceMonth(make(ENG, { month: 6, phd: { enrolledMonths: 6, fundingState: fund } }, x), data);   // month 7
        if (mid.stage === 'phd') expect(mid.phd!.fundingState.until).toBe(48);
      }
    });
  });

  describe('pre-graduation-path', () => {
    const ready = (sd: string, top: Partial<LifeState> = {}, extra: Partial<PhdState> = {}): LifeState =>
      make(ENG, { month: 30, phd: { enrolledMonths: 30, qualified: true, qualAttempts: 1, project: 92, papers: [paper('p1'), paper('p2')], ...extra }, top }, sd);
    it('opens in the first month the thesis is ready (qualified, project ≥ 90, accepted ≥ required) with A–D', () => {
      const sd = findSeed('PG', x => advanceMonth(ready(x), data).pending?.dp === 'pre-graduation-path');
      const s = advanceMonth(ready(sd), data);
      expect(s.pending).toMatchObject({ dp: 'pre-graduation-path', month: 31, context: {} });
      expect(s.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C', 'D']);
      const decided = decide(s, data, 2);   // C: 공공
      expect(decided.phd!.path).toBe('public');
      expect(advanceMonth(decided, data).pending).toBeNull();
    });
    it('does not open before the thesis is ready, or without enough accepted papers', () => {
      const sd = findSeed('PN', x => advanceMonth(ready(x, {}, { project: 40 }), data).stage === 'phd' && advanceMonth(ready(x, {}, { papers: [paper('p1')] }), data).stage === 'phd');
      expect(advanceMonth(ready(sd, {}, { project: 40 }), data).pending).toBeNull();
      expect(advanceMonth(ready(sd, {}, { papers: [paper('p1')] }), data).pending).toBeNull();
    });
    it('humanities counts only T3-or-better accepted papers (0014#63)', () => {
      const hum = (x: string, papers: Paper[]): LifeState => make(HUM, { month: 30, phd: { enrolledMonths: 30, qualified: true, qualAttempts: 1, project: 92, papers } }, x);
      const sd = findSeed('PH', x => advanceMonth(hum(x, [paper('p1', { tier: 'T3' })]), data).pending?.dp === 'pre-graduation-path' && advanceMonth(hum(x, [paper('p1', { tier: 'T4' })]), data).stage === 'phd');
      expect(advanceMonth(hum(sd, [paper('p1', { tier: 'T3' })]), data).pending?.dp).toBe('pre-graduation-path');
      expect(advanceMonth(hum(sd, [paper('p1', { tier: 'T4' })]), data).pending).toBeNull();
    });
    it('auto: the path comes from the policy and the thesis ready month is not skipped', () => {
      const sd = findSeed('PA', x => { const o = advanceMonth(ready(x, { auto: true }), data); return o.stage === 'phd' && o.phd!.path !== undefined; });
      const s = advanceMonth(ready(sd, { auto: true }), data);
      expect(s.decisions).toMatchObject([{ dp: 'pre-graduation-path', byPolicy: true }]);
      expect(s.pending).toBeNull();
    });
  });

  describe('priority', () => {
    const base = make(ENG, { month: 11, phd: { qualified: true, qualAttempts: 1, project: 95, papers: [paper('p1'), paper('p2')], fundingState: { route: 'project', monthly: 1, tuitionWaiver: 0, until: 5, dutyHours: 0, recordIds: [] } } });
    const done = [{ paperId: 'p3', verdict: 'rejected' as const, first: true }];
    it('post-qualifying > funding-expiry > first-paper-verdict > pre-graduation-path, one per call', () => {
      const ev = { verdicts: done, qualResult: true, fundingExpired: true, scholarshipFailed: false };
      expect(checkTriggers(base, data, ev)!.dp).toBe('post-qualifying');
      expect(checkTriggers(base, data, { ...ev, qualResult: undefined })!.dp).toBe('funding-expiry');
      expect(checkTriggers(base, data, { ...ev, qualResult: undefined, fundingExpired: false })!.dp).toBe('first-paper-verdict');
      expect(checkTriggers(base, data, { verdicts: [], fundingExpired: false, scholarshipFailed: false })!.dp).toBe('pre-graduation-path');
      expect(checkTriggers({ ...base, phd: { ...base.phd!, path: 'industry' } }, data, { verdicts: [], fundingExpired: false, scholarshipFailed: false })).toBeNull();
    });
    it('a failed qualifying exam still opens the prompt, with passed false', () => {
      const p = checkTriggers(base, data, { verdicts: [], qualResult: false, fundingExpired: false, scholarshipFailed: false })!;
      expect(p.context).toEqual({ passed: false });
    });
    it('funding cause: scholarship failure is named, a plain expiry is until', () => {
      expect(checkTriggers(base, data, { verdicts: [], fundingExpired: true, scholarshipFailed: true })!.context).toEqual({ cause: 'scholarship-review' });
      expect(checkTriggers(base, data, { verdicts: [], fundingExpired: true, scholarshipFailed: false })!.context).toEqual({ cause: 'until' });
    });
    it('no phd state, nothing to trigger', () => {
      expect(checkTriggers({ ...base, phd: undefined }, data, { verdicts: [], fundingExpired: false, scholarshipFailed: false })).toBeNull();
    });
  });
});

describe('graduation', () => {
  // month 40 → defense at 41 (pass → graduationMonth = next semester boundary 42)
  const eligible = (sd: string, path: PhdState['path'] = 'industry', top: Partial<LifeState> = {}): LifeState =>
    make(ENG, { month: 40, stats: { skill: 85, relation: 80, health: 75, network: 60 }, phd: { enrolledMonths: 40, qualified: true, qualAttempts: 1, project: 100, path, papers: [paper('p1'), paper('p2')] }, top }, sd);
  const passes = (x: string, path?: PhdState['path']): LifeState | undefined => {
    const a = advanceMonth(eligible(x, path), data);
    return a.stage === 'phd' && a.phd!.graduationMonth === 42 && !a.career ? a : undefined;
  };

  it('a passed defense schedules the next semester boundary; a failed one schedules a retry 6 months later', () => {
    const sd = findSeed('GD', x => passes(x) !== undefined);
    const a = passes(sd)!;
    expect(a.month).toBe(41);
    expect(a.phd!.defenseAttempts).toBe(1);
    expect(a.log.map(l => l.textKey)).toContain('log.defense-pass');
    expect(a.stage).toBe('phd');
    const failSeed = findSeed('GF', x => { const o = advanceMonth(eligible(x), data); return o.stage === 'phd' && o.phd!.nextDefenseMonth === 47; });
    expect(advanceMonth(eligible(failSeed), data).log.map(l => l.textKey)).toContain('log.defense-fail');
  });
  it('at graduationMonth the stage becomes career with degree phd, degreeMonth = that month and no end record', () => {
    const sd = findSeed('GG', x => { const a = passes(x); if (!a) return false; const g = advanceMonth(a, data); return g.stage === 'career' && g.career?.route === 'none'; });
    const g = advanceMonth(passes(sd)!, data);
    expect(g.month).toBe(42);
    expect(g.stage).toBe('career');
    expect(g.end).toBeUndefined();
    expect(g.career).toMatchObject({ degreeMonth: 42, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0 });
    expect(g.career!.searching).toEqual({ routes: ['industry'], since: 42, penalty: 1 });
    expect(g.phd).toBeDefined();   // 박사과정 채택 논문은 경력 채용 점수(scoreOf)가 계속 읽는다
    expect(g.log.at(-1)).toMatchObject({ month: 42, textKey: 'log.degree' });
    expect(g.pending).toBeNull();
  });
  it('the searched routes follow the path: academia → 4 academic routes, public → institute/public', () => {
    for (const [path, routes] of [['academia', ACADEMIC_ROUTES], ['public', ['institute', 'public']]] as const) {
      const sd = findSeed(`GR${path}`, x => { const a = passes(x, path); if (!a) return false; const g = advanceMonth(a, data); return g.stage === 'career' && g.career?.route === 'none'; });
      expect(advanceMonth(passes(sd, path)!, data).career!.searching!.routes).toEqual([...routes]);
    }
  });
  it('startup starts at the degree month: route startup, employer self, positive pay', () => {
    const sd = findSeed('GS', x => { const a = passes(x, 'startup'); return !!a && advanceMonth(a, data).stage === 'career'; });
    const g = advanceMonth(passes(sd, 'startup')!, data);
    expect(g.career).toMatchObject({ route: 'startup', degree: 'phd', degreeMonth: 42, employer: { kind: 'self' } });
    expect(g.career!.annualPay).toBeGreaterThan(0);
    expect(g.career!.searching).toBeUndefined();
  });
  it('a job found before graduation (provisional career) is kept; only degreeMonth is set', () => {
    const base = eligible('APHD-PROV0001');
    const hired = applyHire({ ...base, phd: { ...base.phd!, graduationMonth: 42 }, month: 38 }, data, 'industry', 38);
    const start: LifeState = { ...hired, month: 40 };
    expect(start.career).toMatchObject({ degree: 'phd', route: 'industry', degreeMonth: 42 });
    const sd = findSeed('GP', x => { const a = advanceMonth({ ...start, seed: x }, data); return a.stage === 'phd' && advanceMonth(a, data).stage === 'career'; });
    const g = ticks({ ...start, seed: sd }, 2);
    expect(g.stage).toBe('career');
    expect(g.career).toMatchObject({ route: 'industry', degree: 'phd', degreeMonth: 42, annualPay: start.career!.annualPay });
    expect(g.career!.searching).toBeUndefined();
  });
  it('the job search runs once the path is chosen: someone is hired in the phd stage before graduating', () => {
    let hires = 0;
    for (let i = 0; i < 400 && hires === 0; i++) {
      const s0 = make(ENG, { month: 20, stats: { skill: 95, network: 95, health: 90, mind: 90 }, phd: { enrolledMonths: 20, qualified: true, project: 50, path: 'industry', focus: 'rest' } }, seedOf('JS', i));
      const out = ticks(s0, 12);
      if (out.stage === 'phd' && out.career) { hires++; expect(out.career).toMatchObject({ route: 'industry', degree: 'phd' }); expect(out.log.map(l => l.textKey)).toContain('log.hired'); }
    }
    expect(hires).toBeGreaterThan(0);
  });
  it('no job search before the path is chosen', () => {
    for (let i = 0; i < 100; i++) {
      const out = ticks(make(ENG, { month: 20, stats: { skill: 95, network: 95 }, phd: { enrolledMonths: 20, qualified: true, focus: 'rest' } }, seedOf('JN', i)), 12);
      // 학위 없이 끝나 경력으로 넘어간 생애(#85)만 career 가 있고, 그때도 채용 기록은 없다
      if (out.career) { expect(out.career.degree).toBe('none'); expect(out.log.some(e => e.textKey === 'log.hired')).toBe(false); }
    }
  });
  it('a life that has graduated cannot tick again in the phd loop', () => {
    const sd = findSeed('GX', x => { const a = passes(x); return !!a && advanceMonth(a, data).stage === 'career'; });
    expect(() => advanceMonth(advanceMonth(passes(sd)!, data), data)).toThrow(/phd/);
  });
});

describe('post-qualifying C (exit master) hands over to the career stage', () => {
  it('auto exit-master stops the tick in the career stage with end recorded', () => {
    let seen = 0;
    for (let i = 0; i < 400 && seen === 0; i++) {
      const s = make(ENG, { month: 10, stats: { skill: 5, health: 5, mind: 60 }, phd: { enrolledMonths: 11 }, top: { auto: true } }, seedOf('XM', i));
      const out = advanceMonth(s, data);
      if (out.end?.reason === 'exit-master') {
        seen++;
        expect(out.stage).toBe('career');
        expect(out.career).toMatchObject({ degree: 'master-exit' });
        expect(out.decisions).toMatchObject([{ dp: 'post-qualifying', option: 'C', byPolicy: true }]);
      }
    }
    expect(seen).toBe(1);
  });
});
