import { expect, type Page } from '@playwright/test';
import { CHARACTER_BODY } from '@ai-hq/domain';
import type {
  AgentStatus,
  Camera,
  Coord,
  Direction,
  Order,
  OrderResult,
  PathResult,
  Point,
  SceneHoverTarget,
  Viewport,
} from '@ai-hq/domain';

/** Debug-mode state exposed by the hook (US4). */
export interface DebugSnapshot {
  enabled: boolean;
  from: Coord | null;
  to: Coord | null;
  result: PathResult | null;
}

/** Subset of `window.__AIHQ__` (contracts/ui-contract.md) used by the e2e tests. */
/** One agent as published by the hook (contracts/ui-contract.md, feature 002). */
export interface AgentSnapshot {
  id: string;
  name: string;
  role: string;
  color: string;
  number: number;
  status: AgentStatus;
  tile: Coord;
  position: { x: number; y: number };
  facing: Direction;
  forced: boolean;
  reservation: string | null;
  celebrating: boolean;
}

export interface SelectionSnapshot {
  agentId: string | null;
  following: boolean;
}

interface SceneHook {
  ready: boolean;
  camera: Camera;
  hover: SceneHoverTarget;
  debug: DebugSnapshot;
  drawOrder: string[];
  sceneOrder: string[];
  seed: number;
  simTimeMs: number;
  paused: boolean;
  agents: AgentSnapshot[];
  selection: SelectionSnapshot;
  ringFor: string | null;
  editorOpen: boolean;
  gridToScreen(tile: Coord): Point;
  agentToScreen(id: string): Point;
  test: {
    order(agentId: string, order: Order): OrderResult;
    patrol(on: boolean): void;
  };
}

/** Plain JSON copy of a hook field (getters and frozen objects do not cross `evaluate` as-is). */
export function readHookField<K extends keyof SceneHook>(
  page: Page,
  key: K,
): Promise<SceneHook[K]> {
  return page.evaluate((k) => {
    const value = (window as unknown as { __AIHQ__: Record<string, unknown> }).__AIHQ__[k];
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }, key) as Promise<SceneHook[K]>;
}

export const readAgents = (page: Page) => readHookField(page, 'agents');
export const readSelection = (page: Page) => readHookField(page, 'selection');
export const readSceneOrder = (page: Page) => readHookField(page, 'sceneOrder');

export function agentToScreen(page: Page, id: string): Promise<Point> {
  return page.evaluate(
    (agentId) => (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__.agentToScreen(agentId),
    id,
  );
}

/** Sends an order through the hook (same path as the debug buttons). */
export function sendOrder(page: Page, agentId: string, order: Order): Promise<OrderResult> {
  return page.evaluate(
    ([id, o]) => (window as unknown as { __AIHQ__: SceneHook }).__AIHQ__.test.order(id, o),
    [agentId, order] as const,
  );
}

/**
 * A screen point on the lower half of a tile (between its center and its bottom vertex), below the
 * feet of an agent standing on it, so a click there still picks the floor (FR-026).
 */
export async function floorPointOf(page: Page, tile: Coord): Promise<Point> {
  const [center, below] = await Promise.all([
    gridToScreen(page, tile),
    gridToScreen(page, { x: tile.x + 1, y: tile.y + 1 }),
  ]);
  // The bottom vertex is halfway to the center of the tile diagonally below.
  return { x: center.x, y: center.y + ((below.y - center.y) / 2) * 0.6 };
}

export interface OpenOfficeOptions {
  /** `?seed=N` (FR-019). */
  seed?: number;
  /** `?paused=1`: agents stay on their desks, so fixed tiles are never covered by a walker. */
  paused?: boolean;
}

/**
 * Opens the app and waits until the scene has been drawn once. The 2 s load budget (SC-001) is
 * asserted by scene.spec.ts; here a slow start under parallel load must not fail camera tests.
 */
export async function openOffice(page: Page, options: OpenOfficeOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (options.seed !== undefined) params.set('seed', String(options.seed));
  if (options.paused) params.set('paused', '1');
  const query = params.toString();
  await page.goto(query ? `/?${query}` : '/', { waitUntil: 'commit' });
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

export function readHover(page: Page): Promise<SceneHoverTarget> {
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

/** Screen position of an agent's feet (where the follow camera centers, FR-028). */
export async function feetToScreen(page: Page, id: string): Promise<Point> {
  const [body, camera] = await Promise.all([agentToScreen(page, id), readCamera(page)]);
  return { x: body.x, y: body.y + (CHARACTER_BODY.height / 2) * camera.zoom };
}

/** Distance in px between an agent's feet and the viewport center. */
export async function offCenter(page: Page, id: string): Promise<number> {
  const feet = await feetToScreen(page, id);
  const { width, height } = viewportOf(page);
  return Math.hypot(feet.x - width / 2, feet.y - height / 2);
}
