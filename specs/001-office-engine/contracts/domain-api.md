# Contract: API pública de `@ai-hq/domain` (feature 001)

Funciones puras, sin I/O ni dependencias de navegador. Es el contrato que consumen `apps/web` y, en
la feature 002, los agentes. Tipos en [data-model.md](../data-model.md).

## Proyección (`iso`)

```ts
gridToWorld(tile: Coord, tileSize?: { width: number; height: number }): Point
worldToGrid(p: Point, grid: { cols: number; rows: number }, tileSize?): Coord | null
```

- `worldToGrid(gridToWorld(t)) ≡ t` para todo tile de la cuadrícula (FR-002, SC-002).
- Puntos fuera de la cuadrícula → `null` (FR-003). Puntos en un borde → regla `floor` (determinista).

## Cámara (`camera`)

```ts
initialCamera(viewport: Viewport, layout: OfficeLayout): Camera
screenToWorld(cam: Camera, p: Point): Point
worldToScreen(cam: Camera, p: Point): Point
screenToGrid(cam: Camera, p: Point, layout: OfficeLayout): Coord | null
pan(cam: Camera, delta: Point, viewport: Viewport, layout: OfficeLayout): Camera
zoomAt(cam: Camera, anchor: Point, factor: number, viewport: Viewport, layout: OfficeLayout): Camera
recenter(viewport: Viewport, layout: OfficeLayout): Camera
export const ZOOM_MIN = 0.5, ZOOM_MAX = 2, ZOOM_STEP = 1.1
```

- `zoomAt` conserva el punto de mundo bajo `anchor` salvo cuando el zoom queda limitado (FR-014).
- Todas las operaciones garantizan que el centro de la oficina queda dentro del viewport (FR-016).

## Layout (`layout`)

```ts
marketingLayout: OfficeLayout
validateLayout(layout: OfficeLayout): { ok: true } | { ok: false; errors: LayoutError[] }
renderLayoutAscii(layout: OfficeLayout): string   // leyenda de FR-005b; usado por tests
```

- `validateLayout(marketingLayout).ok === true`.
- `renderLayoutAscii(marketingLayout)` es idéntico al mapa de FR-005b.

## Escena (`scene`)

```ts
walkability(layout: OfficeLayout): WalkabilityGrid
drawOrder(layout: OfficeLayout): string[]                 // ids, de atrás hacia delante
silhouette(obj: OfficeObject, tileSize?): Point[]         // polígono en coords de mundo
hitTest(worldPoint: Point, layout: OfficeLayout): HoverTarget
```

- `hitTest` prueba objetos en orden inverso a `drawOrder` (gana el de delante), luego suelo, luego
  `null` (FR-017–FR-019).

## Rutas (`path`)

```ts
findPath(walk: WalkabilityGrid, from: Coord, to: Coord): PathResult
```

- Movimiento en 4 direcciones; ruta de longitud mínima; mismo resultado para la misma entrada
  (FR-021, FR-022).
- `to` bloqueado → `{ ok: false, reason: 'blocked' }`; sin conexión → `'unreachable'`; fuera →
  `'out-of-bounds'`; `from = to` → `path` de un elemento.
