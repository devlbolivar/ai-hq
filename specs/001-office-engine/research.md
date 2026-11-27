# Research: 001-office-engine

Decisiones técnicas de la Fase 0. Cada una: decisión, razón y alternativas descartadas.

## R1. Integración de PixiJS v8 con React

- **Decision**: montar una `Application` de Pixi de forma imperativa dentro de un componente React
  (`<OfficeCanvas />`) con `useEffect`; React solo dibuja la UI superpuesta (botones, etiqueta de
  hover). Pixi lee el estado de un store Zustand con `subscribe` (sin re-renders de React por frame).
- **Rationale**: evita una dependencia extra (`@pixi/react`) y su reconciliador; el render de la escena
  es estático salvo cámara/overlays, así que un puente imperativo pequeño es suficiente (principio VII).
- **Alternatives considered**: `@pixi/react` (más idiomático, pero añade dependencia y ciclos de render
  de React por frame); Canvas 2D a mano (sin dependencia, pero habría que reimplementar escena,
  eventos, cacheo y zoom nítido).

## R2. Capas de dibujo y rendimiento (60 fps)

- **Decision**: 4 contenedores en orden fijo: `floor` (suelo + borde, un `Graphics` estático cacheado
  como textura), `objects` (un `Graphics` por objeto, ordenados por clave de profundidad una sola vez
  al cargar), `overlay` (resaltado de hover, cuadrícula y ruta de depuración) y la cámara como
  transformación (`position` + `scale`) del contenedor raíz. Solo `overlay` se redibuja ante cambios.
- **Rationale**: la escena tiene ~60 objetos; con geometría estática y una sola transformación por
  frame, 60 fps es holgado incluso en portátiles modestos.
- **Alternatives considered**: redibujar todo cada frame (innecesario); sprites prerenderizados a PNG
  (contradice el principio VIII y FR-010).

## R3. Proyección isométrica y conversión pantalla↔tile

- **Decision**: funciones puras en `packages/domain`:
  `gridToWorld({x,y}) = { x: (x − y) · W/2, y: (x + y) · H/2 }` con W=64, H=32 (centro superior del
  rombo del tile), y la inversa `worldToGrid` con `floor` sobre las coordenadas fraccionales.
  La cámara aporta `worldToScreen` / `screenToWorld` (`screen = world · zoom + offset`).
  `screenToGrid` = `worldToGrid(screenToWorld(p))`, devolviendo `null` fuera de la cuadrícula.
- **Rationale**: separar proyección y cámara permite probar ambas por separado; `floor` da la regla
  determinista para puntos en el borde entre tiles (edge case de la spec).
- **Alternatives considered**: usar el hit-testing de Pixi sobre cada rombo (no es puro ni testeable
  sin canvas, y es más lento).

## R4. Orden de profundidad (depth sorting)

- **Decision**: clave de orden por objeto = `(xMax + yMax, xMin + yMin, z, id)` ascendente, donde
  `xMax/yMax` es el tile más frontal de su huella y `z` la elevación de su base (p. ej. el monitor
  sobre el escritorio). Los muros del fondo se dibujan en la capa de objetos con la misma regla.
  Se ordena una vez al cargar el layout (el layout no cambia en esta feature).
- **Rationale**: con objetos que no se solapan (garantizado por la validación) y huellas rectangulares
  pequeñas, la regla del tile frontal produce el orden correcto en todo el layout de FR-005b; los tests
  lo verifican por pares de objetos vecinos.
- **Alternatives considered**: ordenación topológica de cajas isométricas (correcta en casos generales
  con huellas grandes, pero más compleja; se reserva si un layout futuro la necesita).

## R5. Hit-testing de hover

- **Decision**: cada objeto tiene en el dominio una silueta en coordenadas de mundo (polígono del
  prisma isométrico: huella + altura). El hover recorre los objetos en orden de dibujo inverso (el de
  delante primero) con point-in-polygon; si ninguno coincide, cae al tile de suelo con `worldToGrid`;
  si está fuera, `null`.
- **Rationale**: puro y testeable; cumple FR-018 (gana el objeto que se dibuja delante).
- **Alternatives considered**: eventos `pointerover` de Pixi por objeto (no deterministas en tests
  unitarios, y ambiguos con objetos altos que tapan tiles de detrás).

## R6. Cámara: límites, zoom y teclado

- **Decision**:
  - Zoom por rueda y por `+`/`-`: factor multiplicativo 1.1 por paso, limitado a [0.5, 2].
  - Zoom centrado en un punto: se conserva el punto de mundo bajo el cursor (o el centro de la
    pantalla con teclado).
  - Límite de desplazamiento: el centro de la oficina (en pantalla) MUST quedar dentro del viewport;
    regla simple, testeable y más estricta que "al menos una parte visible" (FR-016).
  - Teclado: flechas/WASD desplazan a 600 px/s mientras se mantienen pulsadas; `0` recentra; `G`
    alterna depuración; se ignoran si el foco está en `input`, `textarea` o `contenteditable`.
  - Umbral de arrastre: 4 px antes de considerar que es un desplazamiento (edge case de la spec).
