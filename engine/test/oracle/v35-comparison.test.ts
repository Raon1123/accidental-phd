// v3.5 공식 ↔ 우리 엔진 비교표(docs/oracle/v35-comparison.md) 29행의 스냅샷 테스트.
// 행마다 it 하나: 같은 입력을 v3.5 참조 구현(./v35.ts)과 엔진 함수에 넣고, 그 행의 "차이 사유"가 말하는 관계(같음, 허용 오차, 경계, 구조 차이)를 단언한다.
// 같은 입력을 만들 수 없는 행은 it.skip 과 사유를 둔다. 마지막 자기 검사가 행 수 29를 센다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../../src/assumed';
import { find, get, loadData } from '../../src/data/load';
import { dropoutRate, durationYears, employedRate, facultyMarket, leaveRate, permanentShare, postdocFunders } from '../../src/data/statistics';
import { INSTITUTES, industryPay, institutePay, lecturerAnnual, privateFacultyPay } from '../../src/data/salaries';
import { TRACKS, kediOf } from '../../src/data/taxonomy';
import { tuitionPerSemester } from '../../src/data/tuition';
import { reviewMonths, tierBaseRate } from '../../src/data/venues';
import { hireProbability, postingProbability, professorBaseline, routeH } from '../../src/career/labor';
import { pathDistribution } from '../../src/career/path';
import { pensionMonthly, retireAge, startingPay } from '../../src/career/pay';
import { hazardMonth } from '../../src/odds';
import { draw } from '../../src/rng';
import { createLife } from '../../src/pre/createLife';
import { defenseProbability, qualProbability, qualWindowOpen } from '../../src/phd/exams';
import { dropoutHazard, leaveHazard } from '../../src/phd/hazards';
import { applyCashflow } from '../../src/phd/money';
import { acceptProbability, classifyVerdict, submitIfReady } from '../../src/phd/papers';
import { advisorA, blockedProbability, gK, progressGain, researchTime } from '../../src/phd/progress';
import type { CareerState, Choices, FundingState, Ksced, LifeState, Paper, PhdState, Route, Stats } from '../../src/types';
import * as v35 from './v35';
import type { V35Field } from './v35';

const data = loadData();
const SEED = 'APHD-ORACLE01';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };
const STEM = { group: '이공' as const, track: 'ai' };   // field cs, kedi engineering, ksced ict

/** 박사과정 상태. 능력치는 평균 50, 지도교수 support·rigor 50(진척 배수 A = 1)이다. */
function phdState(config: Parameters<typeof createLife>[0], over: Partial<PhdState> = {}, top: Partial<LifeState> = {}): LifeState {
  const s = createLife(config, SEED, data);
  return { ...s, stats: { ...MEAN }, ...top, phd: { ...s.phd!, advisor: { ...s.phd!.advisor, support: 50, rigor: 50 }, ...over } };
}

type CareerOver = { career?: Partial<CareerState>; choices?: Partial<Choices>; ageYears?: number; stats?: Partial<Stats> };
/** 경력 단계 상태. 능력치 50, 이공·computer·서울대. */
function careerState(o: CareerOver = {}): LifeState {
  return {
    version: 1, engineRevision: 'wave4', dataRevision: data.dataRevision, seed: SEED, stage: 'career', month: 100, ageMonths: (o.ageYears ?? 35) * 12,
    stats: { ...MEAN, ...o.stats },
    choices: {
      group: '이공', track: 'computer', subfield: 'D131100', department: 'cs', departmentRecord: 'departments-snu-computer', school: 'snu',
      funding: 'scholarship', advisorPref: 'support', kedi: 'engineering', ksced: 'ict', field: 'cs',
      byLuck: { group: false, track: false, subfield: false, department: false, funding: false, advisorPref: false }, ...o.choices,
    },
    money: { cash: 0, debt: 0, loanLimit: ASSUMED.LOAN_LIMIT }, ledger: [], news: [], decisions: [], log: [], pending: null, snapshots: [], auto: false, newsSeed: SEED,
    career: { degreeMonth: 40, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0, ...o.career },
  };
}

