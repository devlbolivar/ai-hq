# Implementation Plan: Oficina isométrica (motor base de AI HQ)

**Branch**: `001-office-engine` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-office-engine/spec.md`

## Summary

Construir el motor y la escena de la oficina de Marketing: cuadrícula isométrica 16x12 dibujada por
código, layout definido como datos (mapa de FR-005b) con validación, orden de profundidad, cámara
(ratón y teclado), hover y rutas A* deterministas con un modo depuración. Toda la lógica es pura y vive
en `packages/domain` (TDD, ≥95 % de cobertura); `apps/web` monta PixiJS v8 de forma imperativa dentro
de React y traduce eventos a llamadas al dominio. Se crea además el andamiaje mínimo del monorepo
(`apps/server`, `packages/shared` vacíos).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node ≥ 22 (local: 26; CI: 22 LTS)

**Primary Dependencies**: PixiJS v8, React 18, Zustand, Tailwind CSS v4 (`@tailwindcss/vite`), Vite

**Storage**: N/A (sin persistencia en esta feature)

**Testing**: Vitest (+ `@vitest/coverage-v8`), Testing Library + jsdom, Playwright (Chromium)

**Target Platform**: navegador de escritorio moderno (Chrome, Safari, Firefox), ventana ≥ 1024 px

**Project Type**: web app en monorepo pnpm (frontend + librería de dominio)

**Performance Goals**: 60 fps durante pan/zoom/hover; escena visible en < 2 s

**Constraints**: sin assets externos; lógica de dominio sin dependencias de navegador; rutas
deterministas

**Scale/Scope**: 1 departamento, 192 tiles, ~60 objetos, 4 historias de usuario

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Spec primero | Spec aprobada tras `clarify`; FR-005b se convierte en test (`renderLayoutAscii` = mapa) | ✅ |
| II. TDD | Dominio puro y testeable; `tasks.md` exigirá test antes de cada implementación; cobertura domain ≥ 95 % y packages ≥ 80 % en `vitest` thresholds | ✅ |
| III. Humano en el bucle | No aplica (no se genera ni publica contenido) | ✅ N/A |
| IV. Secretos en el servidor | No aplica (sin API ni secretos); `.env` ya ignorado | ✅ N/A |
| V. Cero invenciones | No aplica (sin LLM) | ✅ N/A |
| VI. IA detrás de una interfaz | No aplica (sin LLM) | ✅ N/A |
| VII. Simplicidad | Dependencias justificadas abajo; sin `@pixi/react` ni librería de pathfinding; server/shared sin dependencias | ✅ |
| VIII. Gráficos originales | Todo con `Graphics` de Pixi; colores/iconos propios por red | ✅ |
| Restricciones técnicas | Stack exacto de la constitución | ⚠️ ver nota de Node |

**Nota de Node**: la constitución dice "Node 22"; el entorno local tiene Node 26. Se fija
`engines.node >=22` y CI en 22 LTS. No es una violación funcional, pero conviene enmendar la
constitución (PATCH 1.0.1: "Node 22 LTS o superior").

**Dependencias nuevas y justificación (principio VII)**

| Dependencia | Para qué | Por qué no sin ella |
|---|---|---|
| `pixi.js` | Render 2D con WebGL, contenedores, cacheo | Mandada por la constitución |
| `react`, `react-dom` | UI de controles | Mandada por la constitución |
| `zustand` | Estado compartido Pixi ↔ React | Mandada por la constitución |
| `tailwindcss`, `@tailwindcss/vite` | Estilos de la UI | Mandada por la constitución |
| `vite`, `@vitejs/plugin-react` | Dev server y build | Mandada por la constitución (Vite) |
| `vitest`, `@vitest/coverage-v8` | Tests y cobertura | Mandada por la constitución |
| `@testing-library/react`, `@testing-library/user-event`, `jsdom` | Tests de controles | Mandada por la constitución |
| `@testing-library/dom` | Peer obligatorio de `@testing-library/react` v16 | Sin ella `@testing-library/react` no se instala ni funciona |
| `@types/react`, `@types/react-dom` | Tipos de React para `tsc` en modo `strict` | React 18 no incluye tipos propios; sin ellos falla `pnpm typecheck` |
| `@playwright/test` | E2E | Mandada por la constitución |
| `typescript`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier` | Typecheck, lint y formato del quality gate | El gate exige `pnpm lint` y `typecheck` |

