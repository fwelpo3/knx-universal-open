import assert from 'node:assert/strict';
import test from 'node:test';
import type { EtsArchiveSource } from '../../packages/knx-ets/src/ports/archive.ts';
import { createEtsProjectSession, openEtsProject } from '../../packages/knx-ets/src/runtime/openProject.ts';
import { readKnxprojBootstrap } from '../../packages/knx-ets/src/archive/readBootstrap.ts';
import { fakeXml, fakeXmlRuntime, type FakeXmlSpec } from '../support/fakeXmlRuntime.ts';

function element(name: string, attrs: Record<string, string> = {}, children: FakeXmlSpec[] = []): FakeXmlSpec {
  return { name, attrs, children };
}

const project = element('KNX', {}, [
  element('Project', { Id: 'P-1' }, [element('ProjectInformation', { Name: 'Headless Test' })]),
  element('Area', { Id: 'P-1_A-1', Address: '1', Name: 'Bereich 1' }, [
    element('Line', { Id: 'P-1_L-0', Address: '0', Name: 'Hauptlinie' }),
    element('Line', { Id: 'P-1_L-1', Address: '1', Name: 'Linie 1' }, [
      element('DeviceInstance', {
        Id: 'P-1_DI-1',
        Address: '10',
        Name: 'Schaltaktor Büro',
        ProductRefId: 'M-0001_P-1',
        Hardware2ProgramRefId: 'M-0001_HP-1',
      }, [
        element('GroupObjectTree', { GroupObjectInstances: 'M-0001_A-1_O-1' }, [
          element('Nodes', {}, [
            element('Node', { RefId: 'M-0001_A-1_CH-1', Type: 'Channel', GroupObjectInstances: 'M-0001_A-1_O-1' }),
          ]),
        ]),
        element('ComObjectInstanceRef', {
          RefId: 'M-0001_A-1_O-1',
          Number: '1',
          DatapointType: 'DPST-1-1',
          ObjectSize: '1 Bit',
          CommunicationFlag: 'Enabled',
          WriteFlag: 'Enabled',
          Links: 'P-1_GA-1',
        }),
      ]),
    ]),
  ]),
  element('GroupAddress', {
    Id: 'P-1_GA-1',
    Name: 'Büro Licht Schalten',
    Address: String((1 << 11) | 1),
    DatapointType: 'DPST-1-1',
  }),
  element('Space', { Id: 'P-1_S-BUILDING', Name: 'Gebäude', Type: 'Building' }, [
    element('Space', { Id: 'P-1_S-FLOOR', Name: 'EG', Type: 'Floor' }, [
      element('Space', { Id: 'P-1_S-ROOM', Name: 'Büro 1', Type: 'Room' }, [
        element('DeviceInstanceRef', { RefId: 'P-1_DI-1' }),
      ]),
    ]),
  ]),
]);

const master = element('KNX', {}, [
  element('DatapointSubtype', { Id: 'DPST-1-1', Text: 'Switch' }),
]);

const hardware = element('KNX', {}, [
  element('Manufacturer', { Id: 'M-0001', Name: 'Example KNX' }, [
    element('Product', { Id: 'M-0001_P-1', Text: '8fach Aktor', OrderNumber: 'AKT-8' }),
    element('Hardware2Program', { Id: 'M-0001_HP-1' }, [
      element('ApplicationProgramRef', { RefId: 'M-0001_A-1' }),
    ]),
  ]),
]);

const application = element('KNX', {}, [
  element('Channel', { Id: 'M-0001_A-1_CH-1', Text: 'Kanal A' }),
  element('ComObject', {
    Id: 'M-0001_A-1_O-1',
    Number: '1',
    Name: 'Schalten aus Applikation',
    Text: 'Licht',
    FunctionText: 'Ein / Aus',
    Description: 'Anwendungsdefinition',
    DatapointType: 'DPST-1-1',
    ObjectSize: '1 Bit',
    CommunicationFlag: 'Enabled',
    WriteFlag: 'Enabled',
  }),
]);

const entries: Record<string, string> = {
  'P-1/0.xml': fakeXml(project),
  'knx_master.xml': fakeXml(master),
  'M-0001/Hardware.xml': fakeXml(hardware),
  'M-0001/M-0001_A-1.xml': fakeXml(application),
};

