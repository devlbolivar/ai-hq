export function selectByNumber(
  teamIds: readonly string[],
  current: string | null,
  n: number,
): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 9) return current;
  return teamIds[n - 1] ?? current;
}

export function cycleSelection(
  teamIds: readonly string[],
  current: string | null,
  direction: 1 | -1,
): string | null {
  const count = teamIds.length;
  if (count === 0) return null;

  const index = current === null ? -1 : teamIds.indexOf(current);
  const nextIndex =
    index === -1 ? (direction === 1 ? 0 : count - 1) : (index + direction + count) % count;
  return teamIds[nextIndex]!;
}
