// 브라우저용 엔진 진입점. index.ts 와 같은 공개 API 에서 Node 적재기(loadData)만 빼고,
// 내보낸 팩 텍스트(engine/sim/export-web-data.ts 출력)로 DataBundle 을 만드는 함수를 더한다.
export { createLife } from './pre/createLife';
export { advanceMonth } from './phd/tick';
export { advanceYear } from './career/tick';
export { decide, describeOptions } from './decide';
export { branch } from './branch';
export { bundleFromTexts, get, has, find } from './data/bundle';
export { ASSUMED } from './assumed';
export { toSave, fromSave, SAVE_VERSION } from './save';
export type * from './types';
export type { DataBundle, DataRecord, DataValue } from './data/bundle';
export { newSeed, cohortSeed } from './rng';
export { policyFocus, policyDecision } from './policy';

import { bundleFromTexts, type DataBundle } from './data/bundle';

/** export-web-data.ts 가 쓰는 JSON 형식. */
export interface WebDataFile { dataRevision: string; files: Record<string, string> }

export function bundleFromWebData(json: WebDataFile): DataBundle {
  return bundleFromTexts(new Map(Object.entries(json.files)), json.dataRevision);
}
