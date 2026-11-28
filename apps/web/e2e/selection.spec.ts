import { expect, test, type Page } from '@playwright/test';
import { marketingLayout, marketingTeam } from '@ai-hq/domain';
import {
  agentToScreen,
  floorPointOf,
  offCenter,
  openOffice,
  readDebug,
  readHookField,
  readSelection,
  viewportOf,
} from './support/hook';

const ids = marketingTeam.map((a) => a.id);

function cardName(i: number): string {
  const agent = marketingTeam[i]!;
  return `${i + 1}. ${agent.name} — ${agent.role}`;
}

const card = (page: Page, i: number) =>
  page.getByRole('button', { name: cardName(i), exact: true });

/** Selection, ring and card all point at `id` (or at nobody). */
async function expectSelected(page: Page, id: string | null, following = id !== null) {
  await expect
    .poll(() => readSelection(page), { timeout: 2000 })
    .toEqual({
      agentId: id,
      following,
    });
  expect(await readHookField(page, 'ringFor')).toBe(id);
  const pressed = page
    .getByRole('region', { name: 'Equipo' })
    .getByRole('button', { pressed: true });
  if (id === null) await expect(pressed).toHaveCount(0);
  else await expect(pressed).toHaveAccessibleName(cardName(ids.indexOf(id)));
}

/** SC-004: the selected agent ends centered (≤ 2 px) in under 1 s. */
async function expectCentered(page: Page, id: string) {
  await expect
    .poll(() => offCenter(page, id), { timeout: 1000, intervals: [50] })
    .toBeLessThanOrEqual(2);
}

/** A free spot of the canvas away from panels and characters. */
async function clickFloor(page: Page) {
  const at = await floorPointOf(page, { x: 9, y: 6 });
  await page.mouse.click(at.x, at.y);
}

test.describe('US2 — seleccionar y seguir a un agente (FR-026–FR-029, SC-004)', () => {
  test.beforeEach(async ({ page }) => {
    // Paused: agents stay on their desks; the follow camera still moves (frame time).
    await openOffice(page, { paused: true });
  });

  test('a click on a character selects it and centers it (US2-1)', async ({ page }) => {
    const at = await agentToScreen(page, 'copywriter');
    await page.mouse.click(at.x, at.y);
    await expectSelected(page, 'copywriter');
    await expectCentered(page, 'copywriter');
  });

  test('a card click moves the selection to that agent (US2-2)', async ({ page }) => {
    await card(page, 0).click();
    await expectSelected(page, ids[0]!);
    await expectCentered(page, ids[0]!);
    await card(page, 4).click();
    await expectSelected(page, ids[4]!);
    await expectCentered(page, ids[4]!);
  });

  test('number keys, Tab, Shift+Tab and Esc (US2-3…US2-5)', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expectSelected(page, ids[0]!);

    await page.keyboard.press('3');
    await expectSelected(page, ids[2]!);
    await expectCentered(page, ids[2]!);
    await page.keyboard.press('7');
    await page.waitForTimeout(100);
    await expectSelected(page, ids[2]!);

    await page.keyboard.press('6');
    await expectSelected(page, ids[5]!);
    await page.keyboard.press('Tab');
    await expectSelected(page, ids[0]!);
    await expectCentered(page, ids[0]!);
    await page.keyboard.press('Shift+Tab');
    await expectSelected(page, ids[5]!);
    await expectCentered(page, ids[5]!);

    await page.keyboard.press('Escape');
    await expectSelected(page, null);
  });

  test('drag, zoom and Recentrar stop following; selecting again resumes (US2-7)', async ({
    page,
  }) => {
    await page.keyboard.press('2');
    await expectCentered(page, ids[1]!);
    const { width, height } = viewportOf(page);

    await page.mouse.move(width / 2 + 150, height - 150);
    await page.mouse.down();
    await page.mouse.move(width / 2 + 230, height - 110, { steps: 6 });
    await page.mouse.up();
    await expectSelected(page, ids[1]!, false);
    await card(page, 1).click();
    await expectSelected(page, ids[1]!, true);
    await expectCentered(page, ids[1]!);

    await page.mouse.move(width / 2 + 150, height - 150);
    await page.mouse.wheel(0, -100);
    await expectSelected(page, ids[1]!, false);
    await card(page, 1).click();
    await expectCentered(page, ids[1]!);

    await page.getByRole('button', { name: 'Recentrar' }).click();
    await expectSelected(page, ids[1]!, false);
    await card(page, 1).click();
    await expectSelected(page, ids[1]!, true);
    await expectCentered(page, ids[1]!);
  });

  test('a click on the floor or an object deselects (US2-8)', async ({ page }) => {
    await page.keyboard.press('4');
    await expectSelected(page, ids[3]!);
    await expectCentered(page, ids[3]!);
    await clickFloor(page);
    await expectSelected(page, null);
  });

  test('with debug on, characters are selected and the floor picks route ends (US2-10)', async ({
    page,
  }) => {
    await page.keyboard.press('g');
    await expect.poll(async () => (await readDebug(page)).enabled).toBe(true);
    const at = await agentToScreen(page, 'designer');
    await page.mouse.click(at.x, at.y);
    await expectSelected(page, 'designer');
    expect((await readDebug(page)).from).toBeNull();

    await expectCentered(page, 'designer');
    const entrance = await floorPointOf(page, marketingLayout.entrance);
    await page.mouse.click(entrance.x, entrance.y);
    await expect.poll(async () => (await readDebug(page)).from).toEqual(marketingLayout.entrance);
    await expectSelected(page, 'designer');
  });

  test('with focus on a button, Tab moves focus natively and numbers do nothing (US2-9)', async ({
    page,
  }) => {
    await card(page, 0).focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: `Editar ${marketingTeam[0]!.name}` }),
    ).toBeFocused();
    await page.keyboard.press('3');
    await page.waitForTimeout(100);
    await expectSelected(page, null);
  });
});
