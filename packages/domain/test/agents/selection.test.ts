import { describe, expect, it } from 'vitest';
import { cycleSelection, selectByNumber } from '../../src/agents/selection';

const team = Object.freeze([
  'head-of-marketing',
  'trend-scout',
  'copywriter',
  'scriptwriter',
  'designer',
  'community-manager',
]);

describe('selectByNumber', () => {
  it.each(team.map((id, index) => [index + 1, id] as const))(
    'selects position %i (%s) in team order',
    (position, id) => {
      expect(selectByNumber(team, null, position)).toBe(id);
    },
  );

  it.each([7, 8, 9])('keeps the current selection at missing position %i', (position) => {
    expect(selectByNumber(team, 'designer', position)).toBe('designer');
    expect(selectByNumber(team, null, position)).toBeNull();
  });

  it('accepts 9 as the highest shortcut even on a larger team', () => {
    const largerTeam = [...team, 'seventh', 'eighth', 'ninth', 'tenth'];
    expect(selectByNumber(largerTeam, null, 9)).toBe('ninth');
    expect(selectByNumber(largerTeam, 'designer', 10)).toBe('designer');
  });

  it.each([0, -1, 1.5, NaN])('keeps the selection for an invalid shortcut %s', (position) => {
    expect(selectByNumber(team, 'designer', position)).toBe('designer');
  });
});

describe('cycleSelection', () => {
  const cases = [
    ['copywriter', 1, 'scriptwriter'],
    ['copywriter', -1, 'trend-scout'],
    ['community-manager', 1, 'head-of-marketing'],
    ['head-of-marketing', -1, 'community-manager'],
    [null, 1, 'head-of-marketing'],
    [null, -1, 'community-manager'],
    ['removed-agent', 1, 'head-of-marketing'],
    ['removed-agent', -1, 'community-manager'],
  ] as const;

  it.each(cases)('cycles from %s in direction %i to %s', (current, direction, expected) => {
    expect(cycleSelection(team, current, direction)).toBe(expected);
  });

  it.each([1, -1] as const)('returns null for an empty team in direction %i', (direction) => {
    expect(cycleSelection([], null, direction)).toBeNull();
    expect(cycleSelection([], 'removed-agent', direction)).toBeNull();
  });
});
