import { expect, test, type Page } from '@playwright/test';
import { openOffice, viewportOf } from './support/hook';

/** SC-003 smoke (research R10): headless is noisy, so the bar is 50 fps instead of 60. */
const MIN_FPS = 50;
const INTERACTION_MS = 5000;
/** `window.__AIHQ__.fps` counts the frames of the last second, so skip the first one. */
const WARM_UP_MS = 1000;
const SAMPLE_EVERY_MS = 250;

function readFps(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __AIHQ__: { fps: number } }).__AIHQ__.fps);
}

/** One round of the three interactions: a short drag, a wheel zoom in/out and a hover sweep. */
async function interact(page: Page, round: number): Promise<void> {
  const { width, height } = viewportOf(page);
  const cx = width / 2;
  const cy = height / 2;
  const dir = round % 2 === 0 ? 1 : -1;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80 * dir, cy + 40 * dir, { steps: 8 });
  await page.mouse.up();

  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, 100);

  await page.mouse.move(cx - 200, cy - 100);
  await page.mouse.move(cx + 200, cy + 100, { steps: 8 });
}

test.describe('SC-003 — rendimiento (smoke headless)', () => {
  test(`5 s of pan, zoom and hover keep the frame rate at ${MIN_FPS} fps or more`, async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await openOffice(page);

    const samples: number[] = [];
    const start = Date.now();
    let lastSample = start;
    for (let round = 0; Date.now() - start < INTERACTION_MS; round++) {
      await interact(page, round);
      const now = Date.now();
      if (now - start >= WARM_UP_MS && now - lastSample >= SAMPLE_EVERY_MS) {
        samples.push(await readFps(page));
        lastSample = now;
      }
    }

    console.log('fps samples', samples.join(', '));
    test.info().annotations.push({ type: 'fps', description: samples.join(', ') });
    expect(samples.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(MIN_FPS);
  });
});
