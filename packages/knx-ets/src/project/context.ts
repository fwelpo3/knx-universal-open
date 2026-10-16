import type { KnxprojBootstrap } from '../archive/readBootstrap.ts';
import { readKnxprojApplicationXml } from '../archive/readBootstrap.ts';
import type { EtsExecutionScheduler, EtsProgressSink } from '../ports/execution.ts';
import { immediateEtsScheduler } from '../ports/execution.ts';
import type { EtsXmlDocumentHandle, EtsXmlNodeHandle, EtsXmlRuntime } from '../ports/xml.ts';
import { parseApplicationProgramIndex } from '../application/index.ts';
import type { EtsApplicationProgramIndex } from '../application/types.ts';
import { parseDptLabels } from './dptLabels.ts';
import { indexGroupAddresses, parseGroupAddresses } from './groupAddresses.ts';
import { parseHardware } from './hardware.ts';
import type { EtsProductInfo } from './internalTypes.ts';
import { parsePlacements } from './placements.ts';
import { parseLocations } from './locations.ts';
import type { EtsSourceGroupAddress, EtsSourceLocation, EtsSourcePlacement } from '../source/types.ts';
import { projectMeta } from '../xml/navigation.ts';

export interface KnxprojParseContext {
  bootstrap: KnxprojBootstrap;
  xml: EtsXmlRuntime;
  scheduler: EtsExecutionScheduler;
  report: EtsProgressSink;
  now: () => number;
  projectDocument: EtsXmlDocumentHandle;
  projectId?: string;
  projectName?: string;
  dptLabels: Map<string, string>;
  products: Map<string, EtsProductInfo>;
  hardwareToApplication: Map<string, string>;
  groupAddresses: EtsSourceGroupAddress[];
  groupAddressById: Map<string, EtsSourceGroupAddress>;
  locations: EtsSourceLocation[];
  placements: Map<string, EtsSourcePlacement>;
  deviceNodesById: Map<string, EtsXmlNodeHandle>;
  applicationIndexes: Map<string, Promise<EtsApplicationProgramIndex | null>>;
}

export interface CreateKnxprojParseContextOptions {
  xml: EtsXmlRuntime;
  onProgress?: EtsProgressSink;
  scheduler?: EtsExecutionScheduler;
  now?: () => number;
}

export async function createKnxprojParseContext(
  bootstrap: KnxprojBootstrap,
  options: CreateKnxprojParseContextOptions
): Promise<KnxprojParseContext> {
  const xml = options.xml;
  const scheduler = options.scheduler || immediateEtsScheduler;
  const report = options.onProgress || (() => {});
  const projectDocument = xml.parse(bootstrap.project.text);
  const meta = projectMeta(xml, projectDocument);
  const dptLabels = parseDptLabels(xml, bootstrap.master?.text);
  const { products, hardwareToApplication } = await parseHardware(
    xml,
    bootstrap.hardware,
    scheduler,
    report
  );
  const groupAddresses = parseGroupAddresses(xml, projectDocument);
  const groupAddressById = indexGroupAddresses(groupAddresses);
  const locations = parseLocations(xml, projectDocument);
  const placements = parsePlacements(xml, projectDocument);
  const deviceNodesById = new Map<string, EtsXmlNodeHandle>();
  for (const node of xml.all(projectDocument, 'DeviceInstance')) {
    const id = xml.attr(node, 'Id');
    if (id) deviceNodesById.set(id, node);
  }

  return {
    bootstrap,
    xml,
    scheduler,
    report,
    now: options.now || defaultNow,
    projectDocument,
    projectId: meta.id,
    projectName: meta.name,
    dptLabels,
    products,
    hardwareToApplication,
    groupAddresses,
    groupAddressById,
    locations,
    placements,
    deviceNodesById,
    applicationIndexes: new Map(),
  };
}

export function applicationProgramForDevice(
  context: KnxprojParseContext,
  deviceNode: EtsXmlNodeHandle
): string {
  const hardware2ProgramRef = context.xml.attr(deviceNode, 'Hardware2ProgramRefId');
  return context.hardwareToApplication.get(hardware2ProgramRef) || '';
}

export async function applicationIndexForDevice(
  context: KnxprojParseContext,
  deviceNode: EtsXmlNodeHandle
): Promise<EtsApplicationProgramIndex | null> {
  const applicationProgramId = applicationProgramForDevice(context, deviceNode);
  if (!applicationProgramId) return null;

  let promise = context.applicationIndexes.get(applicationProgramId);
  if (!promise) {
    promise = loadApplicationIndex(context, applicationProgramId);
    context.applicationIndexes.set(applicationProgramId, promise);
  }
  return promise;
}

async function loadApplicationIndex(
  context: KnxprojParseContext,
  applicationProgramId: string
): Promise<EtsApplicationProgramIndex | null> {
  const text = await readKnxprojApplicationXml(context.bootstrap, applicationProgramId);
  if (!text) return null;
  context.report({ phase: 'application', detail: applicationProgramId });
  const document = context.xml.parse(text);
  const index = parseApplicationProgramIndex(context.xml, document, applicationProgramId);
  await context.scheduler.yield();
  return index;
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
