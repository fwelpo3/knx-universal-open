import JSZip from 'jszip';
import type { EtsArchiveReader, EtsArchiveSource } from '../../knx-ets/src/index.ts';

export class JsZipEtsArchiveReader implements EtsArchiveReader {
  constructor(private readonly zip: JSZip) {}

  listEntries(): readonly string[] {
    return Object.keys(this.zip.files);
  }

  async readText(path: string): Promise<string | undefined> {
    const entry = this.zip.file(path);
    return entry ? entry.async('string') : undefined;
  }
}

export async function openJsZipEtsArchive(
  data: Blob | ArrayBuffer | Uint8Array,
  options: { fileName?: string; byteLength?: number } = {}
): Promise<EtsArchiveSource> {
  const zip = await JSZip.loadAsync(data);
  return {
    fileName: options.fileName,
    byteLength: options.byteLength ?? inferByteLength(data),
    archive: new JsZipEtsArchiveReader(zip),
  };
}

function inferByteLength(data: Blob | ArrayBuffer | Uint8Array): number | undefined {
  if (typeof Blob !== 'undefined' && data instanceof Blob) return data.size;
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (data instanceof Uint8Array) return data.byteLength;
  return undefined;
}
