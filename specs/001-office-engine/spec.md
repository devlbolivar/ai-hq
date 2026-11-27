# Feature Specification: Oficina isométrica (motor base de AI HQ)

**Feature Branch**: `001-office-engine`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "001-office-engine — Oficina isométrica (motor base de AI HQ). Esta feature
es SOLO el motor y la escena de la oficina (sin agentes, tareas ni IA). Grid 16x12, tile 64x32 (2:1),
conversión grid↔pantalla reversible; layout de la zona de Marketing definido como datos (6 escritorios,
sala de reuniones, pizarra de contenido, área de café, pared de pantallas por red social); depth sorting;
cámara con pan, zoom 0.5x–2x centrado en cursor y recentrar; hover; tiles caminables y A* en 4
direcciones; gráficos por código, tema oscuro; 60 fps. Fuera de alcance: personajes, selección, tareas,
feed, backend, persistencia."

## Clarifications

### Session 2026-11-27

- Q: ¿Qué muros de la oficina se dibujan completos, solo los del fondo o los cuatro? → A: Solo los 2
  muros del fondo a altura completa; el frente queda abierto, marcado solo por el borde del suelo.
- Q: ¿El layout debe marcar, para cada mueble que se usa, en qué tile se coloca una persona para
  usarlo? → A: Sí: escritorios, mesa de reuniones, cafetera, sofá y pizarra definen puntos de uso (tile
  y dirección); la validación exige que sean caminables y alcanzables desde un tile de entrada.
- Q: ¿Te propongo yo la distribución concreta de las zonas en la cuadrícula para que la apruebes, o
  la defines tú? → A: Claude propone un mapa de 16x12 para aprobación (ver FR-005b). Mapa aprobado.
- Q: ¿La cámara también debe poder manejarse con el teclado, además del ratón? → A: Sí: flechas/WASD
  para desplazar, `+`/`-` para zoom, `0` para recentrar y `G` para el modo depuración.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la oficina de Marketing (Priority: P1)

Como dueño de AI HQ, al abrir la aplicación veo la oficina del Departamento de Marketing en vista
isométrica: suelo, muros, 6 escritorios con silla y monitor, sala de reuniones, pizarra de contenido,
área de café con cafetera y sofá, plantas y una pared con una pantalla por cada red social (Instagram,
TikTok, YouTube, LinkedIn y X), cada una reconocible por su color e icono propios. Todo se ve ordenado
en profundidad: lo que está más cerca de mí tapa a lo que está detrás, nunca al revés.

**Why this priority**: es la base visual sobre la que viven todas las features posteriores (agentes,
tareas, feed). Sin la oficina no hay producto que mostrar.

**Independent Test**: abrir la aplicación y verificar que aparecen todas las zonas y objetos del layout
de Marketing, correctamente superpuestos, sin necesidad de ninguna otra feature.

**Acceptance Scenarios**:

1. **Given** la aplicación recién abierta, **When** carga la escena, **Then** se muestra la oficina
   completa de 16x12 tiles centrada en la ventana, con tema oscuro.
2. **Given** la escena cargada, **When** cuento los escritorios, **Then** hay exactamente 6, cada uno
   con su silla y su monitor.
3. **Given** la escena cargada, **When** miro la pared de pantallas, **Then** hay 5 pantallas, una por
   red social, cada una con un color e icono distinto y sin logos oficiales.
4. **Given** un mueble colocado delante de otro (más cerca del observador), **When** se dibuja la
   escena, **Then** el mueble delantero tapa al trasero en la zona donde se solapan.
5. **Given** un objeto alto (planta, monitor) junto a un muro, **When** se dibuja la escena, **Then** el
   orden de dibujo respeta su posición y su altura (ningún objeto "flota" encima de otro que está
   delante).

---

### User Story 2 - Navegar la oficina con la cámara (Priority: P2)

Como dueño de AI HQ, puedo moverme por la oficina arrastrando con el ratón, acercarme o alejarme con la
rueda (el zoom se centra en el punto bajo el cursor) y volver a la vista inicial con un botón de
recentrar.

**Why this priority**: con una oficina más grande que la pantalla o al querer ver detalles de un
escritorio, la navegación es imprescindible; pero la oficina ya aporta valor sin ella.

**Independent Test**: con la escena cargada, arrastrar, hacer zoom en ambos sentidos hasta los límites y
pulsar recentrar, verificando la posición y escala resultantes.

