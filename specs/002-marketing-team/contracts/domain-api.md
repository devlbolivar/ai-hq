# Contract: API pública de `@ai-hq/domain` (feature 002)

Amplía la API de la 001 ([contrato de la 001](../../001-office-engine/contracts/domain-api.md)), que no
cambia salvo lo que añade el fix `fix/001-review` (`MISSING_USE_POINT`, `INVALID_GEOMETRY`). Todo son
funciones puras, sin I/O, sin `Date`, sin `Math.random` y sin dependencias de navegador. Ninguna
función muta sus argumentos. Tipos en [data-model.md](../data-model.md). Todo se reexporta desde
`packages/domain/src/index.ts`.

Bloques y responsables (research R1):

| Bloque | Archivos | Responsable |
|---|---|---|
| Datos y estados | `agents/types.ts`, `agents/catalog.ts`, `agents/seed.ts`, `agents/prompt.ts`, `agents/validate.ts` | Claude |
| | `agents/stateMachine.ts` | Codex |
| Simulación | `agents/usePoints.ts`, `agents/movement.ts`, `agents/autonomy.ts`, `agents/orders.ts`, `agents/simulation.ts` | Claude |
| | `agents/rng.ts`, `agents/selection.ts` | Codex |
| Geometría | `scene/sceneOrder.ts`, `scene/characterHit.ts` (incluye `positionToWorld`), `camera/follow.ts` | Claude |

## Datos, validación y máquina de estados

### Tipos y catálogo (`agents/types.ts`, `agents/catalog.ts`)

```ts
type AgentColorId = 'coral' | 'amber' | 'lime' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'rose'
  | 'sand' | 'slate'
type SkinTone = 'skin-1' | 'skin-2' | 'skin-3' | 'skin-4'
type HairStyle = 'short' | 'long' | 'curly' | 'bun'
type HairColor = 'black' | 'brown' | 'auburn' | 'blonde' | 'gray'
type Accessory = 'none' | 'glasses' | 'headphones' | 'cap'

interface CatalogEntry<Id extends string> { readonly id: Id; readonly name: string }
interface ColorEntry<Id extends string> extends CatalogEntry<Id> { readonly hex: number }

const AGENT_COLORS: readonly ColorEntry<AgentColorId>[]   // 10, hex distintos
const SKIN_TONES: readonly ColorEntry<SkinTone>[]         // 4
const HAIR_STYLES: readonly CatalogEntry<HairStyle>[]     // 4
const HAIR_COLORS: readonly ColorEntry<HairColor>[]       // 5
const ACCESSORIES: readonly CatalogEntry<Accessory>[]     // 4, incluye 'none'
function agentColorHex(id: AgentColorId): number
```

- `name` en español (lo muestra el editor). Ids únicos en cada lista; `hex` en `0x000000–0xffffff`.

### Perfiles y semilla (`agents/types.ts`, `agents/seed.ts`)

```ts
interface Appearance { skinTone: SkinTone; hairStyle: HairStyle; hairColor: HairColor;
  accessory: Accessory }                                   // todos readonly
interface AgentProfile { id: string; name: string; role: string; color: AgentColorId;
  appearance: Appearance; deskId: string; systemPrompt: string }   // todos readonly
type AgentDraft = Pick<AgentProfile, 'name' | 'role' | 'color' | 'appearance' | 'systemPrompt'>

const marketingTeam: readonly AgentProfile[]
const NAME_MAX = 30, ROLE_MAX = 40, SYSTEM_PROMPT_MAX = 4000
```

- Exactamente 6 perfiles en el orden de FR-001; ids `head-of-marketing`, `trend-scout`,
  `copywriter`, `scriptwriter`, `designer`, `community-manager`; nombres = rol en inglés
  ("Head of Marketing", …); roles en español ("Estratega", "Investigador", "Redactor", "Guionista",
  "Diseño", "Comunidad"); `deskId` = `desk-1` … `desk-6` en orden.
- Colores distintos y combinaciones de apariencia distintas (FR-003).
- `systemPrompt` en español, describe rol y tareas según FR-004 y **no** contiene la regla de cero
  invenciones.
- `validateTeam(marketingTeam, marketingLayout).ok === true`.

### Prompt efectivo (`agents/prompt.ts`)

```ts
const ZERO_INVENTION_RULE: string
function cleanSystemPrompt(text: string): string
function effectivePrompt(profile: Pick<AgentProfile, 'systemPrompt'>): string
```

