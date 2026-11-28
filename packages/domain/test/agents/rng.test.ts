import { describe, expect, it } from 'vitest';
import { nextFloat, pick, randomInt, seedRng, type RngState } from '../../src/agents/rng';

describe('seedRng', () => {
  it.each([
    [-1.75, 0xffffffff],
    [0x100000001, 1],
    [42.9, 42],
    [NaN, 0],
    [Infinity, 0],
    [-Infinity, 0],
  ])('normalizes %s to the uint32 %s', (seed, expected) => {
    expect(seedRng(seed)).toBe(expected);
  });
});

describe('nextFloat', () => {
  it('repeats the Mulberry32 sequence for the same seed', () => {
    const expected = [0.6270739405881613, 0.002735721180215478, 0.5274470399599522];

    for (const seed of [1, 0x100000001]) {
      let state = seedRng(seed);
      const values = expected.map(() => {
        const [value, next] = nextFloat(state);
        state = next;
        return value;
      });
      expect(values).toEqual(expected);
    }
  });

  it('returns values in [0, 1) and serializable uint32 states across wraparound', () => {
    let state = seedRng(0xffffffff);
    expect(nextFloat(state)[1]).toBe(0x6d2b79f4);
    for (let draw = 0; draw < 1000; draw++) {
      const [value, next] = nextFloat(state);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(next).toBe(next >>> 0);
      state = next;
    }

    const restored: RngState = JSON.parse(JSON.stringify(state));
    expect(restored).toBe(state);
    expect(nextFloat(restored)).toEqual(nextFloat(state));
  });
});

describe('randomInt', () => {
  it('draws roughly evenly across both inclusive bounds over 10,000 draws', () => {
    const min = -2;
    const max = 2;
    const counts = new Map<number, number>();
    let state = seedRng(42);

    for (let draw = 0; draw < 10_000; draw++) {
      const [value, next] = randomInt(state, min, max);
      counts.set(value, (counts.get(value) ?? 0) + 1);
      state = next;
    }

    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2]);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(1800);
      expect(count).toBeLessThanOrEqual(2200);
    }
  });

  it('advances by one draw even when both bounds are equal', () => {
    const state = seedRng(42);
    expect(randomInt(state, 3, 3)).toEqual([3, nextFloat(state)[1]]);
  });
});

describe('pick', () => {
  it('picks the item at the drawn index and advances by one draw', () => {
    const state = seedRng(1);
    const items = Object.freeze([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const [item, next] = pick(state, items);
    expect(item).toBe(items[1]);
    expect(next).toBe(nextFloat(state)[1]);
  });

  it('advances by one draw when there is only one item', () => {
    const state = seedRng(1);
    expect(pick(state, ['only'])).toEqual(['only', nextFloat(state)[1]]);
  });
});
