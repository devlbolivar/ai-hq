import { Container, Graphics, Matrix } from 'pixi.js';
import {
  gridToWorld,
  type OfficeObject,
  type Point,
  type SocialNetwork,
  type TileSize,
} from '@ai-hq/domain';
import { kindColors, networkStyles, shade, theme, type NetworkIconId } from './palette';

/** Axis-aligned box in fractional grid units: x ∈ [x0, x1], y ∈ [y0, y1]. */
interface GridBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Thickness of the back walls, as a fraction of a tile. */
const WALL_DEPTH = 0.22;
const FACE_LEFT = 0.78;
const FACE_RIGHT = 0.6;

const flat = (points: readonly Point[]): number[] => points.flatMap((p) => [p.x, p.y]);
const up = (p: Point, h: number): Point => ({ x: p.x, y: p.y - h });

/** Footprint of `obj` shrunk by `inset` tiles on every side. */
function footprintBox(obj: OfficeObject, inset = 0): GridBox {
  const { origin, size } = obj;
  return {
    x0: origin.x + inset,
    y0: origin.y + inset,
    x1: origin.x + size.w - inset,
    y1: origin.y + size.h - inset,
  };
}

/**
 * Draws an isometric prism: base at elevation `z`, `height` px tall. Only the three faces the
 * camera can see are drawn (top, left = +y side, right = +x side).
 */
function prism(
  g: Graphics,
  box: GridBox,
  z: number,
  height: number,
  color: number,
  tile: TileSize,
): void {
  const at = (x: number, y: number) => up(gridToWorld({ x, y }, tile), z);
  const top = at(box.x0, box.y0);
  const right = at(box.x1, box.y0);
  const bottom = at(box.x1, box.y1);
  const left = at(box.x0, box.y1);
  g.poly(flat([left, bottom, up(bottom, height), up(left, height)])).fill(shade(color, FACE_LEFT));
  g.poly(flat([bottom, right, up(right, height), up(bottom, height)])).fill(
    shade(color, FACE_RIGHT),
  );
  g.poly(flat([top, right, bottom, left].map((p) => up(p, height)))).fill(color);
}

/** Wall-mounted objects live on row y=0 (back-right wall) and/or column x=0 (back-left wall). */
function wallSlabs(obj: OfficeObject): GridBox[] {
  const box = footprintBox(obj);
  const slabs: GridBox[] = [];
  if (obj.origin.y === 0) slabs.push({ ...box, y1: box.y0 + WALL_DEPTH });
  if (obj.origin.x === 0) slabs.push({ ...box, x1: box.x0 + WALL_DEPTH });
  return slabs;
}

/**
 * Local 2D frame on the visible front face of a back wall: `x` runs along the wall from left to
 * right as seen on screen (one tile = `tile.width` px), `y` goes down from the top of the wall.
 */
function wallFaceFrame(obj: OfficeObject, height: number, tile: TileSize): Container {
  const frame = new Container();
  const { origin, size } = obj;
  const onBackRight = origin.y === 0;
  const start = onBackRight
    ? gridToWorld({ x: origin.x, y: WALL_DEPTH }, tile)
    : gridToWorld({ x: WALL_DEPTH, y: origin.y + size.h }, tile);
  const ax = tile.width / 2 / tile.width;
  const ay = tile.height / 2 / tile.width;
  frame.setFromMatrix(
    onBackRight
      ? new Matrix(ax, ay, 0, 1, start.x, start.y - height)
      : new Matrix(ax, -ay, 0, 1, start.x, start.y - height),
  );
  return frame;
}

