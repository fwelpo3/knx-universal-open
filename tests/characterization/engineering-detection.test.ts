import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeKnxProject, detectCommunicationObjectCapabilities } from '../../packages/knx-engineering/src/index.ts';
import type { KnxCommunicationObject, KnxProjectModel } from '../../packages/knx-model/src/index.ts';

const object = (overrides: Partial<KnxCommunicationObject>): KnxCommunicationObject => ({
  id: 'ko1',
  number: '1',
  groupAddresses: [],
  ...overrides,
});

test('capability detection combines name, DPT and flags as evidence', () => {
  const caps = detectCommunicationObjectCapabilities(object({
    text: 'Licht Schalten',
    datapointType: 'DPST-1-1',
    flags: { communication: true, write: true },
  }));
  assert.equal(caps.some((item) => item.id === 'switch' && item.matchClass === 'semantic-pattern'), true);
  assert.equal(caps.some((item) => item.id === 'binary'), true);
  assert.equal(caps.some((item) => item.id === 'direction.consumer'), true);
});

test('project analysis stays source independent and references canonical endpoint ids', () => {
  const project: KnxProjectModel = {
    schemaVersion: 1,
    devices: [{
      id: 'dev1', name: 'Jalousieaktor', topology: { physicalAddress: '1.1.2' },
      communicationObjects: [object({ id: 'ko-updown', text: 'Jalousie Auf/Ab', datapointType: 'DPST-1-8', flags: { write: true } })],
    }],
    groupAddresses: [],
  };
  const report = analyzeKnxProject(project);
  assert.equal(report.devices[0].endpoints[0].endpoint.deviceId, 'dev1');
  assert.equal(report.devices[0].endpoints[0].endpoint.communicationObjectId, 'ko-updown');
  assert.equal(report.devices[0].capabilityIds.includes('shading.move'), true);
});
