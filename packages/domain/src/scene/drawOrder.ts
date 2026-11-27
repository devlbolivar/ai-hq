import type { OfficeLayout, OfficeObject } from '../types';

type SortKey = readonly [front: number, back: number, z: number, id: string];

/** `(xMax + yMax, xMin + yMin, z, id)` — research R4. */
function sortKey(obj: OfficeObject): SortKey {
  const { origin, size } = obj;
  const back = origin.x + origin.y;
  const front = back + size.w - 1 + size.h - 1;
  return [front, back, obj.z, obj.id];
}

function compare(a: SortKey, b: SortKey): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0);
}

/** Object ids from back to front (FR-012); independent of the order of `layout.objects`. */
export function drawOrder(layout: OfficeLayout): string[] {
  return layout.objects
    .map(sortKey)
    .sort(compare)
    .map((key) => key[3]);
}
