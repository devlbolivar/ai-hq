---

description: "Task list for 002-marketing-team"
---

# Tasks: Equipo de Marketing (agentes seleccionables)

**Input**: Design documents from `/specs/002-marketing-team/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: OBLIGATORIOS (constitución, principio II — TDD). Cada tarea `RED` escribe tests que DEBEN
fallar antes de su tarea `GREEN`. Commits: `test:` (RED) → `feat:` (GREEN) → `refactor:` (opcional).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of
each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- **(Codex)**: tarea de dominio delegada a Codex (modelo `gpt-6.2-sol`, esfuerzo `medium`) en un
  worktree (plan.md, research R1); la API está fijada en contracts/domain-api.md. Por cuota limitada,
  Codex solo tiene 3 módulos puros y aislados: máquina de estados, PRNG y selección (6 tareas en un
  único bundle). No toca `apps/web`, `specs/`, `tasks.md`, `index.ts` ni `exports.test.ts`; Claude
  marca sus casillas en el commit de merge del bundle y exporta sus módulos.
- **RED / GREEN**: RED = escribir tests que fallan; GREEN = mínimo código para pasarlos
- **Hecho** = tests de la tarea en verde + `pnpm lint && pnpm typecheck` sin errores + casilla marcada

## Path Conventions

Monorepo pnpm (ver plan.md): `packages/domain/{src,test}`, `apps/web/{src,test,e2e}`. Tests de dominio
nuevos en `packages/domain/test/agents/`, `test/scene/` y `test/camera/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: soporte de tests para el diálogo modal y base de código con el fix de la 001

- [x] T001 RED→GREEN: add `apps/web/test/setup.ts` with a minimal `HTMLDialogElement.prototype.showModal`/`close` stub (sets/clears `open`, dispatches `close`) and register it as `setupFiles` of the `web` project in `vitest.config.ts`; test first in `apps/web/test/setup.test.ts` (a `<dialog>` opens with `showModal()` and closes with `close()`) (research R14)
- [x] T002 Merge `main` into `002-marketing-team` once the user has merged the `fix/001-review` PR; run `pnpm test` (validateLayout now has `MISSING_USE_POINT` and `INVALID_GEOMETRY`). BLOQUEA las tareas que tocan `store.ts`, `mouse.ts`, `keyboard.ts`, `OfficeCanvas.tsx`, `testHook.ts`, `HoverLabel.tsx` o `e2e/scene.spec.ts` (research R15); no bloquea el dominio ni los archivos nuevos de la web

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: datos de agentes validados, máquina de estados, núcleo de simulación, geometría de escena
y store con la simulación. Lo necesitan todas las historias.

**⚠️ CRITICAL**: el trabajo de integración de las historias (store, OfficeCanvas, e2e) no empieza hasta
cerrar esta fase. Los archivos nuevos de render y UI de las historias (T036–T040, T046, T051–T053, T058, T071)
pueden empezar en paralelo a esta fase.

### Datos, validación y máquina de estados (Claude; máquina de estados: Codex)

