// 웹 출처 footer 용 출처 목록(#60). data/sources/registry.json 과 registry.d/*.json 을 합쳐 id → {제목, 발행처, 연도}만 내보낸다.
// 화면에 실명이 나가지 않도록(결정 기록 0004) 학교 실명은 빌드할 때 여기서 가상 표시명으로 바꾼다. 매핑 정본은 data/packs/schools/README.md.
// URL 과 note 는 내보내지 않는다(학교 도메인·실명이 그대로 들어 있다).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface WebSource { title: string; publisher: string; year: number }
interface RegistryEntry { id: string; title: string; publisher: string; year: number }

/** README 매핑 표에서 [실명, 표시명] 쌍. 줄임형(…대, …여대)도 더한다. 긴 것부터 바꾸도록 길이 내림차순. */
export function schoolNamePairs(root: string): [string, string][] {
  const md = readFileSync(join(root, 'data', 'packs', 'schools', 'README.md'), 'utf8');
  const pairs: [string, string][] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*([a-z]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(line);
    if (!m || m[1] === 'school_id') continue;
    const real = m[2]!, shown = m[3]!;
    pairs.push([real, shown]);
    if (real.endsWith('대학교') && shown.endsWith('대학교')) pairs.push([real.slice(0, -2), shown.slice(0, -2)]);
    if (real.endsWith('여자대학교') && shown.endsWith('여자대학교')) pairs.push([`${real.slice(0, -5)}여대`, `${shown.slice(0, -5)}여대`]);
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
}

export function maskNames(text: string, pairs: readonly [string, string][]): string {
  let out = text;
  for (const [real, shown] of pairs) out = out.split(real).join(shown);
  return out;
}

/** 출처 목록(id 사전순). 제목과 발행처의 학교 실명은 가상 표시명으로 바꾼다. */
export function readWebSources(root: string): Record<string, WebSource> {
  const dir = join(root, 'data', 'sources');
  const files = [join(dir, 'registry.json'), ...readdirSync(join(dir, 'registry.d')).filter(f => f.endsWith('.json')).sort().map(f => join(dir, 'registry.d', f))];
  const pairs = schoolNamePairs(root);
  const out: Record<string, WebSource> = {};
  const entries = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')) as RegistryEntry[]).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const e of entries) out[e.id] = { title: maskNames(e.title, pairs), publisher: maskNames(e.publisher, pairs), year: e.year };
  return out;
}
