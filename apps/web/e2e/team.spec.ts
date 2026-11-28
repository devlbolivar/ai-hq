import { expect, test, type Page } from '@playwright/test';
import { marketingLayout, marketingTeam } from '@ai-hq/domain';
import { agentToScreen, openOffice, readAgents, readHover, readSceneOrder } from './support/hook';

/** Tile where the owner of `deskId` works (its desk use point). */
function deskTile(deskId: string) {
  const desk = marketingLayout.objects.find((o) => o.id === deskId);
  const point = desk?.usePoints[0];
  if (!point) throw new Error(`${deskId} has no use point`);
  return point.tile;
}

const cards = (page: Page) => page.getByRole('region', { name: 'Equipo' }).getByRole('listitem');

test.describe('US1 — ver a mi equipo en la oficina (FR-007, FR-023, FR-033, SC-001)', () => {
  test('the scene with the 6 agents is ready in under 2 s (SC-001)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(
      () => {
        const hook = (window as unknown as { __AIHQ__?: { ready: boolean; agents: unknown[] } })
          .__AIHQ__;
        return hook?.ready === true && hook.agents.length === 6;
      },
      null,
      { timeout: 2000 },
    );
  });

  test.describe('at the start (paused)', () => {
    test.beforeEach(async ({ page }) => {
      await openOffice(page, { paused: true });
    });

    test('6 agents start idle on the use points of their desks (US1-1)', async ({ page }) => {
      const agents = await readAgents(page);
      expect(agents.map((a) => a.id)).toEqual(marketingTeam.map((a) => a.id));
      agents.forEach((agent, i) => {
        const profile = marketingTeam[i]!;
        expect(agent.status).toBe('idle');
        expect(agent.number).toBe(i + 1);
        expect(agent.tile).toEqual(deskTile(profile.deskId));
        expect(agent.position).toEqual(deskTile(profile.deskId));
      });
      expect(new Set(agents.map((a) => a.tile.x * 100 + a.tile.y)).size).toBe(6);
    });

    test('each agent has a distinct color that matches its card (US1-2)', async ({ page }) => {
      const agents = await readAgents(page);
      expect(new Set(agents.map((a) => a.color)).size).toBe(6);
      const swatches = page.getByRole('region', { name: 'Equipo' }).locator('[data-color]');
      await expect(swatches).toHaveCount(6);
      for (const [i, agent] of agents.entries()) {
        await expect(swatches.nth(i)).toHaveAttribute('data-color', agent.color);
      }
    });

    test('the agent on chair-1 is drawn after chair-1 and before desk-4 (US1-3)', async ({
      page,
    }) => {
      const order = await readSceneOrder(page);
      const agent = order.indexOf('agent:head-of-marketing');
      expect(agent).toBeGreaterThan(order.indexOf('chair-1'));
      expect(agent).toBeLessThan(order.indexOf('desk-4'));
      for (const profile of marketingTeam) expect(order).toContain(`agent:${profile.id}`);
    });

    test('6 cards in team order with number, name, role, color and status (US1-4)', async ({
      page,
    }) => {
      await expect(cards(page)).toHaveCount(6);
      for (const [i, profile] of marketingTeam.entries()) {
        const card = cards(page).nth(i);
        await expect(card).toContainText(String(i + 1));
        await expect(card).toContainText(profile.name);
        await expect(card).toContainText(profile.role);
        await expect(card).toContainText('Desocupado');
        await expect(card.locator('[data-color]')).toHaveAttribute('data-color', profile.color);
      }
    });

    test('hovering a character shows its name (US1-6)', async ({ page }) => {
      const at = await agentToScreen(page, 'head-of-marketing');
      await page.mouse.move(at.x, at.y);
      await expect
        .poll(() => readHover(page), { timeout: 2000 })
        .toEqual({ type: 'agent', id: 'head-of-marketing' });
      await expect(page.getByRole('status', { name: 'Head of Marketing' })).toBeVisible();
    });
  });
});
