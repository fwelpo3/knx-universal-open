export function parseFunctionalBlockSemantics(value?: string): string[] {
  const out: string[] = [];
  for (const token of String(value || '').split(/\s+/).filter(Boolean)) {
    const id = token.replace(/^knx:fb\./i, '');
    if (/^\d+$/.test(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
