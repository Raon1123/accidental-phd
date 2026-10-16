// 픽셀 장면과 삽화(#151, docs/design/pixel-scenes.md). DOM 없음: 사각형 목록만 만들고 그리기는 main.ts 가 한다.
// 색은 style.css 의 토큰 이름(앞의 -- 없이)으로만 적는다. 그림은 이 저장소에서 새로 그렸다(0002, 0004).
import type { LifeState } from '../../engine/src/browser';
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

// ── 단계 장면: 가운데 96×40 그림 + 좌우로 늘어나는 바탕. 넓은 장면·초상·상태 줄 초상은 width·ox 로 잘라 쓴다(#152–#154) ──
export type SceneStage = 'phd' | 'career' | 'retire';
export const SCENE_W = 96;
export const SCENE_H = 40;

const R = (x: number, y: number, w: number, h: number, c: string): Rect => ({ x, y, w, h, c });
const PERSON = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.skssks.', '.ssssss.', '..ssss..', '.tttttt.', 'tttttttt', 's.tttt.s', '..pppp..', '..p..p..', '..k..k..'];

interface SceneDef { person: { x: number; y: number }; ground(width: number): Rect[]; art(): Rect[] }

const SCENES: Readonly<Record<SceneStage, SceneDef>> = {
  // 박사과정: 밤의 연구실. 창문과 달, 책장, 모니터 앞에 앉은 인물
  phd: {
    person: { x: 34, y: 17 },
    ground: W => [R(0, 0, W, 26, 'lab-wall'), R(0, 26, W, 8, 'lab-wall2'), R(0, 34, W, 6, 'lab-floor'), R(0, 34, W, 1, 'px-wood2')],
    art: () => {
      const r = [R(6, 5, 22, 16, 'lab-frame'), R(7, 6, 20, 14, 'lab-night'), R(16, 6, 1, 14, 'lab-frame'), R(7, 12, 20, 1, 'lab-frame'),
        R(22, 8, 3, 3, 'lab-moon'), R(9, 8, 1, 1, 'lab-moon'), R(13, 15, 1, 1, 'lab-moon'), R(19, 17, 1, 1, 'lab-moon'), R(10, 17, 1, 1, 'lab-moon'),
        R(70, 6, 20, 28, 'px-wood'), R(71, 7, 18, 26, 'px-wood2')];
      const books = ['px-book1', 'px-book2', 'px-book3', 'px-sun', 'px-white'];
      [8, 15, 22, 29].forEach((y, row) => {
        r.push(R(71, y + 5, 18, 1, 'px-wood'));
        for (let i = 0; i < 7; i++) { const short = i % 3 === 0 ? 1 : 0; r.push(R(72 + i * 2 + (row % 2), y + short, 2, 5 - short, books[(i + row) % 5]!)); }
      });
      r.push(R(33, 20, 10, 9, 'px-chair'), ...spriteRects(PERSON, 34, 17),
        R(44, 13, 14, 10, 'px-ink'), R(45, 14, 12, 8, 'lab-screen'), R(46, 16, 6, 1, 'px-ink'), R(46, 18, 8, 1, 'px-ink'), R(46, 20, 4, 1, 'px-ink'), R(50, 23, 2, 1, 'px-ink'),
        R(28, 24, 36, 2, 'px-wood'), R(29, 26, 2, 8, 'px-wood2'), R(61, 26, 2, 8, 'px-wood2'), R(59, 21, 3, 3, 'px-white'));
      return r;
    },
  },
  // 경력: 낮의 연구 기관 건물 앞, 가방 든 인물(실제 건물을 본뜨지 않는다)
  career: {
    person: { x: 70, y: 22 },
    ground: W => [R(0, 0, W, 34, 'car-sky'), R(0, 34, W, 6, 'car-grass')],
    art: () => {
      const r = [R(80, 4, 6, 6, 'px-sun'), R(4, 6, 10, 2, 'car-cloud'), R(6, 4, 5, 2, 'car-cloud'), R(56, 3, 12, 2, 'car-cloud'), R(59, 1, 6, 2, 'car-cloud'),
        R(30, 3, 24, 3, 'car-bldg2'), R(18, 6, 48, 2, 'car-bldg2'), R(20, 8, 44, 26, 'car-bldg')];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) if (!(j === 2 && (i === 2 || i === 3))) r.push(R(23 + i * 7, 11 + j * 7, 3, 4, 'car-win'));
      r.push(R(38, 26, 8, 8, 'px-ink'), R(41, 26, 2, 8, 'car-bldg2'), R(38, 34, 8, 6, 'car-path'),
        R(9, 24, 3, 10, 'px-trunk'), R(4, 14, 13, 11, 'px-leaf'), R(6, 12, 9, 2, 'px-leaf'), R(6, 15, 4, 3, 'px-leaf2'),
        ...spriteRects(PERSON, 70, 22), R(78, 29, 4, 4, 'px-wood'), R(79, 28, 2, 1, 'px-wood2'));
      return r;
    },
  },
  // 은퇴: 노을 지는 공원 벤치에 앉은 인물
  retire: {
    person: { x: 62, y: 18 },
    ground: W => [R(0, 0, W, 8, 'ret-d1'), R(0, 8, W, 8, 'ret-d2'), R(0, 16, W, 8, 'ret-d3'), R(0, 24, W, 6, 'ret-d4'), R(0, 26, W, 8, 'ret-hill'), R(0, 34, W, 6, 'ret-grass')],
    art: () => [R(42, 20, 12, 10, 'px-sun'), R(40, 22, 16, 6, 'px-sun'), R(0, 26, 42, 8, 'ret-hill'), R(30, 28, 66, 6, 'ret-hill2'),
      R(18, 6, 1, 1, 'px-ink'), R(19, 7, 1, 1, 'px-ink'), R(20, 6, 1, 1, 'px-ink'), R(26, 9, 1, 1, 'px-ink'), R(27, 10, 1, 1, 'px-ink'), R(28, 9, 1, 1, 'px-ink'),
      R(56, 24, 18, 1, 'px-wood2'), R(56, 25, 1, 4, 'px-wood2'), R(73, 25, 1, 4, 'px-wood2'),
      ...spriteRects(PERSON.slice(0, 9), 62, 18), R(64, 27, 4, 2, 'px-pants'),
      R(54, 29, 22, 2, 'px-wood'), R(56, 31, 1, 3, 'px-wood2'), R(73, 31, 1, 3, 'px-wood2'),
      R(85, 22, 3, 12, 'px-trunk'), R(80, 12, 13, 11, 'px-leaf'), R(82, 10, 9, 2, 'px-leaf'), R(83, 13, 4, 3, 'px-leaf2')],
  },
};

