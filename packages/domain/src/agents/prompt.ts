import type { AgentProfile } from './types';

/**
 * Global, fixed block (constitution V, FR-005). It is not agent data: every effective prompt starts
 * with it exactly once and the user can neither edit nor delete it.
 */
export const ZERO_INVENTION_RULE =
  'Regla de cero invenciones: no inventes métricas, estadísticas, testimonios, citas, tendencias ' +
  'ni datos de terceros. Usa solo la información que te da el usuario. Si necesitas un dato que no ' +
  'tienes, no lo supongas: pide al usuario que te lo dé.';

/** The editable prompt without any literal copy of the rule, trimmed (research R4). */
export function cleanSystemPrompt(text: string): string {
  return text.split(ZERO_INVENTION_RULE).join('').trim();
}

/** What AI generation will consume (feature 005): the rule followed by the editable prompt. */
export function effectivePrompt(profile: Pick<AgentProfile, 'systemPrompt'>): string {
  return `${ZERO_INVENTION_RULE}\n\n${cleanSystemPrompt(profile.systemPrompt)}`;
}
