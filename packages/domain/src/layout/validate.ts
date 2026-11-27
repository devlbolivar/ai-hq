import { footprint, isWalkable, reachableFrom, walkability } from '../scene/walkability';
import type { Coord, GridSize, LayoutError, OfficeLayout, ValidationResult } from '../types';

const fmt = (t: Coord) => `(${t.x},${t.y})`;

function inGrid(t: Coord, grid: GridSize): boolean {
  return t.x >= 0 && t.y >= 0 && t.x < grid.cols && t.y < grid.rows;
}

/** Ids must be unique among objects and, separately, among zones. */
function checkIds(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  const objectIds = new Set<string>();
  for (const obj of layout.objects) {
    if (objectIds.has(obj.id)) {
      errors.push({
        code: 'DUPLICATE_ID',
        objectId: obj.id,
        message: `Hay más de un objeto con el id "${obj.id}".`,
      });
    }
    objectIds.add(obj.id);
  }
  const zoneIds = new Set<string>();
  for (const zone of layout.zones) {
    if (zoneIds.has(zone.id)) {
      errors.push({
        code: 'DUPLICATE_ID',
        objectId: zone.id,
        message: `Hay más de una zona con el id "${zone.id}".`,
      });
    }
    zoneIds.add(zone.id);
  }
  return errors;
}

/** Objects, zones and the entrance must lie inside the grid. */
function checkBounds(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  const { grid } = layout;
  for (const obj of layout.objects) {
    const outside = footprint(obj).find((t) => !inGrid(t, grid));
    if (outside) {
      errors.push({
        code: 'OUT_OF_BOUNDS',
        objectId: obj.id,
        tile: outside,
        message: `El objeto "${obj.id}" ocupa el tile ${fmt(outside)}, fuera de la cuadrícula.`,
      });
    }
  }
  for (const zone of layout.zones) {
    const { origin, size } = zone.area;
    const corner = { x: origin.x + size.w - 1, y: origin.y + size.h - 1 };
    const outside = !inGrid(origin, grid) ? origin : !inGrid(corner, grid) ? corner : null;
    if (outside) {
      errors.push({
        code: 'OUT_OF_BOUNDS',
        objectId: zone.id,
        tile: outside,
        message: `La zona "${zone.id}" llega al tile ${fmt(outside)}, fuera de la cuadrícula.`,
      });
    }
  }
  if (!inGrid(layout.entrance, grid)) {
    errors.push({
      code: 'OUT_OF_BOUNDS',
      tile: layout.entrance,
      message: `La entrada ${fmt(layout.entrance)} está fuera de la cuadrícula.`,
    });
  }
  return errors;
}

/** Two blocking objects must not share a tile. */
function checkBlockingOverlaps(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  const occupant = new Map<string, string>();
  for (const obj of layout.objects) {
    if (!obj.blocking) continue;
    for (const t of footprint(obj)) {
      const key = `${t.x},${t.y}`;
      const other = occupant.get(key);
      if (other !== undefined && other !== obj.id) {
        errors.push({
          code: 'BLOCKING_OVERLAP',
          objectId: obj.id,
          tile: t,
          message: `Los objetos "${other}" y "${obj.id}" bloquean el mismo tile ${fmt(t)}.`,
        });
      } else {
        occupant.set(key, obj.id);
      }
    }
  }
  return errors;
}

/** Screens name their network; attachments point to an existing object. */
function checkScreensAndAttachments(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  const objectIds = new Set(layout.objects.map((o) => o.id));
  for (const obj of layout.objects) {
    if (obj.kind === 'screen' && !obj.network) {
      errors.push({
        code: 'MISSING_NETWORK',
        objectId: obj.id,
        message: `La pantalla "${obj.id}" no indica su red social.`,
      });
    }
    if (obj.attachedTo !== undefined && !objectIds.has(obj.attachedTo)) {
      errors.push({
        code: 'BAD_ATTACHMENT',
        objectId: obj.id,
        message: `El objeto "${obj.id}" está asociado a "${obj.attachedTo}", que no existe.`,
      });
    }
  }
  return errors;
}

const needsUsePoint = new Set(['meeting-table', 'coffee-machine', 'sofa', 'whiteboard']);

function checkRequiredUsePoints(layout: OfficeLayout): LayoutError[] {
  return layout.objects
    .filter((obj) => needsUsePoint.has(obj.kind) && obj.usePoints.length === 0)
    .map((obj) => ({
      code: 'MISSING_USE_POINT',
      objectId: obj.id,
      message: `El objeto "${obj.id}" debe tener al menos un punto de uso.`,
    }));
}

/** Each desk has exactly one use point, on its chair. */
function checkDeskUsePoints(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  for (const desk of layout.objects.filter((o) => o.kind === 'desk')) {
    const chair = layout.objects.find((o) => o.kind === 'chair' && o.attachedTo === desk.id);
    const [usePoint, ...extra] = desk.usePoints;
    const onChair =
      chair !== undefined &&
      usePoint !== undefined &&
      extra.length === 0 &&
      usePoint.tile.x === chair.origin.x &&
      usePoint.tile.y === chair.origin.y;
    if (!onChair) {
      errors.push({
        code: 'DESK_USE_POINT',
        objectId: desk.id,
        message: chair
          ? `El escritorio "${desk.id}" debe tener exactamente un punto de uso, sobre su silla ${fmt(chair.origin)}.`
          : `El escritorio "${desk.id}" no tiene silla para su punto de uso.`,
      });
    }
  }
  return errors;
}

/** The entrance is walkable and every use point is walkable and reachable from it. */
function checkWalkability(layout: OfficeLayout): LayoutError[] {
  const errors: LayoutError[] = [];
  const walk = walkability(layout);
  const entranceInGrid = inGrid(layout.entrance, layout.grid);
  const entranceWalkable = entranceInGrid && isWalkable(walk, layout.entrance);
  if (entranceInGrid && !entranceWalkable) {
    errors.push({
      code: 'ENTRANCE_BLOCKED',
      tile: layout.entrance,
      message: `La entrada ${fmt(layout.entrance)} no es caminable.`,
    });
  }
  const reach = entranceWalkable ? reachableFrom(walk, layout.entrance) : null;
  for (const obj of layout.objects) {
    for (const { tile } of obj.usePoints) {
      if (!isWalkable(walk, tile)) {
        errors.push({
          code: 'USE_POINT_BLOCKED',
          objectId: obj.id,
          tile,
          message: `El punto de uso ${fmt(tile)} de "${obj.id}" no es caminable.`,
        });
      } else if (reach && !reach[tile.y]?.[tile.x]) {
        errors.push({
          code: 'USE_POINT_UNREACHABLE',
          objectId: obj.id,
          tile,
          message: `El punto de uso ${fmt(tile)} de "${obj.id}" no se puede alcanzar desde la entrada.`,
        });
      }
    }
  }
  return errors;
}

const CHECKS = [
  checkIds,
  checkBounds,
  checkBlockingOverlaps,
  checkScreensAndAttachments,
  checkRequiredUsePoints,
  checkDeskUsePoints,
  checkWalkability,
] as const;

/** Validates a layout and reports every problem at once (FR-008, FR-009a, FR-009b). */
export function validateLayout(layout: OfficeLayout): ValidationResult {
  const errors = CHECKS.flatMap((check) => check(layout));
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
