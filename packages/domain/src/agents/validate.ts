import type { OfficeLayout } from '../types';
import { ACCESSORIES, AGENT_COLORS, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from './catalog';
import { cleanSystemPrompt } from './prompt';
import type { AgentDraft, AgentProfile, Appearance } from './types';

export const NAME_MAX = 30;
export const ROLE_MAX = 40;
export const SYSTEM_PROMPT_MAX = 4000;

export type AgentErrorCode =
  | 'DUPLICATE_ID'
  | 'DUPLICATE_DESK'
  | 'DUPLICATE_COLOR'
  | 'DUPLICATE_NAME'
  | 'UNKNOWN_DESK'
  | 'UNKNOWN_COLOR'
  | 'UNKNOWN_APPEARANCE'
  | 'EMPTY_FIELD'
  | 'TOO_LONG';

export interface AgentError {
  readonly code: AgentErrorCode;
  readonly agentId: string;
  readonly field: string;
  readonly message: string;
}

export type TeamValidationResult =
  { readonly ok: true } | { readonly ok: false; readonly errors: readonly AgentError[] };

export type DraftField =
  | 'name'
  | 'role'
  | 'color'
  | 'systemPrompt'
  | 'appearance.skinTone'
  | 'appearance.hairStyle'
  | 'appearance.hairColor'
  | 'appearance.accessory';

export type AgentDraftErrors = Partial<Record<DraftField, string>>;

const COLOR_IDS = new Set<string>(AGENT_COLORS.map((c) => c.id));
const APPEARANCE_OPTIONS: Readonly<Record<keyof Appearance, ReadonlySet<string>>> = {
  skinTone: new Set(SKIN_TONES.map((e) => e.id)),
  hairStyle: new Set(HAIR_STYLES.map((e) => e.id)),
  hairColor: new Set(HAIR_COLORS.map((e) => e.id)),
  accessory: new Set(ACCESSORIES.map((e) => e.id)),
};
const APPEARANCE_KEYS = Object.keys(APPEARANCE_OPTIONS) as (keyof Appearance)[];

type TextField = 'name' | 'role' | 'systemPrompt';

const TEXT_RULES: Readonly<
  Record<TextField, { max: number; clean: (s: string) => string; empty: string }>
> = {
  name: { max: NAME_MAX, clean: (s) => s.trim(), empty: 'El nombre es obligatorio' },
  role: { max: ROLE_MAX, clean: (s) => s.trim(), empty: 'El rol es obligatorio' },
  systemPrompt: {
    max: SYSTEM_PROMPT_MAX,
    clean: cleanSystemPrompt,
    empty: 'El system prompt es obligatorio',
  },
};

/** Length problem of a text field, or null when valid. */
function textProblem(field: TextField, value: string): 'EMPTY_FIELD' | 'TOO_LONG' | null {
  const { max, clean } = TEXT_RULES[field];
  const length = clean(value).length;
  if (length === 0) return 'EMPTY_FIELD';
  return length > max ? 'TOO_LONG' : null;
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Validates loaded agent data and reports every problem at once (FR-006). */
export function validateTeam(
  profiles: readonly AgentProfile[],
  layout: OfficeLayout,
): TeamValidationResult {
  const errors: AgentError[] = [];
  const desks = new Set(layout.objects.filter((o) => o.kind === 'desk').map((o) => o.id));
  const push = (code: AgentErrorCode, agent: AgentProfile, field: string, detail: string) =>
    errors.push({
      code,
      agentId: agent.id,
      field,
      message: `Agente "${agent.id}", campo ${field}: ${detail}.`,
    });

  const seen = { id: new Set<string>(), desk: new Set<string>(), color: new Set<string>() };
  const names = new Set<string>();

  for (const agent of profiles) {
    if (agent.id.trim() === '') push('EMPTY_FIELD', agent, 'id', 'el id es obligatorio');
    else if (seen.id.has(agent.id)) push('DUPLICATE_ID', agent, 'id', 'id repetido');
    seen.id.add(agent.id);

    for (const field of ['name', 'role', 'systemPrompt'] as const) {
      const problem = textProblem(field, agent[field]);
      if (problem === 'EMPTY_FIELD') push(problem, agent, field, 'no puede estar vacío');
      if (problem === 'TOO_LONG') {
        push(problem, agent, field, `máximo ${TEXT_RULES[field].max} caracteres`);
      }
    }
    const key = nameKey(agent.name);
    if (key !== '' && names.has(key)) {
      push('DUPLICATE_NAME', agent, 'name', `nombre repetido "${agent.name.trim()}"`);
    }
    names.add(key);

    if (!COLOR_IDS.has(agent.color)) {
      push('UNKNOWN_COLOR', agent, 'color', `"${agent.color}" no está en el catálogo`);
    } else if (seen.color.has(agent.color)) {
      push('DUPLICATE_COLOR', agent, 'color', `color "${agent.color}" repetido`);
    }
    seen.color.add(agent.color);

    for (const part of APPEARANCE_KEYS) {
      const value = String(agent.appearance[part]);
      if (!APPEARANCE_OPTIONS[part].has(value)) {
        push(
          'UNKNOWN_APPEARANCE',
          agent,
          `appearance.${part}`,
          `"${value}" no está en el catálogo`,
        );
      }
    }

    if (!desks.has(agent.deskId)) {
      push('UNKNOWN_DESK', agent, 'deskId', `"${agent.deskId}" no es un escritorio del layout`);
    } else if (seen.desk.has(agent.deskId)) {
      push('DUPLICATE_DESK', agent, 'deskId', `escritorio "${agent.deskId}" repetido`);
    }
    seen.desk.add(agent.deskId);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

/** Field errors of the editor form, compared with the rest of the team (FR-030); `{}` = valid. */
export function validateAgentDraft(
  draft: AgentDraft,
  team: readonly AgentProfile[],
  agentId: string,
): AgentDraftErrors {
  const errors: AgentDraftErrors = {};
  const others = team.filter((agent) => agent.id !== agentId);

  for (const field of ['name', 'role', 'systemPrompt'] as const) {
    const problem = textProblem(field, draft[field]);
    if (problem === 'EMPTY_FIELD') errors[field] = TEXT_RULES[field].empty;
    if (problem === 'TOO_LONG') errors[field] = `Máximo ${TEXT_RULES[field].max} caracteres`;
  }
  if (!errors.name && others.some((agent) => nameKey(agent.name) === nameKey(draft.name))) {
    errors.name = 'Ya hay un agente con ese nombre';
  }

  const colorOwner = others.find((agent) => agent.color === draft.color);
  if (!COLOR_IDS.has(draft.color)) errors.color = 'Color fuera del catálogo';
  else if (colorOwner) errors.color = `Ese color ya lo usa ${colorOwner.name}`;

  for (const part of APPEARANCE_KEYS) {
    if (!APPEARANCE_OPTIONS[part].has(String(draft.appearance[part]))) {
      errors[`appearance.${part}`] = 'Opción fuera del catálogo';
    }
  }
  return errors;
}

/** The profile with the draft applied: texts trimmed and the prompt stored clean. */
export function applyDraft(profile: AgentProfile, draft: AgentDraft): AgentProfile {
  return {
    ...profile,
    name: draft.name.trim(),
    role: draft.role.trim(),
    color: draft.color,
    appearance: { ...draft.appearance },
    systemPrompt: cleanSystemPrompt(draft.systemPrompt),
  };
}
