export type RngState = number;

export function seedRng(seed: number): RngState {
  return seed >>> 0;
}

export function nextFloat(state: RngState): readonly [value: number, next: RngState] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(next ^ (next >>> 15), next | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const value = ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
  return [value, next];
}

export function randomInt(state: RngState, min: number, max: number): readonly [number, RngState] {
  const [value, next] = nextFloat(state);
  return [min + Math.floor(value * (max - min + 1)), next];
}

export function pick<T>(state: RngState, items: readonly T[]): readonly [T, RngState] {
  const [index, next] = randomInt(state, 0, items.length - 1);
  return [items[index]!, next];
}
