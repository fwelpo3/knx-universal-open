import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKnxFlag } from '../../packages/knx-model/src/normalize.ts';

test('canonical KNX flags normalize source-specific representations', () => {
  assert.equal(normalizeKnxFlag('Enabled'), true);
  assert.equal(normalizeKnxFlag('Disabled'), false);
  assert.equal(normalizeKnxFlag(1), true);
  assert.equal(normalizeKnxFlag('unknown'), undefined);
});
