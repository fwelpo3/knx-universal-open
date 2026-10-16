import assert from 'node:assert/strict';
import test from 'node:test';
import { activeObjectRefs, xmlGroupAddress } from '../../packages/knx-ets/src/xml/navigation.ts';
import { fakeXml, fakeXmlRuntime } from '../support/fakeXmlRuntime.ts';

test('XML navigation keeps the ETS active-object precedence rule outside the UI feature', () => {
  const document = fakeXmlRuntime.parse(fakeXml({
    name: 'DeviceInstance',
    children: [
      { name: 'GroupObjectTree', attrs: { GroupObjectInstances: 'O-1 O-2 O-1' } },
      { name: 'ComObjectInstanceRef', attrs: { RefId: 'O-3' } },
    ],
  }));
  const device = fakeXmlRuntime.all(document, 'DeviceInstance')[0];
  assert.deepEqual(activeObjectRefs(fakeXmlRuntime, device), ['O-1', 'O-2']);
});

test('raw ETS group-address values normalize independently from a DOM implementation', () => {
  assert.equal(xmlGroupAddress(String((31 << 11) | (7 << 8) | 255)), '31/7/255');
  assert.equal(xmlGroupAddress('not-a-number'), 'not-a-number');
});
