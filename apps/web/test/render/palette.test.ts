import { describe, expect, it } from 'vitest';
import { AGENT_COLORS, type ObjectKind, type SocialNetwork } from '@ai-hq/domain';
import { kindColors, networkStyles, shade, theme, toCss } from '../../src/render/palette';

const NETWORKS: readonly SocialNetwork[] = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x'];
const KINDS: readonly ObjectKind[] = [
  'wall',
  'screen',
  'whiteboard',
  'desk',
  'chair',
  'monitor',
  'plant',
  'sofa',
  'meeting-table',
  'coffee-machine',
];

function luminance(color: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

describe('palette (FR-007, FR-011)', () => {
  it('gives each social network its own color', () => {
    expect(Object.keys(networkStyles).sort()).toEqual([...NETWORKS].sort());
    const colors = NETWORKS.map((n) => networkStyles[n].color);
    expect(new Set(colors).size).toBe(NETWORKS.length);
  });

  it('gives each social network its own icon id (no official logos)', () => {
    const icons = NETWORKS.map((n) => networkStyles[n].icon);
    expect(new Set(icons).size).toBe(NETWORKS.length);
    for (const icon of icons) {
      expect(icon).not.toMatch(/instagram|tiktok|youtube|linkedin|twitter|^x$/i);
    }
  });

  it('defines dark theme tokens', () => {
    expect(luminance(theme.background)).toBeLessThan(0.15);
    expect(luminance(theme.floor.top)).toBeLessThan(0.3);
    expect(theme.floor.top).not.toBe(theme.background);
    expect(toCss(theme.background)).toBe('#0f1117');
  });

  it('defines a base color for every object kind', () => {
    for (const kind of KINDS) {
      expect(kindColors[kind]).toBeTypeOf('number');
    }
  });

  it('shades colors darker and lighter per channel, clamped to [0, 255]', () => {
    expect(shade(0x804020, 0.5)).toBe(0x402010);
    expect(shade(0x804020, 1.5)).toBe(0xc06030);
    expect(shade(0xffffff, 2)).toBe(0xffffff);
    expect(toCss(0x0a0b0c)).toBe('#0a0b0c');
  });
});

describe('agent colors vs network colors (research R3)', () => {
  const rgb = (hex: number) => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff] as const;
  const distance = (a: number, b: number) => {
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
  };

  it('keeps every agent color at least 60 RGB units from every network color', () => {
    for (const agent of AGENT_COLORS) {
      for (const [network, style] of Object.entries(networkStyles)) {
        expect(
          distance(agent.hex, style.color),
          `${agent.id} vs ${network}`,
        ).toBeGreaterThanOrEqual(60);
      }
    }
  });
});
