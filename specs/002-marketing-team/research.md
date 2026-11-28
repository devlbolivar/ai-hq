# Research: 002-marketing-team

Decisiones técnicas de la Fase 0. Cada una: decisión, razón y alternativas descartadas. La spec no deja
ningún `NEEDS CLARIFICATION`; estas decisiones fijan el "cómo" de lo que la spec deja abierto.

## R1. Reparto entre dominio y web, y bloque delegable

- **Decision**: toda la lógica de agentes vive en `packages/domain/src/agents/` como funciones puras e
  inmutables: catálogo, equipo semilla, validación, prompt efectivo, máquina de estados, reservas,
  elección de destino, movimiento, autonomía, simulación por pasos fijos, órdenes y selección. La API
  está fijada en [contracts/domain-api.md](./contracts/domain-api.md) antes de delegar. Como a Codex
  le queda poca cuota (decisión del usuario, 2026-11-27), solo recibe tres módulos puros, pequeños y sin
  dependencias entre sí, en un único bundle y con el modelo `gpt-6.2-sol`:
  `agents/stateMachine.ts`, `agents/rng.ts` y `agents/selection.ts`. Claude hace el resto del dominio
  (tipos, catálogo, semilla, prompt, validación, puntos de uso, movimiento, autonomía, órdenes y
  simulación) y la geometría de dibujo (`scene/sceneOrder.ts`, `scene/characterHit.ts`,
  `camera/follow.ts`).
- **Rationale**: la constitución (VII) exige dominio puro; FR-010 exige probar estados, movimiento,
  autonomía y selección sin dibujar. Con la API fijada, Codex y Claude trabajan en archivos disjuntos.
- **Alternatives considered**: lógica de agentes en el store de Zustand (no testeable de forma aislada,
  viola VII); dos tandas grandes para Codex (el plan inicial; descartado por la cuota restante).

## R2. Máquina de estados: guarda única por disparador

- **Decision**: `transition(from, trigger)` es la única puerta para cambiar de estado. El disparador
  describe qué ocurre y lleva el resultado de su condición:
  `walk-to {reachable}`, `start-activity {activity, onFreeUsePoint}`, `arrive {activity | null,
  atTarget}`, `cancel`, `finish`. Devuelve `{ ok: true, status }` o `{ ok: false, reason }` con
  `reason ∈ INVALID_TRANSITION | UNREACHABLE | NOT_ON_FREE_USE_POINT | NOT_ARRIVED`.
  El test de FR-010 recorre una tabla de los 36 pares (origen, destino): para cada destino hay un
  disparador canónico (`walking` ← `walk-to`; actividad desde `idle` ← `start-activity`; actividad
  desde `walking` ← `arrive`; `idle` ← `cancel`/`finish`/`arrive(null)`), y cada par válido se prueba
  con la condición cumplida y, si es condicionado, con la condición incumplida; los no listados se
  prueban con todos los disparadores que apuntarían a ese destino y se esperan rechazados.
  La simulación (R6) llama siempre a `transition`, así que la tabla de FR-008 tiene una sola
  implementación.
- **Rationale**: la condición (alcanzable, punto libre, llegada) la calcula quien tiene el contexto
  (simulación); la máquina queda trivialmente pura y la tabla de 36 pares es exhaustiva y legible.
- **Alternatives considered**: `canTransition(from, to, facts)` con un saco de booleanos (ambiguo:
  qué booleano aplica a qué par); máquina con XState (dependencia innecesaria).

## R3. Catálogo de apariencia y colores

- **Decision**: catálogo cerrado en el dominio (datos con id, nombre en español y color hex como
  número): 10 colores de agente, 4 tonos de piel, 4 peinados (`short`, `long`, `curly`, `bun`), 5
  colores de pelo y 4 accesorios (`none`, `glasses`, `headphones`, `cap`). Los colores de agente se
  eligen lejos de los colores de red de la 001 (`networkStyles`); un test de la web comprueba una
  distancia mínima entre ambos conjuntos. Los ids son estables; los nombres son lo que muestra el
  editor.
- **Rationale**: validación por pertenencia al catálogo (FR-006) y unicidad de color por id (FR-003)
  sin tocar píxeles; el hex en el dominio garantiza que oficina, tarjeta y vista previa usan el mismo
  color.
