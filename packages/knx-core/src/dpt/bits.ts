export function extractBits(bytes: Uint8Array, offset: number, width: number): bigint {
  if (width <= 0 || width > 64 || offset < 0 || offset + width > bytes.length * 8) throw new RangeError('bit span');
  let out = 0n;
  for (let pos = offset; pos < offset + width; pos += 1) {
    const bit = (bytes[Math.floor(pos / 8)] >> (7 - (pos % 8))) & 1;
    out = (out << 1n) | BigInt(bit);
  }
  return out;
}
export function insertBits(bytes: Uint8Array, offset: number, width: number, value: bigint): void {
  if (width <= 0 || width > 64 || offset < 0 || offset + width > bytes.length * 8) throw new RangeError('bit span');
  if (value < 0n || value >= (1n << BigInt(width))) throw new RangeError('bit value');
  for (let i = 0; i < width; i += 1) {
    const pos = offset + i;
    const bit = Number((value >> BigInt(width - 1 - i)) & 1n);
    const idx = Math.floor(pos / 8), mask = 1 << (7 - (pos % 8));
    bytes[idx] = bit ? bytes[idx] | mask : bytes[idx] & ~mask;
  }
}
export function signedFromRaw(raw: bigint, bits: number): bigint {
  const sign = 1n << BigInt(bits - 1);
  return raw & sign ? raw - (1n << BigInt(bits)) : raw;
}
export function rawFromSigned(value: bigint, bits: number): bigint {
  const min = -(1n << BigInt(bits - 1)), max = (1n << BigInt(bits - 1)) - 1n;
  if (value < min || value > max) throw new RangeError('signed value');
  return value < 0n ? (1n << BigInt(bits)) + value : value;
}
