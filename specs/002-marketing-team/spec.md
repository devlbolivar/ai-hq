# Feature Specification: Equipo de Marketing (agentes seleccionables)

**Feature Branch**: `002-marketing-team`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "002-marketing-team — Equipo de Marketing: agentes seleccionables en la
oficina isométrica. Equipo semilla de 6 agentes (Head of Marketing/Estratega, Trend Scout/Investigador,
Copywriter/Redactor, Scriptwriter/Guionista, Designer/Diseño, Community Manager/Comunidad), cada uno con
color, apariencia y system prompt propios (los system prompts incluyen la regla de cero invenciones).
Estados del agente: idle | walking | working | meeting | break | waiting_review, con máquina de estados
pura en packages/domain que cubre transiciones válidas e inválidas con tests. Movimiento por la oficina
usando findPath de la 001 y los puntos de uso del layout. Selección por clic en el personaje o en su
tarjeta del panel de equipo; anillo bajo los pies del seleccionado; la cámara sigue al seleccionado; Esc
deselecciona, Tab cicla, 1–9 selecciona por índice. Animaciones dibujadas por código (idle, caminar,
teclear, café, celebrar). Burbuja de estado sobre la cabeza. Comportamiento autónomo cuando están idle
(ir al café, al sofá, a su escritorio, a la pizarra…), determinista con semilla para tests. Editor de
agentes (nombre, rol, apariencia, system prompt). Sin tareas de contenido, sin IA real, sin backend
(features 004–005). 60 fps con 6 agentes moviéndose."

## Clarifications

### Session 2026-11-27

- Q: ¿Qué actividades autónomas puede elegir un agente desocupado? → A: Trabajar en su escritorio
  (`working`), descanso en la cafetera o el sofá (`break`), pasear y consultar la pizarra (camina a su
  punto de uso y queda en `idle` mirándola, sin entrar en `waiting_review`); `meeting` y
  `waiting_review` siguen reservados a features posteriores y a las órdenes de depuración.
- Q: ¿Los cambios del editor sobreviven a una recarga de la página? → A: No; al recargar vuelven los
  datos semilla. La persistencia llega con el backend (features 004–005).
- Q: Con el modo depuración activo, ¿qué hace un clic sobre un personaje? → A: Gana el personaje: lo
  selecciona. Un clic sobre suelo u objetos elige origen/destino de ruta como en la 001 y no quita la
  selección.
- Q: Si una orden externa (depuración hoy; tareas o eventos de IA en 004–005) llega durante una
  actividad autónoma o una orden forzada, ¿quién manda? → A: Toda orden externa interrumpe al
  instante una actividad autónoma y la autonomía nunca interrumpe una orden externa. Una orden externa
  nueva sustituye a la anterior; la prioridad entre órdenes forzadas y tareas la decidirá la 004.
- Q: ¿Qué significa editar el rol de un agente? → A: Es solo una etiqueta visible. Las capacidades
  futuras (p. ej. quién hace el Plan semanal en la 006) van ligadas al id estable del agente; las
  instrucciones para la IA solo cambian al editar el system prompt.

Decisiones derivadas de la crítica independiente de la spec (se aprueban junto con ella):

- Un punto de uso queda ocupado por el agente que está sobre él o lo tiene reservado mientras camina
  hacia él, y se libera solo cuando el agente sale (empieza a caminar a otro sitio) o cancela la marcha;
  terminar una actividad no lo libera. El punto de uso de un escritorio solo lo usa su titular.
- Una orden o cancelación que llega a mitad de paso se hace efectiva al completar ese paso, en el tile
  siguiente (nunca hay saltos ni rutas desde posiciones intermedias).
- La simulación avanza por pasos fijos de tiempo simulado, independientes de la frecuencia de dibujo;
  la reproducibilidad se compara en los mismos instantes simulados.
- La regla de cero invenciones es un bloque global único, no un campo de cada agente; el prompt efectivo
  la incluye exactamente una vez.
- El editor es un diálogo modal: mientras está abierto, los atajos de la oficina no actúan.
- El color de cada agente es único en todo momento (semilla y ediciones); la apariencia puede repetirse
  tras editar.
- Una orden de depuración repetida para la actividad en la que el agente ya está no hace nada; al
  desactivar el modo depuración se cancelan las órdenes forzadas y vuelve la autonomía.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a mi equipo en la oficina (Priority: P1)

Como dueño de AI HQ, al abrir la aplicación veo a los 6 agentes del equipo de Marketing dentro de la
oficina, cada uno en su escritorio, con un aspecto propio (color, peinado, accesorios) que me permite
distinguirlos de un vistazo. Cuando un personaje está ocupado, una burbuja sobre su cabeza indica qué
está haciendo, y se dibuja correctamente ordenado con los muebles: si está detrás de un escritorio, el
escritorio lo tapa. En el panel de equipo, a la izquierda, veo una tarjeta por agente con su nombre, su
rol, su color y su estado actual.

**Why this priority**: es la primera vez que la oficina "cobra vida"; sin personajes visibles no hay
selección, autonomía ni editor que mostrar. Es el MVP de la feature.

