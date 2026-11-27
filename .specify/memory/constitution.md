# AI HQ Constitution

AI HQ es una oficina isométrica donde trabajan agentes de IA seleccionables. La v1 contiene solo el
Departamento de Marketing, que gestiona Instagram, TikTok, YouTube, LinkedIn y X generando contenido
real con la API de Claude a través de un backend propio.

## Core Principles

### I. Spec primero

- La spec de cada feature (`specs/<NNN-feature>/spec.md`) es la fuente de verdad del comportamiento.
- Ningún código de producción se escribe sin una spec aprobada por el usuario.
- Si el código y la spec divergen, se DEBE corregir uno de los dos antes de cerrar la feature: o se
  actualiza la spec (y el usuario la aprueba) o se corrige el código para cumplirla.
- Todo requisito de una spec DEBE ser verificable (criterios Given/When/Then o equivalentes).

*Razón*: la spec permite revisar intención antes de invertir en código y evita que el sistema derive
de lo que el usuario realmente quiere.

### II. Test primero (TDD) (NO NEGOCIABLE)

- Cada tarea de `tasks.md` DEBE seguir el ciclo RED → GREEN → REFACTOR:
  1. **RED**: escribir un test que falle por la razón esperada.
  2. **GREEN**: escribir el mínimo código que lo haga pasar.
  3. **REFACTOR**: mejorar el diseño con todos los tests en verde.
- Commits separados por fase con prefijos `test:` → `feat:` (o `fix:`) → `refactor:`.
- Cobertura mínima: 80 % de líneas en `packages/*` y `apps/server`; 95 % en `packages/domain`.
- Ningún test se desactiva, salta (`.skip`) ni se borra para hacer pasar la suite sin aprobación
  explícita del usuario.

*Razón*: los tests escritos primero son la forma ejecutable de la spec y la red de seguridad para
refactorizar un sistema con estado, animación e IA.

### III. Humano en el bucle

- Ningún contenido generado sale de la app (publicación, programación, envío, exportación pública)
  sin aprobación explícita del usuario en la UI.
- Los estados `approved`, `scheduled` y `published` solo se alcanzan por acción del usuario, nunca
  automáticamente.
- Toda integración futura que publique en redes DEBE pasar por el mismo paso de aprobación.

*Razón*: el contenido representa la marca del usuario en público; un error de IA publicado tiene
costo reputacional que no se deshace.

### IV. Secretos en el servidor

- La API key de Claude y cualquier otro secreto viven solo en `apps/server` (variables de entorno,
  nunca en el repositorio).
- El cliente web NUNCA recibe, almacena ni empaqueta secretos; todas las llamadas al LLM pasan por el
  backend.
- DEBE existir un test automatizado que verifique que el bundle del cliente no contiene secretos.

*Razón*: una key expuesta en el navegador puede ser extraída y usada por terceros con costo para el
usuario.

### V. Cero invenciones

- Los agentes NO DEBEN inventar métricas, estadísticas, testimonios, citas, tendencias ni datos de
  terceros.
- Si un agente necesita un dato que no tiene, DEBE pedirlo explícitamente (estado bloqueado o pregunta
  en el feed) en lugar de suponerlo.
- Los system prompts de cada rol DEBEN incluir esta regla, y los tests de armado de prompt DEBEN
  verificar su presencia.

*Razón*: contenido con datos falsos daña la credibilidad de la marca y puede tener implicaciones
legales.

### VI. IA detrás de una interfaz

- Todo acceso a un LLM pasa por la interfaz `LLMProvider`; ningún módulo importa el SDK de Anthropic
  fuera de su implementación `ClaudeProvider`.
- Los tests usan `FakeLLMProvider`, determinista y configurable por escenario.
- Ningún test de las suites normales (`test`, `e2e`) llama a la API real. Solo la suite `test:live`,
  opcional y de ejecución manual, puede hacerlo.
- Toda salida del LLM se valida con un esquema Zod antes de persistirse o mostrarse.

