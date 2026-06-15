'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Path Trace Bar
// Floating bar showing step counter and navigation during path
// trace mode. Source pattern: Understand Anything's tour UI.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { ACCENT, E, T, glass } from '@/lib/theme';

export function PathTrace() {
  const pathTrace = useUIStore(s => s.pathTrace);
  const stepPathTrace = useUIStore(s => s.stepPathTrace);
  const exitPathTrace = useUIStore(s => s.exitPathTrace);
  const animateTo = useUIStore(s => s.animateTo);
  const nodes = useGraphStore(s => s.nodes);
  const currentTraceNodeId = pathTrace?.nodeIds[pathTrace.currentIndex] ?? null;

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
    if (!currentTraceNodeId) return;
    const body = useGraphStore.getState().bodies[currentTraceNodeId];
    if (body) animateTo(body.x, body.y, 300);
    useUIStore.setState({
      selectedNodeId: currentTraceNodeId,
      selectedNodeIds: new Set<string>(),
      inspectorOpen: false,
    });
  }, [currentTraceNodeId, animateTo]);

  if (!pathTrace) return null;

  const { nodeIds, currentIndex } = pathTrace;
  const currentNodeId = nodeIds[currentIndex];
  const currentNode = nodes.find(n => n.id === currentNodeId);
  const total = nodeIds.length;
  const traceDotCount = Math.min(10, total);
  const traceDotIndex = traceDotCount > 1
    ? Math.round((currentIndex / Math.max(1, total - 1)) * (traceDotCount - 1))
    : 0;
  const roleLabel = currentNode?.role === 'user' ? 'YOU' : 'AI';
  const buttonBase = {
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.035)',
    cursor: 'pointer',
    color: T.secondary,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    borderRadius: 6,
  } as const;
  const disabledButton = {
    color: T.dim,
    cursor: 'not-allowed',
    background: 'rgba(255,255,255,0.018)',
    borderColor: 'rgba(255,255,255,0.035)',
  } as const;

  return (
    <div className="dc-path-trace" style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 90,
      ...glass,
      borderRadius: 8,
      padding: '8px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: 'min(560px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 32px)',
      minHeight: 50,
    }}>
      <div className="dc-path-trace-meta" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 4,
        minWidth: 104,
      }}>
        <div className="dc-path-trace-meta-row" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span className="dc-path-trace-label" style={{
            fontSize: 10,
            color: T.ghost,
            fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            PATH
          </span>
          <span className="dc-path-trace-step" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 22,
            minWidth: 50,
            padding: '0 8px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.051)',
            color: T.secondary,
            fontSize: 11,
            fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
            fontWeight: 700,
          }}>
            {currentIndex + 1}/{total}
          </span>
        </div>
        <svg
          className="dc-path-trace-mini"
          width={96}
          height={10}
          viewBox="0 0 96 10"
          fill="none"
          aria-hidden="true"
          style={{ display: 'block', opacity: 0.92 }}
        >
          <path d="M6 5H90" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          {Array.from({ length: traceDotCount }, (_, index) => {
            const x = traceDotCount === 1 ? 48 : 6 + (index * 84) / (traceDotCount - 1);
            const isCurrent = index === traceDotIndex;
            return (
              <circle
                key={index}
                className={isCurrent ? 'dc-path-trace-mini-current' : undefined}
                cx={x}
                cy={5}
                r={isCurrent ? 2.6 : 1.7}
                fill={isCurrent ? ACCENT : T.ghost}
                opacity={isCurrent ? 1 : 0.55}
              />
            );
          })}
        </svg>
      </div>

      {/* Previous */}
      <button
        className="dc-path-trace-control"
        aria-label="Previous path step"
        title="Previous path step"
        onClick={() => stepPathTrace(-1)}
        disabled={currentIndex === 0}
        style={{
          ...buttonBase,
          ...(currentIndex === 0 ? disabledButton : {}),
        }}
      >
        <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 2L4 6l4 4" />
        </svg>
      </button>

      {/* Current node label */}
      <div className="dc-path-trace-node" style={{
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 6px',
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: currentNode?.role === 'user' ? T.secondary : T.ghost,
          boxShadow: '0 0 0 3px rgba(255,255,255,0.035)',
          flex: '0 0 auto',
        }} />
        <span style={{
          color: currentNode?.role === 'user' ? T.tertiary : T.ghost,
          fontSize: 10,
          fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
          flex: '0 0 auto',
        }}>
          {roleLabel}
        </span>
        <span className="dc-path-trace-node-label" style={{
          fontSize: 13,
          color: T.secondary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}>
          {currentNode?.label || '...'}
        </span>
      </div>

      {/* Next */}
      <button
        className="dc-path-trace-control"
        aria-label="Next path step"
        title="Next path step"
        onClick={() => stepPathTrace(1)}
        disabled={currentIndex === total - 1}
        style={{
          ...buttonBase,
          ...(currentIndex === total - 1 ? disabledButton : {}),
        }}
      >
        <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M4 2l4 4-4 4" />
        </svg>
      </button>

      {/* Separator */}
      <div className="dc-path-trace-divider" style={{ width: 1, height: 24, background: E[6], flex: '0 0 auto' }} />

      {/* Exit */}
      <button
        className="dc-path-trace-exit"
        aria-label="Exit path trace"
        title="Exit path trace"
        onClick={exitPathTrace}
        style={{
          ...buttonBase,
          width: 32,
          minWidth: 32,
          color: T.ghost,
          fontSize: 10,
          fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
        }}
      >
        <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M8 2L2 8M2 2l6 6" />
        </svg>
      </button>
    </div>
  );
}
