import { describe, expect, it } from 'vitest';
import { FOLLOW_MS, followOffset } from '../../src/state/follow';

const start = { x: 0, y: 0 };
const target = { x: 100, y: -50 };

describe('followOffset (FR-028: smooth centering ≤ 500 ms)', () => {
  it('lasts 400 ms', () => {
    expect(FOLLOW_MS).toBe(400);
  });

  it('starts at the initial offset and reaches the target at 400 ms', () => {
    expect(followOffset(start, target, 0)).toEqual(start);
    expect(followOffset(start, target, 400)).toEqual(target);
    expect(followOffset(start, target, 900)).toEqual(target);
  });

  it('eases out: past halfway at half time and monotonic', () => {
    const half = followOffset(start, target, 200);
    expect(half.x).toBeGreaterThan(50);
    let previous = -Infinity;
    for (let t = 0; t <= 400; t += 20) {
      const { x } = followOffset(start, target, t);
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });
});
