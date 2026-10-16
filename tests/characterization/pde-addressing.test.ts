import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dptObjectSize,
  groupAddressToRaw,
  mainGroupRange,
  middleGroupRange,
  normalizeDptId,
  parseGroupAddress,
  dptCandidates,
} from '../../packages/knx-core/src/index.ts';

test('KNX three-level GA is converted to its 16-bit raw value', () => {
  assert.equal(groupAddressToRaw('0/0/1'), 1);
  assert.equal(groupAddressToRaw('1/2/3'), (1 << 11) | (2 << 8) | 3);
  assert.equal(groupAddressToRaw('31/7/255'), 65535);
});

test('PDE DPTs are normalized deterministically', () => {
  assert.equal(normalizeDptId('1.001'), 'DPST-1-1');
  assert.equal(normalizeDptId('DPST-9-001'), 'DPST-9-1');
  assert.equal(normalizeDptId('DPT-5'), 'DPT-5');
  assert.deepEqual(dptCandidates('1.001 DPST-1-1 5.001'), ['DPST-1-1', 'DPST-5-1']);
});

test('DPT main types map to expected KNX object sizes', () => {
  assert.equal(dptObjectSize('1.001'), '1 Bit');
  assert.equal(dptObjectSize('5.001'), '1 Byte');
  assert.equal(dptObjectSize('9.001'), '2 Bytes');
  assert.equal(dptObjectSize('14.056'), '4 Bytes');
  assert.equal(dptObjectSize('16.001'), '14 Bytes');
});

test('address ranges remain stable for PDE export', () => {
  assert.deepEqual(parseGroupAddress('12/4/99'), { main: 12, middle: 4, sub: 99 });
  assert.deepEqual(mainGroupRange(3), { start: 6144, end: 8191 });
  assert.deepEqual(middleGroupRange(3, 2), { start: 6656, end: 6911 });
});
