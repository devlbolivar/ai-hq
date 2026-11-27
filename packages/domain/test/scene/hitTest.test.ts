import { describe, expect, it } from 'vitest';
import { tileCenter, worldToGrid } from '../../src/iso';
import { marketingLayout } from '../../src/layout/marketing';
import { hitTest, silhouette } from '../../src/scene/hitTest';
import { makeLayout, makeObject } from '../fixtures/layouts';

describe('silhouette', () => {
  it('returns the tile diamond clockwise from the top for a flat 1x1 object', () => {
    expect(silhouette(makeObject({ id: 'flat', height: 0 }))).toEqual([
      { x: 0, y: 32 },
      { x: 32, y: 48 },
      { x: 0, y: 64 },
      { x: -32, y: 48 },
    ]);
  });

  it('returns the clockwise prism outline of a raised 2x2 meeting table', () => {
    const table = marketingLayout.objects.find(({ id }) => id === 'meeting-table')!;
    expect(silhouette(table)).toEqual([
      { x: 320, y: 198 },
      { x: 384, y: 230 },
      { x: 384, y: 256 },
      { x: 320, y: 288 },
      { x: 256, y: 256 },
      { x: 256, y: 230 },
    ]);
  });

  it('shifts the entire monitor outline up by its base elevation', () => {
    const monitor = makeObject({ id: 'monitor', kind: 'monitor', height: 22, z: 28 });
    expect(silhouette(monitor)).toEqual(
      silhouette({ ...monitor, z: 0 }).map(({ x, y }) => ({ x, y: y - 28 })),
    );
  });
});

describe('hitTest', () => {
  it('returns the floor tile at the center of a free tile', () => {
    const tile = marketingLayout.entrance;
    expect(hitTest(tileCenter(tile), marketingLayout)).toEqual({ type: 'tile', tile });
  });

  it('hits the meeting table over its footprint', () => {
    expect(hitTest(tileCenter({ x: 13, y: 3 }), marketingLayout)).toEqual({
      type: 'object',
      id: 'meeting-table',
    });
  });

  it('hits the upper part of the plant over a floor tile behind it', () => {
    const point = { x: 288, y: 150 };
    expect(worldToGrid(point, marketingLayout.grid, marketingLayout.tile)).toEqual({ x: 9, y: 0 });
    expect(hitTest(point, marketingLayout)).toEqual({ type: 'object', id: 'plant-2' });
  });

  it('prefers the monitor over its desk even when the desk is last in the layout', () => {
    const desk = marketingLayout.objects.find(({ id }) => id === 'desk-1')!;
    const monitor = marketingLayout.objects.find(({ id }) => id === 'monitor-1')!;
    const point = { x: -64, y: 119 };
    expect(hitTest(point, makeLayout({ objects: [desk] }))).toEqual({
      type: 'object',
      id: desk.id,
    });
    expect(hitTest(point, makeLayout({ objects: [monitor, desk] }))).toEqual({
      type: 'object',
      id: monitor.id,
    });
  });

  it('includes silhouette edges and vertices with a custom tile size', () => {
    const obj = makeObject({ id: 'raised', origin: { x: 0, y: 0 }, height: 10 });
    const layout = makeLayout({ tile: { width: 80, height: 40 }, objects: [obj] });
    const target = { type: 'object', id: obj.id };

    expect(hitTest({ x: 40, y: 15 }, layout)).toEqual(target);
    expect(hitTest({ x: 0, y: -10 }, layout)).toEqual(target);
    expect(hitTest({ x: 40.01, y: 15 }, layout)).toBeNull();
  });

  it('returns null outside the office', () => {
    expect(hitTest({ x: 1000, y: 1000 }, marketingLayout)).toBeNull();
  });
});
