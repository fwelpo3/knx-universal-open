/** Progress event emitted by long-running ETS parsing operations. */
export interface EtsProgressEvent {
  phase: string;
  percent?: number;
  detail?: string;
}

export type EtsProgressSink = (event: EtsProgressEvent) => void;

/**
 * Cooperative scheduling port. Browser code can yield to animation frames;
 * Node/Worker implementations can use setImmediate/setTimeout or no-op.
 */
export interface EtsExecutionScheduler {
  yield(): Promise<void>;
  now(): number;
}

export const immediateEtsScheduler: EtsExecutionScheduler = Object.freeze({
  async yield() {},
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
});