**Independent Test**: abrir la aplicación y comprobar que aparecen los 6 agentes en sus escritorios, con
color distinto, sin burbuja (todos en `idle`), orden de profundidad correcto y 6 tarjetas en el panel
de equipo; forzar un estado con depuración (US5) muestra su burbuja.

**Acceptance Scenarios**:

1. **Given** la aplicación recién abierta, **When** carga la escena, **Then** hay exactamente 6
   personajes en la oficina, cada uno en el punto de uso de su escritorio asignado (Escritorio 1 a 6) y
   en estado `idle`.
2. **Given** la escena cargada, **When** miro a los 6 personajes, **Then** cada uno tiene un color
   distinto y una combinación de apariencia distinta, y cada color coincide con el de su tarjeta en el
   panel de equipo.
3. **Given** un personaje sentado en la silla de un escritorio de la fila de atrás y otro escritorio
   delante de él, **When** se dibuja la escena, **Then** el escritorio delantero tapa la parte del
   personaje que solapa, y el personaje tapa a los objetos que están detrás de él.
4. **Given** la escena cargada, **When** miro el panel de equipo, **Then** veo 6 tarjetas en el orden
   del equipo semilla (Head of Marketing, Trend Scout, Copywriter, Scriptwriter, Designer, Community
   Manager), numeradas 1 a 6, cada una con nombre, rol, color y estado actual.
5. **Given** un agente que cambia de estado, **When** cambia, **Then** su burbuja y su tarjeta muestran
   el nuevo estado en menos de 1 segundo.
6. **Given** el cursor sobre el cuerpo de un personaje, **When** se detiene encima, **Then** se resalta
   el personaje y se muestra su nombre (igual que el hover de objetos de la 001); si el personaje se
   dibuja delante de un objeto u otro personaje, gana el personaje de delante.

---

### User Story 2 - Seleccionar y seguir a un agente (Priority: P2)

Como dueño de AI HQ, selecciono a un agente haciendo clic sobre él o sobre su tarjeta, o con el teclado
(`1`–`9` por número, `Tab` / `Shift+Tab` para pasar al siguiente o anterior, `Esc` para quitar la
selección). El agente seleccionado muestra un anillo de su color bajo los pies, su tarjeta queda
destacada, y la cámara se centra en él y lo sigue mientras camina.

**Why this priority**: la selección es la puerta de entrada a todas las interacciones con un agente
(editor ahora; asignar tareas y ver su trabajo en features posteriores).

**Independent Test**: seleccionar cada agente por clic en el personaje, por tarjeta, por número y por
`Tab`; comprobar anillo, tarjeta destacada y cámara centrada; quitar la selección con `Esc`.

**Acceptance Scenarios**:

1. **Given** ningún agente seleccionado, **When** hago clic (sin arrastrar) sobre un personaje,
   **Then** ese agente queda seleccionado: anillo bajo sus pies, su tarjeta destacada y la cámara se
   centra suavemente en él.
2. **Given** un agente seleccionado, **When** hago clic en la tarjeta de otro agente, **Then** la
   selección pasa a ese otro agente (solo hay un seleccionado a la vez).
3. **Given** la escena cargada, **When** pulso `3`, **Then** se selecciona el tercer agente del equipo;
   **When** pulso un número sin agente (`7`, `8`, `9`), **Then** la selección no cambia.
4. **Given** el agente 6 seleccionado, **When** pulso `Tab`, **Then** se selecciona el agente 1; **When**
   pulso `Shift+Tab` con el agente 1 seleccionado, **Then** se selecciona el agente 6; **When** pulso
   `Tab` sin selección, **Then** se selecciona el agente 1.
5. **Given** un agente seleccionado, **When** pulso `Esc`, **Then** no queda ningún agente seleccionado,
   desaparece el anillo y la cámara deja de seguir.
6. **Given** un agente seleccionado que camina, **When** se desplaza por la oficina, **Then** la cámara
   lo mantiene centrado en el canvas (a 2 px o menos, o en la posición más cercana que permitan los
   límites de cámara de la 001) durante todo el trayecto.
7. **Given** la cámara siguiendo a un agente, **When** arrastro la vista, uso el zoom o pulso
   "Recentrar", **Then** la cámara deja de seguirlo pero el agente sigue seleccionado; **When** lo vuelvo
   a seleccionar, **Then** la cámara vuelve a seguirlo.
8. **Given** un agente seleccionado y el modo depuración desactivado, **When** hago clic (sin
   arrastrar) sobre suelo u objetos sin personaje, **Then** se quita la selección.
9. **Given** el foco en un control de la interfaz (campo de texto, botón, selector) o el editor
   abierto, **When** pulso `Tab`, un número o `Space`, **Then** no cambia la selección ni se pausa la
   simulación (el control se comporta con normalidad); con el editor abierto, `Esc` cierra el editor y
   mantiene la selección.
10. **Given** el modo depuración activo y un agente seleccionado, **When** hago clic sobre otro
    personaje, **Then** se selecciona ese personaje (no se elige ningún extremo de ruta); **When** hago
    clic sobre suelo u objetos, **Then** se fija el origen o destino de la ruta como en la 001 y la
    selección se mantiene.

