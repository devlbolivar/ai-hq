import { validateLayout } from '../layout/validate';
import { walkability } from '../scene/walkability';
import type { OfficeLayout } from '../types';
import { BREAK_MS, CELEBRATE_MS, chooseAutonomousTarget, IDLE_PAUSE_MS, WORK_MS } from './autonomy';
import { sendAgent } from './dispatch';
import { advanceMovement } from './movement';
import { randomInt, seedRng, type RngState } from './rng';
import { transition, type AgentStatus } from './stateMachine';
import type { AgentProfile, AgentRuntime, SimWorld, Simulation } from './types';
import { activityStatus, resolveUsePoint, usePointKey } from './usePoints';
import { validateTeam } from './validate';

/** Fixed simulated step (research R6). */
export const SIM_STEP_MS = 10;
/** At most this much simulated time per rendered frame (FR-015). */
export const MAX_FRAME_MS = 250;

function duplicateUsePointTiles(layout: OfficeLayout): string[] {
  const owner = new Map<string, string>();
  const messages: string[] = [];
  for (const obj of layout.objects) {
    obj.usePoints.forEach((point, index) => {
      const tile = `${point.tile.x},${point.tile.y}`;
      const key = usePointKey({ objectId: obj.id, index });
      const first = owner.get(tile);
      if (first) messages.push(`Los puntos de uso ${first} y ${key} comparten el tile (${tile}).`);
      else owner.set(tile, key);
    });
  }
  return messages;
}

/** Validated, immutable context of a simulation; throws listing every problem. */
export function createSimWorld(layout: OfficeLayout, team: readonly AgentProfile[]): SimWorld {
  const layoutResult = validateLayout(layout);
  const teamResult = validateTeam(team, layout);
  const messages = [
    ...(layoutResult.ok ? [] : layoutResult.errors.map((e) => e.message)),
    ...(teamResult.ok ? [] : teamResult.errors.map((e) => e.message)),
    ...duplicateUsePointTiles(layout),
  ];
  if (messages.length > 0) {
    throw new Error(`Datos de la oficina inválidos:\n${messages.map((m) => `- ${m}`).join('\n')}`);
  }
  return { layout, walk: walkability(layout), team };
}

/** Everyone idle on their desk point with its reservation and a drawn idle pause (FR-007). */
export function createSimulation(world: SimWorld, seed: number): Simulation {
  let rng = seedRng(seed);
  const agents = world.team.map((profile): AgentRuntime => {
    const reservation = { objectId: profile.deskId, index: 0 };
    const point = resolveUsePoint(world.layout, reservation);
    const [pause, next] = randomInt(rng, IDLE_PAUSE_MS[0], IDLE_PAUSE_MS[1]);
    rng = next;
    return {
      id: profile.id,
      status: 'idle',
      tile: point.tile,
      next: null,
      stepMs: 0,
      route: [],
      facing: point.facing,
      target: null,
      reservation,
      forced: false,
      timerMs: pause,
      celebrateMs: 0,
    };
  });
  return { timeMs: 0, rng, agents };
}

/**
 * Seed with which every agent completes an autonomous cycle within the first 60 s (FR-019, SC-005);
 * documented in quickstart.md.
 */
export const ACCEPTANCE_SEED = 1;

/** Mutable per-step context: the PRNG is consumed in team order. */
interface StepContext {
  rng: RngState;
  world: SimWorld;
  /** Agents of this step so far: earlier agents already updated (they reserve first). */
  agents: AgentRuntime[];
  timeMs: number;
}

/** The idle pause ran out: pick an autonomous target and go (or start in place). */
function decide(agent: AgentRuntime, ctx: StepContext): AgentRuntime {
  const view: Simulation = { timeMs: ctx.timeMs, rng: ctx.rng, agents: ctx.agents };
  const { target, rng } = chooseAutonomousTarget(view, ctx.world, agent.id);
  ctx.rng = rng;
  const sent = target ? sendAgent(agent, ctx.world, target, false) : null;
  if (sent === null) return { ...agent, timerMs: draw(ctx, IDLE_PAUSE_MS) };
  return sent.next === null ? { ...sent, timerMs: timerFor(sent.status, false, ctx) } : sent;
}

