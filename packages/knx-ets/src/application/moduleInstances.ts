import type { EtsXmlDocumentHandle, EtsXmlNavigator } from '../ports/xml.ts';
import type { EtsModuleInstanceMeta } from '../parser/moduleResolution.ts';

export function parseModuleInstanceMeta(
  xml: EtsXmlNavigator,
  document: EtsXmlDocumentHandle
): Map<string, EtsModuleInstanceMeta> {
  const argumentNames = new Map<string, string>();
  for (const arg of xml.all(document, 'Argument')) {
    const id = xml.attr(arg, 'Id');
    const name = xml.attr(arg, 'Name');
    if (id && name) argumentNames.set(id, name);
  }

  const out = new Map<string, EtsModuleInstanceMeta>();
  for (const module of xml.all(document, 'Module')) {
    const id = xml.attr(module, 'Id');
    const definitionId = xml.attr(module, 'RefId');
    if (!id || !definitionId) continue;

    const args: Record<string, string> = {};
    for (const arg of xml.children(module)) {
      const localName = xml.localName(arg);
      if (localName !== 'NumericArg' && localName !== 'TextArg') continue;
      const refId = xml.attr(arg, 'RefId');
      const name = argumentNames.get(refId) || refId.split('_').pop() || refId;
      args[name] = xml.attr(arg, 'Value');
    }

    const meta: EtsModuleInstanceMeta = {
      id,
      definitionId,
      args,
      objectNumberBase: numericArg(args, 'ObjNumberBase'),
    };
    for (const key of moduleInstanceKeys(id)) out.set(key, meta);
  }
  return out;
}

function moduleInstanceKeys(id: string): string[] {
  const keys = [id];
  const tail = String(id || '').match(/(MD-\d+_M-\d+)$/)?.[1];
  if (tail) keys.push(tail);
  return [...new Set(keys)];
}

function numericArg(args: Record<string, string>, name: string): number {
  const entry = Object.entries(args).find(([key]) => key.toLowerCase() === name.toLowerCase());
  const value = Number(entry?.[1]);
  return Number.isFinite(value) ? value : 0;
}