---

### User Story 3 - Ver al equipo trabajar por su cuenta (Priority: P3)

Como dueño de AI HQ, cuando un agente está desocupado (`idle`) no se queda congelado: tras una pausa
decide por sí mismo qué hacer —volver a su escritorio a trabajar, ir a por café, sentarse en el sofá,
consultar la pizarra o dar un paseo— y camina hasta allí por una ruta que rodea muebles y muros. Al
llegar se orienta hacia el objeto y hace la animación correspondiente (teclear en el escritorio, tomar
café), y su burbuja refleja el estado. Al terminar una sesión de trabajo celebra brevemente y vuelve a quedar desocupado. Puedo
pausar toda la actividad con `Space`.

**Why this priority**: da vida a la oficina y ejercita la máquina de estados, el movimiento y las
animaciones; pero la oficina ya aporta valor con agentes quietos y seleccionables.

**Independent Test**: con la semilla de aceptación fijada, observar la oficina durante 60 segundos y
verificar que cada agente completa al menos un ciclo autónomo (decidir → actividad → `idle`, caminando
si el destino no es su tile actual) con las animaciones y burbujas correctas; con la misma semilla, la
secuencia de decisiones se repite idéntica.

**Acceptance Scenarios**:

1. **Given** un agente en `idle`, **When** termina su pausa de reposo, **Then** elige una actividad
   autónoma y un destino libre para ella; si ya está en ese destino empieza la actividad allí mismo, y
   si no, pasa a `walking` y recorre la ruta más corta hasta él.
2. **Given** un agente que camina, **When** se mueve, **Then** avanza de tile en tile solo entre tiles
   vecinos y caminables (4 direcciones), con movimiento continuo (no a saltos) y mirando en la dirección
   de la marcha.
3. **Given** un agente que llega a su escritorio para trabajar, **When** alcanza el punto de uso, **Then**
   pasa a `working`, mira hacia el escritorio y hace la animación de teclear.
4. **Given** un agente que llega a la cafetera o al sofá, **When** alcanza el punto de uso, **Then** pasa
   a `break` y hace la animación de café (de pie en la cafetera, sentado en el sofá).
5. **Given** un agente en `working`, **When** termina su sesión de trabajo de forma natural, **Then**
   hace la animación de celebrar durante un instante (sigue en `working` mientras celebra) y pasa a
   `idle`; si la sesión se interrumpe por una orden, no celebra.
6. **Given** que el punto de uso elegido lo ocupa o lo ha reservado otro agente, **When** un agente
   decide su actividad, **Then** elige otro punto libre de la misma actividad o, si no hay ninguno, otra
   actividad; nunca dos agentes ocupan el mismo punto de uso.
7. **Given** una semilla fija, **When** ejecuto la simulación dos veces (aunque se dibuje a distinta
   frecuencia de cuadros), **Then** en los mismos instantes simulados las decisiones, rutas, posiciones
   y estados de todos los agentes son idénticos.
8. **Given** la simulación en marcha, **When** pulso `Space`, **Then** los agentes se detienen en su
   posición actual (movimiento, animaciones y temporizadores de autonomía congelados); **When** pulso
   `Space` otra vez, **Then** continúan exactamente donde estaban.

---

### User Story 4 - Editar un agente (Priority: P4)

Como dueño de AI HQ, abro el editor del agente seleccionado y cambio su nombre, su rol, su apariencia
(color, tono de piel, peinado, color de pelo y accesorio, elegidos de opciones predefinidas) y su system
prompt. Veo una vista previa del personaje mientras edito. Al guardar, el personaje de la oficina y su
tarjeta reflejan los cambios al instante; puedo cancelar sin aplicar nada y restaurar los valores
semilla del agente. La regla de cero invenciones se muestra como parte fija del prompt que no puedo
borrar.

**Why this priority**: personalizar a los agentes es valioso pero no imprescindible hasta que generen
contenido real (feature 005); los datos semilla ya son útiles por sí solos.

**Independent Test**: seleccionar un agente, abrir el editor, cambiar cada campo, guardar y verificar
personaje y tarjeta; repetir con valores inválidos y con cancelar.

**Acceptance Scenarios**:

1. **Given** un agente seleccionado, **When** abro el editor, **Then** veo sus valores actuales (nombre,
   rol, apariencia, system prompt), la vista previa del personaje y la regla de cero invenciones como
   texto fijo no editable.
2. **Given** el editor abierto, **When** cambio el color o la apariencia, **Then** la vista previa se
   actualiza al momento, pero el personaje de la oficina no cambia hasta que guardo.
3. **Given** cambios válidos en el editor, **When** pulso "Guardar", **Then** el editor se cierra y el
   personaje y la tarjeta muestran el nuevo nombre, rol y apariencia.
4. **Given** el nombre vacío, solo espacios, de más de 30 caracteres o igual al de otro agente (sin
   distinguir mayúsculas), o un color que ya usa otro agente, **When** intento guardar, **Then** no se
   guarda y se indica el error junto al campo.
