export type KnxErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_GROUP_ADDRESS'
  | 'GROUP_ADDRESS_SPACE_EXHAUSTED'
  | 'SOURCE_FORMAT_INVALID'
  | 'SOURCE_ENTRY_MISSING'
  | 'SOURCE_REFERENCE_UNRESOLVED'
  | 'AMBIGUOUS_MATCH'
  | 'DPT_CONFLICT'
  | 'OBJECT_SIZE_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'UNSUPPORTED_OPERATION'
  | 'INTERNAL_ERROR';

export interface KnxErrorPayload {
  code: KnxErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Error shape safe to translate across SDK/process/language boundaries. */
export class KnxPlatformError extends Error {
  readonly code: KnxErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: KnxErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'KnxPlatformError';
    this.code = code;
    this.details = details;
  }

  toJSON(): KnxErrorPayload {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

export function isKnxPlatformError(value: unknown): value is KnxPlatformError {
  return value instanceof KnxPlatformError;
}
