import type { ObjectKind, SocialNetwork } from '@ai-hq/domain';

/** Abstract glyphs drawn by code for each network screen — never official logos (FR-007). */
export type NetworkIconId = 'aperture' | 'note' | 'play' | 'nodes' | 'spark';

export interface NetworkStyle {
  readonly color: number;
  readonly icon: NetworkIconId;
}

/** Dark theme tokens (FR-011). `background` matches `body` in `index.css`. */
export const theme = {
  background: 0x0f1117,
  floor: {
    top: 0x1e2433,
    alt: 0x222939,
    line: 0x2c3448,
    edgeLeft: 0x161b27,
    edgeRight: 0x11151e,
    edgeDepth: 10,
  },
  wall: 0x3a4258,
  screenBody: 0x171b26,
  whiteboardFace: 0xd9dee8,
  text: 0xe5e7eb,
} as const;

export const networkStyles: Readonly<Record<SocialNetwork, NetworkStyle>> = {
  instagram: { color: 0xe0568f, icon: 'aperture' },
  tiktok: { color: 0x2ad4c8, icon: 'note' },
  youtube: { color: 0xe5483f, icon: 'play' },
  linkedin: { color: 0x3c8fd9, icon: 'nodes' },
  x: { color: 0xd8dce4, icon: 'spark' },
};

/** Base (top-face) color per object kind; side faces are derived with `shade`. */
export const kindColors: Readonly<Record<ObjectKind, number>> = {
  wall: theme.wall,
  screen: theme.screenBody,
  whiteboard: 0x5a6378,
  desk: 0x8a6a4f,
  chair: 0x4b5675,
  monitor: 0x2a2f3d,
  plant: 0x3f9b62,
  sofa: 0x7b5ea8,
  'meeting-table': 0x6f5a48,
  'coffee-machine': 0x9aa3b5,
};

/** Multiplies each RGB channel by `factor`, clamped to [0, 255]. */
export function shade(color: number, factor: number): number {
  const channel = (shift: number) =>
    Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
