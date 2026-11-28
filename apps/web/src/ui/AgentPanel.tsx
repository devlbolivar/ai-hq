import { useStore } from 'zustand';
import { agentColorHex } from '@ai-hq/domain';
import { STATUS_LABELS, toCss } from '../render/palette';
import { officeStore, type OfficeStore } from '../state/store';

/** Right panel for the selected agent (spec Assumptions): name, role and status. */
export function AgentPanel({ store = officeStore }: { store?: OfficeStore }) {
  const agentId = useStore(store, (state) => state.selection.agentId);
  const profile = useStore(store, (state) => state.team.find((a) => a.id === agentId) ?? null);
  const status = useStore(
    store,
    (state) => state.sim.agents.find((a) => a.id === agentId)?.status ?? 'idle',
  );
  if (!profile) return null;

  return (
    <section
      aria-label="Agente seleccionado"
      data-ui-control
      className="absolute top-4 right-4 w-64 rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-slate-100 shadow-xl"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: toCss(agentColorHex(profile.color)) }}
        />
        <h2 className="truncate text-sm font-semibold">{profile.name}</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">{profile.role}</p>
      <p className="mt-2 text-sm">{STATUS_LABELS[status]}</p>
    </section>
  );
}
