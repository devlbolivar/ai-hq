import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES,
  AGENT_COLORS,
  agentColorHex,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
} from '../../src/agents/catalog';

const lists = { AGENT_COLORS, SKIN_TONES, HAIR_STYLES, HAIR_COLORS, ACCESSORIES };

describe('appearance and color catalog (data-model.md "Catálogo", research R3)', () => {
  it.each([
    ['AGENT_COLORS', 10],
    ['SKIN_TONES', 4],
    ['HAIR_STYLES', 4],
    ['HAIR_COLORS', 5],
    ['ACCESSORIES', 4],
  ] as const)('%s has %i entries with unique ids and a Spanish name', (key, count) => {
    const list = lists[key];
    expect(list).toHaveLength(count);
    expect(new Set(list.map((entry) => entry.id)).size).toBe(count);
    for (const entry of list) expect(entry.name.trim().length).toBeGreaterThan(0);
  });

  it('lists the ids of the data model in order', () => {
    expect(AGENT_COLORS.map((c) => c.id)).toEqual([
      'coral',
      'amber',
      'lime',
      'emerald',
      'sky',
      'indigo',
      'violet',
      'rose',
      'sand',
      'slate',
    ]);
    expect(HAIR_STYLES.map((h) => h.id)).toEqual(['short', 'long', 'curly', 'bun']);
    expect(HAIR_COLORS.map((h) => h.id)).toEqual(['black', 'brown', 'auburn', 'blonde', 'gray']);
    expect(ACCESSORIES.map((a) => a.id)).toEqual(['none', 'glasses', 'headphones', 'cap']);
    expect(SKIN_TONES.map((s) => s.id)).toEqual(['skin-1', 'skin-2', 'skin-3', 'skin-4']);
  });

  it('gives every agent color a distinct 24-bit hex', () => {
    const hexes = AGENT_COLORS.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const list of [AGENT_COLORS, SKIN_TONES, HAIR_COLORS]) {
      for (const { hex } of list) {
        expect(Number.isInteger(hex)).toBe(true);
        expect(hex).toBeGreaterThanOrEqual(0);
        expect(hex).toBeLessThanOrEqual(0xffffff);
      }
    }
  });

  it('agentColorHex returns the hex of the entry', () => {
    for (const entry of AGENT_COLORS) expect(agentColorHex(entry.id)).toBe(entry.hex);
  });
});
