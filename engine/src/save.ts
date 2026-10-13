// 저장 객체와 마이그레이션 (상태 §5). 저장 위치(localStorage)와 직렬화(JSON)는 UI 의 몫이고, 여기는 객체 모양만 다룬다.
import type { LifeState } from './types';

/** 저장 형식 버전(상태 §5.1). 형식이 바뀌면 1 올리고 `migrations` 에 함수를 하나 더한다(상태 §5.2 규칙 1). */
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  /** 빠른 불러오기용 상태 전체 */
  snapshot: LifeState;
  /** 재생 입력. 결정론(상태 §6)이 있어 이것만으로도 상태를 다시 만들 수 있다. */
  replay: {
    seed: string;
    choices: LifeState['choices'];
    decisions: LifeState['decisions'];
    focusHistory: { from: number; focus: string }[];
  };
}

/** migrations[n - 1] 은 v(n) 저장을 v(n+1) 로 바꾼다. 입력을 바꾸지 않고 새 객체를 돌려준다(상태 §5.2 규칙 1). v1 이 처음이라 비어 있다. */
export const migrations: ReadonlyArray<(save: unknown) => unknown> = [];

export function toSave(state: LifeState): SaveFile {
  return {
    version: SAVE_VERSION,
    snapshot: structuredClone(state),
    replay: {
      seed: state.seed,
      choices: structuredClone(state.choices),
      decisions: structuredClone(state.decisions),
      focusHistory: structuredClone(state.phd?.focusHistory ?? []),
    },
  };
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * `from` 버전의 저장을 `to` 버전까지 차례로 올린다(상태 §5.2 규칙 2). 중간 단계를 건너뛰지 않는다.
 * 테스트가 가짜 migrations 로 순서·불변성을 확인할 수 있게 목록과 목표 버전을 인자로 받는다.
 */
export function applyMigrations(save: unknown, from: number, to: number, list: ReadonlyArray<(save: unknown) => unknown> = migrations): unknown {
  let out = save;
  for (let v = from; v < to; v++) {
    const step = list[v - 1];
    if (!step) throw new Error(`save: no migration from v${v} to v${v + 1}`);
    out = step(out);
  }
  return out;
}

/**
 * 저장 객체를 LifeState 로 읽는다. version 이 현재보다 크면 "새 버전에서 만든 기록"이라 읽지 않는다(상태 §5.2 규칙 3).
 * 데이터 개정이 다른 저장도 읽는다 — 그 경우 막는 것은 `branch` 의 몫이다(상태 §5.3).
 */
export function fromSave(obj: unknown): LifeState {
  if (!isRecord(obj)) throw new Error('save: not an object');
  const v = obj.version;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new Error(`save: invalid version ${String(v)}`);
  if (v > SAVE_VERSION) throw new Error(`save: made by a newer version (v${v} > v${SAVE_VERSION})`);
  const migrated = applyMigrations(structuredClone(obj), v, SAVE_VERSION);
  if (!isRecord(migrated) || !isRecord(migrated.snapshot)) throw new Error('save: missing snapshot');
  const s = migrated.snapshot;
  if (typeof s.seed !== 'string' || typeof s.stage !== 'string' || typeof s.month !== 'number') throw new Error('save: snapshot is not a life state');
  return migrated.snapshot as unknown as LifeState;
}
