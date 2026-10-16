import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertSerializableEtsSourceProject } from '../../packages/knx-ets/src/index.ts';
import type { EtsSourceProject } from '../../packages/knx-ets/src/index.ts';

test('canonical ETS source DTO fixture is JSON serializable and browser-neutral', () => {
  const project = JSON.parse(fs.readFileSync('tests/fixtures/ets-source/minimal-project.json', 'utf8')) as EtsSourceProject;
  assert.doesNotThrow(() => assertSerializableEtsSourceProject(project));
  assert.equal(project.devices[0].topology.physicalAddress, '1.1.10');
  assert.equal(project.devices[0].communicationObjects?.[0].linkedGroupAddresses?.[0].address, '1/0/1');

  const json = JSON.stringify(project);
  assert.equal(json.includes('nodeType'), false);
  assert.equal(json.includes('JSZip'), false);
});
