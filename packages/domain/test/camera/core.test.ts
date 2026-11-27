import { describe, expect, it } from 'vitest';
import {
  initialCamera,
  officeCenter,
  screenToGrid,
  screenToWorld,
  worldToScreen,
} from '../../src/camera/core';
import { tileCenter } from '../../src/iso';
import type { Camera } from '../../src/types';
import { makeLayout } from '../fixtures/layouts';

const layout = makeLayout();
const viewport = { width: 1280, height: 800 };

describe('officeCenter', () => {
  it('is the world center of the floor diamond', () => {
    expect(officeCenter(layout)).toEqual({ x: 64, y: 224 });
  });
});

describe('initialCamera', () => {
  it('uses zoom 1 (data-model.md Camera.zoom)', () => {
    expect(initialCamera(viewport, layout).zoom).toBe(1);
  });

  it('places the office center at the viewport center (data-model.md Camera.offset)', () => {
    const cam = initialCamera(viewport, layout);
    expect(worldToScreen(cam, officeCenter(layout))).toEqual({ x: 640, y: 400 });
  });
});

describe('screenToWorld / worldToScreen', () => {
  const cam: Camera = { offset: { x: 120, y: -45 }, zoom: 1.6 };

  it('applies screen = world * zoom + offset', () => {
    expect(worldToScreen(cam, { x: 10, y: 20 })).toEqual({ x: 136, y: -13 });
  });

  it('are inverses of each other', () => {
    const p = { x: 333.25, y: -71.5 };
    const back = screenToWorld(cam, worldToScreen(cam, p));
    expect(back.x).toBeCloseTo(p.x, 9);
    expect(back.y).toBeCloseTo(p.y, 9);
  });
});

describe('screenToGrid', () => {
  it('returns null outside the grid (FR-003)', () => {
    const cam = initialCamera(viewport, layout);
    expect(screenToGrid(cam, { x: 0, y: 0 }, layout)).toBeNull();
    expect(screenToGrid(cam, { x: 1279, y: 799 }, layout)).toBeNull();
  });

  it('accounts for camera offset and zoom (FR-003)', () => {
    const cam: Camera = { offset: { x: 500, y: 100 }, zoom: 2 };
    const t = { x: 4, y: 7 };
    expect(screenToGrid(cam, worldToScreen(cam, tileCenter(t)), layout)).toEqual(t);
  });

  it('round-trips every tile center at every allowed zoom level (SC-002)', () => {
    const zooms = [0.5, 0.75, 1, 1.1, 1.21, 1.331, 1.5, 1.9487171, 2];
    for (let k = -7; k <= 7; k++) zooms.push(Math.min(2, Math.max(0.5, 1.1 ** k)));
    for (const zoom of zooms) {
      const cam: Camera = { offset: { x: 613.37, y: 97.91 }, zoom };
      for (let y = 0; y < 12; y++) {
        for (let x = 0; x < 16; x++) {
          const s = worldToScreen(cam, tileCenter({ x, y }));
          expect(screenToGrid(cam, s, layout)).toEqual({ x, y });
        }
      }
    }
  });
});