- **Alternatives considered**: colores libres con selector (rompe "del catálogo" y complica la
  unicidad); catálogo en la web (el dominio no podría validar la semilla).

## R4. Regla de cero invenciones y prompt efectivo

- **Decision**: `ZERO_INVENTION_RULE` es una constante de texto en español en `agents/prompt.ts`.
  `cleanSystemPrompt(text)` elimina cualquier aparición literal de la regla y recorta; la usan la
  validación del editor (vacío y longitud se miden sobre el texto limpio), el guardado (se guarda
  limpio) y `effectivePrompt(profile) = ZERO_INVENTION_RULE + '\n\n' + cleanSystemPrompt(...)`. Así
  el prompt efectivo contiene la regla exactamente una vez aunque el usuario la pegue (FR-005). Los datos semilla no la incluyen; un test lo verifica, y otro cuenta apariciones en el
  prompt efectivo de los 6 agentes tras cargar, editar y restaurar.
- **Rationale**: un único bloque global (Clarifications) y garantía estructural de "exactamente una
  vez" sin añadir errores de validación nuevos a la spec.
- **Alternatives considered**: rechazar en el editor un prompt que contenga la regla (añade una regla
  de validación que la spec no pide); guardar la regla en cada agente (lo prohíbe la spec).

## R5. Validación de agentes: carga y editor

- **Decision**: dos funciones con las mismas reglas de campo:
  - `validateTeam(profiles, layout)` para la carga: reporta todos los errores juntos con
    `{ code, agentId, field, message }` (FR-006). Códigos: `DUPLICATE_ID`, `DUPLICATE_DESK`,
    `DUPLICATE_COLOR`, `DUPLICATE_NAME`, `UNKNOWN_DESK`, `UNKNOWN_COLOR`, `UNKNOWN_APPEARANCE`,
    `EMPTY_FIELD`, `TOO_LONG`. `UNKNOWN_DESK` cubre un id inexistente o que no es de tipo `desk`.
  - `validateAgentDraft(draft, team, agentId)` para el editor: devuelve errores por campo (FR-030).
  Los textos se recortan (`trim`) al validar y al guardar; los límites aplican a la longitud
  recortada: nombre 1–30 (único sin distinguir mayúsculas), rol 1–40, system prompt 1–4000. El
  store, como con el layout, lanza un error con todos los mensajes si la semilla no valida.
- **Rationale**: misma regla en carga y edición; `DUPLICATE_NAME` en la carga mantiene coherente la
  semilla con la regla de unicidad del editor.
- **Alternatives considered**: Zod (no está en el dominio y no hay I/O que validar; llega con
  `packages/shared` en la 003).

## R6. Simulación por pasos fijos y determinismo

- **Decision**:
  - Paso fijo `SIM_STEP_MS = 10` (100 Hz). Un paso de tile dura `STEP_DURATION_MS = 500` (2 tiles/s,
    FR-012) = 50 pasos. El avance dentro de un paso es un entero de ms (`stepMs`), así que la posición
    `lerp(tile, next, stepMs / 500)` es exacta y siempre está sobre el segmento: no hay interpolación
    entre estados ni deriva de coma flotante.
  - `advanceFrame(sim, world, accumulatorMs, frameDtMs)`: limita `frameDtMs` a 250 ms (el exceso se
    descarta, FR-015), suma al acumulador, ejecuta `floor(acc / 10)` pasos y devuelve el resto. El
    estado en un instante simulado no depende de cómo se troceen los cuadros (SC-006).
  - Los agentes se procesan siempre en el orden del equipo; las decisiones del primero reservan antes.
  - Pausa (`Space`): la web deja de llamar a `advanceFrame`; animaciones y temporizadores usan el
    tiempo simulado, así que quedan congelados (FR-020).
- **Rationale**: 10 ms da movimiento fluido a 60 fps sin interpolar (≤ 2 pasos por cuadro, coste
  despreciable para 6 agentes) y cumple "posición siempre sobre el segmento".
- **Alternatives considered**: paso de 50 ms con interpolación (cortaría esquinas en los giros,
  incumpliendo FR-012); paso variable igual al delta del cuadro (no reproducible).

