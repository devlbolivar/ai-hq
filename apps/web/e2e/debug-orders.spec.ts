import { expect, test, type Page } from '@playwright/test';
import { ACCEPTANCE_SEED, IDLE_PAUSE_MS, marketingTeam } from '@ai-hq/domain';
import {
  offCenter,
  openOffice,
  readAgents,
  readHookField,
  readSelection,
  sendOrder,
  type AgentSnapshot,
} from './support/hook';

const ids = marketingTeam.map((a) => a.id);

async function agent(page: Page, id: string): Promise<AgentSnapshot> {
  return (await readAgents(page)).find((a) => a.id === id)!;
}

async function selectCard(page: Page, id: string) {
  const i = ids.indexOf(id);
  const profile = marketingTeam[i]!;
  await page.getByRole('button', { name: `${i + 1}. ${profile.name} — ${profile.role}` }).click();
  await expect.poll(async () => (await readSelection(page)).agentId).toBe(id);
}

const orders = (page: Page) => page.getByRole('group', { name: 'Órdenes de depuración' });

/**
 * Opens with debug mode on and the simulation just resumed: every agent is still idle at its
 * desk, so no meeting point or whiteboard is taken yet.
 */
async function openForOrders(page: Page) {
  await openOffice(page, { seed: ACCEPTANCE_SEED, paused: true });
  await page.keyboard.press('g');
  await expect.poll(async () => (await readHookField(page, 'debug')).enabled).toBe(true);
  await page.keyboard.press('Space');
  await expect.poll(() => readHookField(page, 'paused')).toBe(false);
}

test.describe('US5 — forzar estados (FR-034)', () => {
  test.beforeEach(async ({ page }) => {
    await openForOrders(page);
  });

  test('"Reunión" walks to a free meeting point; repeating it and 10 s change nothing (US5-1, US5-4, US5-6)', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await selectCard(page, 'copywriter');
    await orders(page).getByRole('button', { name: 'Reunión' }).click();
    await expect
      .poll(() => agent(page, 'copywriter'), { timeout: 15_000 })
      .toMatchObject({
        status: 'meeting',
        forced: true,
        reservation: expect.stringMatching(/^meeting-table#\d+$/),
      });

    const arrived = await agent(page, 'copywriter');
    await orders(page).getByRole('button', { name: 'Reunión' }).click();
    expect(await agent(page, 'copywriter')).toEqual(arrived);
    await expect(page.getByRole('status', { name: 'Sin sitio libre' })).toHaveCount(0);

    await page.waitForTimeout(10_000);
    expect(await agent(page, 'copywriter')).toEqual(arrived);
  });

  test('"Entregar a revisión" takes the whiteboard; a second agent gets "Sin sitio libre" (US5-2, US5-3)', async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await selectCard(page, 'scriptwriter');
    await orders(page).getByRole('button', { name: 'Entregar a revisión' }).click();
    await expect
      .poll(() => agent(page, 'scriptwriter'), { timeout: 15_000 })
      .toMatchObject({ status: 'waiting_review', forced: true, reservation: 'whiteboard#0' });

    await selectCard(page, 'designer');
    // Stopped first (it may be walking on its own): it then stays idle for its pause (≥ 3 s).
    await orders(page).getByRole('button', { name: 'Volver a idle' }).click();
    await expect.poll(() => agent(page, 'designer')).toMatchObject({ status: 'idle' });
    const before = await agent(page, 'designer');
    await orders(page).getByRole('button', { name: 'Entregar a revisión' }).click();
    await expect(page.getByRole('status', { name: 'Sin sitio libre' })).toBeVisible();
    await page.waitForTimeout(600);
    const after = await agent(page, 'designer');
    expect(after.forced).toBe(false);
    expect(after.reservation).toBe(before.reservation);
    expect(after.tile).toEqual(before.tile);
    expect(after.position).toEqual(before.position);
    expect(after.status).toBe('idle');
  });

  test('turning debug off cancels orders and autonomy comes back (US5-7)', async ({ page }) => {
    test.setTimeout(45_000);
    await selectCard(page, 'trend-scout');
    await orders(page).getByRole('button', { name: 'Trabajar' }).click();
    await expect
      .poll(() => agent(page, 'trend-scout'), { timeout: 15_000 })
      .toMatchObject({
        status: 'working',
        forced: true,
      });

    await page.keyboard.press('g');
    await expect.poll(async () => (await readHookField(page, 'debug')).enabled).toBe(false);
    await expect(orders(page)).toHaveCount(0);
    await expect
      .poll(() => agent(page, 'trend-scout'))
      .toMatchObject({ status: 'idle', forced: false });
    // Autonomy again: after its idle pause it does something on its own.
    await expect
      .poll(async () => (await agent(page, 'trend-scout')).status, {
        timeout: IDLE_PAUSE_MS[1] + 3000,
      })
      .not.toBe('idle');
    expect((await agent(page, 'trend-scout')).forced).toBe(false);
  });

  test('the camera keeps a walking selected agent centered (US2-6, FR-028)', async ({ page }) => {
    test.setTimeout(30_000);
    await selectCard(page, 'trend-scout');
    await expect
      .poll(() => offCenter(page, 'trend-scout'), { timeout: 1000 })
      .toBeLessThanOrEqual(2);

    expect(await sendOrder(page, 'trend-scout', { type: 'go-to', tile: { x: 14, y: 10 } })).toEqual(
      {
        ok: true,
        changed: true,
      },
    );
    let walkingSamples = 0;
    for (let i = 0; i < 40; i++) {
      const walker = await agent(page, 'trend-scout');
      if (walker.status === 'walking') walkingSamples += 1;
      expect(await offCenter(page, 'trend-scout')).toBeLessThanOrEqual(2);
      await page.waitForTimeout(100);
    }
    expect(walkingSamples).toBeGreaterThan(20);
    expect((await readSelection(page)).following).toBe(true);
  });
});
