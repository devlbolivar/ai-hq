import { describe, expect, it } from 'vitest';
import { cleanSystemPrompt, effectivePrompt, ZERO_INVENTION_RULE } from '../../src/agents/prompt';

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

describe('zero-invention rule (FR-005, constitution V, research R4)', () => {
  it.each(['métricas', 'estadísticas', 'testimonios', 'citas', 'tendencias', 'datos de terceros'])(
    'forbids inventing %s',
    (word) => {
      expect(ZERO_INVENTION_RULE.toLowerCase()).toContain(word);
    },
  );

  it('asks for the missing data instead of assuming it', () => {
    expect(ZERO_INVENTION_RULE.toLowerCase()).toMatch(/pide|pregunta|solicita/);
  });
});

describe('cleanSystemPrompt', () => {
  it('trims the editable prompt', () => {
    expect(cleanSystemPrompt('  Hola  \n')).toBe('Hola');
  });

  it('removes every literal copy of the rule', () => {
    const pasted = `${ZERO_INVENTION_RULE}\nEscribe captions.\n${ZERO_INVENTION_RULE}`;
    expect(cleanSystemPrompt(pasted)).toBe('Escribe captions.');
  });
});

describe('effectivePrompt', () => {
  it('is the rule, a blank line and the cleaned prompt', () => {
    expect(effectivePrompt({ systemPrompt: ' Escribe guiones. ' })).toBe(
      `${ZERO_INVENTION_RULE}\n\nEscribe guiones.`,
    );
  });

  it.each([
    ['without the rule', 'Escribe hooks.'],
    ['with the rule once', `${ZERO_INVENTION_RULE} Escribe hooks.`],
    ['with the rule twice', `${ZERO_INVENTION_RULE}${ZERO_INVENTION_RULE}Escribe hooks.`],
  ])('contains the rule exactly once %s', (_label, systemPrompt) => {
    expect(occurrences(effectivePrompt({ systemPrompt }), ZERO_INVENTION_RULE)).toBe(1);
  });
});
