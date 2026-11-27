import { expect, test, type Page } from '@playwright/test';
import { findPath, marketingLayout, walkability, type Coord } from '@ai-hq/domain';
import { gridToScreen, openOffice, readDebug, type DebugSnapshot } from './support/hook';

const entrance = marketingLayout.entrance;
/** Chair of desk-4, where its worker sits (quickstart 8). */
const desk4Chair: Coord = { x: 3, y: 9 };

function originOf(id: string): Coord {
  const obj = marketingLayout.objects.find((o) => o.id === id);
  if (!obj) throw new Error(`${id} missing from the layout`);
  return obj.origin;
}

const IDLE: DebugSnapshot = { enabled: false, from: null, to: null, result: null };

async function expectDebug(page: Page, expected: Partial<DebugSnapshot>): Promise<void> {
  await expect
    .poll(
      async () => {
        const debug = await readDebug(page);
        return Object.fromEntries(
          Object.keys(expected).map((k) => [k, debug[k as keyof DebugSnapshot]]),
        );
      },
      { timeout: 2000 },
    )
    .toEqual(expected);
}

async function clickTile(page: Page, tile: Coord): Promise<void> {
  const at = await gridToScreen(page, tile);
  await page.mouse.click(at.x, at.y);
}

/** The path notice; HoverLabel is also a `status`, so it is told apart by its text. */
const pathStatus = (page: Page) =>
  page.getByRole('status').filter({ hasText: /^(Ruta: \d+ pasos?|Sin ruta)$/ });

test.describe('US4 — modo depuración y rutas (FR-021, FR-023)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page);
  });

  test('G toggles debug mode and the switch reflects it', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: 'Modo depuración' });
    expect(await readDebug(page)).toEqual(IDLE);
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.keyboard.press('g');
    await expectDebug(page, { enabled: true });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('g');
    await expectDebug(page, { enabled: false });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('clicking the switch toggles debug mode without picking a tile', async ({ page }) => {
    await page.getByRole('switch', { name: 'Modo depuración' }).click();
    await expectDebug(page, { enabled: true, from: null });
  });

  test('clicks outside debug mode pick nothing', async ({ page }) => {
    await clickTile(page, entrance);
    await clickTile(page, desk4Chair);
    expect(await readDebug(page)).toEqual(IDLE);
    await expect(pathStatus(page)).toHaveCount(0);
  });

  test('entrance → chair of desk-4 shows the minimal route (quickstart 8)', async ({ page }) => {
    const expected = findPath(walkability(marketingLayout), entrance, desk4Chair);
    if (!expected.ok) throw new Error('the domain finds no route to the desk-4 chair');
    const steps = expected.path.length - 1;
    // Minimal: no route can be shorter than the Manhattan distance.
    expect(steps).toBe(Math.abs(entrance.x - desk4Chair.x) + Math.abs(entrance.y - desk4Chair.y));

    await page.keyboard.press('g');
    await expectDebug(page, { enabled: true });
    await clickTile(page, entrance);
    await expectDebug(page, { from: entrance, to: null, result: null });
    await expect(pathStatus(page)).toHaveCount(0);

    await clickTile(page, desk4Chair);
    await expectDebug(page, { from: entrance, to: desk4Chair, result: expected });
    await expect(pathStatus(page)).toHaveText(`Ruta: ${steps} pasos`);
  });

  test('a destination on a desk shows "Sin ruta" (quickstart 9)', async ({ page }) => {
    const desk = originOf('desk-1');
    await page.keyboard.press('g');
    await expectDebug(page, { enabled: true });
    await clickTile(page, entrance);
    await expectDebug(page, { from: entrance });
    await clickTile(page, desk);
    await expectDebug(page, { to: desk, result: { ok: false, reason: 'blocked' } });
    await expect(pathStatus(page)).toHaveText('Sin ruta');
  });

  test('a drag in debug mode pans without picking a tile', async ({ page }) => {
    await page.keyboard.press('g');
    await expectDebug(page, { enabled: true });
    const at = await gridToScreen(page, { x: 9, y: 6 });
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 60, at.y + 30, { steps: 5 });
    await page.mouse.up();
    await expectDebug(page, { from: null });
  });

  test('turning debug off clears the route and its notice (US4 escenario 6)', async ({ page }) => {
    await page.keyboard.press('g');
    await expectDebug(page, { enabled: true });
    await clickTile(page, entrance);
    await expectDebug(page, { from: entrance });
    await clickTile(page, desk4Chair);
    await expect(pathStatus(page)).toHaveCount(1);

    await page.keyboard.press('g');
    await expectDebug(page, IDLE);
    await expect(pathStatus(page)).toHaveCount(0);
  });
});
