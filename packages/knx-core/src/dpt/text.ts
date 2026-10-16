import type { DptFieldDefinition } from './types.ts';

export function decodeChars(field: DptFieldDefinition, bytes: Uint8Array, offset: number): [string, number] {
  const start = Math.floor(offset / 8);
  const shape = field.shape;
  let raw: Uint8Array;
  let consumed: number;
  let match = shape.match(/^char-array:(\d+):(.+)$/);
  if (match) {
    consumed = Number(match[1]) * 8;
    raw = bytes.slice(start, start + Number(match[1]));
    const pad = match[2] === '-' ? null : Number(match[2]);
    if (pad != null) raw = trimTrailing(raw, pad);
  } else {
    match = shape.match(/^char-terminated:(\d+):(.+)$/);
    if (match) {
      const n = Number(match[1]);
      const term = Number(match[2]);
      consumed = n * 8;
      raw = terminate(bytes.slice(start, start + n), term);
    } else {
      const term = Number(field.shape.split(':')[1]);
      const source = bytes.slice(start);
      const at = source.indexOf(term);
      if (at < 0) throw new RangeError(`${field.name}: variable string is missing terminator 0x${term.toString(16).padStart(2, '0')}`);
      consumed = (at + 1) * 8;
      raw = source.slice(0, at);
    }
  }
  return [decodeText(raw, charCodec(field)), consumed];
}

export function encodeChars(
  field: DptFieldDefinition,
  value: unknown,
  bytes: Uint8Array,
  offset: number,
): number {
  const raw = encodeText(String(value ?? ''), charCodec(field));
  const start = Math.floor(offset / 8);
  let match = field.shape.match(/^char-array:(\d+):(.+)$/);
  if (match) {
    const n = Number(match[1]);
    if (raw.length > n) throw new RangeError(`${field.name} too long`);
    bytes.set(raw, start);
    const pad = match[2] === '-' ? 0 : Number(match[2]);
    bytes.fill(pad, start + raw.length, start + n);
    return n * 8;
  }
  match = field.shape.match(/^char-terminated:(\d+):(.+)$/);
  if (match) {
    const n = Number(match[1]);
    const term = Number(match[2]);
    if (raw.includes(term)) throw new RangeError(`${field.name}: terminator occurs inside string`);
    if (raw.length >= n) throw new RangeError(`${field.name} too long`);
    bytes.set(raw, start);
    bytes[start + raw.length] = term;
    return n * 8;
  }
  const term = Number(field.shape.split(':')[1]);
  if (raw.includes(term)) throw new RangeError(`${field.name}: terminator occurs inside string`);
  bytes.set(raw, start);
  bytes[start + raw.length] = term;
  return (raw.length + 1) * 8;
}

function charCodec(field: DptFieldDefinition): 'utf8' | 'latin1' | 'ascii' {
  if (field.ref === '28.001' || (field.ref === 'self' && (field.name.includes('UTF') || field.shape.startsWith('char-variable:')))) return 'utf8';
  if (field.ref === '4.002') return 'latin1';
  return 'ascii';
}
function trimTrailing(raw: Uint8Array, pad: number): Uint8Array {
  let n = raw.length;
  while (n && raw[n - 1] === pad) n -= 1;
  return raw.slice(0, n);
}
function terminate(raw: Uint8Array, term: number): Uint8Array {
  const at = raw.indexOf(term);
  return at >= 0 ? raw.slice(0, at) : raw;
}
function decodeText(bytes: Uint8Array, codec: 'utf8' | 'latin1' | 'ascii'): string {
  if (codec === 'utf8') {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new RangeError('invalid UTF-8 payload'); }
  }
  return Array.from(bytes, (byte) => String.fromCharCode(codec === 'ascii' ? byte & 0x7f : byte)).join('');
}
function encodeText(text: string, codec: 'utf8' | 'latin1' | 'ascii'): Uint8Array {
  if (codec === 'utf8') return new TextEncoder().encode(text);
  return Uint8Array.from(Array.from(text, (char) => {
    const n = char.charCodeAt(0);
    if (codec === 'ascii' && n > 127 || n > 255) throw new RangeError('character');
    return n;
  }));
}
