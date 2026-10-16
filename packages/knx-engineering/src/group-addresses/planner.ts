import { DynamicGroupAllocator, type DynamicAddress } from './DynamicGroupAllocator.ts';
import { functionalGroupId, functionalGroups } from './functionalGroups.ts';
import { generateGaDescription, generateGaName } from './template.ts';
import { targetsForFunction } from './targets.ts';
import type {
  GaFunctionalGroup,
  GaPlanRow,
  GaPlanningArea,
  GaPlanningFunction,
  GaPlanningInstance,
  GaPlanningProject,
  GaPlanningRoom,
} from './types.ts';

function route(func: GaPlanningFunction, instance: GaPlanningInstance): 'main' | 'feedback' {
  const separate = instance.feedbackMiddleGroup !== undefined && instance.feedbackMiddleGroup !== instance.middleGroup;
  return separate && func.role === 'feedback' ? 'feedback' : 'main';
}

function hasRoute(instance: GaPlanningInstance, expected: 'main' | 'feedback'): boolean {
  return instance.functions.some((fn) => fn.enabled !== false && route(fn, instance) === expected);
}

function pushStructure(rows: GaPlanRow[], addr: DynamicAddress, areaName: string, middleName: string): void {
  if (addr.startsMainGroup) {
    rows.push({
      level: 'main',
      mainGroup: addr.mainGroup,
      name: addr.mainSegmentIndex === 1 ? areaName : `${areaName} (${addr.mainSegmentIndex})`,
    });
  }
  if (addr.startsMiddleGroup) {
    rows.push({
      level: 'middle',
      mainGroup: addr.mainGroup,
      middleGroup: addr.middleGroup,
      name: addr.middleSegmentIndex === 1 ? middleName : `${middleName} (${addr.middleSegmentIndex})`,
    });
  }
}

function addGa(
  rows: GaPlanRow[],
  allocator: DynamicGroupAllocator,
  areaName: string,
  middleName: string,
  name: string,
  datapointType = '',
  description = '',
  targets = [] as GaPlanRow['targets'],
): void {
  const addr = allocator.allocateAddress();
  pushStructure(rows, addr, areaName, middleName);
  rows.push({
    level: 'ga',
    mainGroup: addr.mainGroup,
    middleGroup: addr.middleGroup,
    sub: addr.sub,
    name,
    datapointType,
    description,
    targets,
  });
}

function middleNames(project: GaPlanningProject): Record<string, string> {
  const names: Record<string, string> = {};
  for (const area of project.areas) {
    for (const room of area.rooms) {
      for (const instance of room.instances) {
        names[String(instance.middleGroup)] ||= instance.description || instance.type;
        if (instance.feedbackMiddleGroup !== undefined && instance.feedbackMiddleGroup !== instance.middleGroup) {
          names[String(instance.feedbackMiddleGroup)] ||= `${instance.description || 'Rückmeldung'} - Rückmeldungen`;
        }
      }
    }
  }
  return names;
}

interface BuildingGroupItem {
  room: GaPlanningRoom;
  instance: GaPlanningInstance;
  isFeedback: boolean;
}

function collectBuildingGroups(rooms: GaPlanningRoom[]): Map<number, BuildingGroupItem[]> {
  const groups = new Map<number, BuildingGroupItem[]>();
  const add = (middle: number, item: BuildingGroupItem) => {
    if (!groups.has(middle)) groups.set(middle, []);
    groups.get(middle)!.push(item);
  };
  for (const room of rooms) {
    for (const instance of room.instances) {
      add(instance.middleGroup, { room, instance, isFeedback: false });
      if (instance.feedbackMiddleGroup !== undefined &&
          instance.feedbackMiddleGroup !== instance.middleGroup &&
          hasRoute(instance, 'feedback')) {
        add(instance.feedbackMiddleGroup, { room, instance, isFeedback: true });
      }
    }
  }
  return groups;
}

function countInstanceAddresses(instance: GaPlanningInstance, isFeedback: boolean): number {
  const expected = isFeedback ? 'feedback' : 'main';
  return instance.functions.filter((fn) => fn.enabled !== false && route(fn, instance) === expected).length;
}