function drawIcon(
  g: Graphics,
  icon: NetworkIconId,
  cx: number,
  cy: number,
  s: number,
  color: number,
) {
  switch (icon) {
    case 'aperture':
      g.circle(cx, cy, s).stroke({ color, width: 2.5 });
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.moveTo(cx + Math.cos(a) * s * 0.35, cy + Math.sin(a) * s * 0.35)
          .lineTo(cx + Math.cos(a + 0.9) * s, cy + Math.sin(a + 0.9) * s)
          .stroke({ color, width: 1.5 });
      }
      break;
    case 'note':
      g.circle(cx - s * 0.35, cy + s * 0.55, s * 0.35).fill(color);
      g.rect(cx - s * 0.08, cy - s, s * 0.18, s * 1.55).fill(color);
      g.poly([cx + s * 0.1, cy - s, cx + s * 0.8, cy - s * 0.55, cx + s * 0.1, cy - s * 0.35]).fill(
        color,
      );
      break;
    case 'play':
      g.poly([cx - s * 0.6, cy - s * 0.8, cx + s * 0.85, cy, cx - s * 0.6, cy + s * 0.8]).fill(
        color,
      );
      break;
    case 'nodes': {
      const pts = [
        [cx - s * 0.75, cy + s * 0.55],
        [cx, cy - s * 0.7],
        [cx + s * 0.75, cy + s * 0.55],
      ] as const;
      g.poly(pts.flat(), true).stroke({ color, width: 1.5 });
      for (const [x, y] of pts) g.circle(x, y, s * 0.28).fill(color);
      break;
    }
    case 'spark': {
      const pts: number[] = [];
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? s : s * 0.3;
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.poly(pts).fill(color);
      break;
    }
  }
}

function drawWallSegment(g: Graphics, obj: OfficeObject, tile: TileSize): void {
  for (const slab of wallSlabs(obj)) prism(g, slab, 0, obj.height, theme.wall, tile);
}

function drawScreen(root: Container, obj: OfficeObject, network: SocialNetwork, tile: TileSize) {
  const g = new Graphics();
  drawWallSegment(g, obj, tile);
  root.addChild(g);

  const { color, icon } = networkStyles[network];
  const face = wallFaceFrame(obj, obj.height, tile);
  const panel = new Graphics();
  const w = tile.width;
  panel
    .roundRect(w * 0.1, 18, w * 0.8, 44, 3)
    .fill(theme.screenBody)
    .stroke({ color, width: 2 });
  drawIcon(panel, icon, w / 2, 40, 11, color);
  face.addChild(panel);
  root.addChild(face);
}

function drawWhiteboard(root: Container, obj: OfficeObject, tile: TileSize) {
  const g = new Graphics();
  drawWallSegment(g, obj, tile);
  root.addChild(g);

  const face = wallFaceFrame(obj, obj.height, tile);
  const board = new Graphics();
  const length = tile.width * obj.size.h;
  board
    .rect(8, 22, length - 16, 46)
    .fill(theme.whiteboardFace)
    .stroke({ color: kindColors.whiteboard, width: 3 });
  const notes = [0xf2c94c, 0x6fcf97, 0x56ccf2, 0xeb5757, 0xbb6bd9, 0xf2994a];
  notes.forEach((note, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    board.rect(18 + col * ((length - 40) / 3), 28 + row * 19, 16, 13).fill(note);
  });
  face.addChild(board);
  root.addChild(face);
}

function drawChair(g: Graphics, obj: OfficeObject, tile: TileSize) {
  const color = kindColors.chair;
  const b = footprintBox(obj, 0.3);
  prism(g, b, 0, 14, color, tile);
  // Backrest on the south (+y) side: the person sits facing N, towards the desk.
  prism(g, { ...b, y0: b.y1 - 0.08 }, 14, obj.height - 14, shade(color, 1.15), tile);
}

function drawMonitor(g: Graphics, obj: OfficeObject, tile: TileSize) {
  const color = kindColors.monitor;
  const { origin } = obj;
  const cx = origin.x + 0.5;
  prism(
    g,
    { x0: cx - 0.06, y0: origin.y + 0.4, x1: cx + 0.06, y1: origin.y + 0.46 },
    obj.z,
    6,
    color,
    tile,
  );
  // Screen panel facing the chair (south).
  const panel = {
    x0: origin.x + 0.18,
    y0: origin.y + 0.38,
    x1: origin.x + 0.82,
    y1: origin.y + 0.44,
  };
  prism(g, panel, obj.z + 6, obj.height - 6, color, tile);
  const at = (x: number, y: number, h: number) => up(gridToWorld({ x, y }, tile), obj.z + h);
  g.poly(
    flat([
      at(panel.x0 + 0.04, panel.y1, 8),
      at(panel.x1 - 0.04, panel.y1, 8),
      at(panel.x1 - 0.04, panel.y1, obj.height - 2),
      at(panel.x0 + 0.04, panel.y1, obj.height - 2),
    ]),
  ).fill(0x4f7ad8);
}

