// 데이터 팩 적재기(Node 전용). 파일을 읽고 dataRevision 을 계산한 뒤 bundle.ts 의 bundleFromTexts 로 묶음을 만든다.
// 읽는 파일: data/packs/*/records.json (taxonomy 포함), data/packs/narratives/**/*.json, taxonomy/mapping-tracks.json.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleFromTexts, MAPPING_FILE, setDefaultData, type DataBundle } from './bundle';

export { find, get, has } from './bundle';
export type { DataBundle, DataRecord, DataValue, MappingRow } from './bundle';

/** `import.meta.url` 에서 위로 올라가며 package.json 이 있는 디렉터리(저장소 루트)를 찾는다. */
function findRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('repository root (package.json) not found');
    dir = parent;
  }
}

/** 디렉터리 아래의 `.json` 파일을 재귀로 모은다. 경로는 `/` 구분자의 상대 경로, 사전순. */
function walkJson(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walkJson(dir, r));
    else if (e.name.endsWith('.json')) out.push(r);
  }
  return out.sort();
}

// 줄바꿈 정규화: Windows 의 core.autocrlf 로 CRLF 가 되어도 해시가 같도록 한다.
const sha256 = (text: string): string => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

/** 엔진이 읽는 팩 파일 전부의 텍스트. 키는 `data/packs` 아래 상대 경로. dataRevision 에 들어가는 파일과 같다. */
export function readPackTexts(root: string = findRoot()): Map<string, string> {
  const packs = join(root, 'data', 'packs');
  const files = readdirSync(packs, { withFileTypes: true })
    .filter(e => e.isDirectory() && existsSync(join(packs, e.name, 'records.json')))
    .map(e => `${e.name}/records.json`)
    .sort();
  if (files.length === 0) throw new Error(`no records.json under ${packs}`);
  const texts = new Map<string, string>();
  for (const f of files) texts.set(f, readFileSync(join(packs, f), 'utf8'));
  const narDir = join(packs, 'narratives');
  if (existsSync(narDir)) for (const f of walkJson(narDir)) texts.set(`narratives/${f}`, readFileSync(join(narDir, f), 'utf8'));
  if (existsSync(join(packs, MAPPING_FILE))) texts.set(MAPPING_FILE, readFileSync(join(packs, MAPPING_FILE), 'utf8'));
  return texts;
}

/** 파일 경로 사전순으로 각 파일의 sha256 을 이어 붙여 다시 해시한 앞 16자. */
export function revisionOf(texts: ReadonlyMap<string, string>): string {
  const digests = [...texts.keys()].sort().map(k => sha256(texts.get(k)!));
  return createHash('sha256').update(digests.join('')).digest('hex').slice(0, 16);
}

export function loadData(root: string = findRoot()): DataBundle {
  const texts = readPackTexts(root);
  return bundleFromTexts(texts, revisionOf(texts), root);
}

let cached: DataBundle | undefined;
setDefaultData(() => (cached ??= loadData()));
