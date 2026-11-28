import { OfficeCanvas } from './render/OfficeCanvas';
import { AgentPanel } from './ui/AgentPanel';
import { DebugToggle } from './ui/DebugToggle';
import { HoverLabel } from './ui/HoverLabel';
import { PathStatus } from './ui/PathStatus';
import { RecenterButton } from './ui/RecenterButton';
import { TeamPanel } from './ui/TeamPanel';

export function App() {
  return (
    <main className="relative h-full overflow-hidden">
      <h1 className="sr-only">AI HQ — Marketing</h1>
      <OfficeCanvas />
      <TeamPanel />
      <AgentPanel />
      <HoverLabel />
      <PathStatus />
      <DebugToggle />
      <RecenterButton />
    </main>
  );
}
