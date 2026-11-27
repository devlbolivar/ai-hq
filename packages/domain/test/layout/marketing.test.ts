import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import type { ObjectKind, OfficeObject } from '../../src/types';

const objects = marketingLayout.objects;
const byId = new Map(objects.map((o) => [o.id, o]));
const ofKind = (kind: ObjectKind) => objects.filter((o) => o.kind === kind);
const get = (id: string): OfficeObject => {
  const obj = byId.get(id);
  if (!obj) throw new Error(`missing object ${id}`);
  return obj;
};

describe('marketingLayout', () => {
  it('belongs to the Marketing department (data-model.md OfficeLayout.departmentId, OfficeLayout.departmentName; FR-009)', () => {
    expect(marketingLayout.departmentId).toBe('marketing');
    expect(marketingLayout.departmentName).toBe('Marketing');
  });

  it('uses a 16x12 grid of 64x32 tiles (data-model.md OfficeLayout.grid, OfficeLayout.tile; FR-001)', () => {
    expect(marketingLayout.grid).toEqual({ cols: 16, rows: 12 });
    expect(marketingLayout.tile).toEqual({ width: 64, height: 32 });
  });

  it('has its entrance at (8,11) on the open front edge (data-model.md OfficeLayout.entrance)', () => {
    expect(marketingLayout.entrance).toEqual({ x: 8, y: 11 });
  });

  it('has unique object ids (data-model.md OfficeObject.id)', () => {
    expect(byId.size).toBe(objects.length);
  });

  it('defines the five Marketing zones with Spanish names (data-model.md Zone.id, Zone.name)', () => {
    expect(marketingLayout.zones.map((z) => z.id).sort()).toEqual(
      ['coffee', 'desks', 'meeting', 'screens', 'whiteboard'],
    );
    const names = Object.fromEntries(marketingLayout.zones.map((z) => [z.id, z.name]));
    expect(names).toEqual({
      desks: 'Escritorios',
      meeting: 'Sala de reuniones',
      coffee: 'Área de café',
      screens: 'Pared de pantallas',
      whiteboard: 'Pizarra de contenido',
    });
  });

  it('has desks desk-1…desk-6, each with an attached chair and monitor (data-model.md OfficeObject.id, OfficeObject.attachedTo; FR-005, FR-006)', () => {
    const desks = ofKind('desk');
    expect(desks.map((d) => d.id)).toEqual(['desk-1', 'desk-2', 'desk-3', 'desk-4', 'desk-5', 'desk-6']);
    for (const desk of desks) {
      const chairs = ofKind('chair').filter((c) => c.attachedTo === desk.id);
      const monitors = ofKind('monitor').filter((m) => m.attachedTo === desk.id);
      expect(chairs, desk.id).toHaveLength(1);
      expect(monitors, desk.id).toHaveLength(1);
      expect(monitors[0]!.origin, desk.id).toEqual(desk.origin);
      expect(monitors[0]!.z, desk.id).toBeGreaterThan(0);
    }
    expect(ofKind('chair')).toHaveLength(6);
    expect(ofKind('monitor')).toHaveLength(6);
  });

  it('numbers desks 1–3 on row 5 and 4–6 on row 8, left to right (FR-005b)', () => {
    const origins = ofKind('desk').map((d) => d.origin);
    expect(origins).toEqual([
      { x: 3, y: 5 },
      { x: 5, y: 5 },
      { x: 7, y: 5 },
      { x: 3, y: 8 },
      { x: 5, y: 8 },
      { x: 7, y: 8 },
    ]);
  });

  it('gives each desk exactly one use point, on its chair, facing N (data-model.md UsePoint.tile, UsePoint.facing; FR-009a)', () => {
    for (const desk of ofKind('desk')) {
      const chair = ofKind('chair').find((c) => c.attachedTo === desk.id)!;
      expect(desk.usePoints, desk.id).toEqual([{ tile: chair.origin, facing: 'N' }]);
    }
  });

  it('has one screen per social network (data-model.md OfficeObject.network; FR-005)', () => {
    const screens = ofKind('screen');
    expect(screens.map((s) => s.network).sort()).toEqual(['instagram', 'linkedin', 'tiktok', 'x', 'youtube']);
    expect(get('screen-tiktok').name).toBe('Pantalla TikTok');
  });

  it('has use point counts per kind as in data-model.md "UsePoint"', () => {
    expect(get('meeting-table').usePoints).toHaveLength(6);
    expect(get('coffee-machine').usePoints).toEqual([{ tile: { x: 13, y: 7 }, facing: 'E' }]);
    expect(get('sofa').usePoints).toEqual([
      { tile: { x: 12, y: 10 }, facing: 'N' },
      { tile: { x: 13, y: 10 }, facing: 'N' },
    ]);
    expect(get('whiteboard').usePoints).toEqual([{ tile: { x: 1, y: 3 }, facing: 'W' }]);
  });

  it('places the meeting table use points as in FR-005b', () => {
    expect(get('meeting-table').usePoints).toEqual([
      { tile: { x: 11, y: 2 }, facing: 'E' },
      { tile: { x: 11, y: 3 }, facing: 'E' },
      { tile: { x: 14, y: 2 }, facing: 'W' },
      { tile: { x: 14, y: 3 }, facing: 'W' },
      { tile: { x: 12, y: 4 }, facing: 'N' },
      { tile: { x: 13, y: 4 }, facing: 'N' },
    ]);
  });

  it('includes decorative plants', () => {
    expect(ofKind('plant').length).toBeGreaterThan(0);
  });

  it('gives every object a Spanish display name (data-model.md OfficeObject.name)', () => {
    for (const obj of objects) expect(obj.name.trim(), obj.id).not.toBe('');
    expect(get('desk-3').name).toBe('Escritorio 3');
    expect(get('meeting-table').name).toBe('Mesa de reuniones');
    expect(get('coffee-machine').name).toBe('Cafetera');
    expect(get('sofa').name).toBe('Sofá');
    expect(get('whiteboard').name).toBe('Pizarra de contenido');
  });

  it('mounts walls, screens and the whiteboard on the back walls only (data-model.md OfficeObject.wallMounted; FR-005a)', () => {
    const mounted = objects.filter((o) => o.wallMounted);
    expect(new Set(mounted.map((o) => o.kind))).toEqual(new Set(['wall', 'screen', 'whiteboard']));
    for (const obj of mounted) {
      const onBackRow = obj.origin.y === 0 && obj.size.h === 1;
      const onBackColumn = obj.origin.x === 0 && obj.size.w === 1;
      expect(onBackRow || onBackColumn, obj.id).toBe(true);
    }
    for (const obj of objects.filter((o) => !o.wallMounted)) {
      expect(['wall', 'screen', 'whiteboard'], obj.id).not.toContain(obj.kind);
    }
  });

  it('models walls as 1x1 segments so depth sorting stays correct (research R4)', () => {
    for (const wall of ofKind('wall')) expect(wall.size, wall.id).toEqual({ w: 1, h: 1 });
  });

  it('blocks exactly the kinds listed in data-model.md (OfficeObject.blocking)', () => {
    const blockingKinds = new Set(['wall', 'screen', 'whiteboard', 'desk', 'plant', 'meeting-table', 'coffee-machine']);
    for (const obj of objects) expect(obj.blocking, obj.id).toBe(blockingKinds.has(obj.kind));
  });
});
