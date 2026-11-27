import { useStore } from 'zustand';
import { officeStore, type OfficeStore } from '../state/store';

export function HoverLabel({ store = officeStore }: { store?: OfficeStore }): JSX.Element | null {
  const name = useStore(store, ({ hover, layout }) => {
    if (hover?.type !== 'object') return null;
    return layout.objects.find((object) => object.id === hover.id)?.name ?? null;
  });

  if (name === null) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800/90 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-lg select-none"
    >
      {name}
    </div>
  );
}
