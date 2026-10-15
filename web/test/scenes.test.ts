// 서사 장면 팩(#57): 결정 지점·기록 범위, 근거 id(narratives 레코드 또는 'assumed') 누락 0건, 창작 표시, 실명 0건, 화면 연결.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advanceMonth, createLife, decide, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { schoolNamePairs } from '../../engine/sim/web-sources';
import { decisionView, notes, step } from '../src/play';
import { SCENES, decisionResult, decisionScene, hireWhen, logScene } from '../src/scenes';
import { ko } from '../src/strings.ko';

const root = resolve(__dirname, '../..');
const data = loadData();
const GROUPS = ['인문사회', '이공'] as const;

const recordIds = new Set(['humanities-social', 'stem'].flatMap(t =>
  (JSON.parse(readFileSync(join(root, 'data', 'packs', 'narratives', t, 'records.json'), 'utf8')) as { id: string }[]).map(r => r.id)));

/** strings.ko.ts 의 결정 선택지 키에서 뽑은 `<지점>[.<결과>]` → 선택지 글자들. 엔진이 만들 수 있는 결정 조합 전체다. */
function decisionKeys(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const k of Object.keys(ko.texts)) {
    const m = /^decision\.(.+)\.([A-D])$/.exec(k);
    if (m) out.set(m[1]!, [...(out.get(m[1]!) ?? []), m[2]!].sort());
  }
  return out;
}

const NON_ACADEMIC = ['industry', 'public', 'startup', 'bridge'] as const;
const ACADEMIC_FIRST = ['postdoc', 'lecturer', 'nontenure', 'professor', 'institute'] as const;
const LOG_KEYS = ['log.degree', 'log.contract-ended', 'log.startup-closed', 'log.retired', 'log.end-age80', 'log.end-dropout', 'log.end-financial', 'log.end-residence'];

describe('scene pack coverage (#57)', () => {
  it('every decision combination has a scene for each group, with one result per option letter', () => {
    const keys = decisionKeys();
    expect(keys.size).toBe(10);
    const missing: string[] = [];
    for (const [key, letters] of keys) for (const g of GROUPS) {
      const sc = SCENES.find(x => x.at === 'decision' && x.key === key && x.group === g);
      if (!sc) { missing.push(`${key} ${g}`); continue; }
      expect(Object.keys(sc.options ?? {}).sort(), `${sc.id} options`).toEqual(letters);
    }
    expect(missing).toEqual([]);
  });

  it('every hire route has a first-job scene, and leaving research has first / switch / no-PhD scenes', () => {
    const has = (route: string, when: string) => SCENES.some(x => x.key === 'log.hired' && x.route === route && x.when === when);
    const missing: string[] = [];
    for (const r of NON_ACADEMIC) for (const w of ['first', 'switch', 'no-phd']) if (!has(r, w)) missing.push(`${r} ${w}`);
    for (const r of ACADEMIC_FIRST) if (!has(r, 'first')) missing.push(`${r} first`);
    for (const k of LOG_KEYS) if (!SCENES.some(x => x.at === 'log' && x.key === k)) missing.push(k);
    expect(missing).toEqual([]);
  });

  it('every scene key is a key the engine writes (a string exists for it)', () => {
    const decisions = decisionKeys();
    for (const x of SCENES) {
      if (x.at === 'decision') expect(decisions.has(x.key), x.id).toBe(true);
      else expect(Object.hasOwn(ko.texts, x.key), x.id).toBe(true);
    }
  });
});

