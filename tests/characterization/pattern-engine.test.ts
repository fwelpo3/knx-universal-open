import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeviceStructuralSignature,
  deviceFingerprint,
  EngineeringPatternRegistry,
  recognizeDevicePatterns,
} from '../../packages/knx-engineering/src/index.ts';
import type { KnxCommunicationObject, KnxDevice } from '../../packages/knx-model/src/index.ts';

function ko(id: string, number: number, channel: string, text: string, dpt: string, flags: KnxCommunicationObject['flags']): KnxCommunicationObject {
  return {
    id,
    number: String(number),
    channel: { id: channel, name: `Kanal ${channel}` },
    text,
    datapointType: dpt,
    flags,
    groupAddresses: [],
  };
}

function switchingActuator(): KnxDevice {
  return {
    id: 'dev-switch',
    name: 'Schaltaktor 4-fach',
    manufacturer: 'Example KNX GmbH',
    productName: 'Schaltaktor Standard',
    orderNumber: 'AKS-04',
    applicationProgramRef: 'M-1234_A-0001-01-0000',
    topology: { physicalAddress: '1.1.10' },
    communicationObjects: [
      ko('a-cmd', 0, 'A', 'Schalten', 'DPST-1-1', { communication: true, write: true }),
      ko('a-status', 1, 'A', 'Status', 'DPST-1-1', { communication: true, transmit: true }),
      ko('b-cmd', 2, 'B', 'Schalten', 'DPST-1-1', { communication: true, write: true }),
      ko('b-status', 3, 'B', 'Status', 'DPST-1-1', { communication: true, transmit: true }),
      ko('c-cmd', 4, 'C', 'Schalten', 'DPST-1-1', { communication: true, write: true }),
      ko('c-status', 5, 'C', 'Status', 'DPST-1-1', { communication: true, transmit: true }),
    ],
  };
}

test('repeated channel signatures ignore concrete channel names and object number offsets', () => {
  const signature = buildDeviceStructuralSignature(switchingActuator());
  assert.equal(signature.channels.length, 3);
  assert.equal(signature.repeatedChannelPatterns.length, 1);
  assert.equal(signature.repeatedChannelPatterns[0].occurrences, 3);
  assert.deepEqual(signature.repeatedChannelPatterns[0].channelIds, ['A', 'B', 'C']);
});

test('device family + KNX object structure recognizes switching channels without numeric confidence', () => {
  const matches = recognizeDevicePatterns(switchingActuator());
  const switching = matches.filter((match) => match.functionId === 'switching.output');
  assert.equal(switching.length, 3);
  assert.equal(switching.every((match) => match.matchClass === 'family-pattern'), true);
  assert.equal(switching.every((match) => !('confidence' in match)), true);
});

test('dimming structure is recognized from DPT composition across a channel', () => {
  const device: KnxDevice = {
    id: 'dimmer', name: 'Universal Dimmaktor', productName: 'Dimmaktor 2-fach', topology: { physicalAddress: '1.1.20' },
    communicationObjects: [
      ko('sw', 0, 'A', 'Schalten', 'DPST-1-1', { write: true }),
      ko('rel', 1, 'A', 'Relativ dimmen', 'DPST-3-7', { write: true }),
      ko('abs', 2, 'A', 'Dimmwert', 'DPST-5-1', { write: true }),
      ko('status', 3, 'A', 'Status Dimmwert', 'DPST-5-1', { transmit: true }),
    ],
  };
  const matches = recognizeDevicePatterns(device);
  assert.equal(matches.some((match) => match.functionId === 'lighting.dimming-output' && match.matchClass === 'family-pattern'), true);
});

test('shading structure is recognized as a channel pattern', () => {
  const device: KnxDevice = {
    id: 'blind', name: 'Jalousieaktor', productName: 'Jalousieaktor 4-fach', topology: { physicalAddress: '1.1.30' },
    communicationObjects: [
      ko('move', 0, 'A', 'Auf/Ab', 'DPST-1-8', { write: true }),
      ko('step', 1, 'A', 'Stop/Lamelle', 'DPST-1-7', { write: true }),
      ko('pos', 2, 'A', 'Position', 'DPST-5-1', { write: true }),
      ko('pos-status', 3, 'A', 'Position Status', 'DPST-5-1', { transmit: true }),
    ],
  };
  const matches = recognizeDevicePatterns(device);
  assert.equal(matches.some((match) => match.functionId === 'shading.output' && match.matchClass === 'family-pattern'), true);
});

