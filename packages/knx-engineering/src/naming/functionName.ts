function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const TECH_SUFFIX = /\s*·\s*(?:DPT|DPST)[^·]*\s*·\s*KO\s+\d+\s*$/i;
const BROAD_CHANNEL = /^(?:bedienen\s*\/\s*anzeige|operation\s*\/\s*display|allgemein|general)$/i;
const GENERIC_FUNCTION = /^(?:status|schalten|switch|wert|value|rückmeldung|rueckmeldung|feedback|ein\s*\/\s*aus|on\s*\/\s*off)$/i;

export interface FunctionDisplayMetadata {
  objectName?: string;
  description?: string;
  functionText?: string;
  channel?: string;
}

export function normalizeFunctionDisplayName(currentValue: string, meta: FunctionDisplayMetadata): string {
  const current = clean(currentValue);
  const objectName = clean(meta.objectName || meta.description);
  const functionText = clean(meta.functionText);
  const channel = clean(meta.channel);
  if (!current || (!objectName && !functionText)) return current;

  let generated = TECH_SUFFIX.test(current);
  if (channel && BROAD_CHANNEL.test(channel) && current.toLowerCase().startsWith(`${channel.toLowerCase()} – `)) generated = true;
  if (functionText && current.toLowerCase() === functionText.toLowerCase() && GENERIC_FUNCTION.test(functionText)) generated = true;

  const pairs = [
    `${functionText} (${objectName})`, `${objectName} (${functionText})`,
    `${functionText} · ${objectName}`, `${objectName} · ${functionText}`,
    `${functionText} – ${objectName}`, `${objectName} – ${functionText}`,
    `${functionText} - ${objectName}`, `${objectName} - ${functionText}`,
  ].filter(() => objectName && functionText);
  if (pairs.some((value) => current.toLowerCase() === value.toLowerCase())) generated = true;
  if (!generated) return current;

  if (functionText && !GENERIC_FUNCTION.test(functionText)) return functionText;
  if (objectName) return objectName;
  return current.replace(TECH_SUFFIX, '').trim();
}
