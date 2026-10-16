import { decodeDpt, encodeDpt } from './codec.ts';
import { getDptDefinition } from './registry.ts';
import type { DptDecodeOptions, DptDecodeResult, DptEncodeOptions, DptGroupTransport, DptGroupTransportInfo, DptGroupTransportPurpose } from './types.ts';

export function dptGroupTransportInfo(id: string): DptGroupTransportInfo {
  const definition = getDptDefinition(id);
  if (!definition) throw new Error(`Unknown DPT: ${id}`);
  const policy = definition.groupTransport as DptGroupTransport;
  return {
    policy,
    runtime: policy === 'eligible',
    parametersAndDiagnostics: policy === 'eligible' || policy === 'parameters-and-diagnostics',
  };
}

export function assertDptGroupTransport(id: string, purpose: DptGroupTransportPurpose = 'runtime'): void {
  const info = dptGroupTransportInfo(id);
  if (purpose === 'runtime' && !info.runtime) {
    throw new RangeError(`${id} is not eligible for runtime group transport (${info.policy})`);
  }
  if (purpose === 'parameters-and-diagnostics' && !info.parametersAndDiagnostics) {
    throw new RangeError(`${id} is forbidden for group transport`);
  }
}

export function decodeGroupDpt(id: string, input: Uint8Array | ArrayLike<number>, options: DptDecodeOptions = {}): DptDecodeResult {
  assertDptGroupTransport(id, 'runtime');
  return decodeDpt(id, input, options);
}

export function encodeGroupDpt(id: string, value: unknown, options: DptEncodeOptions = {}): Uint8Array {
  assertDptGroupTransport(id, 'runtime');
  return encodeDpt(id, value, options);
}
