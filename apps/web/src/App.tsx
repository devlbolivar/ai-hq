import { OfficeCanvas } from './render/OfficeCanvas';
import { AgentEditor } from './ui/AgentEditor';
import { AgentPanel } from './ui/AgentPanel';
import { DebugToggle } from './ui/DebugToggle';
import { HoverLabel } from './ui/HoverLabel';
import { Notice } from './ui/Notice';
import { PathStatus } from './ui/PathStatus';
import { PauseIndicator } from './ui/PauseIndicator';
import { RecenterButton } from './ui/RecenterButton';
import { TeamPanel } from './ui/TeamPanel';

export function App() {
  return (
    <main className="relative h-full overflow-hidden">
      <h1 className="sr-only">AI HQ — Marketing</h1>
      <OfficeCanvas />
      <TeamPanel />
      <AgentPanel />
      <AgentEditor />
      <HoverLabel />
      <PathStatus />
      <PauseIndicator />
      <Notice />
      <DebugToggle />
      <RecenterButton />
    </main>
  );
}
