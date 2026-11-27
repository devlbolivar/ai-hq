# Implementation Plan: Equipo de Marketing (agentes seleccionables)

**Branch**: `002-marketing-team` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-marketing-team/spec.md`

## Summary

Poblar la oficina de la 001 con los 6 agentes de Marketing: datos semilla validados con catálogo de
apariencia y regla de cero invenciones global; máquina de estados pura (FR-008, 36 pares); simulación
determinista por pasos fijos de 10 ms con movimiento sobre `findPath`, reservas de puntos de uso,
autonomía con semilla y órdenes externas; selección con cámara que sigue; personajes, anillo y
burbujas dibujados por código e intercalados en profundidad con los muebles; panel de equipo, panel
del agente con órdenes de depuración y editor modal. Toda la lógica vive en `packages/domain`
(dividida en dos tandas delegables a Codex con la API fijada en
[contracts/domain-api.md](./contracts/domain-api.md)); `apps/web` integra store, render, entrada y UI.
Sin dependencias nuevas.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node ≥ 22 (igual que la 001)

**Primary Dependencies**: las de la 001 (PixiJS v8, React 18, Zustand, Tailwind CSS v4, Vite). Ninguna
nueva

**Storage**: N/A (en memoria; al recargar vuelven los datos semilla, FR-032a)

**Testing**: Vitest (+ cobertura v8), Testing Library + jsdom, Playwright (Chromium; perf con GPU)

**Target Platform**: navegador de escritorio moderno, ventana ≥ 1024 px

**Project Type**: web app en monorepo pnpm (frontend + librería de dominio)

**Performance Goals**: 60 fps con 6 agentes caminando y la cámara siguiendo a uno (FR-035; smoke:
cada muestra de 1 s ≥ 50 fps durante 10 s); escena con agentes visible en < 2 s (SC-001)

**Constraints**: dominio puro y determinista (sin `Date`/`Math.random`); posición siempre sobre el
segmento de ruta (sin interpolación entre estados); sin assets externos; no tocar los archivos del fix
de la 001 hasta mergear `main` (research R15)

**Scale/Scope**: 6 agentes, ~60 objetos, 5 historias, 35+ requisitos funcionales

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Spec primero | Spec aprobada tras `clarify`; cada FR se traza a tests (quickstart, tabla de pruebas) | ✅ |
| II. TDD | Todo el dominio es puro y se prueba primero; `tasks.md` exigirá test antes de cada implementación; cobertura domain ≥ 95 % (umbral ya configurado en `vitest.config.ts`) | ✅ |
| III. Humano en el bucle | No aplica (no se genera ni publica contenido) | ✅ N/A |
| IV. Secretos en el servidor | No aplica (sin backend ni API keys) | ✅ N/A |
| V. Cero invenciones | `ZERO_INVENTION_RULE` global; `effectivePrompt` la incluye exactamente una vez; tests de armado de prompt para los 6 agentes (FR-005, research R4) | ✅ |
| VI. IA detrás de una interfaz | No aplica (sin LLM); el prompt efectivo queda listo para `LLMProvider` en la 005 | ✅ N/A |
| VII. Simplicidad | Sin dependencias nuevas: PRNG propio de 10 líneas, `<dialog>` nativo, máquina de estados sin librería; lógica en `packages/domain` | ✅ |
| VIII. Gráficos originales | Personajes, anillo, burbujas e iconos con `Graphics` (y SVG para la vista previa) desde una geometría propia; sin sprites | ✅ |
| Restricciones técnicas | Stack de la constitución; TanStack Query, MSW y Zod no se necesitan aún (sin backend) | ✅ |

**Dependencias nuevas**: ninguna. Alternativas descartadas en research (XState, librerías de PRNG,
Radix/Headless UI, `@pixi/react`).

Resultado del gate: **PASA**. Re-evaluación tras la Fase 1 (diseño en data-model y contratos): sigue
**PASA**, sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/002-marketing-team/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── domain-api.md    # API pública añadida a @ai-hq/domain (fijada antes de delegar)
│   └── ui-contract.md   # controles, editor, atajos y ampliación de window.__AIHQ__
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/
├── src/
│   ├── agents/                    # NUEVO
│   │   ├── types.ts               # (T1) AgentProfile, Appearance, AgentRuntime, AgentTarget, …
│   │   ├── catalog.ts             # (T1) colores y apariencia
│   │   ├── seed.ts                # (T1) marketingTeam
│   │   ├── prompt.ts              # (T1) ZERO_INVENTION_RULE, effectivePrompt
│   │   ├── validate.ts            # (T1) validateTeam, validateAgentDraft, applyDraft
│   │   ├── stateMachine.ts        # (T1) transition
│   │   ├── rng.ts                 # (T2) mulberry32
│   │   ├── usePoints.ts           # (T2) refs, reservas
│   │   ├── movement.ts            # (T2) planRoute, advanceMovement, agentPosition
│   │   ├── autonomy.ts            # (T2) chooseAutonomousTarget
│   │   ├── orders.ts              # (T2) applyOrder, cancelForcedOrders
│   │   ├── simulation.ts          # (T2) createSimWorld, createSimulation, stepSimulation, advanceFrame
│   │   └── selection.ts           # (T2) selectByNumber, cycleSelection
│   ├── scene/
│   │   ├── sceneOrder.ts          # NUEVO (Claude) objetos + personajes
│   │   └── characterHit.ts        # NUEVO (Claude) characterSilhouette, sceneHitTest
│   ├── camera/follow.ts           # NUEVO (Claude) centerOn
│   └── index.ts                   # reexporta lo anterior
└── test/agents/*.test.ts, test/scene/*.test.ts, test/camera/follow.test.ts

apps/web/
├── src/
│   ├── state/store.ts             # + team, sim, selección, seguimiento, pausa, editor, avisos
│   ├── state/follow.ts            # NUEVO: transición suave pura (ease-out 400 ms)
│   ├── input/keyboard.ts          # + 1–9, Tab, Shift+Tab, Esc, Space; bloqueo con editor
│   ├── input/mouse.ts             # clic → sceneHitTest (personaje / tile / deseleccionar)
│   ├── render/
│   │   ├── OfficeCanvas.tsx       # personajes en `objects` (zIndex), capa `bubbles`, ticker de sim
│   │   ├── character/shapes.ts    # NUEVO: characterShapes (geometría pura por pose/orientación)
│   │   ├── character/pixi.ts      # NUEVO: Container de piezas + animación por transformaciones
│   │   ├── character/svg.tsx      # NUEVO: renderizador SVG (vista previa, avatar)
│   │   ├── drawRing.ts            # NUEVO
│   │   ├── drawBubble.ts          # NUEVO: icono por estado + texto del seleccionado
│   │   └── palette.ts             # + estados y textos
│   ├── ui/
│   │   ├── TeamPanel.tsx          # NUEVO
│   │   ├── AgentPanel.tsx         # NUEVO (con DebugOrders)
│   │   ├── AgentEditor.tsx        # NUEVO (<dialog>)
│   │   ├── Notice.tsx             # NUEVO ("Sin sitio libre")
│   │   ├── PauseIndicator.tsx     # NUEVO
│   │   └── HoverLabel.tsx         # + nombre de agente
│   ├── seed.ts                    # NUEVO: semilla desde ?seed=N o la hora
│   └── testHook.ts                # + agents, selection, sceneOrder, agentToScreen, test.order/patrol
├── test/                          # Vitest + Testing Library (+ stub de showModal en el setup)
└── e2e/                           # + team, selection, autonomy, editor, debug-orders; perf ampliado
```

