import { describe, it, expect } from 'vitest';
import { loadData } from '../src/data/load';
import { createLife } from '../src/pre/createLife';
import { SAVE_VERSION, applyMigrations, fromSave, migrations, toSave } from '../src/save';

const data = loadData();
const life = createLife({ group: '이공', track: 'computer' }, 'APHD-SAVETEST', data);

describe('save format v1 (상태 §5)', () => {
  it('SAVE_VERSION is 1 and the migration list is empty', () => {
    expect(SAVE_VERSION).toBe(1);
    expect(migrations).toHaveLength(0);
  });

  it('toSave wraps the state: version, snapshot, replay input (seed, choices, decisions, focusHistory)', () => {
    const s = { ...life, decisions: [{ dp: 'post-qualifying' as const, month: 12, option: 'A', byPolicy: false }] };
    const save = toSave(s);
    expect(save.version).toBe(1);
    expect(save.snapshot).toEqual(s);
    expect(save.replay).toEqual({ seed: s.seed, choices: s.choices, decisions: s.decisions, focusHistory: s.phd!.focusHistory });
  });

  it('toSave does not alias the state, and a career state has an empty focusHistory', () => {
    const save = toSave(life);
    expect(save.snapshot).not.toBe(life);
    save.snapshot.stats.skill = 0;
    expect(life.stats.skill).not.toBe(0);
    expect(toSave({ ...life, phd: undefined, stage: 'career' }).replay.focusHistory).toEqual([]);
  });

  it('survives a JSON round trip: fromSave(JSON(toSave(s))) equals s', () => {
    expect(fromSave(JSON.parse(JSON.stringify(toSave(life))))).toEqual(life);
  });

  it('v1 → v1 identity: a fixed v1 save reads back unchanged (상태 §5.2 규칙 5 자리 표시)', () => {
    const fixed = JSON.parse(JSON.stringify(toSave(life)));
    expect(applyMigrations(fixed, 1, SAVE_VERSION)).toEqual(fixed);
    expect(fromSave(fixed)).toEqual(life);
  });

  it('rejects a save made by a newer version with /newer/', () => {
    expect(() => fromSave({ ...toSave(life), version: SAVE_VERSION + 1 })).toThrow(/newer/);
  });

  it('rejects non-objects, bad versions and snapshots that are not life states', () => {
    expect(() => fromSave(null)).toThrow(/not an object/);
    expect(() => fromSave([])).toThrow(/not an object/);
    expect(() => fromSave({ ...toSave(life), version: 0 })).toThrow(/invalid version/);
    expect(() => fromSave({ ...toSave(life), version: 1.5 })).toThrow(/invalid version/);
    expect(() => fromSave({ ...toSave(life), version: '1' })).toThrow(/invalid version/);
    expect(() => fromSave({ version: 1 })).toThrow(/snapshot/);
    expect(() => fromSave({ version: 1, snapshot: { seed: 1 } })).toThrow(/life state/);
  });

  it('fromSave does not mutate its input', () => {
    const save = JSON.parse(JSON.stringify(toSave(life)));
    const copy = structuredClone(save);
    fromSave(save);
    expect(save).toEqual(copy);
  });
});

describe('migration chain (상태 §5.2 규칙 1–2)', () => {
  const v1to2 = (s: unknown) => ({ ...(s as object), version: 2, added: 'b' });
  const v2to3 = (s: unknown) => ({ ...(s as { added: string }), version: 3, added: `${(s as { added: string }).added}c` });

  it('applies steps in order without skipping and returns new objects', () => {
    const v1 = { version: 1 };
    const out = applyMigrations(v1, 1, 3, [v1to2, v2to3]);
    expect(out).toEqual({ version: 3, added: 'bc' });
    expect(v1).toEqual({ version: 1 });
  });

  it('starts from the save version, not from v1', () => {
    expect(applyMigrations({ version: 2, added: 'x' }, 2, 3, [v1to2, v2to3])).toEqual({ version: 3, added: 'xc' });
  });

  it('throws when a step is missing', () => {
    expect(() => applyMigrations({ version: 1 }, 1, 3, [v1to2])).toThrow(/no migration from v2 to v3/);
  });
});
