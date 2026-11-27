import type { Coord, OfficeLayout, OfficeObject, SocialNetwork } from '../types';

/**
 * Marketing office layout — data only (FR-004, FR-005, FR-005a, FR-005b).
 * Coordinates: x = column 0–15 (left → right), y = row 0–11 (top → bottom).
 * Row y=0 is the back-right wall, column x=0 the back-left wall; the front is open.
 */

const WALL_HEIGHT = 96;
const DESK_HEIGHT = 28;

const wall = (x: number, y: number): OfficeObject => ({
  id: `wall-${x}-${y}`,
  kind: 'wall',
  name: 'Muro',
  origin: { x, y },
  size: { w: 1, h: 1 },
  height: WALL_HEIGHT,
  z: 0,
  blocking: true,
  wallMounted: true,
  usePoints: [],
});

const WALL_TILES: readonly Coord[] = [
  // Back-right wall (row y=0); x=3..7 hold the social network screens.
  ...[0, 1, 2, 8, 9, 10, 11, 12, 13, 14, 15].map((x) => ({ x, y: 0 })),
  // Back-left wall (column x=0); y=3..4 hold the whiteboard.
  ...[1, 2, 5, 6, 7, 8, 9, 10, 11].map((y) => ({ x: 0, y })),
];

const SCREENS: readonly { network: SocialNetwork; label: string }[] = [
  { network: 'instagram', label: 'Instagram' },
  { network: 'tiktok', label: 'TikTok' },
  { network: 'youtube', label: 'YouTube' },
  { network: 'linkedin', label: 'LinkedIn' },
  { network: 'x', label: 'X' },
];

const screens: OfficeObject[] = SCREENS.map(({ network, label }, i) => ({
  id: `screen-${network}`,
  kind: 'screen',
  name: `Pantalla ${label}`,
  origin: { x: 3 + i, y: 0 },
  size: { w: 1, h: 1 },
  height: WALL_HEIGHT,
  z: 0,
  blocking: true,
  wallMounted: true,
  usePoints: [],
  network,
}));

const whiteboard: OfficeObject = {
  id: 'whiteboard',
  kind: 'whiteboard',
  name: 'Pizarra de contenido',
  origin: { x: 0, y: 3 },
  size: { w: 1, h: 2 },
  height: WALL_HEIGHT,
  z: 0,
  blocking: true,
  wallMounted: true,
  usePoints: [{ tile: { x: 1, y: 3 }, facing: 'W' }],
};

const DESK_ORIGINS: readonly Coord[] = [
  { x: 3, y: 5 },
  { x: 5, y: 5 },
  { x: 7, y: 5 },
  { x: 3, y: 8 },
  { x: 5, y: 8 },
  { x: 7, y: 8 },
];

const workstations: OfficeObject[] = DESK_ORIGINS.flatMap((origin, i) => {
  const n = i + 1;
  const deskId = `desk-${n}`;
  const chairTile = { x: origin.x, y: origin.y + 1 };
  const desk: OfficeObject = {
    id: deskId,
    kind: 'desk',
    name: `Escritorio ${n}`,
    origin,
    size: { w: 1, h: 1 },
    height: DESK_HEIGHT,
    z: 0,
    blocking: true,
    wallMounted: false,
    usePoints: [{ tile: chairTile, facing: 'N' }],
  };
  const monitor: OfficeObject = {
    id: `monitor-${n}`,
    kind: 'monitor',
    name: `Monitor ${n}`,
    origin,
    size: { w: 1, h: 1 },
    height: 22,
    z: DESK_HEIGHT,
    blocking: false,
    wallMounted: false,
    usePoints: [],
    attachedTo: deskId,
  };
  const chair: OfficeObject = {
    id: `chair-${n}`,
    kind: 'chair',
    name: `Silla ${n}`,
    origin: chairTile,
    size: { w: 1, h: 1 },
    height: 30,
    z: 0,
    blocking: false,
    wallMounted: false,
    usePoints: [],
    attachedTo: deskId,
  };
  return [desk, monitor, chair];
});

const plant = (n: number, x: number, y: number): OfficeObject => ({
  id: `plant-${n}`,
  kind: 'plant',
  name: 'Planta',
  origin: { x, y },
  size: { w: 1, h: 1 },
  height: 48,
  z: 0,
  blocking: true,
  wallMounted: false,
  usePoints: [],
});

const meetingTable: OfficeObject = {
  id: 'meeting-table',
  kind: 'meeting-table',
  name: 'Mesa de reuniones',
  origin: { x: 12, y: 2 },
  size: { w: 2, h: 2 },
  height: 26,
  z: 0,
  blocking: true,
  wallMounted: false,
  usePoints: [
    { tile: { x: 11, y: 2 }, facing: 'E' },
    { tile: { x: 11, y: 3 }, facing: 'E' },
    { tile: { x: 14, y: 2 }, facing: 'W' },
    { tile: { x: 14, y: 3 }, facing: 'W' },
    { tile: { x: 12, y: 4 }, facing: 'N' },
    { tile: { x: 13, y: 4 }, facing: 'N' },
  ],
};

const coffeeMachine: OfficeObject = {
  id: 'coffee-machine',
  kind: 'coffee-machine',
  name: 'Cafetera',
  origin: { x: 14, y: 7 },
  size: { w: 1, h: 1 },
  height: 40,
  z: 0,
  blocking: true,
  wallMounted: false,
  usePoints: [{ tile: { x: 13, y: 7 }, facing: 'E' }],
};

const sofa: OfficeObject = {
  id: 'sofa',
  kind: 'sofa',
  name: 'Sofá',
  origin: { x: 12, y: 10 },
  size: { w: 2, h: 1 },
  height: 24,
  z: 0,
  blocking: false,
  wallMounted: false,
  usePoints: [
    { tile: { x: 12, y: 10 }, facing: 'N' },
    { tile: { x: 13, y: 10 }, facing: 'N' },
  ],
};

export const marketingLayout: OfficeLayout = {
  departmentId: 'marketing',
  departmentName: 'Marketing',
  grid: { cols: 16, rows: 12 },
  tile: { width: 64, height: 32 },
  entrance: { x: 8, y: 11 },
  zones: [
    { id: 'desks', name: 'Escritorios', area: { origin: { x: 2, y: 5 }, size: { w: 7, h: 5 } } },
    {
      id: 'meeting',
      name: 'Sala de reuniones',
      area: { origin: { x: 11, y: 2 }, size: { w: 4, h: 3 } },
    },
    { id: 'coffee', name: 'Área de café', area: { origin: { x: 12, y: 7 }, size: { w: 3, h: 4 } } },
    {
      id: 'screens',
      name: 'Pared de pantallas',
      area: { origin: { x: 3, y: 0 }, size: { w: 5, h: 1 } },
    },
    {
      id: 'whiteboard',
      name: 'Pizarra de contenido',
      area: { origin: { x: 0, y: 3 }, size: { w: 2, h: 2 } },
    },
  ],
  objects: [
    ...WALL_TILES.map((t) => wall(t.x, t.y)),
    ...screens,
    whiteboard,
    ...workstations,
    plant(1, 1, 1),
    plant(2, 10, 1),
    plant(3, 1, 10),
    meetingTable,
    coffeeMachine,
    sofa,
  ],
};
