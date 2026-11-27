# AGENTS.md — Reglas comunes para agentes (Claude Code, Codex)

Este proyecto lo construyen varios agentes de IA que se relevan entre sí. Todo el estado vive en
archivos del repo: si no está escrito aquí o en `specs/`, no existe.

## Fuentes de verdad (leer antes de trabajar)

1. `.specify/memory/constitution.md` — principios no negociables. Prevalece sobre todo lo demás.
2. `specs/<NNN-feature>/spec.md` — qué construir (requisitos, criterios de aceptación).
3. `specs/<NNN-feature>/plan.md` — cómo construirlo (stack, estructura, decisiones).
4. `specs/<NNN-feature>/tasks.md` — qué falta: la primera tarea sin `[x]` es la siguiente.
5. `PROMPT.md` — visión general del producto y orden de las features.

La feature activa está en `.specify/feature.json` y en la rama git actual (`NNN-feature`).

## Flujo Spec Kit

`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze`
→ `/speckit-implement`. El usuario aprueba después de `clarify` y después de `tasks`; no avances sin
esa aprobación.

## Reglas de trabajo

- **TDD obligatorio**: para cada tarea, primero un test que falla (RED), luego el mínimo código
  (GREEN), luego refactor. Commits separados: `test:` → `feat:`/`fix:` → `refactor:`.
- **Commits**: mensajes en formato conventional commits, en inglés. **Nunca** añadas trailers de
  co-autoría ni atribución a IA (`Co-Authored-By`, "Generated with…").
- **Marca el progreso**: al terminar una tarea con sus tests en verde, cambia `- [ ]` por `- [x]` en
  `tasks.md` en el mismo commit `feat:`/`refactor:` que la cierra.
- **Una tarea a la vez**: no empieces una tarea que otro agente tenga en curso. Si dejas una tarea a
  medias, añade debajo de ella en `tasks.md` una línea `> WIP (<agente>): <estado y siguiente paso>`.
- **Quality gate** antes de cerrar una feature: `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e`.
- **No cambies la spec ni la constitución por tu cuenta**: si algo no cuadra, detente y pregunta.
- **Sin dependencias nuevas** que no estén justificadas en `plan.md`.
- **Secretos**: nunca escribas API keys en el repo; van en `apps/server/.env` (ignorado por git).
- Idioma: specs y documentación en español; código, identificadores y commits en inglés.

## Relevo entre agentes

Para continuar el trabajo de otro agente:

1. `git status` y `git log --oneline -10` para ver el estado.
2. Lee `.specify/feature.json` y el `tasks.md` de esa feature.
3. Continúa desde la primera tarea sin `[x]` (o desde la línea `> WIP`).
4. Al terminar tu sesión, deja el árbol limpio (todo commiteado) o una nota `> WIP`.
