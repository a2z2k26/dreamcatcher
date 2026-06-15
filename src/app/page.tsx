import { GraphCanvas } from '@/components/canvas/GraphCanvas';
import { FloatingUI } from '@/components/ui/FloatingUI';
import { Inspector } from '@/components/ui/Inspector';
import { MemoryShelf } from '@/components/ui/MemoryShelf';
import { LearnOverlay } from '@/components/ui/LearnOverlay';
import { BranchPreview } from '@/components/ui/BranchPreview';
import { ClipCreator } from '@/components/ui/ClipCreator';
import { PathTrace } from '@/components/ui/PathTrace';
import { TimelineView } from '@/components/ui/TimelineView';
import { SessionPill } from '@/components/ui/SessionPill';
import { CockpitChrome } from '@/components/ui/CockpitChrome';
import { ExportOverlay } from '@/components/ui/ExportOverlay';
import { HoverCard } from '@/components/ui/HoverCard';
import { ToastProvider } from '@/components/ui/Toast';
import { SearchBar } from '@/components/ui/SearchBar';
import { SessionInit } from '@/components/SessionInit';

export default function Home() {
  return (
    <div className="relative w-screen h-screen" style={{ fontFamily: 'var(--font-ui)' }}>
      <SessionInit />
      <GraphCanvas />
      <CockpitChrome />
      <FloatingUI />
      <SessionPill />
      <Inspector />
      <MemoryShelf />
      <LearnOverlay />
      <BranchPreview />
      <ClipCreator />
      <PathTrace />
      <TimelineView />
      <ExportOverlay />
      <HoverCard />
      <SearchBar />
      <ToastProvider />
    </div>
  );
}
