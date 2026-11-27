import { expect, test, type Page } from '@playwright/test';
import {
  initialCamera,
  marketingLayout,
  screenToWorld,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
} from '@ai-hq/domain';
import {
  expectCameraClose,
  openOffice,
  readCamera,
  viewportOf,
  waitForCameraChange,
} from './support/hook';

async function hold(page: Page, key: string, ms = 300): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function pressTimes(page: Page, key: string, times: number): Promise<void> {
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

/**
 * Keys move the view, so the office content moves the opposite way:
 * Right/D → offset.x decreases, Down/S → offset.y decreases.
 */
const panKeys = [
  { keys: ['ArrowRight', 'd'], axis: 'x', sign: -1 },
  { keys: ['ArrowLeft', 'a'], axis: 'x', sign: 1 },
  { keys: ['ArrowDown', 's'], axis: 'y', sign: -1 },
  { keys: ['ArrowUp', 'w'], axis: 'y', sign: 1 },
] as const;

test.describe('US2 — navegar solo con teclado (FR-016a)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page);
  });

  for (const { keys, axis, sign } of panKeys) {
    for (const key of keys) {
      test(`holding "${key}" pans along ${axis}`, async ({ page }) => {
        const before = await readCamera(page);
        await hold(page, key);
        const after = await waitForCameraChange(page, before);
        const moved = (after.offset[axis] - before.offset[axis]) * sign;
        expect(moved).toBeGreaterThan(20);
        expect(after.zoom).toBe(before.zoom);
      });
    }
  }

  for (const key of ['+', '=']) {
    test(`"${key}" zooms in one step centered on the screen`, async ({ page }) => {
      const viewport = viewportOf(page);
      const center = { x: viewport.width / 2, y: viewport.height / 2 };
      const before = await readCamera(page);
      await page.keyboard.press(key);
      const after = await waitForCameraChange(page, before);
      expect(after.zoom).toBeCloseTo(before.zoom * ZOOM_STEP, 5);
      const anchorBefore = screenToWorld(before, center);
      const anchorAfter = screenToWorld(after, center);
      expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 3);
      expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 3);
    });
  }

  test('"+" and "-" stay within the zoom limits', async ({ page }) => {
    await pressTimes(page, '+', 20);
    await expect.poll(async () => (await readCamera(page)).zoom).toBeCloseTo(ZOOM_MAX, 5);
    await pressTimes(page, '-', 30);
    await expect.poll(async () => (await readCamera(page)).zoom).toBeCloseTo(ZOOM_MIN, 5);
  });

  test('"0" recenters the camera', async ({ page }) => {
    const viewport = viewportOf(page);
    await hold(page, 'ArrowRight');
    await pressTimes(page, '+', 3);
    await expect.poll(async () => (await readCamera(page)).zoom).not.toBe(1);
    await page.keyboard.press('0');
    await expect.poll(async () => (await readCamera(page)).zoom).toBe(1);
    expectCameraClose(await readCamera(page), initialCamera(viewport, marketingLayout));
  });

  test('shortcuts are ignored while a text field has focus', async ({ page }) => {
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.setAttribute('aria-label', 'campo de prueba');
      document.body.appendChild(input);
    });
    await page.getByRole('textbox', { name: 'campo de prueba' }).focus();
    const before = await readCamera(page);
    await hold(page, 'ArrowRight');
    await pressTimes(page, '+', 2);
    await page.keyboard.press('0');
    await page.waitForTimeout(200);
    expectCameraClose(await readCamera(page), before);
  });
});
