import { describe, expect, it } from 'vitest';
import { bundleFromWebData } from '../../engine/src/browser';
import { createLife, loadData } from '../../engine/src/index';
import { readPackTexts, revisionOf } from '../../engine/src/data/load';

describe('web data bundle (#53)', () => {
  const node = loadData();
  const texts = readPackTexts();
  const web = bundleFromWebData({ dataRevision: revisionOf(texts), files: Object.fromEntries(texts) });
  it('has the same records, narratives, mapping and dataRevision as the Node loader', () => {
    expect(web.dataRevision).toBe(node.dataRevision);
    expect([...web.records.keys()]).toEqual([...node.records.keys()]);
    expect(web.narratives.size).toBe(node.narratives.size);
    expect(web.mappingTracks).toEqual(node.mappingTracks);
  });
  it('createLife gives the same state from either bundle (root aside)', () => {
    expect(createLife({}, 'APHD-WEBDATA1', web)).toEqual(createLife({}, 'APHD-WEBDATA1', node));
  });
});