## R7. Aleatoriedad con semilla

- **Decision**: PRNG `mulberry32` puro: el estado (`uint32`) vive en `Simulation.rng` y cada consumo
  devuelve el valor y el nuevo estado. Helpers puros: `randomInt(min, max)` inclusivo y `pick(list)`.
  Las decisiones consumen números en un orden fijo (agente por agente, campo por campo).
  `ACCEPTANCE_SEED` es una constante exportada; su valor se fija durante la implementación con el test
  de SC-005 (cada agente completa un ciclo en 60 s simulados) y se documenta en `quickstart.md`.
  La web usa `?seed=N` de la URL si existe; si no, una semilla derivada de la hora de carga.
- **Rationale**: sin dependencias, determinista y serializable (el estado del PRNG es un número).
- **Alternatives considered**: `Math.random` inyectado (no serializable ni reproducible en mitad de
  una simulación); librerías de PRNG (dependencia innecesaria).

## R8. Autonomía y reservas de puntos de uso

- **Decision**:
  - La reserva es un campo del agente (`reservation: UsePointRef | null`); "libre" significa que
    ningún otro agente lo tiene. Una sola fuente de verdad, así que nunca hay dos reservas del mismo
    punto (FR-014, SC-005). Al cargar, cada agente reserva el punto de su escritorio.
  - Al entrar en `idle` sin orden forzada se programa una pausa `randomInt(3000, 8000)` ms (FR-016).
  - Al vencer: se elige una actividad al azar entre `work`, `break`, `whiteboard`, `wander`
    (equiprobables); si no tiene ningún candidato libre, se prueban las demás en el orden de la lista
    (circular) a partir de la elegida. Entre los candidatos se sortea siempre con `pick`. Convenciones
    de consumo del PRNG fijadas en el contrato (orden de agentes, enumeración por filas, cuándo se
    sortean duraciones y pausas). Destinos: `work` → punto de su escritorio; `break` → `pick` entre los puntos libres
    de cafetera y sofá; `whiteboard` → punto de la pizarra si está libre (termina en `idle` mirándola);
    `wander` → `pick` entre tiles caminables que no son punto de uso, no son su tile actual y no están
    ocupados ni son destino de otro agente. Si el candidato sorteado es inalcanzable, se descarta, el
    agente sigue como estaba y se reintenta tras otra pausa.
  - La exclusión de puntos se comprueba por tile resuelto, y `createSimWorld` rechaza layouts con dos
    puntos de uso en el mismo tile.
  - Duraciones: trabajar `randomInt(10000, 20000)`, descanso `randomInt(5000, 10000)`; celebrar 1000 ms
    al terminar `working` de forma natural (FR-017).
  - Al marcharse a otro destino se libera la reserva anterior y se reserva la nueva en el mismo paso.
- **Rationale**: reglas simples, deterministas y verificables; la lista de prioridad fija evita bucles.
- **Alternatives considered**: pesos por rol o necesidades (YAGNI; la spec no lo pide); mapa global de
  reservas (dos fuentes de verdad que pueden divergir).

## R9. Órdenes externas (depuración hoy, tareas en la 004)

- **Decision**: `applyOrder(sim, world, agentId, order)` con `order ∈ { activity: work | meeting |
  break | review } | { go-to: tile } | { idle }` devuelve el nuevo estado y un resultado explícito
  `{ ok: true, changed } | { ok: false, reason: NO_FREE_SPOT | UNREACHABLE | INVALID_DESTINATION |
  UNKNOWN_AGENT }`
  (FR-017a). El punto elegido es el libre más cercano por longitud de ruta desde el tile donde se
  aplicará la orden (el siguiente si va a mitad de paso); empate → orden de `usePoints` en el layout.
  Si el agente va a mitad de paso, se sustituye la ruta restante y la orden se hace efectiva al llegar
  al tile siguiente. La orden marca `forced = true` (sin autonomía) salvo `idle`, que la quita y
  reinicia la pausa de reposo. Repetir una orden forzada de la actividad en curso (o hacia la que ya
  camina) devuelve `changed: false`; si esa actividad venía de la autonomía, la orden la adopta (marca
  `forced` y anula temporizador y celebración). Al detenerse, un agente que camina termina el paso y
  para en el primer tile de su ruta que no sea punto de uso ajeno, de modo que nunca queda quieto sobre
  un punto que no reserva. `cancelForcedOrders` (al desactivar depuración) aplica lo mismo a todos los
  forzados y devuelve la autonomía; el store vacía además las órdenes encoladas en pausa. `go-to` solo
  lo usa el hook de pruebas (R13) y rechaza puntos de uso y tiles ocupados (`INVALID_DESTINATION`).
