import { OfficeCanvas } from './render/OfficeCanvas';
import { HoverLabel } from './ui/HoverLabel';
import { RecenterButton } from './ui/RecenterButton';

export function App() {
  return (
    <main className="relative h-full overflow-hidden">
      <h1 className="sr-only">AI HQ — Marketing</h1>
      <OfficeCanvas />
      <HoverLabel />
      <RecenterButton />
    </main>
  );
}
