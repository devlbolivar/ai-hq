---

description: "Task list for 001-office-engine"
---

# Tasks: Oficina isométrica (motor base de AI HQ)

**Input**: Design documents from `/specs/001-office-engine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: OBLIGATORIOS (constitución, principio II — TDD). Cada tarea `RED` escribe tests que DEBEN
fallar antes de su tarea `GREEN`. Commits: `test:` (RED) → `feat:` (GREEN) → `refactor:` (opcional).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of
each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- **RED / GREEN**: RED = escribir tests que fallan; GREEN = mínimo código para pasarlos
- **Hecho** = tests de la tarea en verde + `pnpm lint && pnpm typecheck` sin errores + casilla marcada

## Path Conventions

Monorepo pnpm (ver plan.md): `packages/domain/{src,test}`, `apps/web/{src,test,e2e}`,
`packages/shared`, `apps/server`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo, herramientas y quality gate funcionando con tests de humo

- [x] T001 Install pnpm (`npm i -g pnpm`) and create root `package.json` (private; scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:coverage`, `e2e`; `engines.node >=22`; `packageManager`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`) and `.nvmrc` (`22`) at repo root
- [x] T002 Create `tsconfig.base.json` at repo root (`strict`, `noUncheckedIndexedAccess`, `target ES2022`, `moduleResolution bundler`, `isolatedModules`)
- [x] T003 [P] Configure ESLint flat config (typescript-eslint, eslint-plugin-react-hooks) in `eslint.config.js` and Prettier in `.prettierrc` + `.prettierignore` at repo root
- [x] T004 [P] Scaffold `@ai-hq/domain` in `packages/domain/` (`package.json` exporting `src/index.ts`, scripts `typecheck`/`test`, `tsconfig.json`, empty `src/index.ts`)
- [x] T005 [P] Scaffold empty stubs `@ai-hq/shared` in `packages/shared/` and `@ai-hq/server` in `apps/server/` (`package.json`, `tsconfig.json`, `src/index.ts` with `export {}`; no runtime dependencies — research R12)
- [x] T006 [P] Scaffold `@ai-hq/web` in `apps/web/` with Vite + React 18 + Tailwind v4 (`package.json`, `vite.config.ts` with `@vitejs/plugin-react` and `@tailwindcss/vite`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` with dark background, `tsconfig.json`)
- [x] T007 Configure Vitest projects in `vitest.config.ts` at repo root (`domain`: environment node, `packages/domain/test/**`; `web`: environment jsdom, `apps/web/test/**`) with `@vitest/coverage-v8` thresholds: `packages/domain` ≥ 95 %, `packages/*` ≥ 80 %
- [x] T008 RED→GREEN smoke tests: `packages/domain/test/smoke.test.ts` (imports the package) and `apps/web/test/App.test.tsx` (renders `App` with heading "AI HQ — Marketing" via Testing Library)
- [x] T009 Configure Playwright in `apps/web/playwright.config.ts` (Chromium; `webServer`: `vite build --mode e2e && vite preview` with `VITE_E2E=1`) and smoke e2e `apps/web/e2e/smoke.spec.ts` (page loads, title "AI HQ")
- [x] T010 Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` at repo root and fix configuration until green (no feature code)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, proyección, cámara base, layout de Marketing validado y store base. Lo necesitan
todas las historias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 [P] Define domain types in `packages/domain/src/types.ts` per data-model.md: `Coord`, `Direction`, `Size`, `Point`, `OfficeLayout` (`OfficeLayout.departmentId`, `OfficeLayout.grid`, `OfficeLayout.tile`, `OfficeLayout.entrance`, `OfficeLayout.zones`, `OfficeLayout.objects`), `Zone` (`Zone.id`, `Zone.area`), `OfficeObject` (`OfficeObject.id`, `OfficeObject.kind`, `OfficeObject.origin`, `OfficeObject.size`, `OfficeObject.height`, `OfficeObject.z`, `OfficeObject.blocking`, `OfficeObject.wallMounted`, `OfficeObject.usePoints`, `OfficeObject.network`, `OfficeObject.attachedTo`), `UsePoint` (`UsePoint.tile`, `UsePoint.facing`), `Camera` (`Camera.offset`, `Camera.zoom`), `HoverTarget`, `PathResult`, `LayoutError` (`LayoutError.code`) — all `readonly`
- [x] T012 [P] RED: projection tests in `packages/domain/test/iso.test.ts` — `worldToGrid(gridToWorld(t))` returns `t` for all 192 tiles; known values `(0,0)→(0,0)`, `(1,0)→(32,16)`, `(0,1)→(−32,16)`; points outside the grid → `null`; points on a tile border resolve by the `floor` rule (research R3, FR-002, FR-003)
- [x] T013 GREEN: implement `gridToWorld` and `worldToGrid` in `packages/domain/src/iso/index.ts`
- [x] T014 [P] RED: camera core tests in `packages/domain/test/camera/core.test.ts` — `initialCamera` centers the office in the viewport at zoom 1 (data-model.md `Camera.zoom`, `Camera.offset`); `screenToWorld` and `worldToScreen` are inverses; `screenToGrid` returns `null` outside the grid
- [x] T015 GREEN: implement `initialCamera`, `screenToWorld`, `worldToScreen`, `screenToGrid` in `packages/domain/src/camera/core.ts`
- [x] T016 [P] RED: walkability tests in `packages/domain/test/scene/walkability.test.ts` — every footprint tile of a blocking object is `false` (data-model.md `OfficeObject.blocking`, `OfficeObject.size`); chairs, sofa and monitors stay walkable; `reachableFrom(walk, entrance)` floods in 4 directions only (FR-020)
- [x] T017 GREEN: implement `walkability` and `reachableFrom` in `packages/domain/src/scene/walkability.ts`
- [x] T018 [P] RED: Marketing layout tests in `packages/domain/test/layout/marketing.test.ts` — `departmentId` `'marketing'`; desks `desk-1`…`desk-6` each with an attached chair and monitor (data-model.md `OfficeObject.id`, `OfficeObject.attachedTo`); 5 screens each with its network (data-model.md `OfficeObject.network`); use point counts per kind per data-model.md "UsePoint" (meeting table 6, coffee 1, sofa 2, whiteboard 1); each desk has exactly one use point on its chair facing `N` (data-model.md `UsePoint.tile`, `UsePoint.facing`); entrance `(8,11)` (data-model.md `OfficeLayout.entrance`); every object has a Spanish `name` (FR-005, FR-006, FR-009a)
- [x] T019 [P] RED: ASCII fidelity test in `packages/domain/test/layout/ascii.test.ts` — `renderLayoutAscii(marketingLayout)` equals fixture `packages/domain/test/fixtures/marketing-map.txt`, copied verbatim from the grid rows of spec.md FR-005b (FR-005b, research R8)
- [x] T020 GREEN: implement `renderLayoutAscii` in `packages/domain/src/layout/ascii.ts` using the FR-005b legend (`W I T Y L X P b D c M m K k F p E .`)
- [x] T021 GREEN: write `marketingLayout` data in `packages/domain/src/layout/marketing.ts` (objects, zones, Spanish names, heights, monitor `z` > 0, back walls only per FR-005a) until T018 and T019 pass
- [x] T022 [P] RED: validation tests in `packages/domain/test/layout/validate.test.ts` — one invalid fixture per `LayoutError.code` in data-model.md "Validación del layout" (`OUT_OF_BOUNDS`, `DUPLICATE_ID`, `BLOCKING_OVERLAP`, `ENTRANCE_BLOCKED`, `USE_POINT_BLOCKED`, `USE_POINT_UNREACHABLE`, `MISSING_NETWORK`, `DESK_USE_POINT`, `BAD_ATTACHMENT`), each error names the object/tile; several errors are returned together; `validateLayout(marketingLayout)` is `{ ok: true }` (FR-008, FR-009b)
- [x] T023 GREEN: implement `validateLayout` in `packages/domain/src/layout/validate.ts` (uses `walkability` + `reachableFrom`)
- [x] T024 Export the foundational API (types, iso, camera core, layout, walkability) from `packages/domain/src/index.ts` per contracts/domain-api.md
- [x] T025 [P] RED: store base tests in `apps/web/test/state/store.test.ts` — initial `camera` equals `initialCamera(viewport, marketingLayout)`; `setViewport` updates the viewport and re-centers while the user has not moved the camera; loading an invalid layout throws with the validation messages (data-model.md "Estado de UI")
- [x] T026 GREEN: implement the Zustand store base (`camera`, `viewport`, `setViewport`) in `apps/web/src/state/store.ts`

**Checkpoint**: Foundation ready — user stories can start

---

## Phase 3: User Story 1 — Ver la oficina de Marketing (Priority: P1) 🎯 MVP

**Goal**: la oficina completa se dibuja por código, centrada, con tema oscuro y orden de profundidad
correcto.

**Independent Test**: abrir la app; `window.__AIHQ__.ready` en < 2 s, `drawOrder` contiene todos los
objetos del layout en el orden de `drawOrder()` del dominio, cámara a 1x centrada (quickstart 1–4).

- [x] T027 [P] [US1] RED: e2e `apps/web/e2e/scene.spec.ts` — `window.__AIHQ__.ready` within 2 s; `layoutId` `'marketing'`; `drawOrder` equals the domain `drawOrder(marketingLayout)`; `camera.zoom` 1 and office centered; page background is dark (FR-001, FR-011, SC-001). This e2e is the RED test for the rendering tasks T034–T037 (Pixi is not unit-tested in jsdom, research R10)
- [x] T028 [P] [US1] RED: draw order tests in `packages/domain/test/scene/drawOrder.test.ts` — chair `(3,6)` after desk `(3,5)`; each monitor after its desk (data-model.md `OfficeObject.z`); wall segments before objects in front of them; sofa after coffee machine; desk-4 after desk-1; plant `(10,1)` after wall tile `(10,0)` (walls are 1x1 segments); result identical for a shuffled `objects` array (FR-012, research R4)
- [x] T029 [US1] GREEN: implement `drawOrder` in `packages/domain/src/scene/drawOrder.ts` and export it from `packages/domain/src/index.ts`
- [x] T030 [P] [US1] RED: palette tests in `apps/web/test/render/palette.test.ts` — the 5 networks (data-model.md `OfficeObject.network`) have distinct colors and distinct own icon ids; dark theme tokens defined (FR-007, FR-011)
- [x] T031 [P] [US1] GREEN: implement `apps/web/src/render/palette.ts`
- [x] T032 [P] [US1] RED: test hook tests in `apps/web/test/testHook.test.ts` — `window.__AIHQ__` exposed when `MODE !== 'production'` or `VITE_E2E=1`, absent in production; shape matches contracts/ui-contract.md
- [x] T033 [US1] GREEN: implement `apps/web/src/testHook.ts` (`ready`, `layoutId`, `drawOrder`, `camera`, `hover`, `debug`, `fps` moving average, `gridToScreen` returning the screen position of the tile **center** via `tileCenter`, never the top vertex shared by 4 tiles)
- [x] T034 [P] [US1] Implement floor drawing (tile diamonds + front edge, cached as texture) in `apps/web/src/render/drawFloor.ts`
- [x] T035 [P] [US1] Implement per-kind drawing as isometric prisms (wall, screen with own icon, whiteboard, desk, chair, monitor, plant, sofa, meeting-table, coffee-machine) in `apps/web/src/render/drawObject.ts` using `palette.ts` — no external images (FR-010); `screen` and `whiteboard` also draw the wall segment behind them so the back walls have no gaps (FR-005a, FR-005b)
- [x] T036 [US1] Implement `apps/web/src/render/OfficeCanvas.tsx`: Pixi `Application`, layers `floor`/`objects`/`overlay`, objects added in `drawOrder`, root transform from store `camera` via `subscribe`, resize → `setViewport`, updates the test hook (research R1, R2)
- [x] T037 [US1] Mount `OfficeCanvas` full-screen in `apps/web/src/App.tsx` and make T027 pass

**Checkpoint**: US1 funcional y verificable por sí sola (MVP)

---

## Phase 4: User Story 2 — Navegar la oficina con la cámara (Priority: P2)

**Goal**: pan con arrastre, zoom con rueda anclado al cursor en [0.5, 2], recentrar, límites y teclado.

**Independent Test**: arrastrar, hacer zoom hasta los límites, recentrar y repetir solo con teclado
(quickstart 5–6).

- [x] T038 [P] [US2] RED: e2e `apps/web/e2e/camera.spec.ts` — drag moves `camera.offset`; wheel-in over `desk-1` (via `gridToScreen`) keeps it under the cursor; zoom clamps at 2 and 0.5; "Recentrar" restores the initial camera; dragging far keeps the office center inside the viewport; a drag starting on the button does not pan (FR-013–FR-016)
- [x] T039 [P] [US2] RED: e2e `apps/web/e2e/keyboard.spec.ts` — arrows and WASD pan; `+`/`=` and `-` zoom centered on screen within limits; `0` recenters; keys are ignored while an injected `<input>` has focus (FR-016a)
- [x] T040 [P] [US2] RED: camera ops tests in `packages/domain/test/camera/ops.test.ts` — `pan` adds delta; `zoomAt` keeps the anchor's world point; zoom clamped to `ZOOM_MIN`/`ZOOM_MAX` (data-model.md `Camera.zoom`); `ZOOM_STEP` 1.1; `recenter` equals `initialCamera`; every op keeps the office center inside the viewport (research R6, FR-016)
- [x] T041 [US2] GREEN: implement `pan`, `zoomAt`, `recenter`, camera clamping and constants in `packages/domain/src/camera/ops.ts`; export from `packages/domain/src/index.ts`
- [x] T042 [US2] RED: store camera action tests in `apps/web/test/state/camera-actions.test.ts` — `panBy`, `zoomAt`, `recenter` delegate to the domain; `setViewport` clamps the current camera
- [x] T043 [US2] GREEN: add camera actions to `apps/web/src/state/store.ts`
- [x] T044 [P] [US2] RED: mouse input tests in `apps/web/test/input/mouse.test.ts` — primary button only; < 4 px is not a drag; gestures starting on `[data-ui-control]` are ignored; wheel calls `zoomAt` at the cursor with one `ZOOM_STEP` per notch
- [x] T045 [US2] GREEN: implement `apps/web/src/input/mouse.ts`
- [x] T046 [P] [US2] RED: keyboard tests in `apps/web/test/input/keyboard.test.ts` — key map per contracts/ui-contract.md (arrows/WASD, `+`/`=`, `-`, `0`); held keys pan at 600 px/s via `tick(dt)`; ignored when focus is in `input`/`textarea`/`select`/`[contenteditable]`
- [x] T047 [US2] GREEN: implement `apps/web/src/input/keyboard.ts`
- [x] T048 [P] [US2] RED: `apps/web/test/ui/RecenterButton.test.tsx` — role `button` named "Recentrar", click calls `recenter`, carries `data-ui-control`
- [x] T049 [US2] GREEN: implement `apps/web/src/ui/RecenterButton.tsx`
- [x] T050 [US2] Wire mouse and keyboard input into `apps/web/src/render/OfficeCanvas.tsx` and `RecenterButton` into `apps/web/src/App.tsx`; make T038 and T039 pass

**Checkpoint**: US1 + US2 funcionan de forma independiente

---

## Phase 5: User Story 3 — Inspeccionar con el cursor (Priority: P3)

**Goal**: resaltar el tile u objeto bajo el cursor (gana el de delante) y mostrar su nombre.

**Independent Test**: hover sobre suelo, mesa de reuniones, planta alta y fuera de la oficina
(quickstart 7).

- [x] T051 [P] [US3] RED: e2e `apps/web/e2e/hover.spec.ts` — floor tile → `hover.type 'tile'`; meeting table → its id and label "Mesa de reuniones"; a plant covering a tile behind → the plant; outside the office → `null` and no label (FR-017–FR-019)
- [x] T052 [P] [US3] RED: hit-test tests in `packages/domain/test/scene/hitTest.test.ts` — `silhouette` of a 1x1 object with height 0 equals the tile diamond; multi-tile footprint; `hitTest` returns the front-most object (reverse `drawOrder`), falls back to the floor tile, returns `null` outside (data-model.md `HoverTarget`, research R5)
- [x] T053 [US3] GREEN: implement `silhouette` and `hitTest` in `packages/domain/src/scene/hitTest.ts`; export from `packages/domain/src/index.ts`
- [x] T054 [US3] RED: store hover tests in `apps/web/test/state/hover.test.ts` — `pointerMove(screenPoint)` sets `hover` via camera + `hitTest`; `pointerLeave` sets `null`
- [x] T055 [US3] GREEN: add `hover`, `pointerMove`, `pointerLeave` to `apps/web/src/state/store.ts`
- [x] T056 [P] [US3] RED: `apps/web/test/ui/HoverLabel.test.tsx` — role `status` shows the object `name` only when hovering an object
- [x] T057 [US3] GREEN: implement `apps/web/src/ui/HoverLabel.tsx`
- [x] T058 [US3] Implement hover highlight (tile diamond or full footprint) in `apps/web/src/render/drawOverlay.ts`, wire pointer move/leave in `apps/web/src/input/mouse.ts` and `OfficeCanvas.tsx`, add `HoverLabel` to `App.tsx`; make T051 pass

**Checkpoint**: US1–US3 funcionan de forma independiente

---

## Phase 6: User Story 4 — Rutas caminables por la oficina (Priority: P4)

**Goal**: rutas mínimas deterministas en 4 direcciones y modo depuración que las muestra.

**Independent Test**: `G`, clic en la entrada y en la silla del Escritorio 4 → ruta mínima; destino
sobre un escritorio → "Sin ruta"; desactivar limpia todo (quickstart 8–9).

- [x] T059 [P] [US4] RED: e2e `apps/web/e2e/debug.spec.ts` — `G` toggles `debug.enabled`; click entrance `(8,11)` then chair of desk-4 `(3,9)` → `result.ok` with the minimal step count and status "Ruta: N pasos"; destination on a desk → "Sin ruta"; toggling off clears `from`, `to`, `result` (FR-021, FR-023, US4 escenario 6)
- [x] T060 [P] [US4] RED: path tests in `packages/domain/test/path/findPath.test.ts` — straight path; wall detour with minimal length; blocked destination → `reason 'blocked'`; enclosed destination → `'unreachable'`; outside grid → `'out-of-bounds'`; `from = to` → single-tile path; every step is 4-neighbor adjacent; identical result over 100 calls; tie-break order N, E, S, W (data-model.md `PathResult`, research R7, FR-022)
- [x] T061 [US4] GREEN: implement `findPath` in `packages/domain/src/path/findPath.ts`; export from `packages/domain/src/index.ts`
- [x] T062 [US4] RED: store debug tests in `apps/web/test/state/debug.test.ts` — transitions per data-model.md "Estado de UI" (`debug.enabled`, `debug.from`, `debug.to`, `debug.result`): toggle, first click = from, second = to + result, third restarts, disabling clears
- [x] T063 [US4] GREEN: add the `debug` slice to `apps/web/src/state/store.ts`
- [x] T064 [P] [US4] RED: `apps/web/test/ui/DebugToggle.test.tsx` (role `switch` named "Modo depuración") and `apps/web/test/ui/PathStatus.test.tsx` ("Ruta: N pasos" / "Sin ruta", hidden without result)
- [x] T065 [US4] GREEN: implement `apps/web/src/ui/DebugToggle.tsx` and `apps/web/src/ui/PathStatus.tsx`
- [x] T066 [US4] RED: extend `apps/web/test/input/keyboard.test.ts` (`G` toggles debug) and `apps/web/test/input/mouse.test.ts` (in debug mode a click without drag selects the tile via `screenToGrid`; clicks outside the grid are ignored)
- [x] T067 [US4] GREEN: extend `apps/web/src/input/keyboard.ts` and `apps/web/src/input/mouse.ts`
- [x] T068 [US4] Implement `apps/web/src/render/drawDebugOverlay.ts` (walkable grid, entrance, use points with facing arrows, path) and wire it plus `DebugToggle`/`PathStatus` into `OfficeCanvas.tsx` and `App.tsx`; make T059 pass

**Checkpoint**: las 4 historias funcionan de forma independiente

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T069 [P] Contract test in `packages/domain/test/contract.test.ts` — `packages/domain/src/index.ts` exports every function and constant listed in contracts/domain-api.md
- [x] T070 [P] Performance smoke e2e in `apps/web/e2e/perf.spec.ts` — 5 s of continuous pan/zoom/hover keeps `window.__AIHQ__.fps` ≥ 50 headless (SC-003, research R10)
- [x] T071 [P] Write root `README.md` (requirements, install, scripts, monorepo structure, links to `specs/` and `AGENTS.md`)
- [x] T072 Refactor pass over `packages/domain/src/` and `apps/web/src/` with all tests green (no behavior change; `refactor:` commits)
- [x] T073 Run `pnpm test:coverage` and add missing tests until thresholds pass (domain ≥ 95 %, packages ≥ 80 %)
- [x] T074 Run the full quality gate `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` at repo root
- [x] T075 Manual validation of quickstart.md scenarios 1–10 in Chrome and Safari (incl. 30 s FPS check on real hardware); record results in `specs/001-office-engine/validation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; BLOQUEA todas las historias.
- **US1–US4 (Phases 3–6)**: dependen de Foundational. US1 es el MVP.
- **Polish (Phase 7)**: depende de las historias que se entreguen.

