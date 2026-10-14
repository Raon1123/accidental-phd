// 가상 뉴스 줄(#58). 헤드라인·본문은 텍스트 팩 data/text/news.ko.json(전부 창작), 효과 태그는 엔진 뉴스 종류(결정 기록 0014 #119)에서.
// 노동 스펙 §5.4: 뉴스 카드마다 창작 표시, 효과는 "게임 설정", 목록 아래 "가상 뉴스" 안내.
import { ASSUMED, type LifeState, type NewsEffect } from '../../engine/src/browser';
import pack from '../../data/text/news.ko.json';
import type { Strings } from './strings.ko';

export interface NewsText { id: string; type: string; headline: string; body: string; creative: true }
export const NEWS_TEXT: readonly NewsText[] = pack as NewsText[];

type NewsType = (typeof ASSUMED.NEWS_TYPES)[number];
type LogEntry = LifeState['log'][number];

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));

export function newsType(id: string): NewsType {
  const n = ASSUMED.NEWS_TYPES.find(x => x.id === id);
  if (!n) throw new Error(`unknown news type: ${id}`);
  return n;
}

/** 그 종류의 헤드라인 중 하나. 같은 달이면 늘 같은 문장(달로 고른다). 헤드라인이 없으면 던진다. */
export function newsText(type: string, month: number): NewsText {
  const items = NEWS_TEXT.filter(x => x.type === type);
  if (items.length === 0) throw new Error(`no headline for news type: ${type}`);
  return items[month % items.length]!;
}

function targetLabel(n: NewsType, t: Strings): string {
  const vals = n.target.values as readonly string[];
  switch (n.target.kind) {
    case 'all': return t.news.targetAll;
    case 'group': return vals.map(v => fill(t.news.targetGroup, { v })).join('·');
    case 'kedi': return vals.map(v => t.news.kedi[v as keyof typeof t.news.kedi]).join('·');
    case 'track': return vals.map(v => t.trackNames[v as keyof typeof t.trackNames]).join('·');
  }
}

const pct = (x: number): number => Math.round(Math.abs(x) * 100);

/**
 * 효과 태그. 아직 유효한 효과(state.news)가 있으면 실제로 뽑힌 크기·기간을, 이미 끝났으면 그 종류의 범위를 보여준다
 * (엔진은 끝난 효과를 지운다).
 */
export function newsTag(type: string, month: number, s: LifeState | undefined, t: Strings): string {
  const n = newsType(type);
  const live: NewsEffect | undefined = s?.news.find(x => x.type === type && x.startMonth === month);
  const [eLo, eHi] = n.effect;
  const [mLo, mHi] = n.months;
  const sign = eLo < 0 ? '−' : '+';
  const effect = live
    ? fill(t.news.effect, { sign, n: pct(live.effect) })
    : `${sign}${fill(t.news.effectRange, { lo: Math.min(pct(eLo), pct(eHi)), hi: Math.max(pct(eLo), pct(eHi)) })}`;
  const months = live ? fill(t.news.months, { n: live.untilMonth - live.startMonth + 1 }) : fill(t.news.monthsRange, { lo: mLo, hi: mHi });
  const routes = (n.routes as readonly string[]).map(r => t.cohort.routeNames[r as keyof typeof t.cohort.routeNames]).join('·');
  return fill(t.news.tag, { target: targetLabel(n, t), routes, effect, months });
}

/** 연구노트의 뉴스 한 줄: 헤드라인. 본문 (효과 태그). 로그 줄의 tags[1] 이 뉴스 종류다. */
export function newsLine(e: LogEntry, t: Strings, s?: LifeState): string {
  const type = e.tags[1];
  if (e.tags[0] !== 'news' || !type) throw new Error(`not a news log entry: ${e.textKey}`);
  const item = newsText(type, e.month);
  return `${item.headline}. ${item.body} (${newsTag(type, e.month, s, t)})`;
}