Resultado del gate: **PASA** (sin violaciones que justificar en Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/001-office-engine/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── domain-api.md    # API pública de @ai-hq/domain
│   └── ui-contract.md   # controles, atajos y hook window.__AIHQ__
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                 # workspaces, scripts del quality gate, engines
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js
.prettierrc
vitest.config.ts             # test.projects: domain (node), web (jsdom)

packages/
├── domain/                  # @ai-hq/domain — lógica pura, sin I/O
│   ├── src/
│   │   ├── types.ts         # Coord, Direction, OfficeLayout, OfficeObject, Camera, …
│   │   ├── iso/             # gridToWorld, worldToGrid
│   │   ├── camera/          # initialCamera, pan, zoomAt, recenter, screenToGrid, límites
│   │   ├── layout/
│   │   │   ├── marketing.ts # datos del layout de FR-005b
│   │   │   ├── validate.ts  # validateLayout
│   │   │   └── ascii.ts     # renderLayoutAscii
│   │   ├── scene/           # walkability, drawOrder, silhouette, hitTest
│   │   ├── path/            # findPath (A* determinista)
│   │   └── index.ts         # API pública (contracts/domain-api.md)
│   └── test/                # *.test.ts espejo de src/
└── shared/                  # @ai-hq/shared — vacío (Zod llega en 003+)
    └── src/index.ts

apps/
├── web/                     # @ai-hq/web
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx          # layout de pantalla + controles
│   │   ├── state/store.ts   # Zustand: camera, viewport, hover, debug
│   │   ├── input/           # mouse.ts, keyboard.ts (eventos → acciones del store)
│   │   ├── render/          # OfficeCanvas.tsx, drawFloor, drawObject (por kind), drawOverlay, palette
│   │   ├── ui/              # RecenterButton, DebugToggle, HoverLabel, PathStatus
│   │   └── testHook.ts      # window.__AIHQ__ (no producción)
│   ├── test/                # Vitest + Testing Library (store, input, ui)
│   ├── e2e/                 # Playwright: scene, camera, keyboard, hover, debug, perf
│   ├── index.html
│   ├── vite.config.ts
│   └── playwright.config.ts
└── server/                  # @ai-hq/server — vacío (Hono llega en 004/005)
    └── src/index.ts
```

**Structure Decision**: monorepo pnpm de la constitución. En esta feature solo tienen código
`packages/domain` (toda la lógica, testeada en Node) y `apps/web` (render, entrada y UI). `apps/server`
y `packages/shared` se crean vacíos y sin dependencias para fijar la estructura (research R12).

## Enfoque de implementación (orden TDD sugerido para `/speckit-tasks`)

1. **Andamiaje**: workspace, tsconfig, lint, Vitest con un test trivial en rojo→verde por paquete.
2. **Dominio, de abajo arriba** (cada paso: tests primero):
   `iso` → `types` + `marketing` + `ascii` (test contra FR-005b) → `validate` (un test por código de
   error) → `walkability` → `findPath` → `drawOrder` → `silhouette` + `hitTest` → `camera`.
3. **Web**: store (tests con Testing Library/Vitest) → `OfficeCanvas` con suelo y objetos → overlay de
   hover → input de ratón → input de teclado → modo depuración → `testHook`.
4. **E2E** por historia (US1→US4) y smoke de rendimiento.
5. **Quality gate** completo y verificación manual de `quickstart.md`.

Las historias US1–US4 son independientes a partir del paso 2: US2 (cámara) y US4 (rutas) pueden
implementarse en paralelo por agentes distintos sobre archivos separados.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