- `cleanSystemPrompt` quita toda aparición literal de `ZERO_INVENTION_RULE` y recorta. La usan
  `validateAgentDraft` (la longitud y el vacío se miden sobre el texto limpio), `applyDraft` (se guarda
  limpio) y `effectivePrompt`.

- `effectivePrompt(p) === ZERO_INVENTION_RULE + '\n\n' + cleanSystemPrompt(p.systemPrompt)`.
- Para todo `p`, la regla aparece exactamente una vez en `effectivePrompt(p)` (FR-005).
- `ZERO_INVENTION_RULE` menciona métricas, estadísticas, testimonios, citas, tendencias y datos de
  terceros, y pide solicitar el dato que falte (constitución V).

### Validación (`agents/validate.ts`)

```ts
type AgentErrorCode = 'DUPLICATE_ID' | 'DUPLICATE_DESK' | 'DUPLICATE_COLOR' | 'DUPLICATE_NAME'
  | 'UNKNOWN_DESK' | 'UNKNOWN_COLOR' | 'UNKNOWN_APPEARANCE' | 'EMPTY_FIELD' | 'TOO_LONG'
interface AgentError { code: AgentErrorCode; agentId: string; field: string; message: string }
type TeamValidationResult = { ok: true } | { ok: false; errors: readonly AgentError[] }

function validateTeam(profiles: readonly AgentProfile[], layout: OfficeLayout): TeamValidationResult

type DraftField = 'name' | 'role' | 'color' | 'systemPrompt' | 'appearance.skinTone'
  | 'appearance.hairStyle' | 'appearance.hairColor' | 'appearance.accessory'
type AgentDraftErrors = Partial<Record<DraftField, string>>
function validateAgentDraft(draft: AgentDraft, team: readonly AgentProfile[], agentId: string):
  AgentDraftErrors
function applyDraft(profile: AgentProfile, draft: AgentDraft): AgentProfile
```

- `validateTeam` reporta todos los errores juntos (tabla de data-model.md). `field` es el nombre del
  campo (`appearance.hairStyle` para apariencia). `message` en español con nombre o id del agente y
  campo. Una apariencia fuera del catálogo no lanza excepción.
- `validateAgentDraft`: `{}` si es válido. Compara nombre y color con los demás agentes de `team`
  (excluye `agentId`). Un color o una apariencia fuera del catálogo dan error en su campo (misma
  comprobación de catálogo que `validateTeam`). Mensajes en español,
  p. ej. "El nombre es obligatorio", "Máximo 30 caracteres", "Ya hay un agente con ese nombre", "Ese
  color ya lo usa Copywriter".
- `applyDraft` conserva `id` y `deskId`, recorta `name` y `role` y guarda
  `cleanSystemPrompt(systemPrompt)`.

### Máquina de estados (`agents/stateMachine.ts`)

```ts
type AgentStatus = 'idle' | 'walking' | 'working' | 'meeting' | 'break' | 'waiting_review'
type ActivityStatus = 'working' | 'meeting' | 'break' | 'waiting_review'
const AGENT_STATUSES: readonly AgentStatus[]              // en el orden de arriba
function isActivityStatus(s: AgentStatus): s is ActivityStatus

type TransitionTrigger =
  | { type: 'walk-to'; reachable: boolean }
  | { type: 'start-activity'; activity: ActivityStatus; onFreeUsePoint: boolean }
  | { type: 'arrive'; activity: ActivityStatus | null; atTarget: boolean }
  | { type: 'cancel' }
  | { type: 'finish' }
type TransitionRejection = 'INVALID_TRANSITION' | 'UNREACHABLE' | 'NOT_ON_FREE_USE_POINT'
  | 'NOT_ARRIVED'
type TransitionResult = { ok: true; status: AgentStatus } | { ok: false; reason: TransitionRejection }

function transition(from: AgentStatus, trigger: TransitionTrigger): TransitionResult
```

| `from` | Disparador aceptado | Resultado |
|---|---|---|
| `idle` | `walk-to` (`reachable`) | `walking` |
| `idle` | `start-activity` (`onFreeUsePoint`) | `activity` |
| `walking` | `walk-to` (`reachable`) | `walking` |
| `walking` | `arrive` (`atTarget`) | `activity` o `idle` (si `activity: null`) |
| `walking` | `cancel` | `idle` |
| actividad | `walk-to` (`reachable`) | `walking` |
| actividad | `cancel` / `finish` | `idle` |

- Todo lo demás → `INVALID_TRANSITION` (p. ej. `start-activity` desde `walking` o desde una actividad,
  `arrive` fuera de `walking`, `cancel`/`finish` desde `idle`, `finish` desde `walking`).
