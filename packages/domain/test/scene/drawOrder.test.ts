import { describe, expect, it } from 'vitest';
import { drawOrder } from '../../src/scene/drawOrder';
import { marketingLayout } from '../../src/layout/marketing';
import { makeLayout, makeObject } from '../fixtures/layouts';
import type { OfficeObject } from '../../src/types';

const order = drawOrder(marketingLayout);
const indexOf = (id: string): number => {
  const i = order.indexOf(id);
  if (i < 0) throw new Error(`"${id}" missing from drawOrder`);
  return i;
};
const objectAt = (x: number, y: number, kind: OfficeObject['kind']): OfficeObject => {
  const found = marketingLayout.objects.find(
    (o) => o.kind === kind && o.origin.x === x && o.origin.y === y,
  );
  if (!found) throw new Error(`no ${kind} at (${x},${y})`);
  return found;
};

describe('drawOrder (FR-012, research R4)', () => {
  it('contains every object id exactly once', () => {
    expect(order).toHaveLength(marketingLayout.objects.length);
    expect(new Set(order)).toEqual(new Set(marketingLayout.objects.map((o) => o.id)));
  });

  it('draws the chair (3,6) after the desk (3,5) in front of which it stands', () => {
    expect(indexOf(objectAt(3, 6, 'chair').id)).toBeGreaterThan(indexOf(objectAt(3, 5, 'desk').id));
  });

  it('draws each monitor after its desk (higher z on the same tile)', () => {
    const monitors = marketingLayout.objects.filter((o) => o.kind === 'monitor');
    expect(monitors).toHaveLength(6);
    for (const monitor of monitors) {
      expect(monitor.attachedTo).toBeDefined();
      expect(indexOf(monitor.id)).toBeGreaterThan(indexOf(monitor.attachedTo as string));
    }
  });

  it('draws wall segments before the objects in front of them', () => {
    expect(indexOf('wall-0-5')).toBeLessThan(indexOf('desk-1'));
    expect(indexOf('wall-0-10')).toBeLessThan(indexOf('plant-3'));
    expect(indexOf('wall-0-2')).toBeLessThan(indexOf('plant-1'));
    expect(indexOf('wall-12-0')).toBeLessThan(indexOf('meeting-table'));
    expect(indexOf('screen-youtube')).toBeLessThan(indexOf('desk-2'));
    expect(indexOf('whiteboard')).toBeLessThan(indexOf('desk-1'));
  });

  it('draws the plant (10,1) after the wall tile (10,0) behind it (walls are 1x1 segments)', () => {
    expect(indexOf(objectAt(10, 1, 'plant').id)).toBeGreaterThan(indexOf('wall-10-0'));
  });

  it('draws the sofa after the coffee machine', () => {
    expect(indexOf('sofa')).toBeGreaterThan(indexOf('coffee-machine'));
  });

  it('draws desk-4 (front row) after desk-1 (back row)', () => {
    expect(indexOf('desk-4')).toBeGreaterThan(indexOf('desk-1'));
  });

  it('uses the front-most footprint tile for multi-tile objects', () => {
    const big = makeObject({ id: 'big', origin: { x: 2, y: 2 }, size: { w: 3, h: 3 } });
    const behind = makeObject({ id: 'behind', origin: { x: 5, y: 2 } }); // front sum 7 < 8
    const front = makeObject({ id: 'front', origin: { x: 5, y: 4 } }); // front sum 9 > 8
    expect(drawOrder(makeLayout({ objects: [front, big, behind] }))).toEqual([
      'behind',
      'big',
      'front',
    ]);
  });

  it('breaks ties by back-most tile, then z, then id', () => {
    // front sum 4 for both; back sum 3 (wide) < 4 (single)
    const wide = makeObject({ id: 'wide', origin: { x: 1, y: 2 }, size: { w: 2, h: 1 } });
    const single = makeObject({ id: 'single', origin: { x: 3, y: 1 } });
    // same tile: z decides before id
    const low = makeObject({ id: 'b-low', origin: { x: 6, y: 6 }, z: 0 });
    const high = makeObject({ id: 'a-high', origin: { x: 6, y: 6 }, z: 10 });
    // same front and back sums: id decides
    const twinA = makeObject({ id: 'twin-a', origin: { x: 9, y: 1 } });
    const twinB = makeObject({ id: 'twin-b', origin: { x: 1, y: 9 } });
    expect(drawOrder(makeLayout({ objects: [high, twinB, single, low, twinA, wide] }))).toEqual([
      'wide',
      'single',
      'twin-a',
      'twin-b',
      'b-low',
      'a-high',
    ]);
  });

  it('returns the same order for a shuffled objects array', () => {
    const shuffled = [...marketingLayout.objects].reverse();
    shuffled.push(...shuffled.splice(0, 17));
    expect(drawOrder({ ...marketingLayout, objects: shuffled })).toEqual(order);
  });
});
