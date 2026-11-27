# Data Model: 002-marketing-team

Todos los tipos de dominio viven en `packages/domain/src/agents/` (y `scene/`, `camera/` para la
geometría) y son inmutables (`readonly`). Reutilizan `Coord`, `Direction`, `Point`, `OfficeLayout`,
`UsePoint`, `Camera` y `Viewport` de la 001 ([data-model de la 001](../001-office-engine/data-model.md)).
Sin persistencia: los datos editados viven en memoria hasta recargar (FR-032a).

## Catálogo (`agents/catalog.ts`)

| Tipo | Valores (ids estables) | Notas |
|---|---|---|
| `AgentColorId` | 10 ids (`coral`, `amber`, `lime`, `emerald`, `sky`, `indigo`, `violet`, `rose`, `sand`, `slate`) | cada uno con `name` (español) y `hex` (número `0xRRGGBB`); lejos de los colores de red de la 001 (research R3) |
| `SkinTone` | `skin-1` … `skin-4` | `name` y `hex` |
| `HairStyle` | `short`, `long`, `curly`, `bun` | `name` |
| `HairColor` | `black`, `brown`, `auburn`, `blonde`, `gray` | `name` y `hex` |
| `Accessory` | `none`, `glasses`, `headphones`, `cap` | `name` |

`AGENT_COLORS`, `SKIN_TONES`, `HAIR_STYLES`, `HAIR_COLORS`, `ACCESSORIES`: listas ordenadas de
`{ id, name, hex? }` (el orden es el de los selectores del editor).

## Appearance

| Campo | Tipo | Reglas |
|---|---|---|
| `skinTone` | `SkinTone` | del catálogo |
| `hairStyle` | `HairStyle` | del catálogo |
| `hairColor` | `HairColor` | del catálogo |
| `accessory` | `Accessory` | del catálogo |

## AgentProfile (datos editables + identidad)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | estable, único (`head-of-marketing`, `trend-scout`, `copywriter`, `scriptwriter`, `designer`, `community-manager`); las capacidades futuras se ligan a él |
| `name` | `string` | 1–30 caracteres tras `trim`; único sin distinguir mayúsculas |
| `role` | `string` | 1–40 caracteres tras `trim`; solo etiqueta visible |
| `color` | `AgentColorId` | del catálogo; único entre agentes (siempre) |
| `appearance` | `Appearance` | combinaciones distintas en la semilla; puede repetirse tras editar |
| `deskId` | `string` | id de un objeto `desk` del layout; único; no editable |
| `systemPrompt` | `string` | 1–4000 caracteres tras `cleanSystemPrompt` (quita la regla global y recorta); en español; se guarda limpio |

`marketingTeam: readonly AgentProfile[]` — los 6 agentes semilla en el orden de FR-001, con
`deskId` `desk-1` … `desk-6` en ese orden. El índice en esta lista es el **número** del agente (1–6)
usado por tarjetas, atajos y desempates de profundidad.

`AgentDraft` = `Pick<AgentProfile, 'name' | 'role' | 'color' | 'appearance' | 'systemPrompt'>`
(lo que edita el editor).

## Regla de cero invenciones y prompt efectivo (`agents/prompt.ts`)

- `ZERO_INVENTION_RULE: string` — bloque global fijo (constitución V): no inventar métricas,
  estadísticas, testimonios, citas, tendencias ni datos de terceros; pedir el dato que falte.
- `cleanSystemPrompt(text)`: quita las apariciones literales de la regla y recorta; la comparten
  validación, guardado y composición.
- `effectivePrompt(profile) = ZERO_INVENTION_RULE + "\n\n" + cleanSystemPrompt(systemPrompt)`
  (research R4). Contiene la regla exactamente una vez.

## Validación de agentes (`agents/validate.ts`)

`validateTeam(profiles, layout)` → `{ ok: true } | { ok: false; errors: AgentError[] }` con
`AgentError = { code; agentId; field; message }` (mensajes en español con agente y campo). Todos los
errores se reportan juntos.

| `code` | `field` | Condición |
|---|---|---|
| `DUPLICATE_ID` | `id` | dos agentes con el mismo id |
| `DUPLICATE_DESK` | `deskId` | dos agentes con el mismo escritorio |
| `DUPLICATE_COLOR` | `color` | dos agentes con el mismo color |
| `DUPLICATE_NAME` | `name` | dos nombres iguales sin distinguir mayúsculas (tras `trim`) |
| `UNKNOWN_DESK` | `deskId` | el id no existe en el layout o no es de tipo `desk` |
| `UNKNOWN_COLOR` | `color` | color fuera del catálogo |
| `UNKNOWN_APPEARANCE` | `appearance.<campo>` | tono, peinado, color de pelo o accesorio fuera del catálogo |
| `EMPTY_FIELD` | `id` / `name` / `role` / `systemPrompt` | vacío o solo espacios |
| `TOO_LONG` | `name` / `role` / `systemPrompt` | supera 30 / 40 / 4000 caracteres tras `trim` |

