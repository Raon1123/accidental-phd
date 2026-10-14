// 접근성(#61): 명도 대비 4.5:1 이상(밝은·어두운 테마 모두), 첫 Tab 이 "본문 건너뛰기", 조작이 키보드로 닿는 요소인지.
// 키보드만으로 한 판을 끝까지 조작하는 확인은 헤드리스 Chrome 스크립트로 했고 결과는 PR 본문에 있다.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const css = readFileSync(join(root, 'web', 'src', 'style.css'), 'utf8');
const html = readFileSync(join(root, 'web', 'index.html'), 'utf8');
const main = readFileSync(join(root, 'web', 'src', 'main.ts'), 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1]!, m[2]!.toLowerCase()]));
}
const light = tokens(/:root\s*\{([^}]*)\}/.exec(css)![1]!);
const dark = { ...light, ...tokens(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(css)![1]!) };

/** WCAG 2.x 상대 휘도와 대비. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

// 글자 쌍: 본문, 흐린 글자(dt·legend·footer·표시), 강조(건너뛰기 링크), 버튼, 꺼진 버튼. 테두리·포커스 윤곽은 비글자라 3:1.
const TEXT: [string, string][] = [['fg', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['btn-fg', 'btn-bg'], ['btn-off', 'btn-bg']];
const NON_TEXT: [string, string][] = [['focus', 'bg'], ['muted', 'bg'], ['accent', 'bg']];

describe('contrast (#61)', () => {
  for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
    it(`${name}: text pairs are at least 4.5:1, focus ring and borders at least 3:1`, () => {
      for (const [f, b] of TEXT) expect(contrast(theme[f]!, theme[b]!), `${name} ${f}/${b}`).toBeGreaterThanOrEqual(4.5);
      for (const [f, b] of NON_TEXT) expect(contrast(theme[f]!, theme[b]!), `${name} ${f}/${b}`).toBeGreaterThanOrEqual(3);
    });
  }
  it('known value: black on white is 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
});

describe('keyboard structure (#61)', () => {
  it('the first focusable element is the skip link to main, and main can take focus', () => {
    const body = html.slice(html.indexOf('<body'));
    const first = /<(a|button|input|select|textarea)\b[^>]*>/.exec(body)!;
    expect(first[0]).toMatch(/id="skip"/);
    expect(first[0]).toMatch(/href="#main"/);
    expect(html).toMatch(/<main id="main" tabindex="-1">/);
  });

  it('every control is a native button, select or checkbox (no click handlers on other elements)', () => {
    // 리스너는 button(b)·자동 checkbox(cb)에만 붙는다. 속도와 포커스는 버튼 나열이다(#75).
    const listeners = [...main.matchAll(/(\w+)\.addEventListener\('(\w+)'/g)].map(m => `${m[1]}:${m[2]}`);
    expect(new Set(listeners)).toEqual(new Set(['b:click', 'cb:change']));
    expect(main).not.toMatch(/tabIndex\s*=\s*[1-9]/);   // 양수 tabindex 로 순서를 비틀지 않는다
  });

  it('focus is restored after re-render by data-k, and a new decision point takes focus', () => {
    expect(main).toMatch(/dataset\.k/);
    expect(main).toMatch(/\.decision h3'\)\?\.focus\(\)/);
  });
});