export function scenePerson(stage: SceneStage): { x: number; y: number } { return SCENES[stage].person; }

const sceneCache = new Map<string, readonly Rect[]>();
/** width = 그림 가로 칸 수, ox = 가운데 그림의 왼쪽 시작(없으면 가운데 정렬), bubble = 인물 위 말풍선 아이콘. */
export function sceneRects(stage: SceneStage, opts: { width: number; ox?: number; bubble?: Icon }): readonly Rect[] {
  const ox = opts.ox ?? Math.floor((opts.width - SCENE_W) / 2);
  const key = `${stage}|${opts.width}|${ox}|${opts.bubble ?? ''}`;
  const hit = sceneCache.get(key);
  if (hit) return hit;
  const d = SCENES[stage];
  const shift = (r: Rect): Rect => ({ ...r, x: r.x + ox });
  const out = [...d.ground(opts.width), ...d.art().map(shift)];
  if (opts.bubble) {
    const bx = d.person.x + 7, by = Math.max(0, d.person.y - 17);
    out.push(...[R(bx, by, 16, 16, 'px-ink'), R(bx + 1, by + 1, 14, 14, 'px-white'), R(bx + 1, by + 16, 2, 1, 'px-ink'), ...spriteRects(ICONS[opts.bubble], bx + 2, by + 2)].map(shift));
  }
  sceneCache.set(key, out);
  return out;
}

/** 엔진 단계 → 장면. 기록 종료는 은퇴했으면 은퇴, 경력이 있으면 경력, 아니면 박사과정. 시작 전은 그림 없음. */
export function sceneOf(s: Pick<LifeState, 'stage' | 'career' | 'log'>): SceneStage | undefined {
  switch (s.stage) {
    case 'pre': return undefined;
    case 'phd': return 'phd';
    case 'career': return 'career';
    case 'retired': return 'retire';
    case 'end': return s.log.some(e => e.textKey === 'log.retired') ? 'retire' : s.career ? 'career' : 'phd';
  }
}

const BIG = new Set(['life.start', 'log.degree', 'log.hired', 'log.retired']);
/** 큰 사건(#154에서 넓은 장면을 띄운다): 입학, 학위, 채용, 은퇴, 모든 기록 종료. */
export function isBigEvent(textKey: string): boolean {
  return BIG.has(textKey) || textKey.startsWith('log.end-');
}