`validateAgentDraft(draft, team, agentId)` → `AgentDraftErrors` = `Partial<Record<DraftField,
string>>` con `DraftField` = `name`, `role`, `color`, `systemPrompt` y `appearance.<campo>` (vacío =
válido), con las mismas reglas que la carga comparando con el resto del equipo (FR-030).
`applyDraft(profile, draft)` devuelve el perfil con `name`/`role` recortados y el prompt limpio.

## Estado del agente y transiciones (`agents/stateMachine.ts`)

`AgentStatus = 'idle' | 'walking' | 'working' | 'meeting' | 'break' | 'waiting_review'`
`ActivityStatus = 'working' | 'meeting' | 'break' | 'waiting_review'`

`TransitionTrigger`:

| `type` | Campos | Destino si se acepta |
|---|---|---|
| `walk-to` | `reachable: boolean` | `walking` (desde `idle`, `walking` o actividad) |
| `start-activity` | `activity: ActivityStatus`, `onFreeUsePoint: boolean` | `activity` (solo desde `idle`) |
| `arrive` | `activity: ActivityStatus \| null`, `atTarget: boolean` | `activity` o `idle` (solo desde `walking`) |
| `cancel` | — | `idle` (desde `walking` o actividad) |
| `finish` | — | `idle` (solo desde actividad) |

`transition(from, trigger)` → `{ ok: true; status } | { ok: false; reason }`, con `reason`:
`INVALID_TRANSITION` (par no listado en FR-008), `UNREACHABLE` (`walk-to` con `reachable: false`),
`NOT_ON_FREE_USE_POINT` (`start-activity` con `onFreeUsePoint: false`), `NOT_ARRIVED` (`arrive` con
`atTarget: false`). Tabla exacta en FR-008; cobertura de los 36 pares en research R2.

## Simulación (`agents/simulation.ts` y módulos de la Tanda 2)

### Constantes

| Nombre | Valor | Origen |
|---|---|---|
| `SIM_STEP_MS` | 10 | paso fijo (research R6) |
| `STEP_DURATION_MS` | 500 | 2 tiles/s (FR-012) |
| `MAX_FRAME_MS` | 250 | FR-015 |
| `IDLE_PAUSE_MS` | `[3000, 8000]` | FR-016 |
| `WORK_MS` / `BREAK_MS` | `[10000, 20000]` / `[5000, 10000]` | FR-017 |
| `CELEBRATE_MS` | 1000 | FR-017 |
| `ACCEPTANCE_SEED` | número fijo, documentado en `quickstart.md` | FR-019 |

### UsePointRef

`{ objectId: string; index: number }` — punto `index` de `usePoints` del objeto. Clave textual
`usePointKey(ref) = "objectId#index"`. La exclusión se comprueba por tile resuelto y `createSimWorld`
rechaza dos puntos de uso en el mismo tile.

### Activity y destino

`Activity = 'work' | 'meeting' | 'break' | 'review' | 'whiteboard' | 'wander'`

| Actividad | Puntos de uso | Estado al llegar | Quién la elige |
|---|---|---|---|
| `work` | el del escritorio del agente (`deskId`) | `working` | autonomía y orden |
| `meeting` | los 6 de `meeting-table` | `meeting` | solo orden |
| `break` | `coffee-machine` (1) y `sofa` (2) | `break` | autonomía y orden |
| `review` | `whiteboard` (1) | `waiting_review` | solo orden |
| `whiteboard` | `whiteboard` (1) | `idle` mirándola | solo autonomía |
| `wander` | ninguno: tile caminable libre que no es punto de uso | `idle` | solo autonomía |

`AgentTarget = { activity: Activity | null; tile: Coord; usePoint: UsePointRef | null; facing:
Direction | null }` — `activity: null` es un destino sin actividad (orden `go-to`, solo hook de
pruebas). `GridPosition = { x; y }` son coordenadas de tile fraccionales (no píxeles);
`positionToWorld` las convierte al centro del tile en px.

