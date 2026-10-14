// 서사 장면(#57). 장면 텍스트는 data/text/scenes.ko.json(전부 창작, 근거는 narratives 레코드 id 또는 'assumed').
// 결정 지점에는 선택지 위에 장면 문단을, 연구노트에는 고른 선택지의 결과 문장과 채용·종료 같은 기록의 장면을 붙인다.
import { decisionOutcome, type Group, type LifeState, type PendingDecision, type Route } from '../../engine/src/browser';
import pack from '../../data/text/scenes.ko.json';

export type HireWhen = 'first' | 'switch' | 'no-phd';
export interface Scene {
  id: string; at: 'decision' | 'log'; key: string; group?: Group; route?: Route; when?: HireWhen;
  text: string; options?: Readonly<Record<string, string>>; refs: readonly string[]; creative: true;
}
export const SCENES: readonly Scene[] = pack as Scene[];

type LogEntry = LifeState['log'][number];

const fits = (x: Scene, group: Group): boolean => x.group === undefined || x.group === group;

/** 결정 지점 장면. 키는 `<지점>[.<결과>]`(play.prompts 와 같다). 계열이 맞는 장면을 앞세우고, 없으면 계열 없는 장면. */
export function decisionScene(group: Group, dpKey: string): Scene | undefined {
  const items = SCENES.filter(x => x.at === 'decision' && x.key === dpKey && fits(x, group));
  return items.find(x => x.group === group) ?? items[0];
}

export function pendingScene(s: LifeState, p: PendingDecision): Scene | undefined {
  const outcome = decisionOutcome(p);
  return decisionScene(s.choices.group, outcome ? `${p.dp}.${outcome}` : p.dp);
}

/** 결정 기록 `decision.<지점>[.<결과>].<선택지>` 의 결과 문장. 선택지 뒤에 꼬리가 붙은 기록(`….B.paper-p0` 등)은 없다. */
export function decisionResult(group: Group, textKey: string): string | undefined {
  const m = /^decision\.(.+)\.([A-D])$/.exec(textKey);
  if (!m) return undefined;
  return decisionScene(group, m[1]!)?.options?.[m[2]!];
}

/**
 * 채용 기록의 맥락: 학위 없이 박사과정을 마쳤으면 `no-phd`, 앞서 채용된 적이 있으면 `switch`(다른 자리·분야로 옮김), 아니면 `first`.
 * `index` 는 그 기록의 s.log 위치.
 */
export function hireWhen(s: LifeState, index: number): HireWhen {
  if (s.career && s.career.degree !== 'phd') return 'no-phd';
  return s.log.slice(0, index).some(e => e.textKey === 'log.hired') ? 'switch' : 'first';
}

/** 기록 줄에 붙는 장면. 채용은 경로(tags[2])와 맥락으로 고르고, 맞는 맥락이 없으면 그 경로의 첫 채용 장면. */
export function logScene(s: LifeState, e: LogEntry, index: number): Scene | undefined {
  const group = s.choices.group;
  const items = SCENES.filter(x => x.at === 'log' && x.key === e.textKey && fits(x, group));
  if (e.textKey !== 'log.hired') return items.find(x => x.group === group) ?? items[0];
  const route = e.tags[2];
  const byRoute = items.filter(x => x.route === route);
  return byRoute.find(x => x.when === hireWhen(s, index)) ?? byRoute.find(x => x.when === 'first');
}
