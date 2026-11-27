import { describe, expect, it } from 'vitest';
import {
  findPath,
  gridToWorld,
  marketingLayout,
  tileCenter,
  walkability,
  type Coord,
} from '@ai-hq/domain';
import { debugOverlay } from '../../src/render/drawDebugOverlay';
import { IDLE_DEBUG, type DebugState } from '../../src/state/store';

const { tile } = marketingLayout;
const at = (x: number, y: number) => gridToWorld({ x, y }, tile);
const diamond = ({ x, y }: Coord) => [at(x, y), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)];
const center = (c: Coord) => tileCenter(c, tile);
const walk = walkability(marketingLayout);
const entrance = marketingLayout.entrance;
const desk4Chair = { x: 3, y: 9 };

const enabled: DebugState = { ...IDLE_DEBUG, enabled: true };

describe('debugOverlay (FR-023)', () => {
  it('draws nothing while debug mode is off (US4 escenario 6)', () => {
    expect(debugOverlay(IDLE_DEBUG, marketingLayout)).toBeNull();
    const route = findPath(walk, entrance, desk4Chair);
    expect(
      debugOverlay(
        { enabled: false, from: entrance, to: desk4Chair, result: route },
        marketingLayout,
      ),
    ).toBeNull();
  });

  it('marks every walkable tile and no blocked one', () => {
    const shapes = debugOverlay(enabled, marketingLayout);
    const walkableCount = walk.flat().filter(Boolean).length;
    expect(shapes?.walkable).toHaveLength(walkableCount);
    expect(shapes?.walkable).toContainEqual(diamond({ x: 9, y: 6 }));
    expect(shapes?.walkable).not.toContainEqual(diamond({ x: 3, y: 5 })); // desk-1
    expect(shapes?.walkable).not.toContainEqual(diamond({ x: 0, y: 5 })); // wall
  });

  it('marks the entrance tile', () => {
    expect(debugOverlay(enabled, marketingLayout)?.entrance).toEqual(diamond(entrance));
  });

  it('draws one arrow per use point, from its tile center towards where it faces', () => {
    const shapes = debugOverlay(enabled, marketingLayout);
    const usePoints = marketingLayout.objects.flatMap((o) => o.usePoints);
    expect(shapes?.usePoints).toHaveLength(usePoints.length);

    // desk-1 is used from its chair at (3,6) facing N, i.e. towards the desk at (3,5).
    const arrow = shapes?.usePoints.find((u) => u.tile.x === 3 && u.tile.y === 6);
    expect(arrow).toBeDefined();
    const toDesk = center({ x: 3, y: 5 });
    const from = center({ x: 3, y: 6 });
    expect(arrow!.from).toEqual(from);
    const dx = arrow!.to.x - from.x;
    const dy = arrow!.to.y - from.y;
    expect(Math.sign(dx)).toBe(Math.sign(toDesk.x - from.x));
    expect(Math.sign(dy)).toBe(Math.sign(toDesk.y - from.y));
    // The arrow stays inside its own tile.
    expect(Math.hypot(dx, dy)).toBeLessThan(Math.hypot(toDesk.x - from.x, toDesk.y - from.y) / 2);
    expect(Math.hypot(dx, dy)).toBeGreaterThan(0);
  });

  it('has no route, origin or destination before any pick', () => {
    const shapes = debugOverlay(enabled, marketingLayout);
    expect(shapes?.from).toBeNull();
    expect(shapes?.to).toBeNull();
    expect(shapes?.path).toBeNull();
  });

  it('marks the origin after the first pick', () => {
    const shapes = debugOverlay({ ...enabled, from: entrance }, marketingLayout);
    expect(shapes?.from).toEqual(diamond(entrance));
    expect(shapes?.to).toBeNull();
    expect(shapes?.path).toBeNull();
  });

  it('draws the route through the tile centers of the path', () => {
    const result = findPath(walk, entrance, desk4Chair);
    if (!result.ok) throw new Error('expected a route');
    const shapes = debugOverlay(
      { enabled: true, from: entrance, to: desk4Chair, result },
      marketingLayout,
    );
    expect(shapes?.path).toEqual(result.path.map(center));
    expect(shapes?.to).toEqual({ tile: diamond(desk4Chair), reachable: true });
  });

  it('marks an unreachable destination without a route', () => {
    const desk = { x: 3, y: 5 };
    const shapes = debugOverlay(
      { enabled: true, from: entrance, to: desk, result: { ok: false, reason: 'blocked' } },
      marketingLayout,
    );
    expect(shapes?.path).toBeNull();
    expect(shapes?.to).toEqual({ tile: diamond(desk), reachable: false });
  });
});