**Acceptance Scenarios**:

1. **Given** la escena en vista inicial, **When** arrastro con el botón principal del ratón, **Then** la
   oficina se desplaza siguiendo el puntero.
2. **Given** el cursor sobre un escritorio, **When** hago zoom in con la rueda, **Then** la escena se
   amplía y el escritorio permanece bajo el cursor.
3. **Given** el zoom en 2x, **When** sigo haciendo zoom in, **Then** el zoom se mantiene en 2x.
4. **Given** el zoom en 0.5x, **When** sigo haciendo zoom out, **Then** el zoom se mantiene en 0.5x.
5. **Given** la cámara desplazada y con zoom, **When** pulso "Recentrar", **Then** la escena vuelve a la
   posición y escala iniciales.
6. **Given** que arrastro la oficina hacia un borde, **When** sigo arrastrando, **Then** la oficina
   nunca sale por completo de la ventana (queda visible al menos una parte).
7. **Given** la escena cargada y sin el ratón, **When** uso flechas/WASD, `+`/`-` y `0`, **Then** la
   vista se desplaza, hace zoom centrado en la pantalla (con los mismos límites 0.5x–2x) y se recentra,
   respectivamente.

---

### User Story 3 - Inspeccionar con el cursor (Priority: P3)

Como dueño de AI HQ, al pasar el cursor por la oficina se resalta el tile o el objeto que está debajo, y
veo su nombre (por ejemplo "Escritorio 3", "Pantalla TikTok", "Cafetera").

**Why this priority**: da sensación de interactividad y será la base de la selección de agentes y
objetos en features posteriores, pero no es imprescindible para ver la oficina.

**Independent Test**: mover el cursor sobre suelo vacío, sobre un mueble y fuera de la oficina, y
comprobar el resaltado y la etiqueta en cada caso.

**Acceptance Scenarios**:

1. **Given** el cursor sobre un tile de suelo vacío, **When** lo muevo, **Then** se resalta ese tile y
   solo ese.
2. **Given** el cursor sobre un mueble que ocupa varios tiles, **When** se detiene encima, **Then** se
   resalta el mueble completo y se muestra su nombre.
3. **Given** el cursor sobre un objeto alto que tapa visualmente un tile de detrás, **When** se detiene
   encima, **Then** se resalta el objeto visible (el de delante), no el tile oculto.
4. **Given** el cursor fuera de la oficina, **When** lo muevo, **Then** no hay ningún resaltado.

---

### User Story 4 - Rutas caminables por la oficina (Priority: P4)

Como base para los agentes de las features posteriores, la oficina sabe qué tiles se pueden pisar y
calcula la ruta más corta entre dos tiles moviéndose en 4 direcciones (sin diagonales), rodeando muros y
muebles. Como dueño puedo activar un modo de depuración que muestra los tiles caminables y, tras elegir
un origen y un destino con clic, dibuja la ruta.

**Why this priority**: no tiene valor visible para el usuario final hasta que existan los agentes
(feature 002), pero es una dependencia directa de ella y puede verificarse ahora con el modo depuración.

**Independent Test**: activar el modo depuración, elegir pares de tiles (libres, separados por un muro,
bloqueados, inalcanzables) y comprobar la ruta dibujada o el aviso de "sin ruta".

**Acceptance Scenarios**:

1. **Given** dos tiles caminables con camino directo, **When** pido la ruta, **Then** obtengo la ruta
   más corta, con pasos solo entre tiles vecinos (arriba, abajo, izquierda, derecha).
2. **Given** un muro entre A y B, **When** pido la ruta, **Then** la ruta rodea el muro y su longitud es
   la mínima posible.
3. **Given** un destino ocupado por un mueble o un muro, **When** pido la ruta, **Then** obtengo "sin
   ruta".
4. **Given** un destino caminable pero encerrado (sin conexión con el origen), **When** pido la ruta,
   **Then** obtengo "sin ruta".
5. **Given** origen igual a destino, **When** pido la ruta, **Then** obtengo una ruta de un solo tile
   (sin movimiento).
6. **Given** el modo depuración activo, **When** lo desactivo, **Then** desaparecen la cuadrícula de
   caminables y la ruta dibujada.

---

### Edge Cases

- Un clic o arrastre que empieza dentro de un botón de la interfaz (p. ej. "Recentrar") no debe mover la
  cámara.
