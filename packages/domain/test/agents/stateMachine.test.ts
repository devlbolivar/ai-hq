import { describe, expect, it } from 'vitest';
import {
  AGENT_STATUSES,
  isActivityStatus,
  transition,
  type ActivityStatus,
  type AgentStatus,
  type TransitionRejection,
  type TransitionTrigger,
} from '../../src/agents/stateMachine';

const statuses = ['idle', 'walking', 'working', 'meeting', 'break', 'waiting_review'] as const;
type TriggerType = TransitionTrigger['type'];

// Rows and columns both follow the contract's status order.
const allowed = [
  [[], ['walk-to'], ['start-activity'], ['start-activity'], ['start-activity'], ['start-activity']],
  [['arrive', 'cancel'], ['walk-to'], ['arrive'], ['arrive'], ['arrive'], ['arrive']],
  [['cancel', 'finish'], ['walk-to'], [], [], [], []],
  [['cancel', 'finish'], ['walk-to'], [], [], [], []],
  [['cancel', 'finish'], ['walk-to'], [], [], [], []],
  [['cancel', 'finish'], ['walk-to'], [], [], [], []],
] satisfies readonly (readonly (readonly TriggerType[])[])[];

type TriggerCase = readonly [TransitionTrigger, TransitionRejection?];

function arrivalCases(activity: ActivityStatus | null): TriggerCase[] {
  return [
    [{ type: 'arrive', activity, atTarget: true }],
    [{ type: 'arrive', activity, atTarget: false }, 'NOT_ARRIVED'],
  ];
}

function activityCases(activity: ActivityStatus): TriggerCase[] {
  return [
    [{ type: 'start-activity', activity, onFreeUsePoint: true }],
    [{ type: 'start-activity', activity, onFreeUsePoint: false }, 'NOT_ON_FREE_USE_POINT'],
    ...arrivalCases(activity),
  ];
}

const triggersByTarget: Record<AgentStatus, readonly TriggerCase[]> = {
  idle: [[{ type: 'cancel' }], [{ type: 'finish' }], ...arrivalCases(null)],
  walking: [
    [{ type: 'walk-to', reachable: true }],
    [{ type: 'walk-to', reachable: false }, 'UNREACHABLE'],
  ],
  working: activityCases('working'),
  meeting: activityCases('meeting'),
  break: activityCases('break'),
  waiting_review: activityCases('waiting_review'),
};

const pairs = statuses.flatMap((from, row) =>
  statuses.map((to, column) => {
    const accepted: readonly TriggerType[] = allowed[row]![column]!;
    return { from, to, accepted };
  }),
);

describe('agent statuses', () => {
  it('lists all statuses in contract order', () => {
    expect(AGENT_STATUSES).toEqual(statuses);
  });

  it.each(statuses)('classifies %s', (status) => {
    expect(isActivityStatus(status)).toBe(status !== 'idle' && status !== 'walking');
  });
});

describe('transition', () => {
  it.each(pairs)('$from -> $to', ({ from, to, accepted }) => {
    for (const [trigger, unmetCondition] of triggersByTarget[to]) {
      const reason = accepted.includes(trigger.type) ? unmetCondition : 'INVALID_TRANSITION';
      expect(transition(from, trigger), JSON.stringify(trigger)).toEqual(
        reason ? { ok: false, reason } : { ok: true, status: to },
      );
    }
  });
});
