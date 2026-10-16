// 그림 설정(#151): 모두 / 간단히 / 끄기. 저장소가 없거나 막혀도 화면이 멈추지 않는다.
import { describe, expect, it } from 'vitest';
import { ART_KEY, ART_MODES, loadArt, saveArt } from '../src/art';
import { ko } from '../src/strings.ko';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

describe('picture setting (#151)', () => {
  it('defaults to full when nothing, an unknown value or no store is there', () => {
    expect(loadArt(mem())).toBe('full');
    const s = mem(); s.setItem(ART_KEY, 'loud');
    expect(loadArt(s)).toBe('full');
    expect(loadArt(undefined)).toBe('full');
  });
  it('round-trips every mode', () => {
    for (const m of ART_MODES) { const s = mem(); saveArt(s, m); expect(loadArt(s)).toBe(m); }
  });
  it('a blocked store neither throws nor changes the default', () => {
    expect(() => saveArt(broken, 'off')).not.toThrow();
    expect(loadArt(broken)).toBe('full');
  });
  it('every mode has a label', () => {
    for (const m of ART_MODES) expect(ko.art[m]).not.toBe('');
    expect(ko.art.label).not.toBe('');
  });
});
