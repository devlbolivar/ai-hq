import type { OfficeLayout, OfficeObject } from '../../src/types';

/** Minimal valid layout used by unit tests that do not depend on Marketing data. */
export function makeLayout(overrides: Partial<OfficeLayout> = {}): OfficeLayout {
  return {
    departmentId: 'test',
    departmentName: 'Test',
    grid: { cols: 16, rows: 12 },
    tile: { width: 64, height: 32 },
    entrance: { x: 8, y: 11 },
    zones: [],
    objects: [],
    ...overrides,
  };
}

export function makeObject(
  overrides: Partial<OfficeObject> & Pick<OfficeObject, 'id'>,
): OfficeObject {
  return {
    kind: 'plant',
    name: 'Planta',
    origin: { x: 1, y: 1 },
    size: { w: 1, h: 1 },
    height: 40,
    z: 0,
    blocking: true,
    wallMounted: false,
    usePoints: [],
    ...overrides,
  };
}
