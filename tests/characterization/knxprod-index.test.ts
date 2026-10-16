import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverKnxprodLayout, indexKnxprodCatalog, readKnxprodBootstrap } from '../../packages/knx-ets/src/index.ts';
import type { EtsArchiveSource } from '../../packages/knx-ets/src/index.ts';
import { fakeXml, fakeXmlRuntime } from '../support/fakeXmlRuntime.ts';

const files = new Map<string,string>([
  ['knx_master.xml', fakeXml({ name:'KNX' })],
  ['M-0001/Catalog.xml', fakeXml({ name:'KNX', children:[{ name:'CatalogItem', attrs:{ Id:'CI-1', Name:'Switch Actuator', ProductRefId:'P-1', Hardware2ProgramRefId:'HP-1' } }] })],
  ['M-0001/Hardware.xml', fakeXml({ name:'KNX', children:[
    { name:'Product', attrs:{ Id:'P-1', Text:'4-fold switch actuator', OrderNumber:'SA-4' } },
    { name:'Hardware2Program', attrs:{ Id:'HP-1' }, children:[{ name:'ApplicationProgramRef', attrs:{ RefId:'M-0001_A-0001-01-0000' } }] }
  ] })],
  ['M-0001/M-0001_A-0001-01-0000.xml', fakeXml({ name:'KNX' })],
]);

const source: EtsArchiveSource = {
  fileName: 'demo.knxprod',
  archive: {
    listEntries: () => [...files.keys()],
    readText: async (path) => files.get(path),
  }
};

test('discovers product database structure independently from KNX project layout', () => {
  const layout = discoverKnxprodLayout([...files.keys()]);
  assert.deepEqual(layout.catalogFiles, ['M-0001/Catalog.xml']);
  assert.deepEqual(layout.hardwareFiles, ['M-0001/Hardware.xml']);
  assert.equal(layout.applicationFiles['M-0001_A-0001-01-0000'], 'M-0001/M-0001_A-0001-01-0000.xml');
});

test('indexes catalog products and application references without loading application bodies', async () => {
  const bootstrap = await readKnxprodBootstrap(source);
  const index = indexKnxprodCatalog(bootstrap, fakeXmlRuntime);
  const item = index.manufacturers[0].catalogItems[0];
  assert.equal(item.orderNumber, 'SA-4');
  assert.deepEqual(item.applicationProgramRefs, ['M-0001_A-0001-01-0000']);
  assert.deepEqual(index.applicationProgramIds, ['M-0001_A-0001-01-0000']);
});
