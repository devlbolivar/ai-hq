import { HAIR_COLORS, SKIN_TONES, type Appearance, type Direction } from '@ai-hq/domain';
import { shade } from '../palette';

/** Animation pose derived from the agent state (FR-024). */
export type Pose = 'idle' | 'walk' | 'type' | 'coffee' | 'celebrate';
export const POSES: readonly Pose[] = ['idle', 'walk', 'type', 'coffee', 'celebrate'];

export type ShapePart = 'leg' | 'body' | 'arm' | 'head' | 'hair' | 'eye' | 'accessory' | 'cup';

interface ShapeBase {
  readonly part: ShapePart;
  readonly fill: number;
}

/**
 * Character-local geometry: origin at the feet, y grows downwards (screen convention), so every
 * shape lies inside `CHARACTER_BODY` (x ∈ [−12, 12], y ∈ [−52, 0]).
 */
export type CharacterShape =
  | (ShapeBase & { readonly kind: 'ellipse'; x: number; y: number; rx: number; ry: number })
  | (ShapeBase & { readonly kind: 'rect'; x: number; y: number; w: number; h: number })
  | (ShapeBase & { readonly kind: 'polygon'; points: readonly number[] });

const LEGS = 0x2a2f3d;
const DARK = 0x1f2937;
const EYE = 0x111827;
const CUP = 0xf8fafc;

const skinHex = new Map(SKIN_TONES.map((s) => [s.id, s.hex]));
const hairHex = new Map(HAIR_COLORS.map((h) => [h.id, h.hex]));

/** Faces the viewer in S and E; shows the back of the head in N and W. */
function facesViewer(facing: Direction): boolean {
  return facing === 'S' || facing === 'E';
}

/** Horizontal lean of face details: S and W look left on screen, E and N right. */
function side(facing: Direction): number {
  return facing === 'S' || facing === 'W' ? -1 : 1;
}

function rect(
  part: ShapePart,
  fill: number,
  x: number,
  y: number,
  w: number,
  h: number,
): CharacterShape {
  return { kind: 'rect', part, fill, x, y, w, h };
}

function ellipse(
  part: ShapePart,
  fill: number,
  x: number,
  y: number,
  rx: number,
  ry: number,
): CharacterShape {
  return { kind: 'ellipse', part, fill, x, y, rx, ry };
}

function hairShapes(
  style: Appearance['hairStyle'],
  fill: number,
  headY: number,
  facing: Direction,
): CharacterShape[] {
  const back = !facesViewer(facing);
  const dx = side(facing);
  switch (style) {
    case 'short':
      return [
        ellipse('hair', fill, 0, headY - 3, 6.5, back ? 5.5 : 4),
        ...(back ? [] : [rect('hair', fill, -dx * 6 - (dx > 0 ? 1 : 0), headY - 3, 1.5, 4)]),
      ];
    case 'long':
      return [
        rect('hair', fill, -7, headY - 2, 14, back ? 13 : 10),
        ellipse('hair', fill, 0, headY - 3, 7, 4.5),
      ];
    case 'curly':
      return [-4.5, -1.5, 1.5, 4.5].map((x, i) =>
        ellipse('hair', fill, x, headY - 4.5 + (i % 2 === 0 ? 1 : 0), 2.4, 2.4),
      );
    case 'bun':
      return [
        ellipse('hair', fill, 0, headY - 3, 6.5, 4.2),
        ellipse('hair', fill, 0, headY - 8.5, 2.5, 2.5),
      ];
  }
}

function accessoryShapes(
  accessory: Appearance['accessory'],
  color: number,
  headY: number,
  facing: Direction,
): CharacterShape[] {
  const dx = side(facing);
  switch (accessory) {
    case 'none':
      return [];
    case 'glasses':
      return facesViewer(facing)
        ? [
            rect('accessory', DARK, -4.5 + dx, headY - 1, 3.5, 2),
            rect('accessory', DARK, 1 + dx, headY - 1, 3.5, 2),
          ]
        : [rect('accessory', DARK, dx > 0 ? 5 : -6.5, headY - 1, 1.5, 1)];
    case 'headphones':
      return [
        rect('accessory', DARK, -6.5, headY - 7.5, 13, 1.5),
        ellipse('accessory', shade(color, 0.6), -6, headY, 1.8, 2.6),
        ellipse('accessory', shade(color, 0.6), 6, headY, 1.8, 2.6),
      ];
    case 'cap':
      return [
        ellipse('accessory', shade(color, 0.7), 0, headY - 4.5, 6.8, 3.5),
        rect('accessory', shade(color, 0.55), dx > 0 ? 2 : -9, headY - 3.5, 7, 1.5),
      ];
  }
}