function draw(ctx: StepContext, [min, max]: readonly [number, number]): number {
  const [value, next] = randomInt(ctx.rng, min, max);
  ctx.rng = next;
  return value;
}

/** Timer for a new status: activity duration or idle pause; none for forced agents. */
function timerFor(status: AgentStatus, forced: boolean, ctx: StepContext): number | null {
  if (forced) return null;
  if (status === 'idle') return draw(ctx, IDLE_PAUSE_MS);
  if (status === 'working') return draw(ctx, WORK_MS);
  if (status === 'break') return draw(ctx, BREAK_MS);
  return null;
}

function arrive(agent: AgentRuntime, ctx: StepContext): AgentRuntime {
  const target = agent.target;
  const activity = target?.activity ? activityStatus(target.activity) : null;
  const atTarget =
    target === null || (target.tile.x === agent.tile.x && target.tile.y === agent.tile.y);
  const result = transition(agent.status, { type: 'arrive', activity, atTarget });
  if (!result.ok) return agent;
  return {
    ...agent,
    status: result.status,
    facing: target?.facing ?? agent.facing,
    target: result.status === 'idle' ? null : target,
    timerMs: timerFor(result.status, agent.forced, ctx),
    celebrateMs: 0,
  };
}

function finish(agent: AgentRuntime, ctx: StepContext): AgentRuntime {
  const result = transition(agent.status, { type: 'finish' });
  if (!result.ok) return agent;
  return {
    ...agent,
    status: result.status,
    target: null,
    celebrateMs: 0,
    timerMs: timerFor(result.status, agent.forced, ctx),
  };
}

function stepAgent(agent: AgentRuntime, ctx: StepContext): AgentRuntime {
  if (agent.next !== null) {
    const moved = advanceMovement(agent, SIM_STEP_MS);
    return moved.arrived ? arrive(moved.agent, ctx) : moved.agent;
  }
  if (agent.celebrateMs > 0) {
    const celebrateMs = agent.celebrateMs - SIM_STEP_MS;
    return celebrateMs > 0 ? { ...agent, celebrateMs } : finish(agent, ctx);
  }
  if (agent.timerMs === null || agent.forced) return agent;

  const timerMs = agent.timerMs - SIM_STEP_MS;
  if (timerMs > 0) return { ...agent, timerMs };
  if (agent.status === 'working') return { ...agent, timerMs: null, celebrateMs: CELEBRATE_MS };
  if (agent.status === 'idle') return decide({ ...agent, timerMs: null }, ctx);
  return finish(agent, ctx);
}

/** Advances exactly SIM_STEP_MS, processing agents in team order. */
export function stepSimulation(sim: Simulation, world: SimWorld): Simulation {
  const ctx: StepContext = { rng: sim.rng, world, agents: [...sim.agents], timeMs: sim.timeMs };
  ctx.agents.forEach((agent, i) => {
    ctx.agents[i] = stepAgent(agent, ctx);
  });
  return { timeMs: sim.timeMs + SIM_STEP_MS, rng: ctx.rng, agents: ctx.agents };
}

/** Fixed-step clock: clips the frame, runs whole steps and returns the remainder (FR-015). */
export function advanceFrame(
  sim: Simulation,
  world: SimWorld,
  accumulatorMs: number,
  frameDtMs: number,
): { sim: Simulation; accumulatorMs: number } {
  let total = accumulatorMs + Math.min(Math.max(frameDtMs, 0), MAX_FRAME_MS);
  let current = sim;
  while (total >= SIM_STEP_MS) {
    current = stepSimulation(current, world);
    total -= SIM_STEP_MS;
  }
  return { sim: current, accumulatorMs: total };
}

export function agentById(sim: Simulation, id: string): AgentRuntime | undefined {
  return sim.agents.find((agent) => agent.id === id);
}
