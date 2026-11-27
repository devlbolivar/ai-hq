import { expect, type Page } from '@playwright/test';
import type { Camera, Coord, Point, Viewport } from '@ai-hq/domain';

/** Subset of `window.__AIHQ__` (contracts/ui-contract.md) used by the camera e2e tests. */
interface CameraHook {
  ready: boolean;
  camera: Camera;
  gridToScreen(tile: Coord): Point;
}

/** Opens the app and waits until the scene has been drawn once. */
export async function openOffice(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(
    () => (window as unknown as { __AIHQ__?: { ready: boolean } }).__AIHQ__?.ready === true,
    null,
    { timeout: 2000 },
  );
}

export function readCamera(page: Page): Promise<Camera> {
  return page.evaluate(() => {
    const { camera } = (window as unknown as { __AIHQ__: CameraHook }).__AIHQ__;
    return { offset: { ...camera.offset }, zoom: camera.zoom };
  });
}

export function gridToScreen(page: Page, tile: Coord): Promise<Point> {
  return page.evaluate(
    (t) => (window as unknown as { __AIHQ__: CameraHook }).__AIHQ__.gridToScreen(t),
    tile,
  );
}

export function viewportOf(page: Page): Viewport {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('viewport size unavailable');
  return viewport;
}

export function expectCameraClose(actual: Camera, expected: Camera): void {
  expect(actual.zoom).toBeCloseTo(expected.zoom, 3);
  expect(actual.offset.x).toBeCloseTo(expected.offset.x, 3);
  expect(actual.offset.y).toBeCloseTo(expected.offset.y, 3);
}

/** Polls the camera until it differs from `before` (input is applied asynchronously). */
export async function waitForCameraChange(page: Page, before: Camera): Promise<Camera> {
  await expect
    .poll(async () => JSON.stringify(await readCamera(page)), { timeout: 2000 })
    .not.toBe(JSON.stringify(before));
  return readCamera(page);
}
