import { describe, expect, it } from 'vitest';
import { marketingTeam, type AgentDraft } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };
const copywriter = marketingTeam[2]!;
const draft: AgentDraft = {
  name: copywriter.name,
  role: copywriter.role,
  color: copywriter.color,
  appearance: copywriter.appearance,
  systemPrompt: copywriter.systemPrompt,
};

describe('agent editor state (FR-030–FR-032a)', () => {
  it('opens the editor of an agent and selects it', () => {
    const store = createOfficeStore({ viewport, paused: true });
    store.getState().openEditor('copywriter');
    expect(store.getState().editor).toEqual({ agentId: 'copywriter' });
    expect(store.getState().selection.agentId).toBe('copywriter');
  });

  it('closes the editor keeping the selection', () => {
    const store = createOfficeStore({ viewport, paused: true });
    store.getState().openEditor('copywriter');
    store.getState().closeEditor();
    expect(store.getState().editor).toBeNull();
    expect(store.getState().selection.agentId).toBe('copywriter');
  });

  it('rejects an invalid draft with field errors and changes nothing', () => {
    const store = createOfficeStore({ viewport, paused: true });
    store.getState().openEditor('copywriter');
    const before = store.getState().team;
    const errors = store
      .getState()
      .saveAgent('copywriter', { ...draft, name: ' ', color: 'coral' });
    expect(errors).toEqual({
      name: 'El nombre es obligatorio',
      color: 'Ese color ya lo usa Head of Marketing',
    });
    expect(store.getState().team).toBe(before);
    expect(store.getState().editor).toEqual({ agentId: 'copywriter' });
  });

  it('applies a valid draft to the team and world, keeps the simulation and closes the editor', () => {
    const store = createOfficeStore({ viewport, paused: true });
    store.getState().openEditor('copywriter');
    const sim = store.getState().sim;
    const errors = store
      .getState()
      .saveAgent('copywriter', { ...draft, name: '  Pluma  ', color: 'slate' });
    expect(errors).toEqual({});
    const saved = store.getState().team.find((a) => a.id === 'copywriter')!;
    expect(saved).toMatchObject({ name: 'Pluma', color: 'slate', deskId: 'desk-3' });
    expect(store.getState().world.team).toBe(store.getState().team);
    expect(store.getState().sim).toBe(sim);
    expect(store.getState().editor).toBeNull();
    expect(store.getState().selection.agentId).toBe('copywriter');
  });
});
