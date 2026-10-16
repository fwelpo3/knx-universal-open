import { readKnxprojBootstrap, type KnxprojBootstrap } from '../archive/readBootstrap.ts';
import type { EtsArchiveSource } from '../ports/archive.ts';
import type { EtsExecutionScheduler, EtsProgressSink } from '../ports/execution.ts';
import type { EtsXmlRuntime } from '../ports/xml.ts';
import {
  applicationIndexForDevice,
  createKnxprojParseContext,
  type KnxprojParseContext,
} from '../project/context.ts';
import { materializeKnxprojContext } from '../project/materialize.ts';
import { resolveDeviceCommunicationObjects } from '../project/resolveDeviceObjects.ts';
import type { EtsProjectSession } from './session.ts';

export interface OpenEtsProjectOptions {
  xml: EtsXmlRuntime;
  onProgress?: EtsProgressSink;
  scheduler?: EtsExecutionScheduler;
  now?: () => number;
}

/**
 * Open a runtime-neutral ETS parser session from an archive source.
 * Archive I/O and XML implementation are injected ports; all returned domain data is serializable.
 */
export async function openEtsProject(
  source: EtsArchiveSource,
  options: OpenEtsProjectOptions
): Promise<EtsProjectSession> {
  const bootstrap = await readKnxprojBootstrap(source, {
    onProgress: options.onProgress,
    scheduler: options.scheduler,
  });
  return createEtsProjectSession(bootstrap, options);
}

/**
 * Create a parser session from an already-read bootstrap.
 * This is the migration/integration seam for runtimes that already opened the archive and
 * must avoid a second ZIP/XML bootstrap read while legacy code is being retired.
 */
export function createEtsProjectSession(
  bootstrap: KnxprojBootstrap,
  options: OpenEtsProjectOptions
): EtsProjectSession {
  let contextPromise: Promise<KnxprojParseContext> | undefined;
  let materialized: ReturnType<typeof materializeKnxprojContext> | undefined;
  const context = () => contextPromise ||= createKnxprojParseContext(bootstrap, options);

  return {
    async materialize() {
      const state = await context();
      materialized ||= materializeKnxprojContext(state);
      return materialized;
    },
    async loadDeviceDetails(deviceId) {
      const state = await context();
      const deviceNode = state.deviceNodesById.get(deviceId);
      if (!deviceNode) throw new Error(`ETS-Gerät nicht gefunden: ${deviceId}`);
      const applicationIndex = await applicationIndexForDevice(state, deviceNode);
      return {
        deviceId,
        communicationObjects: resolveDeviceCommunicationObjects({
          xml: state.xml,
          deviceNode,
          application: applicationIndex,
          dptLabels: state.dptLabels,
          groupAddresses: state.groupAddressById,
        }),
      };
    },
  };
}
