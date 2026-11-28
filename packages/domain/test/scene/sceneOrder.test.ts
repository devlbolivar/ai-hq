import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { drawOrder } from '../../src/scene/drawOrder';
import { sceneOrder, type CharacterPlacement } from '../../src/scene/sceneOrder';

function still(id: string, teamIndex: number, x: number, y: number): CharacterPlacement {
  return { id, teamIndex, position: { x, y }, tile: { x, y }, next: null };
}

function walking(
  id: string,
  teamIndex: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): CharacterPlacement {
  const position = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  return { id, teamIndex, position, tile: from, next: to };
}

function keys(characters: readonly CharacterPlacement[]): string[] {
  return sceneOrder(marketingLayout, characters).map((item) =>
    item.type === 'object' ? item.id : `agent:${item.id}`,
  );
}

function before(order: string[], a: string, b: string): boolean {
  expect(order).toContain(a);
  expect(order).toContain(b);
  return order.indexOf(a) < order.indexOf(b);
}

describe('sceneOrder (FR-023, research R10)', () => {
  it('without characters equals the draw order of the 001', () => {
    expect(keys([])).toEqual(drawOrder(marketingLayout));
  });

  it('draws an agent on chair-1 right after the chair and behind the front desk desk-4', () => {
    const order = keys([still('a', 0, 3, 6)]);
    expect(order.indexOf('agent:a')).toBe(order.indexOf('chair-1') + 1);
    expect(before(order, 'agent:a', 'desk-4')).toBe(true);
    expect(before(order, 'desk-1', 'agent:a')).toBe(true);
  });

  it.each([
    [12, 10],
    [13, 10],
  ])('draws an agent on the sofa tile (%i,%i) after the sofa', (x, y) => {
    const order = keys([still('a', 0, x, y)]);
    expect(before(order, 'sofa', 'agent:a')).toBe(true);
  });

  it('uses the tile with greater x+y of a walking step', () => {
    // From (4,6) (x+y = 10) to (4,7) (x+y = 11): the reference is (4,7) from the start of the step.
    const order = keys([walking('a', 0, { x: 4, y: 6 }, { x: 4, y: 7 }, 0.1)]);
    expect(before(order, 'chair-2', 'agent:a')).toBe(true); // chair-2 at (5,6): x+y = 11
    expect(before(order, 'agent:a', 'chair-4')).toBe(true); // chair-4 at (3,9): x+y = 12
  });

  it('swaps two agents crossing on the same segment when they cross', () => {
    const from = { x: 9, y: 6 };
    const to = { x: 9, y: 7 };
    const beforeCross = keys([walking('a', 0, from, to, 0.25), walking('b', 1, to, from, 0.25)]);
    expect(before(beforeCross, 'agent:a', 'agent:b')).toBe(true);
    const afterCross = keys([walking('a', 0, from, to, 0.75), walking('b', 1, to, from, 0.75)]);
    expect(before(afterCross, 'agent:b', 'agent:a')).toBe(true);
  });

  it('breaks a full tie by team order: the higher number goes last', () => {
    expect(before(keys([still('b', 3, 9, 6), still('a', 1, 9, 6)]), 'agent:a', 'agent:b')).toBe(
      true,
    );
  });
});
