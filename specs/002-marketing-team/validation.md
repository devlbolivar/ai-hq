# Validación manual: 002-marketing-team (T092)

Plantilla para registrar la validación manual de los escenarios 1–6 de
[quickstart.md](./quickstart.md), con los criterios que solo se pueden juzgar a mano (SC-002, SC-007 y
SC-008). Rellénala con lo que observes; la feature se cierra cuando todos los escenarios están en ✅ en
ambos navegadores (o las desviaciones están anotadas y aceptadas).

## Entorno

Arranca la build de producción con la semilla de aceptación (`ACCEPTANCE_SEED` = **1**,
`packages/domain/src/agents/simulation.ts`):

```bash
pnpm build && pnpm --filter @ai-hq/web preview   # http://localhost:4173/?seed=1
```

`?seed=N` funciona en cualquier build; `?paused=1` solo fuera de producción (no hace falta aquí).
Para el FPS (escenario 6) consulta `window.__AIHQ__.fps` en la consola solo si usas `pnpm dev`
(http://localhost:5173/?seed=1): en la build de producción el hook de pruebas no se expone.

| Campo                                 | Valor |
| ------------------------------------- | ----- |
| Fecha                                 |       |
| Commit (`git rev-parse --short HEAD`) |       |
| Equipo (modelo, CPU, GPU)             |       |
| Sistema operativo                     |       |
| Resolución y escala de pantalla       |       |
| Chrome (versión)                      |       |
| Safari (versión)                      |       |

Leyenda: ✅ cumple · ⚠️ cumple con observaciones · ❌ no cumple · — no probado.

## Escenarios

| #   | Historia | Qué hacer | Resultado esperado | Chrome | Safari | Notas |
| --- | -------- | --------- | ------------------ | ------ | ------ | ----- |
| 1a  | US1      | Abrir `/?seed=1` | 6 personajes en los escritorios 1–6, sin burbuja, visibles en menos de 2 s (SC-001) | | | |
| 1b  | US1      | Comparar personajes y tarjetas | Colores distintos; cada personaje coincide con su tarjeta numerada (1–6) del panel izquierdo | | | |
| 1c  | US1      | Mirar la fila de atrás | El escritorio de delante tapa al personaje sentado detrás; el personaje queda encima de su silla | | | |
| 1d  | US1      | Pasar el ratón por un personaje | Se resalta el personaje y aparece su nombre | | | |
| 2a  | US2      | Clic en un personaje; clic en otra tarjeta | Anillo de su color bajo los pies, tarjeta destacada, cámara centrada suavemente (< 1 s, SC-004) | | | |
| 2b  | US2      | `3`, `7`, `Tab` con el 6 seleccionado, `Shift+Tab` con el 1 | 3.º agente; `7` no cambia nada; pasa al 1; vuelve al 6 | | | |
| 2c  | US2      | Seleccionar a uno que camina | La cámara lo mantiene centrado durante todo el trayecto (US2-6) | | | |
| 2d  | US2      | Arrastrar, rueda y «Recentrar» con alguien seleccionado | Deja de seguir pero mantiene la selección; seleccionarlo otra vez reanuda el seguimiento | | | |
| 2e  | US2      | Clic en el suelo; `Esc` | Se quita la selección y desaparece el anillo | | | |
| 2f  | US2      | Foco en un botón del panel (con `Tab` del navegador) y pulsar `Tab`, `3`, `Space` | `Tab` mueve el foco con normalidad; ni la selección ni la pausa cambian (US2-9) | | | |
| 3a  | US3      | Observar 60 s sin tocar nada | Cada agente decide algo, camina rodeando muebles, teclea en su escritorio, toma café de pie o en el sofá, celebra al terminar y vuelve a quedar desocupado; nunca dos en el mismo sitio | | | |
| 3b  | US3      | `Space`, esperar, `Space` | Todo se congela (indicador «Simulación en pausa») y continúa donde estaba | | | |
| 3c  | US3      | Recargar con `?seed=1` y repetir 3a | Se repite la misma secuencia | | | |
| 4a  | US4      | «Editar» en una tarjeta; cambiar color y peinado | La vista previa cambia al momento; la oficina no | | | |
| 4b  | US4      | «Guardar» | Personaje y tarjeta muestran los cambios en menos de 1 s (SC-008) | | | |
| 4c  | US4      | Nombre vacío, nombre repetido, color usado; «Guardar» | Error junto a cada campo; no se guarda nada | | | |
| 4d  | US4      | «Cancelar» y `Esc` con cambios | Se cierra sin aplicar nada y la selección se mantiene | | | |
| 4e  | US4      | «Restaurar valores originales» + «Guardar»; recargar tras otro cambio | Vuelve a la semilla en ambos casos | | | |
| 5a  | US5      | `G`, seleccionar un agente, «Reunión» | Camina a la mesa y queda «En reunión»; repetir la orden no hace nada | | | |
| 5b  | US5      | «Entregar a revisión» con dos agentes | El primero va a la pizarra («Esperando revisión»); el segundo recibe «Sin sitio libre» y no se mueve | | | |
| 5c  | US5      | Esperar 10 s y luego `G` | Los forzados no se mueven; al desactivar la depuración vuelven a `idle` y recuperan la autonomía | | | |
| 6   | SC-007   | Seleccionar un agente y observar 30 s con el panel de rendimiento | ≥ 60 fps sin caídas perceptibles con la cámara siguiendo | | | |

## SC-002: asociar personajes y tarjetas

Pide a una persona que no conozca la app que, sin pasar el ratón ni seleccionar, diga qué tarjeta
corresponde a cada personaje. Cronometra.

| Persona | Aciertos (de 6) | Tiempo (s, objetivo < 30) | Observaciones |
| ------- | --------------- | ------------------------- | ------------- |
|         |                 |                           |               |

## SC-008: editar un agente

Pide a esa persona que cambie el nombre y la apariencia (color y peinado) de un agente y guarde.

| Persona | Tiempo hasta guardar (s, objetivo < 60) | Cambios visibles en < 1 s (sí/no) | Observaciones |
| ------- | --------------------------------------- | --------------------------------- | ------------- |
|         |                                         |                                   |               |

## Escenario 6 (SC-007): FPS medidos

Chrome: DevTools → Performance (o *Rendering → Frame Rendering Stats*). Safari: Desarrollo → Mostrar
Web Inspector → Línea de tiempo (activa *Frames de renderizado*). Graba 30 s seguidos con un agente
seleccionado y los demás moviéndose.

| Navegador | FPS medio | FPS mínimo | Caídas perceptibles (sí/no, cuándo) |
| --------- | --------- | ---------- | ----------------------------------- |
| Chrome    |           |            |                                     |
| Safari    |           |            |                                     |

Referencia automatizada: `apps/web/e2e/perf.spec.ts` (Chromium headless con GPU) con los 6 agentes
caminando (`test.patrol(true)`) y la cámara siguiendo al agente 1 durante 10 s (FR-035):
60–61 fps en las 10 muestras, con los 6 agentes en `walking` en
cada muestra (quality gate de T091, ejecución aislada `--project=perf --no-deps`).

## Comprobación automática (T091)

Ejecutada el 2026-11-28 sobre la rama `002-marketing-team`:

| Comprobación | Resultado |
| ------------ | --------- |
| `pnpm lint` | sin errores |
| `pnpm typecheck` | sin errores |
| `pnpm test` | 813 tests en verde (62 archivos) |
| `pnpm e2e --workers=3` | 61 tests en verde (incluye el proyecto `perf`) |
| Perf aislado (`--project=perf --no-deps`) | SC-003 de la 001: 60–61 fps; FR-035: 60–61 fps con 6 agentes caminando |
| `pnpm test:coverage` | 99,52 % de líneas en total; umbrales cumplidos (`packages/domain` ≥ 95 %) |

Nota: en una ejecución con la máquina muy cargada (carga ≈ 8) cinco tests unitarios superaron su
tiempo límite (ninguna aserción falló); repetida con la máquina normal, todo pasó.

## Incidencias encontradas

| # | Escenario | Navegador | Descripción | Gravedad | Decisión |
| - | --------- | --------- | ----------- | -------- | -------- |
|   |           |           |             |          |          |
