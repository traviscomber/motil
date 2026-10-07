import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const detail = await readFile(new URL('../components/maintenance/work-order-detail.tsx', import.meta.url), 'utf8');

test('OT detail avoids duplicate equipment code and name', () => {
  assert.match(detail, /function assetIdentity/);
  assert.match(detail, /normalize\(assetName\) !== normalize\(assetCode\)/);
  assert.match(detail, /assetName \|\| assetCode \|\| t\.noAsset/);
  assert.match(detail, /assetIdentity\(workOrder\.asset_code, workOrder\.asset_name, t\)/);
});
