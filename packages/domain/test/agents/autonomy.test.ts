import { describe, expect, it } from 'vitest';
import { AUTONOMOUS_ACTIVITIES, chooseAutonomousTarget } from '../../src/agents/autonomy';
import { createSimulation } from '../../src/agents/simulation';
import { pick, seedRng, type RngState } from '../../src/agents/rng';
import type { Activity, AgentTarget, Simulation } from '../../src/agents/types';
import { resolveUsePoint } from '../../src/agents/usePoints';
import { runtime, simOf, world } from './fixtures';

const usePointTiles = new Set(
  world.layout.objects.flatMap((o) => o.usePoints.map((p) => `${p.tile.x},${p.tile.y}`)),
);

/** First PRNG state (from seed 1 upwards) whose first `pick` chooses `activity`. */
function stateChoosing(activity: Activity): RngState {
  for (let seed = 1; ; seed++) {
    const state = seedRng(seed);
    if (pick(state, AUTONOMOUS_ACTIVITIES)[0] === activity) return state;
  }
}

function withRng(sim: Simulation, rng: RngState): Simulation {
  return { ...sim, rng };
}

describe('chooseAutonomousTarget (FR-016, FR-018, research R8)', () => {
  const start = createSimulation(world, 11);

  it('offers work, break, whiteboard and wander only', () => {
    expect(AUTONOMOUS_ACTIVITIES).toEqual(['work', 'break', 'whiteboard', 'wander']);
  });

  it('never chooses meeting or review and respects each activity over many draws', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const sim = withRng(start, seedRng(seed));
      const { target } = chooseAutonomousTarget(sim, world, 'copywriter');
      expect(target).not.toBeNull();
      const t = target as AgentTarget;
      expect(['work', 'break', 'whiteboard', 'wander']).toContain(t.activity);
      if (t.activity === 'work') {
        expect(t.usePoint).toEqual({ objectId: 'desk-3', index: 0 });
      } else if (t.activity === 'break') {
        expect(['coffee-machine', 'sofa']).toContain(t.usePoint?.objectId);
      } else if (t.activity === 'whiteboard') {
        expect(t.usePoint).toEqual({ objectId: 'whiteboard', index: 0 });
      } else {
        expect(t.usePoint).toBeNull();
        expect(world.walk[t.tile.y]![t.tile.x]).toBe(true);
        expect(usePointTiles.has(`${t.tile.x},${t.tile.y}`)).toBe(false);
        expect(sim.agents.some((a) => a.tile.x === t.tile.x && a.tile.y === t.tile.y)).toBe(false);
      }
      if (t.usePoint) {
        const point = resolveUsePoint(world.layout, t.usePoint);
        expect(t.tile).toEqual(point.tile);
        expect(t.facing).toBe(point.facing);
      }
    }
  });

  it('always consumes one pick for the activity and one for the candidate', () => {
    const rng = stateChoosing('break');
    const [, afterActivity] = pick(rng, AUTONOMOUS_ACTIVITIES);
    const [, afterCandidate] = pick(afterActivity, [0, 1, 2]);
    const result = chooseAutonomousTarget(withRng(start, rng), world, 'copywriter');
    expect(result.rng).toBe(afterCandidate);
  });

  it('falls back to the next activity only when the chosen one has no free candidate', () => {
    const coffee = { objectId: 'coffee-machine', index: 0 };
    const sofa0 = { objectId: 'sofa', index: 0 };
    const sofa1 = { objectId: 'sofa', index: 1 };
    const sim = simOf([
      runtime('copywriter', { x: 7, y: 6 }, { objectId: 'desk-3', index: 0 }),
      runtime('designer', { x: 13, y: 7 }, coffee),
      runtime('trend-scout', { x: 12, y: 10 }, sofa0),
      runtime('scriptwriter', { x: 13, y: 10 }, sofa1),
    ]);
    const { target } = chooseAutonomousTarget(
      withRng(sim, stateChoosing('break')),
      world,
      'copywriter',
    );
    expect(target?.activity).toBe('whiteboard');
  });

  it('excludes tiles occupied or chosen by others from wandering', () => {
    const others = [
      runtime('designer', { x: 9, y: 6 }),
      runtime('trend-scout', { x: 10, y: 6 }, null, {
        status: 'walking',
        next: { x: 10, y: 7 },
        target: { activity: 'wander', tile: { x: 11, y: 9 }, usePoint: null, facing: null },
      }),
    ];
    for (let seed = 1; seed <= 200; seed++) {
      const sim = withRng(
        simOf([runtime('copywriter', { x: 7, y: 6 }, { objectId: 'desk-3', index: 0 }), ...others]),
        seedRng(seed),
      );
      const { target } = chooseAutonomousTarget(sim, world, 'copywriter');
      if (target?.activity !== 'wander') continue;
      for (const banned of ['9,6', '10,6', '10,7', '11,9', '7,6']) {
        expect(`${target.tile.x},${target.tile.y}`).not.toBe(banned);
      }
    }
  });

  it('returns no target when the drawn candidate is unreachable', () => {
    const walk = world.walk.map((row, y) =>
      row.map((cell, x) => cell && !(Math.abs(x - 9) + Math.abs(y - 6) === 1)),
    );
    const sim = withRng(simOf([runtime('copywriter', { x: 9, y: 6 })]), stateChoosing('wander'));
    expect(chooseAutonomousTarget(sim, { ...world, walk }, 'copywriter').target).toBeNull();
  });
});
