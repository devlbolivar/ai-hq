import { describe, expect, it } from 'vitest';
import { tileCenter } from '../../src/iso';
import { marketingLayout } from '../../src/layout/marketing';
import {
  CHARACTER_BODY,
  characterSilhouette,
  positionToWorld,
  sceneHitTest,
} from '../../src/scene/characterHit';
import { hitTest } from '../../src/scene/hitTest';
import type { CharacterPlacement } from '../../src/scene/sceneOrder';

describe('positionToWorld (research R10)', () => {
  it('equals tileCenter for integer positions', () => {
    for (const tile of [
      { x: 0, y: 0 },
      { x: 3, y: 6 },
      { x: 15, y: 11 },
    ]) {
      expect(positionToWorld(tile)).toEqual(tileCenter(tile));
    }
  });

  it('interpolates linearly between neighbouring tiles', () => {
    const a = tileCenter({ x: 4, y: 6 });
    const b = tileCenter({ x: 5, y: 6 });
    expect(positionToWorld({ x: 4.25, y: 6 })).toEqual({
      x: a.x + (b.x - a.x) * 0.25,
      y: a.y + (b.y - a.y) * 0.25,
    });
  });

  it('honours a custom tile size', () => {
    expect(positionToWorld({ x: 1, y: 0 }, { width: 32, height: 16 })).toEqual({ x: 16, y: 16 });
  });
});

describe('characterSilhouette', () => {
  it('is the CHARACTER_BODY rectangle standing on positionToWorld, clockwise', () => {
    const feet = positionToWorld({ x: 3, y: 6 });
    const half = CHARACTER_BODY.width / 2;
    expect(characterSilhouette({ x: 3, y: 6 })).toEqual([
      { x: feet.x - half, y: feet.y - CHARACTER_BODY.height },
      { x: feet.x + half, y: feet.y - CHARACTER_BODY.height },
      { x: feet.x + half, y: feet.y },
      { x: feet.x - half, y: feet.y },
    ]);
  });
});

describe('sceneHitTest (FR-023, US1-6)', () => {
  const plantCenter = tileCenter({ x: 1, y: 10 }); // plant-3
  const at = (dx: number, dy: number) => ({ x: plantCenter.x + dx, y: plantCenter.y + dy });
  const agent = (id: string, teamIndex: number, x: number, y: number): CharacterPlacement => ({
    id,
    teamIndex,
    position: { x, y },
    tile: { x, y },
    next: null,
  });

  it('hits a character on its body', () => {
    const feet = positionToWorld({ x: 9, y: 6 });
    const target = sceneHitTest({ x: feet.x, y: feet.y - 20 }, marketingLayout, [
      agent('a', 0, 9, 6),
    ]);
    expect(target).toEqual({ type: 'agent', id: 'a' });
  });

  it('lets an object drawn in front win over a character behind it', () => {
    const point = at(26, -30);
    expect(hitTest(point, marketingLayout)).toEqual({ type: 'object', id: 'plant-3' });
    expect(sceneHitTest(point, marketingLayout, [agent('a', 0, 1, 9)])).toEqual({
      type: 'object',
      id: 'plant-3',
    });
  });

  it('lets a character drawn in front win over an object behind it', () => {
    const point = at(26, -10);
    expect(hitTest(point, marketingLayout)).toEqual({ type: 'object', id: 'plant-3' });
    expect(sceneHitTest(point, marketingLayout, [agent('a', 0, 2, 10)])).toEqual({
      type: 'agent',
      id: 'a',
    });
  });

  it('picks the character drawn in front when two overlap', () => {
    const feet = positionToWorld({ x: 9, y: 6 });
    const point = { x: feet.x, y: feet.y - 10 };
    const characters = [agent('back', 5, 9, 6), agent('front', 0, 10, 7)];
    expect(sceneHitTest(point, marketingLayout, characters)).toEqual({
      type: 'agent',
      id: 'front',
    });
  });

  it('ignores the bubble area, the ring and the lower half of the tile', () => {
    const feet = positionToWorld({ x: 9, y: 6 });
    const characters = [agent('a', 0, 9, 6)];
    const above = { x: feet.x, y: feet.y - CHARACTER_BODY.height - 8 };
    const ring = { x: feet.x + CHARACTER_BODY.width / 2 + 2, y: feet.y + 1 };
    const below = { x: feet.x, y: feet.y + 8 };
    for (const point of [above, ring, below]) {
      expect(sceneHitTest(point, marketingLayout, characters)).toEqual(
        hitTest(point, marketingLayout),
      );
    }
    expect(sceneHitTest(below, marketingLayout, characters)).toEqual({
      type: 'tile',
      tile: { x: 9, y: 6 },
    });
  });

  it('behaves like hitTest without characters', () => {
    for (const point of [at(0, 0), at(26, -30), { x: 5000, y: 5000 }]) {
      expect(sceneHitTest(point, marketingLayout, [])).toEqual(hitTest(point, marketingLayout));
    }
  });
});
