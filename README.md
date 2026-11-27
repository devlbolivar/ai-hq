# AI HQ

AI HQ es una oficina isométrica pensada para coordinar agentes de IA que preparan contenido para
Instagram, TikTok, YouTube, LinkedIn y X bajo revisión humana. La primera versión del motor permite
recorrer el Departamento de Marketing, un espacio de 16 × 12 casillas con seis escritorios, una
mesa de reuniones, una zona de café y cinco pantallas. Puedes inspeccionar los muebles y probar
qué rutas conectan las distintas zonas. Los agentes y la generación de contenido están previstos
para etapas posteriores.

## Requisitos

- Node.js 22 o posterior.
- pnpm 12.23.0, la versión fijada en el campo `packageManager` de [package.json](package.json).
- Chromium de Playwright para ejecutar las pruebas de extremo a extremo (e2e).

## Instalación

Desde la raíz del repositorio, instala las dependencias del monorepo e inicia la aplicación web.

```sh
pnpm install
pnpm dev
```

Abre la dirección local que indica Vite en la terminal, normalmente `http://localhost:5173`.
La oficina se puede explorar sin configurar credenciales.

Para ejecutar las pruebas e2e por primera vez, instala el navegador después de las dependencias.

```sh
pnpm --filter @ai-hq/web exec playwright install chromium
pnpm e2e
```

## Scripts

Ejecuta estos comandos desde la raíz.

| Comando              | Efecto                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`           | Inicia el servidor de desarrollo de Vite para la aplicación web.              |
| `pnpm build`         | Comprueba los tipos de la web y genera su compilación de producción con Vite. |
| `pnpm lint`          | Analiza el código del repositorio con ESLint.                                 |
| `pnpm typecheck`     | Comprueba los tipos de TypeScript en cada paquete del monorepo.               |
| `pnpm test`          | Ejecuta una vez las suites de dominio y web con Vitest.                       |
| `pnpm test:coverage` | Ejecuta Vitest con cobertura y comprueba los umbrales configurados.           |
| `pnpm e2e`           | Ejecuta las pruebas de la interfaz web con Playwright.                        |
| `pnpm format`        | Aplica el formato de Prettier a los archivos del repositorio.                 |

## Estructura del monorepo

- `apps/web/` contiene la interfaz React, la escena dibujada con PixiJS, los controles de
  cámara y el estado en Zustand. Incluye pruebas de componentes y de extremo a extremo.
- `apps/server/` reserva el paquete del servidor. Por ahora contiene la configuración de
  TypeScript y un módulo de entrada vacío.
- `packages/domain/` contiene la lógica pura de proyección isométrica, cámara, distribución
  del mobiliario, detección bajo el cursor y búsqueda de rutas.
- `packages/shared/` reserva el paquete compartido. Su módulo de entrada aún está vacío.
- `specs/` reúne la especificación del motor, el plano de la oficina, los contratos, el plan,
  las tareas y los escenarios de validación.
- `.specify/` contiene la constitución del proyecto y las plantillas, scripts y flujos de Spec Kit.

## Controles de la oficina

| Acción                 | Ratón                                               | Teclado                                                                                       |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Desplazar la vista     | Arrastra la escena con el botón principal.          | Mantén pulsadas las flechas o las teclas W, A, S y D.                                         |
| Acercar o alejar       | Gira la rueda para hacer zoom alrededor del cursor. | Pulsa `+` o `=` para acercar y `-` para alejar, con el centro de la pantalla como referencia. |
| Recentrar              | Pulsa **Recentrar**.                                | Pulsa `0`.                                                                                    |
| Alternar la depuración | Pulsa **Modo depuración**.                          | Pulsa `G`.                                                                                    |

El zoom va de 0,5× a 2×. Al recentrar recuperas la posición y la escala iniciales.
Para inspeccionar la oficina, pasa el cursor sobre el suelo o sobre un mueble. En el suelo se
resalta una casilla. En un mueble se resalta el objeto entero y aparece su nombre.

### Probar una ruta

1. Activa el modo de depuración. Verás las casillas transitables, la entrada y las flechas que
   indican desde dónde y en qué dirección se utiliza cada mueble.
2. Haz clic en la entrada y luego en la silla del Escritorio 4. La oficina dibuja la ruta más
   corta y muestra el número de pasos.
3. El siguiente clic elige un nuevo origen. Prueba un escritorio como destino para ver el
   mensaje «Sin ruta». Al salir del modo de depuración se borra la selección.

La [guía de validación](specs/001-office-engine/quickstart.md) recoge los escenarios de cámara,
inspección y rutas para comprobarlos en el navegador.

## Desarrollo con agentes

Antes de tomar una tarea, lee las [reglas de trabajo](AGENTS.md) y la
[constitución del proyecto](.specify/memory/constitution.md). Cada funcionalidad tiene su
especificación, plan y lista de tareas en [specs/](specs/).

El flujo de Spec Kit comienza con `/speckit-specify` y `/speckit-clarify`. Tras la aprobación
del usuario, se prepara el plan con `/speckit-plan` y se desglosa en tareas con `/speckit-tasks`.
Una segunda aprobación da paso a `/speckit-analyze` y `/speckit-implement`.

Desarrolla una tarea a la vez con TDD. Empieza por una prueba que falle, implementa lo mínimo para
que pase y refactoriza con las pruebas en verde. Antes de cerrar una funcionalidad, ejecuta:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

## Secretos

Guarda las claves de API y demás credenciales en `apps/server/.env`. Git ignora ese archivo.
Nunca incluyas secretos en un commit ni en el código que se envía al navegador.