*Razón*: aísla costo, latencia y no determinismo, y permite cambiar de modelo o proveedor sin tocar
la lógica de dominio.

### VII. Simplicidad

- No se añade ninguna dependencia nueva sin justificarla en el `plan.md` de la feature (problema que
  resuelve, alternativa sin dependencia descartada).
- YAGNI: no se implementa funcionalidad fuera del alcance de la spec activa; los puntos de extensión
  se dejan como interfaces, no como implementaciones especulativas.
- La lógica de dominio vive en `packages/domain` como código puro sin I/O.

*Razón*: menos dependencias y menos código especulativo significan menos superficie de fallo y
mantenimiento.

### VIII. Gráficos originales

- Todos los gráficos (suelo, muebles, personajes, iconos) se dibujan por código (PixiJS Graphics) con
  un estilo propio.
- No se copian ni imitan arte, personajes, nombres ni estética de juegos existentes.
- No se usan logos oficiales de las redes sociales; cada red se identifica con colores e iconos
  propios.

*Razón*: evita problemas de propiedad intelectual y mantiene el proyecto libre de assets externos.

## Restricciones técnicas

- **Monorepo pnpm**: `apps/web`, `apps/server`, `packages/domain`, `packages/shared`.
- **Lenguaje**: TypeScript en modo `strict` en todos los paquetes; sin `any` implícito.
- **Web**: Vite + React 18 + PixiJS v8 (canvas isométrico) + Zustand + Tailwind CSS + TanStack Query.
- **Server**: Node 22 LTS o superior + Hono + Drizzle ORM + SQLite + `@anthropic-ai/sdk`.
- **Contratos**: esquemas Zod en `packages/shared`, compartidos por web y server; ningún endpoint sin
  esquema de entrada y salida.
- **Tests**: Vitest (unit e integración), Testing Library (componentes), MSW (mock de API en web),
  Playwright (e2e).
- **Modelos**: `claude-sonnet-5-5` por defecto para generación de contenido; `claude-haiku-5-5` para
  tareas baratas (resúmenes, clasificación, updates).
- **Alcance v1**: solo Departamento de Marketing; publicación manual (copiar/exportar). La
  arquitectura DEBE permitir añadir departamentos sin reescribir el motor ni el dominio.

## Flujo de desarrollo y quality gates

- Cada feature sigue el flujo Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
- Puntos de aprobación obligatorios del usuario: después de `/speckit-clarify` y después de
  `/speckit-tasks`.
- Cada tarea de `tasks.md` DEBE indicar: test(s) a escribir primero, archivos afectados y criterio de
  hecho.
- Las features se implementan en orden; no se empieza la siguiente con tests en rojo en la anterior.
- **Quality gate** para cerrar una feature: `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`
  en verde y cobertura según el principio II.
- Al cerrar cada feature se reporta: lo hecho, tests añadidos, desviaciones de la spec y siguiente
  paso.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica, plantilla o instrucción del proyecto.
- **Enmiendas**: se proponen con `/speckit-constitution`, incluyen razón e impacto, y requieren
  aprobación explícita del usuario. Se registran en el Sync Impact Report y en el historial de git
  con un commit `docs: amend constitution to vX.Y.Z`.
- **Versionado semántico**:
  - MAJOR: eliminación o redefinición incompatible de un principio.
  - MINOR: nuevo principio o sección, o ampliación material de una regla.
  - PATCH: aclaraciones y redacción sin cambio semántico.
- **Cumplimiento**: el "Constitution Check" de cada `plan.md` y el análisis de `/speckit-analyze`
  DEBEN verificar estos principios. Cualquier violación se documenta como excepción justificada en
  el plan (tabla de complejidad) o se corrige antes de implementar.
- La guía operativa del proyecto (visión, features y alcance) está en `PROMPT.md`.

**Version**: 1.0.1 | **Ratified**: 2026-11-27 | **Last Amended**: 2026-11-27
