import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { effectivePrompt, ZERO_INVENTION_RULE } from '../../src/agents/prompt';
import { marketingTeam } from '../../src/agents/seed';
import { validateTeam } from '../../src/agents/validate';

describe('marketingTeam seed (FR-001–FR-005)', () => {
  it('has the 6 agents of FR-001 in order with stable ids, names, roles and desks', () => {
    expect(marketingTeam.map(({ id, name, role, deskId }) => ({ id, name, role, deskId }))).toEqual(
      [
        { id: 'head-of-marketing', name: 'Head of Marketing', role: 'Estratega', deskId: 'desk-1' },
        { id: 'trend-scout', name: 'Trend Scout', role: 'Investigador', deskId: 'desk-2' },
        { id: 'copywriter', name: 'Copywriter', role: 'Redactor', deskId: 'desk-3' },
        { id: 'scriptwriter', name: 'Scriptwriter', role: 'Guionista', deskId: 'desk-4' },
        { id: 'designer', name: 'Designer', role: 'Diseño', deskId: 'desk-5' },
        { id: 'community-manager', name: 'Community Manager', role: 'Comunidad', deskId: 'desk-6' },
      ],
    );
  });

  it('gives each agent a distinct color and a distinct appearance combination (FR-003)', () => {
    expect(new Set(marketingTeam.map((a) => a.color)).size).toBe(6);
    const combos = marketingTeam.map(({ appearance: a }) =>
      [a.skinTone, a.hairStyle, a.hairColor, a.accessory].join('/'),
    );
    expect(new Set(combos).size).toBe(6);
  });

  it.each([
    ['head-of-marketing', ['objetivos', 'pilares', 'plan semanal', 'prioridades']],
    ['trend-scout', ['ideas', 'ángulos', 'formatos', 'te pasa el usuario']],
    ['copywriter', ['captions', 'hooks', 'linkedin', 'x', 'hashtags']],
    ['scriptwriter', ['guiones', 'reels', 'tiktok', 'shorts', 'youtube', 'hook', 'beats', 'cta']],
    ['designer', ['carrusel', 'thumbnail', 'prompts de imagen', 'slide a slide']],
    ['community-manager', ['respuestas', 'comentarios', 'dms', 'pega']],
  ])('describes the tasks of %s in Spanish (FR-004)', (id, keywords) => {
    const prompt = marketingTeam.find((a) => a.id === id)!.systemPrompt.toLowerCase();
    for (const keyword of keywords) expect(prompt).toContain(keyword);
  });

  it('keeps the zero-invention rule out of the seed prompts', () => {
    for (const agent of marketingTeam)
      expect(agent.systemPrompt).not.toContain(ZERO_INVENTION_RULE);
  });

  it('includes the rule exactly once in each effective prompt (FR-005)', () => {
    for (const agent of marketingTeam) {
      expect(effectivePrompt(agent).split(ZERO_INVENTION_RULE)).toHaveLength(2);
    }
  });

  it('is a valid team for the Marketing layout', () => {
    expect(validateTeam(marketingTeam, marketingLayout)).toEqual({ ok: true });
  });
});
