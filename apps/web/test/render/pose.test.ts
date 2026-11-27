import { describe, expect, it } from 'vitest';
import { marketingLayout, type AgentRuntime } from '@ai-hq/domain';
import { poseFor } from '../../src/render/character/pose';

function agent(overrides: Partial<AgentRuntime>): AgentRuntime {
  return {
    id: 'a',
    status: 'idle',
    tile: { x: 9, y: 6 },
    next: null,
    stepMs: 0,
    route: [],
    facing: 'N',
    target: null,
    reservation: null,
    forced: false,
    timerMs: null,
    celebrateMs: 0,
    ...overrides,
  };
}

describe('poseFor (FR-013, FR-024)', () => {
  it.each([
    [{ status: 'walking', next: { x: 10, y: 6 } }, 'walk'],
    [{ status: 'working', tile: { x: 3, y: 6 } }, 'type'],
    [{ status: 'working', tile: { x: 3, y: 6 }, celebrateMs: 500 }, 'celebrate'],
    [{ status: 'break', tile: { x: 13, y: 7 } }, 'coffee'],
    [{ status: 'idle' }, 'idle'],
    [{ status: 'meeting', tile: { x: 11, y: 2 } }, 'idle'],
    [{ status: 'waiting_review', tile: { x: 1, y: 3 } }, 'idle'],
  ] as const)('maps %o to %s', (overrides, pose) => {
    expect(poseFor(agent(overrides), marketingLayout).pose).toBe(pose);
  });

  it('sits on chairs and on the sofa, and stands elsewhere or while walking', () => {
    expect(
      poseFor(agent({ status: 'working', tile: { x: 3, y: 6 } }), marketingLayout).seated,
    ).toBe(true);
    expect(
      poseFor(agent({ status: 'break', tile: { x: 12, y: 10 } }), marketingLayout).seated,
    ).toBe(true);
    expect(poseFor(agent({ status: 'break', tile: { x: 13, y: 7 } }), marketingLayout).seated).toBe(
      false,
    );
    expect(
      poseFor(
        agent({ status: 'walking', tile: { x: 3, y: 6 }, next: { x: 4, y: 6 } }),
        marketingLayout,
      ).seated,
    ).toBe(false);
  });
});