5. **Given** el rol vacío o de más de 40 caracteres, o el system prompt vacío o de más de 4000
   caracteres, **When** intento guardar, **Then** no se guarda y se indica el error junto al campo.
6. **Given** cambios sin guardar, **When** pulso "Cancelar" o `Esc`, **Then** el editor se cierra, el
   agente queda como estaba y sigue seleccionado.
7. **Given** un agente editado, **When** pulso "Restaurar valores originales" y guardo, **Then** el
   agente vuelve a sus datos semilla.
8. **Given** el editor abierto, **When** el agente se mueve o cambia de estado, **Then** el editor sigue
   abierto con mis cambios sin guardar intactos.

---

### User Story 5 - Forzar estados para comprobarlos (Priority: P5)

Como dueño de AI HQ, con el modo depuración de la 001 activo, el panel del agente seleccionado me
ofrece órdenes para enviarlo a cada actividad —trabajar en su escritorio, reunión, descanso en el café o
el sofá, entregar en la pizarra para revisión— o devolverlo a `idle`, de modo que puedo ver todos los
estados, animaciones y burbujas aunque todavía no existan tareas de contenido.

**Why this priority**: los estados `meeting` y `waiting_review` solo los provocarán features
posteriores (tareas, standup); esta herramienta permite verificarlos ahora, pero no es para el usuario
final.

**Independent Test**: con el modo depuración activo, enviar un agente a cada actividad y comprobar el
estado, la burbuja y la animación al llegar; desactivar el modo depuración y comprobar que las órdenes
desaparecen.

**Acceptance Scenarios**:

1. **Given** modo depuración activo y un agente seleccionado en `idle`, **When** pulso "Reunión",
   **Then** camina al punto de uso libre más cercano de la mesa de reuniones y pasa a `meeting`.
2. **Given** modo depuración activo y un agente seleccionado, **When** pulso "Entregar a revisión",
   **Then** camina a la pizarra y pasa a `waiting_review`.
3. **Given** una orden cuyo destino no tiene puntos de uso libres, **When** la pulso, **Then** el agente
   no se mueve, su estado no cambia y se muestra el aviso "Sin sitio libre".
4. **Given** un agente con una orden forzada, **When** termina de llegar, **Then** permanece en ese
   estado hasta que le doy otra orden o pulso "Volver a idle" (la autonomía no lo interrumpe).
5. **Given** modo depuración desactivado, **When** miro el panel del agente, **Then** no aparecen las
   órdenes.
6. **Given** un agente en `meeting` por una orden, **When** vuelvo a pulsar "Reunión", **Then** no pasa
   nada (sigue en el mismo punto y estado).
7. **Given** agentes con órdenes forzadas, **When** desactivo el modo depuración, **Then** sus órdenes se
   cancelan: quedan en `idle` donde estén (o terminan el paso en curso) y vuelve la autonomía.

---

### Edge Cases

- Un clic que empieza sobre un personaje pero se convierte en arrastre (más de 4 px) desplaza la cámara
  y no cambia la selección.
- Si un personaje y un mueble se solapan en pantalla, el clic y el hover eligen el que se dibuja delante.
- Si dos personajes se solapan en pantalla (por ejemplo, uno caminando delante de otro), el clic
  selecciona el que se dibuja delante.
- Los personajes no chocan entre sí mientras caminan: pueden cruzarse en el mismo tile de paso, pero
  nunca terminan en el mismo punto de uso ni en el mismo tile de destino de un paseo (los paseos nunca
  terminan en un punto de uso).
- Si dos personajes tienen la misma profundidad de dibujo, el orden de dibujo, el hover y el clic se
  desempatan de forma estable por el orden del equipo (gana el de número mayor, que se dibuja delante).
- La burbuja y el anillo no cuentan como superficie del personaje para el hover ni para el clic.
- Una orden o cancelación que llega a mitad de paso se aplica al completar ese paso, en el tile
  siguiente; el agente nunca salta ni calcula rutas desde una posición intermedia.
- Un agente seleccionado al que se le quita la selección mientras camina sigue caminando con normalidad.
- Pulsar `1`–`9` o `Tab` durante una pausa (`Space`) cambia la selección y centra la cámara, pero los
  agentes siguen congelados.
- Si la pestaña del navegador queda en segundo plano y vuelve, la simulación no "salta": avanza como
  máximo 250 ms simulados por cuadro (el tiempo restante se descarta), sin teletransportar agentes a
  través de muebles.
- Redimensionar la ventana mientras la cámara sigue a un agente lo mantiene centrado.
- Si el agente seleccionado está fuera de la vista al seleccionarlo, la cámara se desplaza hasta él
  respetando los límites de cámara de la 001.
- Un dato semilla inválido (dos agentes con el mismo id, el mismo escritorio o el mismo color, un
  escritorio inexistente, un color o una apariencia fuera del catálogo, campos vacíos o fuera de
  límites) hace que la carga falle con un mensaje claro que indica el agente y el campo.
- Una transición de estado no permitida (por ejemplo, de `break` a `working` sin caminar) se rechaza
  sin cambiar el estado del agente.
