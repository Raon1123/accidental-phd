// 소스·CSS 를 글자로 읽어 확인하는 시험 도우미(이 저장소의 web 시험은 DOM 없이 돈다). #152 에서 만들고 #153·#154 가 쓴다.
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `{` 가 있는 위치 open 에서 짝이 맞는 `}` 까지의 안쪽 글. */
export function balanced(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}

/** `head {` 로 시작하는 모든 블록의 안쪽 글(같은 @media 가 여러 번 있을 수 있다). */
export function blocks(css: string, head: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(new RegExp(`${escapeRe(head)}\\s*\\{`, 'g'))) out.push(balanced(css, m.index! + m[0].length - 1));
  return out;
}

/** `head {…}` 블록을 통째로 뺀 CSS. */
export function stripBlocks(css: string, head: string): string {
  let out = css;
  for (;;) {
    const m = new RegExp(`${escapeRe(head)}\\s*\\{`).exec(out);
    if (!m) return out;
    const open = m.index + m[0].length - 1;
    out = out.slice(0, m.index) + out.slice(open + balanced(out, open).length + 2);
  }
}

/** 선택자 하나의 규칙 안쪽 글. 선택자 앞은 `}`·공백·글 처음이어야 하고 뒤는 곧바로 `{` 여야 한다(`.a svg {` 는 `.a` 가 아니다). 없으면 undefined. */
export function ruleBody(css: string, selector: string): string | undefined {
  const m = new RegExp(`(?:^|[}\\s])${escapeRe(selector)}\\s*\\{`).exec(css);
  return m ? balanced(css, m.index + m[0].length - 1) : undefined;
}

/** `function name(…)` 의 본문(매개변수에 `)` 가 없는 함수만). */
export function fnBody(src: string, name: string): string {
  const m = new RegExp(`function ${escapeRe(name)}\\([^)]*\\)[^{]*\\{`).exec(src);
  if (!m) throw new Error(`no function ${name}`);
  return balanced(src, m.index + m[0].length - 1);
}
