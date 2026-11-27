export type AgentStatus = 'idle' | 'walking' | 'working' | 'meeting' | 'break' | 'waiting_review';
export type ActivityStatus = 'working' | 'meeting' | 'break' | 'waiting_review';

export const AGENT_STATUSES: readonly AgentStatus[] = [
  'idle',
  'walking',
  'working',
  'meeting',
  'break',
  'waiting_review',
];

export function isActivityStatus(s: AgentStatus): s is ActivityStatus {
  return s !== 'idle' && s !== 'walking';
}

export type TransitionTrigger =
  | { type: 'walk-to'; reachable: boolean }
  | { type: 'start-activity'; activity: ActivityStatus; onFreeUsePoint: boolean }
  | { type: 'arrive'; activity: ActivityStatus | null; atTarget: boolean }
  | { type: 'cancel' }
  | { type: 'finish' };

export type TransitionRejection =
  'INVALID_TRANSITION' | 'UNREACHABLE' | 'NOT_ON_FREE_USE_POINT' | 'NOT_ARRIVED';

export type TransitionResult =
  { ok: true; status: AgentStatus } | { ok: false; reason: TransitionRejection };

export function transition(from: AgentStatus, trigger: TransitionTrigger): TransitionResult {
  switch (trigger.type) {
    case 'walk-to':
      return trigger.reachable
        ? { ok: true, status: 'walking' }
        : { ok: false, reason: 'UNREACHABLE' };
    case 'start-activity':
      if (from !== 'idle') break;
      return trigger.onFreeUsePoint
        ? { ok: true, status: trigger.activity }
        : { ok: false, reason: 'NOT_ON_FREE_USE_POINT' };
    case 'arrive':
      if (from !== 'walking') break;
      return trigger.atTarget
        ? { ok: true, status: trigger.activity ?? 'idle' }
        : { ok: false, reason: 'NOT_ARRIVED' };
    case 'cancel':
      if (from !== 'idle') return { ok: true, status: 'idle' };
      break;
    case 'finish':
      if (isActivityStatus(from)) return { ok: true, status: 'idle' };
      break;
  }

  return { ok: false, reason: 'INVALID_TRANSITION' };
}
