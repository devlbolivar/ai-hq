import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES,
  agentColorHex,
  CHARACTER_BODY,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  type Appearance,
  type Direction,
} from '@ai-hq/domain';
import {
  characterShapes,
  POSES,
  type CharacterShape,
  type Pose,
} from '../../src/render/character/shapes';

const base: Appearance = {
  skinTone: 'skin-2',
  hairStyle: 'short',
  hairColor: 'brown',
  accessory: 'none',
};
const FACINGS: Direction[] = ['N', 'E', 'S', 'W'];
const color = agentColorHex('violet');

function bounds(shape: CharacterShape): { minX: number; maxX: number; minY: number; maxY: number } {
  if (shape.kind === 'ellipse') {
    return {
      minX: shape.x - shape.rx,
      maxX: shape.x + shape.rx,
      minY: shape.y - shape.ry,
      maxY: shape.y + shape.ry,
    };
  }
  if (shape.kind === 'rect') {
    return { minX: shape.x, maxX: shape.x + shape.w, minY: shape.y, maxY: shape.y + shape.h };
  }
  const xs = shape.points.filter((_, i) => i % 2 === 0);
  const ys = shape.points.filter((_, i) => i % 2 === 1);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function parts(shapes: readonly CharacterShape[], part: string): CharacterShape[] {
  return shapes.filter((s) => s.part === part);
}

function top(shapes: readonly CharacterShape[], part: string): number {
  return Math.min(...parts(shapes, part).map((s) => bounds(s).minY));
}

describe('characterShapes (FR-021, FR-022, FR-024)', () => {
  it('stays inside CHARACTER_BODY for every appearance, facing, pose and time', () => {
    const half = CHARACTER_BODY.width / 2;
    for (const hairStyle of HAIR_STYLES.map((h) => h.id)) {
      for (const accessory of ACCESSORIES.map((a) => a.id)) {
        for (const facing of FACINGS) {
          for (const pose of POSES) {
            for (const t of [0, 90, 137, 250, 600, 999, 1500]) {
              const shapes = characterShapes(
                { ...base, hairStyle, accessory },
                color,
                facing,
                pose,
                t,
              );
              for (const shape of shapes) {
                const b = bounds(shape);
                expect(b.minX).toBeGreaterThanOrEqual(-half);
                expect(b.maxX).toBeLessThanOrEqual(half);
                expect(b.minY).toBeGreaterThanOrEqual(-CHARACTER_BODY.height);
                expect(b.maxY).toBeLessThanOrEqual(0);
              }
            }
          }
        }
      }
    }
  });

  it('paints the body with the agent color, the head with the skin and the hair with its color', () => {
    for (const skin of SKIN_TONES) {
      for (const hair of HAIR_COLORS) {
        const shapes = characterShapes(
          { ...base, skinTone: skin.id, hairColor: hair.id },
          color,
          'S',
          'idle',
          0,
        );
        expect(parts(shapes, 'body').every((s) => s.fill === color)).toBe(true);
        expect(parts(shapes, 'head').every((s) => s.fill === skin.hex)).toBe(true);
        expect(parts(shapes, 'hair').length).toBeGreaterThan(0);
        expect(parts(shapes, 'hair').every((s) => s.fill === hair.hex)).toBe(true);
      }
    }
  });

  it('draws a different hair shape per style', () => {
    const hairOf = (hairStyle: Appearance['hairStyle']) =>
      JSON.stringify(parts(characterShapes({ ...base, hairStyle }, color, 'S', 'idle', 0), 'hair'));
    const all = HAIR_STYLES.map((h) => hairOf(h.id));
    expect(new Set(all).size).toBe(all.length);
  });

  it('adds accessory shapes except for "none"', () => {
    for (const { id } of ACCESSORIES) {
      for (const facing of FACINGS) {
        const shapes = characterShapes({ ...base, accessory: id }, color, facing, 'idle', 0);
        expect(parts(shapes, 'accessory').length > 0).toBe(id !== 'none');
      }
    }
  });

  it('is distinguishable in the 4 facings', () => {
    const all = FACINGS.map((f) => JSON.stringify(characterShapes(base, color, f, 'idle', 0)));
    expect(new Set(all).size).toBe(4);
  });

  it('moves the legs while walking', () => {
    const at = (t: number) =>
      JSON.stringify(parts(characterShapes(base, color, 'E', 'walk', t), 'leg'));
    expect(at(0)).not.toBe(at(125));
  });

  it('moves the arms while typing', () => {
    const at = (t: number) =>
      JSON.stringify(parts(characterShapes(base, color, 'N', 'type', t), 'arm'));
    expect(at(0)).not.toBe(at(90));
  });

  it('holds a cup on a coffee break', () => {
    expect(parts(characterShapes(base, color, 'E', 'coffee', 0), 'cup')).toHaveLength(1);
    expect(parts(characterShapes(base, color, 'E', 'idle', 0), 'cup')).toHaveLength(0);
  });

  it('raises the arms above the head when celebrating', () => {
    const shapes = characterShapes(base, color, 'S', 'celebrate', 250);
    expect(top(shapes, 'arm')).toBeLessThan(top(shapes, 'head'));
    expect(top(characterShapes(base, color, 'S', 'idle', 250), 'arm')).toBeGreaterThan(
      top(characterShapes(base, color, 'S', 'idle', 250), 'head'),
    );
  });

  it('breathes subtly when idle', () => {
    const at = (t: number) => top(characterShapes(base, color, 'S', 'idle', t), 'head');
    expect(at(0)).not.toBe(at(600));
    expect(Math.abs(at(0) - at(600))).toBeLessThanOrEqual(1);
  });

  it('lists the five poses', () => {
    const poses: Pose[] = ['idle', 'walk', 'type', 'coffee', 'celebrate'];
    expect(POSES).toEqual(poses);
  });
});
