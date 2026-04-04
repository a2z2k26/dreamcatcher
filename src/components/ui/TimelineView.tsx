'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Timeline View
// Linear reading mode of the active conversation path.
// Slides in from the right as a 400px panel.
// Source pattern: Claude Island's chat view.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useMemo } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { getModel } from '@/lib/models';
import { ToolCardList } from './ToolCard';
import { E, T, C, ACCENT, glass } from '@/lib/theme';

export function TimelineView() {
  const timelineOpen = useUIStore(s => s.timelineOpen);
  const activeNodeId = useGraphStore(s => s.activeNodeId);
  const nodes = useGraphStore(s => s.nodes);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the full path from root → active node (computed, not via selector)
  const path = useMemo(() => {
    if (!activeNodeId) return [];
    return useGraphStore.getState().getAncestralPath(activeNodeId);
  }, [activeNodeId, nodes]);

  // Auto-scroll to bottom when path changes
  useEffect(() => {
    if (scrollRef.current && timelineOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [path.length, timelineOpen]);

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: E[0],
      borderLeft: `1px solid ${E[4]}`,
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
      <div ref={scrollRef} className="scroll-fade" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {path.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#404040', fontSize: 11, lineHeight: 1.6 }}>
            Start a conversation to see it here as a linear thread. The timeline shows the path from root to the active node.
          </div>
        ) : (
          path.map((node, i) => {
            const isActive = node.id === activeNodeId;
            const model = node.metadata.model ? getModel(node.metadata.model) : null;

            return (
              <div
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
                  borderLeft: isActive ? `3px solid ${ACCENT}` : '3px solid transparent',
                  background: isActive ? `${E[3]}4D` : 'transparent',
                  transition: 'background 0.15s',
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
  );
}