test('registered device fingerprint wins as exact-signature', () => {
  const device = switchingActuator();
  const registry = new EngineeringPatternRegistry([{
    id: 'example.aks04.v1',
    fingerprint: deviceFingerprint(device),
    source: 'fixture',
    functions: [
      { functionId: 'switching.output', channelId: 'A', objectIds: ['a-cmd', 'a-status'] },
    ],
  }]);
  const matches = recognizeDevicePatterns(device, registry);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].matchClass, 'exact-signature');
  assert.equal(matches[0].patternId, 'example.aks04.v1');
  assert.deepEqual(matches[0].endpointRefs.map((item) => item.communicationObjectId), ['a-cmd', 'a-status']);
});

test('application-family pattern can be promoted from one confirmed representative device', async () => {
  const {
    promoteApplicationFamilyPattern,
  } = await import('../../packages/knx-engineering/src/index.ts');
  const device = switchingActuator();
  const pattern = promoteApplicationFamilyPattern(device, 'example.switch-family.v1', [
    { channelId: 'A', functionId: 'switching.output' },
  ], 'manual-confirmation');
  const registry = new EngineeringPatternRegistry();
  registry.registerApplicationFamily(pattern);

  const variant: KnxDevice = {
    ...device,
    id: 'dev-switch-variant',
    productName: 'Schaltaktor anderer Produktname',
    orderNumber: 'AKS-08',
    communicationObjects: device.communicationObjects.map((object) => ({ ...object, id: `v-${object.id}` })),
  };
  const matches = recognizeDevicePatterns(variant, registry);
  assert.equal(matches.filter((match) => match.functionId === 'switching.output').length, 3);
  assert.equal(matches.every((match) => match.matchClass === 'family-pattern'), true);
});

test('project discovery clusters same application family and cross-manufacturer structure separately', async () => {
  const { discoverProjectPatternClusters } = await import('../../packages/knx-engineering/src/index.ts');
  const first = switchingActuator();
  const second: KnxDevice = {
    ...switchingActuator(), id: 'dev-switch-2', name: 'Schaltaktor 8-fach', productName: 'Schaltaktor 8-fach', orderNumber: 'AKS-08',
    communicationObjects: switchingActuator().communicationObjects.map((object) => ({ ...object, id: `second-${object.id}` })),
  };
  const third: KnxDevice = {
    ...switchingActuator(), id: 'dev-other-vendor', manufacturer: 'Other Vendor', applicationProgramRef: 'OTHER_APP',
    communicationObjects: switchingActuator().communicationObjects.map((object) => ({ ...object, id: `third-${object.id}` })),
  };
  const clusters = discoverProjectPatternClusters({ schemaVersion: 1, locations: [], groupAddresses: [], devices: [first, second, third] });
  const appCluster = clusters.find((cluster) => cluster.kind === 'application-family');
  const structural = clusters.find((cluster) => cluster.kind === 'cross-manufacturer-structure');
  assert.equal(appCluster?.occurrences, 2);
  assert.equal(structural?.occurrences, 3);
  assert.equal(structural?.manufacturers.length, 2);
});

test('repeated KO sequences can infer channels when ETS channel metadata is missing', async () => {
  const { buildDeviceStructuralSignature, recognizeDevicePatterns } = await import('../../packages/knx-engineering/src/index.ts');
  const noChannel = (id: string, number: number, text: string, dpt: string, flags: KnxCommunicationObject['flags']): KnxCommunicationObject => ({
    id, number: String(number), text, datapointType: dpt, flags, groupAddresses: [],
  });
  const device: KnxDevice = {
    id: 'abb-like',
    name: 'Schaltaktor',
    productName: 'Switch Actuator',
    manufacturer: 'Example Vendor',
    topology: { physicalAddress: '1.1.40' },
    communicationObjects: [
      noChannel('a-cmd', 0, 'Switch', 'DPST-1-1', { write: true }),
      noChannel('a-status', 1, 'Status', 'DPST-1-1', { transmit: true }),
      noChannel('b-cmd', 9, 'Switch', 'DPST-1-1', { write: true }),
      noChannel('b-status', 10, 'Status', 'DPST-1-1', { transmit: true }),
      noChannel('c-cmd', 18, 'Switch', 'DPST-1-1', { write: true }),
      noChannel('c-status', 19, 'Status', 'DPST-1-1', { transmit: true }),
    ],
  };
  const signature = buildDeviceStructuralSignature(device);
  assert.deepEqual(signature.channels.map((channel) => channel.id), ['inferred:1', 'inferred:2', 'inferred:3']);
  assert.equal(signature.repeatedChannelPatterns[0]?.occurrences, 3);
  const matches = recognizeDevicePatterns(device).filter((item) => item.functionId === 'switching.output');
  assert.equal(matches.length, 3);
});
