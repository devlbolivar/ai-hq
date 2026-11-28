import { useStore } from 'zustand';
import { agentColorHex, type Order } from '@ai-hq/domain';
import { STATUS_LABELS, toCss } from '../render/palette';
import { officeStore, type OfficeStore } from '../state/store';

const DEBUG_ORDERS: readonly { label: string; order: Order }[] = [
  { label: 'Trabajar', order: { type: 'activity', activity: 'work' } },
  { label: 'Reunión', order: { type: 'activity', activity: 'meeting' } },
  { label: 'Descanso', order: { type: 'activity', activity: 'break' } },
  { label: 'Entregar a revisión', order: { type: 'activity', activity: 'review' } },
  { label: 'Volver a idle', order: { type: 'idle' } },
];

/**
 * Right panel for the selected agent (spec Assumptions): name, role, status, "Editar" and, in
 * debug mode, the orders of FR-034.
 */
export function AgentPanel({ store = officeStore }: { store?: OfficeStore }) {
  const agentId = useStore(store, (state) => state.selection.agentId);
  const profile = useStore(store, (state) => state.team.find((a) => a.id === agentId) ?? null);
  const debug = useStore(store, (state) => state.debug.enabled);
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
      <button
        type="button"
        onClick={() => store.getState().openEditor(profile.id)}
        className="mt-3 rounded-md border border-slate-600 px-3 py-1 text-sm hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
      >
        Editar
      </button>
      {debug ? (
        <div
          role="group"
          aria-label="Órdenes de depuración"
          className="mt-3 flex flex-wrap gap-1.5"
        >
          {DEBUG_ORDERS.map(({ label, order }) => (
            <button
              key={label}
              type="button"
              onClick={() => store.getState().sendOrder(profile.id, order)}
              className="rounded border border-amber-500/50 px-2 py-0.5 text-xs text-amber-100 hover:bg-amber-900/50 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
