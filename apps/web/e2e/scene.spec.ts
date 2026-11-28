import { expect, test, type Page } from '@playwright/test';
import { drawOrder, initialCamera, marketingLayout } from '@ai-hq/domain';

/** Read-only view of `window.__AIHQ__` (contracts/ui-contract.md) as seen from the test runner. */
interface HookSnapshot {
  ready: boolean;
  layoutId: string;
  drawOrder: string[];
  camera: { offset: { x: number; y: number }; zoom: number };
}

async function readHook(page: Page): Promise<HookSnapshot> {
  return page.evaluate(() => {
    const hook = (window as unknown as { __AIHQ__: HookSnapshot }).__AIHQ__;
    return {
      ready: hook.ready,
      layoutId: hook.layoutId,
      drawOrder: [...hook.drawOrder],
      camera: { offset: { ...hook.camera.offset }, zoom: hook.camera.zoom },
    };
  });
}

function luminance(cssColor: string): number {
  const [r = 255, g = 255, b = 255] = (cssColor.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test.describe('US1 — ver la oficina de Marketing (FR-001, FR-011, FR-012, SC-001)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(
      () => (window as unknown as { __AIHQ__?: { ready: boolean } }).__AIHQ__?.ready === true,
      null,
      { timeout: 2000 },
    );
  });

  test('draws the Marketing office in the domain draw order', async ({ page }) => {
    const hook = await readHook(page);
    expect(hook.ready).toBe(true);
    expect(hook.layoutId).toBe('marketing');
    const layoutIds = marketingLayout.objects.map((object) => object.id);
    expect(hook.drawOrder).toHaveLength(layoutIds.length);
    expect(new Set(hook.drawOrder)).toEqual(new Set(layoutIds));
    expect(hook.drawOrder).toEqual(drawOrder(marketingLayout));
  });

  test('starts at zoom 1 with the office centered in the viewport', async ({ page }) => {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('viewport size unavailable');
    const hook = await readHook(page);
    const expected = initialCamera(viewport, marketingLayout);
    expect(hook.camera.zoom).toBe(1);
    expect(hook.camera.offset.x).toBeCloseTo(expected.offset.x, 3);
    expect(hook.camera.offset.y).toBeCloseTo(expected.offset.y, 3);
  });

  test('renders a full-screen canvas on a dark page', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveCount(1);
    const box = await canvas.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.width).toBe(viewport?.width);
    expect(box?.height).toBe(viewport?.height);

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(luminance(background)).toBeLessThan(0.15);
  });
});
