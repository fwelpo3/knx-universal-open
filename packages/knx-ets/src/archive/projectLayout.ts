export interface KnxprojLayout {
  projectFile: string;
  masterFile?: string;
  hardwareFiles: string[];
  applicationFiles: Record<string, string>;
}

function normalizeEntryName(name: string): string {
  return String(name || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Discover the logical files needed by the ETS parser without depending on a
 * specific ZIP implementation. The result is deterministic for reproducible tests.
 */
export function discoverKnxprojLayout(entries: readonly string[]): KnxprojLayout {
  const names = [...new Set(entries.map(normalizeEntryName).filter(Boolean))].sort();
  const projectFile = names
    .filter((name) => /^P-[^/]+\/\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const [aRoot, aFile = ''] = a.split('/');
      const [bRoot, bFile = ''] = b.split('/');
      const root = aRoot.localeCompare(bRoot, 'en');
      if (root) return root;
      return Number(aFile.replace(/\.xml$/i, '')) - Number(bFile.replace(/\.xml$/i, ''));
    })[0];
  if (!projectFile) {
    throw new Error('Keine lesbare Projektstruktur gefunden. Das Projekt ist möglicherweise geschützt.');
  }

  const masterFile = names.find((name) => /(?:^|\/)knx_master\.xml$/i.test(name));
  const hardwareFiles = names.filter((name) => /\/Hardware\.xml$/i.test(name));
  const applicationFiles: Record<string, string> = {};

  for (const name of names) {
    if (!/^M-[^/]+\/M-[^/]+_A-[^/]+\.xml$/i.test(name)) continue;
    const appId = name.split('/').pop()!.replace(/\.xml$/i, '');
    applicationFiles[appId] = name;
  }

  return { projectFile, masterFile, hardwareFiles, applicationFiles };
}