function planDeviceMode(project: GaPlanningProject): GaPlanRow[] {
  const rows: GaPlanRow[] = [];
  const allocator = new DynamicGroupAllocator();
  const names = middleNames(project);
  const descriptionTemplate = project.options.descriptionTemplate || '';

  for (const area of project.areas) {
    const groups = collectBuildingGroups(area.rooms);
    allocator.beginArea(area.mainGroup);

    for (const logicalMiddle of [...groups.keys()].sort((a, b) => a - b)) {
      const baseName = names[String(logicalMiddle)] || `Mittelgruppe ${logicalMiddle}`;
      allocator.beginLogicalGroup(logicalMiddle);
      let lastRoomId: string | null = null;
      let lastInstanceId: string | null = null;
      const items = groups.get(logicalMiddle)!;
      items.sort((a, b) => a.room.name.localeCompare(b.room.name) || a.instance.id.localeCompare(b.instance.id));

      for (const { room, instance, isFeedback } of items) {
        if (room.id !== lastRoomId) {
          const roomItems = items.filter((item) => item.room.id === room.id);
          const roomAddresses = 1 + Math.max(0, roomItems.length - 1)
            + roomItems.reduce((sum, item) => sum + countInstanceAddresses(item.instance, item.isFeedback), 0)
            + (lastRoomId !== null ? 1 : 0);
          const moved = allocator.ensureCapacity(roomAddresses);
          if (lastRoomId !== null && !moved) addGa(rows, allocator, area.name, baseName, '-', '', 'Trenner');
          addGa(rows, allocator, area.name, baseName, `--- ${room.name} ---`, '', `Trenner für ${room.name}`);
          lastRoomId = room.id;
          lastInstanceId = null;
        }
        if (lastInstanceId !== null && instance.id !== lastInstanceId) {
          addGa(rows, allocator, area.name, baseName, '-', '', 'Trenner');
        }
        lastInstanceId = instance.id;

        const roomIndex = area.rooms.findIndex((candidate) => candidate.id === room.id);
        const instances = room.instances.filter((candidate) => candidate.type === instance.type);
        const instanceIndex = instances.findIndex((candidate) => candidate.id === instance.id);
        for (const fn of instance.functions) {
          if (fn.enabled === false) continue;
          const expected = isFeedback ? 'feedback' : 'main';
          if (route(fn, instance) !== expected) continue;
          const functionName = instance.isScene ? (instance.sceneName || fn.name) : fn.name;
          const context = {
            area, room, roomIndex, instance, instanceIndex, functionName, function: fn,
            middleGroupName: baseName, middleGroupNumber: logicalMiddle,
          };
          addGa(
            rows,
            allocator,
            area.name,
            baseName,
            generateGaName(project.options.nameTemplate, context),
            fn.datapointType,
            project.options.descriptionEnabled ? generateGaDescription(descriptionTemplate, context) : '',
            targetsForFunction(instance, fn),
          );
        }
      }
      allocator.endLogicalGroup();
    }
    allocator.endArea();
  }
  return rows;
}

interface FunctionalItem {
  room: GaPlanningRoom;
  roomIndex: number;
  instance: GaPlanningInstance;
  instanceIndex: number;
  fn: GaPlanningFunction;
}

function groupForFunction(
  groups: GaFunctionalGroup[],
  instance: GaPlanningInstance,
  fn: GaPlanningFunction,
): GaFunctionalGroup {
  const id = functionalGroupId(instance, fn);
  return groups.find((group) => group.id === id) || groups[groups.length - 1];
}

function countRoomAddresses(items: FunctionalItem[], markers: boolean, separators: boolean): number {
  const instanceIds = [...new Set(items.map((item) => item.instance.id))];
  return items.length + (markers ? 1 : 0) + (separators ? Math.max(0, instanceIds.length - 1) : 0);
}

function planRoomFunctionMode(project: GaPlanningProject): GaPlanRow[] {
  const rows: GaPlanRow[] = [];
  const allocator = new DynamicGroupAllocator();
  const groups = functionalGroups(project.options.functionalGroups).sort((a, b) => a.middleGroup - b.middleGroup);
  const markers = project.options.roomMarkersEnabled !== false;
  const separators = project.options.functionSeparatorsEnabled !== false;
  const descriptionTemplate = project.options.descriptionTemplate || '';

  for (const area of project.areas) {
    allocator.beginArea(area.mainGroup);
    const all: FunctionalItem[] = area.rooms.flatMap((room, roomIndex) =>
      room.instances.flatMap((instance, instanceIndex) =>
        instance.functions
          .filter((fn) => fn.enabled !== false)
          .map((fn) => ({ room, roomIndex, instance, instanceIndex, fn })),
      ),
    );

    for (const group of groups) {
      const items = all.filter((item) => groupForFunction(groups, item.instance, item.fn).id === group.id);
      if (!items.length) continue;
      allocator.beginLogicalGroup(group.middleGroup);
      let currentRoom = '';
      let currentInstance = '';

      for (const item of items) {
        if (item.room.id !== currentRoom) {
          const roomItems = items.filter((candidate) => candidate.room.id === item.room.id);
          allocator.ensureCapacity(countRoomAddresses(roomItems, markers, separators));
          currentRoom = item.room.id;
          currentInstance = '';
          if (markers) addGa(rows, allocator, area.name, group.name, `--- ${item.room.name} ---`);
        }
        if (separators && currentInstance && currentInstance !== item.instance.id) {
          addGa(rows, allocator, area.name, group.name, '-');
        }
        currentInstance = item.instance.id;

        const functionName = item.instance.isScene ? (item.instance.sceneName || item.fn.name) : item.fn.name;
        const addr = allocator.allocateAddress();
        pushStructure(rows, addr, area.name, group.name);
        const context = {
          area,
          room: item.room,
          roomIndex: item.roomIndex,
          instance: item.instance,
          instanceIndex: item.instanceIndex,
          functionName,
          function: item.fn,
          middleGroupName: group.name,
          middleGroupNumber: addr.middleGroup,
        };
        rows.push({
          level: 'ga',
          mainGroup: addr.mainGroup,
          middleGroup: addr.middleGroup,
          sub: addr.sub,
          name: generateGaName(project.options.nameTemplate, context),
          datapointType: item.fn.datapointType,
          description: project.options.descriptionEnabled ? generateGaDescription(descriptionTemplate, context) : '',
          targets: targetsForFunction(item.instance, item.fn),
        });
      }
      allocator.endLogicalGroup();
    }
    allocator.endArea();
  }
  return rows;
}

export function planGroupAddresses(project: GaPlanningProject): GaPlanRow[] {
  return project.options.mode === 'room-function' ? planRoomFunctionMode(project) : planDeviceMode(project);
}
