// 입학 전 선택 6종과 초기화(선택권 §2, 상태 §1.4). 난수는 모두 이름 붙은 슬롯이다(상태 §6.2).
//   luck   : group · track · subfield · department · funding · advisorPref
//   init   : stat:health|mind|skill|relation|network (슬롯마다 :a/:b 두 개) · age · advisor · family
//   funding: scholarship · scholarship:record · project
import { ASSUMED } from '../assumed';
import { has, type DataBundle } from '../data/load';
import { indexDepartments, trackWeights, unitKey, unitsForTrack, type DeptIndex } from '../data/departments';
import { monthlyFromRecord, projectStipend, scholarshipOptions } from '../data/funding';
import { fieldOf, groupOf, kediOf, kscedOf, subfieldsOf, TRACKS, tracksOf } from '../data/taxonomy';
import { entranceFee, waiverRate } from '../data/tuition';
import { tuitionCharge } from '../phd/money';
import { draw, drawNormal } from '../rng';
import { clamp, odds, z } from '../odds';
import { pickUniform, pickWeighted } from '../util';
import type { AdvisorType, FundingRoute, FundingState, Group, LifeConfig, LifeState, Stats } from '../types';

const GROUPS: readonly Group[] = ['이공', '인문사회'];
const ROUTES: readonly FundingRoute[] = ['scholarship', 'project', 'self'];
const ADVISOR_KEYS = Object.keys(ASSUMED.ADVISOR_TYPES) as AdvisorType[];
const STAT_KEYS = ['health', 'mind', 'skill', 'relation', 'network'] as const;

// indexDepartments 는 483건을 파싱하므로 번들마다 한 번만 만든다.
interface DeptCtx { idx: DeptIndex; repOf: Map<string, string>; weights: Record<string, number>; schools: Set<string> }
const ctxCache = new WeakMap<DataBundle, DeptCtx>();
function deptCtx(data: DataBundle): DeptCtx {
  let c = ctxCache.get(data);
  if (!c) {
    const idx = indexDepartments(data);
    const repOf = new Map<string, string>();
    for (const b of idx.bundles) for (const m of b.members) repOf.set(m, b.representative);
    c = { idx, repOf, weights: trackWeights(idx), schools: new Set([...idx.records.values()].map(r => r.school)) };
    ctxCache.set(data, c);
  }
  return c;
}

/** 학과 단위의 대표 레코드 id 목록(트랙 안, 학교로 거를 수 있다). */
function repsFor(c: DeptCtx, track: string, school?: string): string[] {
  const reps = unitsForTrack(c.idx, track);
  return school === undefined ? reps : reps.filter(id => c.idx.records.get(id)!.school === school);
}

/** 설정에 적힌 학과(단위 키 또는 레코드 id)를 대표 레코드 id 로 바꾼다. 트랙을 알면 그 트랙에 걸친 단위여야 한다. */
function resolveDepartment(c: DeptCtx, department: string, track: string | undefined): { rep: string; track: string } {
  const asRecord = c.idx.records.get(department);
  const key = asRecord ? unitKey(asRecord, c.idx) : department;
  const members = [...c.idx.records.values()].filter(r => unitKey(r, c.idx) === key).map(r => r.id).sort();
  if (members.length === 0) throw new Error(`unknown department: ${department}`);
  const rep = c.repOf.get(members[0]!) ?? members[0]!;
  const repRec = c.idx.records.get(rep)!;
  if (track !== undefined) {
    if (!unitsForTrack(c.idx, track).includes(rep)) throw new Error(`department ${department} is not a unit of track ${track}`);
    return { rep, track };
  }
  return { rep, track: repRec.track };
}

