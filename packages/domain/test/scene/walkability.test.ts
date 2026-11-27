import { describe, expect, it } from 'vitest';
import { reachableFrom, walkability } from '../../src/scene/walkability';
import { makeLayout, makeObject } from '../fixtures/layouts';

describe('walkability (FR-020)', () => {
  it('has one row per grid row and one column per grid column', () => {
    const walk = walkability(makeLayout());
    expect(walk).toHaveLength(12);
    for (const row of walk) expect(row).toHaveLength(16);
    expect(walk.flat().every(Boolean)).toBe(true);
  });

  it('marks every footprint tile of a blocking object as not walkable (data-model.md OfficeObject.blocking, OfficeObject.size)', () => {
    const table = makeObject({
      id: 'meeting-table',
      kind: 'meeting-table',
      origin: { x: 12, y: 2 },
      size: { w: 2, h: 2 },
    });
    const walk = walkability(makeLayout({ objects: [table] }));
    for (const [x, y] of [
      [12, 2],
      [13, 2],
      [12, 3],
      [13, 3],
    ] as const) {
      expect(walk[y]?.[x]).toBe(false);
    }
    expect(walk[2]?.[11]).toBe(true);
    expect(walk[4]?.[12]).toBe(true);
    expect(walk[2]?.[14]).toBe(true);
  });

  it('keeps chairs, sofas and monitors walkable', () => {
    const objects = [
      makeObject({ id: 'chair', kind: 'chair', origin: { x: 3, y: 6 }, blocking: false }),
      makeObject({ id: 'sofa', kind: 'sofa', origin: { x: 12, y: 10 }, size: { w: 2, h: 1 }, blocking: false }),
      makeObject({ id: 'monitor', kind: 'monitor', origin: { x: 5, y: 5 }, blocking: false, z: 20 }),
    ];
    const walk = walkability(makeLayout({ objects }));
    expect(walk[6]?.[3]).toBe(true);
    expect(walk[10]?.[12]).toBe(true);
    expect(walk[10]?.[13]).toBe(true);
    expect(walk[5]?.[5]).toBe(true);
  });

  it('ignores footprint tiles that fall outside the grid', () => {
    const wide = makeObject({ id: 'wide', origin: { x: 15, y: 11 }, size: { w: 3, h: 3 } });
    const walk = walkability(makeLayout({ objects: [wide] }));
    expect(walk[11]?.[15]).toBe(false);
    expect(walk).toHaveLength(12);
    expect(walk[11]).toHaveLength(16);
  });
});

describe('reachableFrom', () => {
  it('floods in 4 directions only, never diagonally', () => {
    // Block the 4 orthogonal neighbours of (5,5); its diagonals stay free.
    const objects = [
      [5, 4],
      [6, 5],
      [5, 6],
      [4, 5],
    ].map(([x, y]) => makeObject({ id: `p-${x}-${y}`, origin: { x: x!, y: y! } }));
    const walk = walkability(makeLayout({ objects }));
    const reach = reachableFrom(walk, { x: 8, y: 11 });
    expect(reach[5]?.[5]).toBe(false);
    expect(reach[4]?.[4]).toBe(true);
    expect(reach[0]?.[0]).toBe(true);
    expect(reach[4]?.[5]).toBe(false);
  });

  it('reaches every walkable tile of an empty grid', () => {
    const reach = reachableFrom(walkability(makeLayout()), { x: 0, y: 0 });
    expect(reach.flat().every(Boolean)).toBe(true);
  });

  it('reaches nothing when the start tile is blocked or outside the grid', () => {
    const walk = walkability(makeLayout({ objects: [makeObject({ id: 'p', origin: { x: 8, y: 11 } })] }));
    expect(reachableFrom(walk, { x: 8, y: 11 }).flat().some(Boolean)).toBe(false);
    expect(reachableFrom(walk, { x: -1, y: 0 }).flat().some(Boolean)).toBe(false);
  });
});