- Un arrastre muy corto (menos de unos pocos píxeles) no debe contar como desplazamiento.
- Redimensionar la ventana mantiene la escena visible y el resaltado sigue funcionando en la nueva
  posición.
- El cursor justo en el borde entre dos tiles resalta exactamente uno (regla determinista).
- Posiciones de pantalla fuera de la oficina se identifican como "fuera de la cuadrícula", nunca como un
  tile inexistente.
- Si hay varias rutas de igual longitud mínima, el resultado es siempre el mismo para el mismo par
  origen-destino (determinista).
- Un layout con un objeto fuera de la cuadrícula o dos objetos que bloquean el mismo tile se rechaza al
  cargar con un error claro, en lugar de dibujarse mal.
- Un punto de uso colocado sobre un tile bloqueado, o encerrado sin conexión con el tile de entrada,
  hace que el layout se rechace al cargar indicando qué objeto y qué punto fallan.
- La escena se sigue viendo correctamente con zoom mínimo y máximo (sin huecos entre tiles ni bordes
  cortados).

## Requirements *(mandatory)*

### Functional Requirements

**Cuadrícula y proyección**

- **FR-001**: La oficina MUST representarse como una cuadrícula de 16 columnas por 12 filas en
  proyección isométrica con proporción 2:1 (cada tile mide 64 de ancho por 32 de alto a zoom 1x).
- **FR-002**: El sistema MUST convertir cualquier posición de tile en su posición en pantalla y cualquier
  posición de pantalla en el tile correspondiente, de forma que convertir un tile a pantalla y de vuelta
  devuelva el mismo tile para todos los tiles de la cuadrícula.
- **FR-003**: La conversión de pantalla a tile MUST tener en cuenta el desplazamiento y el zoom actuales
  de la cámara, e indicar "fuera de la cuadrícula" cuando la posición no corresponda a ningún tile.

**Layout de la oficina**

- **FR-004**: El layout de la oficina (zonas, muros, objetos, posiciones, tamaño en tiles, altura y si
  bloquean el paso) MUST definirse como datos separados del dibujo, de modo que añadir o mover un objeto
  o una zona no requiera cambiar la lógica de dibujo.
- **FR-005**: El layout de Marketing MUST incluir: 6 escritorios (cada uno con silla y monitor), una
  sala de reuniones con mesa, una pizarra de contenido, un área de café con cafetera y sofá, plantas
  decorativas, muros y una pared con 5 pantallas, una por red social (Instagram, TikTok, YouTube,
  LinkedIn y X).
- **FR-005a**: Solo los 2 muros del fondo (arriba-izquierda y arriba-derecha) MUST dibujarse a altura
  completa; el frente de la oficina MUST quedar abierto, delimitado solo por el borde del suelo, de modo
  que ningún muro tape objetos del interior. Las pantallas de redes sociales y la pizarra MUST colgarse
  de los muros del fondo.
- **FR-005b**: La distribución inicial de Marketing MUST ser la del mapa siguiente (columna `x` 0–15 de
  izquierda a derecha, fila `y` 0–11 de arriba abajo; el tile (0,0) es la esquina del fondo de la vista
  isométrica, la fila `y=0` forma el muro del fondo derecho y la columna `x=0` el muro del fondo
  izquierdo). Direcciones: N = hacia `y` menor, S = hacia `y` mayor, E = hacia `x` mayor, O = hacia `x`
  menor.

  ```text
         x: 0 1 2 3 4 5 6 7 8 9 A B C D E F
     y= 0:  W W W I T Y L X W W W W W W W W
     y= 1:  W p . . . . . . . . p . . . . .
     y= 2:  W . . . . . . . . . . m M M m .
     y= 3:  P b . . . . . . . . . m M M m .
     y= 4:  P . . . . . . . . . . . m m . .
     y= 5:  W . . D . D . D . . . . . . . .
     y= 6:  W . . c . c . c . . . . . . . .
     y= 7:  W . . . . . . . . . . . . k K .
     y= 8:  W . . D . D . D . . . . . . . .
     y= 9:  W . . c . c . c . . . . . . . .
     y=10:  W p . . . . . . . . . . F F . .
     y=11:  W . . . . . . . E . . . . . . .
  ```

  Leyenda (A–F = columnas 10–15):
  - `W` muro (bloquea). `I` `T` `Y` `L` `X` pantallas de Instagram, TikTok, YouTube, LinkedIn y X,
    colgadas del muro del fondo derecho (bloquean, forman parte del muro).
  - `P` pizarra de contenido (2 tiles, colgada del muro izquierdo); `b` su punto de uso, mirando a O.
  - `D` escritorio con monitor (bloquea); numerados Escritorio 1–3 en la fila 5 y 4–6 en la fila 8, de
    izquierda a derecha. `c` silla del escritorio de arriba (caminable), su punto de uso, mirando a N.
  - `M` mesa de reuniones 2x2 (bloquea). `m` sus 6 puntos de uso: (11,2) y (11,3) mirando a E, (14,2) y
    (14,3) mirando a O, (12,4) y (13,4) mirando a N.
  - `K` cafetera (bloquea); `k` su punto de uso en (13,7), mirando a E.
  - `F` sofá de 2 tiles (caminable, como las sillas); sus 2 puntos de uso están sobre sus propios tiles,
    mirando a N.
  - `p` planta (bloquea). `E` tile de entrada (caminable), en el borde frontal abierto. `.` suelo.