export function createLife(config: LifeConfig, seed: string, data: DataBundle): LifeState {
  const c = deptCtx(data);

  // ── 설정 검증 ──
  if (config.group !== undefined && !GROUPS.includes(config.group)) throw new Error(`unknown group: ${config.group}`);
  if (config.track !== undefined && !TRACKS.includes(config.track)) throw new Error(`unknown track: ${config.track}`);
  if (config.school !== undefined && !c.schools.has(config.school)) throw new Error(`unknown school: ${config.school}`);
  if (config.funding !== undefined && !ROUTES.includes(config.funding)) throw new Error(`unknown funding route: ${config.funding}`);
  if (config.advisorPref !== undefined && !ADVISOR_KEYS.includes(config.advisorPref)) throw new Error(`unknown advisor preference: ${config.advisorPref}`);
  if (config.cohortOf !== undefined && config.group === undefined) throw new Error('cohortOf requires group (cohort shares the player group)');

  // ── 1~4. 계열 → 전공군 → 세부전공 → 학교·학과 ──
  let explicitRep: string | undefined;
  let knownTrack = config.track;
  if (config.department !== undefined) {
    const r = resolveDepartment(c, config.department, config.track);
    explicitRep = r.rep;
    knownTrack = r.track;
    if (config.school !== undefined && c.idx.records.get(r.rep)!.school !== config.school) {
      throw new Error(`department ${config.department} is not at school ${config.school}`);
    }
  }
  if (knownTrack !== undefined && config.group !== undefined && groupOf(knownTrack) !== config.group) {
    throw new Error(`track ${knownTrack} does not belong to group ${config.group}`);
  }

  const group: Group = config.group ?? (knownTrack !== undefined
    ? groupOf(knownTrack)
    : pickWeighted(draw(seed, 'luck', 0, 'group'), ASSUMED.LUCK_GROUP_P) as Group);
  const byLuckGroup = config.group === undefined && knownTrack === undefined;

  let track: string;
  if (knownTrack !== undefined) {
    track = knownTrack;
  } else {
    // 학교만 정했으면 그 학교에 단위가 있는 트랙만 후보다(없으면 던진다).
    const w: Record<string, number> = {};
    for (const t of tracksOf(group)) {
      if (config.school !== undefined && repsFor(c, t, config.school).length === 0) continue;
      const wt = c.weights[t];
      if (wt !== undefined) w[t] = wt;
    }
    if (Object.keys(w).length === 0) throw new Error(`no track of group ${group} at school ${config.school}`);
    track = pickWeighted(draw(seed, 'luck', 0, 'track'), w);
  }

  const subfields = subfieldsOf(data, track);
  if (config.subfield !== undefined && !subfields.includes(config.subfield)) {
    throw new Error(`subfield ${config.subfield} is not a choice of track ${track}`);
  }
  const subfield = config.subfield ?? pickUniform(draw(seed, 'luck', 0, 'subfield'), subfields);

  let departmentRecord: string;
  if (explicitRep !== undefined) {
    departmentRecord = explicitRep;
  } else {
    const reps = repsFor(c, track, config.school);
    if (reps.length === 0) throw new Error(`no department unit for track ${track} at school ${config.school}`);
    departmentRecord = pickUniform(draw(seed, 'luck', 0, 'department'), reps);
  }
  const deptRec = c.idx.records.get(departmentRecord)!;
  const school = deptRec.school;

  // ── 5. 자금 경로 선택(운에 맡기면 §2.5 표) ──
  const f = ASSUMED.FUNDING_LUCK;
  const table = group === '인문사회' ? f.humSoc
    : (ASSUMED.STEM_INSTITUTE_SCHOOLS as readonly string[]).includes(school) ? f.stemInstitute : f.stemOther;
  const funding: FundingRoute = config.funding ?? (pickWeighted(draw(seed, 'luck', 0, 'funding'), table) as FundingRoute);

  // ── 6. 지도교수 선호 ──
  const advisorPref: AdvisorType = config.advisorPref ?? pickUniform(draw(seed, 'luck', 0, 'advisorPref'), ADVISOR_KEYS);

  // ── 초기 능력치(상태 §1.4) ──
  const stats = {} as Stats;
  for (const k of STAT_KEYS) {
    stats[k] = clamp(Math.round(ASSUMED.INIT_STAT_MEAN + ASSUMED.INIT_STAT_SD * drawNormal(seed, 'init', 0, `stat:${k}`)),
      ASSUMED.INIT_STAT_MIN, ASSUMED.INIT_STAT_MAX);
  }

  // ── 나이 ──
  const age = Number(pickWeighted(draw(seed, 'init', 0, 'age'), ASSUMED.ENTRY_AGE_DIST));

  // ── 지도교수 실제 유형(0014#19): 선호 일치 0.6, 나머지는 다른 셋 균등. 운에 맡기기면 넷 균등 ──
  const uAdv = draw(seed, 'init', 0, 'advisor');
  let advisorType: AdvisorType;
  if (config.advisorPref === undefined) {
    advisorType = pickUniform(uAdv, ADVISOR_KEYS);
  } else if (uAdv < ASSUMED.ADVISOR_PREF_P) {
    advisorType = advisorPref;
  } else {
    advisorType = pickUniform((uAdv - ASSUMED.ADVISOR_PREF_P) / (1 - ASSUMED.ADVISOR_PREF_P), ADVISOR_KEYS.filter(k => k !== advisorPref));
  }

  // ── 자금 확정(§5.2): 고른 경로에서 시작해 장학 → 과제 → 자비 순으로 내려간다 ──
  const waiverIds = (rec: { id: string }): string[] => (has(data, rec.id) ? [rec.id] : []);
  let fundingState: FundingState | undefined;
  if (funding === 'scholarship') {
    const pSel = odds(ASSUMED.SCHOLARSHIP_SELECT_P0, ASSUMED.SCHOLARSHIP_SELECT_BETA_SKILL * z(stats.skill));
    if (draw(seed, 'funding', 0, 'scholarship') < pSel) {
      const options = scholarshipOptions(data, school);
      const waiver = waiverRate(data, school, 'scholarship');
      const recordIds: string[] = [];
      let monthly = 0;
      if (options.length > 0) {
        const rec = pickUniform(draw(seed, 'funding', 0, 'scholarship:record'), options.map(o => o.id));
        monthly = monthlyFromRecord(options.find(o => o.id === rec)!);
        recordIds.push(rec);
      }
      recordIds.push(...waiverIds(waiver));
      fundingState = { route: 'scholarship', monthly, tuitionWaiver: waiver.value, until: ASSUMED.SCHOLARSHIP_MONTHS, dutyHours: 0, recordIds };
    }
  }
  if (!fundingState && funding !== 'self') {
    if (draw(seed, 'funding', 0, 'project') < ASSUMED.PROJECT_ASSIGN_P[group]) {
      const stipend = projectStipend(data, school, group);
      const waiver = waiverRate(data, school, 'project');
      fundingState = {
        route: 'project', monthly: stipend.value, tuitionWaiver: waiver.value, until: ASSUMED.PROJECT_MONTHS, dutyHours: 0,
        recordIds: [...new Set([...waiverIds(stipend), ...waiverIds(waiver)])],
      };
    }
  }
  fundingState ??= { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
  if (fundingState.route === 'self') stats.mind = clamp(stats.mind + ASSUMED.SELF_FUNDING_MIND_PENALTY, ASSUMED.STAT_MIN, ASSUMED.STAT_MAX);

  // ── 가족 지원(0014#11) ──
  const famWeights: Record<string, number> = {};
  ASSUMED.FAMILY_SUPPORT.forEach((fs, i) => { famWeights[String(i)] = fs.p; });
  const familySupport = ASSUMED.FAMILY_SUPPORT[Number(pickWeighted(draw(seed, 'init', 0, 'family'), famWeights))]!.monthly;

  // ── 입학금(§5.1): 0개월째 한 번. 0원이면 원장에 적지 않는다 ──
  const fee = entranceFee(data, school);
  const ledger: LifeState['ledger'] = fee.value > 0 ? [{ month: 0, kind: 'entrance-fee', amount: -fee.value, recordId: fee.id }] : [];

  const state: LifeState = {
    version: 1, engineRevision: 'wave4', dataRevision: data.dataRevision, seed, stage: 'phd', month: 0, ageMonths: age * ASSUMED.MONTHS_PER_YEAR,
    stats,
    choices: {
      group, track, subfield, department: unitKey(deptRec, c.idx), departmentRecord, school,
      funding, advisorPref, kedi: kediOf(track), ksced: kscedOf(track), field: fieldOf(track),
      byLuck: {
        group: byLuckGroup, track: knownTrack === undefined, subfield: config.subfield === undefined,
        department: explicitRep === undefined, funding: config.funding === undefined, advisorPref: config.advisorPref === undefined,
      },
    },
    money: { cash: ASSUMED.INIT_CASH - fee.value, debt: 0, loanLimit: ASSUMED.LOAN_LIMIT },
    ledger, news: [], decisions: [],
    log: [{ month: 0, textKey: 'life.start', tags: ['start'], creative: false }],
    phd: {
      enrolledMonths: 0, leave: { active: false, until: -1, totalMonths: 0 }, coursework: true, project: 0, blocked: false,
      qualified: false, qualAttempts: 0, defenseAttempts: 0, papers: [], requiredPapers: ASSUMED.REQUIRED_PAPERS[group].count,
      advisor: { type: advisorType, ...ASSUMED.ADVISOR_TYPES[advisorType] },
      fundingState, focus: 'research', focusHistory: [{ from: 0, focus: 'research' }],
      crisisMonths: 0, postCrisisMonths: 0, familySupport,
      statCarry: { health: 0, mind: 0, skill: 0, relation: 0, network: 0 },
    },
    pending: null, snapshots: [], auto: config.auto ?? false,
    newsSeed: config.cohortOf ?? seed,
  };

  // ── 첫 학기 등록금(§5.1): month 0 = 2027년 3월은 학기 경계이므로 여기서 청구한다(월 틱은 month 1부터 돈다) ──
  const tuition = tuitionCharge(state, data);
  if (tuition && tuition.amount > 0) {
    state.money.cash -= tuition.amount;
    state.ledger.push({ month: 0, kind: 'tuition', amount: -tuition.amount, recordId: tuition.recordId });
  }
  return state;
}
