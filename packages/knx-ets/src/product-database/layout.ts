export interface KnxprodLayout {
  masterFile?: string;
  catalogFiles: string[];
  hardwareFiles: string[];
  applicationFiles: Record<string, string>;
  manufacturerFolders: string[];
}

function normalizeEntryName(name: string): string {
  return String(name || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Discover an ETS4+ KNX product database container without using a ZIP-specific API. */
export function discoverKnxprodLayout(entries: readonly string[]): KnxprodLayout {
  const names = [...new Set(entries.map(normalizeEntryName).filter(Boolean))].sort();
  const masterFile = names.find((name) => /(?:^|\/)knx_master\.xml$/i.test(name));
  const catalogFiles = names.filter((name) => /^M-[^/]+\/Catalog\.xml$/i.test(name));
  const hardwareFiles = names.filter((name) => /^M-[^/]+\/Hardware\.xml$/i.test(name));
  const applicationFiles: Record<string, string> = {};

  for (const name of names) {
    if (!/^M-[^/]+\/M-[^/]+_A-[^/]+\.xml$/i.test(name)) continue;
    const appId = name.split('/').pop()!.replace(/\.xml$/i, '');
    applicationFiles[appId] = name;
  }

  const manufacturerFolders = [...new Set(
    [...catalogFiles, ...hardwareFiles, ...Object.values(applicationFiles)]
      .map((name) => name.split('/')[0])
      .filter((name) => /^M-/i.test(name))
  )].sort();

  if (!catalogFiles.length && !hardwareFiles.length && !Object.keys(applicationFiles).length) {
    throw new Error('Keine lesbare KNXPROD-Herstellerstruktur gefunden.');
  }

  return { masterFile, catalogFiles, hardwareFiles, applicationFiles, manufacturerFolders };
}