describe('scene evidence and marks (#57)', () => {
  it('every ref is a narratives record id or "assumed": zero missing ids', () => {
    const missing = SCENES.flatMap(x => x.refs.filter(r => r !== 'assumed' && !recordIds.has(r)).map(r => `${x.id} → ${r}`));
    expect(missing).toEqual([]);
    for (const x of SCENES) expect(x.refs.length, x.id).toBeGreaterThan(0);
  });

  it('decision scenes cite at least two records of their own group', () => {
    const prefix = { 인문사회: 'nar-hs-', 이공: 'nar-stem-' } as const;
    for (const x of SCENES.filter(s => s.at === 'decision')) {
      expect(x.refs.filter(r => r.startsWith(prefix[x.group!])).length, x.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('every scene is marked creative, ids are unique, and texts hold no numbers', () => {
    expect(new Set(SCENES.map(x => x.id)).size).toBe(SCENES.length);
    for (const x of SCENES) {
      expect(x.creative, x.id).toBe(true);
      const all = [x.text, ...Object.values(x.options ?? {})].join(' ');
      expect(/[0-9]/.test(all), `${x.id} has a digit`).toBe(false);   // 확률·금액은 엔진과 선택지 문구의 몫
    }
  });

  it('no real school names or program brand names (decision 0004, labor spec §5.4)', () => {
    const banned = [...schoolNamePairs(root).map(([real]) => real), 'BK21', '두뇌한국'];
    const text = SCENES.map(x => [x.text, ...Object.values(x.options ?? {})].join(' ')).join('\n');
    expect(banned.filter(b => text.includes(b))).toEqual([]);
  });
});

describe('scenes on screen (#57)', () => {
  it('a pending decision shows its group scene above the options', () => {
    let s: LifeState = createLife({ auto: false, track: 'history' }, newSeed('scene-pending'), data);
    for (let i = 0; i < 400 && !s.pending && s.stage === 'phd'; i++) s = advanceMonth(s, data, { focus: 'research' });
    expect(s.pending).not.toBeNull();
    const v = decisionView(s, data, ko);
    expect(v.scene).toBeDefined();
    expect(SCENES.find(x => x.text === v.scene)!.group).toBe('인문사회');
  });

  it('notes put the chosen option result under the decision line and scenes under hire and end lines', () => {
    const seen = { result: 0, scene: 0 };
    for (let i = 0; i < 8; i++) {
      let s: LifeState = createLife({ auto: true }, newSeed(`scene-notes${i}`), data);
      while (s.stage !== 'end' && s.month < 12 * 60) s = step(s, data);
      const list = notes(s, ko);
      list.forEach((n, k) => {
        if (!n.scene) return;
        expect(n.creative).toBe(true);
        const owner = list[k - 1]!;   // 장면 줄은 그 기록 줄 바로 다음에 온다
        expect(owner.scene).toBeUndefined();
        expect(owner.month).toBe(n.month);
        if (s.log.some(e => e.textKey.startsWith('decision.') && decisionResult(s.choices.group, e.textKey) === n.text)) seen.result += 1;
        else seen.scene += 1;
      });
    }
    expect(seen.result).toBeGreaterThan(0);
    expect(seen.scene).toBeGreaterThan(0);
  });

  it('hire context: a second hire is a switch, a hire without the PhD is no-phd', () => {
    const s: LifeState = createLife({ auto: true }, newSeed('scene-hire'), data);
    const base = { ...s, log: [
      { month: 1, textKey: 'log.hired', tags: ['career', 'hire', 'postdoc'], creative: false },
      { month: 2, textKey: 'log.hired', tags: ['career', 'hire', 'industry'], creative: false },
    ] };
    expect(hireWhen(base, 0)).toBe('first');
    expect(hireWhen(base, 1)).toBe('switch');
    expect(logScene(base, base.log[1]!, 1)!.when).toBe('switch');
    const noPhd = { ...base, career: { degreeMonth: 1, degree: 'none' as const, route: 'none' as const, annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0 } };
    expect(logScene(noPhd, noPhd.log[1]!, 1)!.when).toBe('no-phd');
  });

  it('decision scene lookup prefers the player group', () => {
    for (const g of GROUPS) expect(decisionScene(g, 'funding-expiry')!.group).toBe(g);
  });
});

describe('crisis funding-expiry (#164, decision 0023)', () => {
  const pending = (cause: string): LifeState => {
    const s = createLife({ auto: false, track: 'history' }, newSeed('crisis-expiry'), data);
    return { ...s, pending: { dp: 'funding-expiry', month: 3, context: { cause }, options: ['A', 'B', 'C', 'D'].map(key => ({ key, textKey: `decision.funding-expiry.${key}` })) } };
  };
  const cOf = (s: LifeState) => decisionView(s, data, ko).options.find(o => o.key === 'C')!;

  it('C line states the loan limit and the three-month deadline only when the cause is crisis', () => {
    expect(cOf(pending('crisis')).label).toContain(ko.play.crisisC);
    expect(ko.play.crisisC).toContain('대출 한도');
    expect(ko.play.crisisC).toContain('3개월');
    expect(cOf(pending('until')).label).toBe(ko.texts['decision.funding-expiry.C']);
    expect(cOf(pending('scholarship-review')).label).toBe(ko.texts['decision.funding-expiry.C']);
  });

  it('crisis scene variants exist per group, are creative, cite the base scene records, and replace the savings claim', () => {
    for (const g of GROUPS) {
      const base = SCENES.find(x => x.key === 'funding-expiry' && x.group === g && !x.cause)!;
      const v = SCENES.find(x => x.key === 'funding-expiry' && x.group === g && x.cause === 'crisis')!;
      expect(v, g).toBeDefined();
      expect(v.creative).toBe(true);
      expect(v.refs).toEqual(base.refs);
      expect(v.options!.C).not.toContain('저축');
      const s = { ...pending('crisis'), choices: { ...pending('crisis').choices, group: g } };
      expect(decisionView(s, data, ko).scene).toBe(v.text);
      expect(decisionView({ ...s, pending: { ...s.pending!, context: { cause: 'until' } } }, data, ko).scene).toBe(base.text);
    }
  });

  it('the chosen-option result follows the cause recorded on the decision line', () => {
    for (const g of GROUPS) {
      const v = SCENES.find(x => x.key === 'funding-expiry' && x.group === g && x.cause === 'crisis')!;
      const base = SCENES.find(x => x.key === 'funding-expiry' && x.group === g && !x.cause)!;
      expect(decisionResult(g, 'decision.funding-expiry.C', 'crisis')).toBe(v.options!.C);
      expect(decisionResult(g, 'decision.funding-expiry.C')).toBe(base.options!.C);
      expect(decisionResult(g, 'decision.funding-expiry.B', 'crisis')).toBe(base.options!.B);
    }
  });

  it('a crisis decision line records the cause and the note under it shows the crisis result', () => {
    const s = pending('crisis');
    const v = SCENES.find(x => x.key === 'funding-expiry' && x.group === s.choices.group && x.cause === 'crisis')!;
    const done = decide(s, data, 2);
    expect(done.log.at(-1)!.tags).toEqual(['decision', 'funding-expiry', 'C', 'crisis']);
    expect(notes(done, ko).some(n => n.scene && n.text === v.options!.C)).toBe(true);
  });
});