- **Rationale**: todo como funciones puras sobre `Camera` en el dominio; la web solo traduce eventos.
- **Alternatives considered**: zoom lineal (+0.1): se siente desigual entre 0.5x y 2x.

## R7. Rutas (A* determinista, 4 direcciones)

- **Decision**: A* con heurística Manhattan, coste 1 por paso, vecinos en orden fijo N, E, S, O y
  desempate de la lista abierta por `(f, h, orden de inserción)`. Lista abierta como array simple (192
  tiles como máximo: no hace falta heap). Devuelve `{ ok: true, path }` (incluye origen y destino) o
  `{ ok: false, reason: 'blocked' | 'unreachable' | 'out-of-bounds' }`.
- **Rationale**: óptimo con heurística admisible; el desempate fijo garantiza FR-022; sin dependencias.
- **Alternatives considered**: BFS (igual de correcto en coste uniforme y algo más simple, pero A* deja
  preparado el coste por tile para features futuras); librerías como `pathfinding` (dependencia
  innecesaria).

## R8. Datos del layout y fidelidad con la spec

- **Decision**: el layout de Marketing es una constante TypeScript tipada en
  `packages/domain/src/layout/marketing.ts` (datos, sin lógica). Un test renderiza el layout a texto
  con la leyenda de FR-005b y lo compara con el mapa de la spec; así spec y datos no pueden divergir.
- **Rationale**: tipado y autocompletado al editar; el test de "mapa ASCII" convierte FR-005b en un
  test ejecutable (principio I).
- **Alternatives considered**: JSON (pierde tipos, necesita validación de esquema extra); parsear el
  mapa ASCII (no expresa nombres, alturas ni direcciones sin una mini-gramática adicional).

## R9. Estado de la UI

- **Decision**: un store Zustand en `apps/web` con `camera`, `hover`, `debug: { enabled, from, to,
  result }` y `viewport`. Las transiciones llaman a funciones puras del dominio.
- **Rationale**: Zustand ya está en la constitución; permite `subscribe` desde Pixi sin React.
- **Alternatives considered**: estado local en el componente del canvas (difícil de compartir con los
  controles React y de testear).

## R10. Estrategia de tests

- **Decision**:
  - `packages/domain`: Vitest en entorno `node`; cobertura ≥95 % (principio II).
  - `apps/web`: Vitest + jsdom + Testing Library para controles React y store; Pixi se excluye de jsdom.
  - E2E: Playwright (Chromium) contra `vite preview`. Para verificar el canvas sin comparar píxeles, la
    app expone en builds de test/dev un hook de solo lectura `window.__AIHQ__` (ver
    `contracts/ui-contract.md`) con orden de dibujo, cámara, hover, estado de depuración y FPS medidos.
  - SC-003 (60 fps): smoke test e2e que mide FPS durante 5 s de pan/zoom con umbral ≥ 50 (headless es
    ruidoso) + verificación manual de 30 s en hardware real documentada en `quickstart.md`.
- **Rationale**: pirámide de tests con la lógica (lo que más falla) en unit; e2e solo para lo que
  requiere navegador real.
- **Alternatives considered**: tests de snapshot de píxeles (frágiles entre GPUs/SO).

## R11. Herramientas del monorepo y versión de Node

- **Decision**: pnpm workspaces; TypeScript `strict` con `tsconfig.base.json` compartido; ESLint
  (flat config + typescript-eslint) y Prettier; Tailwind v4 vía `@tailwindcss/vite`. `engines.node`
  `>=22`. pnpm se instala con `npm i -g pnpm` (en Node ≥25 ya no viene Corepack).
- **Rationale**: la constitución pide Node 22; el entorno local tiene Node 26, compatible hacia atrás.
  Se fija el mínimo y CI usará Node 22 LTS.
- **Alternatives considered**: Turborepo/Nx (innecesario para 4 paquetes); Biome en lugar de
  ESLint+Prettier (una herramienta menos, pero menor soporte de reglas para React hooks).

## R12. Andamiaje de `apps/server` y `packages/shared`

- **Decision**: se crean como paquetes mínimos (package.json, tsconfig, `src/index.ts` vacío, sin
  dependencias de runtime) para fijar la estructura del monorepo; su contenido llega en las features
  003–005.
- **Rationale**: lo pidió el usuario y evita reestructurar más tarde; sin dependencias no viola el
  principio VII.
- **Alternatives considered**: crearlos cuando se necesiten (más YAGNI, pero obliga a reconfigurar
  workspaces, tsconfig y CI más adelante).