- Una orden o decisión autónoma hacia un destino inalcanzable se descarta y el agente sigue en su estado
  actual.
- El editor abierto (diálogo modal) bloquea todos los atajos de selección, cámara y pausa de la
  oficina.
- Un agente que termina un descanso sigue ocupando su punto de uso (en `idle`) hasta que se marcha;
  otro agente no puede elegir ese punto mientras tanto.

## Requirements *(mandatory)*

### Functional Requirements

**Equipo semilla**

- **FR-001**: El sistema MUST incluir un equipo semilla de exactamente 6 agentes, en este orden:
  Head of Marketing (Estratega), Trend Scout (Investigador), Copywriter (Redactor), Scriptwriter
  (Guionista), Designer (Diseño) y Community Manager (Comunidad).
- **FR-002**: Cada agente MUST tener un identificador estable, un nombre visible, un rol, un color
  propio, una apariencia (tono de piel, peinado, color de pelo y accesorio, de un catálogo predefinido),
  un escritorio asignado (Escritorio 1 a 6, uno distinto por agente) y un system prompt propio.
- **FR-003**: Los 6 agentes semilla MUST tener colores distintos entre sí y combinaciones de apariencia
  distintas entre sí. El color MUST seguir siendo único entre agentes también tras editar; la
  apariencia puede repetirse tras editar.
- **FR-004**: El system prompt de cada agente semilla MUST describir su rol y sus tareas según la
  tabla de PROMPT.md (Estratega: objetivos, pilares, plan semanal, prioridades; Investigador: ideas,
  ángulos y formatos a partir de lo que el usuario le pasa; Redactor: captions, hooks, posts de
  LinkedIn/X, hashtags; Guionista: guiones de Reels/TikTok/Shorts y YouTube con hook, beats y CTA;
  Diseño: briefs de carrusel y thumbnail, prompts de imagen, estructura slide a slide; Comunidad:
  borradores de respuestas a comentarios y DMs que el usuario pega).
- **FR-005**: La regla de cero invenciones (constitución, principio V: no inventar métricas,
  estadísticas, testimonios, citas, tendencias ni datos de terceros, y pedir el dato que falte) MUST
  formar parte del prompt efectivo de todo agente como un único bloque global fijo que el usuario no
  puede borrar ni editar y que no se guarda como dato de cada agente; el prompt efectivo de un agente es
  ese bloque seguido de su system prompt editable, y MUST contener la regla exactamente una vez (tras
  cargar, editar o restaurar). Las pruebas MUST verificarlo para los 6 agentes.
- **FR-006**: Los datos de los agentes MUST validarse al cargarse y rechazarse con un mensaje claro
  (agente y campo) si hay ids, escritorios o colores duplicados, escritorios que no existen en el
  layout, colores o apariencias fuera del catálogo, campos vacíos o fuera de los límites de longitud de
  FR-030. Todos los errores se reportan juntos.

**Estados y transiciones**

- **FR-007**: Cada agente MUST estar en todo momento en exactamente uno de estos estados: `idle`
  (desocupado), `walking` (caminando), `working` (trabajando), `meeting` (en reunión), `break`
  (descanso) o `waiting_review` (esperando revisión). Al cargar, todos están en `idle` en el punto de
  uso de su escritorio.
- **FR-008**: Las transiciones válidas MUST ser exactamente las de esta tabla; cualquier otra MUST
  rechazarse sin cambiar el estado ni la posición del agente e informando del motivo:

  | Desde | Hacia | Condición |
  |---|---|---|
  | `idle` | `walking` | recibe un destino alcanzable distinto de su tile actual |
  | `idle` | `working` / `meeting` / `break` / `waiting_review` | ya está en un punto de uso libre de la actividad (FR-009) |
  | `walking` | `walking` | recibe un nuevo destino alcanzable (cambia de ruta al completar el paso en curso) |
  | `walking` | `idle` | llega a un destino sin actividad o se cancela la marcha |
  | `walking` | `working` / `meeting` / `break` / `waiting_review` | llega al punto de uso de la actividad que motivó la marcha |
  | `working` / `meeting` / `break` / `waiting_review` | `idle` | termina o se cancela la actividad |
  | `working` / `meeting` / `break` / `waiting_review` | `walking` | recibe un destino alcanzable (deja la actividad) |

  Ejemplos de transiciones inválidas: `break` → `working`, `working` → `meeting`, `meeting` →
  `waiting_review` (sin caminar entre medias); `walking` → `working` antes de llegar; cualquier estado
  hacia sí mismo salvo `walking` → `walking`; cualquier paso a `walking` con destino inalcanzable,
  bloqueado o fuera de la cuadrícula.
- **FR-009**: Cada actividad MUST estar ligada a puntos de uso del layout de la 001: `working` al punto
  de uso del escritorio asignado al agente; `meeting` a los 6 puntos de la mesa de reuniones; `break` al
  punto de la cafetera o a los 2 del sofá; `waiting_review` al punto de la pizarra.
