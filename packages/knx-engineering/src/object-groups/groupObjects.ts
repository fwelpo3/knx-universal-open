import type {
  EngineeringCommunicationObject,
  EngineeringObjectGroup,
  ObjectGroupingMode,
} from './types.ts';

export function cleanEngineeringObjectText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\{\{\s*\d+\s*:\s*([^}]+)\}\}/g, '$1')
    .replace(/\{\{\s*\d+\s*\}\}/g, '')
    .replace(/\{\s*\d+\s*\}/g, '')
    .replace(/\{\s*\}/g, '')
    .replace(/\bChannel\b/gi, 'Kanal')
    .replace(/\bSwitch\b/gi, 'Schalten')
    .replace(/\s*[-–—:]\s*$/, '')
    .trim();
}

export function inferredObjectGroupLabel(object: EngineeringCommunicationObject): string | null {
  if (!object) return null;
  const text = cleanEngineeringObjectText(object.Text || object.Name || '');
  const functionText = cleanEngineeringObjectText(object.FunctionText || '');
  const fullText = [text, functionText].filter(Boolean).join(' ');
  const rules: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/\b(Ausgang|Eingang|Kanal|Wippe|Taste|Taster|Jalousie|Rollo|Dimmer|Schalter)\s+([A-Z]|\d{1,2})\b/i, (m) => `${m[1]} ${m[2].toUpperCase()}`],
    [/\b([A-Z]|\d{1,2})\s+(Ausgang|Eingang|Kanal|Wippe|Taste|Taster)\b/i, (m) => `${m[2]} ${m[1].toUpperCase()}`],
    [/\bLichtausgang\s*(\d{1,2})\b/i, (m) => `Lichtausgang ${m[1]}`],
    [/\bKonstantlichtregelung\s*(\d{1,2})\b/i, (m) => `Konstantlichtregelung ${m[1]}`],
  ];

  for (const [rule, format] of rules) {
    const match = fullText.match(rule);
    if (match) return format(match).replace(/\+/g, '');
  }

  if (text && text.length <= 25 && functionText && text !== functionText) {
    const cleaned = text.replace(/[:\-–|]\s*$/, '').trim();
    if (cleaned && !cleaned.includes('+')) return cleaned;
  }

  const parts = fullText.split(/\s*[:\-–|]\s+/);
  if (parts.length > 1 && parts[0].length <= 20) {
    const prefix = parts[0].trim();
    if (prefix && !prefix.includes('+')) return prefix;
  }
  return null;
}

export function groupCommunicationObjects<TObject extends EngineeringCommunicationObject>(
  objects: readonly TObject[],
  mode: ObjectGroupingMode
): EngineeringObjectGroup<TObject>[] {
  const groups = new Map<string, EngineeringObjectGroup<TObject>>();
  const roots: TObject[] = [];
  const autoLabelCounts = new Map<string, number>();

  if (mode !== 'ets' && mode !== 'flat') {
    for (const object of objects) {
      const nativePath = Array.isArray(object?.etsGroupPath) ? object.etsGroupPath : [];
      if (mode === 'auto' || nativePath.length === 0) {
        const label = inferredObjectGroupLabel(object);
        if (label) autoLabelCounts.set(label, (autoLabelCounts.get(label) || 0) + 1);
      }
    }
  }

  for (const object of objects) {
    if (!object) continue;
    const nativePath = (Array.isArray(object.etsGroupPath) ? object.etsGroupPath : [])
      .map((item) => ({ label: cleanEngineeringObjectText(item?.label), order: item?.order }))
      .filter((item) => item.label);
    const inferred = mode !== 'ets' && mode !== 'flat' ? inferredObjectGroupLabel(object) : null;
    const autoLabel = inferred && (autoLabelCounts.get(inferred) || 0) >= 2 ? inferred : null;

    let label: string | null = null;
    let source: 'ets' | 'auto' | 'root' = 'root';
    let path: string[] = [];
    let order: number | undefined;

    if (mode === 'auto' && autoLabel) {
      label = autoLabel;
      path = [label];
      source = 'auto';
    } else if (mode !== 'flat' && mode !== 'auto') {
      if (nativePath.length) {
        path = nativePath.map((item) => item.label);
        label = path.at(-1) || null;
        order = nativePath.at(-1)?.order;
        source = 'ets';
      } else if (autoLabel) {
        label = autoLabel;
        path = [label];
        source = 'auto';
      }
    }

    if (!label) {
      roots.push(object);
      continue;
    }

    const key = `${source}|${path.join('>')}`;
    let group = groups.get(key);
    if (!group) {
      group = { id: `grp-${hashText(key)}`, label, path, objects: [], kind: 'channel', source, order };
      groups.set(key, group);
    }
    group.objects.push(object);
  }

  const result = [...groups.values()].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    return a.label.localeCompare(b.label, 'de', { numeric: true });
  });

  roots.sort((a, b) => (Number(a.Number) || 99999) - (Number(b.Number) || 99999));
  for (const object of roots) {
    result.push({
      id: `ko-${hashText(object.ref || String(object.Number))}`,
      label: cleanEngineeringObjectText(object.Text || object.Name || object.FunctionText) || `KO ${object.Number || '–'}`,
      path: [],
      objects: [object],
      kind: 'object',
      source: 'root',
    });
  }
  return result;
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
