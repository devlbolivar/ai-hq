import { expect, test, type Page } from '@playwright/test';
import { marketingTeam } from '@ai-hq/domain';
import { openOffice, readAgents, readHookField, readSelection } from './support/hook';

/** Copywriter: third agent, amber, long auburn hair in the seed. */
const COPY = 2;
const seed = marketingTeam[COPY]!;

const dialog = (page: Page) => page.getByRole('dialog');

async function openEditor(page: Page) {
  await page.getByRole('button', { name: `Editar ${seed.name}` }).click();
  await expect(dialog(page)).toHaveAccessibleName(`Editar agente: ${seed.name}`);
  expect(await readHookField(page, 'editorOpen')).toBe(true);
}

async function previewMarkup(page: Page): Promise<string> {
  return dialog(page)
    .getByRole('img', { name: `Vista previa de ${seed.name}` })
    .innerHTML();
}

test.describe('US4 — editar un agente (FR-030–FR-033)', () => {
  test.beforeEach(async ({ page }) => {
    await openOffice(page, { paused: true });
  });

  test('changes preview at once, apply only on save (US4-1…US4-3)', async ({ page }) => {
    await openEditor(page);
    const preview = await previewMarkup(page);

    await dialog(page).getByRole('textbox', { name: 'Nombre' }).fill('Pluma');
    await dialog(page).getByRole('radio', { name: 'Lima' }).check();
    await dialog(page).getByRole('combobox', { name: 'Peinado' }).selectOption('curly');
    await expect.poll(() => previewMarkup(page)).not.toBe(preview);
    // The office does not change until saving.
    expect((await readAgents(page))[COPY]).toMatchObject({ name: seed.name, color: seed.color });

    await dialog(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog(page)).toHaveCount(0);
    expect(await readHookField(page, 'editorOpen')).toBe(false);
    expect((await readAgents(page))[COPY]).toMatchObject({ name: 'Pluma', color: 'lime' });
    await expect(
      page.getByRole('button', { name: `${COPY + 1}. Pluma — ${seed.role}` }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Equipo' })
        .getByRole('listitem')
        .nth(COPY)
        .locator('[data-color]'),
    ).toHaveAttribute('data-color', 'lime');
  });

  test('empty or duplicate names and a used color show errors and save nothing (US4-4)', async ({
    page,
  }) => {
    await openEditor(page);
    const name = dialog(page).getByRole('textbox', { name: 'Nombre' });
    const save = dialog(page).getByRole('button', { name: 'Guardar' });

    await name.fill('   ');
    await save.click();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('El nombre es obligatorio');

    await name.fill(marketingTeam[0]!.name.toUpperCase());
    await save.click();
    await expect(name).toHaveAccessibleDescription('Ya hay un agente con ese nombre');

    await name.fill('Pluma');
    // Sky is Trend Scout's color: the option says so and saving fails.
    const sky = dialog(page).getByRole('radio', { name: /Cielo \(Trend Scout\)/ });
    await sky.check();
    await save.click();
    await expect(dialog(page).getByText('Ese color ya lo usa Trend Scout')).toBeVisible();

    await expect(dialog(page)).toBeVisible();
    expect((await readAgents(page))[COPY]).toMatchObject({ name: seed.name, color: seed.color });
  });

  test('Esc closes keeping the selection; shortcuts do nothing while open (US2-9, US4-6)', async ({
    page,
  }) => {
    await openEditor(page);
    expect(await readSelection(page)).toMatchObject({ agentId: seed.id });

    await dialog(page).getByRole('textbox', { name: 'Nombre' }).fill('Pluma');
    // Focus on the dialog itself (not a field): office keys must still do nothing.
    await dialog(page).getByRole('heading').click();
    for (const key of ['5', 'Tab', 'Space', 'g']) await page.keyboard.press(key);
    expect(await readSelection(page)).toMatchObject({ agentId: seed.id });
    expect(await readHookField(page, 'paused')).toBe(true);
    expect((await readHookField(page, 'debug')).enabled).toBe(false);

    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    expect(await readHookField(page, 'editorOpen')).toBe(false);
    expect(await readSelection(page)).toMatchObject({ agentId: seed.id });
    expect((await readAgents(page))[COPY]!.name).toBe(seed.name);
  });

  test('restore + save returns to the seed values (US4-7)', async ({ page }) => {
    await openEditor(page);
    await dialog(page).getByRole('textbox', { name: 'Nombre' }).fill('Pluma');
    await dialog(page).getByRole('radio', { name: 'Lima' }).check();
    await dialog(page).getByRole('button', { name: 'Guardar' }).click();
    expect((await readAgents(page))[COPY]).toMatchObject({ name: 'Pluma', color: 'lime' });

    await page.getByRole('button', { name: 'Editar Pluma' }).click();
    await dialog(page).getByRole('button', { name: 'Restaurar valores originales' }).click();
    await expect(dialog(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue(seed.name);
    await dialog(page).getByRole('button', { name: 'Guardar' }).click();
    expect((await readAgents(page))[COPY]).toMatchObject({ name: seed.name, color: seed.color });
  });

  test('reloading the page returns to the seed values (FR-032a)', async ({ page }) => {
    await openEditor(page);
    await dialog(page).getByRole('textbox', { name: 'Nombre' }).fill('Pluma');
    await dialog(page).getByRole('button', { name: 'Guardar' }).click();
    expect((await readAgents(page))[COPY]!.name).toBe('Pluma');

    await page.reload({ waitUntil: 'commit' });
    await page.waitForFunction(
      () => (window as unknown as { __AIHQ__?: { ready: boolean } }).__AIHQ__?.ready === true,
    );
    expect((await readAgents(page))[COPY]).toMatchObject({ name: seed.name, color: seed.color });
  });
});
