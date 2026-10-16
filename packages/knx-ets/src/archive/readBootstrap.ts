import { discoverKnxprojLayout, type KnxprojLayout } from './projectLayout.ts';
import type { EtsArchiveSource } from '../ports/archive.ts';
import type { EtsExecutionScheduler, EtsProgressSink } from '../ports/execution.ts';
import { immediateEtsScheduler } from '../ports/execution.ts';

export interface KnxprojTextFile {
  path: string;
  text: string;
}

/** Runtime-only bootstrap data. Application XML stays lazy via the archive source. */
export interface KnxprojBootstrap {
  source: EtsArchiveSource;
  layout: KnxprojLayout;
  project: KnxprojTextFile;
  master?: KnxprojTextFile;
  hardware: KnxprojTextFile[];
}

export interface ReadKnxprojBootstrapOptions {
  onProgress?: EtsProgressSink;
  scheduler?: EtsExecutionScheduler;
}

export async function readKnxprojBootstrap(
  source: EtsArchiveSource,
  options: ReadKnxprojBootstrapOptions = {}
): Promise<KnxprojBootstrap> {
  const scheduler = options.scheduler || immediateEtsScheduler;
  const report = options.onProgress || (() => {});
  const layout = discoverKnxprojLayout(source.archive.listEntries());

  report({ phase: 'project', percent: 10, detail: layout.projectFile });
  const projectText = await requiredText(source, layout.projectFile);
  await scheduler.yield();

  let master: KnxprojTextFile | undefined;
  if (layout.masterFile) {
    const text = await source.archive.readText(layout.masterFile);
    if (text !== undefined) master = { path: layout.masterFile, text };
  }

  report({ phase: 'hardware', percent: 25, detail: `${layout.hardwareFiles.length} files` });
  const hardware: KnxprojTextFile[] = [];
  for (let index = 0; index < layout.hardwareFiles.length; index++) {
    const path = layout.hardwareFiles[index];
    const text = await requiredText(source, path);
    hardware.push({ path, text });
    report({
      phase: 'hardware',
      percent: 25 + Math.round(((index + 1) / Math.max(1, layout.hardwareFiles.length)) * 25),
      detail: `${index + 1}/${layout.hardwareFiles.length}`,
    });
    await scheduler.yield();
  }

  return {
    source,
    layout,
    project: { path: layout.projectFile, text: projectText },
    master,
    hardware,
  };
}

export async function readKnxprojApplicationXml(
  bootstrap: KnxprojBootstrap,
  applicationProgramId: string
): Promise<string | undefined> {
  const path = bootstrap.layout.applicationFiles[applicationProgramId];
  return path ? bootstrap.source.archive.readText(path) : undefined;
}

async function requiredText(source: EtsArchiveSource, path: string): Promise<string> {
  const text = await source.archive.readText(path);
  if (text === undefined) throw new Error(`KNXPROJ-Eintrag fehlt oder ist nicht lesbar: ${path}`);
  return text;
}
