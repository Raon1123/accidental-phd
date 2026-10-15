// 픽셀 장면과 삽화(#151, docs/design/pixel-scenes.md). DOM 없음: 사각형 목록만 만들고 그리기는 main.ts 가 한다.
// 색은 style.css 의 토큰 이름(앞의 -- 없이)으로만 적는다. 그림은 이 저장소에서 새로 그렸다(0002, 0004).
import type { NoteKind } from './play';

export interface Rect { x: number; y: number; w: number; h: number; c: string }
export type Icon = 'star' | 'fail' | 'leave' | 'degree' | 'hired' | 'news' | 'decision' | 'start' | 'end';

/** 그림 지도 글자 → 색 토큰. '.' 은 빈칸. */
export const PAL: Readonly<Record<string, string>> = {
  k: 'px-ink', w: 'px-white', s: 'px-skin', h: 'px-hair', t: 'px-shirt', p: 'px-pants',
  y: 'px-sun', r: 'px-red', b: 'px-wood', o: 'px-wood2', g: 'px-leaf',
};

/** 문자 지도 → 사각형. 한 행에서 같은 글자가 이어지면 한 사각형으로 합친다. */
export function spriteRects(map: readonly string[], x0 = 0, y0 = 0): Rect[] {
  const out: Rect[] = [];
  map.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i]!;
      let n = 1;
      while (row[i + n] === ch) n++;
      if (ch !== '.') out.push({ x: x0 + i, y: y0 + j, w: n, h: 1, c: PAL[ch]! });
      i += n;
    }
  });
  return out;
}

/** 사건 아이콘 12×12. */
export const ICONS: Readonly<Record<Icon, readonly string[]>> = {
  star: ['.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '..yyyyyyyy..', '..yyy..yyy..', '.yyy....yyy.', '.yy......yy.', '............'],
  fail: ['.wwwwwwww...', '.wkkkkwwww..', '.wwwwwwwwww.', '.wr.wwww.rw.', '.wwr.ww.rww.', '.wwwr..rwww.', '.wwwwrrwwww.', '.wwwr..rwww.', '.wwr.ww.rww.', '.wr.wwww.rw.', '.wwwwwwwwww.', '............'],
  leave: ['.oooooooooo.', '..o......o..', '..o.yyyy.o..', '...o.yy.o...', '....o..o....', '.....oo.....', '....o..o....', '...o....o...', '..o..yy..o..', '..oyyyyyyo..', '.oooooooooo.', '............'],
  degree: ['............', '.....kk.....', '...kkkkkk...', '.kkkkkkkkkk.', 'kkkkkkkkkkkk', '.kkkkkkkkkky', '...kkkkkk..y', '...kkkkkk..y', '...kkkkkk.yy', '....kkkk..yy', '............', '............'],
  hired: ['............', '....oooo....', '....o..o....', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbyybbbb.', '.oooobboooo.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.oooooooooo.', '............', '............'],
  news: ['............', '............', '.wwwwwwwwww.', '.wkwwwwwwkw.', '.wwkwwwwkww.', '.wwwkwwkwww.', '.wwwwkkwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.kkkkkkkkkk.', '............', '............'],
  decision: ['.....oo.....', '.bbbbbbbbb..', '.bbbbbbbbbb.', '.bbbbbbbbb..', '.....oo.....', '..bbbbbbbbb.', '.bbbbbbbbbb.', '..bbbbbbbbb.', '.....oo.....', '.....oo.....', '....oooo....', '............'],
  start: ['............', '.kkkk..kkkk.', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', '.kkkkkkkkkk.', '.....kk.....', '............'],
  end: ['.k..........', '.kyyyyyy....', '.kyyyyyyyy..', '.kyyyyyyy...', '.kyyyyyyyyy.', '.kyyyyyy....', '.k..........', '.k..........', '.k..........', '.k..........', 'kkk.........', '............'],
};

const iconCache = new Map<Icon, readonly Rect[]>();
export function iconRects(icon: Icon): readonly Rect[] {
  let r = iconCache.get(icon);
  if (!r) { r = spriteRects(ICONS[icon]); iconCache.set(icon, r); }
  return r;
}

const ICON_BY_KEY: Readonly<Record<string, Icon>> = {
  'log.qual-pass': 'star', 'log.promotion': 'star',
  'log.defense-pass': 'degree', 'log.degree': 'degree', 'log.end-degree': 'degree',
  'log.hired': 'hired', 'life.start': 'start', 'log.retired': 'end', 'log.end-age80': 'end',
};
const ICON_BY_KIND: Readonly<Partial<Record<NoteKind, Icon>>> = {
  good: 'star', bad: 'fail', leave: 'leave', news: 'news', decision: 'decision', start: 'start', end: 'end',
};

/** 연구노트 한 줄의 아이콘. 키로 먼저 정하고 나머지는 종류를 따른다. 장면·평범한 줄은 없음. */
export function iconOf(textKey: string, kind: NoteKind): Icon | undefined {
  if (kind === 'scene' || kind === 'plain') return undefined;
  return ICON_BY_KEY[textKey] ?? ICON_BY_KIND[kind];
}
