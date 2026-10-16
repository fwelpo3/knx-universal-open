import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePdeHardware2ProgramRefId } from '../../packages/knx-pde/src/hardware/normalizeHardwareRef.ts';

test('PDE hardware fingerprint tuple is normalized to 0000', () => {
  assert.equal(
    normalizePdeHardware2ProgramRefId('M-0001_H-1234_HP-0001-01-abcd'),
    'M-0001_H-1234_HP-0001-01-0000',
  );
});

test('multiple HP tuples are normalized while unrelated ids remain unchanged', () => {
  assert.equal(
    normalizePdeHardware2ProgramRefId('X_HP-0001-01-abcd-0002-02-FE12'),
    'X_HP-0001-01-0000-0002-02-0000',
  );
  assert.equal(normalizePdeHardware2ProgramRefId('M-0001_A-0001'), 'M-0001_A-0001');
});