- **Rationale**: la 004 necesitará aplicar órdenes y conocer el resultado; la regla "mitad de paso →
  siguiente tile" sale de las Clarifications.
- **Alternatives considered**: cola de órdenes pendientes dentro del agente (más estado sin
  beneficio: sustituir la ruta restante ya da el mismo comportamiento).

## R10. Orden de profundidad e hit-testing con personajes

- **Decision**: `sceneOrder(layout, characters)` mezcla objetos y personajes con la clave de la 001
  ampliada a `(front, back, z, idTiebreak, depth, teamIndex)`:
  - Objetos: `(xMax+yMax, xMin+yMin, z, id)` (igual que la 001).
  - Personaje: tile de referencia = el de mayor `x+y` entre su tile y el siguiente (si camina). Si ese
    tile está en la huella de un objeto no bloqueante de suelo (silla, sofá), usa la clave de ese
    objeto y va justo después de él (se dibuja encima de la silla o el sofá); si no,
    `(x+y, x+y, 0, U+FFFF)` (después de cualquier id de objeto). Entre personajes con la misma clave
    decide la profundidad fraccional `position.x + position.y` (dos agentes que se cruzan en el mismo
    segmento invierten su orden al cruzarse) y, si también empata, va después el de número mayor
    (FR-023).
  - `characterSilhouette(position)` es un rectángulo del cuerpo (sin burbuja ni anillo) anclado al
    centro del tile en mundo; `sceneHitTest` recorre `sceneOrder` al revés con la silueta de cada
    elemento y cae al suelo como la 001. El dibujo del personaje cabe en esa silueta.
- **Rationale**: conserva el orden de la 001 para los objetos y resuelve el caso del sofá de 2 tiles,
  donde la clave simple dibujaría el sofá encima del personaje sentado.
- **Alternatives considered**: ordenación topológica general (innecesaria con huellas pequeñas);
  contenedor de personajes separado encima de los objetos (incumple US1-3: el escritorio delantero
  debe tapar al personaje).

## R11. Render de personajes en Pixi