/** Arm rectangles for a pose; `phase` animates over simulated time. */
function armShapes(pose: Pose, color: number, lift: number, t: number): CharacterShape[] {
  const fill = shade(color, 0.85);
  switch (pose) {
    case 'celebrate':
      return [rect('arm', fill, -10, -45 - lift, 3, 14), rect('arm', fill, 7, -45 - lift, 3, 14)];
    case 'type': {
      const tap = Math.sin(t / 45) > 0 ? 1.5 : 0;
      return [
        rect('arm', fill, -9, -27 - tap - lift, 3, 9),
        rect('arm', fill, 6, -27 - (1.5 - tap) - lift, 3, 9),
      ];
    }
    case 'coffee':
      return [rect('arm', fill, -10, -29 - lift, 3, 12), rect('arm', fill, 7, -33 - lift, 3, 8)];
    case 'walk': {
      const swing = Math.sin((t / 250) * Math.PI) * 2;
      return [
        rect('arm', fill, -10, -29 + swing - lift, 3, 12),
        rect('arm', fill, 7, -29 - swing - lift, 3, 12),
      ];
    }
    case 'idle':
      return [rect('arm', fill, -10, -29 - lift, 3, 12), rect('arm', fill, 7, -29 - lift, 3, 12)];
  }
}

/**
 * Pure character geometry (research R11): the Pixi renderer (office) and the SVG renderer (editor
 * preview, team cards) both draw these shapes, so they never diverge.
 */
export function characterShapes(
  appearance: Appearance,
  color: number,
  facing: Direction,
  pose: Pose,
  t: number,
  seated = false,
): CharacterShape[] {
  const breathe = pose === 'idle' ? (1 - Math.cos((t / 1200) * 2 * Math.PI)) / 2 : 0;
  const jump = pose === 'celebrate' ? Math.abs(Math.sin((t / 500) * Math.PI)) * 3 : 0;
  // Sitting lowers the upper body onto the seat (chair, sofa).
  const lift = breathe + jump - (seated ? 6 : 0);
  const stride = pose === 'walk' ? Math.sin((t / 250) * Math.PI) * 2 : 0;
  const headY = -37 - lift;
  const skin = skinHex.get(appearance.skinTone)!;
  const hair = hairHex.get(appearance.hairColor)!;
  const dx = side(facing);

  const legs = seated
    ? [rect('leg', LEGS, -5, -9, 4, 6), rect('leg', LEGS, 1, -9, 4, 6)]
    : [
        rect('leg', LEGS, -5, -14 - jump + Math.max(0, stride), 4, 14 - Math.max(0, stride)),
        rect('leg', LEGS, 1, -14 - jump + Math.max(0, -stride), 4, 14 - Math.max(0, -stride)),
      ];
  const shapes: CharacterShape[] = [
    ...legs,
    rect('body', color, -7, -30 - lift, 14, 17),
    ...armShapes(pose, color, lift, t),
  ];
  const hairParts = hairShapes(appearance.hairStyle, hair, headY, facing);
  if (facesViewer(facing)) {
    // Front: long hair falls behind the face; the rest of the hair sits on top of the head.
    const behind = appearance.hairStyle === 'long' ? hairParts.slice(0, 1) : [];
    shapes.push(...behind, ellipse('head', skin, 0, headY, 6, 6.5));
    shapes.push(
      ellipse('eye', EYE, -2.5 + dx, headY, 0.9, 1.1),
      ellipse('eye', EYE, 2 + dx, headY, 0.9, 1.1),
    );
    shapes.push(...hairParts.slice(behind.length));
  } else {
    // Back: the hair covers the head; an ear on the side the agent looks to tells N from W.
    shapes.push(ellipse('head', skin, 0, headY, 6, 6.5), ...hairParts);
    shapes.push(ellipse('head', skin, dx * 6, headY + 1, 1.3, 1.8));
  }
  shapes.push(...accessoryShapes(appearance.accessory, color, headY, facing));
  if (pose === 'coffee') shapes.push(rect('cup', CUP, dx > 0 ? 7 : -10, -36 - lift, 3, 4));
  return shapes;
}

/** Length of each pose's animation cycle in simulated ms (`coffee` is static). */
export const POSE_PERIOD_MS: Readonly<Record<Pose, number>> = {
  idle: 1200,
  walk: 500,
  type: 2 * Math.PI * 45,
  coffee: Infinity,
  celebrate: 500,
};

/** Animation frames are sampled every FRAME_MS of simulated time. */
export const FRAME_MS = 50;

/** Frame index of `t` within the pose cycle; the shapes of a frame are drawn at `index × FRAME_MS`. */
export function frameIndex(pose: Pose, t: number): number {
  const period = POSE_PERIOD_MS[pose];
  return Number.isFinite(period) ? Math.floor((t % period) / FRAME_MS) : 0;
}
