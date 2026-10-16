import {
  etsSemanticObjectFunction,
  etsSemanticObjectName,
  semanticEtsFunctionName,
  specificEtsChannelLabel,
  type EtsSourceCommunicationObject,
} from '../../knx-ets/src/index.ts';

export type EtsObjectNameMode = 'actual' | 'function' | 'smart' | 'both';

export function importedEtsObjectNames(objects: EtsSourceCommunicationObject[], mode: EtsObjectNameMode = 'smart'): string[] {
  const base = objects.map((object) => sourceName(object, mode));
  const frequencies = new Map<string, number>();
  base.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));

  return objects.map((object, index) => {
    const current = base[index];
    if ((frequencies.get(current) || 0) <= 1) return current;
    const channel = specificEtsChannelLabel(lastChannelLabel(object));
    if (channel && !current.toLowerCase().includes(channel.toLowerCase())) return `${channel} – ${current}`;
    const alternate = alternateName(object, current);
    return alternate ? `${current} – ${alternate}` : current;
  });
}

function sourceName(object: EtsSourceCommunicationObject, mode: EtsObjectNameMode): string {
  const semantic = {
    Text: object.text,
    Name: object.name,
    Description: object.description,
    FunctionText: object.functionText,
    Number: object.number,
  };
  const objectName = etsSemanticObjectName(semantic);
  const functionText = etsSemanticObjectFunction(semantic);
  if (mode === 'actual') return objectName || functionText || `KO ${object.number || '–'}`;
  if (mode === 'both') {
    if (objectName && functionText && objectName.toLowerCase() !== functionText.toLowerCase()) return `${objectName} – ${functionText}`;
    return objectName || functionText || `KO ${object.number || '–'}`;
  }
  return semanticEtsFunctionName(semantic);
}

function alternateName(object: EtsSourceCommunicationObject, current: string): string {
  const semantic = { Text: object.text, Name: object.name, Description: object.description, FunctionText: object.functionText, Number: object.number };
  const objectName = etsSemanticObjectName(semantic);
  const functionText = etsSemanticObjectFunction(semantic);
  for (const candidate of [objectName, functionText]) {
    if (candidate && candidate.toLowerCase() !== current.toLowerCase()) return candidate;
  }
  return '';
}

function lastChannelLabel(object: EtsSourceCommunicationObject): string {
  const path = Array.isArray(object.etsGroupPath) ? object.etsGroupPath : [];
  return String(path[path.length - 1]?.label || object.channelName || '');
}
