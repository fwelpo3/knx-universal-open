import type { EtsSourceProject, EtsSourceCommunicationObject } from '../source/types.ts';

/** Lightweight, serializable device-detail result for lazy consumers. */
export interface EtsDeviceDetails {
  deviceId: string;
  communicationObjects: EtsSourceCommunicationObject[];
}

/**
 * Runtime parser session. The session itself is intentionally NOT serializable;
 * all values crossing its public methods are serializable source DTOs.
 */
export interface EtsProjectSession {
  /** Materialize the complete normalized ETS source project. */
  materialize(): Promise<EtsSourceProject>;

  /** Optional lazy detail path for large UIs. */
  loadDeviceDetails?(deviceId: string): Promise<EtsDeviceDetails>;

  dispose?(): void | Promise<void>;
}
