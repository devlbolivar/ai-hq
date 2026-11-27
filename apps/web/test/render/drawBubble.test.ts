import { describe, expect, it } from 'vitest';
import { AGENT_STATUSES } from '@ai-hq/domain';
import { bubbleSpec, iconShapes } from '../../src/render/drawBubble';
import { STATUS_LABELS } from '../../src/render/palette';

describe('status bubble (FR-025)', () => {
  it('labels every status in Spanish', () => {
    expect(STATUS_LABELS).toEqual({
      idle: 'Desocupado',
      walking: 'Caminando',
      working: 'Trabajando',
      meeting: 'En reunión',
      break: 'Descanso',
      waiting_review: 'Esperando revisión',
    });
  });

  it('shows no bubble for idle, selected or not', () => {
    expect(bubbleSpec('idle', false)).toBeNull();
    expect(bubbleSpec('idle', true)).toBeNull();
  });

  it('uses one distinct icon per non-idle status', () => {
    const busy = AGENT_STATUSES.filter((s) => s !== 'idle');
    const icons = busy.map((s) => bubbleSpec(s, false)!.icon);
    expect(new Set(icons).size).toBe(busy.length);
    const drawn = icons.map((icon) => JSON.stringify(iconShapes(icon)));
    expect(new Set(drawn).size).toBe(busy.length);
    for (const icon of icons) expect(iconShapes(icon).length).toBeGreaterThan(0);
  });

  it('adds the Spanish status text only for the selected agent', () => {
    expect(bubbleSpec('working', false)!.label).toBeNull();
    expect(bubbleSpec('working', true)!.label).toBe('Trabajando');
    expect(bubbleSpec('waiting_review', true)!.label).toBe('Esperando revisión');
  });
});
