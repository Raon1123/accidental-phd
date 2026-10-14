// 웹 빌드용 데이터 내보내기. 엔진이 읽는 팩 파일 텍스트와 dataRevision 을 JSON 한 파일로 쓴다.
// 브라우저는 이 파일을 받아 engine/src/browser.ts 의 bundleFromWebData 로 DataBundle 을 만든다.
// 사용: npm run build:data  (기본 출력 web/public/data.json, 커밋하지 않는다)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readPackTexts, revisionOf } from '../src/data/load';

const out = process.argv[2] ?? 'web/public/data.json';
const texts = readPackTexts();
const json = { dataRevision: revisionOf(texts), files: Object.fromEntries([...texts.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(json));
console.log(`export-web-data: ${texts.size} files, dataRevision ${json.dataRevision} -> ${out}`);
