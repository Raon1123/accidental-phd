import { describe, it, expect } from 'vitest';
import { draw, drawNormal, newSeed, cohortSeed } from '../src/rng';
describe('draw', () => {
  it('is deterministic and in [0,1)', () => {
    const a = draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict');
    expect(a).toBe(draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict'));
    expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(1);
  });
  it('differs by slot, month, stream, seed', () => {
    const base = draw('APHD-AAAAAAAA', 'paper', 3, 'p1:verdict');
    expect(draw('APHD-AAAAAAAA', 'paper', 3, 'p2:verdict')).not.toBe(base);
    expect(draw('APHD-AAAAAAAA', 'paper', 4, 'p1:verdict')).not.toBe(base);
    expect(draw('APHD-AAAAAAAA', 'exam', 3, 'p1:verdict')).not.toBe(base);
    expect(draw('APHD-BBBBBBBB', 'paper', 3, 'p1:verdict')).not.toBe(base);
  });
  it('drawNormal has mean≈0 sd≈1 over 2000 slots', () => {
    const xs = Array.from({ length: 2000 }, (_, i) => drawNormal('APHD-AAAAAAAA', 'init', 0, `n${i}`));
    const m = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    expect(Math.abs(m)).toBeLessThan(0.08); expect(Math.abs(sd - 1)).toBeLessThan(0.08);
  });
  it('newSeed matches APHD-[A-Z2-7]{8}; cohortSeed is stable', () => {
    expect(newSeed('x')).toMatch(/^APHD-[A-Z2-7]{8}$/);
    expect(cohortSeed('APHD-AAAAAAAA', 1)).toBe(cohortSeed('APHD-AAAAAAAA', 1));
    expect(cohortSeed('APHD-AAAAAAAA', 1)).not.toBe(cohortSeed('APHD-AAAAAAAA', 2));
    expect(cohortSeed('APHD-AAAAAAAA', 1)).toMatch(/^APHD-[A-Z2-7]{8}$/);
  });
  it('newSeed is deterministic and depends on entropy', () => {
    expect(newSeed('x')).toBe(newSeed('x'));
    expect(newSeed('x')).not.toBe(newSeed('y'));
  });
});
