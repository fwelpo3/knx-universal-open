import test from 'node:test';
import assert from 'node:assert/strict';
import {
  synthesizeDeviceFunction,
  synthesizeProjectFunctions,
  recognizeDevicePatterns,
} from '../../packages/knx-engineering/src/index.ts';
import type { KnxCommunicationObject, KnxDevice, KnxProjectModel } from '../../packages/knx-model/src/index.ts';

function ko(id: string, number: number, channel: string, text: string, dpt: string, flags: KnxCommunicationObject['flags']): KnxCommunicationObject {
  return { id, number: String(number), channel: { id: channel, name: `Kanal ${channel}` }, text, datapointType: dpt, flags, groupAddresses: [] };
}

function switchDevice(): KnxDevice {
  return {
    id: 'switch-1', name: 'Schaltaktor 2-fach', productName: 'Schaltaktor Standard', manufacturer: 'Demo', topology: { physicalAddress: '1.1.10' },
    communicationObjects: [
      ko('a-cmd', 0, 'A', 'Schalten', 'DPST-1-1', { write: true }),
      ko('a-status', 1, 'A', 'Status', 'DPST-1-1', { transmit: true }),
      ko('a-lock', 2, 'A', 'Sperren', 'DPST-1-1', { write: true }),
      ko('b-cmd', 3, 'B', 'Schalten', 'DPST-1-1', { write: true }),
      ko('b-status', 4, 'B', 'Status', 'DPST-1-1', { transmit: true }),
    ],
  };
}

test('recognized switching pattern synthesizes deterministic function slots and bindings', () => {
  const device = switchDevice();
  const pattern = recognizeDevicePatterns(device).find((item) => item.channelId === 'A' && item.functionId === 'switching.output');
  assert.ok(pattern);
  const synthesized = synthesizeDeviceFunction(device, pattern!);
  assert.ok(synthesized);
  assert.equal(synthesized!.definition.id, 'switching.output');
  const bindings = new Map(synthesized!.instance.bindings.map((item) => [item.slotId, item.endpoint.communicationObjectId]));
  assert.equal(bindings.get('switch.command'), 'a-cmd');
  assert.equal(bindings.get('switch.feedback'), 'a-status');
  assert.equal(bindings.get('switch.lock'), 'a-lock');
  assert.equal(synthesized!.instance.bindings.every((item) => item.matchClass === 'family-pattern'), true);
  assert.equal(synthesized!.diagnostics.length, 0);
});

test('ambiguous slots are not guessed', () => {
  const device: KnxDevice = {
    id: 'ambiguous', name: 'Schaltaktor', productName: 'Schaltaktor', topology: { physicalAddress: '1.1.11' },
    communicationObjects: [
      ko('cmd-1', 0, 'A', 'Kanal A', 'DPST-1-1', { write: true }),
      ko('cmd-2', 1, 'A', 'Kanal A', 'DPST-1-1', { write: true }),
      ko('status', 2, 'A', 'Status', 'DPST-1-1', { transmit: true }),
    ],
  };
  const pattern = recognizeDevicePatterns(device).find((item) => item.functionId === 'switching.output');
  assert.ok(pattern);
  const synthesized = synthesizeDeviceFunction(device, pattern!);
  assert.ok(synthesized);
  assert.equal(synthesized!.instance.bindings.some((item) => item.slotId === 'switch.command'), false);
  assert.equal(synthesized!.diagnostics.some((item) => item.code === 'AMBIGUOUS_SLOT' && item.slotId === 'switch.command'), true);
});

test('project synthesis preserves location and deduplicates shared definitions', () => {
  const device = switchDevice();
  const project: KnxProjectModel = {
    schemaVersion: 1,
    locations: [{ id: 'room-1', name: 'Büro', kind: 'room', path: ['Büro'], deviceIds: [device.id] }],
    devices: [device],
    groupAddresses: [],
  };
  const result = synthesizeProjectFunctions(project);
  assert.equal(result.definitions.filter((item) => item.id === 'switching.output').length, 1);
  assert.equal(result.instances.length, 2);
  assert.equal(result.instances.every((item) => item.locationId === 'room-1'), true);
});