const readCounts = new Map<string, number>();

const source: EtsArchiveSource = {
  fileName: 'headless-test.knxproj',
  byteLength: 1234,
  archive: {
    listEntries: () => Object.keys(entries),
    readText: async (path) => {
      readCounts.set(path, (readCounts.get(path) || 0) + 1);
      return entries[path];
    },
  },
};

test('headless ETS session materializes a serializable source project without browser or JSZip types', async () => {
  let now = 0;
  const session = await openEtsProject(source, {
    xml: fakeXmlRuntime,
    now: () => ++now,
  });

  const result = await session.materialize();
  const second = await session.materialize();

  assert.equal(result, second, 'materialize() should be idempotent within one session');
  assert.equal(result.projectId, 'P-1');
  assert.equal(result.projectName, 'Headless Test');
  assert.equal(result.fileName, 'headless-test.knxproj');
  assert.equal(result.devices.length, 1);
  assert.equal(result.variants.length, 1);
  assert.equal(result.groupAddresses.length, 1);
  assert.equal(result.locations?.length, 3);
  assert.deepEqual(result.locations?.find((location) => location.id === 'P-1_S-ROOM')?.deviceIds, ['P-1_DI-1']);
  assert.deepEqual(result.locations?.find((location) => location.id === 'P-1_S-ROOM')?.path, ['Gebäude', 'EG', 'Büro 1']);

  const device = result.devices[0];
  assert.equal(device.topology.physicalAddress, '1.1.10');
  assert.equal(device.productName, '8fach Aktor');
  assert.equal(device.orderNumber, 'AKT-8');
  assert.equal(device.manufacturer, 'Example KNX');
  assert.equal(device.applicationProgramRef, 'M-0001_A-1');
  assert.equal(device.placement?.name, 'EG / Büro 1');
  assert.deepEqual(device.placement?.path, ['EG', 'Büro 1']);

  assert.equal(device.communicationObjects?.length, 1);
  assert.equal(device.communicationObjects?.[0].datapointTypeLabel, 'Switch');
  assert.deepEqual(device.communicationObjects?.[0].linkedGroupAddresses, [
    { address: '1/0/1', name: 'Büro Licht Schalten' },
  ]);

  assert.equal(readCounts.get('M-0001/M-0001_A-1.xml') || 0, 0, 'application XML stays lazy during materialize');

  const details = await session.loadDeviceDetails?.('P-1_DI-1');
  assert.ok(details);
  assert.equal(details.communicationObjects.length, 1);
  assert.equal(details.communicationObjects[0].name, 'Schalten aus Applikation');
  assert.equal(details.communicationObjects[0].functionText, 'Ein / Aus');
  assert.equal(details.communicationObjects[0].channelName, 'Kanal A');
  assert.equal(details.communicationObjects[0].channelId, 'M-0001_A-1_CH-1');
  assert.deepEqual(details.communicationObjects[0].linkedGroupAddresses, [
    { address: '1/0/1', name: 'Büro Licht Schalten' },
  ]);

  await session.loadDeviceDetails?.('P-1_DI-1');
  assert.equal(readCounts.get('M-0001/M-0001_A-1.xml'), 1, 'application index is cached per session');
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(details)));
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(result)));
});


test('session can be created from an existing bootstrap without rereading archive entries', async () => {
  const localReads = new Map<string, number>();
  const localSource: EtsArchiveSource = {
    ...source,
    archive: {
      listEntries: source.archive.listEntries,
      readText: async (path) => {
        localReads.set(path, (localReads.get(path) || 0) + 1);
        return entries[path];
      },
    },
  };

  const bootstrap = await readKnxprojBootstrap(localSource);
  const readsAfterBootstrap = new Map(localReads);
  const session = createEtsProjectSession(bootstrap, { xml: fakeXmlRuntime });
  const materialized = await session.materialize();

  assert.equal(materialized.devices.length, 1);
  assert.deepEqual(localReads, readsAfterBootstrap, 'materialize reuses bootstrap instead of rereading ZIP entries');

  await session.loadDeviceDetails?.('P-1_DI-1');
  assert.equal(localReads.get('M-0001/M-0001_A-1.xml'), 1, 'lazy application XML is still read on demand');
});
