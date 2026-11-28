import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { agentColorHex } from '@ai-hq/domain';
import { CharacterSvg } from '../render/character/svg';
import { STATUS_LABELS, toCss } from '../render/palette';
import { officeStore, type OfficeStore } from '../state/store';

/** Left panel: one card per agent in team order (FR-033). */
export function TeamPanel({ store = officeStore }: { store?: OfficeStore }) {
  const team = useStore(store, (state) => state.team);
  // Only status changes re-render the panel, not every simulation step.
  const statuses = useStore(
    store,
    useShallow((state) => state.sim.agents.map((a) => a.status)),
  );

  return (
    <section
      aria-label="Equipo"
      data-ui-control
      className="absolute top-4 left-4 w-64 rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-100 shadow-xl"
    >
      <h2 className="px-2 pb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
        Equipo
      </h2>
      <ol className="flex flex-col gap-1">
        {team.map((agent, i) => (
          <li key={agent.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <span className="w-4 text-xs text-slate-400">{i + 1}</span>
            <span aria-hidden="true" className="shrink-0">
              <CharacterSvg
                appearance={agent.appearance}
                color={agentColorHex(agent.color)}
                label=""
                size={32}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{agent.name}</span>
              <span className="block truncate text-xs text-slate-400">
                {agent.role} · {STATUS_LABELS[statuses[i] ?? 'idle']}
              </span>
            </span>
            <span
              data-color={agent.color}
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: toCss(agentColorHex(agent.color)) }}
            />
            <button
              type="button"
              aria-label={`Editar ${agent.name}`}
              onClick={() => store.getState().openEditor(agent.id)}
              className="rounded px-1.5 py-0.5 text-xs text-slate-300 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              Editar
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