- `walk-to.reachable` significa "hay ruta válida y el agente se moverá al menos un paso": desde
  `idle` o una actividad, `planRoute` no es `null` ni vacía; desde `walking`, hay ruta desde `next`.
  Un destino igual al tile actual (agente quieto) no es alcanzable a efectos de la transición.
- Disparador aceptado con la condición en `false` → su motivo (`UNREACHABLE`, `NOT_ON_FREE_USE_POINT`,
  `NOT_ARRIVED`). El tipo de par se comprueba antes que la condición.
- Tests: los 36 pares (origen, destino) según research R2 (SC-003).

## Simulación, autonomía, órdenes y selección

### PRNG (`agents/rng.ts`)

```ts
type RngState = number                                    // uint32
function seedRng(seed: number): RngState
function nextFloat(state: RngState): readonly [value: number, next: RngState]      // [0, 1)
function randomInt(state: RngState, min: number, max: number): readonly [number, RngState] // inclusivo
function pick<T>(state: RngState, items: readonly T[]): readonly [T, RngState]    // items no vacío
```

- `mulberry32`; misma semilla → misma secuencia; `seedRng` acepta cualquier número (lo normaliza).

### Puntos de uso y reservas (`agents/usePoints.ts`)

```ts
interface UsePointRef { objectId: string; index: number }
type Activity = 'work' | 'meeting' | 'break' | 'review' | 'whiteboard' | 'wander'
function usePointKey(ref: UsePointRef): string            // "objectId#index"
function resolveUsePoint(layout: OfficeLayout, ref: UsePointRef): UsePoint
function usePointsFor(world: SimWorld, agentId: string, activity: Activity): readonly UsePointRef[]
function isReservedByOther(sim: Simulation, world: SimWorld, ref: UsePointRef, agentId: string):
  boolean
function freeUsePointsFor(sim: Simulation, world: SimWorld, agentId: string, activity: Activity):
  readonly UsePointRef[]
function activityStatus(activity: Activity): ActivityStatus | null  // whiteboard/wander → null
```

- La exclusión se comprueba por **tile resuelto**: `isReservedByOther` es `true` si otro agente
  reserva cualquier punto cuyo tile coincida con el de `ref`. Además, `createSimWorld` rechaza un
  layout con dos puntos de uso en el mismo tile.
- `usePointsFor`: `work` → solo el punto del escritorio del agente; `meeting` → los de
  `meeting-table`; `break` → cafetera y luego sofá; `review`/`whiteboard` → pizarra; `wander` → `[]`.
  Orden: el de `layout.objects` y luego `index`.

### Estado de un agente (`agents/types.ts`)

```ts
interface AgentTarget { activity: Activity | null;   // null = go-to (orden sin actividad)
  tile: Coord; usePoint: UsePointRef | null; facing: Direction | null }
interface GridPosition { x: number; y: number }    // coordenadas de tile fraccionales (no píxeles)
interface AgentRuntime {
  id: string; status: AgentStatus; tile: Coord; next: Coord | null; stepMs: number;
  route: readonly Coord[]; facing: Direction; target: AgentTarget | null;
  reservation: UsePointRef | null; forced: boolean; timerMs: number | null; celebrateMs: number
}                                                         // todos readonly; reglas en data-model.md
```

### Movimiento (`agents/movement.ts`)

```ts
const STEP_DURATION_MS = 500
function agentPosition(agent: AgentRuntime): GridPosition // sobre el segmento tile→next
function directionBetween(from: Coord, to: Coord): Direction
function planRoute(world: SimWorld, from: Coord, to: Coord): readonly Coord[] | null
function advanceMovement(agent: AgentRuntime, dtMs: number): { agent: AgentRuntime; arrived: boolean }
```

- `planRoute` usa `findPath` de la 001: en éxito devuelve `path.slice(1)` (vacío si `from = to`); ante
  cualquier fallo de `findPath` (`blocked`, `unreachable`, `out-of-bounds`) devuelve `null`.

- `advanceMovement` avanza `dtMs` (múltiplo de `SIM_STEP_MS`) sobre `next`/`route`; al completar un
  paso, `tile = next`, toma el siguiente de `route` y actualiza `facing`; `arrived` es `true` en el
  paso en que alcanza el último tile. Nunca salta tiles ni sale de la ruta.

### Autonomía (`agents/autonomy.ts`)

