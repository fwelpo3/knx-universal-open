import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocations } from '../../packages/knx-ets/src/index.ts';
import { engineeringLocationsFromKnxProject } from '../../packages/knx-engineering/src/index.ts';
import type { KnxProjectModel } from '../../packages/knx-model/src/index.ts';
import { fakeXml, fakeXmlRuntime } from '../support/fakeXmlRuntime.ts';

const xml = fakeXml({
  name: 'KNX', children: [{
    name: 'Space', attrs: { Id: 'b', Name: 'Gebäude A', Type: 'Building' }, children: [{
      name: 'Space', attrs: { Id: 'f', Name: 'EG', Type: 'Floor' }, children: [{
        name: 'Space', attrs: { Id: 'r', Name: 'Büro 1', Type: 'Room' }, children: [
          { name: 'DeviceInstanceRef', attrs: { RefId: 'd2' } },
          { name: 'DeviceInstanceRef', attrs: { RefId: 'd1' } },
        ],
      }],
    }],
  }],
});

test('ETS locations preserve hierarchy, paths and direct device membership', () => {
  const document = fakeXmlRuntime.parse(xml);
  const locations = parseLocations(fakeXmlRuntime, document);
  assert.deepEqual(locations.map((x) => x.id), ['b', 'f', 'r']);
  assert.equal(locations[1].parentId, 'b');
  assert.deepEqual(locations[2].path, ['Gebäude A', 'EG', 'Büro 1']);
  assert.deepEqual(locations[2].deviceIds, ['d1', 'd2']);
});

test('canonical KNX locations project into engineering locations without ETS types', () => {
  const project: KnxProjectModel = {
    schemaVersion: 1,
    locations: [{ id: 'r', name: 'Büro 1', kind: 'room', path: ['Gebäude A', 'EG', 'Büro 1'], deviceIds: ['d1'] }],
    devices: [],
    groupAddresses: [],
  };
  assert.deepEqual(engineeringLocationsFromKnxProject(project), [
    { id: 'r', name: 'Büro 1', kind: 'room', parentId: undefined },
  ]);
});
