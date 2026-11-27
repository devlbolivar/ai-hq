# Quickstart: validar 001-office-engine

## Prerrequisitos

- Node ≥ 22 (`node --version`).
- pnpm: `npm i -g pnpm` (Node ≥ 25 ya no trae Corepack).
- Navegadores de Playwright: `pnpm --filter @ai-hq/web exec playwright install chromium`.

## Instalar y ejecutar

```bash
pnpm install
pnpm dev            # abre apps/web en http://localhost:5173
```

## Quality gate (constitución)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
pnpm test:coverage  # domain ≥ 95 %; packages/* ≥ 80 %
```

## Escenarios de validación

Referencias: [spec.md](./spec.md), [contracts/ui-contract.md](./contracts/ui-contract.md),
[contracts/domain-api.md](./contracts/domain-api.md).

| # | Historia | Cómo validarlo | Resultado esperado | Automatizado en |
|---|---|---|---|---|
| 1 | US1 | Abrir la app | Oficina 16x12 centrada, tema oscuro, en < 2 s | e2e `scene.spec.ts` |
| 2 | US1 | Contar objetos | 6 escritorios con silla y monitor, 5 pantallas, sala, café, pizarra | unit `marketing.test.ts` + e2e |
| 3 | US1 | Comparar el layout con FR-005b | `renderLayoutAscii` idéntico al mapa | unit `ascii.test.ts` |
| 4 | US1 | Revisar superposiciones a 0.5x, 1x y 2x | Ningún objeto delante tapado por uno de detrás | unit `drawOrder.test.ts` + manual |
| 5 | US2 | Arrastrar, rueda hasta los límites, "Recentrar" | Pan sigue al puntero; zoom en [0.5, 2] anclado al cursor; vuelve a 1x centrado | unit `camera.test.ts` + e2e `camera.spec.ts` |
| 6 | US2 | Solo teclado: flechas/WASD, `+`/`-`, `0` | Mismo comportamiento centrado en la pantalla | e2e `keyboard.spec.ts` |
| 7 | US3 | Hover en suelo, en mesa de reuniones, fuera | Un tile / mesa completa + "Mesa de reuniones" / nada | unit `hitTest.test.ts` + e2e |
| 8 | US4 | `G`, clic en entrada y en silla del Escritorio 4 | Ruta mínima dibujada y "Ruta: N pasos" | unit `findPath.test.ts` + e2e `debug.spec.ts` |
| 9 | US4 | Destino sobre un escritorio | "Sin ruta" | unit + e2e |
| 10 | Rendimiento | 30 s de pan/zoom/hover en un portátil de gama media con el panel de rendimiento del navegador | ≥ 60 fps sin caídas perceptibles (SC-003) | manual; smoke e2e `perf.spec.ts` (≥ 50 fps headless) |

## Verificación manual final

1. `pnpm build && pnpm --filter @ai-hq/web preview`.
2. Recorrer los escenarios 1–10 en Chrome y Safari.
3. Anotar resultados y FPS medidos en la descripción del PR.
