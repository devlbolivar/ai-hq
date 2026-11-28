import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { marketingTeam, ZERO_INVENTION_RULE } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';
import { AgentEditor } from '../../src/ui/AgentEditor';

afterEach(cleanup);

function open(id = 'copywriter') {
  const store = createOfficeStore({ viewport: { width: 1280, height: 800 }, paused: true });
  render(<AgentEditor store={store} />);
  act(() => store.getState().openEditor(id));
  return { store, dialog: screen.getByRole('dialog', { name: 'Editar agente: Copywriter' }) };
}

const copywriter = marketingTeam[2]!;

describe('AgentEditor (FR-030–FR-032, US4)', () => {
  it('shows the current values, the preview and the fixed rule (US4-1)', () => {
    const { dialog } = open();
    const d = within(dialog);
    expect(d.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'Copywriter');
    expect(d.getByRole('textbox', { name: 'Rol' })).toHaveProperty('value', 'Redactor');
    expect(d.getByRole('textbox', { name: 'System prompt' })).toHaveProperty(
      'value',
      copywriter.systemPrompt,
    );
    expect(d.getByRole('radio', { name: /Ámbar/ })).toHaveProperty('checked', true);
    expect(d.getByRole('combobox', { name: 'Peinado' })).toHaveProperty('value', 'long');
    expect(d.getByRole('img', { name: 'Vista previa de Copywriter' })).toBeTruthy();
    const rule = d.getByRole('note', { name: 'Regla de cero invenciones' });
    expect(rule.textContent).toContain(ZERO_INVENTION_RULE);
    expect(within(rule).queryByRole('textbox')).toBeNull();
  });

  it('updates the preview at once but the office only on save (US4-2, US4-3)', async () => {
    const { store, dialog } = open();
    const d = within(dialog);
    const preview = () => d.getByRole('img', { name: /Vista previa/ }).innerHTML;
    const before = preview();
    await userEvent.click(d.getByRole('radio', { name: /Pizarra/ }));
    await userEvent.selectOptions(d.getByRole('combobox', { name: 'Peinado' }), 'bun');
    expect(preview()).not.toBe(before);
    expect(store.getState().team[2]!.color).toBe('amber');
    await userEvent.clear(d.getByRole('textbox', { name: 'Nombre' }));
    await userEvent.type(d.getByRole('textbox', { name: 'Nombre' }), 'Pluma');
    await userEvent.click(d.getByRole('button', { name: 'Guardar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(store.getState().team[2]).toMatchObject({
      name: 'Pluma',
      color: 'slate',
      appearance: { hairStyle: 'bun' },
    });
  });

  it.each([
    ['Nombre', '', 'El nombre es obligatorio'],
    ['Nombre', 'trend scout', 'Ya hay un agente con ese nombre'],
    ['Nombre', 'x'.repeat(31), 'Máximo 30 caracteres'],
    ['Rol', '', 'El rol es obligatorio'],
    ['Rol', 'x'.repeat(41), 'Máximo 40 caracteres'],
    ['System prompt', '', 'El system prompt es obligatorio'],
    ['System prompt', 'x'.repeat(4001), 'Máximo 4000 caracteres'],
  ])('does not save and marks %s when it is %j (US4-4, US4-5)', async (field, value, message) => {
    const { store, dialog } = open();
    const d = within(dialog);
    const input = d.getByRole('textbox', { name: field });
    fireEvent.change(input, { target: { value } });
    await userEvent.click(d.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-describedby')!;
    expect(document.getElementById(errorId)?.textContent).toBe(message);
    expect(store.getState().team[2]).toBe(marketingTeam[2]);
  });

  it('marks a color used by another agent (US4-4)', async () => {
    const { dialog } = open();
    const d = within(dialog);
    await userEvent.click(d.getByRole('radio', { name: /Coral/ }));
    await userEvent.click(d.getByRole('button', { name: 'Guardar' }));
    expect(d.getByRole('radiogroup', { name: 'Color' }).getAttribute('aria-invalid')).toBe('true');
    expect(dialog.textContent).toContain('Ese color ya lo usa Head of Marketing');
  });

  it.each(['Cancelar', 'Escape'])(
    'closes with %s without applying anything (US4-6)',
    async (how) => {
      const { store, dialog } = open();
      fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nombre' }), {
        target: { value: 'Otro' },
      });
      if (how === 'Cancelar')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      else fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(store.getState().team[2]).toBe(marketingTeam[2]);
      expect(store.getState().selection.agentId).toBe('copywriter');
    },
  );

  it('restores the seed values into the form, applied on save (US4-7)', async () => {
    const { store, dialog } = open();
    act(() => {
      store.getState().saveAgent('copywriter', { ...copywriter, name: 'Pluma', color: 'slate' });
      store.getState().openEditor('copywriter');
    });
    const d = within(screen.getByRole('dialog'));
    expect(d.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'Pluma');
    await userEvent.click(d.getByRole('button', { name: 'Restaurar valores originales' }));
    expect(d.getByRole('textbox', { name: 'Nombre' })).toHaveProperty('value', 'Copywriter');
    expect(store.getState().team[2]!.name).toBe('Pluma');
    await userEvent.click(d.getByRole('button', { name: 'Guardar' }));
    expect(store.getState().team[2]).toEqual(marketingTeam[2]);
    void dialog;
  });

  it('keeps unsaved edits while the agent moves (US4-8)', () => {
    const { store, dialog } = open();
    const name = within(dialog).getByRole('textbox', { name: 'Nombre' });
    fireEvent.change(name, { target: { value: 'Borrador' } });
    act(() => store.getState().tick(5000));
    const { sim } = store.getState();
    act(() =>
      store.setState({
        sim: { ...sim, agents: sim.agents.map((a) => ({ ...a, status: 'walking' as const })) },
      }),
    );
    expect(
      within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nombre' }),
    ).toHaveProperty('value', 'Borrador');
  });
});