```ts
const IDLE_PAUSE_MS: readonly [3000, 8000]
const WORK_MS: readonly [10000, 20000]
const BREAK_MS: readonly [5000, 10000]
const CELEBRATE_MS = 1000
const AUTONOMOUS_ACTIVITIES: readonly Activity[]          // ['work', 'break', 'whiteboard', 'wander']
function chooseAutonomousTarget(sim: Simulation, world: SimWorld, agentId: string):
  { target: AgentTarget | null; rng: RngState }
```

- Elige actividad con `pick(AUTONOMOUS_ACTIVITIES)`; si esa actividad no tiene **ningún candidato
  libre**, prueba las siguientes en el orden de la lista (circular) empezando por la elegida. `null` si
  ninguna tiene candidatos.
- Entre los candidatos libres de la actividad elegida se sortea siempre con `pick` (también si solo hay
  uno). Si el candidato sorteado no tiene ruta, `target: null` y el llamador conserva estado, posición
  y reserva y programa otra pausa (no se prueba otra actividad).
- Convenciones de consumo del PRNG (FR-019): por agente y en orden de equipo; una decisión consume
  exactamente `pick(actividad)` y `pick(candidato)`; la duración de la actividad se sortea al empezarla
  (al llegar o al empezar en el sitio); la pausa de reposo, al entrar en `idle` sin orden forzada.
  Los tiles de paseo se enumeran por filas (`y` y luego `x`).
- `wander`: tile caminable que no es punto de uso de ningún objeto, distinto de su tile y no ocupado
  (`tile` o `next`) ni elegido como destino (`target.tile`) por otro agente.
- Nunca devuelve `meeting` ni `review` (FR-018).

### Órdenes (`agents/orders.ts`)

```ts
type Order =
  | { type: 'activity'; activity: 'work' | 'meeting' | 'break' | 'review' }
  | { type: 'go-to'; tile: Coord }
  | { type: 'idle' }
type OrderResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: 'NO_FREE_SPOT' | 'UNREACHABLE' | 'INVALID_DESTINATION' | 'UNKNOWN_AGENT' }
function applyOrder(sim: Simulation, world: SimWorld, agentId: string, order: Order):
  { sim: Simulation; result: OrderResult }
function cancelForcedOrders(sim: Simulation, world: SimWorld): Simulation
```

- Orden aceptada: interrumpe al instante la actividad autónoma (sin celebrar), marca `forced`, libera la
  reserva anterior y reserva el nuevo punto. Origen de la ruta: `next` si va a mitad de paso, si no
  `tile` (Clarifications). Punto elegido: el libre más cercano por longitud de ruta; empate → orden de
  `usePointsFor`. `work` → siempre su escritorio.
- Si ya está en el punto elegido: `idle → actividad` directamente (`start-activity`).
- `NO_FREE_SPOT` / `UNREACHABLE` → `sim` sin cambios (mismo objeto).
- Repetición: si el agente ya tiene `forced` y su `target` es la misma actividad (en ella o caminando
  hacia ella) → `{ ok: true, changed: false }` y `sim` sin cambios. Si la misma actividad venía de la
  autonomía, la orden la **adopta**: conserva ruta, posición y reserva, marca `forced`, anula
  `timerMs` y `celebrateMs` → `{ ok: true, changed: true }`.
- Un agente `forced` en una actividad tiene `timerMs = null`: no termina por tiempo ni celebra.
- **Detenerse** (orden `idle` o `cancelForcedOrders` sobre un agente que camina): termina el paso en
  curso y se detiene en el primer tile, desde `next` y siguiendo su ruta, que no sea punto de uso de
  ningún objeto o que sea el punto que él mismo reserva. Si se detiene sobre su punto reservado lo
  conserva; si no, lo libera. Mientras tanto sigue en `walking` con `target = null` y pasa a `idle`
  al llegar (`arrive` con `activity: null`). Así un agente quieto nunca ocupa un punto ajeno.
- `idle` sobre un agente en una actividad: `idle` en su sitio conservando la reserva. En ambos casos
  quita `forced` y programa la pausa de reposo al quedar `idle`.
- `go-to`: orden sin actividad (`target.activity = null`) hacia un tile caminable que no sea punto de
  uso ni esté ocupado o elegido como destino por otro agente; si no → `INVALID_DESTINATION`. Termina
  en `idle` con `forced`.
- Varias órdenes antes de completar el mismo paso: gana la última; todas se calculan desde `next`.
- `cancelForcedOrders`: para cada agente con `forced`, el mismo efecto que `{ type: 'idle' }`.

### Simulación (`agents/simulation.ts`)