### AgentRuntime (estado de simulación de un agente)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | id del perfil |
| `status` | `AgentStatus` | solo cambia vía `transition` |
| `tile` | `Coord` | último tile alcanzado (entero) |
| `next` | `Coord \| null` | tile hacia el que avanza (vecino 4-dir de `tile`); `null` si está quieto |
| `stepMs` | `number` | 0 ≤ `stepMs` < `STEP_DURATION_MS`; avance entero dentro del paso |
| `route` | `readonly Coord[]` | tiles que faltan después de `next` |
| `facing` | `Direction` | dirección del paso actual o la del punto de uso al llegar (FR-013) |
| `target` | `AgentTarget \| null` | destino y actividad en curso o hacia la que camina; `null` al detenerse por una orden `idle` |
| `reservation` | `UsePointRef \| null` | punto ocupado o reservado (FR-014) |
| `forced` | `boolean` | tiene una orden externa activa (sin autonomía, FR-017a) |
| `timerMs` | `number \| null` | tiempo restante de la pausa de reposo (`idle`) o de la actividad autónoma; `null` con `forced`; empieza a descontar en el paso siguiente al que se crea |
| `celebrateMs` | `number` | > 0 mientras celebra (sigue en `working`) |

Posición mostrada: `agentPosition(agent): GridPosition` = `lerp(tile, next, stepMs /
STEP_DURATION_MS)` (siempre sobre el segmento, FR-012). Un agente quieto nunca ocupa un punto de uso
ajeno: al detenerse avanza hasta el primer tile de su ruta que no sea punto de uso (salvo el suyo).

### Simulation y SimWorld

| Tipo | Campos |
|---|---|
| `SimWorld` | `layout`, `walk: WalkabilityGrid`, `team: readonly AgentProfile[]` (orden del equipo) — inmutable durante la simulación; se recrea si cambia el layout |
| `Simulation` | `timeMs: number` (múltiplo de `SIM_STEP_MS`), `rng: number` (estado `uint32` del PRNG), `agents: readonly AgentRuntime[]` (orden del equipo) |

Invariantes (SC-005): como mucho un agente por `UsePointRef`; el punto de un escritorio solo lo
reserva su titular; `tile` y `next` son siempre caminables; dos `wander` nunca comparten destino.

### Órdenes

`Order = { type: 'activity'; activity: 'work' | 'meeting' | 'break' | 'review' } | { type: 'go-to';
tile: Coord } | { type: 'idle' }`

`OrderResult = { ok: true; changed: boolean } | { ok: false; reason: 'NO_FREE_SPOT' | 'UNREACHABLE' |
'INVALID_DESTINATION' | 'UNKNOWN_AGENT' }` — `changed: false` cuando el agente ya tiene una orden
forzada de esa actividad (en ella o caminando hacia ella); si la misma actividad venía de la
autonomía, la orden la adopta (`changed: true`).

## Selección (`agents/selection.ts`)

`Selection = { agentId: string | null; following: boolean }` (estado en la web).
Funciones puras sobre `teamIds` y el id seleccionado: `selectByNumber`, `cycleSelection`.

## Geometría de escena con personajes (`scene/`)

| Tipo | Definición |
|---|---|
| `CharacterPlacement` | `{ id: string; teamIndex: number; position: GridPosition; tile: Coord; next: Coord \| null }` |
| `SceneItem` | `{ type: 'object'; id } \| { type: 'agent'; id }` |
| `SceneHoverTarget` | `HoverTarget \| { type: 'agent'; id: string }` |
| `CHARACTER_BODY` | `{ width: 24; height: 52 }` px a zoom 1, anclado al centro del tile (research R10) |

## Estado de la web (Zustand, `apps/web/src/state/store.ts`)

Se añade a `OfficeState` de la 001:

| Campo | Tipo | Notas |
|---|---|---|
| `team` | `readonly AgentProfile[]` | perfiles en memoria (semilla al cargar) |
| `world` | `SimWorld` | derivado de `layout` + `team` |
| `sim` | `Simulation` | avanza con `advanceFrame` desde el ticker de Pixi |
| `accumulatorMs` | `number` | resto del reloj de pasos fijos |
| `paused` | `boolean` | `Space` (FR-020) |
| `queuedOrders` | `readonly { agentId; order }[]` | órdenes recibidas en pausa; se aplican al reanudar |
| `selection` | `Selection` | |
| `follow` | `{ startOffset: Point; elapsedMs: number } \| null` | transición suave en curso (≤ 400 ms) |
| `editor` | `{ agentId: string } \| null` | diálogo abierto |
| `notice` | `{ message: string; id: number } \| null` | aviso efímero ("Sin sitio libre") |
| `hover` | `SceneHoverTarget` | amplía el hover de la 001 con personajes |

Transiciones relevantes: `toggleDebug` al desactivar → `cancelForcedOrders` y vacía `queuedOrders`
(son órdenes de depuración); al reanudar, `queuedOrders` se aplican en orden de llegada antes del
primer paso; `panBy`/`zoomAt`/
`recenter` → `selection.following = false`; `select(id)` → `following = true` e inicia `follow`;
`saveAgent(id, draft)` → valida, aplica, recrea `world` (el `sim` se conserva: los ids no cambian).