function drawPlant(g: Graphics, obj: OfficeObject, tile: TileSize) {
  prism(g, footprintBox(obj, 0.3), 0, 16, 0xa0603e, tile);
  const center = gridToWorld({ x: obj.origin.x + 0.5, y: obj.origin.y + 0.5 }, tile);
  const leaf = kindColors.plant;
  g.ellipse(center.x, center.y - 24, 16, 12).fill(shade(leaf, 0.8));
  g.ellipse(center.x - 5, center.y - 34, 12, 10).fill(leaf);
  g.ellipse(center.x + 6, center.y - 40, 9, 8).fill(shade(leaf, 1.2));
}

function drawSofa(g: Graphics, obj: OfficeObject, tile: TileSize) {
  const color = kindColors.sofa;
  const b = footprintBox(obj, 0.08);
  prism(g, { ...b, y0: b.y0 + 0.15 }, 0, 12, color, tile);
  // Facing N: backrest on the south side, armrests at both ends.
  prism(g, { ...b, x0: b.x0, x1: b.x0 + 0.15, y0: b.y0 + 0.15 }, 12, 6, shade(color, 1.1), tile);
  prism(g, { ...b, x0: b.x1 - 0.15, y0: b.y0 + 0.15 }, 12, 6, shade(color, 1.1), tile);
  prism(g, { ...b, y0: b.y1 - 0.2 }, 12, obj.height - 12, shade(color, 1.15), tile);
}

function drawTable(g: Graphics, obj: OfficeObject, tile: TileSize) {
  const color = kindColors['meeting-table'];
  const b = footprintBox(obj, 0.12);
  const leg = 0.15;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  prism(
    g,
    { x0: cx - leg, y0: cy - leg, x1: cx + leg, y1: cy + leg },
    0,
    obj.height - 5,
    shade(color, 0.7),
    tile,
  );
  prism(g, b, obj.height - 5, 5, color, tile);
}

function drawCoffeeMachine(g: Graphics, obj: OfficeObject, tile: TileSize) {
  const color = kindColors['coffee-machine'];
  const b = footprintBox(obj, 0.2);
  prism(g, b, 0, obj.height, color, tile);
  prism(
    g,
    { x0: b.x0 + 0.1, y0: b.y0 + 0.1, x1: b.x1 - 0.1, y1: b.y1 - 0.1 },
    obj.height,
    4,
    0x3a3f4d,
    tile,
  );
  const light = up(gridToWorld({ x: b.x1, y: b.y1 - 0.3 }, tile), obj.height * 0.7);
  g.circle(light.x - 3, light.y, 2.5).fill(0xeb5757);
}

/**
 * Display object for one layout object, drawn by code in world coordinates (FR-010). Each kind
 * reads only its own data (FR-004): moving or adding objects needs no change here.
 */
export function drawObject(obj: OfficeObject, tile: TileSize): Container {
  const root = new Container({ label: obj.id });
  if (obj.kind === 'screen' && obj.network) {
    drawScreen(root, obj, obj.network, tile);
    return root;
  }
  if (obj.kind === 'whiteboard') {
    drawWhiteboard(root, obj, tile);
    return root;
  }

  const g = new Graphics();
  switch (obj.kind) {
    case 'wall':
    case 'screen':
      drawWallSegment(g, obj, tile);
      break;
    case 'desk':
      prism(g, footprintBox(obj, 0.08), 0, obj.height, kindColors.desk, tile);
      break;
    case 'chair':
      drawChair(g, obj, tile);
      break;
    case 'monitor':
      drawMonitor(g, obj, tile);
      break;
    case 'plant':
      drawPlant(g, obj, tile);
      break;
    case 'sofa':
      drawSofa(g, obj, tile);
      break;
    case 'meeting-table':
      drawTable(g, obj, tile);
      break;
    case 'coffee-machine':
      drawCoffeeMachine(g, obj, tile);
      break;
  }
  root.addChild(g);
  return root;
}
