import type { GaPlanRow } from './types.ts';

function isSeparator(row: GaPlanRow): boolean {
  return row.name.startsWith('---') || row.name === '-';
}

export function validateGaPlan(rows: GaPlanRow[]): string[] {
  const warnings: string[] = [];
  const usedAddresses = new Set<string>();
  for (const row of rows) {
    if (row.level !== 'ga') continue;
    if (row.middleGroup === undefined || row.sub === undefined) {
      warnings.push(`Unvollständige Gruppenadresse "${row.name}": x/x/x-Adresse fehlt.`);
      continue;
    }
    const addr = `${row.mainGroup}/${row.middleGroup}/${row.sub}`;
    if (row.mainGroup < 0 || row.mainGroup > 31) warnings.push(`Ungültige Hauptgruppe bei ${addr}: erlaubt sind 0–31.`);
    if (row.middleGroup < 0 || row.middleGroup > 7) warnings.push(`Ungültige Mittelgruppe bei ${addr}: erlaubt sind 0–7.`);
    if (row.sub < 0 || row.sub > 255) warnings.push(`Ungültige Untergruppe bei ${addr}: erlaubt sind 0–255.`);
    if (addr === '0/0/0') warnings.push('0/0/0 ist für Broadcast reserviert und wird nicht als normale GA verwendet.');
    if (usedAddresses.has(addr)) warnings.push(`Kollision: Gruppenadresse ${addr} ("${row.name}") wird mehrfach vergeben.`);
    usedAddresses.add(addr);
    if (row.name.length > 255) warnings.push(`Gruppenadresse "${row.name}" überschreitet 255 Zeichen.`);
    if (!isSeparator(row) && (!row.datapointType || row.datapointType.trim() === '')) {
      warnings.push(`Gruppenadresse "${row.name}" (${addr}) hat keinen DPT.`);
    }
  }
  return warnings;
}
