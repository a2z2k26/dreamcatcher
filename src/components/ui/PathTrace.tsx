'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Path Trace Bar
// Floating bar showing step counter and navigation during path
// trace mode. Source pattern: Understand Anything's tour UI.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { E, T, C, ACCENT, glass } from '@/lib/theme';

export function PathTrace() {
  const pathTrace = useUIStore(s => s.pathTrace);
  const stepPathTrace = useUIStore(s => s.stepPathTrace);
  const exitPathTrace = useUIStore(s => s.exitPathTrace);
  const animateTo = useUIStore(s => s.animateTo);

  // Keyboard: arrows to step, Escape to exit
  useEffect(() => {
    if (!pathTrace) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { exitPathTrace(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        stepPathTrace(1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        stepPathTrace(-1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pathTrace, stepPathTrace, exitPathTrace]);

  // Auto-pan to current step when index changes
  useEffect(() => {
    if (!pathTrace) return;
    const nodeId = pathTrace.nodeIds[pathTrace.currentIndex];
    if (!nodeId) return;
    const body = useGraphStore.getState().bodies[nodeId];
    if (body) animateTo(body.x, body.y, 300);
    // Also set as selected for inspector
    useUIStore.getState().setSelectedNode(nodeId);
  }, [pathTrace?.currentIndex, animateTo]);

  if (!pathTrace) return null;

  const { nodeIds, currentIndex } = pathTrace;
  const currentNodeId = nodeIds[currentIndex];
  const currentNode = useGraphStore(s => s.nodes.find(n => n.id === currentNodeId));
  const total = nodeIds.length;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 90,
      ...glass,
      borderRadius: 12,
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Step counter */}
      <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>
        {currentIndex + 1} / {total}
      </span>

      {/* Previous */}
      <button
        onClick={() => stepPathTrace(-1)}
        disabled={currentIndex === 0}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: currentIndex === 0 ? T.dim : T.secondary,
          padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 32, minHeight: 32,
        }}
      >
        <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 2L4 6l4 4" />
        </svg>
      </button>

      {/* Current node label */}
      <span style={{
        fontSize: 13, color: T.secondary,
        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        <span style={{ color: currentNode?.role === 'user' ? T.tertiary : T.ghost, fontSize: 10, marginRight: 4 }}>
          {currentNode?.role === 'user' ? 'YOU' : 'AI'}
        </span>
        {currentNode?.label || '...'}
      </span>

      {/* Next */}
      <button
        onClick={() => stepPathTrace(1)}
        disabled={currentIndex === total - 1}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: currentIndex === total - 1 ? T.dim : T.secondary,
          padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 32, minHeight: 32,
        }}
      >
        <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M4 2l4 4-4 4" />
        </svg>
      </button>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: E[6] }} />

      {/* Exit */}
      <button
        onClick={exitPathTrace}
        style={{
          border: 'none', background: 'none', cursor: 'pointer',
          color: T.dim, padding: 4, display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontFamily: "'Inconsolata', monospace",
        }}
      >
        <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 2L2 8M2 2l6 6" />
        </svg>
        ESC
      </button>
    </div>
  );
}
