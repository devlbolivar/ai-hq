import { expect, type Page } from '@playwright/test';
import type { Camera, Coord, HoverTarget, PathResult, Point, Viewport } from '@ai-hq/domain';

/** Debug-mode state exposed by the hook (US4). */
export interface DebugSnapshot {
  enabled: boolean;
  from: Coord | null;
  to: Coord | null;
  result: PathResult | null;
}

/** Subset of `window.__AIHQ__` (contracts/ui-contract.md) used by the e2e tests. */
interface SceneHook {
  ready: boolean;
  camera: Camera;
  hover: HoverTarget;
  debug: DebugSnapshot;
  gridToScreen(tile: Coord): Point;
}

/**
 * Opens the app and waits until the scene has been drawn once. The 2 s load budget (SC-001) is
 * asserted by scene.spec.ts; here a slow start under parallel load must not fail camera tests.
 */
export async function openOffice(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'commit' });
  await page.waitForFunction(
    () => (window as unknown as { __AIHQ__?: { ready: boolean } }).__AIHQ__?.ready === true,
    null,
    { timeout: 10_000 },
  );
}

export function readCamera(page: Page): Promise<Camera> {
  return page.evaluate(() => {
    const { camera } = (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__;
    return { offset: { ...camera.offset }, zoom: camera.zoom };
  });
}

export function readHover(page: Page): Promise<HoverTarget> {
  return page.evaluate(() => {
    const { hover } = (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__;
    return hover === null ? null : JSON.parse(JSON.stringify(hover));
  });
}

export function readDebug(page: Page): Promise<DebugSnapshot> {
  return page.evaluate(() => {
    const { debug } = (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__;
    return JSON.parse(JSON.stringify(debug)) as DebugSnapshot;
  });
}

export function gridToScreen(page: Page, tile: Coord): Promise<Point> {
  return page.evaluate(
    (t) => (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__.gridToScreen(t),
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
