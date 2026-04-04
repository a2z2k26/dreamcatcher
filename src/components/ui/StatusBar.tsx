'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Status Bar
// Compact bar at the bottom showing model, node count, session
// phase, and estimated context tokens.
// Source pattern: Clui CC's StatusBar.
// ═══════════════════════════════════════════════════════════════

import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { getModel } from '@/lib/models';
import { E, T, C, ACCENT } from '@/lib/theme';
import type { SessionPhase } from '@/types/session';

function phaseLabel(phase: SessionPhase | undefined): { text: string; color: string } {
  switch (phase) {
    case 'streaming': return { text: 'Streaming', color: ACCENT };
    case 'waiting':   return { text: 'Ready', color: T.primary };
    case 'idle':      return { text: 'Idle', color: T.dim };
    case 'stale':     return { text: 'Stale', color: T.ghost };
    case 'empty':     return { text: 'Empty', color: T.ghost };
    default:          return { text: 'Ready', color: T.dim };
  }
}

function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 100000) return `${(count / 1000).toFixed(1)}K`;
  return `${Math.round(count / 1000)}K`;
}

export function StatusBar() {
  const nodeCount = useGraphStore(s => s.nodes.length);
  const edgeCount = useGraphStore(s => s.edges.length);
  const selectedModelId = useUIStore(s => s.selectedModelId);
  const sessions = useSessionStore(s => s.sessions);
  const activeSessionId = useSessionStore(s => s.activeSessionId);

  const model = getModel(selectedModelId);
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const phase = phaseLabel(activeSession?.phase);

  // Rough token estimate: sum of all node text lengths / 4
  const totalChars = useGraphStore(s => s.nodes.reduce((sum, n) => sum + n.text.length, 0));
  const estimatedTokens = Math.ceil(totalChars / 4);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 24,
      background: E[0],
      borderTop: `1px solid ${E[4]}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontFamily: "'Inconsolata', monospace",
      fontSize: 10,
      color: T.dim,
      zIndex: 40,
    }}>
      {/* Left: model + phase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg viewBox="0 0 24 24" width={9} height={9} fill={model.color}>
            <path d={model.icon} />
          </svg>
          <span style={{ color: T.subtle }}>{model.name}</span>
        </div>
        <span style={{ color: T.dim }}>|</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: phase.color,
          }} />
          <span style={{ color: phase.color }}>{phase.text}</span>
        </div>
      </div>

      {/* Right: stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>
        <span style={{ color: T.dim }}>|</span>
        <span>{edgeCount} edge{edgeCount !== 1 ? 's' : ''}</span>
        {estimatedTokens > 0 && (
          <>
            <span style={{ color: T.dim }}>|</span>
            <span>~{formatTokens(estimatedTokens)} tokens</span>
          </>
        )}
      </div>
    </div>
  );
}
