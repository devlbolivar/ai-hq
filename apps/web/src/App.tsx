import { OfficeCanvas } from './render/OfficeCanvas';

export function App() {
  return (
    <main className="relative h-full overflow-hidden">
      <h1 className="sr-only">AI HQ — Marketing</h1>
      <OfficeCanvas />
    </main>
  );
}
