import test from 'node:test';
import assert from 'node:assert/strict';
import {
  etsDeviceToGaPlanningInstance,
  etsObjectsToEngineeringDefinition,
} from '../../packages/knx-ets-engineering/src/index.ts';
import type { EtsSourceCommunicationObject, EtsSourceDevice } from '../../packages/knx-ets/src/index.ts';

const objects: EtsSourceCommunicationObject[] = [
  { id: 'ko-command', number: '1', text: 'Schalten', datapointType: '1.001', flags: { write: 'Enabled', transmit: 'Disabled' } },
  { id: 'ko-feedback', number: '2', text: 'Status', datapointType: '1.001', flags: { write: 'Disabled', transmit: 'Enabled' } },
  { id: 'ko-unknown', number: '3', text: 'Sonderobjekt', datapointType: '5.001', flags: {} },
];

const device: EtsSourceDevice = {
  id: 'dev-1',
  name: 'Aktor 1',
  productName: 'Testaktor',
  topology: { physicalAddress: '1.1.10', deviceAddress: '10', lineAddress: '1', areaAddress: '1' },
  communicationObjects: objects,
};

test('ETS engineering projection preserves command, feedback and unknown roles', () => {
  const definition = etsObjectsToEngineeringDefinition({ id: 'def-1', label: 'Test', objects });
  assert.deepEqual(definition.slots.map((slot) => slot.role), ['command', 'feedback', 'unknown']);

  const instance = etsDeviceToGaPlanningInstance(device, { type: 'actor', middleGroup: 1 });
  assert.deepEqual(instance.functions.map((fn) => fn.role), ['command', 'feedback', 'unknown']);
});

test('unknown ETS role stays unknown instead of becoming an invented command', () => {
  const instance = etsDeviceToGaPlanningInstance(device, { type: 'actor', middleGroup: 1 });
  const unknown = instance.functions.find((fn) => fn.source?.objectRef === 'ko-unknown');
  assert.equal(unknown?.role, 'unknown');
});
