import { Container, Graphics, GraphicsContext } from 'pixi.js';
import {
  positionToWorld,
  type Appearance,
  type Direction,
  type GridPosition,
  type TileSize,
} from '@ai-hq/domain';
import { characterShapes, frameIndex, FRAME_MS, type CharacterShape, type Pose } from './shapes';

/** What the renderer needs to draw one agent this frame. */
export interface CharacterLook {
  readonly appearance: Appearance;
  readonly color: number;
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly pose: Pose;
  /** Sitting on a chair or the sofa. */
  readonly seated?: boolean;
  /** Simulated time in ms (frozen while paused). */
  readonly t: number;
}

export interface CharacterView {
  readonly root: Container;
  /** Selection ring, under the figure (FR-027). */
  readonly ring: Graphics;
  readonly figure: Graphics;
  /** Drawn animation frames, keyed by facing, pose and frame index. */
  readonly frames: Map<string, GraphicsContext>;
  looksKey: string;
}

function drawShapes(shapes: readonly CharacterShape[]): GraphicsContext {
  const ctx = new GraphicsContext();
  for (const s of shapes) {
    if (s.kind === 'ellipse') ctx.ellipse(s.x, s.y, s.rx, s.ry);
    else if (s.kind === 'rect') ctx.roundRect(s.x, s.y, s.w, s.h, Math.min(1.5, s.w / 2, s.h / 2));
    else ctx.poly([...s.points]);
    ctx.fill(s.fill);
  }
  return ctx;
}

export function createCharacterView(id: string): CharacterView {
  const root = new Container({ label: `agent:${id}` });
  const ring = new Graphics({ label: 'ring', visible: false });
  const figure = new Graphics({ label: 'figure' });
  root.addChild(ring, figure);
  return { root, ring, figure, frames: new Map(), looksKey: '' };
}

/**
 * Places the view and shows the right animation frame (research R11). Frames are drawn once and
 * cached, so animating only swaps the figure's context instead of rebuilding geometry every frame.
 */
export function updateCharacterView(
  view: CharacterView,
  look: CharacterLook,
  tile: TileSize,
): void {
  const world = positionToWorld(look.position, tile);
  view.root.position.set(world.x, world.y);

  const looksKey = `${look.color}|${look.appearance.skinTone}|${look.appearance.hairStyle}|${look.appearance.hairColor}|${look.appearance.accessory}`;
  let stale: GraphicsContext[] = [];
  if (looksKey !== view.looksKey) {
    stale = [...view.frames.values()];
    view.frames.clear();
    view.looksKey = looksKey;
  }

  const index = frameIndex(look.pose, look.t);
  const seated = look.seated ?? false;
  const key = `${look.facing}|${look.pose}|${seated}|${index}`;
  let ctx = view.frames.get(key);
  if (!ctx) {
    const shapes = characterShapes(
      look.appearance,
      look.color,
      look.facing,
      look.pose,
      index * FRAME_MS,
      seated,
    );
    ctx = drawShapes(shapes);
    view.frames.set(key, ctx);
  }
  if (view.figure.context !== ctx) view.figure.context = ctx;
  // Destroyed only after the figure stopped using them.
  for (const old of stale) old.destroy();
}
