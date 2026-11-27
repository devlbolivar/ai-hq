import type { Point } from '@ai-hq/domain';

/** Duration of the smooth centering when an agent is selected (≤ 500 ms, FR-028). */
export const FOLLOW_MS = 400;

/** Offset `elapsedMs` into the transition from `start` toward `target`, with a cubic ease-out. */
export function followOffset(start: Point, target: Point, elapsedMs: number): Point {
  if (elapsedMs >= FOLLOW_MS) return target;
  const p = Math.max(0, elapsedMs) / FOLLOW_MS;
  const eased = 1 - (1 - p) ** 3;
  return { x: start.x + (target.x - start.x) * eased, y: start.y + (target.y - start.y) * eased };
}
