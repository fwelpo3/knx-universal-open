import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExactFunctionSlotIndex,
  exactObjectSignature,
  findExactFunctionSlot,
  type EngineeringFunctionDefinition,
  type EngineeringFunctionInstance,
} from '../../packages/knx-engineering/src/index.ts';
import type { KnxCommunicationObject } from '../../packages/knx-model/src/index.ts';

const light: EngineeringFunctionDefinition = {
  id: 'light',
  label: 'Licht',
  code: 'L',
  slots: [
    {
      id: 'switch',
      name: 'Schalten',
      datapointType: '1.001',
      offset: 0,
      role: 'command',
      matchHints: {
        exactObject: {
          number: '1',
          name: 'Schalten',
          functionText: 'Ein/Aus',
          objectSize: '1 Bit',
          datapointTypeLabel: 'Schalten',
        },
      },
    },
  ],
};

const object: KnxCommunicationObject = {
  id: 'ko-1',
  number: '1',
  text: 'Schalten',
  functionText: 'Ein/Aus',
  datapointType: '1.001',
  datapointTypeLabel: 'Schalten',
  objectSize: '1 Bit',
  groupAddresses: [],
};

test('engineering model references KNX endpoints instead of copying source objects', () => {
  const instance: EngineeringFunctionInstance = {
    id: 'fn-1',
    definitionId: 'light',
    locationId: 'room-1',
    bindings: [{
      slotId: 'switch',
      endpoint: { deviceId: 'device-1', communicationObjectId: 'ko-1' },
      method: 'exact',
      matchClass: 'exact-signature',
    }],
  };

  assert.deepEqual(JSON.parse(JSON.stringify(instance)), instance);
  assert.equal(instance.bindings[0].endpoint.communicationObjectId, 'ko-1');
});

test('exact object matching preserves the safe 1.24.0 structural signature', () => {
  const match = findExactFunctionSlot(object, [light]);
  assert.equal(match?.definition.id, 'light');
  assert.equal(match?.slot.id, 'switch');
  assert.equal(
    exactObjectSignature(light.slots[0].matchHints!.exactObject!),
    '1␟Schalten␟Ein/Aus␟1 Bit␟Schalten',
  );
});

test('ambiguous exact signatures are excluded instead of guessed', () => {
  const duplicate: EngineeringFunctionDefinition = {
    ...light,
    id: 'other-light',
    slots: light.slots.map((slot) => ({ ...slot, id: 'switch-2' })),
  };
  const index = buildExactFunctionSlotIndex([light, duplicate]);
  assert.equal(index.size, 0);
  assert.equal(findExactFunctionSlot(object, [light, duplicate]), null);
});