- **FR-010**: La lógica de estados, transiciones, elección de destino, movimiento, autonomía y selección
  MUST ser verificable de forma aislada, sin dibujar la escena. Las pruebas MUST cubrir los 36 pares
  origen–destino de FR-008 (6 × 6 estados): cada par válido con su condición cumplida, cada par
  condicionado con su condición incumplida (rechazado) y cada par no listado (rechazado).

**Movimiento**

- **FR-011**: Un agente que camina MUST seguir la ruta más corta en 4 direcciones calculada sobre los
  tiles caminables de la 001, desde su tile actual hasta el destino.
- **FR-012**: El movimiento MUST ser continuo entre tiles, a velocidad constante de 2 tiles por segundo
  de tiempo simulado, y la posición mostrada MUST estar siempre sobre el segmento entre dos tiles
  consecutivos de la ruta. Un cambio de destino o una cancelación MUST aplicarse al completar el paso en
  curso, en el tile siguiente.
- **FR-013**: Mientras camina, el personaje MUST mirar en la dirección del paso actual; al llegar a un
  punto de uso MUST mirar en la dirección definida por ese punto.
- **FR-014**: Un punto de uso MUST poder estar ocupado o reservado por un solo agente a la vez; el
  agente que decide ir a él lo reserva al empezar a caminar, lo mantiene mientras está sobre él (también
  en `idle` al terminar la actividad) y lo libera solo al marcharse a otro destino o al cancelar la
  marcha. El punto de uso de un escritorio solo puede usarlo el agente titular de ese escritorio, y los
  paseos MUST NOT terminar en un punto de uso.
- **FR-015**: La simulación MUST avanzar por pasos fijos de tiempo simulado, independientes de la
  frecuencia de dibujo, y como máximo 250 ms simulados por cuadro (el exceso tras pausas del navegador
  se descarta). Para la misma semilla, el estado en un mismo instante simulado MUST ser idéntico.

**Autonomía**

- **FR-016**: Un agente en `idle` sin orden forzada MUST, tras una pausa aleatoria de entre 3 y 8
  segundos, elegir una actividad autónoma entre: trabajar en su escritorio (`working`), descanso en la
  cafetera o en el sofá (`break`), consultar la pizarra (camina a su punto de uso y queda en `idle`
  mirándola) o pasear hasta un tile caminable libre al azar (termina en `idle`).
- **FR-017**: Las actividades autónomas MUST durar un tiempo aleatorio acotado (trabajar 10–20 s,
  descanso 5–10 s) y terminar en `idle`; al terminar `working` de forma natural el agente MUST
  celebrar durante 1 s (aún en `working`) antes de pasar a `idle`. Una actividad interrumpida por una
  orden MUST NOT celebrar.
- **FR-017a**: Una orden externa (en esta feature, las órdenes de depuración de FR-034; en el futuro,
  tareas y eventos de IA) MUST interrumpir al instante cualquier actividad autónoma en curso, incluida
  la pausa de reposo y la marcha, y la autonomía MUST NOT interrumpir ni sustituir una orden externa.
  Una orden externa nueva sustituye a la anterior. El resultado de interrumpir (aceptado o rechazado
  con motivo) MUST ser explícito para que features posteriores decidan sus prioridades.
- **FR-018**: La autonomía MUST NOT llevar agentes a `meeting` ni a `waiting_review`; esos estados quedan
  para features posteriores y para las órdenes de depuración (FR-034).
- **FR-019**: Todas las decisiones aleatorias de la autonomía (pausas, actividades, destinos,
  duraciones) MUST derivarse de una semilla configurable, de modo que la misma semilla reproduzca
  exactamente la misma simulación (FR-015). Existe una semilla de aceptación fija, documentada, con la
  que cada agente completa al menos un ciclo autónomo en los primeros 60 s simulados.
- **FR-020**: `Space` MUST pausar y reanudar toda la simulación (movimiento, animaciones y
  temporizadores de autonomía); las órdenes recibidas durante la pausa se aplican al reanudar. Se
  ignora con el foco en un control de la interfaz o con el editor abierto (FR-029).

**Dibujo y animación**

- **FR-021**: Los personajes, el anillo de selección y las burbujas MUST dibujarse por código, con un
  estilo propio y sin imágenes externas (constitución, principio VIII).
- **FR-022**: Cada personaje MUST reflejar su color y su apariencia (tono de piel, peinado, color de pelo,
  accesorio) y ser distinguible en los 4 sentidos de orientación.
- **FR-023**: Los personajes MUST ordenarse en profundidad junto con los objetos de la oficina, de modo
  que ningún personaje se dibuje encima de un objeto o personaje que está delante de él, ni detrás de
  uno que está detrás; a igual profundidad entre personajes, se dibuja delante el de número mayor en el
  orden del equipo. El hover y el clic sobre personajes MUST usar la silueta del cuerpo (sin burbuja ni
  anillo) y el mismo orden que el dibujo.
- **FR-024**: Cada personaje MUST mostrar la animación de su situación: reposo (respiración sutil) en
  `idle`, `meeting` y `waiting_review`; caminar en `walking`; teclear en `working`; tomar café en
  `break`; celebrar al terminar una sesión de `working`.
