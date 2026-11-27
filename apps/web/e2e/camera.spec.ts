import { expect, test, type Page } from '@playwright/test';
import {
  initialCamera,
  marketingLayout,
  officeCenter,
  worldToScreen,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type Point,
} from '@ai-hq/domain';
import {
  expectCameraClose,
  gridToScreen,
  openOffice,
  readCamera,
  viewportOf,
  waitForCameraChange,
} from './support/hook';

const desk1 = marketingLayout.objects.find((o) => o.id === 'desk-1');
if (!desk1) throw new Error('desk-1 missing from the Marketing layout');

async function drag(page: Page, from: Point, delta: Point, steps = 10): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps });
  await page.mouse.up();
}

/** One wheel notch at the current mouse position (negative = zoom in). */
async function wheelNotches(page: Page, notches: number): Promise<void> {
  for (let i = 0; i < Math.abs(notches); i++) {
    await page.mouse.wheel(0, notches < 0 ? -100 : 100);
  }
}

test.describe('US2 — navegar con ratón (FR-013–FR-016)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page);
  });

  test('dragging with the primary button pans the camera by the pointer delta', async ({
    page,
  }) => {
    const before = await readCamera(page);
    await drag(page, { x: 400, y: 300 }, { x: 120, y: 60 });
    const after = await waitForCameraChange(page, before);
    expect(after.zoom).toBe(before.zoom);
    expect(after.offset.x - before.offset.x).toBeCloseTo(120, 0);
    expect(after.offset.y - before.offset.y).toBeCloseTo(60, 0);
  });

  test('wheel zoom keeps desk-1 under the cursor', async ({ page }) => {
    const target = await gridToScreen(page, desk1.origin);
    await page.mouse.move(target.x, target.y);
    const before = await readCamera(page);
    await wheelNotches(page, -1);
    const after = await waitForCameraChange(page, before);
    expect(after.zoom).toBeCloseTo(before.zoom * ZOOM_STEP, 5);
    const stillUnder = await gridToScreen(page, desk1.origin);
    expect(stillUnder.x).toBeCloseTo(target.x, 1);
    expect(stillUnder.y).toBeCloseTo(target.y, 1);
  });

  test('zoom is clamped to [ZOOM_MIN, ZOOM_MAX]', async ({ page }) => {
    const viewport = viewportOf(page);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);

    await wheelNotches(page, -20);
    await expect.poll(async () => (await readCamera(page)).zoom).toBeCloseTo(ZOOM_MAX, 5);

    await wheelNotches(page, 30);
    await expect.poll(async () => (await readCamera(page)).zoom).toBeCloseTo(ZOOM_MIN, 5);
  });

  test('"Recentrar" restores the initial camera', async ({ page }) => {
    const viewport = viewportOf(page);
    await drag(page, { x: 500, y: 400 }, { x: -150, y: 90 });
    await page.mouse.move(300, 300);
    await wheelNotches(page, -3);
    await expect.poll(async () => (await readCamera(page)).zoom).not.toBe(1);

    await page.getByRole('button', { name: 'Recentrar' }).click();
    await expect.poll(async () => (await readCamera(page)).zoom, { timeout: 2000 }).toBe(1);
    expectCameraClose(await readCamera(page), initialCamera(viewport, marketingLayout));
  });

  test('dragging far keeps the office center inside the viewport', async ({ page }) => {
    const viewport = viewportOf(page);
    const before = await readCamera(page);
    await drag(page, { x: 100, y: 100 }, { x: 4000, y: 3000 }, 20);
    const after = await waitForCameraChange(page, before);
    const center = worldToScreen(after, officeCenter(marketingLayout));
    expect(center.x).toBeGreaterThanOrEqual(0);
    expect(center.x).toBeLessThanOrEqual(viewport.width);
    expect(center.y).toBeGreaterThanOrEqual(0);
    expect(center.y).toBeLessThanOrEqual(viewport.height);
  });

  test('a drag that starts on the "Recentrar" button does not pan', async ({ page }) => {
    const box = await page.getByRole('button', { name: 'Recentrar' }).boundingBox();
    if (!box) throw new Error('"Recentrar" button not visible');
    const before = await readCamera(page);
    await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: -200, y: 150 });
    // Give any (wrong) pan a chance to land before asserting nothing moved.
    await page.waitForTimeout(200);
    expectCameraClose(await readCamera(page), before);
  });
});
