import { footprint } from '../scene/walkability';
import type { ObjectKind, OfficeLayout, OfficeObject, SocialNetwork } from '../types';

const NETWORK_SYMBOL: Record<SocialNetwork, string> = {
  instagram: 'I',
  tiktok: 'T',
  youtube: 'Y',
  linkedin: 'L',
  x: 'X',
};

/** Symbol of an object on the FR-005b map; `null` = not drawn (monitors sit on desks). */
const OBJECT_SYMBOL: Record<Exclude<ObjectKind, 'screen'>, string | null> = {
  wall: 'W',
  whiteboard: 'P',
  desk: 'D',
  chair: 'c',
  monitor: null,
  plant: 'p',
  sofa: 'F',
  'meeting-table': 'M',
  'coffee-machine': 'K',
};

/** Symbol of an object's use points on the FR-005b map. */
const USE_POINT_SYMBOL: Partial<Record<ObjectKind, string>> = {
  whiteboard: 'b',
  desk: 'c',
  'meeting-table': 'm',
  'coffee-machine': 'k',
  sofa: 'F',
};

function objectSymbol(obj: OfficeObject): string | null {
  if (obj.kind === 'screen') return obj.network ? NETWORK_SYMBOL[obj.network] : '?';
  return OBJECT_SYMBOL[obj.kind];
}

/**
 * Renders a layout with the FR-005b legend: one row per line, symbols separated by spaces.
 * Precedence: floor `.` < use point < object < entrance `E`.
 */
export function renderLayoutAscii(layout: OfficeLayout): string {
  const { cols, rows } = layout.grid;
  const cells = Array.from({ length: rows }, () => Array<string>(cols).fill('.'));
  const put = (x: number, y: number, symbol: string) => {
    const row = cells[y];
    if (row && x >= 0 && x < cols) row[x] = symbol;
  };

  for (const obj of layout.objects) {
    const symbol = USE_POINT_SYMBOL[obj.kind];
    if (!symbol) continue;
    for (const up of obj.usePoints) put(up.tile.x, up.tile.y, symbol);
  }
  for (const obj of layout.objects) {
    const symbol = objectSymbol(obj);
    if (!symbol) continue;
    for (const t of footprint(obj)) put(t.x, t.y, symbol);
  }
  put(layout.entrance.x, layout.entrance.y, 'E');

  return cells.map((row) => row.join(' ')).join('\n');
}