- **FR-025**: Cada personaje MUST llevar sobre la cabeza una burbuja con un icono propio de su estado
  (uno distinto por estado, salvo `idle`, que no muestra burbuja); la burbuja del agente seleccionado
  muestra además el texto del estado en español ("Caminando", "Trabajando", "En reunión", "Descanso",
  "Esperando revisión").

**Selección y cámara**

- **FR-026**: Los usuarios MUST poder seleccionar un agente con un clic sin arrastre sobre el personaje
  o sobre su tarjeta, con `1`–`9` (índice en el orden del equipo; números sin agente no hacen nada), con
  `Tab` (siguiente, cíclico; sin selección elige el primero) y `Shift+Tab` (anterior, cíclico); y quitar
  la selección con `Esc` o con un clic sin arrastre fuera de cualquier personaje. Solo puede haber un
  agente seleccionado a la vez. Con el modo depuración activo, un clic sobre un personaje lo
  selecciona y un clic fuera de los personajes fija el origen/destino de ruta de la 001 sin quitar la
  selección.
- **FR-027**: El agente seleccionado MUST mostrar un anillo de su color bajo los pies, dibujado debajo
  del personaje, y su tarjeta MUST aparecer destacada.
- **FR-028**: Al seleccionar un agente, la cámara MUST centrarse en él con una transición suave (≤ 500
  ms) sin cambiar el zoom y MUST mantenerlo centrado en el canvas mientras se mueve (a 2 px o menos,
  o en la posición más cercana que permitan los límites de cámara de la 001, también tras redimensionar
  la ventana). Cualquier pan, zoom o recentrado manual MUST detener el seguimiento sin quitar la
  selección; volver a seleccionar el agente lo reanuda.
- **FR-029**: Los atajos de selección (`1`–`9`, `Tab`, `Shift+Tab`, `Esc`) y `Space` solo actúan
  cuando el foco no está en un control de la interfaz (campo de texto, botón, selector, enlace); en los
  controles conservan su comportamiento normal (p. ej. `Tab` navega, `Space` pulsa el botón). Con el
  editor abierto (diálogo modal) MUST NOT actuar ningún atajo de la oficina, y `Esc` cierra el editor sin
  quitar la selección. Los atajos de la 001 (flechas, WASD, `+`/`-`, `0`, `G`) MUST seguir funcionando
  igual que en la 001.

**Panel de equipo y editor**

- **FR-030**: El editor MUST permitir cambiar nombre (1–30 caracteres sin contar espacios al inicio y
  al final, único entre agentes sin distinguir mayúsculas), rol (1–40 caracteres; es solo una etiqueta
  visible), color (del catálogo y no usado por otro agente), apariencia (opciones del catálogo) y system
  prompt (1–4000 caracteres), con validación junto a cada campo y sin guardar mientras haya errores. El
  editor MUST abrirse como diálogo modal.
- **FR-031**: El editor MUST mostrar una vista previa del personaje que refleje los cambios al momento,
  y la regla de cero invenciones como texto fijo no editable (FR-005).
- **FR-032**: "Guardar" MUST aplicar los cambios a la vez al personaje y a su tarjeta; "Cancelar" o
  `Esc` MUST cerrar sin aplicar nada; "Restaurar valores originales" MUST rellenar el formulario con los
  datos semilla del agente (se aplican al guardar).
- **FR-032a**: Los cambios guardados MUST durar solo hasta recargar la página: al recargar, todos los
  agentes vuelven a sus datos semilla (sin persistencia en esta feature).
- **FR-033**: El panel de equipo MUST mostrar una tarjeta por agente, en el orden del equipo, con su
  número (1–6), nombre, rol, color y estado actual, y un acceso para abrir el editor del agente.

**Depuración**

- **FR-034**: Con el modo depuración activo, el panel del agente seleccionado MUST ofrecer órdenes para
  enviarlo a trabajar, a reunión, a descanso (café o sofá) y a la pizarra para revisión, y para volver a
  `idle`. Una orden elige el punto de uso libre más cercano (por longitud de ruta) de esa actividad; si
  no hay ninguno, MUST mostrar "Sin sitio libre" sin cambiar nada; "Trabajar" siempre va al escritorio
  del agente. Un agente con una orden forzada MUST quedarse en el estado alcanzado (sin autonomía) hasta
  recibir otra orden o "Volver a idle". Repetir la orden de la actividad en la que ya está MUST NOT
  cambiar nada. Desactivar el modo depuración MUST cancelar todas las órdenes forzadas (los agentes
  quedan en `idle` donde estén, tras completar el paso en curso, y vuelve la autonomía).

**Rendimiento**

- **FR-035**: La escena MUST mantenerse a 60 cuadros por segundo con los 6 agentes caminando a la vez,
  incluso mientras la cámara sigue a uno de ellos. Comprobación automática: durante 10 s con los 6
  agentes caminando y la cámara siguiendo a uno, cada muestra de 1 s MUST ser ≥ 50 fps en el navegador
  de pruebas con GPU (mismo criterio que la 001); comprobación manual: SC-007.

### Key Entities

