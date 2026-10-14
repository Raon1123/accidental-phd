// 데이터 묶음(DataBundle)과 조회 함수. Node 모듈을 쓰지 않으므로 브라우저에서도 그대로 돈다.
// 파일 읽기와 해시는 Node 적재기(load.ts)와 웹 데이터 내보내기(engine/sim/export-web-data.ts)가 맡는다.
import type { Confidence } from '../types';

export interface DataRecord { id: string; value: number; unit: string; confidence: Confidence; note: string; source_id: string; year: number }
export interface DataValue { value: number; confidence: Confidence; id: string; unit: string }
export interface MappingRow { track: string; nrf_code: string; level: number; primary: boolean }
export interface DataBundle {
  records: Map<string, DataRecord>;
  dataRevision: string;
  root: string;
  narratives: Map<string, { id: string; track: string; stage: string; confidence: Confidence }>;
  /** `taxonomy/mapping-tracks.json` 의 행. records.json 이 아니라 따로 둔다. */
  mappingTracks: MappingRow[];
}

/** 팩 파일 텍스트 묶음. 키는 `data/packs` 아래의 `/` 구분 상대 경로다. */
export type PackTexts = ReadonlyMap<string, string>;

export const MAPPING_FILE = 'taxonomy/mapping-tracks.json';

/** 팩 파일 텍스트에서 DataBundle 을 만든다. dataRevision 은 호출자가 계산해 넘긴다(해시는 Node 쪽 일). */
export function bundleFromTexts(texts: PackTexts, dataRevision: string, root = ''): DataBundle {
  const records = new Map<string, DataRecord>();
  const narratives: DataBundle['narratives'] = new Map();
  const keys = [...texts.keys()].sort();
  const recordFiles = keys.filter(k => /^[^/]+\/records\.json$/.test(k));
  if (recordFiles.length === 0) throw new Error('no records.json in pack texts');
  for (const f of recordFiles) {
    for (const r of JSON.parse(texts.get(f)!) as DataRecord[]) {
      if (records.has(r.id)) throw new Error(`duplicate record id: ${r.id}`);
      records.set(r.id, r);
    }
  }
  for (const f of keys.filter(k => k.startsWith('narratives/') && k.endsWith('.json'))) {
    const j: unknown = JSON.parse(texts.get(f)!);
    if (!Array.isArray(j)) continue;
    for (const it of j as Record<string, unknown>[]) {
      if (typeof it?.id === 'string' && it.id.startsWith('nar-')) {
        narratives.set(it.id, { id: it.id, track: String(it.track), stage: String(it.stage), confidence: it.confidence as Confidence });
      }
    }
  }
  const mappingText = texts.get(MAPPING_FILE);
  const mappingTracks = mappingText === undefined ? [] : (JSON.parse(mappingText) as MappingRow[]);
  return { records, dataRevision, root, narratives, mappingTracks };
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

// 데이터 인자를 생략할 수 있는 옛 시그니처(nationalStep0)를 위한 기본 묶음. Node 적재기가 등록한다.
let fallback: (() => DataBundle) | undefined;
export function setDefaultData(fn: () => DataBundle): void { fallback = fn; }
export function defaultData(): DataBundle {
  if (!fallback) throw new Error('no default DataBundle: pass data explicitly (browser) or import the Node loader');
  return fallback();
}
