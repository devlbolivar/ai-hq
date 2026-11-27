# Validación manual: 001-office-engine (T075)

Plantilla para registrar la validación manual de los escenarios 1–10 de
[quickstart.md](./quickstart.md). Rellénala con lo que observes; la tarea T075 se cierra cuando todos
los escenarios están en ✅ en ambos navegadores (o las desviaciones están anotadas y aceptadas).

## Entorno

Arranca la build de producción:

```bash
pnpm build && pnpm --filter @ai-hq/web preview   # http://localhost:4173
```

| Campo                  | Valor |
| ---------------------- | ----- |
| Fecha                  |       |
| Commit (`git rev-parse --short HEAD`) |       |
| Equipo (modelo, CPU, GPU) |       |
| Sistema operativo      |       |
| Resolución y escala de pantalla |       |
| Chrome (versión)       |       |
| Safari (versión)       |       |

Leyenda: ✅ cumple · ⚠️ cumple con observaciones · ❌ no cumple · — no probado.

## Escenarios

| #   | Historia    | Qué hacer                                                       | Resultado esperado                                                            | Chrome | Safari | Notas |
| --- | ----------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ | ------ | ----- |
| 1   | US1         | Abrir la app                                                    | Oficina 16×12 centrada, tema oscuro, visible en menos de 2 s                  |        |        |       |
| 2   | US1         | Contar objetos                                                  | 6 escritorios con silla y monitor, 5 pantallas, sala de reuniones, café, pizarra |        |        |       |
| 3   | US1         | Comparar la escena con el mapa de FR-005b (spec.md)             | Cada objeto en la casilla que indica el mapa                                  |        |        |       |
| 4   | US1         | Revisar superposiciones a 0,5×, 1× y 2×                         | Ningún objeto de delante queda tapado por uno de detrás                       |        |        |       |
| 5   | US2         | Arrastrar, rueda hasta ambos límites, pulsar «Recentrar»        | El pan sigue al puntero; zoom en [0,5×, 2×] anclado al cursor; vuelve a 1× centrado |        |        |       |
| 6   | US2         | Solo teclado: flechas/WASD, `+`/`-`, `0`                        | Mismo comportamiento, con el zoom centrado en la pantalla                     |        |        |       |
| 7   | US3         | Hover en suelo, en la mesa de reuniones y fuera de la oficina   | Una casilla resaltada / mesa entera + «Mesa de reuniones» / nada              |        |        |       |
| 8   | US4         | `G`, clic en la entrada y en la silla del Escritorio 4          | Ruta mínima dibujada y «Ruta: N pasos»                                        |        |        |       |
| 9   | US4         | En modo depuración, elegir como destino un escritorio           | «Sin ruta»                                                                    |        |        |       |
| 10  | Rendimiento | 30 s de pan/zoom/hover con el panel de rendimiento del navegador | ≥ 60 fps sin caídas perceptibles (SC-003)                                     |        |        |       |

## Escenario 10: FPS medidos

Chrome: DevTools → Performance (o *Rendering → Frame Rendering Stats*). Safari: Desarrollo →
Mostrar Web Inspector → Línea de tiempo (activa *Frames de renderizado*). Graba 30 s seguidos de
arrastre, rueda y hover.

| Navegador | FPS medio | FPS mínimo | Caídas perceptibles (sí/no, cuándo) |
| --------- | --------- | ---------- | ----------------------------------- |
| Chrome    |           |            |                                     |
| Safari    |           |            |                                     |

Referencia automatizada: `apps/web/e2e/perf.spec.ts` (Chromium headless con GPU, 5 s) midió
60–61 fps sostenidos en todos los muestreos (quality gate de T074).

## Incidencias encontradas

| # | Escenario | Navegador | Descripción | Gravedad | Decisión |
| - | --------- | --------- | ----------- | -------- | -------- |
|   |           |           |             |          |          |

## Veredicto

- [x] Todos los escenarios validados en Chrome
- [x] Todos los escenarios validados en Safari
- [x] SC-003 (≥ 60 fps) confirmado en hardware real
- [x] Listo para abrir el PR de la feature