### User Story Dependencies

- **US1 (P1)**: solo Foundational.
- **US2 (P2)**: solo Foundational para el dominio (T040–T041); su integración (T050) necesita
  `OfficeCanvas` de US1 (T036).
- **US3 (P3)**: dominio independiente (T052–T053); T058 necesita `OfficeCanvas` (T036) y `mouse.ts`
  (T045).
- **US4 (P4)**: dominio independiente (T060–T061); T067 extiende `keyboard.ts`/`mouse.ts` (T045, T047);
  T068 necesita `OfficeCanvas` (T036).

### Within Each User Story

- RED antes que GREEN, siempre; el test DEBE fallar por la razón esperada antes de implementar.
- Dominio → store → input/UI → integración en `OfficeCanvas`/`App` → e2e en verde.
- Archivos compartidos (`store.ts`, `mouse.ts`, `keyboard.ts`, `OfficeCanvas.tsx`, `App.tsx`): sus
  tareas se ejecutan en secuencia aunque pertenezcan a historias distintas.

### Parallel Opportunities

- Setup: T003, T004, T005, T006.
- Foundational: los RED T012, T014, T016, T018, T019, T022, T025 (archivos distintos) tras T011.
- Dominio de historias distintas en paralelo tras Foundational: T028–T029 (US1), T040–T041 (US2),
  T052–T053 (US3), T060–T061 (US4).
- Polish: T069, T070, T071.

---

## Parallel Example: Claude + Codex tras Foundational

```bash
# Claude: US1 (render) en apps/web
Task: "T027 RED e2e scene.spec.ts" → "T028–T029 drawOrder" → "T030–T037"

# Codex (codex exec -s workspace-write): dominio de US2 y US4, solo packages/domain
Task: "T040 RED camera ops tests" → "T041 GREEN camera ops"
Task: "T060 RED findPath tests"   → "T061 GREEN findPath"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1) → **STOP and VALIDATE** con quickstart 1–4.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar (MVP visible).
3. US2 → validar cámara y teclado.
4. US3 → validar hover.
5. US4 → validar rutas y depuración.
6. Polish → quality gate completo → PR de la feature.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Marca `[x]` en el mismo commit que deja la tarea en verde (AGENTS.md).
- Si dejas una tarea a medias: línea `> WIP (<agente>): <estado>` debajo de ella.
- Nunca desactivar ni borrar tests para pasar la suite sin aprobación del usuario.
