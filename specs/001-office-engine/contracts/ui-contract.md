# Contract: interfaz de usuario y hook de pruebas (feature 001)

## Controles visibles

| Control | Rol accesible / nombre | Efecto |
|---|---|---|
| Botón "Recentrar" | `button` / "Recentrar" | `recenter` (FR-015) |
| Interruptor "Depuración" | `switch` / "Modo depuración" | alterna `debug.enabled` (FR-023) |
| Etiqueta de hover | `status` / nombre del objeto | visible solo si el hover es un objeto (FR-018) |
| Aviso de ruta | `status` / "Sin ruta" o "Ruta: N pasos" | solo en modo depuración tras elegir destino |

Los clics y arrastres que empiezan sobre un control no mueven la cámara.

## Ratón

| Gesto | Efecto |
|---|---|
| Arrastrar (botón principal, > 4 px) | `pan` (FR-013) |
| Rueda | `zoomAt` en el cursor, factor 1.1 por paso (FR-014) |
| Mover | actualiza `hover` |
| Clic en tile (modo depuración) | fija origen / destino de la ruta |

## Teclado (FR-016a)

| Tecla | Efecto |
|---|---|
| Flechas / `W` `A` `S` `D` | desplazar mientras se mantiene pulsada |
| `+` / `=` y `-` | zoom in / out centrado en la pantalla |
| `0` | recentrar |
| `G` | alternar modo depuración |

Se ignoran con el foco en `input`, `textarea`, `select` o `[contenteditable]`.

## Hook de pruebas `window.__AIHQ__`

Solo se expone cuando `import.meta.env.MODE !== 'production'` o con `VITE_E2E=1`. Solo lectura.

```ts
interface AIHQTestHook {
  ready: boolean                      // escena dibujada al menos una vez
  layoutId: string                    // 'marketing'
  drawOrder: string[]                 // ids de objetos, de atrás hacia delante
  camera: { offset: { x: number; y: number }; zoom: number }
  hover: { type: 'object'; id: string } | { type: 'tile'; tile: { x: number; y: number } } | null
  debug: { enabled: boolean; from: Coord | null; to: Coord | null;
           result: { ok: true; path: Coord[] } | { ok: false; reason: string } | null }
  fps: number                         // media móvil del último segundo
  gridToScreen(tile: { x: number; y: number }): { x: number; y: number }  // para apuntar con el ratón
}
```

Los tests e2e usan `gridToScreen` para mover el ratón a un tile concreto y comprueban el resto de
campos en lugar de comparar píxeles.
