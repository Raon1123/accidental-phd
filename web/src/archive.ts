// 저장·불러오기·기록 보관. 엔진의 toSave/fromSave 를 거치고, 최근 ARCHIVE_LIMIT 개만 남긴다.
// Storage 는 주입한다(브라우저 localStorage, 테스트는 메모리 구현).
import { fromSave, toSave, type LifeState } from '../../engine/src/browser';
import type { FlavorPick } from './flavor';
import { NO_STORY, type StoryState } from './storylines';

export const ARCHIVE_LIMIT = 10;
export const ARCHIVE_KEY = 'aphd:archive:v1';

export interface KeyValueStore { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** 화면이 들고 있는 연구노트 문장(#195): 스토리라인 진행(#190)과 고른 일상 문장(#183). month 는 저장한 상태의 달. */
export interface ArchiveView { month: number; story: StoryState; flavor: FlavorPick[] }
export interface ArchiveEntry { id: string; savedAt: string; save: unknown; view?: ArchiveView }

export function readArchive(store: KeyValueStore): ArchiveEntry[] {
  const raw = store.getItem(ARCHIVE_KEY);
  if (raw === null) return [];
  try {
    const j: unknown = JSON.parse(raw);
    return Array.isArray(j) ? (j as ArchiveEntry[]) : [];
  } catch {
    return [];
  }
}

/** 상태를 맨 앞에 넣고, ARCHIVE_LIMIT 를 넘으면 가장 오래된 기록부터 지운다. 같은 id 는 덮어쓴다. */
export function saveLife(store: KeyValueStore, id: string, state: LifeState, now: Date = new Date(), view?: { story: StoryState; flavor: readonly FlavorPick[] }): ArchiveEntry[] {
  const entry: ArchiveEntry = { id, savedAt: now.toISOString(), save: toSave(state), ...(view ? { view: { month: state.month, story: view.story, flavor: [...view.flavor] } } : {}) };
  const next = [entry, ...readArchive(store).filter(e => e.id !== id)].slice(0, ARCHIVE_LIMIT);
  store.setItem(ARCHIVE_KEY, JSON.stringify(next));
  return next;
}

export function loadLife(store: KeyValueStore, id: string): LifeState {
  const e = readArchive(store).find(x => x.id === id);
  if (!e) throw new Error(`no archived life: ${id}`);
  return fromSave(e.save);
}

const isArr = (x: unknown): x is unknown[] => Array.isArray(x);

/**
 * 보관함 항목에 같이 저장한 스토리라인·일상 문장(#195). 항목에 view 가 없거나(옛 저장), 모양이 다르거나,
 * 저장한 달이 불러온 상태의 달과 다르면 빈 상태를 돌려준다(그 뒤부터 새로 쌓는다).
 */
export function loadView(store: KeyValueStore, id: string, state: LifeState): { story: StoryState; flavor: FlavorPick[] } {
  const none = { story: NO_STORY, flavor: [] as FlavorPick[] };
  const v: unknown = readArchive(store).find(x => x.id === id)?.view;
  if (typeof v !== 'object' || v === null) return none;
  const { month, story, flavor } = v as Record<string, unknown>;
  if (month !== state.month || !isArr(flavor) || typeof story !== 'object' || story === null) return none;
  const st = story as Record<string, unknown>;
  if (!isArr(st.lines) || !isArr(st.done)) return none;
  return { story: st as unknown as StoryState, flavor: flavor as FlavorPick[] };
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

const PROBE_KEY = 'aphd:probe';

/**
 * 브라우저 저장소를 연다(#184). 저장소 접근이 던지면(사이트 데이터 차단, 일부 사생활 모드) 메모리 저장소로 대신하고
 * persistent 를 false 로 둔다. 연 뒤에 쓰기가 던지면(용량 초과) 그 값은 메모리에 두고 persistent 를 false 로 바꾼다.
 * 읽기·쓰기 어느 쪽도 바깥으로 던지지 않는다.
 */
export function guardedStore(open: () => KeyValueStore): { store: KeyValueStore; persistent: () => boolean } {
  const memory = new Map<string, string>();   // 쓰기에 실패한 값(성공한 쓰기는 이 칸을 지운다)
  let inner: KeyValueStore | undefined;
  try {
    inner = open();
    inner.setItem(PROBE_KEY, '1');
    inner.getItem(PROBE_KEY);
  } catch { inner = undefined; }
  let ok = inner !== undefined;
  const store: KeyValueStore = {
    getItem: k => {
      const v = memory.get(k);
      if (v !== undefined || !inner) return v ?? null;
      try { return inner.getItem(k); } catch { return null; }
    },
    setItem: (k, v) => {
      if (inner) {
        try { inner.setItem(k, v); memory.delete(k); return; } catch { ok = false; }
      }
      memory.set(k, v);
    },
  };
  return { store, persistent: () => ok };
}
