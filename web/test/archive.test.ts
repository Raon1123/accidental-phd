import { describe, expect, it } from 'vitest';
import { createLife, loadData } from '../../engine/src/index';
import { ARCHIVE_KEY, ARCHIVE_LIMIT, guardedStore, loadLife, memoryStore, readArchive, saveLife, type KeyValueStore } from '../src/archive';

const data = loadData();
const life = (i: number) => createLife({}, `APHD-TEST${String(i).padStart(4, '0')}`, data);

describe('archive (#53)', () => {
  it(`keeps the latest ${ARCHIVE_LIMIT}; the 11th save drops the oldest`, () => {
    const store = memoryStore();
    for (let i = 0; i < ARCHIVE_LIMIT + 1; i++) saveLife(store, `life-${i}`, life(i), new Date(Date.UTC(2026, 9, 14, 0, i)));
    const ids = readArchive(store).map(e => e.id);
    expect(ids).toHaveLength(ARCHIVE_LIMIT);
    expect(ids[0]).toBe(`life-${ARCHIVE_LIMIT}`);
    expect(ids).not.toContain('life-0');
  });
  it('round-trips through toSave/fromSave', () => {
    const store = memoryStore();
    const s = life(1);
    saveLife(store, 'a', s);
    expect(loadLife(store, 'a')).toEqual(s);
  });
  it('saving the same id replaces it and moves it to the front', () => {
    const store = memoryStore();
    saveLife(store, 'a', life(1));
    saveLife(store, 'b', life(2));
    saveLife(store, 'a', life(3));
    expect(readArchive(store).map(e => e.id)).toEqual(['a', 'b']);
  });
  it('treats a broken archive as empty and throws for an unknown id', () => {
    const store = memoryStore();
    store.setItem(ARCHIVE_KEY, '{not json');
    expect(readArchive(store)).toEqual([]);
    expect(() => loadLife(store, 'x')).toThrow(/no archived life/);
  });
});

describe('guarded browser store (#184)', () => {
  const throwing = (): KeyValueStore => { throw new Error('SecurityError: access denied'); };
  it('falls back to memory when opening the store throws, and keeps working', () => {
    const g = guardedStore(throwing);
    expect(g.persistent()).toBe(false);
    expect(readArchive(g.store)).toEqual([]);
    saveLife(g.store, 'a', life(1));
    expect(loadLife(g.store, 'a').seed).toBe(life(1).seed);
  });
  it('keeps a save in memory when a write throws (quota), and reports it is not persistent', () => {
    const inner = memoryStore();
    let full = false;
    const g = guardedStore(() => ({ getItem: k => inner.getItem(k), setItem: (k, v) => { if (full) throw new Error('QuotaExceededError'); inner.setItem(k, v); } }));
    expect(g.persistent()).toBe(true);
    full = true;
    expect(() => saveLife(g.store, 'b', life(2))).not.toThrow();
    expect(g.persistent()).toBe(false);
    expect(readArchive(g.store).map(e => e.id)).toEqual(['b']);
  });
  it('reads never throw', () => {
    const g = guardedStore(() => ({ getItem: () => { throw new Error('denied'); }, setItem: () => undefined }));
    expect(g.store.getItem(ARCHIVE_KEY)).toBeNull();
  });
});
