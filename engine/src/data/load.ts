// 데이터 팩 적재기. 엔진의 다른 모듈은 여기서 만든 DataBundle 만 본다.
// 읽는 파일: data/packs/*/records.json (taxonomy 포함) 과 data/packs/narratives/**/*.json 의 서사 배열.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Confidence } from '../types';

export interface DataRecord { id: string; value: number; unit: string; confidence: Confidence; note: string; source_id: string; year: number }
export interface DataValue { value: number; confidence: Confidence; id: string; unit: string }
export interface DataBundle {
  records: Map<string, DataRecord>;
  dataRevision: string;
  root: string;
  narratives: Map<string, { id: string; track: string; stage: string; confidence: Confidence }>;
}

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

export function loadData(root: string = findRoot()): DataBundle {
  const packs = join(root, 'data', 'packs');
  const files = readdirSync(packs, { withFileTypes: true })
    .filter(e => e.isDirectory() && existsSync(join(packs, e.name, 'records.json')))
    .map(e => `${e.name}/records.json`)
    .sort();
  if (files.length === 0) throw new Error(`no records.json under ${packs}`);

  const records = new Map<string, DataRecord>();
  // dataRevision 에 들어가는 파일: 엔진이 읽는 모든 팩 파일(records.json, 서사 json, mapping-tracks.json). 경로 사전순.
  const hashed = new Map<string, string>();
  for (const f of files) {
    const text = readFileSync(join(packs, f), 'utf8');
    hashed.set(f, text);
    for (const r of JSON.parse(text) as DataRecord[]) {
      if (records.has(r.id)) throw new Error(`duplicate record id: ${r.id}`);
      records.set(r.id, r);
    }
  }
  const narratives: DataBundle['narratives'] = new Map();
  const narDir = join(packs, 'narratives');
  if (existsSync(narDir)) {
    for (const f of walkJson(narDir)) {
      const text = readFileSync(join(narDir, f), 'utf8');
      hashed.set(`narratives/${f}`, text);
      const j: unknown = JSON.parse(text);
      if (!Array.isArray(j)) continue;
      for (const it of j as Record<string, unknown>[]) {
        if (typeof it?.id === 'string' && it.id.startsWith('nar-')) {
          narratives.set(it.id, { id: it.id, track: String(it.track), stage: String(it.stage), confidence: it.confidence as Confidence });
        }
      }
    }
  }
  const mapping = 'taxonomy/mapping-tracks.json';
  if (existsSync(join(packs, mapping))) hashed.set(mapping, readFileSync(join(packs, mapping), 'utf8'));
  const digests = [...hashed.keys()].sort().map(k => sha256(hashed.get(k)!));
  const dataRevision = createHash('sha256').update(digests.join('')).digest('hex').slice(0, 16);
  return { records, dataRevision, root, narratives };
}

export function get(data: DataBundle, id: string): DataValue {
  const r = data.records.get(id);
  if (!r) throw new Error(`record not found: ${id}`);
  return { value: r.value, confidence: r.confidence, id: r.id, unit: r.unit };
}

export function has(data: DataBundle, id: string): boolean {
  return data.records.has(id);
}

export function find(data: DataBundle, prefix: string): DataRecord[] {
  const out: DataRecord[] = [];
  for (const r of data.records.values()) if (r.id.startsWith(prefix)) out.push(r);
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
