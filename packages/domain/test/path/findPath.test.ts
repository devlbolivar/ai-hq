import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { findPath } from '../../src/path/findPath';
import { isWalkable, walkability } from '../../src/scene/walkability';
import { makeLayout, makeObject } from '../fixtures/layouts';

const open = walkability(makeLayout({ grid: { cols: 5, rows: 5 } }));

describe('findPath', () => {
  it('includes both endpoints of a straight path', () => {
    expect(findPath(open, { x: 1, y: 2 }, { x: 3, y: 2 })).toEqual({
      ok: true,
      path: [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
    });
  });

  it('takes a shortest four-direction detour around a wall', () => {
    const walk = walkability(
      makeLayout({
        grid: { cols: 5, rows: 5 },
        objects: [
          makeObject({ id: 'wall', kind: 'wall', origin: { x: 2, y: 1 }, size: { w: 1, h: 3 } }),
        ],
      }),
    );
    const from = { x: 1, y: 2 };
    const to = { x: 3, y: 2 };
    const result = findPath(walk, from, to);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toHaveLength(7);
    expect(result.path[0]).toEqual(from);
    expect(result.path.at(-1)).toEqual(to);
    for (const [index, tile] of result.path.entries()) {
      expect(isWalkable(walk, tile)).toBe(true);
      const previous = result.path[index - 1];
      if (previous) {
        expect(Math.abs(previous.x - tile.x) + Math.abs(previous.y - tile.y)).toBe(1);
      }
    }
  });

  it('reports a blocked endpoint', () => {
    const walk = walkability(makeLayout({ objects: [makeObject({ id: 'plant' })] }));
    const free = { x: 2, y: 1 };
    const blocked = { x: 1, y: 1 };
    expect(findPath(walk, free, blocked)).toEqual({ ok: false, reason: 'blocked' });
    expect(findPath(walk, blocked, free)).toEqual({ ok: false, reason: 'blocked' });
  });

  it('reports a walkable destination isolated by a wall', () => {
    const walk = walkability(
      makeLayout({
        grid: { cols: 3, rows: 2 },
        objects: [makeObject({ id: 'wall', origin: { x: 1, y: 0 }, size: { w: 1, h: 2 } })],
      }),
    );
    expect(findPath(walk, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual({
      ok: false,
      reason: 'unreachable',
    });
  });

  it.each([
    { x: -1, y: 0 },
    { x: 5, y: 0 },
    { x: 0, y: 5 },
  ])('reports an out-of-bounds endpoint at %j', (outside) => {
    const inside = { x: 0, y: 0 };
    expect(findPath(open, outside, inside)).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(findPath(open, inside, outside)).toEqual({ ok: false, reason: 'out-of-bounds' });
  });

  it('returns one tile when the endpoints coincide', () => {
    const tile = { x: 1, y: 1 };
    expect(findPath(open, tile, { ...tile })).toEqual({ ok: true, path: [tile] });
  });

  it.each([
    [
      { x: 3, y: 1 },
      { x: 2, y: 1 },
    ],
    [
      { x: 3, y: 3 },
      { x: 3, y: 2 },
    ],
    [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
    ],
    [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  ])('breaks equal-priority ties in N, E, S, W order toward %j', (to, firstStep) => {
    const from = { x: 2, y: 2 };
    expect(findPath(open, from, to)).toEqual({ ok: true, path: [from, firstStep, to] });
  });

  it('prefers a lower Manhattan distance when total costs tie', () => {
    const from = { x: 2, y: 2 };
    const to = { x: 4, y: 0 };
    expect(findPath(open, from, to)).toEqual({
      ok: true,
      path: [from, { x: 2, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 0 }, to],
    });
  });

  it('returns the same Marketing route on 100 calls', () => {
    const walk = walkability(marketingLayout);
    const from = marketingLayout.entrance;
    const to = { x: 3, y: 9 };
    const result = findPath(walk, from, to);
    expect(result.ok).toBe(true);
    for (let call = 1; call < 100; call++) {
      expect(findPath(walk, from, to)).toEqual(result);
    }
  });
});
