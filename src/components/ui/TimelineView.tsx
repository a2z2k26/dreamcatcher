'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Timeline View
// Linear reading mode of the active conversation path.
// Slides in from the right as a 400px panel.
// Source pattern: Claude Island's chat view.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { getModel } from '@/lib/models';
import { ToolCardList } from './ToolCard';
import { E, T, C, ACCENT, FF, R, glassElevated } from '@/lib/theme';

export function TimelineView() {
  const timelineOpen = useUIStore(s => s.timelineOpen);
  const allNodes = useGraphStore(s => s.nodes);
  const activeNodeId = useGraphStore(s => s.activeNodeId);
  const [viewportWidth, setViewportWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the full path from root → active node (computed, not via selector)
  const path = activeNodeId ? useGraphStore.getState().getAncestralPath(activeNodeId) : [];
  const isMobileViewport = viewportWidth > 0 && viewportWidth <= 640;
  const rightInset = isMobileViewport ? 12 : 434;
  const timelineListBottomPad = isMobileViewport ? 230 : 8;

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  // Auto-scroll to bottom when path changes
  useEffect(() => {
    if (scrollRef.current && timelineOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [path.length, timelineOpen, timelineListBottomPad]);

  return (
    <>
    <div className="dc-timeline-panel" style={{
      position: 'fixed',
      right: 0,
      top: 46,
      bottom: 24,
      width: 'min(420px, 100vw)',
      background: E[1],
      borderLeft: `1px solid ${E[4]}`,
      boxShadow: '-1px 0 0 rgba(255,255,255,0.026) inset',
      zIndex: 70,
      display: 'flex',
      flexDirection: 'column',
      transform: timelineOpen ? 'translateX(0)' : 'translateX(100%)',
      opacity: timelineOpen ? 1 : 0,
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: `1px solid ${E[4]}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: T.ghost }}>
          Timeline
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: T.dim }}>{path.length} messages</span>
          <button
            onClick={() => useUIStore.getState().toggleTimeline()}
            style={{ border: 'none', background: 'none', color: T.ghost, cursor: 'pointer', padding: 2 }}
          >
            <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-fade" style={{ flex: 1, overflowY: 'auto', padding: `8px 0 ${timelineListBottomPad}px` }}>
        {path.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#404040', fontSize: 11, lineHeight: 1.6 }}>
            Start a conversation to see it here as a linear thread. The timeline shows the path from root to the active node.
          </div>
        ) : (
          path.map((node) => {
            const isActive = node.id === activeNodeId;
            const model = node.metadata.model ? getModel(node.metadata.model) : null;

            return (
              <div
                className="dc-timeline-row"
                data-active={isActive ? 'true' : 'false'}
                key={node.id}
                onClick={() => {
                  useUIStore.getState().setSelectedNode(node.id);
                  useGraphStore.getState().setActiveNode(node.id);
                  // Pan canvas to this node
                  const body = useGraphStore.getState().bodies[node.id];
                  if (body) useUIStore.getState().animateTo(body.x, body.y);
                }}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                  background: isActive ? 'rgba(26,24,22,0.58)' : 'transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.025)' : 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${E[2]}`; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Role + timestamp + model */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {/* Role dot */}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: node.role === 'user' ? T.tertiary : T.ghost,
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: node.role === 'user' ? T.tertiary : T.ghost, textTransform: 'uppercase' as const }}>
                    {node.role === 'user' ? 'You' : 'AI'}
                  </span>
                  {model && (
                    <span style={{ fontSize: 10, fontWeight: 400, color: T.dim, display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Inconsolata', monospace" }}>
                      <svg viewBox="0 0 24 24" width={8} height={8} fill={model.color}>
                        <path d={model.icon} />
                      </svg>
                      {model.name}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: T.subtle, fontFamily: "'Inconsolata', monospace" }}>
                    {new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content */}
                <div style={{
                  fontSize: 13, fontWeight: 400, lineHeight: 1.65, color: T.secondary,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {node.text || '...'}
                </div>

                {/* Thinking steps (expandable) */}
                {node.metadata.thinking && node.metadata.thinking.length > 0 && (
                  <details style={{ marginTop: 6 }}>
                    <summary style={{ fontSize: 10, color: C.thinking, cursor: 'pointer' }}>
                      {node.metadata.thinking.length} reasoning step{node.metadata.thinking.length !== 1 ? 's' : ''}
                    </summary>
                    <div style={{ padding: '4px 0 0 8px' }}>
                      {node.metadata.thinking.map((step, j) => (
                        <div key={j} style={{ fontSize: 10, color: T.ghost, marginBottom: 3 }}>
                          <span style={{ color: C.thinking, fontWeight: 600 }}>{step.label}:</span>{' '}
                          {step.content}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Tool calls */}
                {node.metadata.toolCalls && node.metadata.toolCalls.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <ToolCardList toolCalls={node.metadata.toolCalls} />
                  </div>
                )}

                {/* Inherited indicator */}
                {node.isInherited && (
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 4, fontStyle: 'italic' }}>
                    Inherited from clip
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
    <TimelineScrubber
      open={timelineOpen}
      nodes={allNodes}
      activeNodeId={activeNodeId}
      rightInset={rightInset}
    />
    </>
  );
}

function TimelineScrubber({ open, nodes, activeNodeId, rightInset }: {
  open: boolean;
  nodes: ReturnType<typeof useGraphStore.getState>['nodes'];
  activeNodeId: string | null;
  rightInset: number;
}) {
  const scrubTime = useUIStore(s => s.timelineScrubTime);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const timed = useMemo(
    () => [...nodes].filter(node => Number.isFinite(node.timestamp)).sort((a, b) => a.timestamp - b.timestamp),
    [nodes],
  );

  if (!open || timed.length === 0) return null;

  const activeNode = timed.find(node => node.id === activeNodeId) ?? timed[timed.length - 1];
  const minTime = timed[0].timestamp;
  const maxTime = Math.max(timed[timed.length - 1].timestamp, minTime + 1);
  const span = Math.max(1, maxTime - minTime);
  const displayTime = scrubTime ?? activeNode.timestamp;
  const displayFrac = clamp01((displayTime - minTime) / span);
  const cells = 40;
  const bins = new Array(cells).fill(0);
  const userCount = timed.filter(node => node.role === 'user').length;
  const aiCount = timed.length - userCount;

  timed.forEach(node => {
    const index = Math.min(cells - 1, Math.floor(((node.timestamp - minTime) / span) * cells));
    bins[index] += 1;
  });

  const maxBin = Math.max(1, ...bins);

  const chooseTime = (clientX: number, mode: 'near' | 'exact' = 'near') => {
    const rect = ribbonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextTime = minTime + clamp01((clientX - rect.left) / rect.width) * span;
    useUIStore.getState().setTimelineScrubTime(nextTime);
    const nearest = timed.reduce((best, node) => (
      Math.abs(node.timestamp - nextTime) < Math.abs(best.timestamp - nextTime) ? node : best
    ), timed[0]);
    const milestoneThreshold = Math.max(span / Math.max(timed.length * 3, 24), 1);
    if (mode === 'exact' || Math.abs(nearest.timestamp - nextTime) <= milestoneThreshold) {
      selectTimelineNode(nearest.id, { syncScrubTime: false });
    }
  };

  return (
    <div
      className="dc-timeline-scrubber"
      style={{
        position: 'fixed',
        left: 14,
        right: rightInset,
        bottom: 124,
        zIndex: 72,
        ...glassElevated,
        borderRadius: R.lg,
        padding: '11px 16px 12px',
        fontFamily: FF.mono,
        transition: 'right 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ font: `700 8px ${FF.mono}`, letterSpacing: '1.2px', textTransform: 'uppercase', color: ACCENT }}>
          Timeline
        </span>
        <span style={{ font: `500 9px ${FF.mono}`, color: T.dim }}>
          {userCount} user · {aiCount} ai
        </span>
        <span style={{ marginLeft: 'auto', font: `600 10px ${FF.mono}`, color: T.tertiary, fontVariantNumeric: 'tabular-nums' }}>
          {formatTimeLabel(displayTime)}
        </span>
      </div>

      <div
        ref={ribbonRef}
        className="dc-timeline-ribbon"
        onPointerDown={event => {
          draggingRef.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic pointer events may not have an active pointer to capture.
          }
          chooseTime(event.clientX);
        }}
        onPointerMove={event => {
          if (draggingRef.current) chooseTime(event.clientX);
        }}
        onPointerUp={event => {
          draggingRef.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          chooseTime(event.clientX);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        style={{ position: 'relative', height: 34, cursor: 'ew-resize', userSelect: 'none', touchAction: 'none' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells}, 1fr)`, gap: 1.5, height: 12, marginTop: 2 }}>
          {bins.map((value, index) => {
            const intensity = value / maxBin;
            const background = value === 0
              ? 'rgba(200,200,200,0.04)'
              : `rgba(${Math.round(200 + intensity * 35)}, ${Math.round(200 + intensity * 35)}, ${Math.round(200 + intensity * 35)}, ${(0.10 + 0.45 * intensity).toFixed(2)})`;
            return (
              <div
                className="dc-timeline-cell"
                key={index}
                style={{ background, borderRadius: 1.5 }}
              />
            );
          })}
        </div>

        {timed.map(node => {
          const frac = clamp01((node.timestamp - minTime) / span);
          const model = node.metadata.model ? getModel(node.metadata.model) : null;
          const isActive = node.id === activeNode.id;
          return (
            <button
              className="dc-timeline-tick"
              data-active={isActive ? 'true' : 'false'}
              key={node.id}
              title={node.label || node.text.slice(0, 50)}
              onClick={event => {
                event.stopPropagation();
                useUIStore.getState().setTimelineScrubTime(node.timestamp);
                selectTimelineNode(node.id);
              }}
              style={{
                position: 'absolute',
                left: `${(frac * 100).toFixed(2)}%`,
                top: 18,
                transform: 'translateX(-50%)',
                width: isActive ? 8 : 6,
                height: isActive ? 8 : 6,
                padding: 0,
                borderRadius: node.role === 'ai' ? '50%' : 1.5,
                background: isActive ? ACCENT : model?.color ?? T.subtle,
                boxShadow: isActive ? '0 0 7px rgba(221,0,0,0.70)' : 'none',
                cursor: 'pointer',
                border: `1px solid ${E[1]}`,
              }}
            />
          );
        })}

        <div
          className="dc-timeline-playhead"
          style={{
            position: 'absolute',
            left: `${(displayFrac * 100).toFixed(2)}%`,
            top: -2,
            bottom: 0,
            width: 1.5,
            background: ACCENT,
            boxShadow: '0 0 8px rgba(221,0,0,0.80)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            top: -3,
            left: -3.5,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: ACCENT,
            boxShadow: '0 0 8px rgba(221,0,0,0.90)',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, font: `500 8.5px ${FF.mono}`, color: T.dim }}>
        <span>{formatTimeLabel(minTime)}</span>
        <span>{timed.length} moments</span>
        <span>{formatTimeLabel(maxTime)}</span>
      </div>
    </div>
  );
}

function selectTimelineNode(nodeId: string, options: { syncScrubTime?: boolean } = {}) {
  const graph = useGraphStore.getState();
  const ui = useUIStore.getState();
  const node = graph.nodes.find(candidate => candidate.id === nodeId);
  if (options.syncScrubTime !== false && node) {
    ui.setTimelineScrubTime(node.timestamp);
  }
  const alreadyFocused = graph.activeNodeId === nodeId && ui.selectedNodeId === nodeId;
  if (!alreadyFocused) {
    ui.setSelectedNode(nodeId);
    graph.setActiveNode(nodeId);
  }
  const shouldFocusCanvas = !alreadyFocused || options.syncScrubTime !== false;
  const body = graph.bodies[nodeId];
  if (body && shouldFocusCanvas) {
    ui.animateTo(body.x, body.y, options.syncScrubTime === false ? 520 : 400);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatTimeLabel(time: number): string {
  return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
