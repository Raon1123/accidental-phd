import { describe, expect, it } from 'vitest';
import { createLife, loadData } from '../../engine/src/index';
import { ARCHIVE_KEY, ARCHIVE_LIMIT, loadLife, memoryStore, readArchive, saveLife } from '../src/archive';

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
