// 엔진 공개 API (계획 "공유 인터페이스").
// advanceMonth 는 Task 7(phd/tick.ts)이 만들어진 뒤 그 쪽에서 이 파일에 한 줄로 더한다: export { advanceMonth } from './phd/tick';
export { createLife } from './pre/createLife';
export { advanceMonth } from './phd/tick';
export { advanceYear } from './career/tick';
export { decide, describeOptions } from './decide';
export { branch } from './branch';
export { loadData, get, has, find } from './data/load';
export { ASSUMED } from './assumed';
export { toSave, fromSave, SAVE_VERSION } from './save';
export type * from './types';
export type { DataBundle } from './data/load';
export { newSeed, cohortSeed } from './rng';
export { policyFocus, policyDecision } from './policy';
export { TRACKS, groupOf } from './data/taxonomy';
