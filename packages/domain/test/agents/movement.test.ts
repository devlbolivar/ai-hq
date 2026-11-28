import { describe, expect, it } from 'vitest';
import {
  advanceMovement,
  agentPosition,
  directionBetween,
  planRoute,
  STEP_DURATION_MS,
} from '../../src/agents/movement';
import type { AgentRuntime } from '../../src/agents/types';
import { findPath } from '../../src/path/findPath';
import { runtime, world } from './fixtures';

function walker(path: readonly { x: number; y: number }[]): AgentRuntime {
  const [tile, next, ...route] = path;
  return runtime('a', tile!, null, {
    status: 'walking',
    next: next ?? null,
    route,
    facing: next ? directionBetween(tile!, next) : 'N',
  });
}

function advance(agent: AgentRuntime, totalMs: number, stepMs = 10) {
  let current = agent;
  let arrived = false;
  const positions = [agentPosition(current)];
  for (let t = 0; t < totalMs; t += stepMs) {
    const result = advanceMovement(current, stepMs);
    current = result.agent;
    arrived ||= result.arrived;
    positions.push(agentPosition(current));
  }
  return { agent: current, arrived, positions };
}

describe('directionBetween', () => {
  it.each([
    [{ x: 1, y: 0 }, 'E'],
    [{ x: -1, y: 0 }, 'W'],
    [{ x: 0, y: 1 }, 'S'],
    [{ x: 0, y: -1 }, 'N'],
  ] as const)('maps the step %o to %s', (delta, direction) => {
    expect(directionBetween({ x: 5, y: 5 }, { x: 5 + delta.x, y: 5 + delta.y })).toBe(direction);
  });
});

describe('planRoute (FR-011)', () => {
  it('is findPath without the origin', () => {
    const from = { x: 8, y: 11 };
    const to = { x: 13, y: 7 };
    const found = findPath(world.walk, from, to);
    expect(found.ok).toBe(true);
    expect(planRoute(world, from, to)).toEqual(found.ok ? found.path.slice(1) : null);
  });

  it('is empty when origin and destination are the same walkable tile', () => {
    expect(planRoute(world, { x: 9, y: 6 }, { x: 9, y: 6 })).toEqual([]);
  });

  it.each([
    ['blocked', { x: 3, y: 5 }],
    ['out of bounds', { x: 40, y: 2 }],
  ])('is null when the destination is %s', (_label, to) => {
    expect(planRoute(world, { x: 9, y: 6 }, to)).toBeNull();
  });

  it('is null when there is no connection', () => {
    const walk = world.walk.map((row, y) =>
      row.map((_, x) => (x === 9 && y === 6) || (x === 13 && y === 7)),
    );
    expect(planRoute({ ...world, walk }, { x: 9, y: 6 }, { x: 13, y: 7 })).toBeNull();
  });
});

describe('advanceMovement (FR-012, FR-013)', () => {
  it('moves at 2 tiles per second: halfway after 250 ms, on the next tile after 500 ms', () => {
    expect(STEP_DURATION_MS).toBe(500);
    const agent = walker([
      { x: 9, y: 6 },
      { x: 10, y: 6 },
      { x: 11, y: 6 },
    ]);
    expect(agentPosition(advance(agent, 250).agent)).toEqual({ x: 9.5, y: 6 });
    const later = advance(agent, 500).agent;
    expect(later.tile).toEqual({ x: 10, y: 6 });
    expect(later.next).toEqual({ x: 11, y: 6 });
    expect(later.stepMs).toBe(0);
  });

  it('stays on the segment between consecutive tiles and turns only at tile boundaries', () => {
    const path = [
      { x: 9, y: 6 },
      { x: 10, y: 6 },
      { x: 10, y: 7 },
      { x: 10, y: 8 },
    ];
    const { positions } = advance(walker(path), 1500);
    for (const p of positions) {
      expect(Number.isInteger(p.x) || Number.isInteger(p.y)).toBe(true);
    }
    expect(positions).toContainEqual({ x: 10, y: 6 });
    expect(positions).not.toContainEqual(expect.objectContaining({ x: 9.8, y: 6.2 }));
  });

  it('faces the direction of the current step', () => {
    const path = [
      { x: 9, y: 6 },
      { x: 10, y: 6 },
      { x: 10, y: 7 },
    ];
    const agent = walker(path);
    expect(agent.facing).toBe('E');
    expect(advance(agent, 500).agent.facing).toBe('S');
  });

  it('reports the arrival on the step that reaches the last tile and stops', () => {
    const path = [
      { x: 9, y: 6 },
      { x: 10, y: 6 },
      { x: 11, y: 6 },
    ];
    expect(advance(walker(path), 990).arrived).toBe(false);
    const done = advance(walker(path), 1000);
    expect(done.arrived).toBe(true);
    expect(done.agent).toMatchObject({ tile: { x: 11, y: 6 }, next: null, route: [], stepMs: 0 });
    expect(advanceMovement(done.agent, 10)).toEqual({ agent: done.agent, arrived: false });
  });
});
