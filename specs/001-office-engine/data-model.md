# Data Model: 001-office-engine

Todos los tipos viven en `packages/domain` y son inmutables (`readonly`). Sin persistencia en esta
feature.

## Primitivos

| Tipo | Definición | Notas |
|---|---|---|
| `Coord` | `{ x: number; y: number }` enteros | `x` = columna 0–15, `y` = fila 0–11 |
| `Direction` | `'N' \| 'E' \| 'S' \| 'W'` | N = `y−1`, S = `y+1`, E = `x+1`, W = `x−1` |
| `Size` | `{ w: number; h: number }` enteros ≥ 1 | huella en tiles |
| `Point` | `{ x: number; y: number }` reales | coordenadas de mundo o de pantalla (px) |

## OfficeLayout

| Campo | Tipo | Reglas |
|---|---|---|
| `departmentId` | `string` | slug estable, p. ej. `'marketing'` (FR-009) |
| `departmentName` | `string` | `'Marketing'` |
| `grid` | `{ cols: 16; rows: 12 }` | FR-001 |
| `tile` | `{ width: 64; height: 32 }` | proporción 2:1 |
| `entrance` | `Coord` | caminable; en el borde frontal (`y = rows−1` o `x = cols−1`) |
| `zones` | `Zone[]` | ids únicos |
| `objects` | `OfficeObject[]` | ids únicos |

## Zone

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | `'desks' \| 'meeting' \| 'coffee' \| 'screens' \| 'whiteboard'` en Marketing |
| `name` | `string` | texto en español |
| `area` | `{ origin: Coord; size: Size }` | dentro de la cuadrícula |

## OfficeObject

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | único; estable (`desk-1`…`desk-6`, `screen-tiktok`, …) (FR-006) |
| `kind` | `ObjectKind` | ver abajo |
| `name` | `string` | etiqueta del hover en español ("Escritorio 3", "Pantalla TikTok") |
| `origin` | `Coord` | tile con menor `x` e `y` de la huella |
| `size` | `Size` | huella completa dentro de la cuadrícula |
| `height` | `number` | altura visual en px a zoom 1x (silueta y orden) |
| `z` | `number` | elevación de la base en px (0 en el suelo; monitor > 0) |
| `blocking` | `boolean` | si sus tiles dejan de ser caminables |
| `wallMounted` | `boolean` | muros, pantallas y pizarra: viven en la fila `y=0` o la columna `x=0` |
| `usePoints` | `UsePoint[]` | puede estar vacío |
| `network?` | `SocialNetwork` | obligatorio si `kind = 'screen'` |
| `attachedTo?` | `string` | id del objeto padre (monitor/silla → escritorio) |

`ObjectKind = 'wall' | 'screen' | 'whiteboard' | 'desk' | 'chair' | 'monitor' | 'plant' | 'sofa' |
'meeting-table' | 'coffee-machine'`

`SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x'` — cada una con un color e icono
propios definidos en la capa web (sin logos oficiales, FR-007).

Bloqueo por tipo en Marketing: bloquean `wall`, `screen`, `whiteboard`, `desk`, `plant`,
`meeting-table`, `coffee-machine`; no bloquean `chair`, `sofa`, `monitor`.

## UsePoint

| Campo | Tipo | Reglas |
|---|---|---|
| `tile` | `Coord` | caminable y alcanzable desde `entrance` (FR-009b) |
| `facing` | `Direction` | hacia dónde mira la persona |

Reglas por tipo: cada `desk` tiene exactamente 1 punto de uso, en el tile de su silla (FR-009a);
`meeting-table` 6; `coffee-machine` 1; `sofa` 2 (sobre sus propios tiles); `whiteboard` 1.

## Validación del layout (`validateLayout`)

Devuelve `{ ok: true }` o `{ ok: false; errors: LayoutError[] }`, con
`LayoutError = { code; objectId?; tile?; message }`:

| `code` | Condición |
|---|---|
| `OUT_OF_BOUNDS` | huella de un objeto, zona o entrada fuera de la cuadrícula |
| `DUPLICATE_ID` | dos objetos o zonas con el mismo id |
| `BLOCKING_OVERLAP` | dos objetos que bloquean comparten un tile |
| `ENTRANCE_BLOCKED` | la entrada no es caminable |
| `USE_POINT_BLOCKED` | un punto de uso cae en un tile no caminable |
| `USE_POINT_UNREACHABLE` | no hay ruta desde la entrada hasta un punto de uso |
| `MISSING_NETWORK` | una pantalla sin `network` |
| `DESK_USE_POINT` | un escritorio sin exactamente un punto de uso sobre su silla |
| `BAD_ATTACHMENT` | `attachedTo` apunta a un id inexistente |

Todos los errores se reportan juntos (no se detiene en el primero).

## Derivados (puros, calculados del layout)

- **WalkabilityGrid**: `boolean[rows][cols]`; `false` en tiles de objetos `blocking` (FR-020).
- **DrawOrder**: ids ordenados por la clave `(xMax+yMax, xMin+yMin, z, id)` (FR-012, research R4).
- **Silhouette**: polígono en coordenadas de mundo de cada objeto (huella + altura), para el hover.

## Camera

| Campo | Tipo | Reglas |
|---|---|---|
| `offset` | `Point` | traslación en px de pantalla |
| `zoom` | `number` | siempre dentro de [0.5, 2] (FR-014) |

Operaciones (puras, devuelven una cámara nueva): `initialCamera(viewport, layout)` (centrada a 1x),
`pan(cam, delta, viewport, layout)`, `zoomAt(cam, screenPoint, factor, viewport, layout)`,
`recenter(viewport, layout)`. Todas aplican el límite "el centro de la oficina queda dentro del
viewport" (FR-016, research R6).

## HoverTarget

`{ type: 'object'; id: string } | { type: 'tile'; tile: Coord } | null` (FR-017–FR-019).

## PathResult

`{ ok: true; path: Coord[] } | { ok: false; reason: 'blocked' | 'unreachable' | 'out-of-bounds' }`.
`path` incluye origen y destino; si son iguales, `path` tiene un solo elemento (FR-021, FR-022).

## Estado de UI (apps/web, Zustand)

| Campo | Tipo |
|---|---|
| `camera` | `Camera` |
| `viewport` | `{ width; height }` |
| `hover` | `HoverTarget` |
| `debug` | `{ enabled: boolean; from: Coord \| null; to: Coord \| null; result: PathResult \| null }` |

Transiciones de `debug`: desactivado → (G / botón) → activado sin selección → clic en tile = `from` →
clic en tile = `to` y se calcula `result` → siguiente clic reinicia con nuevo `from`. Desactivar limpia
`from`, `to` y `result` (escenario 6 de la US4).
