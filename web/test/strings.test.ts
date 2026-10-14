// 화면 문장은 web/src/strings.ko.ts 에만 둔다(결정 기록 0001). index.html 은 빈 자리만 갖는다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ko } from '../src/strings.ko';

describe('screen strings live in strings.ko.ts (#53)', () => {
  it('index.html has no Hangul outside the title tag', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8').replace(/<title>.*?<\/title>/s, '');
    expect(html.match(/[가-힣]+/g) ?? []).toEqual([]);
  });
  it('every string key is non-empty', () => {
    for (const [k, v] of Object.entries(ko)) expect(v, k).not.toBe('');
  });
});
