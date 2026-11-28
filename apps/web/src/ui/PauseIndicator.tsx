import { useStore } from 'zustand';
import { officeStore, type OfficeStore } from '../state/store';

const LABEL = 'Simulación en pausa';

/** Visible while `Space` keeps the simulation paused (FR-020). */
export function PauseIndicator({ store = officeStore }: { store?: OfficeStore }) {
  const paused = useStore(store, (state) => state.paused);
  if (!paused) return null;
  return (
    <div
      role="status"
      aria-label={LABEL}
      className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-full border border-amber-500/60 bg-slate-800/90 px-3 py-1 text-xs font-medium text-amber-200 shadow-lg select-none"
    >
      {LABEL}
    </div>
  );
}
