import { describe, expect, it } from 'vitest';
import { agentColorHex, marketingTeam, positionToWorld, type Appearance } from '@ai-hq/domain';
import {
  createCharacterView,
  updateCharacterView,
  type CharacterLook,
} from '../../src/render/character/pixi';

const profile = marketingTeam[2]!;
const look: CharacterLook = {
  appearance: profile.appearance,
  color: agentColorHex(profile.color),
  position: { x: 7, y: 6 },
  facing: 'N',
  pose: 'idle',
  t: 0,
};
const tile = { width: 64, height: 32 };

describe('character Pixi view (research R11)', () => {
  it('is a container labelled agent:<id> placed at the agent position', () => {
    const view = createCharacterView(profile.id);
    updateCharacterView(view, { ...look, position: { x: 7.5, y: 6 } }, tile);
    expect(view.root.label).toBe('agent:copywriter');
    expect(view.root.position.x).toBeCloseTo(positionToWorld({ x: 7.5, y: 6 }, tile).x);
    expect(view.root.position.y).toBeCloseTo(positionToWorld({ x: 7.5, y: 6 }, tile).y);
  });

  it('keeps the drawing while the animation frame does not change', () => {
    const view = createCharacterView(profile.id);
    updateCharacterView(view, look, tile);
    const context = view.figure.context;
    updateCharacterView(view, { ...look, t: 20, position: { x: 7.2, y: 6 } }, tile);
    expect(view.figure.context).toBe(context);
  });

  it('switches frames over time and reuses cached frames', () => {
    const view = createCharacterView(profile.id);
    updateCharacterView(view, { ...look, pose: 'walk', facing: 'E', t: 0 }, tile);
    const first = view.figure.context;
    updateCharacterView(view, { ...look, pose: 'walk', facing: 'E', t: 125 }, tile);
    expect(view.figure.context).not.toBe(first);
    updateCharacterView(view, { ...look, pose: 'walk', facing: 'E', t: 500 }, tile);
    expect(view.figure.context).toBe(first);
  });

  it('redraws when the facing or the appearance changes', () => {
    const view = createCharacterView(profile.id);
    updateCharacterView(view, look, tile);
    const north = view.figure.context;
    updateCharacterView(view, { ...look, facing: 'S' }, tile);
    expect(view.figure.context).not.toBe(north);
    const south = view.figure.context;
    const appearance: Appearance = { ...look.appearance, accessory: 'cap' };
    updateCharacterView(view, { ...look, facing: 'S', appearance }, tile);
    expect(view.figure.context).not.toBe(south);
  });

  it('keeps the ring as the first child, under the figure', () => {
    const view = createCharacterView(profile.id);
    expect(view.root.children[0]).toBe(view.ring);
    expect(view.root.children[1]).toBe(view.figure);
  });
});