**Structure Decision**: misma estructura del monorepo de la 001. La lógica nueva va en
`packages/domain/src/agents/` (bloque delegable, archivos propios) y en `scene/`/`camera/`
(geometría ligada al render). `apps/server` y `packages/shared` no cambian.

## Enfoque de implementación (orden TDD sugerido para `/speckit-tasks`)

Reparto (research R1): **Codex** implementa en worktrees las Tandas 1 y 2 del dominio con la API de
[contracts/domain-api.md](./contracts/domain-api.md); **Claude** hace la geometría de escena, el store,
el render Pixi (personajes, anillo, burbujas, profundidad), las animaciones, la UI, la integración y los
e2e. Las tareas de Codex se marcan "(Codex)" y no tocan archivos de la web ni `tasks.md`.

1. **Preparación** (Claude): stub de `showModal` en el setup de tests de la web. Los archivos y
   exportaciones de cada tanda los crea Codex en su propio worktree.
2. **Tanda 1 (Codex)** — catálogo → semilla → prompt efectivo → validación → máquina de estados
   (36 pares). En paralelo, **Claude**: `characterShapes` + renderizadores Pixi/SVG con un perfil de
   prueba local, `drawRing`, `drawBubble`, `follow.ts` (web), `centerOn`, `sceneOrder` y
   `sceneHitTest` (con una `CharacterPlacement` que no depende de la Tanda 2).
3. **Integración Tanda 1** (Claude): merge del bundle; `TeamPanel` y `AgentEditor` sobre
   `marketingTeam`, `validateAgentDraft` y `effectivePrompt`.
4. **Merge de `main`** (con el fix de la 001) en `002-marketing-team` cuando el PR del fix entre;
   requisito para tocar `store.ts`, `mouse.ts`, `keyboard.ts`, `OfficeCanvas.tsx`, `testHook.ts`,
   `HoverLabel.tsx` y `e2e/scene.spec.ts` (research R15).
5. **Tanda 2 (Codex)** — PRNG → puntos de uso → movimiento → autonomía → órdenes → simulación (con
   `ACCEPTANCE_SEED`, SC-005, SC-006) → selección. En paralelo, **Claude**: store con `team`,
   `selection`, `editor`, `paused`, hover de agentes sobre posiciones fijas; teclado y ratón;
   personajes estáticos en sus escritorios (US1 sin movimiento).
6. **Integración Tanda 2** (Claude): `sim` en el store y en el ticker de Pixi, animaciones por estado,
   burbujas, seguimiento de cámara, órdenes de depuración, aviso, hook ampliado.
7. **E2E** por historia (US1→US5) y perf smoke ampliado (FR-035).
8. **Revisión de Codex** en solo lectura de `git diff main...HEAD`, quality gate completo,
   `validation.md` para la validación manual.

US1 (personajes estáticos y panel) se puede entregar tras el paso 5 sin simulación; US2 y US4 no
dependen de la autonomía; US3 y US5 dependen de la Tanda 2.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