- **Agente**: miembro del equipo de Marketing. Identificador estable (al que se ligarán las capacidades
  de features futuras), nombre, rol (etiqueta visible), color único, apariencia,
  escritorio asignado, system prompt editable, posición en la oficina, orientación, estado actual,
  actividad en curso (si la hay) y si tiene una orden forzada.
- **Apariencia**: combinación de tono de piel, peinado, color de pelo y accesorio, elegidos de un
  catálogo predefinido de opciones dibujables por código.
- **Estado del agente**: uno de `idle`, `walking`, `working`, `meeting`, `break`, `waiting_review`, con
  sus transiciones válidas (FR-008).
- **Actividad**: lo que un agente va a hacer en un destino (trabajar, reunión, descanso, revisión o
  pasear), ligada a los puntos de uso de un tipo de objeto del layout.
- **Reserva de punto de uso**: relación entre un punto de uso y el agente que lo ocupa o se dirige a
  él; como mucho una por punto.
- **Regla de cero invenciones**: bloque de texto global y fijo que forma parte, exactamente una vez,
  del prompt efectivo de todos los agentes; no es un dato editable de cada agente.
- **Prompt efectivo**: regla de cero invenciones seguida del system prompt editable del agente; es lo
  que consumirá la generación con IA (feature 005).
- **Selección**: el agente seleccionado (o ninguno) y si la cámara lo está siguiendo.
- **Semilla de simulación**: valor que determina todas las decisiones aleatorias de la autonomía.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al abrir la aplicación, los 6 agentes son visibles en sus escritorios en menos de 2
  segundos en un portátil de gama media.
- **SC-002**: Un usuario nuevo asocia cada uno de los 6 personajes con su tarjeta solo por su aspecto
  (sin usar el hover ni seleccionar) en menos de 30 segundos sin ayuda.
- **SC-003**: Los 36 pares origen–destino de FR-008 están cubiertos por pruebas automáticas que pasan,
  según el criterio de FR-010 (válidos con condición cumplida, condicionados con condición incumplida y
  no listados).
- **SC-004**: Seleccionar un agente por cualquiera de los 5 métodos (clic en personaje, clic en
  tarjeta, número, `Tab`, `Shift+Tab`) lo deja centrado en pantalla en menos de 1 segundo.
- **SC-005**: Con la semilla de aceptación, en 60 segundos simulados cada agente completa al menos un
  ciclo autónomo (decidir → actividad → `idle`) y en ningún momento dos agentes ocupan el mismo punto de
  uso ni un agente pisa un tile no caminable.
- **SC-006**: Con la misma semilla, dos ejecuciones de 5 minutos simulados producen estados y
  posiciones idénticos para los 6 agentes en cada instante simulado, aunque se avancen con distintos
  tamaños de cuadro.
- **SC-007**: La escena se mantiene a 60 cuadros por segundo durante 30 segundos con los 6 agentes
  caminando y la cámara siguiendo a uno, en un portátil de gama media.
- **SC-008**: Tras pulsar "Guardar" en el editor, el personaje y su tarjeta muestran los cambios en
  menos de 1 segundo; un usuario completa el cambio de nombre y apariencia de un agente en menos de 1
  minuto.

## Assumptions

- El número de agentes es fijo (6, uno por escritorio); crear o borrar agentes queda fuera de alcance.
  Los atajos `7`–`9` existen para equipos futuros y hoy no hacen nada.
- El catálogo de apariencia es pequeño y fijo (por ejemplo, 4 tonos de piel, 4 peinados, 5 colores de
  pelo, 4 accesorios incluido "ninguno") y una paleta de unos 10 colores de agente distintos de los
  colores de las redes sociales.
- Los nombres visibles de los agentes semilla son sus nombres de rol en inglés (como en PROMPT.md) y el
  rol, en español; los system prompts semilla están en español.
- Los personajes no se esquivan entre sí al caminar (solo se evita compartir punto de uso); es una
  simplificación aceptable para 6 agentes.
- Pasear termina en `idle` sobre el tile de destino; desde ahí el agente vuelve a decidir tras su pausa.
- `meeting` y `waiting_review` solo son alcanzables en esta feature con las órdenes de depuración
  (FR-034); features posteriores decidirán cómo los usan. En particular, qué pasa con una tarea en
  revisión cuando el único punto de la pizarra está ocupado lo decidirá la 004 (estado de tarea y
  posición del personaje son independientes).
- La animación de celebrar se usa en esta feature solo al terminar una sesión de `working`; en la 004 se
  reutilizará al aprobar contenido.
- El panel del agente seleccionado es un panel lateral sencillo (nombre, rol, estado, botón "Editar" y,
  en depuración, las órdenes); el feed de la feature 006 ocupará el mismo lado más adelante.
- El hover de personajes reutiliza la etiqueta de hover de la 001 mostrando el nombre del agente.
- La lógica de estados, movimiento, autonomía y selección vive en la capa de dominio pura del proyecto
  (`packages/domain`, constitución principio VII), como pide PROMPT.md.
- Fuera de alcance: tareas de contenido y asignación (004), generación con IA y llamadas al backend
  (005), feed de updates y notas (006), persistencia, más departamentos.
