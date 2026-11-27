import { footprint, type AgentRuntime, type OfficeLayout } from '@ai-hq/domain';
import type { Pose } from './shapes';

export interface PoseInfo {
  readonly pose: Pose;
  /** Sitting on a chair or the sofa (US3-4: coffee standing at the machine, seated on the sofa). */
  readonly seated: boolean;
}

function onSeat(agent: AgentRuntime, layout: OfficeLayout): boolean {
  return layout.objects.some(
    (o) =>
      (o.kind === 'chair' || o.kind === 'sofa') &&
      footprint(o).some((t) => t.x === agent.tile.x && t.y === agent.tile.y),
  );
}

/** Animation of an agent from its state (FR-024); facing comes from `AgentRuntime.facing`. */
export function poseFor(agent: AgentRuntime, layout: OfficeLayout): PoseInfo {
  if (agent.next !== null || agent.status === 'walking') return { pose: 'walk', seated: false };
  const seated = onSeat(agent, layout);
  if (agent.status === 'working')
    return { pose: agent.celebrateMs > 0 ? 'celebrate' : 'type', seated };
  if (agent.status === 'break') return { pose: 'coffee', seated };
  return { pose: 'idle', seated };
}
