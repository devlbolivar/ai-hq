import { worldToGrid } from '../iso';
import type { Camera, Coord, OfficeLayout, Point, Viewport } from '../types';

/** World-space center of the floor diamond. */
export function officeCenter(layout: OfficeLayout): Point {
  const { cols, rows } = layout.grid;
  const { width, height } = layout.tile;
  return {
    x: ((cols - rows) * width) / 4,
    y: ((cols + rows) * height) / 4,
  };
}

/** Camera at zoom 1 with the office centered in the viewport. */
export function initialCamera(viewport: Viewport, layout: OfficeLayout): Camera {
  const center = officeCenter(layout);
  return {
    offset: { x: viewport.width / 2 - center.x, y: viewport.height / 2 - center.y },
    zoom: 1,
  };
}

export function worldToScreen(cam: Camera, p: Point): Point {
  return { x: p.x * cam.zoom + cam.offset.x, y: p.y * cam.zoom + cam.offset.y };
}

export function screenToWorld(cam: Camera, p: Point): Point {
  return { x: (p.x - cam.offset.x) / cam.zoom, y: (p.y - cam.offset.y) / cam.zoom };
}

export function screenToGrid(cam: Camera, p: Point, layout: OfficeLayout): Coord | null {
  return worldToGrid(screenToWorld(cam, p), layout.grid, layout.tile);
}
