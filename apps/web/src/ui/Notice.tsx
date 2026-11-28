import { useStore } from 'zustand';
import { officeStore, type OfficeStore } from '../state/store';

/** Ephemeral notice such as "Sin sitio libre" (FR-034). */
export function Notice({ store = officeStore }: { store?: OfficeStore }) {
  const notice = useStore(store, (state) => state.notice);
  if (!notice) return null;
  return (
    <div
      key={notice.id}
      role="status"
      aria-label={notice.message}
      className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border border-rose-400/60 bg-slate-800/95 px-3 py-1.5 text-sm font-medium text-rose-100 shadow-lg select-none"
    >
      {notice.message}
    </div>
  );
}