- [x] T003 [P] Define all agent types in `packages/domain/src/agents/types.ts` per contracts/domain-api.md and data-model.md: `AgentColorId`, `SkinTone`, `HairStyle`, `HairColor`, `Accessory`, `Appearance` (data-model.md `Appearance.skinTone`, `Appearance.hairStyle`, `Appearance.hairColor`, `Appearance.accessory`), `AgentProfile`, `AgentDraft`, `GridPosition`, `UsePointRef`, `Activity`, `AgentTarget` (data-model.md `AgentTarget.activity` may be `null`), `AgentRuntime`, `Simulation`, `SimWorld`, `Order`, `OrderResult` — all `readonly`; catalog id unions per data-model.md "Catálogo" (`AgentColorId`, `SkinTone`, `HairStyle`, `HairColor`, `Accessory`) (FR-002)
- [x] T004 [P] RED: catalog tests in `packages/domain/test/agents/catalog.test.ts` — 10 agent colors, 4 skin tones, 4 hair styles, 5 hair colors, 4 accessories incl. `none`; unique ids per list; distinct `hex` among agent colors; every entry has a Spanish `name`; `agentColorHex` returns the entry's hex (data-model.md "Catálogo", research R3)
- [x] T005 GREEN: implement `AGENT_COLORS`, `SKIN_TONES`, `HAIR_STYLES`, `HAIR_COLORS`, `ACCESSORIES`, `agentColorHex` in `packages/domain/src/agents/catalog.ts`
- [x] T006 [P] RED: prompt tests in `packages/domain/test/agents/prompt.test.ts` — `ZERO_INVENTION_RULE` mentions métricas, estadísticas, testimonios, citas, tendencias, datos de terceros and asks for the missing data; `cleanSystemPrompt` removes every literal copy of the rule and trims; `effectivePrompt` = rule + blank line + cleaned prompt and contains the rule exactly once, also when the prompt already contains it once or twice (FR-005, constitución V, research R4)
- [x] T007 GREEN: implement `ZERO_INVENTION_RULE`, `cleanSystemPrompt`, `effectivePrompt` in `packages/domain/src/agents/prompt.ts`
- [x] T008 [P] RED: team validation tests in `packages/domain/test/agents/validate.test.ts` — one invalid fixture per `AgentError.code` of data-model.md "Validación de agentes" (`DUPLICATE_ID`, `DUPLICATE_DESK`, `DUPLICATE_COLOR`, `DUPLICATE_NAME`, `UNKNOWN_DESK` incl. a non-desk object id, `UNKNOWN_COLOR`, `UNKNOWN_APPEARANCE` per appearance field, `EMPTY_FIELD`, `TOO_LONG`) covering data-model.md `AgentProfile.id`, `AgentProfile.name`, `AgentProfile.role`, `AgentProfile.color`, `AgentProfile.appearance`, `AgentProfile.deskId`, `AgentProfile.systemPrompt`; each error has `agentId`, `field` and a Spanish message naming both; several errors returned together; never throws (FR-006)
- [x] T009 [P] RED: draft validation tests in the same file's `describe('validateAgentDraft')` block — name trimmed 1–30, unique case-insensitively against the other agents; role 1–40; color in catalog and not used by another agent (message names that agent); appearance fields in catalog; system prompt 1–4000 measured on `cleanSystemPrompt`; `{}` when valid; `applyDraft` keeps `id`/`deskId`, trims name/role and stores the cleaned prompt (FR-030, contracts/domain-api.md "Validación")
- [x] T010 GREEN: implement `validateTeam`, `validateAgentDraft`, `applyDraft` and the length constants in `packages/domain/src/agents/validate.ts` until T008–T009 pass
- [x] T011 [P] RED: seed tests in `packages/domain/test/agents/seed.test.ts` — exactly 6 profiles in FR-001 order with the ids, English names, Spanish roles and `desk-1`…`desk-6` of contracts/domain-api.md; distinct colors and distinct appearance combinations (FR-003); each Spanish `systemPrompt` describes its role's tasks per FR-004 (keyword checks per role) and does not contain the rule; `validateTeam(marketingTeam, marketingLayout).ok`; `effectivePrompt` of each of the 6 contains the rule exactly once (FR-005)
- [x] T012 GREEN: write `marketingTeam` in `packages/domain/src/agents/seed.ts`
- [x] T013 [P] (Codex) RED: state machine tests in `packages/domain/test/agents/stateMachine.test.ts` — table of the 36 (from, to) pairs per research R2: valid pairs accepted with their condition met, conditioned pairs rejected with the condition unmet (`UNREACHABLE`, `NOT_ON_FREE_USE_POINT`, `NOT_ARRIVED`), unlisted pairs rejected with `INVALID_TRANSITION` for every trigger that targets them; pair type is checked before the condition (FR-008, FR-010, SC-003)
- [x] T014 (Codex) GREEN: implement `AGENT_STATUSES`, `isActivityStatus`, `transition` in `packages/domain/src/agents/stateMachine.ts`
- [x] T015 Export catalog, prompt, validation and seed from `packages/domain/src/index.ts` and extend `packages/domain/test/exports.test.ts` with their names from contracts/domain-api.md
- [x] T016 Integrate the Codex bundle `/tmp/codex-domain.bundle` (T013–T014, T023–T024, T049–T050): fetch, review the diff against contracts/domain-api.md, run `pnpm test`, `git merge --no-ff` marking those tasks, remove worktree, branch and ref; then export `transition`, the PRNG and selection from `index.ts` (+ `exports.test.ts`)

### Geometría de escena (Claude)

- [x] T017 [P] RED: tests in `packages/domain/test/scene/characterHit.test.ts` — `positionToWorld` equals `tileCenter` for integer positions and interpolates linearly between neighbors; `characterSilhouette` is the `CHARACTER_BODY` rectangle anchored at `positionToWorld` (data-model.md `CharacterPlacement.position`, `CharacterPlacement.id`, `CharacterPlacement.tile`, research R10)
- [x] T018 GREEN: implement `CHARACTER_BODY`, `positionToWorld`, `characterSilhouette` in `packages/domain/src/scene/characterHit.ts`
- [x] T019 [P] RED: tests in `packages/domain/test/scene/sceneOrder.test.ts` — no characters ≡ `drawOrder`; a character on chair `chair-1` goes right after it and before the front-row desk `desk-4` (US1-3); a character on either sofa tile goes after `sofa`; a walking character uses the tile of greater `x+y`; equal tile key → fractional depth decides and two agents crossing on the same segment swap order at the crossing; full tie → higher `teamIndex` last (FR-023, data-model.md `CharacterPlacement.teamIndex`, `CharacterPlacement.next`)
- [x] T020 GREEN: implement `sceneOrder` in `packages/domain/src/scene/sceneOrder.ts`
- [x] T021 RED: `sceneHitTest` tests in `packages/domain/test/scene/characterHit.test.ts` — a point on a character's body returns `{ type: 'agent', id }`; a character drawn in front of an object wins and vice versa (desk in front of a back-row character); overlapping characters → the one drawn in front; points above the head (bubble), on the ring area outside the body and in the lower half of the character's tile (below the feet) fall through to the floor tile; otherwise same as `hitTest` of the 001 (FR-023, US1-6)
- [x] T022 GREEN: implement `sceneHitTest` in `packages/domain/src/scene/characterHit.ts` and export T018–T022 from `packages/domain/src/index.ts` (+ `exports.test.ts`)