- **FR-006**: Cada escritorio MUST tener un identificador estable (Escritorio 1 a 6) para que la feature
  de agentes pueda asignarlos.
- **FR-007**: Cada pantalla de red social MUST distinguirse por un color y un icono propios; MUST NOT
  usarse logos ni marcas oficiales.
- **FR-008**: El sistema MUST validar el layout al cargarlo y rechazar con un mensaje claro los objetos
  fuera de la cuadrícula o los solapamientos de objetos que bloquean el paso.
- **FR-009**: El layout MUST pertenecer a una zona/departamento identificable ("Marketing"), de forma que
  en el futuro puedan existir otros departamentos sin rediseñar el formato.
- **FR-009a**: El layout MUST definir un tile de entrada caminable y, para cada escritorio, la mesa de
  reuniones, la cafetera, el sofá y la pizarra, uno o más puntos de uso (tile donde se coloca la persona
  y dirección hacia la que mira). Cada escritorio MUST tener exactamente un punto de uso, en el tile de
  su silla.
- **FR-009b**: La validación del layout (FR-008) MUST rechazar con un mensaje claro cualquier punto de
  uso que no sea caminable o al que no se pueda llegar por una ruta desde el tile de entrada.

**Dibujo**

- **FR-010**: Todos los elementos visuales MUST dibujarse por código con un estilo propio, sin imágenes
  externas ni arte de terceros.
- **FR-011**: La escena MUST usar un tema oscuro.
- **FR-012**: Los objetos MUST dibujarse ordenados por profundidad (posición en la cuadrícula y altura),
  de modo que ningún objeto se dibuje encima de otro que está delante de él.

**Cámara**

- **FR-013**: Los usuarios MUST poder desplazar la vista arrastrando con el botón principal del ratón.
- **FR-014**: Los usuarios MUST poder hacer zoom con la rueda del ratón entre 0.5x y 2x, con el punto
  bajo el cursor fijo durante el zoom; los valores fuera de ese rango MUST limitarse al extremo más
  cercano.
- **FR-015**: Los usuarios MUST disponer de un control "Recentrar" que restaure la posición y el zoom
  iniciales (oficina centrada a 1x).
- **FR-016**: La cámara MUST impedir que la oficina salga por completo de la ventana.
- **FR-016a**: La cámara MUST poder manejarse también con el teclado: flechas o WASD para desplazar,
  `+`/`-` para zoom centrado en el centro de la pantalla (mismos límites que FR-014), `0` para
  recentrar y `G` para activar/desactivar el modo depuración (FR-023). Estos atajos MUST ignorarse
  mientras el foco esté en un campo de texto.

**Hover**

- **FR-017**: El sistema MUST resaltar el tile bajo el cursor cuando el cursor está sobre suelo libre.
- **FR-018**: Cuando el cursor está sobre un objeto, el sistema MUST resaltar el objeto completo (todos
  sus tiles) y mostrar su nombre; si varios objetos coinciden visualmente, MUST elegirse el que se
  dibuja delante.
- **FR-019**: Fuera de la oficina MUST NOT haber resaltado.

**Caminabilidad y rutas**

- **FR-020**: El sistema MUST derivar del layout qué tiles son caminables (los ocupados por muros u
  objetos que bloquean el paso no lo son).
- **FR-021**: El sistema MUST calcular la ruta más corta entre dos tiles moviéndose solo en 4
  direcciones, o devolver "sin ruta" si el destino está bloqueado, es inalcanzable o está fuera de la
  cuadrícula.
