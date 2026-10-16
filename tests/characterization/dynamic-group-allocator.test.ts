import test from 'node:test';
import assert from 'node:assert/strict';
import { DynamicGroupAllocator } from '../../packages/knx-engineering/src/group-addresses/DynamicGroupAllocator.ts';

test('0/0 starts at subaddress 1 to keep 0/0/0 unused', () => {
  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(0);
  allocator.beginLogicalGroup(0);
  assert.deepEqual(allocator.allocateAddress(), {
    mainGroup: 0,
    middleGroup: 0,
    sub: 1,
    middleSegmentIndex: 1,
    mainSegmentIndex: 1,
    startsMiddleGroup: true,
    startsMainGroup: true,
  });
});

test('allocator continues into the next middle group after the first segment is full', () => {
  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(0);
  allocator.beginLogicalGroup(0);

  let last;
  for (let i = 0; i < 255; i += 1) last = allocator.allocateAddress();
  assert.equal(last?.sub, 255);

  const next = allocator.allocateAddress();
  assert.equal(`${next.mainGroup}/${next.middleGroup}/${next.sub}`, '0/1/0');
  assert.equal(next.middleSegmentIndex, 2);
  assert.equal(next.startsMiddleGroup, true);
});

test('overflow after middle group 7 continues in the next main group', () => {
  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(1);
  allocator.beginLogicalGroup(7);
  for (let i = 0; i < 256; i += 1) allocator.allocateAddress();
  const next = allocator.allocateAddress();
  assert.equal(`${next.mainGroup}/${next.middleGroup}/${next.sub}`, '2/0/0');
  assert.equal(next.mainSegmentIndex, 2);
});

test('ensureCapacity moves a started segment if a block no longer fits', () => {
  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(2);
  allocator.beginLogicalGroup(3);
  for (let i = 0; i < 250; i += 1) allocator.allocateAddress();
  assert.equal(allocator.ensureCapacity(10), true);
  const next = allocator.allocateAddress();
  assert.equal(`${next.mainGroup}/${next.middleGroup}/${next.sub}`, '2/4/0');
});

test('areas never move backwards into already consumed main groups', () => {
  const allocator = new DynamicGroupAllocator();
  allocator.beginArea(4);
  allocator.beginLogicalGroup(0);
  allocator.allocateAddress();
  allocator.endLogicalGroup();
  allocator.endArea();
  allocator.beginArea(2);
  allocator.beginLogicalGroup(0);
  const next = allocator.allocateAddress();
  assert.equal(next.mainGroup, 5);
});