### Núcleo de simulación — PRNG (Codex), puntos de uso, movimiento y simulación (Claude)

- [x] T023 [P] (Codex) RED: PRNG tests in `packages/domain/test/agents/rng.test.ts` — same seed → same sequence; `nextFloat` in [0, 1); `randomInt` inclusive bounds and uniform-ish over 10 000 draws; `pick` always consumes one value (also with one item); state is a `uint32` (data-model.md `Simulation.rng`, research R7)
- [x] T024 (Codex) GREEN: implement `seedRng`, `nextFloat`, `randomInt`, `pick` in `packages/domain/src/agents/rng.ts`
- [x] T025 [P] RED: use point tests in `packages/domain/test/agents/usePoints.test.ts` — `usePointsFor` per activity and order (work → only the agent's own desk point; break → coffee then sofa; meeting 6; review/whiteboard 1; wander none); `usePointKey`; `resolveUsePoint`; `isReservedByOther` compares resolved tiles (data-model.md `UsePointRef`, `AgentRuntime.reservation`, FR-009, FR-014)
- [x] T026 GREEN: implement `packages/domain/src/agents/usePoints.ts`
- [x] T027 [P] RED: movement tests in `packages/domain/test/agents/movement.test.ts` — `planRoute` = `findPath(...).path.slice(1)` or `null` on any failure; `advanceMovement` at 2 tiles/s: after 250 ms the position is halfway, after 500 ms `tile = next`; position always on the `tile→next` segment; turns only at tile boundaries; `facing` follows the current step; `arrived` on the last tile (FR-011, FR-012, FR-013, data-model.md `AgentRuntime.tile`, `AgentRuntime.next`, `AgentRuntime.stepMs`, `AgentRuntime.route`, `AgentRuntime.facing`)
- [x] T028 GREEN: implement `STEP_DURATION_MS`, `agentPosition`, `directionBetween`, `planRoute`, `advanceMovement` in `packages/domain/src/agents/movement.ts`
- [x] T029 [P] RED: simulation core tests in `packages/domain/test/agents/simulation.test.ts` — `createSimWorld` throws listing errors for an invalid layout, an invalid team or two use points on one tile; `createSimulation` puts every agent `idle` on its desk point with its reservation and facing (FR-007); `stepSimulation` adds `SIM_STEP_MS`; arrivals and every status change go through `transition` (data-model.md `AgentRuntime.status`); agent order and ids follow the team (data-model.md `AgentRuntime.id`); timers start counting on the next step; `advanceFrame` clips each frame to 250 ms (`[500]` advances 250 ms, `[250, 250]` 500 ms) and same clipped sums give equal simulations (FR-015, data-model.md `Simulation.timeMs`, `AgentRuntime.timerMs`, `AgentRuntime.celebrateMs`)
- [x] T030 GREEN: implement `SIM_STEP_MS`, `MAX_FRAME_MS`, `createSimWorld`, `createSimulation`, `stepSimulation` (movement, arrivals, activity timers and celebration; no autonomous decisions yet), `advanceFrame`, `agentById` in `packages/domain/src/agents/simulation.ts`

### Store con la simulación (Claude, tras T002 y T030)

- [x] T031 [P] RED: seed source tests in `apps/web/test/seed.test.ts` — `?seed=N` parsed as integer; invalid or missing → value from an injected clock; `?paused=1` honored only when the test hook is exposed (contracts/ui-contract.md "Hook de pruebas")
- [x] T032 GREEN: implement `readSimOptions(location, env, now)` in `apps/web/src/seed.ts`
- [x] T033 RED: store tests in `apps/web/test/state/agents.test.ts` — the store holds `team` = `marketingTeam`, `world`, `sim` from the seed; `tick(dtMs)` calls `advanceFrame` and keeps `accumulatorMs`; `tick` does nothing while `paused`; the store starts `paused` when `readSimOptions` says so (`?paused=1`) and uses its seed; creating the store with an invalid team throws with the validation messages (data-model.md "Estado de la web": `team`, `world`, `sim`, `accumulatorMs`, `paused`)
- [x] T034 GREEN: add `team`, `world`, `sim`, `accumulatorMs`, `paused`, `seed` and `tick` to `apps/web/src/state/store.ts`, created from `readSimOptions` (T032); call `store.getState().tick(ticker.deltaMS)` from the Pixi ticker in `apps/web/src/render/OfficeCanvas.tsx`
- [x] T035 Export the simulation core (T025–T030) from `packages/domain/src/index.ts` (+ `exports.test.ts`)

**Checkpoint**: dominio base y store con simulación listos — las historias pueden integrarse

---

## Phase 3: User Story 1 — Ver a mi equipo en la oficina (Priority: P1) 🎯 MVP

**Goal**: 6 personajes dibujados por código en sus escritorios, ordenados en profundidad con los
muebles, con burbuja de estado, hover con nombre y panel de equipo.

**Independent Test**: abrir la app → 6 agentes `idle` en los escritorios 1–6, colores distintos que
coinciden con 6 tarjetas numeradas, el escritorio delantero tapa al personaje de atrás, hover muestra
el nombre.

- [x] T036 [P] [US1] RED: tests in `apps/web/test/render/characterShapes.test.ts` — `characterShapes(appearance, color, facing, pose, t)` returns shapes inside `CHARACTER_BODY`; body uses the agent color, head the skin tone, hair shape per `hairStyle` with `hairColor`, accessory shapes per `accessory` (none → no extra shapes); the 4 facings differ (FR-022); the poses `idle`, `walk`, `type`, `coffee`, `celebrate` change limb shapes over `t` (FR-024) (data-model.md `AgentProfile.color`, `AgentProfile.appearance`)
- [x] T037 [US1] GREEN: implement `characterShapes` in `apps/web/src/render/character/shapes.ts` (pure geometry: ellipse, rect, polygon, with fill colors from the domain catalog; no image assets, FR-021, constitución VIII)
- [x] T038 [P] [US1] RED: tests in `apps/web/test/render/characterPixi.test.ts` — `createCharacterView(profile)` builds a `Container` labelled `agent:<id>` whose parts redraw only when facing or appearance change; `updateCharacterView(view, runtime, t)` positions it at `positionToWorld(agentPosition)` and applies pose transforms without recreating `Graphics`
- [x] T039 [US1] GREEN: implement `apps/web/src/render/character/pixi.ts` (Pixi renderer of `characterShapes`, research R11)
- [x] T040 [P] [US1] RED→GREEN: bubble tests in `apps/web/test/render/drawBubble.test.ts` then `apps/web/src/render/drawBubble.ts` — no bubble for `idle`; one distinct code-drawn icon per other status; Spanish status text only for the selected agent ("Caminando", "Trabajando", "En reunión", "Descanso", "Esperando revisión"); status labels in `apps/web/src/render/palette.ts` (FR-025)
- [x] T041 [US1] RED: e2e `apps/web/e2e/team.spec.ts` — the scene with the 6 agents is ready in under 2 s (SC-001); 6 agents `idle` on the desk use points of `desk-1`…`desk-6` (FR-007, US1-1); distinct colors matching their cards (US1-2); `sceneOrder` places `agent:head-of-marketing` after `chair-1` and before `desk-4` (US1-3); 6 cards in seed order numbered 1–6 with name, role, color and status (US1-4); hovering a character shows its name (US1-6); extend `apps/web/e2e/support/hook.ts` with the agent fields of contracts/ui-contract.md and an `openOffice(page, { seed, paused })` option
- [x] T042 [US1] Add characters to the `objects` container of `apps/web/src/render/OfficeCanvas.tsx` with `sortableChildren` and `zIndex` from `sceneOrder` (recomputed when `sim` changes), plus a `bubbles` layer above `objects`; update views every frame from `sim` (research R10, R11)
- [x] T043 [US1] RED: test hook tests in `apps/web/test/testHook.test.ts` — `drawOrder` keeps only object labels, `sceneOrder` lists real child labels incl. `agent:<id>`, and `agents`, `seed`, `simTimeMs`, `paused`, `agentToScreen` per contracts/ui-contract.md
- [x] T044 [US1] GREEN: extend `apps/web/src/testHook.ts` and its wiring in `OfficeCanvas.tsx`; open the 001 specs that hover or click fixed tiles (`hover.spec.ts`, `debug.spec.ts`) with `paused: true` so agents cannot walk through their targets, and make `debug.spec.ts` click the lower half of `desk4Chair` (below the seated agent's feet) via a `floorPointOf(tile)` helper in `apps/web/e2e/support/hook.ts`, so the click still picks the tile (FR-026)
- [x] T045 [US1] RED→GREEN: hover on characters — store tests in `apps/web/test/state/hover.test.ts` (hover uses `sceneHitTest` with current placements, recomputed when `sim` changes under a still pointer; data-model.md `OfficeState.hover`) and `apps/web/test/ui/HoverLabel.test.tsx` (agent hover shows the agent name, `getByRole('status', { name })`); implement in `apps/web/src/state/store.ts`, `apps/web/src/render/drawOverlay.ts` (character highlight) and `apps/web/src/ui/HoverLabel.tsx`
- [x] T046 [P] [US1] RED: `apps/web/test/ui/TeamPanel.test.tsx` — region "Equipo" with 6 cards in team order; each card shows number, name, role, color swatch (`data-color`) and Spanish status; status changes re-render within the same tick (US1-4, US1-5, FR-033)
- [x] T047 [US1] GREEN: implement `apps/web/src/ui/TeamPanel.tsx` (selective subscriptions so the 60 Hz `sim` updates only re-render on status changes) and mount it in `apps/web/src/App.tsx`
- [x] T048 [US1] Make `apps/web/e2e/team.spec.ts` (T041) and the full 001 e2e suite pass (`pnpm e2e --workers=3`)

**Checkpoint**: US1 entregable (MVP visible)

---

## Phase 4: User Story 2 — Seleccionar y seguir a un agente (Priority: P2)

**Goal**: selección por clic, tarjeta, `1`–`9`, `Tab`/`Shift+Tab`, `Esc`; anillo; tarjeta destacada;
cámara que centra y sigue.

**Independent Test**: cada método de selección deja el agente con anillo, tarjeta destacada y centrado;
`Esc` quita la selección; arrastrar deja de seguir sin deseleccionar.

- [x] T049 [P] [US2] (Codex) RED: selection tests in `packages/domain/test/agents/selection.test.ts` — `selectByNumber` 1–6 selects, 7–9 keep `current`; `cycleSelection` wraps both ways, from `null` Tab → first and Shift+Tab → last, empty team → `null` (FR-026, US2-3, US2-4)
- [x] T050 [US2] (Codex) GREEN: implement `packages/domain/src/agents/selection.ts` and export it
- [x] T051 [P] [US2] RED: `centerOn` tests in `packages/domain/test/camera/follow.test.ts` — keeps zoom; the world point lands on the viewport center when the limits allow; otherwise the closest camera allowed by the 001 limits (FR-028)
- [x] T052 [US2] GREEN: implement `centerOn` in `packages/domain/src/camera/follow.ts` and export it
- [x] T053 [P] [US2] RED→GREEN: `apps/web/test/state/follow.test.ts` then `apps/web/src/state/follow.ts` — `followOffset(start, target, elapsedMs)` eases out and reaches `target` at 400 ms (≤ 500 ms, FR-028)
- [x] T054 [US2] RED: store selection tests in `apps/web/test/state/selection.test.ts` — `select(id)` sets `selection` and starts following; each frame keeps the agent centered (≤ 2 px or clamped) incl. after `setViewport`; `panBy`/`zoomAt`/`recenter` stop following but keep the selection; `select` again resumes; selecting while `paused` still centers (the follow transition uses frame time, not `sim.timeMs`); `selectNumber`, `cycle`, `deselect` (data-model.md `Selection.agentId`, `Selection.following`, `OfficeState.follow`; FR-026–FR-028)
- [x] T055 [US2] GREEN: implement selection and follow in `apps/web/src/state/store.ts`
- [ ] T056 [US2] RED→GREEN: keyboard tests in `apps/web/test/input/keyboard.test.ts` then `apps/web/src/input/keyboard.ts` — `1`–`9`, `Tab`, `Shift+Tab`, `Esc` act and `preventDefault` only with focus outside `input, textarea, select, button, a[href], [contenteditable]`; 001 shortcuts unchanged (FR-029, US2-9)
- [ ] T057 [US2] RED→GREEN: mouse tests in `apps/web/test/input/mouse.test.ts` then `apps/web/src/input/mouse.ts` — a click without drag calls `clickAt(screenPoint)`; store `clickAt`: character → select (also in debug); elsewhere → debug on: `selectTile` keeping the selection, debug off: deselect; a press on a character that becomes a drag only pans (FR-026, US2-1, US2-8, US2-10, edge cases)
- [x] T058 [P] [US2] RED→GREEN: `apps/web/test/render/drawRing.test.ts` then `apps/web/src/render/drawRing.ts` — ellipse in the agent color under the feet, first child of the character view, only for the selected agent (FR-027); the e2e checks it through the hook field `ringFor` (agent id with a visible ring, or `null`) added in T059
- [ ] T059 [US2] Wire the ring and the follow camera into `apps/web/src/render/OfficeCanvas.tsx` and publish `ringFor` in `apps/web/src/testHook.ts`; make cards selectable (`aria-pressed`, click selects) in `apps/web/src/ui/TeamPanel.tsx` with tests in `apps/web/test/ui/TeamPanel.test.tsx`
- [x] T060 [P] [US2] RED→GREEN: `apps/web/test/ui/AgentPanel.test.tsx` then `apps/web/src/ui/AgentPanel.tsx` — region "Agente seleccionado" with name, role and Spanish status, hidden without selection; mount in `App.tsx`
- [ ] T061 [US2] E2E `apps/web/e2e/selection.spec.ts` — click on a character, card click, `3`, `7`, Tab/Shift+Tab wrap, `Esc` (US2-1…US2-5) with `ringFor` and the card's `aria-pressed` matching the selection, each leaving the agent centered in under 1 s (SC-004); drag/zoom/Recentrar stop following and re-select resumes (US2-7); click on floor deselects; with debug on, click on a character selects and on floor picks a route end (US2-8, US2-10); focus on a button keeps native Tab (US2-9)

**Checkpoint**: US1 + US2 funcionan de forma independiente

---

## Phase 5: User Story 3 — Ver al equipo trabajar por su cuenta (Priority: P3)

**Goal**: autonomía determinista con semilla, animaciones por estado y pausa con `Space`.

**Independent Test**: con `?seed=<ACCEPTANCE_SEED>`, en 60 s cada agente completa un ciclo; `Space`
congela y reanuda; misma semilla → misma secuencia (dominio).

- [x] T062 [P] [US3] RED: autonomy tests in `packages/domain/test/agents/autonomy.test.ts` — activity by `pick`, fallback only when the chosen activity has no free candidate; `pick` among candidates always; unreachable chosen candidate → `target: null`; work → own desk; break → free coffee/sofa point; whiteboard → ends `idle` facing it; wander tile is walkable, not a use point, not its tile, not occupied or targeted by another; never meeting/review (FR-016, FR-018, research R8)
- [x] T063 [US3] GREEN: implement `packages/domain/src/agents/autonomy.ts`
- [x] T064 [US3] RED: autonomy-in-simulation tests in `packages/domain/test/agents/simulation.test.ts` — idle pause 3–8 s then decision; durations work 10–20 s, break 5–10 s, drawn when the activity starts; natural end of `working` celebrates 1 s still `working`, then `idle` (FR-017); reservations kept while `idle` on a point and released only when leaving; never two agents on one point and never on a non-walkable tile over 5 simulated minutes (SC-005); `ACCEPTANCE_SEED` gives every agent a full autonomous cycle within 60 000 ms (FR-019); two runs of 5 simulated minutes with different frame sizes are identical at every common simulated instant (SC-006)
- [x] T065 [US3] GREEN: call autonomy from `stepSimulation` in `packages/domain/src/agents/simulation.ts`, fix `ACCEPTANCE_SEED`, export T063–T065
- [x] T066 [US3] Write the `ACCEPTANCE_SEED` value fixed in T065 in `specs/002-marketing-team/quickstart.md`
- [ ] T067 [US3] RED→GREEN: pause — store tests (`togglePause`; `tick` frozen; animation time is `sim.timeMs`) in `apps/web/test/state/agents.test.ts`, keyboard `Space` (same focus rules as T056) in `apps/web/test/input/keyboard.test.ts`, and `apps/web/test/ui/PauseIndicator.test.tsx` (status "Simulación en pausa"); implement in `store.ts`, `keyboard.ts`, `apps/web/src/ui/PauseIndicator.tsx` (FR-020, US3-8)
  > WIP (Claude): store `togglePause` and `PauseIndicator` done; the `Space` key in `keyboard.ts` waits for T002.
- [x] T068 [US3] RED: pose mapping tests in `apps/web/test/render/pose.test.ts` — `poseFor(runtime)`: `walking` → walk, `working` → type (celebrate while `celebrateMs > 0`), `break` → coffee (standing at the coffee machine, sitting on the sofa), `idle`/`meeting`/`waiting_review` → idle breathing; facing from `AgentRuntime.facing` (FR-013, FR-024)
- [x] T069 [US3] GREEN: implement `apps/web/src/render/character/pose.ts` and use it in `character/pixi.ts` with `t = sim.timeMs`
- [ ] T070 [US3] E2E `apps/web/e2e/autonomy.spec.ts` with `?seed=<ACCEPTANCE_SEED>` — within 15 s at least one agent leaves its desk and reaches an activity or tile; positions are always walkable tiles or segments between neighbors; `Space` freezes `simTimeMs` and positions for 1 s and resumes from the same values (US3-1, US3-2, US3-8)

**Checkpoint**: US3 funciona; US1–US2 siguen verdes

---

## Phase 6: User Story 4 — Editar un agente (Priority: P4)

**Goal**: editor modal con vista previa, validación junto a cada campo, guardar, cancelar y restaurar.

**Independent Test**: editar todos los campos y guardar actualiza personaje y tarjeta; valores
inválidos no guardan; cancelar y `Esc` no aplican; restaurar + guardar vuelve a la semilla.

- [x] T071 [P] [US4] RED→GREEN: `apps/web/test/render/characterSvg.test.tsx` then `apps/web/src/render/character/svg.tsx` — `CharacterSvg` renders `characterShapes` as SVG (`role="img"`, accessible name) and changes with appearance and color (FR-031)
- [x] T072 [US4] RED: store editor tests in `apps/web/test/state/editor.test.ts` — `openEditor(id)` selects and opens; `saveAgent(id, draft)` with `validateAgentDraft` errors returns them and changes nothing; valid → `applyDraft`, updates `team` and `world` keeping `sim`; `closeEditor` keeps the selection; while open, keyboard and mouse actions of the office do nothing (data-model.md `OfficeState.editor`, `OfficeState.team`; FR-029, FR-032)
- [ ] T073 [US4] GREEN: implement the editor state in `apps/web/src/state/store.ts` and the modal guard in `apps/web/src/input/keyboard.ts` and `apps/web/src/input/mouse.ts`
  > WIP (Claude): editor state in `store.ts` done (`editor`, `openEditor`, `closeEditor`, `saveAgent`); the modal guards in `keyboard.ts` and `mouse.ts` wait for T002.
- [x] T074 [US4] RED: `apps/web/test/ui/AgentEditor.test.tsx` — dialog "Editar agente: Nombre" with current values; preview updates on change but the store does not until "Guardar"; errors shown next to name, role, color, appearance and system prompt (`aria-invalid`, `aria-describedby`) for the cases of US4-4/US4-5 (data-model.md `AgentProfile.name`, `AgentProfile.role`, `AgentProfile.color`, `AgentProfile.appearance`, `AgentProfile.systemPrompt`); the rule as a non-editable note; "Cancelar" and `Esc` close without applying; "Restaurar valores originales" fills seed values; edits survive store updates while open (US4-1…US4-8)
- [ ] T075 [US4] GREEN: implement `apps/web/src/ui/AgentEditor.tsx` (`<dialog>` + `showModal`, research R14) and "Editar" buttons in `TeamPanel.tsx` and `AgentPanel.tsx`; mount the editor in `App.tsx`; `hook.editorOpen`
  > WIP (Claude): `AgentEditor` dialog, "Editar" buttons in `TeamPanel`/`AgentPanel` and mount in `App.tsx` done; `hook.editorOpen` in `testHook.ts` waits for T002.
- [ ] T076 [US4] E2E `apps/web/e2e/editor.spec.ts` — open from a card, change name, color and hair, preview changes but the office does not, save → card name and `hook.agents[i].color` updated (US4-1…US4-3); empty and duplicate names and a used color show errors (US4-4); `Esc` closes keeping the selection and Tab/numbers do nothing while open (US2-9, US4-6); restore + save returns to seed (US4-7); reload returns to seed (FR-032a)

**Checkpoint**: US4 funciona de forma independiente

---

## Phase 7: User Story 5 — Forzar estados para comprobarlos (Priority: P5)

**Goal**: órdenes de depuración en el panel del agente, aviso "Sin sitio libre", cancelación al
desactivar depuración.

**Independent Test**: con depuración, cada orden lleva al agente al estado y punto esperados; sin sitio
libre muestra el aviso; desactivar depuración devuelve la autonomía.

- [x] T077 [P] [US5] RED: order tests in `packages/domain/test/agents/orders.test.ts` — nearest free point by route length with layout-order ties; `work` always own desk; on the point → direct `start-activity`; `NO_FREE_SPOT`/`UNREACHABLE` leave `sim` untouched; repeating a forced activity → `changed: false`; same activity from autonomy is adopted (`forced`, timers cleared, no celebration); interrupting autonomous work does not celebrate; mid-step orders take effect at `next` and the last order wins; stopping ends the step and halts on the first route tile that is not someone else's use point, keeping its own reservation only when stopping on it; `go-to` rejects use points and occupied/targeted tiles (`INVALID_DESTINATION`); `cancelForcedOrders` = `idle` for every forced agent and autonomy resumes; forced agents never decide or end by time (FR-014, FR-017a, FR-034 as amended, contracts/domain-api.md "Órdenes", data-model.md `AgentRuntime.forced`, `AgentRuntime.target`, `AgentTarget.activity`)
- [x] T078 [US5] GREEN: implement `applyOrder`, `cancelForcedOrders` in `packages/domain/src/agents/orders.ts` and export them

- [x] T079 [US5] RED: store order tests in `apps/web/test/state/orders.test.ts` — `sendOrder(id, order)` calls `applyOrder`; `NO_FREE_SPOT` sets `notice` "Sin sitio libre" (cleared after ~2 s); while `paused` orders queue and apply in arrival order on resume; `toggleDebug` off calls `cancelForcedOrders` and empties the queue (data-model.md `OfficeState.queuedOrders`, `OfficeState.notice`; FR-020, FR-034)
- [x] T080 [US5] GREEN: implement `sendOrder`, the queue and `notice` in `apps/web/src/state/store.ts`
- [x] T081 [P] [US5] RED→GREEN: `apps/web/test/ui/Notice.test.tsx` then `apps/web/src/ui/Notice.tsx` — `status` "Sin sitio libre" visible while `notice` is set
- [x] T082 [US5] RED→GREEN: `apps/web/test/ui/AgentPanel.test.tsx` then `AgentPanel.tsx` — group "Órdenes de depuración" only with debug on: "Trabajar", "Reunión", "Descanso", "Entregar a revisión", "Volver a idle" send the matching `Order` (US5-5)
- [ ] T083 [US5] RED→GREEN: hook controls in `apps/web/test/testHook.test.ts` then `apps/web/src/testHook.ts` — `test.order` goes through `sendOrder`; `test.patrol(on)` sends each agent that becomes `idle` a `go-to` to the far opposite free tile (research R13)
- [ ] T084 [US5] E2E `apps/web/e2e/debug-orders.spec.ts` — "Reunión" → walks to the nearest free meeting point and `meeting` (US5-1); "Entregar a revisión" → whiteboard and `waiting_review` (US5-2); a second agent sent to review gets "Sin sitio libre" and does not move (US5-3); forced agents stay put over 10 s (US5-4); repeating "Reunión" changes nothing (US5-6); turning debug off cancels orders and agents become `idle` with autonomy back (US5-7); a selected agent sent by `test.order` with `go-to` stays centered (≤ 2 px or clamped) while it walks (US2-6, FR-028)

**Checkpoint**: todas las historias funcionan

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T085 [P] Extend `apps/web/e2e/perf.spec.ts` (project `perf`) — with `test.patrol(true)` and agent 1 selected (camera following), sample `fps` every 1 s for 10 s: every sample ≥ 50 and all 6 agents `walking` at each sample (FR-035)
- [x] T086 [P] Contract test in `packages/domain/test/contract.test.ts` — `packages/domain/src/index.ts` exports every name of `specs/002-marketing-team/contracts/domain-api.md`
- [x] T087 [P] Color distance test in `apps/web/test/render/palette.test.ts` — every agent color is far from every `networkStyles` color (research R3)
- [ ] T088 Refactor pass over `packages/domain/src/agents/`, `scene/`, `camera/` and the new web files with all tests green (`refactor:` commits)
- [ ] T089 Run `pnpm test:coverage` and add tests until thresholds pass (`packages/domain` ≥ 95 %, other packages ≥ 80 %)
- [ ] T090 Codex read-only review (`gpt-6.2-sol`) of `git diff main...HEAD`; verify each finding, fix the confirmed ones (TDD) and discard false positives
- [ ] T091 Run the full quality gate `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e --workers=3` and the isolated perf project
- [ ] T092 Write `specs/002-marketing-team/validation.md` (template for the user's manual validation of quickstart.md scenarios 1–6, incl. SC-002, SC-007 and SC-008) and stop for the user

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 sin dependencias. T002 espera a que el usuario mergee el PR del fix.
- **Foundational (Phase 2)**: el bundle de Codex (T013–T014, T023–T024, T049–T050) arranca ya y no
  depende de nada. Claude hace a la vez datos y validación (T003–T012, T015) y geometría (T017–T022),
  sin esperar a T002. T025–T030 necesitan T003 y, para `stepSimulation`, `transition` (T016). El store
  (T031–T035) necesita T002 y T030.
- **US1–US5 (Phases 3–7)**: su integración depende de Foundational. US1 es el MVP.
- **Polish (Phase 8)**: depende de las historias entregadas.

### User Story Dependencies

- **US1 (P1)**: T036–T040 y T046 empiezan en paralelo a Foundational; T042–T045, T047–T048 tras T034.
- **US2 (P2)**: T051–T053, T058 independientes; T054–T057, T059–T061 tras US1 (T042, T045, T047).
  El seguimiento de un agente que camina (US2-6) se prueba en e2e en T084, cuando ya existe
  `test.order`; en US2 lo cubren los tests de store de T054.
- **US3 (P3)**: dominio T062–T065; web T067–T070 tras T065.
- **US4 (P4)**: necesita T010 (validación de borradores) y T037 (formas); no depende de la simulación
  salvo para el escenario US4-8.
- **US5 (P5)**: dominio T077–T078; web T079–T084 tras T078.

### Codex: un único bundle

- Worktree desde `002-marketing-team`, rama `codex/domain`: T013–T014 (máquina de estados, 36 pares),
  T023–T024 (PRNG), T049–T050 (selección), en ese orden, con commits `test:`/`feat:` separados. Bundle
  en `/tmp/codex-domain.bundle`; se integra en T016.
- Además, una sola revisión en solo lectura del diff final (T090). El segundo análisis tras
  `/speckit-analyze` lo hace solo Claude.

### Within Each User Story

- RED antes que GREEN, siempre; el test DEBE fallar por la razón esperada antes de implementar.
- Dominio → store → input/UI → integración en `OfficeCanvas`/`App` → e2e en verde.
- Archivos compartidos (`store.ts`, `keyboard.ts`, `mouse.ts`, `OfficeCanvas.tsx`, `App.tsx`,
  `testHook.ts`, `TeamPanel.tsx`, `AgentPanel.tsx`): sus tareas se ejecutan en secuencia aunque sean de
  historias distintas. Codex nunca toca archivos de `apps/web`.

### Parallel Opportunities

- Codex (T013–T014, T023–T024, T049–T050) ∥ Claude (T001, T003–T012, T017–T022, T036–T040).
- Claude, sin dependencias entre sí: T046, T051–T053, T058, T071.
- Polish: T085, T086, T087.

---

## Parallel Example: Claude + Codex

```bash
# Codex (codex exec -m gpt-6.2-sol -s workspace-write en ../ai-hq-codex-domain)
Task: "T013–T014 stateMachine" → "T023–T024 rng" → "T049–T050 selection" → bundle

# Claude, a la vez, en el checkout principal
Task: "T001 dialog stub" → "T003–T012 types, catalog, prompt, validate, seed" → "T017–T022 geometry"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup → Foundational (datos, geometría, núcleo de simulación, store; bundle de Codex en paralelo).
2. US1 → **STOP and VALIDATE** con quickstart 1.

### Incremental Delivery

1. Foundational → agentes cargados y simulación en el store.
2. US1 → personajes y panel de equipo (MVP visible).
3. US2 → selección y cámara que sigue.
4. US3 → autonomía, animaciones y pausa.
5. US4 → editor.
6. US5 → órdenes de depuración.
7. Polish → perf, cobertura, revisión de Codex, quality gate, validation.md → push y PR (los hace el
   usuario).

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Marca `[x]` en el mismo commit que deja la tarea en verde (AGENTS.md); las de Codex, en el merge de
  su bundle (T016).
- Si dejas una tarea a medias: línea `> WIP (<agente>): <estado>` debajo de ella.
- Nunca desactivar ni borrar tests para pasar la suite sin aprobación del usuario.
