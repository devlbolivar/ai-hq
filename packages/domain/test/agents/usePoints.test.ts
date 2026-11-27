import { describe, expect, it } from 'vitest';
import {
  activityStatus,
  freeUsePointsFor,
  isReservedByOther,
  resolveUsePoint,
  usePointKey,
  usePointsFor,
} from '../../src/agents/usePoints';
import type { SimWorld } from '../../src/agents/types';
import { runtime, simOf, world } from './fixtures';

const coffee = { objectId: 'coffee-machine', index: 0 };
const sofa0 = { objectId: 'sofa', index: 0 };
const sofa1 = { objectId: 'sofa', index: 1 };

describe('use points (FR-009, FR-014, data-model.md UsePointRef)', () => {
  it('keys a reference as objectId#index', () => {
    expect(usePointKey(sofa1)).toBe('sofa#1');
  });

  it('resolves a reference to its tile and facing', () => {
    expect(resolveUsePoint(world.layout, coffee)).toEqual({ tile: { x: 13, y: 7 }, facing: 'E' });
  });

  it('lists the points of each activity in layout order', () => {
    expect(usePointsFor(world, 'copywriter', 'work')).toEqual([{ objectId: 'desk-3', index: 0 }]);
    expect(usePointsFor(world, 'copywriter', 'break')).toEqual([coffee, sofa0, sofa1]);
    expect(usePointsFor(world, 'copywriter', 'meeting')).toHaveLength(6);
    expect(usePointsFor(world, 'copywriter', 'review')).toEqual([
      { objectId: 'whiteboard', index: 0 },
    ]);
    expect(usePointsFor(world, 'copywriter', 'whiteboard')).toEqual([
      { objectId: 'whiteboard', index: 0 },
    ]);
    expect(usePointsFor(world, 'copywriter', 'wander')).toEqual([]);
  });

  it('returns no work point for an unknown agent', () => {
    expect(usePointsFor(world, 'nobody', 'work')).toEqual([]);
  });

  it('maps activities to the status reached on arrival', () => {
    expect(activityStatus('work')).toBe('working');
    expect(activityStatus('meeting')).toBe('meeting');
    expect(activityStatus('break')).toBe('break');
    expect(activityStatus('review')).toBe('waiting_review');
    expect(activityStatus('whiteboard')).toBeNull();
    expect(activityStatus('wander')).toBeNull();
  });

  it('sees a point reserved by another agent but not by itself', () => {
    const sim = simOf([runtime('a', { x: 13, y: 7 }, coffee), runtime('b', { x: 9, y: 6 })]);
    expect(isReservedByOther(sim, world, coffee, 'b')).toBe(true);
    expect(isReservedByOther(sim, world, coffee, 'a')).toBe(false);
    expect(isReservedByOther(sim, world, sofa0, 'b')).toBe(false);
  });

  it('compares reservations by resolved tile', () => {
    const twin: SimWorld = {
      ...world,
      layout: {
        ...world.layout,
        objects: world.layout.objects.map((o) =>
          o.id === 'sofa' ? { ...o, usePoints: [o.usePoints[0]!, o.usePoints[0]!] } : o,
        ),
      },
    };
    const sim = simOf([runtime('a', { x: 12, y: 10 }, sofa0), runtime('b', { x: 9, y: 6 })]);
    expect(isReservedByOther(sim, twin, sofa1, 'b')).toBe(true);
  });

  it('lists the free points of an activity for an agent', () => {
    const sim = simOf([runtime('a', { x: 13, y: 7 }, coffee), runtime('b', { x: 9, y: 6 })]);
    expect(freeUsePointsFor(sim, world, 'b', 'break')).toEqual([sofa0, sofa1]);
    expect(freeUsePointsFor(sim, world, 'a', 'break')).toEqual([coffee, sofa0, sofa1]);
  });
});
