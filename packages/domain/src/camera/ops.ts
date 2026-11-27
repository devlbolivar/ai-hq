import type { Camera, OfficeLayout, Point, Viewport } from '../types';
import { initialCamera, officeCenter, screenToWorld, worldToScreen } from './core';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 1.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampOffset(cam: Camera, viewport: Viewport, layout: OfficeLayout): Camera {
  const center = officeCenter(layout);
  const projected = worldToScreen({ zoom: cam.zoom, offset: { x: 0, y: 0 } }, center);
  return {
    zoom: cam.zoom,
    offset: {
      x: clamp(cam.offset.x, -projected.x, viewport.width - projected.x),
      y: clamp(cam.offset.y, -projected.y, viewport.height - projected.y),
    },
  };
}

export function pan(cam: Camera, delta: Point, viewport: Viewport, layout: OfficeLayout): Camera {
  return clampOffset(
    { zoom: cam.zoom, offset: { x: cam.offset.x + delta.x, y: cam.offset.y + delta.y } },
    viewport,
    layout,
  );
}

export function zoomAt(
  cam: Camera,
  anchor: Point,
  factor: number,
  viewport: Viewport,
  layout: OfficeLayout,
): Camera {
  const world = screenToWorld(cam, anchor);
  const zoom = clamp(cam.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  return clampOffset(
    { zoom, offset: { x: anchor.x - world.x * zoom, y: anchor.y - world.y * zoom } },
    viewport,
    layout,
  );
}

export function recenter(viewport: Viewport, layout: OfficeLayout): Camera {
  return initialCamera(viewport, layout);
}