const SELF: FundingState = { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
/** 돈 흐름 시험용: 철학·서울대·자비, 월 1(학기 경계 아님), 수업 중. */
function moneyState(cash: number, debt: number): LifeState {
  const s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
  return {
    ...s, month: 1, ledger: [], money: { ...s.money, cash, debt },
    phd: { ...s.phd!, coursework: true, familySupport: 0, fundingState: SELF, leave: { active: false, until: -1, totalMonths: 0 }, enrolledMonths: 1 },
  };
}

const range = (key: string): [number, number] => v35.annualKrw(v35.MONTHLY_PAY[key]!);
const inside = (x: number, r: [number, number]): boolean => x >= r[0] && x <= r[1];
const KRW_PER_MANWON = 10_000;

describe('v3.5 oracle vs engine: 29 comparison rows', () => {
  it('row 1 연구 진행 gain: same structure — with equal base, E = 1 and A = 1 the gains are equal; field rate replaced by calibrated g_k', () => {
    expect(advisorA(50, 50)).toBeCloseTo(1, 12);   // support 50, rigor 50 → A = 1; health 50 → E = 1
    for (const u of [0, 0.25, 0.5, 0.99]) for (const skill of [30, 50, 70]) for (const rt of [1, 0.5, 0.12]) for (const blocked of [false, true]) {
      const ours = progressGain({ g: 7, u, skill, researchTime: rt, health: 50, support: 50, rigor: 50, f: 1, blocked });
      const theirs = v35.progressGain({ base: 7, rand: u, skill, researchTime: rt, energyFactor: 1, advisorFactor: 1, blocked });
      expect(ours).toBeCloseTo(theirs, 10);
    }
    // 포커스 배수 f 는 우리만 곱한다(월 선택이 진척을 바꾼다).
    const plain = progressGain({ g: 7, u: 0.5, skill: 50, researchTime: 1, health: 50, support: 50, rigor: 50, f: 1, blocked: false });
    const thesis = progressGain({ g: 7, u: 0.5, skill: 50, researchTime: 1, health: 50, support: 50, rigor: 50, f: ASSUMED.FOCUS.thesis.f, blocked: false });
    expect(thesis / plain).toBeCloseTo(ASSUMED.FOCUS.thesis.f, 12);
    // 분야 rate 대신 학위 소요 기간 레코드로 보정한 g_k = 100 / ((12·T − 6) × M̄).
    const v35Rates = Object.values(v35.FIELD_MODEL).map(m => m.rate);
    for (const k of ['humanities', 'social', 'natural', 'engineering'] as const) {
      const g = gK(data, k);
      expect(g).toBeCloseTo(100 / ((12 * durationYears(data, k).value - 6) * ASSUMED.G_MBAR_INIT), 10);
      expect(v35Rates).not.toContain(g);
      expect(g).toBeLessThan(Math.min(...v35Rates));   // v3.5 rate 5.2–7 보다 작은 척도(M̄ 보정을 거친 값)
    }
  });

  it('row 2 researchTime: identical to v3.5 for duty, job and coursework combinations; floor 0.12', () => {
    const ours = (duty: number, focus: 'research' | 'work', coursework: boolean): number => {
      const s = phdState(STEM, { coursework, focus });
      return researchTime({ ...s, phd: { ...s.phd!, fundingState: { ...s.phd!.fundingState, dutyHours: duty } } });
    };
    expect(ours(0, 'research', false)).toBeCloseTo(v35.researchTime(0, 0, 0), 12);
    expect(ours(10, 'research', true)).toBeCloseTo(v35.researchTime(10, 0, 1), 12);
    expect(ours(0, 'work', false)).toBeCloseTo(v35.researchTime(0, 20, 0), 12);       // 근로 포커스 = jobHours 20
    expect(ours(10, 'work', true)).toBeCloseTo(v35.researchTime(10, 20, 1), 12);
    expect(ours(40, 'work', true)).toBeCloseTo(0.12, 12);                              // 바닥
    expect(v35.researchTime(40, 20, 1)).toBeCloseTo(0.12, 12);
  });

  it('row 3 막힘(stall): math 0.24 maps to mathematics and statistics, every other track 0.16', () => {
    expect(v35.stall('math')).toBe(0.24);
    for (const t of TRACKS) {
      const isMath = t === 'mathematics' || t === 'statistics';
      expect(blockedProbability(t)).toBeCloseTo(isMath ? v35.stall('math') : v35.stall('cs'), 10);
    }
    for (const f of ['cs', 'bio', 'engineering', 'social', 'humanities'] as const) expect(v35.stall(f)).toBe(0.16);
  });

  it('row 4 논문 quality: same formula; engine adds 0.1 × (rigor − 50), so equal at rigor 50 and +3 at rigor 80', () => {
    const run = (id: string, rigor: number): { quality: number; noise: number } => {
      const s = phdState({ ...STEM }, { papers: [{ id, status: 'draft', writing: 100, quality: 0, attempts: 0, logitBonus: 0 }] }, { month: 10 });
      const withRigor = { ...s, phd: { ...s.phd!, advisor: { ...s.phd!.advisor, rigor } } };
      const noise = (2 * draw(s.seed, 'paper', s.month, `${id}:quality`) - 1) * 9;
      return { quality: submitIfReady(withRigor, data).phd!.papers[0]!.quality, noise };
    };
    for (let i = 0; i < 40; i++) {
      const base = run(`q${i}`, 50);
      expect(Math.abs(base.noise)).toBeLessThanOrEqual(9);
      expect(base.quality).toBeCloseTo(v35.paperQuality0(50, 50, base.noise), 10);
      const strict = run(`q${i}`, 80);
      expect(strict.quality).toBeCloseTo(v35.paperQuality0(50, 50, strict.noise) + 3, 10);
    }
    expect(v35.paperQuality0(50, 50, 0)).toBeCloseTo(56.5, 12);
  });

  it('row 5 논문 채택: engine floor 0.05 < v3.5 floor 0.25; T1 base 0.25 equals the v3.5 floor, v3.5 at q 55 first attempt (0.425) lies between the tiers', () => {
    const s = phdState(STEM);
    const acc = (o: Partial<Paper>): number =>
      acceptProbability(s, data, { id: 'p', status: 'submitted', writing: 100, quality: 55, attempts: 1, logitBonus: 0, tier: 'T1', ...o });
    const v = v35.accept(55, 1);
    expect(v).toBeCloseTo(0.15 + 0.275, 12);
    const tiers = (['T1', 'T2', 'T3', 'T4'] as const).map(t => acc({ tier: t }));
    expect(tiers[0]).toBeCloseTo(0.25, 12);    // T1 기준 0.25 = v3.5 하한
    expect(tiers[3]).toBeCloseTo(0.60, 12);
    expect(Math.min(...tiers)).toBeLessThan(v);
    expect(Math.max(...tiers)).toBeGreaterThan(v);
    expect(tiers[0]!).toBeLessThan(v);         // T1 은 v3.5 보다 어렵고
    expect(tiers[2]!).toBeGreaterThan(v);      // T3 는 v3.5 보다 쉽다
    // 하한: 우리 0.05, v3.5 0.25
    const lowEngine = acc({ quality: 0 });
    expect(lowEngine).toBeCloseTo(0.05, 12);
    expect(v35.accept(0, 1)).toBeCloseTo(0.25, 12);
    expect(lowEngine).toBeLessThan(v35.accept(0, 1));
    // 상한: 우리 0.90, v3.5 0.88
    expect(acc({ tier: 'T4', quality: 100, attempts: 10 })).toBeCloseTo(0.90, 12);
    expect(v35.accept(100, 10)).toBeCloseTo(0.88, 12);
    // 하한 0.25 는 채택률 최저 학회(sp 0.1471)보다 높다. 우리는 그 학회 값을 기준 확률로 쓴다.
    const conf = find(data, 'venues-conf-').filter(r => /-acceptance-\d+$/.test(r.id)).map(r => r.value);
    expect(conf.length).toBe(14);
    expect(Math.min(...conf)).toBeCloseTo(0.1471, 6);
    expect(Math.min(...conf)).toBeLessThan(v35.accept(0, 1));
    expect(tierBaseRate(data, 'T1', 'venues-conf-sp-core-rank').value).toBeCloseTo(0.1471, 6);
    expect(acc({ venueId: 'venues-conf-sp-core-rank' })).toBeCloseTo(0.1471, 6);
    expect(acc({ venueId: 'venues-conf-sp-core-rank' })).toBeLessThan(v35.accept(55, 1));
  });

  it('row 6 수정 요구·심사 지연: same revision band, delay probability and months, review months per field; re-review halving is engine-only', () => {
    for (const p of [0.05, 0.25, 0.425, 0.6, 0.88, 0.9, 0.95]) {
      for (let i = 0; i < 400; i++) {
        const u = (i + 0.5) / 400;
        expect(classifyVerdict(u, p)).toBe(v35.verdict(u, p));
      }
    }
    expect(ASSUMED.REVIEW_DELAY_P).toBe(v35.REVIEW_DELAY_P);
    expect([...ASSUMED.REVIEW_DELAY_MONTHS]).toEqual(v35.REVIEW_DELAY_MONTHS);
    for (const f of Object.keys(v35.FIELD_MODEL) as V35Field[]) expect(reviewMonths(f)).toEqual(v35.FIELD_MODEL[f].review);
    expect(ASSUMED.REREVIEW_DIVISOR).toBe(2);
  });

  it('row 7 자격시험: first attempt 0.70 equals v3.5; no skill gate (skill 30 still above floor 0.10, v3.5 refuses); same exam window', () => {
    expect(v35.qualPass(1)).toBeCloseTo(0.70, 6);
    expect(qualProbability({ ...MEAN }, 1)).toBeCloseTo(0.70, 6);
    expect(v35.qualEligible(30)).toBe(false);
    expect(v35.qualEligible(44)).toBe(true);
    expect(qualProbability({ ...MEAN, skill: 30 }, 1)).toBeGreaterThan(0.10);
    expect(qualProbability({ ...MEAN, skill: 0, health: 0 }, 1)).toBeGreaterThan(0.10);   // 가장 나쁜 능력치도 하한 0.10 위
    expect(Math.abs(qualProbability({ ...MEAN, skill: 44 }, 1) - qualProbability({ ...MEAN, skill: 43 }, 1))).toBeLessThan(0.01);   // 44 에서 뛰지 않는다
    // 재응시 보정: 우리 로짓 +0.25/회는 v3.5 +0.05/회와 0.01 이내
    for (const a of [2, 3]) expect(Math.abs(qualProbability({ ...MEAN }, a) - v35.qualPass(a))).toBeLessThan(0.01);
    // 응시 창: 12개월째부터 6개월마다
    expect(ASSUMED.QUAL_EXAM.firstWindowMonths).toBe(v35.QUAL_FIRST_MONTH);
    expect(ASSUMED.QUAL_EXAM.intervalMonths).toBe(v35.QUAL_INTERVAL_MONTHS);
    const open = (m: number): boolean => qualWindowOpen(phdState(STEM, { enrolledMonths: m }));
    expect([11, 12, 13, 17, 18, 24].map(open)).toEqual([false, true, false, false, true, true]);
  });

  it('row 8 학위 심사: v3.5 at 50/50/50 first attempt = 0.73 = engine p0; relation weight larger; engine bounds 0.40–0.95', () => {
    expect(v35.defense(50, 50, 50, 1)).toBeCloseTo(0.73, 6);
    expect(defenseProbability({ ...MEAN }, 1)).toBeCloseTo(0.73, 6);
    // 관계 비중: relation 0 → 100 의 변화폭이 v3.5(0.1)보다 크다
    const swingV35 = v35.defense(50, 100, 50, 1) - v35.defense(50, 0, 50, 1);
    const swingEngine = defenseProbability({ ...MEAN, relation: 100 }, 1) - defenseProbability({ ...MEAN, relation: 0 }, 1);
    expect(swingV35).toBeCloseTo(0.1, 12);
    expect(swingEngine).toBeGreaterThan(swingV35);
    // 하한 0.40 유지: 우리는 최악 능력치에서 0.40, v3.5 는 첫 시도에 0.43(0.40 에 닿지 않는다)
    expect(defenseProbability({ health: 0, mind: 0, skill: 0, relation: 0, network: 0 }, 1)).toBeCloseTo(0.40, 12);
    expect(v35.defense(0, 0, 0, 1)).toBeCloseTo(0.43, 12);
    // 상한: 우리 0.95 이하, v3.5 0.94
    const best = { health: 100, mind: 100, skill: 100, relation: 100, network: 100 };
    expect(defenseProbability(best, 5)).toBeCloseTo(0.95, 12);
    expect(v35.defense(100, 100, 100, 5)).toBeCloseTo(0.94, 12);
    // 재시도 보정: 우리 로짓 +0.6/회, v3.5 +0.08/회 — 두 번째 시도가 첫 시도보다 높다
    expect(defenseProbability({ ...MEAN }, 2)).toBeGreaterThan(defenseProbability({ ...MEAN }, 1));
    expect(v35.defense(50, 50, 50, 2)).toBeGreaterThan(v35.defense(50, 50, 50, 1));
  });

  it('row 9 재학연한·종료: residence 96 equals v3.5; 96 + 12 extension = v3.5 month 108; leave cap 36 is engine-only', () => {
    expect(ASSUMED.RESIDENCE_MONTHS).toBe(v35.ENDS.maxResidence);
    expect(ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION).toBe(v35.ENDS.timeMonth);
    expect(ASSUMED.LEAVE_CAP_MONTHS).toBe(36);
    expect(v35.ENDS.reasons).toContain('time');
  });

  it('row 10 휴학: engine uses KEDI per-field annual rates (monthly hazard), not the KISTEP stem 0.125 / other 0.188 reference', () => {
    expect(v35.LEAVE_REFERENCE).toEqual({ stem: 0.125, other: 0.188 });
    expect(get(data, 'statistics-leave-stem').value).toBe(v35.LEAVE_REFERENCE.stem);       // 서사 전용 레코드
    expect(get(data, 'statistics-leave-other').value).toBe(v35.LEAVE_REFERENCE.other);
    const cases: [string, { group: '이공' | '인문사회'; track: string }][] = [
      ['humanities', { group: '인문사회', track: 'history' }], ['social', { group: '인문사회', track: 'sociology' }],
      ['natural', { group: '이공', track: 'life_science' }], ['engineering', { group: '이공', track: 'ai' }],
    ];
    for (const [kedi, cfg] of cases) {
      expect(kediOf(cfg.track)).toBe(kedi);
      const s = phdState(cfg);
      const r = leaveRate(data, kedi as 'humanities').value;
      expect(leaveHazard(s, data)).toBeCloseTo(hazardMonth(r), 12);   // 평균 능력치에서 보정 없음
      expect(data.records.get(`statistics-phd-leave-rate-${kedi}`)!.source_id).not.toBe(data.records.get('statistics-leave-stem')!.source_id);
    }
    // 자연·공학은 KISTEP 이공 값 0.125 와 다르다(졸업자 응답 값을 위험률로 쓰지 않는다).
    for (const kedi of ['natural', 'engineering'] as const) {
      expect(leaveRate(data, kedi).value).not.toBe(v35.LEAVE_REFERENCE.stem);
      expect(leaveRate(data, kedi).value).toBeLessThan(v35.LEAVE_REFERENCE.stem);
    }
    // 인문 0.188 은 KISTEP other 0.188 과 수치가 같지만 출처가 다른 레코드다(KEDI 재적 대비 휴학률).
    expect(leaveRate(data, 'humanities').value).toBe(v35.LEAVE_REFERENCE.other);
    expect(data.records.get('statistics-phd-leave-rate-humanities')!.source_id).not.toBe(data.records.get('statistics-leave-other')!.source_id);
  });

  it('row 11 중도 이탈: v3.5 has no dropout hazard; engine adds 0.5 × monthly hazard of the KEDI dropout rate', () => {
    expect(v35.dropoutHazard).toBe(0);
    for (const [kedi, cfg] of [['humanities', { group: '인문사회' as const, track: 'history' }], ['engineering', STEM]] as const) {
      const h = dropoutHazard(phdState(cfg), data);
      expect(h).toBeGreaterThan(v35.dropoutHazard);
      expect(h).toBeCloseTo(ASSUMED.DROPOUT_BACKGROUND_SHARE * hazardMonth(dropoutRate(data, kedi).value), 12);
    }
  });

  it('row 12 대출·이자: monthly interest equals v3.5 (3%/yr = 0.0025/month); credit limit 3,000만 원 is the middle v3.5 tier', () => {
    const debt = 10_000_000;
    const out = applyCashflow(moneyState(100_000_000, debt), data);
    const interest = out.ledger.find(e => e.kind === 'interest')!;
    expect(-interest.amount).toBe(v35.loanInterest(debt));
    expect(out.money.debt).toBe(debt + v35.loanInterest(debt));
    expect(ASSUMED.LOAN_LIMIT).toBe(v35.CREDIT_LIMITS_MANWON[1]! * KRW_PER_MANWON);
    expect(v35.CREDIT_LIMITS_MANWON).toContain(ASSUMED.LOAN_LIMIT / KRW_PER_MANWON);
    expect(moneyState(0, 0).money.loanLimit).toBe(ASSUMED.LOAN_LIMIT);
    // 현금이 크게 모자라면 한도까지만 빌린다.
    const short = applyCashflow(moneyState(-40_000_000, 0), data);
    expect(short.money.debt).toBe(v35.CREDIT_LIMITS_MANWON[1]! * KRW_PER_MANWON);
  });

  it('row 13 등록금 범위: engine uses real school × field records; private engineering exceeds the v3.5 upper bound (7,507,000 > 5,900,000)', () => {
    const re = /^schools-([a-z0-9]+)-(cs|math|bio|engineering|social|humanities)-tuition$/;
    const rows = find(data, 'schools-').flatMap(r => { const m = re.exec(r.id); return m ? [{ school: m[1]!, field: m[2]! as V35Field, value: r.value }] : []; });
    expect(rows.length).toBeGreaterThan(50);
    for (const r of rows) expect(tuitionPerSemester(data, r.school, r.field, 'no-such-department').value).toBe(r.value);
    const bounds = (f: V35Field): [number, number] => [v35.FIELD_MODEL[f].tuition[0] * KRW_PER_MANWON, v35.FIELD_MODEL[f].tuition[1] * KRW_PER_MANWON];
    const engineeringUpper = bounds('engineering')[1];
    expect(engineeringUpper).toBe(5_900_000);
    const eng = (school: string): number => tuitionPerSemester(data, school, 'engineering', 'no-such-department').value;
    expect(eng('cau')).toBe(7_507_000);
    for (const school of ['cau', 'hanyang', 'khu', 'konkuk', 'korea', 'skku', 'sogang', 'yonsei', 'ewha']) expect(eng(school)).toBeGreaterThan(engineeringUpper);
    // 국립 서울대는 범위 안, 서울시립대 공학은 하한 아래
    expect(inside(eng('snu'), bounds('engineering'))).toBe(true);
    expect(eng('uos')).toBeLessThan(bounds('engineering')[0]);
    const outside = rows.filter(r => !inside(r.value, bounds(r.field)));
    expect(outside.some(r => r.value > bounds(r.field)[1])).toBe(true);
    expect(outside.some(r => r.value < bounds(r.field)[0])).toBe(true);
  });

  it('row 14 취업률: engine employedRate equals v3.5 FIELD_DATA for the five shared keys; business-law .408 is engine-only', () => {
    const pairs: [V35Field, Ksced][] = [['cs', 'ict'], ['math', 'natural-math'], ['bio', 'natural-math'], ['engineering', 'engineering'], ['social', 'social'], ['humanities', 'arts-humanities']];
    for (const [f, k] of pairs) expect(employedRate(data, k).value).toBeCloseTo(v35.FIELD_DATA_EMPLOYED[f], 6);
    expect(new Set(pairs.map(p => p[1])).size).toBe(5);
    expect(employedRate(data, 'business-law').value).toBeCloseTo(v35.FIELD_DATA_EMPLOYED.humanities, 6);
  });

  it('row 15 경력 구직 확률: v3.5 has one monthly p (0.13 at 50/50); engine differs by route (posting × hire), and combined across routes is the same order', () => {
    const v = v35.jobSearchP(50, 50);
    expect(v).toBeCloseTo(0.13, 12);
    const s = phdState(STEM);
    const routes: Route[] = ['professor', 'nontenure', 'lecturer', 'postdoc', 'institute', 'public', 'industry'];
    const monthly = routes.map(r => postingProbability(data, r, s.choices.group, s.choices.kedi, 1) * hireProbability(s, data, r));
    expect(Math.max(...monthly) / Math.min(...monthly)).toBeGreaterThan(10);    // 경로마다 기준값이 다르다
    for (const m of monthly) expect(m).toBeLessThan(v);                         // 경로 하나만 보면 v3.5 보다 낮다
    const any = 1 - monthly.reduce((acc, m) => acc * (1 - m), 1);               // 모든 경로 동시 구직
    expect(any).toBeGreaterThan(v / 2);
    expect(any).toBeLessThan(v * 2);
    // 교수 경로는 신규 임용 ÷ 박사 학위 취득자 레코드에서 유도한다.
    const m = facultyMarket(data);
    expect(professorBaseline(data, 'engineering').B).toBeCloseTo((m.newHiresAll.value * m.stock.engineering!.value / m.stockAll.value) / m.phdAwarded.engineering.value, 12);
  });

  it('row 16 고용형태 가중치: v3.5 32/48/15/5 differs from KRIVET 45.0/44.1/10.9; engine path distribution sums to 1 with startup = 0.025', () => {
    const w = v35.EMPLOYMENT_FORM_WEIGHTS;
    expect(w.permanent + w.fixed + w.part + w.self).toBe(100);
    expect(w.permanent).not.toBe(v35.EMPLOYMENT_FORMS.permanent);
    expect(w.fixed).not.toBe(v35.EMPLOYMENT_FORMS.fixed);
    expect(w.part).not.toBe(v35.EMPLOYMENT_FORMS.part);
    expect(v35.EMPLOYMENT_FORMS.permanent + v35.EMPLOYMENT_FORMS.fixed + v35.EMPLOYMENT_FORMS.part).toBeCloseTo(100, 9);
    const pairs: [Ksced, '이공' | '인문사회'][] = [['ict', '이공'], ['natural-math', '이공'], ['engineering', '이공'], ['social', '인문사회'], ['business-law', '인문사회'], ['arts-humanities', '인문사회']];
    for (const [k, g] of pairs) {
      const d = pathDistribution(data, k, g);
      expect(d.academia + d.industry + d.public + d.startup).toBeCloseTo(1, 12);
      expect(d.startup).toBeCloseTo(v35.NON_WAGE_SHARE, 12);
      expect(d.startup).toBeCloseTo(w.self / 100 / 2, 12);        // v3.5 self 5% 의 절반
    }
    // 계열마다 정규직 비율이 다르다. v3.5 의 단일 32% 가 그 범위 안에 있다.
    const perm = pairs.map(([k]) => permanentShare(data, k).value);
    expect(Math.min(...perm)).toBeLessThan(w.permanent / 100);
    expect(Math.max(...perm)).toBeGreaterThan(w.permanent / 100);
  });

  it('row 17 박사후 전환: STEM 0.62 vs engine 0.60 (within 0.03), non-STEM 0.25 equal; funder records equal KISTEP shares and give 0.282 institute share', () => {
    expect(v35.postdocP(true)).toBe(0.62);
    expect(v35.postdocP(false)).toBe(0.25);
    expect(Math.abs(ASSUMED.ROUTE_H.postdoc['이공'] - v35.postdocP(true))).toBeLessThan(0.03);
    expect(ASSUMED.ROUTE_H.postdoc['인문사회']).toBe(v35.postdocP(false));
    expect(routeH(data, 'postdoc', '이공', 'engineering')).toBe(ASSUMED.ROUTE_H.postdoc['이공']);
    const f = postdocFunders(data);
    const F = v35.POSTDOC_FUNDERS;
    expect(f.university.value).toBeCloseTo(F.대학교 / 100, 9);
    expect(f.government.value).toBeCloseTo(F.정부기관 / 100, 9);
    expect(f['public-institute'].value).toBeCloseTo(F.공공연구소 / 100, 9);
    expect(f['private-institute'].value).toBeCloseTo(F.민간연구소 / 100, 9);
    expect(f['private-company'].value).toBeCloseTo(F.민간기업 / 100, 9);
    expect(f.other.value).toBeCloseTo(F.기타 / 100, 9);
    expect(f.government.value + f['public-institute'].value).toBeCloseTo(ASSUMED.POSTDOC_INSTITUTE_SHARE['이공'], 9);
  });

  it('row 18 교수 전환: engine h per KEDI is at most 0.10 and the same order as v3.5 9%; v3.5 gate at 36 months becomes a logit step at 24', () => {
    const table: Record<string, number> = { engineering: 0.0998, natural: 0.0887, social: 0.0960 };
    for (const k of ['humanities', 'social', 'natural', 'engineering'] as const) {
      const { h } = professorBaseline(data, k);
      expect(h).toBeLessThanOrEqual(0.10);
      expect(h).toBeGreaterThan(0.09 / 10);
      expect(h).toBeLessThan(0.09 * 10);
      if (table[k] !== undefined) expect(Math.abs(h - table[k]!)).toBeLessThan(5e-4);
    }
    const hum = professorBaseline(data, 'humanities');
    expect(Math.abs(0.5 * hum.B - 0.1586)).toBeLessThan(5e-4);   // 상한 적용 전 값
    expect(hum.h).toBe(0.10);
    // 결정적 문턱 → 로짓 가산: v3.5 는 36개월 미만이면 0, 우리는 0 이 아니고 24개월부터 높아진다.
    expect(v35.professorPerYear(35)).toBe(0);
    expect(v35.professorPerYear(36)).toBe(0.09);
    const withMonths = (n: number): LifeState => ({ ...phdState(STEM), career: { degreeMonth: 0, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: n, paperScore: 0, careerPapers: 0 } });
    const p = (n: number): number => hireProbability(withMonths(n), data, 'professor');
    expect(p(0)).toBeGreaterThan(0);
    expect(p(23)).toBeCloseTo(p(0), 12);
    expect(p(24)).toBeGreaterThan(p(23));
    expect(p(36)).toBeCloseTo(p(24), 12);
    // 연 환산 실효 확률(공고 × 채용을 12개월)도 같은 크기다.
    const post = postingProbability(data, 'professor', '이공', 'engineering', 1);
    for (const n of [0, 36]) {
      const eff = 1 - (1 - post * p(n)) ** 12;
      expect(eff).toBeGreaterThan(0.09 / 2);
      expect(eff).toBeLessThan(0.09 * 2);
    }
  });

  it.skip('row 19 승진: skip — v3.5 has no promotion rule (정찰 기록 Key formulas 에 승진 항목이 없다), so there is no same-input value to compare', () => {});

  it('row 20 은퇴: engine ages stay inside the v3.5 range 60–67 (others U{60..67}, professor 65, institute 61, public 60); record end age 80', () => {
    const ages = new Set<number>();
    for (let d = 0; d < 400; d++) ages.add(retireAge(careerState({ career: { route: 'industry', degreeMonth: d } })));
    expect([...ages].sort((a, b) => a - b)).toEqual([60, 61, 62, 63, 64, 65, 66, 67]);
    for (const a of ages) {
      expect(a).toBeGreaterThanOrEqual(v35.RETIRE_RANGE[0]);
      expect(a).toBeLessThanOrEqual(v35.RETIRE_RANGE[1]);
    }
    expect(v35.retireAge(0)).toBe(60);
    expect(v35.retireAge(0.999)).toBeLessThan(67);
    const fixed = (route: Route): number => retireAge(careerState({ career: { route } }));
    expect([fixed('professor'), fixed('institute'), fixed('public')]).toEqual([65, 61, 60]);
    for (const a of [65, 61, 60]) expect(inside(a, v35.RETIRE_RANGE)).toBe(true);
    expect(ASSUMED.END_AGE).toBe(v35.RECORD_END_AGE);
  });

  it('row 21 노후 수입: 55만 원 base kept (equal at 0 years); engine scales with wage and path accrual, v3.5 only with years and caps at 205만 원', () => {
    const pension = (route: Route, annualPay: number, workYears: number): number => pensionMonthly(careerState({ career: { route, annualPay, workYears } }));
    expect(pension('industry', 36_000_000, 0)).toBe(v35.pension(0) * KRW_PER_MANWON);
    expect(v35.pension(0)).toBe(55);
    expect(v35.pension(30)).toBeCloseTo(160, 12);
    expect(v35.pension(100)).toBeCloseTo(205, 12);                              // 상한 55 + 150
    // 같은 근속이라도 급여가 다르면 우리는 다르고 v3.5 는 같다.
    expect(pension('industry', 60_000_000, 20)).toBeGreaterThan(pension('industry', 36_000_000, 20));
    // 공적연금 경로(교수·연구직 공무원)는 적립률 0.019 로 더 높다.
    expect(pension('professor', 60_000_000, 20)).toBeGreaterThan(pension('industry', 60_000_000, 20));
    expect(pension('public', 60_000_000, 20)).toBe(pension('professor', 60_000_000, 20));
    // 근속이 늘수록 늘고, 마지막 월급의 0.6 에서 멈춘다.
    expect(pension('industry', 36_000_000, 30)).toBeGreaterThan(pension('industry', 36_000_000, 10));
    expect(pension('professor', 36_000_000, 60)).toBe(550_000 + 0.6 * 3_000_000);
    expect(pension('professor', 36_000_000, 60)).toBeGreaterThan(v35.pension(100) * KRW_PER_MANWON);
  });

  it('row 22 월급: 박사후: university 37,800,000 is the v3.5 midpoint (inside); KRIBB institute postdoc 51,720,000 is above the v3.5 range', () => {
    const r = range('postdoc');
    expect(r).toEqual([30_000_000, 45_600_000]);
    const s = careerState();
    const univ = startingPay(s, data, 'postdoc', { kind: 'university' }).annualPay;
    const inst = startingPay(s, data, 'postdoc', { kind: 'institute', instituteId: 'kribb' }).annualPay;
    expect(univ).toBe((r[0] + r[1]) / 2);
    expect(inside(univ, r)).toBe(true);
    expect(inst).toBe(get(data, 'salaries-institutes-kribb-postdoc').value);
    expect(inst).toBeGreaterThan(r[1]);
  });

  it('row 23 월급: 시간강사: fallback 14,316,480 is inside the v3.5 range; of 18 school records only hanyang and konkuk fall below it, none above', () => {
    const r = range('lecturer');
    expect(r).toEqual([10_800_000, 26_400_000]);
    expect(lecturerAnnual(data, 'dgist').value).toBe(14_316_480);
    expect(inside(14_316_480, r)).toBe(true);
    const skip = ['all', 'national', 'private'];
    const schools = find(data, 'salaries-faculty-').flatMap(x => { const m = /^salaries-faculty-([a-z0-9]+)-lecturer-hourly-hourly$/.exec(x.id); return m && !skip.includes(m[1]!) ? [{ school: m[1]!, hourly: x.value }] : []; });
    expect(schools.length).toBe(18);
    const annual = schools.map(x => ({ school: x.school, v: lecturerAnnual(data, x.school).value, hourly: x.hourly }));
    for (const a of annual) expect(a.v).toBe(Math.round(a.hourly * ASSUMED.LECTURE.hoursPerWeek * ASSUMED.LECTURE.weeks));
    expect(annual.filter(a => a.v < r[0]).map(a => a.school).sort()).toEqual(['hanyang', 'konkuk']);
    expect(annual.filter(a => a.v > r[1])).toEqual([]);
  });

  it('row 24 월급: 교수: private assistant (51,774,065) inside the v3.5 range; private associate (78.6M) and professor (101.4M) above; national step 15 at age 35 inside', () => {
    const r = range('professor');
    expect(r).toEqual([43_200_000, 62_400_000]);
    expect(inside(privateFacultyPay(data, 'assistant').value, r)).toBe(true);
    expect(privateFacultyPay(data, 'associate').value).toBeGreaterThan(r[1]);
    expect(privateFacultyPay(data, 'professor').value).toBeGreaterThan(r[1]);
    const national = (age: number): number => startingPay(careerState({ ageYears: age }), data, 'professor', { kind: 'university', national: true }).annualPay;
    expect(national(35)).toBe(59_531_160);
    expect(inside(national(35), r)).toBe(true);
    expect(national(40)).toBeGreaterThan(r[1]);
  });

  it('row 25 월급: 출연연: all seven new-hire records inside the v3.5 range, humanities proxy inside; senior and principal grades above', () => {
    const r = range('institute');
    expect(r).toEqual([37_200_000, 55_200_000]);
    expect(INSTITUTES.length).toBe(7);
    for (const i of INSTITUTES) {
      expect(inside(institutePay(data, i, 'new-hire').value, r)).toBe(true);
      expect(institutePay(data, i, 'senior-researcher').value).toBeGreaterThan(r[1]);
      expect(institutePay(data, i, 'principal-researcher').value).toBeGreaterThan(r[1]);
    }
    const hs = startingPay(careerState({ choices: { group: '인문사회', kedi: 'social', ksced: 'social' } }), data, 'institute', { kind: 'institute' }).annualPay;
    expect(hs).toBe(get(data, ASSUMED.HUMSOC_INSTITUTE_PAY_RECORD).value);
    expect(inside(hs, r)).toBe(true);
  });

  it('row 26 월급: 공공: researcher step pay at ages 30, 35 and 40 is above the v3.5 range 32.4–49.2M', () => {
    const r = range('public');
    expect(r).toEqual([32_400_000, 49_200_000]);
    for (const age of [30, 35, 40]) {
      const pay = startingPay(careerState({ ageYears: age }), data, 'public', { kind: 'government' }).annualPay;
      expect(pay).toBeGreaterThan(r[1]);
    }
  });

  it('row 27 월급: 기업: STEM proxy 63,044,000 is above the v3.5 upper bound 62.4M (by 644,000); humanities proxy 52,472,000 inside', () => {
    const r = range('industry');
    expect(r).toEqual([38_400_000, 62_400_000]);
    expect(industryPay(data, '이공').value).toBe(63_044_000);
    expect(industryPay(data, '이공').value).toBeGreaterThan(r[1]);
    expect(industryPay(data, '이공').value - r[1]).toBe(644_000);
    expect(industryPay(data, '인문사회').value).toBe(52_472_000);
    expect(inside(industryPay(data, '인문사회').value, r)).toBe(true);
  });

  it('row 28 월급: 계약·프리랜서·독립·브리지: nontenure 38.71M inside contract range, startup median 30M inside independent range, bridge 24M inside bridge range', () => {
    const s = careerState();
    const nontenure = startingPay(s, data, 'nontenure', { kind: 'university' }).annualPay;
    expect(nontenure).toBe(get(data, ASSUMED.NONTENURE_PAY_RECORD).value);
    expect(inside(nontenure, range('contract'))).toBe(true);
    expect(inside(ASSUMED.STARTUP.incomeMedian, range('independent'))).toBe(true);
    expect(startingPay(s, data, 'bridge', { kind: 'self' }).annualPay).toBe(ASSUMED.BRIDGE_PAY);
    expect(inside(ASSUMED.BRIDGE_PAY, range('bridge'))).toBe(true);
    // 프리랜서(100–240만 원/월)는 우리 경로에 없다: 박사후·비정년 교원으로 흡수.
    expect(range('freelance')).toEqual([12_000_000, 28_800_000]);
  });

  it.skip('row 29 경력 소득 증가: skip — v3.5 has no per-route raise rule (정찰 기록에 월급 범위만 있다), so there is no v3.5 value to compare', () => {});
});

describe('v3.5 oracle comparison file self-check', () => {
  it('has exactly 29 row cases (it + it.skip), numbered 1..29 in order', () => {
    const src = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const active = [...src.matchAll(/^\s*it\('row (\d+) /gm)].map(m => Number(m[1]));
    const skipped = [...src.matchAll(/^\s*it\.skip\('row (\d+) /gm)].map(m => Number(m[1]));
    expect(active.length + skipped.length).toBe(29);
    expect(skipped).toEqual([19, 29]);
    const all = [...src.matchAll(/^\s*it(?:\.skip)?\('row (\d+) /gm)].map(m => Number(m[1]));
    expect(all).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });
});
