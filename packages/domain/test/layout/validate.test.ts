import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { validateLayout } from '../../src/layout/validate';
import type { LayoutError, LayoutErrorCode, OfficeLayout, OfficeObject } from '../../src/types';
import { makeObject } from '../fixtures/layouts';

function patchObject(
  layout: OfficeLayout,
  id: string,
  patch: (o: OfficeObject) => OfficeObject,
): OfficeLayout {
  return { ...layout, objects: layout.objects.map((o) => (o.id === id ? patch(o) : o)) };
}

function addObjects(layout: OfficeLayout, ...objects: OfficeObject[]): OfficeLayout {
  return { ...layout, objects: [...layout.objects, ...objects] };
}

function errorsOf(layout: OfficeLayout): readonly LayoutError[] {
  const result = validateLayout(layout);
  if (result.ok) throw new Error('expected the layout to be rejected');
  return result.errors;
}

function only(layout: OfficeLayout, code: LayoutErrorCode): LayoutError {
  const errors = errorsOf(layout);
  expect(errors.map((e) => e.code)).toEqual([code]);
  return errors[0]!;
}

describe('validateLayout (FR-008, FR-009b)', () => {
  it('accepts the Marketing layout', () => {
    expect(validateLayout(marketingLayout)).toEqual({ ok: true });
  });

  it('OUT_OF_BOUNDS: object footprint outside the grid', () => {
    const e = only(
      addObjects(
        marketingLayout,
        makeObject({ id: 'plant-x', origin: { x: 15, y: 5 }, size: { w: 2, h: 1 } }),
      ),
      'OUT_OF_BOUNDS',
    );
    expect(e.objectId).toBe('plant-x');
    expect(e.tile).toEqual({ x: 16, y: 5 });
    expect(e.message).toContain('plant-x');
  });

  it('OUT_OF_BOUNDS: zone area outside the grid', () => {
    const layout: OfficeLayout = {
      ...marketingLayout,
      zones: [
        ...marketingLayout.zones,
        {
          id: 'lobby',
          name: 'Recepción',
          area: { origin: { x: 14, y: 10 }, size: { w: 3, h: 3 } },
        },
      ],
    };
    expect(only(layout, 'OUT_OF_BOUNDS').objectId).toBe('lobby');
  });

  it('OUT_OF_BOUNDS: entrance outside the grid', () => {
    const e = errorsOf({ ...marketingLayout, entrance: { x: 8, y: 12 } })[0]!;
    expect(e.code).toBe('OUT_OF_BOUNDS');
    expect(e.tile).toEqual({ x: 8, y: 12 });
  });

  it('DUPLICATE_ID: two objects with the same id', () => {
    const e = only(
      addObjects(marketingLayout, makeObject({ id: 'plant-1', origin: { x: 9, y: 3 } })),
      'DUPLICATE_ID',
    );
    expect(e.objectId).toBe('plant-1');
    expect(e.message).toContain('plant-1');
  });

  it('DUPLICATE_ID: two zones with the same id', () => {
    const layout: OfficeLayout = {
      ...marketingLayout,
      zones: [...marketingLayout.zones, marketingLayout.zones[0]!],
    };
    expect(only(layout, 'DUPLICATE_ID').objectId).toBe('desks');
  });

  it('BLOCKING_OVERLAP: two blocking objects share a tile', () => {
    const e = only(
      addObjects(marketingLayout, makeObject({ id: 'plant-x', origin: { x: 3, y: 5 } })),
      'BLOCKING_OVERLAP',
    );
    expect(e.objectId).toBe('plant-x');
    expect(e.tile).toEqual({ x: 3, y: 5 });
    expect(e.message).toContain('desk-1');
  });

  it('allows a non-blocking object on a blocking one (monitor on desk)', () => {
    expect(validateLayout(marketingLayout).ok).toBe(true);
  });

  it('ENTRANCE_BLOCKED: entrance on a blocking object', () => {
    const e = errorsOf({ ...marketingLayout, entrance: { x: 15, y: 0 } });
    expect(e.map((x) => x.code)).toEqual(['ENTRANCE_BLOCKED']);
    expect(e[0]!.tile).toEqual({ x: 15, y: 0 });
  });

  it('USE_POINT_BLOCKED: use point on a blocked tile', () => {
    const layout = patchObject(marketingLayout, 'coffee-machine', (o) => ({
      ...o,
      usePoints: [{ tile: { x: 14, y: 7 }, facing: 'E' }],
    }));
    const e = only(layout, 'USE_POINT_BLOCKED');
    expect(e.objectId).toBe('coffee-machine');
    expect(e.tile).toEqual({ x: 14, y: 7 });
    expect(e.message).toContain('coffee-machine');
  });

  it('USE_POINT_UNREACHABLE: walkable use point enclosed away from the entrance', () => {
    // (15,1) is closed by the wall (15,0) and two extra plants at (14,1) and (15,2).
    let layout = addObjects(
      marketingLayout,
      makeObject({ id: 'plant-a', origin: { x: 14, y: 1 } }),
      makeObject({ id: 'plant-b', origin: { x: 15, y: 2 } }),
    );
    layout = patchObject(layout, 'coffee-machine', (o) => ({
      ...o,
      usePoints: [{ tile: { x: 15, y: 1 }, facing: 'N' }],
    }));
    const e = only(layout, 'USE_POINT_UNREACHABLE');
    expect(e.objectId).toBe('coffee-machine');
    expect(e.tile).toEqual({ x: 15, y: 1 });
  });

  it('MISSING_NETWORK: screen without network', () => {
    const layout = patchObject(marketingLayout, 'screen-x', ({ network: _n, ...rest }) => rest);
    expect(only(layout, 'MISSING_NETWORK').objectId).toBe('screen-x');
  });

  it('DESK_USE_POINT: desk use point not on its chair', () => {
    const layout = patchObject(marketingLayout, 'desk-2', (o) => ({
      ...o,
      usePoints: [{ tile: { x: 4, y: 6 }, facing: 'N' }],
    }));
    expect(only(layout, 'DESK_USE_POINT').objectId).toBe('desk-2');
  });

  it('DESK_USE_POINT: desk with more than one use point', () => {
    const layout = patchObject(marketingLayout, 'desk-5', (o) => ({
      ...o,
      usePoints: [...o.usePoints, { tile: { x: 4, y: 9 }, facing: 'N' }],
    }));
    expect(only(layout, 'DESK_USE_POINT').objectId).toBe('desk-5');
  });

  it('DESK_USE_POINT: desk without a chair', () => {
    const layout: OfficeLayout = {
      ...marketingLayout,
      objects: marketingLayout.objects.filter((o) => o.id !== 'chair-3'),
    };
    expect(only(layout, 'DESK_USE_POINT').objectId).toBe('desk-3');
  });

  it('BAD_ATTACHMENT: attachedTo points to a missing id', () => {
    const layout = patchObject(marketingLayout, 'monitor-1', (o) => ({
      ...o,
      attachedTo: 'desk-99',
    }));
    const e = only(layout, 'BAD_ATTACHMENT');
    expect(e.objectId).toBe('monitor-1');
    expect(e.message).toContain('desk-99');
  });

  it('reports every error together instead of stopping at the first one', () => {
    let layout = patchObject(marketingLayout, 'screen-x', ({ network: _n, ...rest }) => rest);
    layout = patchObject(layout, 'monitor-1', (o) => ({ ...o, attachedTo: 'desk-99' }));
    layout = addObjects(layout, makeObject({ id: 'plant-x', origin: { x: 20, y: 1 } }));
    expect(
      errorsOf(layout)
        .map((e) => e.code)
        .sort(),
    ).toEqual(['BAD_ATTACHMENT', 'MISSING_NETWORK', 'OUT_OF_BOUNDS']);
  });

  it('accepts a new plant added only through layout data (SC-006)', () => {
    const layout = addObjects(
      marketingLayout,
      makeObject({ id: 'plant-4', origin: { x: 9, y: 3 } }),
    );
    expect(validateLayout(layout)).toEqual({ ok: true });
  });
});
