import { expect, test, type Page } from '@playwright/test';
import {
  hitTest,
  marketingLayout,
  worldToGrid,
  worldToScreen,
  type HoverTarget,
  type Point,
} from '@ai-hq/domain';
import { gridToScreen, openOffice, readCamera, readHover } from './support/hook';

/** Inside the tall plant at (10,1), above the free floor tile (9,1) that it covers on screen. */
const plantOverFloor: Point = { x: 270, y: 180 };

async function expectHover(page: Page, expected: HoverTarget): Promise<void> {
  await expect.poll(() => readHover(page), { timeout: 2000 }).toEqual(expected);
}

test.describe('US3 — inspeccionar con el cursor (FR-017–FR-019)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page);
  });

  test('hovering free floor highlights that tile and shows no label', async ({ page }) => {
    const at = await gridToScreen(page, { x: 9, y: 6 });
    await page.mouse.move(at.x, at.y);
    await expectHover(page, { type: 'tile', tile: { x: 9, y: 6 } });
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('hovering the meeting table targets it and shows "Mesa de reuniones"', async ({ page }) => {
    const at = await gridToScreen(page, { x: 13, y: 3 });
    await page.mouse.move(at.x, at.y);
    await expectHover(page, { type: 'object', id: 'meeting-table' });
    await expect(page.getByRole('status')).toHaveText('Mesa de reuniones');
  });

  test('a plant drawn over a floor tile behind it wins the hover', async ({ page }) => {
    // Preconditions from the domain: the point lies on floor tile (9,1) but inside the plant.
    expect(worldToGrid(plantOverFloor, marketingLayout.grid, marketingLayout.tile)).toEqual({
      x: 9,
      y: 1,
    });
    expect(hitTest(plantOverFloor, marketingLayout)).toEqual({ type: 'object', id: 'plant-2' });

    const at = worldToScreen(await readCamera(page), plantOverFloor);
    await page.mouse.move(at.x, at.y);
    await expectHover(page, { type: 'object', id: 'plant-2' });
    await expect(page.getByRole('status')).toHaveText('Planta');
  });

  test('outside the office there is no hover and no label', async ({ page }) => {
    const table = await gridToScreen(page, { x: 13, y: 3 });
    await page.mouse.move(table.x, table.y);
    await expectHover(page, { type: 'object', id: 'meeting-table' });

    await page.mouse.move(10, 10);
    await expectHover(page, null);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('leaving the canvas clears the hover', async ({ page }) => {
    const table = await gridToScreen(page, { x: 13, y: 3 });
    await page.mouse.move(table.x, table.y);
    await expectHover(page, { type: 'object', id: 'meeting-table' });

    await page.dispatchEvent('main > div', 'pointerleave');
    await expectHover(page, null);
    await expect(page.getByRole('status')).toHaveCount(0);
  });
});
