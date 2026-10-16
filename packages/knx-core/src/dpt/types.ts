export type DptWidth = { kind: 'bits' | 'octets' | 'variable'; value?: number };
export type DptNumericMode = 'native' | 'exact';
export type DptExactDecimal = { kind: 'decimal'; coefficient: bigint; scale: number; text: string };
export type DptGroupTransport = 'eligible' | 'parameters-and-diagnostics' | 'forbidden';
export type DptGroupTransportPurpose = 'runtime' | 'parameters-and-diagnostics';
export type DptGroupTransportInfo = { policy: DptGroupTransport; runtime: boolean; parametersAndDiagnostics: boolean };
export type DptCrossReferenceTarget = { kind: 'dpt'; id: string } | { kind: 'main'; main: number };
export type DptCrossReference = { role: string; target: DptCrossReferenceTarget };

export type DptReceiveDisposition = 'ignore-message' | 'accept-without-action';
export type DptIssue = { level: 'warning' | 'error'; code: string; field?: string; path?: string; disposition?: DptReceiveDisposition; message: string };
export type DptCode = { code: number; label: string };
export type DptCodeBand = { start: number; end: number; label: string; disposition?: string };
export type DptNamedBit = { bit: number; name: string; activeValue: number; ref?: string };
export type DptBitSet = { reservedMask: number; reservedRule: string; bits: DptNamedBit[] };
export type DptSpecial = { raw: number; kind: string; disposition?: string };

export type DptCodeBandKind = 'reserved' | 'manufacturer-specific' | 'other';
export type DptCodeValue = {
  kind: 'code';
  code: number;
  label?: string;
  band?: boolean;
  bandKind?: DptCodeBandKind;
  disposition?: DptReceiveDisposition;
};
export type DptIntervalValue = DptCodeValue & {
  kind: 'code';
  intervals: number;
  break: boolean;
};
export type DptSpecialValue = {
  kind: 'special';
  state: 'invalid' | 'receiver-disposition';
  raw: number | bigint;
  specialKind: string;
  disposition?: string;
};
export type DptAbsentValue = {
  kind: 'state';
  state: 'absent' | 'dont-care' | 'fault-info';
  reason: string;
  flag?: string;
  raw?: number | bigint;
  meaning?: string;
};
export type DptZ8Status = {
  kind: 'status';
  raw: number;
  OutOfService: boolean;
  Fault: boolean;
  Overridden: boolean;
  InAlarm: boolean;
  AlarmUnAck: boolean;
};
export type DptZ8Command = {
  kind: 'command';
  code: number;
  label: string;
  mainValue: 'valid' | 'dont-care';
};

export type DptFieldDefinition = {
  name: string;
  shape: string;
  unit?: string;
  resolution?: string;
  mapping?: string;
  rangeMin?: string;
  rangeMax?: string;
  role?: string;
  ref?: string;
  codes?: DptCode[];
  codeBands?: DptCodeBand[];
  bitSet?: DptBitSet;
  specials?: DptSpecial[];
  children?: DptFieldDefinition[];
};
export type DptValidityEdge = { flag: string; target: string; sense: 'asserts-invalid' | 'asserts-valid' };
export type DptCrossRule = { kind: string; trigger: string; value: number; targets: string[]; disposition?: string };
export type DptDefinition = {
  id: string;
  main: number;
  sub: number;
  name: string;
  format: string;
  width: string;
  context: string;
  groupTransport: string;
  useClass: string;
  tier: string;
  operations: string;
  fields: DptFieldDefinition[];
  validity: DptValidityEdge[];
  rules: DptCrossRule[];
  references: DptCrossReference[];
};
export type DptDecodedField = {
  name: string;
  path?: string;
  raw?: bigint;
  value: unknown;
  label?: string;
  unit?: string;
  valid?: boolean;
  validityFlag?: string;
  state?: 'value' | 'invalid' | 'receiver-disposition' | 'absent' | 'dont-care' | 'fault-info';
  special?: DptSpecial;
  intervals?: number;
};
export type DptDecodeResult = {
  definition: DptDefinition;
  value: unknown;
  fields: Record<string, unknown>;
  details: DptDecodedField[];
  issues: DptIssue[];
  disposition?: DptReceiveDisposition;
  raw: Uint8Array;
};
export type DptDecodeOptions = { z8Mode?: 'status' | 'command'; numericMode?: DptNumericMode };
export type DptEncodeOptions = { z8Mode?: 'status' | 'command'; numericMode?: DptNumericMode };
