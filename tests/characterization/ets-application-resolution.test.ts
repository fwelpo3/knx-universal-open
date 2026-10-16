import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApplicationProgramIndex } from '../../packages/knx-ets/src/application/index.ts';
import { resolveDeviceCommunicationObjects } from '../../packages/knx-ets/src/project/resolveDeviceObjects.ts';
import type { EtsSourceGroupAddress } from '../../packages/knx-ets/src/source/types.ts';
import { fakeXml, fakeXmlRuntime } from '../support/fakeXmlRuntime.ts';

const appDocument = fakeXmlRuntime.parse(fakeXml({
  name: 'KNX',
  children: [
    {
      name: 'Language', attrs: { Identifier: 'de-DE' }, children: [
        {
          name: 'TranslationElement', attrs: { RefId: 'APP_O-1_R-1' }, children: [
            { name: 'Translation', attrs: { AttributeName: 'Text', Text: 'Licht schalten' } },
          ],
        },
        {
          name: 'TranslationElement', attrs: { RefId: 'CH-1' }, children: [
            { name: 'Translation', attrs: { AttributeName: 'Text', Text: 'Kanal Licht' } },
          ],
        },
      ],
    },
    {
      name: 'ComObject', attrs: {
        Id: 'APP_O-1', Number: '1', Text: 'Switch', DatapointType: 'DPST-1-1',
        ObjectSize: '1 Bit', CommunicationFlag: 'Enabled', WriteFlag: 'Enabled',
      },
    },
    {
      name: 'ComObjectRef', attrs: { Id: 'APP_O-1_R-1', RefId: 'APP_O-1' },
    },
    {
      name: 'Dynamic', children: [
        {
          name: 'Channel', attrs: { Id: 'CH-1', Text: 'Channel 1' }, children: [
            { name: 'ComObjectRefRef', attrs: { RefId: 'APP_O-1_R-1' } },
          ],
        },
      ],
    },
  ],
}));

const deviceDocument = fakeXmlRuntime.parse(fakeXml({
  name: 'DeviceInstance', attrs: { Id: 'D-1' }, children: [
    {
      name: 'GroupObjectTree', attrs: { GroupObjectInstances: 'APP_O-1_R-1' }, children: [
        { name: 'Node', attrs: { RefId: 'CH-1', Type: 'Channel', GroupObjectInstances: 'APP_O-1_R-1' } },
      ],
    },
    {
      name: 'ComObjectInstanceRef', attrs: {
        RefId: 'APP_O-1_R-1', Links: 'GA-1', ReadFlag: 'Enabled',
      },
    },
  ],
}));

test('application definitions and project instance overrides resolve into serializable communication objects', () => {
  const application = parseApplicationProgramIndex(fakeXmlRuntime, appDocument, 'APP');
  const device = fakeXmlRuntime.all(deviceDocument, 'DeviceInstance')[0];
  const gas = new Map<string, EtsSourceGroupAddress>([
    ['GA-1', { id: 'GA-1', name: 'Büro Licht', address: '1/0/1', datapointType: 'DPST-1-1' }],
  ]);
  const dpts = new Map([['DPST-1-1', 'Schalten']]);

  const objects = resolveDeviceCommunicationObjects({
    xml: fakeXmlRuntime,
    deviceNode: device,
    application,
    dptLabels: dpts,
    groupAddresses: gas,
  });

  assert.equal(objects.length, 1);
  assert.equal(objects[0].number, '1');
  assert.equal(objects[0].text, 'Licht schalten');
  assert.equal(objects[0].datapointType, 'DPST-1-1');
  assert.equal(objects[0].datapointTypeLabel, 'Schalten');
  assert.equal(objects[0].flags?.write, 'Enabled');
  assert.equal(objects[0].flags?.read, 'Enabled');
  assert.deepEqual(objects[0].linkedGroupAddresses, [{ address: '1/0/1', name: 'Büro Licht' }]);
  assert.equal(objects[0].etsGroupPath?.[0].label, 'Kanal Licht');
  assert.doesNotThrow(() => JSON.stringify(objects));
});

test('application index keeps runtime lookup structures out of serializable source DTOs', () => {
  const application = parseApplicationProgramIndex(fakeXmlRuntime, appDocument, 'APP');
  assert.ok(application.objects instanceof Map);
  assert.equal(application.objects.get('O-1_R-1')?.datapointType, 'DPST-1-1');
  assert.equal(application.channelMeta.get('CH-1')?.label, 'Kanal Licht');
});