```ts
const SIM_STEP_MS = 10
const MAX_FRAME_MS = 250
const ACCEPTANCE_SEED: number
interface SimWorld { layout: OfficeLayout; walk: WalkabilityGrid; team: readonly AgentProfile[] }
interface Simulation { timeMs: number; rng: RngState; agents: readonly AgentRuntime[] }
function createSimWorld(layout: OfficeLayout, team: readonly AgentProfile[]): SimWorld
function createSimulation(world: SimWorld, seed: number): Simulation
function stepSimulation(sim: Simulation, world: SimWorld): Simulation     // +SIM_STEP_MS
function advanceFrame(sim: Simulation, world: SimWorld, accumulatorMs: number, frameDtMs: number):
  { sim: Simulation; accumulatorMs: number }
function agentById(sim: Simulation, id: string): AgentRuntime | undefined
```

- `createSimWorld` lanza `Error` con todos los mensajes si `validateLayout` o `validateTeam` fallan.
- `createSimulation`: todos en `idle` sobre el punto de su escritorio, mirando según el punto, con su
  reserva y una pausa de reposo sorteada (FR-007).
- `stepSimulation` procesa los agentes en orden de equipo: movimiento, llegadas (`arrive`),
  temporizadores y vencimiento de la pausa (decisión autónoma). Los agentes `forced` no deciden ni
  terminan por tiempo.
- Temporizadores: un temporizador creado en un paso empieza a descontar en el paso siguiente. Al
  vencer el de `working` autónomo empieza la celebración (`celebrateMs = CELEBRATE_MS`, sigue en
  `working`); al agotarse `celebrateMs` → `finish` → `idle`. Al vencer el de `break` → `finish` →
  `idle` (sin celebrar).
- `advanceFrame` recorta `frameDtMs` a `MAX_FRAME_MS`, ejecuta `floor((acc + recortado) /
  SIM_STEP_MS)` pasos y devuelve el resto. Garantía (SC-006): con el mismo acumulador inicial, dos
  secuencias de cuadros cuyos tiempos **ya recortados** suman lo mismo dan el mismo `Simulation`
  (p. ej. `[500]` avanza 250 ms y `[250, 250]` avanza 500 ms).
- Con `ACCEPTANCE_SEED`, cada agente completa al menos un ciclo autónomo en 60 000 ms simulados
  (SC-005).

### Selección (`agents/selection.ts`)

```ts
function selectByNumber(teamIds: readonly string[], current: string | null, n: number): string | null
function cycleSelection(teamIds: readonly string[], current: string | null, direction: 1 | -1):
  string | null
```

- `selectByNumber`: `n` en 1..9; sin agente en esa posición devuelve `current` (sin cambios).
- `cycleSelection`: siguiente/anterior cíclico; sin selección, `1` → primero y `-1` → último; equipo
  vacío → `null`.

## Geometría de escena (Claude)

```ts
interface CharacterPlacement { id: string; teamIndex: number; position: GridPosition; tile: Coord;
  next: Coord | null }
type SceneItem = { type: 'object'; id: string } | { type: 'agent'; id: string }
type SceneHoverTarget = HoverTarget | { type: 'agent'; id: string }
const CHARACTER_BODY: { width: number; height: number }
function positionToWorld(pos: GridPosition, tileSize?: TileSize): Point  // centro del tile en px
function sceneOrder(layout: OfficeLayout, characters: readonly CharacterPlacement[]): SceneItem[]
function characterSilhouette(position: GridPosition, tileSize?: TileSize): Point[]
function sceneHitTest(worldPoint: Point, layout: OfficeLayout,
  characters: readonly CharacterPlacement[]): SceneHoverTarget
function centerOn(camera: Camera, worldPoint: Point, viewport: Viewport, layout: OfficeLayout): Camera
```

- `sceneOrder` sin personajes ≡ `drawOrder` de la 001. Clave de research R10; entre personajes con la
  misma clave de tile decide la profundidad fraccional (`position.x + position.y`) y, si también
  empata, va después el de mayor `teamIndex` (FR-023). Dos agentes que se cruzan en el mismo segmento
  invierten su orden al cruzarse.
- `sceneHitTest` recorre `sceneOrder` al revés: objetos con su silueta de la 001, personajes con
  `characterSilhouette`; luego suelo; luego `null`.
- `positionToWorld` equivale a `tileCenter` de la 001 con coordenadas fraccionales; la usan dibujo,
  silueta, hit-test y seguimiento de cámara. `GridPosition` se define en `agents/types.ts`.
- `centerOn` conserva el zoom y aplica el límite de cámara de la 001 (FR-028).
