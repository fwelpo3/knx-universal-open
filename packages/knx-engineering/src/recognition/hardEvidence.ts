import type {
  RecognitionEvidence,
  RecognitionObject,
  RecognizedCapability,
  RecognitionMatchClass,
} from './types.ts';

const PRIMARY = new Set([
  'building-function',
  'dpa-semantic',
  'functional-block',
  'ets-channel-id',
  'module-instance',
  'ga-link',
]);

const SEMANTIC = new Set([
  'dpt-size',
  'function-text',
  'active-project-object',
]);

export function hardEvidenceForObject(object: RecognitionObject): RecognitionEvidence[] {
  const evidence: RecognitionEvidence[] = [];
  if (object.buildingFunctions?.length) {
    for (const fn of object.buildingFunctions) {
      evidence.push({
        code: 'building-function',
        detail: `ETS Building Function ${fn.name || fn.typeLabel || fn.type}${fn.role ? ` · Rolle ${fn.role}` : ''}`,
        objectKeys: [object.key],
      });
    }
  }
  if (object.dpas?.length) evidence.push({ code: 'dpa-semantic', detail: `KNX DPA ${object.dpas.join(', ')}`, objectKeys: [object.key] });
  if (object.channelFunctionalBlocks?.length) evidence.push({ code: 'functional-block', detail: `KNX Functional Block ${object.channelFunctionalBlocks.join(', ')}`, objectKeys: [object.key] });
  if (object.channelId) evidence.push({ code: 'ets-channel-id', detail: `ETS Channel ${object.channelId}`, objectKeys: [object.key] });
  if (object.moduleInstance) evidence.push({ code: 'module-instance', detail: `ETS Modulinstanz ${object.moduleInstance}`, objectKeys: [object.key] });
  if (object.linkedGroupAddresses?.length) evidence.push({ code: 'ga-link', detail: `${object.linkedGroupAddresses.length} echte GA↔KO-Verknüpfung(en)`, objectKeys: [object.key] });
  if (object.dpt || object.objectSize) evidence.push({ code: 'dpt-size', detail: `${object.dpt || 'kein DPT'}${object.objectSize ? ` · ${object.objectSize}` : ''}`, objectKeys: [object.key] });
  if (object.functionText || object.name) evidence.push({ code: 'function-text', detail: object.functionText || object.name || '', objectKeys: [object.key] });
  if (object.activeByProject) evidence.push({ code: 'active-project-object', detail: 'Im konkreten ETS-Projekt aktiviertes Kommunikationsobjekt', objectKeys: [object.key] });
  return evidence;
}

export function exactEligible(objects: RecognitionObject[]): boolean {
  const codes = new Set(objects.flatMap((object) => hardEvidenceForObject(object).map((item) => item.code)));
  const structural = [...PRIMARY].some((code) => codes.has(code));
  const semantic = [...SEMANTIC].filter((code) => codes.has(code)).length >= 2;
  return structural && semantic;
}

export function gateCapability(
  capability: RecognizedCapability,
  objects: RecognitionObject[],
): RecognizedCapability {
  const keys = new Set([...capability.commandObjectKeys, ...capability.feedbackObjectKeys]);
  const relevant = objects.filter((object) => keys.has(object.key));
  const hard = dedupeEvidence(relevant.flatMap(hardEvidenceForObject));
  const fallback = capability.evidence.some((item) => item.code === 'dpt-flags-fallback');
  const matchClass: RecognitionMatchClass = fallback ? 'candidate' : capability.matchClass === 'exact' && !exactEligible(relevant)
    ? 'variant'
    : capability.matchClass;
  return { ...capability, matchClass, evidence: dedupeEvidence([...capability.evidence, ...hard]) };
}

export function dedupeEvidence(items: RecognitionEvidence[]): RecognitionEvidence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.code}|${item.detail}|${(item.objectKeys || []).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
