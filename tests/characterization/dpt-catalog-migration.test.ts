import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeDpt,
  dptInterval,
  dptObjectSize,
  dptSupport,
  encodeDpt,
  getDptDefinition,
  listDptDefinitions,
  normalizeDptId,
} from '../../packages/knx-core/src/dpt/index.ts';

test('mature DPT catalog is available through the universal core', () => {
  assert.equal(listDptDefinitions().length, 463);
  assert.equal(getDptDefinition('DPST-20-102')?.id, '20.102');
  assert.equal(dptSupport('20.102').catalogued, true);
});

test('migration preserves existing main-type-only normalization and object-size behavior', () => {
  assert.equal(normalizeDptId('DPT-1'), 'DPT-1');
  assert.equal(normalizeDptId('1.001'), 'DPST-1-1');
  assert.equal(normalizeDptId('DPST-9-001'), 'DPST-9-1');
  assert.equal(dptObjectSize('DPT-1'), '1 Bit');
  assert.equal(dptObjectSize('DPT-9'), '2 Bytes');
  assert.equal(dptObjectSize('9.001'), '2 Bytes');
});

test('catalog codec behavior is preserved for interval and enumerated DPTs', () => {
  assert.equal(dptInterval.fromStepCode(5), 16);
  assert.equal(dptInterval.toStepCode(16), 5);

  const step = decodeDpt('3.007', Uint8Array.of(0x0d));
  assert.equal(step.fields.c, 1);
  assert.equal((step.fields.StepCode as { intervals: number }).intervals, 16);
  assert.deepEqual([...encodeDpt('3.007', { c: 1, StepCode: { intervals: 16 } })], [0x0d]);

  const hvac = decodeDpt('20.102', Uint8Array.of(2));
  assert.deepEqual(hvac.value, { kind: 'code', code: 2, label: 'Standby', band: false, disposition: undefined });
});
