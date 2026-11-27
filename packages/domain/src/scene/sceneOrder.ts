import type { GridPosition } from '../agents/types';
import type { Coord, HoverTarget, OfficeLayout, OfficeObject } from '../types';
import { footprint } from './walkability';

/** Where a character is drawn this frame (data-model.md "CharacterPlacement"). */
export interface CharacterPlacement {
  readonly id: string;
  /** Position in the team (0-based); breaks full ties: the higher index is drawn in front. */
  readonly teamIndex: number;
  readonly position: GridPosition;
  readonly tile: Coord;
  readonly next: Coord | null;
}

export type SceneItem =
  | { readonly type: 'object'; readonly id: string }
  | { readonly type: 'agent'; readonly id: string };

export type SceneHoverTarget = HoverTarget | { readonly type: 'agent'; readonly id: string };

/** `(front, back, z, idTiebreak, sub, depth, teamIndex)` — research R10. */
type SortKey = readonly [number, number, number, string, number, number, number];

/** Sorts after every object id. */
const AFTER_ALL_IDS = '￿';

function objectKey(obj: OfficeObject): SortKey {
  const back = obj.origin.x + obj.origin.y;
  const front = back + obj.size.w - 1 + obj.size.h - 1;
  return [front, back, obj.z, obj.id, 0, 0, 0];
}

/** Floor objects a person can stand on (chair, sofa): the character is drawn right after them. */
function isSeat(obj: OfficeObject): boolean {
  return !obj.blocking && !obj.wallMounted && obj.z === 0;
}

function compareKeys(a: SortKey, b: SortKey): number {
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

/** Objects and characters from back to front (FR-023); objects keep the 001 order. */
export function sceneOrder(
  layout: OfficeLayout,
  characters: readonly CharacterPlacement[],
): SceneItem[] {
  const seatAt = new Map<string, OfficeObject>();
  for (const obj of layout.objects) {
    if (!isSeat(obj)) continue;
    for (const t of footprint(obj)) seatAt.set(`${t.x},${t.y}`, obj);
  }

  const items: { item: SceneItem; key: SortKey }[] = layout.objects.map((obj) => ({
    item: { type: 'object', id: obj.id },
    key: objectKey(obj),
  }));

  for (const c of characters) {
    const ref = c.next && c.next.x + c.next.y > c.tile.x + c.tile.y ? c.next : c.tile;
    const depth = c.position.x + c.position.y;
    const seat = seatAt.get(`${ref.x},${ref.y}`);
    const base = seat
      ? objectKey(seat)
      : ([ref.x + ref.y, ref.x + ref.y, 0, AFTER_ALL_IDS] as const);
    items.push({
      item: { type: 'agent', id: c.id },
      key: [base[0], base[1], base[2], base[3], 1, depth, c.teamIndex],
    });
  }

  return items.sort((a, b) => compareKeys(a.key, b.key)).map((entry) => entry.item);
}
