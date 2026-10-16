import type { EtsArchiveSource } from '../ports/archive.ts';
import { discoverKnxprodLayout, type KnxprodLayout } from './layout.ts';

export interface KnxprodTextFile { path: string; text: string; }

export interface KnxprodBootstrap {
  source: EtsArchiveSource;
  layout: KnxprodLayout;
  master?: KnxprodTextFile;
  catalogs: KnxprodTextFile[];
  hardware: KnxprodTextFile[];
}

async function optionalText(source: EtsArchiveSource, path: string | undefined): Promise<KnxprodTextFile | undefined> {
  if (!path) return undefined;
  const text = await source.archive.readText(path);
  return text === undefined ? undefined : { path, text };
}

async function requiredText(source: EtsArchiveSource, path: string): Promise<KnxprodTextFile> {
  const text = await source.archive.readText(path);
  if (text === undefined) throw new Error(`KNXPROD-Eintrag fehlt oder ist nicht lesbar: ${path}`);
  return { path, text };
}

export async function readKnxprodBootstrap(source: EtsArchiveSource): Promise<KnxprodBootstrap> {
  const layout = discoverKnxprodLayout(source.archive.listEntries());
  const master = await optionalText(source, layout.masterFile);
  const catalogs = await Promise.all(layout.catalogFiles.map((path) => requiredText(source, path)));
  const hardware = await Promise.all(layout.hardwareFiles.map((path) => requiredText(source, path)));
  return { source, layout, master, catalogs, hardware };
}

export async function readKnxprodApplicationXml(bootstrap: KnxprodBootstrap, applicationProgramId: string): Promise<string | undefined> {
  const path = bootstrap.layout.applicationFiles[applicationProgramId];
  return path ? bootstrap.source.archive.readText(path) : undefined;
}
