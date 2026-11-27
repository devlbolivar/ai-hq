import { useStore } from 'zustand';
import { officeStore, type OfficeStore } from '../state/store';

export function DebugToggle({ store = officeStore }: { store?: OfficeStore }) {
  const enabled = useStore(store, (state) => state.debug.enabled);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-ui-control
      onClick={() => store.getState().toggleDebug()}
      className="absolute left-4 bottom-4 rounded-md border border-slate-600 bg-slate-800/90 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-lg hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none aria-checked:border-sky-400 aria-checked:bg-sky-800"
    >
      Modo depuración
    </button>
  );
}