- **Decision**:
  - Los personajes viven en el mismo contenedor `objects` que los muebles, con `sortableChildren` y
    `zIndex` = posición en `sceneOrder`, recalculado cuando cambia la simulación. Así el hook puede
    publicar el orden real de hijos (fix #7 de la 001 ampliado).
  - Cada personaje es un `Container` con el anillo y una figura (`Graphics`). La figura se dibuja por
    fotogramas de animación muestreados cada 50 ms de tiempo simulado (respirar, caminar, teclear,
    café, celebrar); cada fotograma (orientación, pose, índice) se dibuja una vez en un
    `GraphicsContext` cacheado y animar solo cambia el contexto de la figura, sin reconstruir
    geometría en cada cuadro. Cambiar la apariencia vacía la caché.
  - La geometría sale de una función pura `characterShapes(appearance, color, facing, pose, t)` que
    devuelve formas (elipse, rect, polígono) en coordenadas locales. Dos renderizadores finos la
    consumen: Pixi (oficina) y SVG (vista previa del editor y avatar de las tarjetas). Una sola fuente
    de geometría, testeable en jsdom vía SVG.
  - Anillo: elipse del color del agente, primer hijo del personaje (debajo del cuerpo). Burbujas: capa
    `bubbles` encima de `objects` (siempre legibles), con icono por estado dibujado por código y, para
    el seleccionado, un `Text` con el estado en español (FR-025).
- **Rationale**: 6 personajes con piezas estáticas y transformaciones por cuadro mantienen 60 fps; la
  función de formas evita que la vista previa y la oficina diverjan.
- **Alternatives considered**: redibujar cada `Graphics` cada cuadro (más coste de GPU/CPU); un
  segundo canvas Pixi para la vista previa (no funciona en jsdom y duplica contextos WebGL); sprites
  (prohibido por el principio VIII).

## R12. Selección, cámara que sigue y atajos

- **Decision**:
  - Lógica pura de selección en el dominio: `selectByNumber`, `cycleSelection` (Tab/Shift+Tab
    cíclico; sin selección, Tab elige el primero y Shift+Tab el último), y `Esc` = `null`.
  - `centerOn(camera, worldPoint, viewport, layout)` en `camera/follow.ts`: misma cámara y zoom con el
    punto en el centro del viewport, limitada como `pan` (FR-016 de la 001).
  - Transición suave en la web: durante 400 ms el offset interpola con *ease-out* entre el inicial y
    `centerOn(posición actual)`; después, seguimiento exacto en cada cuadro (≤ 2 px, FR-028). Pan, zoom
    o recentrar ponen `following = false`; volver a seleccionar lo reanuda; redimensionar recalcula.
  - Teclado: `1`–`9`, `Tab`, `Shift+Tab`, `Esc`, `Space` se ignoran con el foco en `input`, `textarea`,
    `select`, `button`, `a[href]` o `[contenteditable]`; los atajos de la 001 conservan su regla
    (FR-029). Con el editor abierto no actúa ningún atajo de la oficina.
  - Clic sin arrastre: `sceneHitTest`; personaje → seleccionar (también en depuración); si no, con
    depuración → `selectTile` de la 001, sin depuración → quitar selección.
- **Rationale**: todo lo que decide es puro y testeable; la web solo traduce eventos.

## R13. Hook de pruebas y semilla en e2e

- **Decision**: `window.__AIHQ__` (solo fuera de producción o con `VITE_E2E=1`) añade lectura de
  agentes, selección, pausa, tiempo simulado, orden real de la escena y `agentToScreen(id)`; y un
  objeto `test` con dos controles: `order(agentId, order)` (misma vía que los botones de depuración,
  incluido `go-to`) y `patrol(on)` (cada agente que queda `idle` recibe `go-to` al extremo opuesto de
  la oficina; para el smoke de FR-035). La semilla se fija con `?seed=N`.
- **Rationale**: los e2e verifican estado y orden sin comparar píxeles (como en la 001); el perf smoke
  necesita 6 agentes caminando 10 s seguidos, algo que la autonomía no garantiza.
- **Alternatives considered**: acelerar el tiempo simulado en e2e (cambia el comportamiento medido en
  el perf smoke); probar autonomía de 60 s en e2e (lento; ya lo cubren los tests de dominio).

## R14. Editor modal

- **Decision**: `<dialog>` nativo con `showModal()` (foco atrapado y fondo inerte en el navegador).
  `Esc` se maneja en el evento `cancel` del diálogo y equivale a "Cancelar". El formulario es estado
  local de React; la vista previa usa el renderizador SVG (R11). jsdom no implementa `showModal`: el
  setup de tests de la web añade un stub mínimo (`open = true` / `open = false`), sin dependencias.
  El store expone `editor: { agentId } | null`; mientras está abierto, teclado y ratón de la oficina
  no actúan.
- **Rationale**: semántica y accesibilidad nativas sin librería; testeable con Testing Library.
- **Alternatives considered**: `div role="dialog"` con trampa de foco a mano (más código); Radix/Headless
  UI (dependencia innecesaria).

## R15. Interacción con el fix de la 001 (`fix/001-review`)

- **Decision**: el fix toca `validate.ts`, `mouse.ts`, `keyboard.ts`, `store.ts`, `HoverLabel`,
  `PathStatus`, `OfficeCanvas.tsx`, `testHook.ts` y `e2e/scene.spec.ts`. Las tareas de la 002 que
  modifican esos archivos se ejecutan después de mergear `main` (con el fix) en `002-marketing-team`;
  hasta entonces se avanza en dominio y en archivos nuevos de la web. Tras el merge, `validateLayout`
  incluye `MISSING_USE_POINT` e `INVALID_GEOMETRY`; la 002 no depende de ellos, pero el test que valida
  el layout de Marketing al crear la simulación los ejercita.
- **Rationale**: evita conflictos y respeta "no mezclar el fix en la 002".
