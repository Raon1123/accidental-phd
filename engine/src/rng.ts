import type { Stream } from './types';

/** 32비트 문자열 해시 (xmur3, bryc, 공개 영역). 호출할 때마다 다음 32비트 값을 낸다. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** 32비트 PRNG (mulberry32, bryc, 공개 영역). [0,1) 을 낸다. */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 이름 붙은 슬롯 하나에서 [0,1) 난수 하나를 뽑는다(상태 §6.2). 같은 입력은 항상 같은 값이다. */
export function draw(seed: string, stream: Stream, month: number, slot: string): number {
  return mulberry32(xmur3(`${seed}|${stream}|${month}|${slot}`)())();
}

/** N(0,1) 하나. Box–Muller, 슬롯 `${slot}:a`·`${slot}:b` 를 쓴다. */
export function drawNormal(seed: string, stream: Stream, month: number, slot: string): number {
  const u1 = Math.max(draw(seed, stream, month, `${slot}:a`), 1e-12);
  const u2 = draw(seed, stream, month, `${slot}:b`);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const SEED_CHARS = 8;
const SEED_PREFIX = 'APHD-';

// 글자 하나가 5비트라 xmur3 출력 하나(32비트)로는 8자를 못 채운다. 같은 해시 함수를 8번 불러 글자마다 한 출력의 하위 5비트를 쓴다.
function base32Seed(input: string): string {
  const next = xmur3(input);
  let out = '';
  for (let i = 0; i < SEED_CHARS; i++) out += BASE32[next() % BASE32.length];
  return SEED_PREFIX + out;
}

/** 새 seed. 같은 entropy 문자열이면 같은 seed 다. 호출하는 쪽이 시각·난수 등으로 entropy 를 만든다. */
export function newSeed(entropy: string): string {
  return base32Seed(entropy);
}

/** 동기 k 의 seed (상태 §6.4). */
export function cohortSeed(seed: string, k: 1 | 2 | 3 | 4): string {
  return base32Seed(`${seed}|cohort|${k}`);
}
