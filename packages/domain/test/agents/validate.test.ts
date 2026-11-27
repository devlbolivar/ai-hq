import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { ZERO_INVENTION_RULE } from '../../src/agents/prompt';
import type { AgentDraft, AgentProfile } from '../../src/agents/types';
import {
  applyDraft,
  NAME_MAX,
  ROLE_MAX,
  SYSTEM_PROMPT_MAX,
  validateAgentDraft,
  validateTeam,
  type AgentError,
} from '../../src/agents/validate';

const COLORS = ['coral', 'amber', 'lime', 'emerald', 'sky', 'indigo'] as const;

function profile(n: number, overrides: Partial<AgentProfile> = {}): AgentProfile {
  return {
    id: `agent-${n}`,
    name: `Agente ${n}`,
    role: `Rol ${n}`,
    color: COLORS[n - 1]!,
    appearance: { skinTone: 'skin-1', hairStyle: 'short', hairColor: 'black', accessory: 'none' },
    deskId: `desk-${n}`,
    systemPrompt: `Eres el agente ${n}.`,
    ...overrides,
  };
}

const team = [1, 2, 3, 4, 5, 6].map((n) => profile(n));

function errorsOf(profiles: readonly AgentProfile[]): readonly AgentError[] {
  const result = validateTeam(profiles, marketingLayout);
  return result.ok ? [] : result.errors;
}

function only(profiles: readonly AgentProfile[]): AgentError {
  const errors = errorsOf(profiles);
  expect(errors).toHaveLength(1);
  return errors[0]!;
}

function replace(index: number, overrides: Partial<AgentProfile>): AgentProfile[] {
  return team.map((p, i) => (i === index ? { ...p, ...overrides } : p));
}

describe('validateTeam (FR-006, data-model.md "Validación de agentes")', () => {
  it('accepts a valid team', () => {
    expect(validateTeam(team, marketingLayout)).toEqual({ ok: true });
  });

  it.each([
    ['DUPLICATE_ID', 'id', replace(1, { id: 'agent-1' })],
    ['DUPLICATE_DESK', 'deskId', replace(1, { deskId: 'desk-1' })],
    ['DUPLICATE_COLOR', 'color', replace(1, { color: 'coral' })],
    ['DUPLICATE_NAME', 'name', replace(1, { name: '  agente 1 ' })],
    ['UNKNOWN_DESK', 'deskId', replace(1, { deskId: 'desk-99' })],
    ['UNKNOWN_DESK', 'deskId', replace(1, { deskId: 'chair-2' })],
    ['UNKNOWN_COLOR', 'color', replace(1, { color: 'neon' as AgentProfile['color'] })],
    ['EMPTY_FIELD', 'id', replace(1, { id: '  ' })],
    ['EMPTY_FIELD', 'name', replace(1, { name: '   ' })],
    ['EMPTY_FIELD', 'role', replace(1, { role: '' })],
    ['EMPTY_FIELD', 'systemPrompt', replace(1, { systemPrompt: ` ${ZERO_INVENTION_RULE} ` })],
    ['TOO_LONG', 'name', replace(1, { name: 'x'.repeat(NAME_MAX + 1) })],
    ['TOO_LONG', 'role', replace(1, { role: 'x'.repeat(ROLE_MAX + 1) })],
    ['TOO_LONG', 'systemPrompt', replace(1, { systemPrompt: 'x'.repeat(SYSTEM_PROMPT_MAX + 1) })],
  ] as const)('reports %s on %s', (code, field, profiles) => {
    const error = only(profiles);
    expect(error).toMatchObject({ code, field, agentId: profiles[1]!.id });
    expect(error.message).toContain(field);
    if (profiles[1]!.id.trim()) expect(error.message).toContain(profiles[1]!.id);
  });

  it.each(['skinTone', 'hairStyle', 'hairColor', 'accessory'] as const)(
    'reports UNKNOWN_APPEARANCE on appearance.%s without throwing',
    (key) => {
      const appearance = { ...team[2]!.appearance, [key]: 'unknown' };
      const error = only(replace(2, { appearance } as Partial<AgentProfile>));
      expect(error).toMatchObject({
        code: 'UNKNOWN_APPEARANCE',
        field: `appearance.${key}`,
        agentId: 'agent-3',
      });
      expect(error.message).toContain(`appearance.${key}`);
    },
  );

  it('accepts limits exactly at the maximum lengths after trimming', () => {
    const edge = replace(0, {
      name: ` ${'n'.repeat(NAME_MAX)} `,
      role: 'r'.repeat(ROLE_MAX),
      systemPrompt: 's'.repeat(SYSTEM_PROMPT_MAX),
    });
    expect(validateTeam(edge, marketingLayout)).toEqual({ ok: true });
  });

  it('reports several errors together, naming agent and field in Spanish', () => {
    const errors = errorsOf([
      profile(1, { name: '', color: 'coral' }),
      profile(2, { color: 'coral', deskId: 'desk-1' }),
    ]);
    expect(errors.map((e) => e.code).sort()).toEqual([
      'DUPLICATE_COLOR',
      'DUPLICATE_DESK',
      'EMPTY_FIELD',
    ]);
    for (const error of errors) {
      expect(error.message).toContain(error.agentId);
      expect(error.message).toContain(error.field);
    }
  });
});

