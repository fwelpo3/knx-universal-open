import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupAddressToRaw,
  rawToGroupAddressString,
} from '../../packages/knx-core/src/addressing/groupAddress.ts';

test('group address raw conversion round-trips canonical three-level addresses', () => {
  for (const address of ['0/0/0', '1/2/3', '31/7/255']) {
    assert.equal(rawToGroupAddressString(groupAddressToRaw(address)), address);
  }
});

test('raw group address formatter preserves non-numeric legacy input', () => {
  assert.equal(rawToGroupAddressString('not-a-number'), 'not-a-number');
});
