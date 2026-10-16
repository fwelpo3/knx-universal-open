import type { EtsXmlNodeHandle, EtsXmlRuntime } from '../ports/xml.ts';
import type {
  EtsSourceDevice,
  EtsSourceGroupAddress,
  EtsSourcePlacement,
} from '../source/types.ts';
import { xmlAncestor, xmlPhysicalAddress } from '../xml/navigation.ts';
import { parseInstanceCommunicationObjects } from './instanceObjects.ts';
import type { EtsProductInfo } from './internalTypes.ts';

export function parseDevice(input: {
  xml: EtsXmlRuntime;
  node: EtsXmlNodeHandle;
  products: ReadonlyMap<string, EtsProductInfo>;
  hardwareToApplication: ReadonlyMap<string, string>;
  dptLabels: ReadonlyMap<string, string>;
  placements: ReadonlyMap<string, EtsSourcePlacement>;
  groupAddressById: ReadonlyMap<string, EtsSourceGroupAddress>;
}): EtsSourceDevice {
  const { xml, node } = input;
  const id = xml.attr(node, 'Id');
  const physicalAddress = xmlPhysicalAddress(xml, node);
  const area = xmlAncestor(xml, node, 'Area');
  const line = xmlAncestor(xml, node, 'Line');
  const areaAddress = xml.attr(area, 'Address') || physicalAddress.split('.')[0] || '';
  const lineNumber = xml.attr(line, 'Address') || physicalAddress.split('.')[1] || '';
  const lineAddress = [areaAddress, lineNumber].filter((value) => value !== '').join('.');
  const areaName = xml.attr(area, 'Name');
  const lineName = xml.attr(line, 'Name');
  const mainLine = area
    ? xml.children(area, 'Line').find((candidate) => xml.attr(candidate, 'Address') === '0') || null
    : null;
  const mainLineName = xml.attr(mainLine, 'Name') || areaName;
  const mainLineAddress = areaAddress !== '' ? `${areaAddress}.0` : '';
  const deviceAddress = xml.attr(node, 'Address') || physicalAddress.split('.')[2] || '';

  const productRef = xml.attr(node, 'ProductRefId');
  const hardware2ProgramRef = xml.attr(node, 'Hardware2ProgramRefId');
  const product = input.products.get(productRef);
  const applicationProgramRef = input.hardwareToApplication.get(hardware2ProgramRef) || '';
  const communicationObjects = parseInstanceCommunicationObjects(
    xml,
    node,
    input.dptLabels,
    input.groupAddressById
  );

  const areaLabel = areaName || (areaAddress ? `Bereich ${areaAddress}` : '');
  const mainLineLabel = mainLineName || (mainLineAddress ? `Hauptlinie ${mainLineAddress}` : '');
  const lineLabel = lineName || (lineAddress ? `Linie ${lineAddress}` : '');

  return {
    id,
    name: xml.attr(node, 'Name') || product?.name || 'Unbekanntes Gerät',
    manufacturer: product?.manufacturer || manufacturerFromRefs(productRef, hardware2ProgramRef, applicationProgramRef),
    productName: product?.name,
    orderNumber: product?.orderNumber,
    productRef: productRef || undefined,
    hardware2ProgramRef: hardware2ProgramRef || undefined,
    applicationProgramRef: applicationProgramRef || undefined,
    topology: {
      areaId: xml.attr(area, 'Id') || undefined,
      areaName: areaName || undefined,
      areaAddress: areaAddress || undefined,
      mainLineId: xml.attr(mainLine, 'Id') || undefined,
      mainLineName: mainLineName || undefined,
      mainLineAddress: mainLineAddress || undefined,
      lineId: xml.attr(line, 'Id') || undefined,
      lineName: lineName || undefined,
      lineAddress: lineAddress || undefined,
      deviceAddress: deviceAddress || undefined,
      physicalAddress,
      path: [areaLabel, mainLineLabel, lineLabel].filter(Boolean),
    },
    placement: input.placements.get(id),
    communicationObjects,
  };
}

function manufacturerFromRefs(...refs: Array<string | undefined>): string {
  const joined = refs.filter(Boolean).join(' ');
  const match = joined.match(/M-(\d+)/);
  return match ? `Hersteller ${match[1]}` : 'ETS-Hersteller';
}