describe('validateAgentDraft (FR-030)', () => {
  const draftOf = (p: AgentProfile): AgentDraft => ({
    name: p.name,
    role: p.role,
    color: p.color,
    appearance: p.appearance,
    systemPrompt: p.systemPrompt,
  });
  const base = draftOf(team[0]!);

  it('returns no errors for a valid draft, including its own name and color', () => {
    expect(validateAgentDraft(base, team, 'agent-1')).toEqual({});
    expect(validateAgentDraft({ ...base, name: 'AGENTE 1' }, team, 'agent-1')).toEqual({});
  });

  it.each([
    ['name', { name: '  ' }, 'El nombre es obligatorio'],
    ['name', { name: 'x'.repeat(NAME_MAX + 1) }, `Máximo ${NAME_MAX} caracteres`],
    ['name', { name: ' agente 2 ' }, 'Ya hay un agente con ese nombre'],
    ['role', { role: '' }, 'El rol es obligatorio'],
    ['role', { role: 'x'.repeat(ROLE_MAX + 1) }, `Máximo ${ROLE_MAX} caracteres`],
    ['color', { color: 'amber' }, 'Ese color ya lo usa Agente 2'],
    ['color', { color: 'neon' }, 'Color fuera del catálogo'],
    ['systemPrompt', { systemPrompt: ZERO_INVENTION_RULE }, 'El system prompt es obligatorio'],
    [
      'systemPrompt',
      { systemPrompt: 'x'.repeat(SYSTEM_PROMPT_MAX + 1) },
      `Máximo ${SYSTEM_PROMPT_MAX} caracteres`,
    ],
  ] as const)('reports %s: %o', (field, change, message) => {
    const draft = { ...base, ...change } as AgentDraft;
    expect(validateAgentDraft(draft, team, 'agent-1')).toEqual({ [field]: message });
  });

  it.each(['skinTone', 'hairStyle', 'hairColor', 'accessory'] as const)(
    'reports an appearance.%s outside the catalog',
    (key) => {
      const draft = { ...base, appearance: { ...base.appearance, [key]: 'x' } } as AgentDraft;
      expect(validateAgentDraft(draft, team, 'agent-1')).toEqual({
        [`appearance.${key}`]: 'Opción fuera del catálogo',
      });
    },
  );

  it('measures the system prompt after removing the rule', () => {
    const systemPrompt = `${ZERO_INVENTION_RULE}${'x'.repeat(SYSTEM_PROMPT_MAX)}`;
    expect(validateAgentDraft({ ...base, systemPrompt }, team, 'agent-1')).toEqual({});
  });
});

describe('applyDraft', () => {
  it('keeps id and deskId, trims texts and stores the cleaned prompt', () => {
    const next = applyDraft(team[0]!, {
      name: '  Nueva  ',
      role: ' Rol nuevo ',
      color: 'slate',
      appearance: { skinTone: 'skin-4', hairStyle: 'bun', hairColor: 'gray', accessory: 'cap' },
      systemPrompt: ` ${ZERO_INVENTION_RULE} Haz guiones. `,
    });
    expect(next).toEqual({
      id: 'agent-1',
      deskId: 'desk-1',
      name: 'Nueva',
      role: 'Rol nuevo',
      color: 'slate',
      appearance: { skinTone: 'skin-4', hairStyle: 'bun', hairColor: 'gray', accessory: 'cap' },
      systemPrompt: 'Haz guiones.',
    });
  });
});
