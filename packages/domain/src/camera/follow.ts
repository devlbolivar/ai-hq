import type { Camera, OfficeLayout, Point, Viewport } from '../types';
import { pan } from './ops';

/** Same zoom, with `worldPoint` at the viewport center as far as the 001 limits allow (FR-028). */
export function centerOn(
  camera: Camera,
  worldPoint: Point,
  viewport: Viewport,
  layout: OfficeLayout,
): Camera {
  const wanted = {
    x: viewport.width / 2 - worldPoint.x * camera.zoom,
    y: viewport.height / 2 - worldPoint.y * camera.zoom,
  };
  const delta = { x: wanted.x - camera.offset.x, y: wanted.y - camera.offset.y };
  return pan(camera, delta, viewport, layout);
}
