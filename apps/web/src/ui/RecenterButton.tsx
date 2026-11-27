import { officeStore, type OfficeStore } from '../state/store';

/** Restores the initial camera (FR-015). `data-ui-control` keeps presses on it from panning. */
export function RecenterButton({ store = officeStore }: { store?: OfficeStore }) {
  return (
    <button
      type="button"
      data-ui-control
      onClick={() => store.getState().recenter()}
      className="absolute right-4 bottom-4 rounded-md border border-slate-600 bg-slate-800/90 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-lg hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none"
    >
      Recentrar
    </button>
  );
}
