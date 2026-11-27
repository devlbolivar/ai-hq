# Quickstart: 002-marketing-team

Guía para comprobar que la feature funciona. Detalles de API y UI en
[contracts/domain-api.md](./contracts/domain-api.md) y [contracts/ui-contract.md](./contracts/ui-contract.md).

## Requisitos

- Node ≥ 22, pnpm (como en la 001). `pnpm install`.
- Rama `002-marketing-team` con `main` mergeado (incluye el fix `fix/001-review`).

## Comprobación automática

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e --workers=3
pnpm test:coverage                       # packages/domain ≥ 95 %, resto de packages ≥ 80 %
# Perf smoke (FR-035) aislado, con GPU:
pnpm --filter @ai-hq/web exec playwright test --project=perf --no-deps
```

| Qué prueba | Dónde | Requisitos |
|---|---|---|
| 36 pares de la máquina de estados | `packages/domain/test/agents/stateMachine.test.ts` | FR-008, FR-010, SC-003 |
| Semilla, catálogo, validación y regla de cero invenciones | `packages/domain/test/agents/{seed,catalog,validate,prompt}.test.ts` | FR-001–FR-006, FR-030 |
| Movimiento, reservas, autonomía, órdenes | `packages/domain/test/agents/*.test.ts` | FR-011–FR-019, FR-034 |
| Semilla de aceptación (60 s) y reproducibilidad (5 min, cuadros distintos) | `packages/domain/test/agents/simulation.test.ts` | FR-015, FR-019, SC-005, SC-006 |
| Orden de profundidad y hit-test con personajes | `packages/domain/test/scene/{sceneOrder,characterHit}.test.ts` | FR-023 |
| Store, teclado, ratón, paneles, editor | `apps/web/test/**` | FR-020, FR-026–FR-034 |
| Historias completas en navegador | `apps/web/e2e/{team,selection,autonomy,editor,debug-orders}.spec.ts` | US1–US5 |
| 6 agentes caminando + cámara siguiendo, 10 s ≥ 50 fps por muestra | `apps/web/e2e/perf.spec.ts` | FR-035 |

## Comprobación manual (`pnpm dev`, http://localhost:5173)

Semilla de aceptación: `ACCEPTANCE_SEED` = **(se fija al implementar la Tanda 2 y se anota aquí)**.
Abrir `http://localhost:5173/?seed=<ACCEPTANCE_SEED>`.

1. **US1**: aparecen 6 personajes en los escritorios 1–6, sin burbuja, con colores distintos que
   coinciden con las 6 tarjetas numeradas del panel izquierdo. El escritorio de delante tapa al
   personaje de la fila de atrás. Pasar el ratón por un personaje muestra su nombre.
2. **US2**: clic en un personaje, en una tarjeta, `3`, `Tab`, `Shift+Tab`: anillo de color, tarjeta
   destacada y cámara centrada (suave). Mientras camina, la cámara lo sigue. Arrastrar o hacer zoom deja
   de seguir sin quitar la selección. `Esc` quita la selección. Con el foco en un botón, `Tab` navega.
3. **US3**: en 60 s cada agente decide algo, camina rodeando muebles, teclea en su escritorio,
   toma café de pie o sentado en el sofá, celebra al terminar de trabajar y vuelve a quedar desocupado.
   `Space` congela todo; otra vez `Space` continúa donde estaba. Recargar con la misma semilla repite
   la misma secuencia.
4. **US4**: "Editar" en una tarjeta abre el diálogo; cambiar color y peinado actualiza la vista previa
   pero no la oficina; "Guardar" aplica a personaje y tarjeta; nombre vacío o repetido y color usado dan
   error junto al campo; "Cancelar"/`Esc` no aplica nada; "Restaurar valores originales" + "Guardar"
   devuelve la semilla. Recargar la página vuelve a la semilla.
5. **US5**: `G` activa depuración; en el panel del agente aparecen las órdenes. "Reunión" lo lleva a la
   mesa (`En reunión`), "Entregar a revisión" a la pizarra; con la pizarra ocupada, otro agente recibe
   "Sin sitio libre". Repetir la orden no hace nada. Desactivar depuración devuelve la autonomía.
6. **SC-007**: con `?seed=<ACCEPTANCE_SEED>`, seleccionar un agente y observar 30 s: la animación se
   mantiene fluida (60 fps; el campo `fps` del hook en la consola: `window.__AIHQ__.fps`).

El resultado de la validación manual se registra en `validation.md` al cerrar la feature.
