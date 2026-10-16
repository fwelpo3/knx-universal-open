import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasComplementaryDirections,
  hasRepeatedConsolidationDevice,
  isGenericConsolidationName,
  linkedGaConflict,
  normalizeConsolidationDpt,
  objectDirection,
  sharedConsolidationGa,
} from '../../packages/knx-engineering/src/consolidation/utils.ts';

const member = (deviceId: string, linkedGas: string[] = [], direction: any = 'unknown') => ({
  deviceId, linkedGas, direction,
}) as any;

test('consolidation DPTs use stable x.xxx notation', () => {
  assert.equal(normalizeConsolidationDpt('DPST-1-1'), '1.001');
  assert.equal(normalizeConsolidationDpt('9.7'), '9.007');
});

test('existing shared GAs are treated as hard evidence and conflicts are detected', () => {
  const members = [member('a', ['1/1/1', '1/1/2']), member('b', ['1/1/1'])];
  assert.equal(sharedConsolidationGa(members), '1/1/1');
  assert.equal(linkedGaConflict(members), false);
  assert.equal(linkedGaConflict([member('a', ['1/1/1']), member('b', ['1/1/2'])]), true);
});

test('duplicate device membership is rejected by the consolidation preconditions', () => {
  assert.equal(hasRepeatedConsolidationDevice([member('a'), member('a')]), true);
  assert.equal(hasRepeatedConsolidationDevice([member('a'), member('b')]), false);
});

test('direction logic recognizes producer/consumer pairs', () => {
  assert.equal(objectDirection('Enabled', '', ''), 'producer');
  assert.equal(objectDirection('', 'Enabled', ''), 'consumer');
  assert.equal(objectDirection('Enabled', 'Enabled', ''), 'bidirectional');
  assert.equal(hasComplementaryDirections([member('a', [], 'producer'), member('b', [], 'consumer')]), true);
});

test('generic one-word labels are recognized as unsafe consolidation evidence', () => {
  assert.equal(isGenericConsolidationName('Status'), true);
  assert.equal(isGenericConsolidationName('Licht Büro 1'), false);
});