- **FR-022**: Para el mismo layout y el mismo par origen-destino, la ruta devuelta MUST ser siempre la
  misma.
- **FR-023**: Los usuarios MUST poder activar y desactivar un modo depuración que muestre los tiles
  caminables, el tile de entrada y los puntos de uso (con su dirección), y permita elegir origen y
  destino con clic para ver la ruta calculada o el aviso "sin ruta".

**Rendimiento**

- **FR-024**: La escena completa MUST mantenerse fluida (60 cuadros por segundo) durante el
  desplazamiento, el zoom y el hover.

### Key Entities

- **Tile**: una celda de la cuadrícula, identificada por columna y fila; puede ser caminable o estar
  bloqueada.
- **Departamento / zona de oficina**: conjunto con nombre (p. ej. "Marketing") que agrupa su
  cuadrícula, sus zonas y sus objetos; unidad que permitirá añadir más departamentos.
- **Zona**: área con nombre dentro del departamento (escritorios, sala de reuniones, área de café, pared
  de pantallas, pizarra).
- **Objeto de oficina**: mueble o elemento (escritorio, silla, monitor, planta, sofá, mesa de reuniones,
  cafetera, pizarra, pantalla de red social, muro) con identificador, nombre visible, tipo, posición,
  tamaño en tiles, altura, si bloquea el paso y sus puntos de uso (si los tiene). Las pantallas llevan
  además la red social que representan.
- **Punto de uso**: tile caminable asociado a un objeto donde se coloca una persona para usarlo, con la
  dirección hacia la que mira (una de las 4 direcciones de la cuadrícula).
- **Tile de entrada**: tile caminable por el que se entra a la oficina; origen de referencia para
  comprobar que todos los puntos de uso son alcanzables.
- **Cámara**: desplazamiento y nivel de zoom actuales de la vista.
- **Ruta**: secuencia ordenada de tiles vecinos desde un origen hasta un destino, o el resultado "sin
  ruta".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al abrir la aplicación, la oficina completa es visible en menos de 2 segundos en un
  portátil de gama media.
- **SC-002**: El 100 % de los tiles de la cuadrícula vuelve a sí mismo al convertirse a posición de
  pantalla y de vuelta, en todos los niveles de zoom permitidos.
- **SC-003**: La escena se mantiene a 60 cuadros por segundo (sin caídas perceptibles) durante 30
  segundos continuos de desplazamiento, zoom y hover en un portátil de gama media.
- **SC-004**: En el 100 % de los casos de prueba de rutas (camino libre, rodeo de muro, destino
  bloqueado, destino inalcanzable, origen igual a destino), el resultado coincide con la ruta mínima
  esperada o con "sin ruta".
- **SC-005**: Un usuario nuevo identifica las 6 mesas, la sala de reuniones, el área de café y las 5
  pantallas de redes sociales en menos de 30 segundos sin ayuda.
- **SC-006**: Añadir un objeto nuevo al layout (p. ej. una planta más) solo requiere editar los datos
  del layout, sin tocar la lógica de dibujo, y aparece correctamente ordenado en profundidad.
- **SC-007**: En revisión visual a zoom 0.5x, 1x y 2x, no hay objetos superpuestos en el orden
  incorrecto ni huecos entre tiles.

## Assumptions

- La aplicación se usa en un navegador de escritorio con ratón y una ventana de al menos 1024 px de
  ancho; el soporte táctil y móvil queda fuera de esta feature.
- Cada paso de la rueda del ratón cambia el zoom en un incremento fijo y suave (alrededor de un 10 %).
- Los muebles pueden ocupar más de un tile (p. ej. mesa de reuniones, sofá); su "tamaño en tiles" forma
  parte de los datos del layout.
- Los monitores y sillas son objetos asociados a su escritorio; la silla no bloquea el paso para que en
  el futuro un agente pueda "sentarse".
- El nombre que muestra el hover es un texto corto en español definido en el layout.
- El modo depuración se activa con un control visible en la interfaz o con la tecla `G`; no está
  pensado para el usuario final pero no requiere configuración especial.
- No hay persistencia: la posición de la cámara vuelve a la inicial al recargar.
- Los colores de cada red social se eligen como tonos propios inspirados en cada plataforma, sin
  reproducir su identidad de marca.
- Fuera de alcance: personajes, selección, tareas, feed de updates, backend y persistencia (features
  002–008).
