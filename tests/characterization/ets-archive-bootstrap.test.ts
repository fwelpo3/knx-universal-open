import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readKnxprojApplicationXml,
  readKnxprojBootstrap,
} from '../../packages/knx-ets/src/archive/readBootstrap.ts';
import type { EtsArchiveReader } from '../../packages/knx-ets/src/ports/archive.ts';

class MemoryArchive implements EtsArchiveReader {
  private readonly files: Record<string, string>;
  constructor(files: Record<string, string>) { this.files = files; }
  listEntries() { return Object.keys(this.files); }
  async readText(path: string) { return this.files[path]; }
}

test('bootstrap reads project/master/hardware while keeping application XML lazy', async () => {
  const archive = new MemoryArchive({
    'P-X/0.xml': '<Project/>',
    'knx_master.xml': '<Master/>',
    'M-1/Hardware.xml': '<Hardware/>',
    'M-1/M-1_A-1.xml': '<Application/>',
  });
  const progress: string[] = [];
  const bootstrap = await readKnxprojBootstrap(
    { fileName: 'x.knxproj', archive },
    { onProgress: (event) => progress.push(event.phase) }
  );

  assert.equal(bootstrap.project.text, '<Project/>');
  assert.equal(bootstrap.master?.text, '<Master/>');
  assert.equal(bootstrap.hardware[0].text, '<Hardware/>');
  assert.equal(await readKnxprojApplicationXml(bootstrap, 'M-1_A-1'), '<Application/>');
  assert.ok(progress.includes('project'));
  assert.ok(progress.includes('hardware'));
});
