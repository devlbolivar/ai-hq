# AI HQ — Departamento de Marketing (v1)

Eres el ingeniero principal de este proyecto. Lo construiremos con **Spec Driven Development
(GitHub Spec Kit)** y **Test Driven Development**. Ninguna línea de código de producción se escribe
sin una spec aprobada y un test que falle primero.

## Visión
AI HQ es una oficina isométrica donde trabajan mis agentes de IA. La v1 contiene SOLO el
**Departamento de Marketing**, que gestiona mis redes sociales: **Instagram, TikTok, YouTube,
LinkedIn y X**. Cada agente es un personaje seleccionable con un rol; le asigno tareas de contenido,
lo veo caminar a su escritorio y trabajar, y genera contenido REAL con la API de Claude. Todo lo que
pasa aparece en un feed de updates. Yo apruebo cada pieza antes de publicarla (publicación manual).
La arquitectura debe permitir añadir más departamentos (Ventas, Ingeniería…) después.

## Paso 0 — Inicializar Spec Kit
```bash
# Ya ejecutado. En Mac Intel hace falta UV_NO_BUILD_PACKAGE=cryptography
UV_NO_BUILD_PACKAGE=cryptography uvx --from git+https://github.com/github/spec-kit.git \
  specify init --here --force --non-interactive --integration claude --ignore-agent-tools
```
Luego sigue el flujo para cada feature, en orden y sin saltarte pasos:
`/speckit-constitution` (una vez) → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`
→ `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`.
Detente después de `/speckit-clarify` y de `/speckit-tasks` de cada feature para que yo apruebe.

## Paso 1 — Constitución (`/speckit-constitution`)
Principios no negociables:
1. **Spec primero**: la spec es la fuente de verdad. Si el código y la spec divergen, se corrige la spec
   primero (y se aprueba) o se corrige el código.
2. **Test primero (TDD)**: cada tarea de `tasks.md` empieza con un test que falla (RED), luego el mínimo
   código para pasarlo (GREEN), luego REFACTOR. Commits separados `test:` → `feat:` → `refactor:`.
   Cobertura mínima 80 % en `packages/` y `apps/server`; la lógica de dominio al 95 %.
3. **Humano en el bucle**: ningún contenido sale de la app sin aprobación explícita mía.
4. **Secretos en el servidor**: la API key de Claude nunca llega al navegador.
5. **Cero invenciones**: los agentes no inventan métricas, testimonios ni datos; si no tienen el dato, lo piden.
6. **IA detrás de una interfaz**: todo acceso al LLM pasa por `LLMProvider`; los tests usan `FakeLLMProvider`
   determinista. Ningún test llama a la API real (salvo una suite `test:live` opcional y manual).
7. **Simplicidad**: sin dependencias nuevas sin justificarlo en `plan.md`.
8. **Gráficos originales**: todo se dibuja por código; nada copiado de juegos existentes.

## Stack (fíjalo en `/speckit-plan`)
- Monorepo pnpm: `apps/web`, `apps/server`, `packages/domain`, `packages/shared`
- **web**: Vite + React 18 + TypeScript strict + PixiJS v8 (canvas iso) + Zustand + Tailwind + TanStack Query
- **server**: Node 22 LTS o superior + Hono + Drizzle ORM + SQLite + SDK `@anthropic-ai/sdk`
- **shared**: esquemas Zod (contratos API compartidos web/server)
- **domain**: lógica pura sin I/O (máquinas de estado, iso math, A*, reglas de plataforma)
- **Tests**: Vitest (unit/integración), Testing Library (componentes), MSW (mock de API en web),
  Playwright (e2e), `FakeLLMProvider` para la IA
- **Modelos**: `claude-sonnet-5-5` por defecto para generación; `claude-haiku-5-5` para tareas baratas
  (resúmenes, clasificación, updates). Salidas estructuradas validadas con Zod.

## Paso 2 — Features (una spec por feature, en este orden)

### 001-office-engine — Oficina isométrica
- Grid 16x12, tile 64x32 (2:1). `gridToScreen` / `screenToGrid` puras y testeadas.
- Zona de Marketing: escritorios por agente, sala de reuniones, pizarra de contenido, área de café,
  pared con "pantallas" de cada red social.
- Depth sorting por (x+y, z). Cámara: pan, zoom 0.5x–2x, recentrar. Hover resaltado.
- A* sobre tiles caminables.
- *Criterios ejemplo*: Given un tile (3,2), When convierto a pantalla y de vuelta, Then obtengo (3,2).
  Given un muro entre A y B, When pido ruta, Then la ruta lo rodea y es la más corta.

### 002-marketing-team — Agentes seleccionables
Equipo semilla (6 agentes, cada uno con color, apariencia y system prompt propios):
| Agente | Rol | Hace |
|---|---|---|
| Head of Marketing | Estratega | Objetivos, pilares de contenido, plan semanal, prioriza tareas |
| Trend Scout | Investigador | Ideas, ángulos y formatos en tendencia por red (desde lo que yo le paso; no inventa datos) |
| Copywriter | Redactor | Captions, hooks, posts de LinkedIn/X, hashtags |
| Scriptwriter | Guionista | Guiones de Reels/TikTok/Shorts y videos de YouTube (hook, beats, CTA) |
| Designer | Diseño | Briefs de carrusel y thumbnail, prompts de imagen, estructura slide a slide |
| Community Manager | Comunidad | Borradores de respuestas a comentarios y DMs que yo pego |
- Estados: `idle | walking | working | meeting | break | waiting_review`.
- Selección por clic o tarjeta; anillo bajo los pies; cámara sigue; `Esc`, `Tab`, `1–9`.
- Animaciones por código (idle, caminar, teclear, café, celebrar). Burbuja de estado sobre la cabeza.
- Comportamiento autónomo cuando están idle. Editor de agentes (nombre, rol, apariencia, system prompt).
- *Criterio*: la máquina de estados del agente está en `packages/domain` y cubre todas las transiciones válidas
  e inválidas con tests.

### 003-brand-kit — Contexto de marca
- Formulario: nicho, audiencia, voz y tono (con ejemplos de "sí / no"), pilares de contenido, CTAs,
  palabras prohibidas, links, idioma(s).
- Perfil por red: handle, objetivo, frecuencia deseada, formatos preferidos.
- Todo agente recibe el brand kit en su contexto. Sin brand kit completo, la generación se bloquea con un aviso.

### 004-content-pipeline — Tareas de contenido
```ts
type ContentTask = {
  id; title; brief; platform: 'instagram'|'tiktok'|'youtube'|'linkedin'|'x';
  format: 'reel'|'carousel'|'story'|'post'|'short'|'video'|'thread';
  pillar; priority: 'low'|'med'|'high';
  status: 'idea'|'brief'|'drafting'|'review'|'approved'|'scheduled'|'published'|'rejected';
  assigneeId?; outputs: ContentOutput[]; feedback: Feedback[]; dueDate?; tags; createdAt; updatedAt;
};
```
- Kanban por estado + vista por red. Drag & drop; arrastrar tarjeta sobre un personaje = asignar.
- Reglas por plataforma en `packages/domain` (límites de caracteres, nº máx. de hashtags, duración de video,
  nº de slides, ratio de aspecto) con validador y tests. El output que viole reglas se marca antes de review.
- Flujo: asigno → el agente camina al escritorio → `working` → genera → `review` (camina a la pizarra).
  Yo **apruebo**, **pido cambios** (con feedback, vuelve a `drafting` y el agente reescribe usando el feedback)
  o **rechazo**.
- Aprobado → copiar al portapapeles / exportar (.md, .txt, imágenes de slides en 1080x1350 opcional) y marcar
  `scheduled` (fecha) → `published` (manual, opcional pego el link).
- Una tarea puede encadenar agentes (ej. Trend Scout → Scriptwriter → Copywriter) vía "handoff".

### 005-ai-generation — Generación real con Claude
- `LLMProvider` (interfaz) → `ClaudeProvider` (real) y `FakeLLMProvider` (tests).
- Endpoint `POST /api/tasks/:id/run` en el server: arma el prompt (system del rol + brand kit + reglas de la
  plataforma + brief + feedback previo), llama a Claude, valida la salida con Zod, guarda versiones.
- Progreso real vía SSE (`GET /api/tasks/:id/events`): `queued → thinking → drafting → validating → done|error`.
  La animación del personaje refleja estos eventos (no un temporizador falso).
- Reintentos con backoff, timeout, manejo de errores visible en el feed. Registro de tokens/costo por tarea
  y un tope de gasto diario configurable.
- *Tests*: con `FakeLLMProvider` se verifica el armado del prompt (snapshot), la validación de salida
  inválida, el flujo de feedback y el corte por tope de gasto.

### 006-updates-feed — Updates y standup
- Feed en tiempo real (filtros por agente, red, tipo). Clic → enfoca agente o tarea. Toasts para review/errores.
- Notas manuales a un agente (aparecen como burbuja).
- Botón **Standup**: Haiku resume el día por agente (hecho / en curso / bloqueado).
- Botón **Plan semanal**: el Head of Marketing propone N tareas para la semana según el brand kit y la
  frecuencia por red; yo acepto las que quiera (se crean como `idea`).

### 007-content-calendar — Calendario
- Vista semana/mes de piezas `scheduled`/`published` por red, con huecos según la frecuencia deseada.
- Arrastrar para reprogramar.

### 008-metrics-lite — Métricas manuales (opcional en v1)
- Yo pego/ingreso métricas de una pieza publicada (views, likes, saves, shares, comentarios).
- El Head of Marketing hace un post-mortem: qué funcionó y qué repetir. Sin métricas, no opina.

## UI / UX
- Canvas a pantalla completa. TopBar: logo AI HQ, departamento activo (Marketing), gasto del día, Standup,
  Plan semanal. Izquierda: equipo. Derecha: AgentPanel o Feed. Abajo: board plegable. Modal de revisión con
  preview tipo "teléfono" según la red.
- Tema oscuro, acentos por red (colores propios, no logos oficiales), Inter, transiciones 150–250 ms.
- Atajos: `N` nueva tarea, `B` board, `C` calendario, `Space` pausa animaciones.

## Estrategia de tests (aplica en cada `tasks.md`)
- Pirámide: muchos unit (domain), integración de server con SQLite en memoria + `FakeLLMProvider`,
  tests de componentes clave, y 3 e2e en Playwright:
  1. Completar brand kit → crear tarea Reel para Instagram → asignar al Scriptwriter → ver progreso → aprobar → copiar.
  2. Pedir cambios con feedback → la nueva versión incorpora el feedback (verificado con el fake).
  3. Recargar la página → el estado persiste (server).
- Cada tarea en `tasks.md` tiene: test(s) a escribir primero, archivo(s) afectados, criterio de hecho.
- CI local: `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` debe pasar antes de cerrar una feature.

## Criterios de aceptación de la v1
1. `pnpm install && pnpm dev` levanta web + server; con `ANTHROPIC_API_KEY` en `apps/server/.env` los agentes
   generan contenido real.
2. Puedo ir de idea → contenido aprobado y copiado para las 5 redes.
3. La API key no aparece en ningún bundle del cliente (test que lo verifique).
4. Todo el estado persiste en SQLite; export/import JSON funciona.
5. Todas las suites pasan y la cobertura cumple la constitución. 60 fps con 6 agentes.

## Fuera de alcance v1 (deja puntos de extensión)
- Publicar/programar vía APIs oficiales (OAuth de Meta, TikTok, Google, LinkedIn, X).
- Generación de imágenes/video real. Otros departamentos. Multiusuario.

## Forma de trabajo
- Empieza por el Paso 0 y la constitución; luego feature 001. No pases a la siguiente feature sin que la
  anterior tenga todos sus tests en verde.
- Al cerrar cada feature: resumen de lo hecho, tests añadidos, desviaciones de la spec y siguiente paso.
