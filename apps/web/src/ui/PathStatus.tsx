import { useStore } from 'zustand';
import { officeStore, type OfficeStore } from '../state/store';

export function PathStatus({ store = officeStore }: { store?: OfficeStore }): JSX.Element | null {
  const result = useStore(store, ({ debug }) => (debug.enabled ? debug.result : null));
  if (result === null) return null;

  let message = 'Sin ruta';
  if (result.ok) {
    const steps = result.path.length - 1;
    message = `Ruta: ${steps} ${steps === 1 ? 'paso' : 'pasos'}`;
  }

  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800/90 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-lg select-none"
    >
      {message}
    </div>
  );
}
