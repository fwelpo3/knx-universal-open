/**
 * Runtime-neutral read-only view over an ETS .knxproj archive.
 * Implementations may use JSZip, a filesystem ZIP reader, an HTTP source, etc.
 */
export interface EtsArchiveReader {
  /** Stable archive entry names using forward slashes. */
  listEntries(): readonly string[];

  /** Read one entry as UTF-8 text. Missing entries return undefined. */
  readText(path: string): Promise<string | undefined>;
}

export interface EtsArchiveSource {
  fileName?: string;
  byteLength?: number;
  archive: EtsArchiveReader;
}
