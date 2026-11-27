import { describe, expect, it } from 'vitest';
import { tileCenter } from '../../src/iso';
import { CHARACTER_BODY, characterSilhouette, positionToWorld } from '../../src/scene/characterHit';

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
