export interface EtsModuleObjectIdentity {
  moduleDefinition?: string;
  moduleInstance?: string;
  localObjectNumber?: number;
  moduleBaseNumber?: number;
}

export function parseEtsModuleObjectIdentity(
  ref: string,
  resolvedObjectNumber?: string | number,
): EtsModuleObjectIdentity {
  const raw = String(ref || '');
  const objectMarker = raw.lastIndexOf('_O-');
  if (objectMarker < 0) return {};
  const beforeObject = raw.slice(0, objectMarker);
  const mdAt = beforeObject.indexOf('MD-');
  if (mdAt < 0) return {};

  const moduleInstance = beforeObject.slice(mdAt);
  const rootDefinition = moduleInstance.match(/^MD-\d+/)?.[0];
  const subModules = [...moduleInstance.matchAll(/_SM-(\d+)/g)].map((m) => `SM-${m[1]}`);
  const moduleDefinition = rootDefinition
    ? [rootDefinition, ...subModules].join('/')
    : undefined;
  const objectTail = raw.slice(objectMarker);
  const local = objectTail.match(/^_O-[^-_]+-(\d+)(?:_|$)/);
  const localObjectNumber = local ? Number(local[1]) : undefined;
  const resolved = Number(resolvedObjectNumber);
  const moduleBaseNumber = Number.isFinite(resolved) && localObjectNumber !== undefined
    ? resolved - localObjectNumber
    : undefined;

  return { moduleDefinition, moduleInstance, localObjectNumber, moduleBaseNumber };
}

export function parseDpaSemantics(value?: string): string[] {
  const out: string[] = [];
  for (const token of String(value || '').split(/\s+/).filter(Boolean)) {
    const id = token.replace(/^knx:dpa\./i, '');
    if (/^\d+\.\d+$/.test(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
