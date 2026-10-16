import type { KnxprojBootstrap } from '../archive/readBootstrap.ts';
import type { CreateKnxprojParseContextOptions } from './context.ts';
import { createKnxprojParseContext } from './context.ts';
import { materializeKnxprojContext } from './materialize.ts';

export type ParseKnxprojBootstrapOptions = CreateKnxprojParseContextOptions;

/** Convenience one-shot parser. Sessions use the same context but may also load lazy device details. */
export async function parseKnxprojBootstrap(
  bootstrap: KnxprojBootstrap,
  options: ParseKnxprojBootstrapOptions
) {
  const context = await createKnxprojParseContext(bootstrap, options);
  return materializeKnxprojContext(context);
}
