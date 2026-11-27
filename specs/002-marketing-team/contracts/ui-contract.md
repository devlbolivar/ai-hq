# Contract: interfaz de usuario y hook de pruebas (feature 002)

Amplía el [contrato de UI de la 001](../../001-office-engine/contracts/ui-contract.md). Los controles,
atajos y campos del hook de la 001 se mantienen.

## Controles visibles

| Control | Rol accesible / nombre | Efecto |
|---|---|---|
| Panel de equipo (izquierda) | `region` / "Equipo" | lista de tarjetas en el orden del equipo (FR-033) |
| Tarjeta de agente | `button` / "N. Nombre — Rol" con `aria-pressed` | selecciona el agente; muestra número, nombre, rol, muestra de color (`data-color` = id de color) y estado en español |
| Botón "Editar" de la tarjeta | `button` / "Editar Nombre" | abre el editor de ese agente (y lo selecciona) |
| Panel del agente (derecha) | `region` / "Agente seleccionado" | visible con selección: nombre, rol, estado, botón "Editar" |
| Órdenes de depuración | `group` / "Órdenes de depuración" | solo con modo depuración: botones "Trabajar", "Reunión", "Descanso", "Entregar a revisión", "Volver a idle" (FR-034) |
| Aviso | `status` / "Sin sitio libre" | ~2 s tras una orden sin destino libre |
| Indicador de pausa | `status` / "Simulación en pausa" | visible solo mientras `Space` tiene la simulación pausada |
| Etiqueta de hover | `status` / nombre del objeto o del agente | la de la 001, también para personajes |

Textos de estado (tarjetas, panel, burbuja del seleccionado): `idle` "Desocupado", `walking`
"Caminando", `working` "Trabajando", `meeting` "En reunión", `break` "Descanso", `waiting_review`
"Esperando revisión".

## Editor (diálogo modal, FR-030–FR-032a)

| Elemento | Rol / nombre | Reglas |
|---|---|---|
| Diálogo | `dialog` / "Editar agente: Nombre" | `<dialog>` con `showModal()` |
| Nombre | `textbox` / "Nombre" | error en `aria-describedby` + `aria-invalid` |
| Rol | `textbox` / "Rol" | ídem |
| Color | `radiogroup` / "Color" | 10 opciones; las usadas por otros agentes muestran quién las usa y dan error al guardar |
| Tono de piel, Peinado, Color de pelo, Accesorio | `combobox` (`select`) con su nombre | opciones del catálogo |
| System prompt | `textbox` / "System prompt" (multilínea) | contador de caracteres |
| Regla de cero invenciones | `note` / "Regla de cero invenciones" | texto fijo, no editable |
| Vista previa | `img` / "Vista previa de Nombre" | SVG desde `characterShapes`; se actualiza al momento |
| Botones | "Guardar", "Cancelar", "Restaurar valores originales" | "Guardar" valida al pulsar; con errores no guarda y los muestra junto a cada campo |

`Esc` = Cancelar (cierra sin aplicar y mantiene la selección). Mientras está abierto no actúa ningún
atajo ni gesto de la oficina.

## Ratón (añadidos)

| Gesto | Efecto |
|---|---|
| Clic sin arrastre sobre un personaje | selecciona el agente (también en depuración) |
| Clic sin arrastre fuera de personajes | sin depuración: quita la selección; con depuración: origen/destino de la 001 |
| Hover sobre un personaje | resalta el personaje y muestra su nombre |
| Arrastre / rueda | como en la 001 y además detiene el seguimiento |

## Teclado (añadidos, FR-029)

| Tecla | Efecto |
|---|---|
| `1`–`9` | selecciona el agente N (sin agente: nada) |
| `Tab` / `Shift+Tab` | siguiente / anterior, cíclico |
| `Esc` | quita la selección |
| `Space` | pausa / reanuda la simulación |

Se ignoran con el foco en `input`, `textarea`, `select`, `button`, `a[href]` o `[contenteditable]`.
Con el editor abierto no actúa ningún atajo de la oficina (tampoco los de la 001).

## Hook de pruebas `window.__AIHQ__` (añadidos)

Mismas condiciones de exposición que en la 001. La semilla se fija con `?seed=N` en la URL.

```ts
interface AIHQTestHook /* …campos de la 001… */ {
  drawOrder: string[]           // 001: ids de objetos en el orden real de hijos (sin personajes)
  sceneOrder: string[]          // orden real de hijos del contenedor `objects`: ids de objetos y
                                // `agent:<id>` para personajes
  seed: number
  simTimeMs: number
  paused: boolean
  agents: {
    id: string; name: string; role: string; color: string; number: number
    status: AgentStatus; tile: Coord; position: { x: number; y: number }   // grid fraccional
    facing: Direction; forced: boolean; reservation: string | null         // "objectId#index"
    celebrating: boolean
  }[]
  selection: { agentId: string | null; following: boolean }
  editorOpen: boolean
  agentToScreen(id: string): { x: number; y: number }   // centro del cuerpo en pantalla
  test: {
    order(agentId: string, order: Order): OrderResult    // misma vía que los botones de depuración
    patrol(on: boolean): void   // cada agente que queda idle recibe go-to al extremo opuesto
  }
}
```

`hover` acepta además `{ type: 'agent'; id }`.
