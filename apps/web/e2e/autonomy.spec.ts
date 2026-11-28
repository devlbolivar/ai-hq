import { expect, test, type Page } from '@playwright/test';
import {
  ACCEPTANCE_SEED,
  isWalkable,
  marketingLayout,
  marketingTeam,
  walkability,
} from '@ai-hq/domain';
import {
  deskTileOf,
  openOffice,
  readAgents,
  readHookField,
  type AgentSnapshot,
} from './support/hook';

const walk = walkability(marketingLayout);

const desks = new Map(marketingTeam.map((a) => [a.id, deskTileOf(a.deskId)]));

/** On a walkable tile, or on the segment between two walkable 4-neighbours (FR-012). */
function onWalkablePath({ x, y }: { x: number; y: number }): boolean {
  const xs = Number.isInteger(x) ? [x] : [Math.floor(x), Math.ceil(x)];
  const ys = Number.isInteger(y) ? [y] : [Math.floor(y), Math.ceil(y)];
  if (xs.length > 1 && ys.length > 1) return false;
  return xs.every((tx) => ys.every((ty) => isWalkable(walk, { x: tx, y: ty })));
}

/** Away from its desk and still: it reached an activity or a wander tile. */
function arrivedElsewhere(agent: AgentSnapshot): boolean {
  const desk = desks.get(agent.id)!;
  const still = agent.status !== 'walking' && agent.position.x === agent.tile.x;
  const away = agent.tile.x !== desk.x || agent.tile.y !== desk.y;
  return still && away && agent.position.y === agent.tile.y;
}

async function snapshot(page: Page) {
  const [simTimeMs, agents, paused] = await Promise.all([
    readHookField(page, 'simTimeMs'),
    readAgents(page),
    readHookField(page, 'paused'),
  ]);
  return { simTimeMs, paused, positions: agents.map((a) => a.position) };
}

test.describe('US3 — el equipo trabaja por su cuenta (FR-008–FR-020)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page, { seed: ACCEPTANCE_SEED });
  });

  test('within 15 s an agent leaves its desk and arrives, always on walkable paths (US3-1, US3-2)', async ({
    page,
  }) => {
    test.setTimeout(30_000);
    expect(await readHookField(page, 'seed')).toBe(ACCEPTANCE_SEED);
    const start = Date.now();
    let arrived = false;
    while (!arrived && Date.now() - start < 15_000) {
      const agents = await readAgents(page);
      for (const agent of agents) {
        expect(
          onWalkablePath(agent.position),
          `${agent.id} at ${JSON.stringify(agent.position)}`,
        ).toBe(true);
      }
      arrived = agents.some(arrivedElsewhere);
      if (!arrived) await page.waitForTimeout(150);
    }
    expect(arrived).toBe(true);
  });

  test('Space freezes time and positions for 1 s and resumes from the same values (US3-8)', async ({
    page,
  }) => {
    // Let the team move a little first.
    await expect.poll(() => readHookField(page, 'simTimeMs')).toBeGreaterThan(1000);
    await page.keyboard.press('Space');
    await expect.poll(() => readHookField(page, 'paused')).toBe(true);
    await expect(page.getByRole('status', { name: 'Simulación en pausa' })).toBeVisible();

    const frozen = await snapshot(page);
    await page.waitForTimeout(1000);
    expect(await snapshot(page)).toEqual(frozen);

    await page.keyboard.press('Space');
    await expect.poll(() => readHookField(page, 'paused')).toBe(false);
    await expect(page.getByRole('status', { name: 'Simulación en pausa' })).toHaveCount(0);
    const resumedAt = Date.now();
    await expect.poll(() => readHookField(page, 'simTimeMs')).toBeGreaterThan(frozen.simTimeMs);
    // It continues from the frozen time: the 1 s pause was not skipped over.
    const after = await readHookField(page, 'simTimeMs');
    expect(after - frozen.simTimeMs).toBeLessThanOrEqual(Date.now() - resumedAt + 500);
  });
});
