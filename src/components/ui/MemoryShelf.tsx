'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Memory Shelf
// Left docked solid panel showing saved memories.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useMemoryStore } from '@/stores/memory-store';
import { useSessionStore } from '@/stores/session-store';
import { E, T, C, FF, R } from '@/lib/theme';
import type { Memory } from '@/types/memory';

const iconButtonStyle = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 4,
  minWidth: 22,
  minHeight: 22,
  borderRadius: 5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: T.dim,
  transition: 'color 160ms ease, background 160ms ease',
} as const;


export function MemoryShelf() {
  const memories = useMemoryStore(s => s.memories);
  const shelfOpen = useMemoryStore(s => s.shelfOpen);
  const setShelfOpen = useMemoryStore(s => s.setShelfOpen);
  const removeMemory = useMemoryStore(s => s.removeMemory);
  const loadFromDB = useMemoryStore(s => s.loadFromDB);
  const [search, setSearch] = useState('');

  // Load memories from IndexedDB on mount
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('greenland')) return;
    loadFromDB();
  }, [loadFromDB]);

  // Fuzzy search index
  const fuse = useMemo(() => new Fuse(memories as Memory[], {
    keys: ['name', 'content', 'tags'],
    threshold: 0.4,
    includeMatches: true,
  }), [memories]);

  const filteredMemories = search.trim()
    ? fuse.search(search).map(r => r.item)
    : memories as Memory[];

  return (
    <>
      {/* Shelf panel */}
      <div
        className="pointer-events-auto dc-memory-shelf"
        style={{
          position: 'fixed',
          left: 0,
          top: 46,
          bottom: 24,
          width: 280,
          background: E[1],
          borderRight: `1px solid ${E[4]}`,
          borderLeft: 'none',
          boxShadow: '1px 0 0 rgba(255,255,255,0.026) inset',
          zIndex: 55,
          display: 'flex',
          flexDirection: 'column',
          transform: shelfOpen ? 'translateX(0)' : 'translateX(-100%)',
          opacity: shelfOpen ? 1 : 0,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 12px',
          borderBottom: `0.5px solid ${E[4]}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span
              className="dc-memory-header-icon"
              style={{
                width: 18,
                height: 18,
                borderRadius: R.inset,
                border: '0.5px solid rgba(160,160,160,0.28)',
                background: 'rgba(160,160,160,0.055)',
                color: C.memory,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 14 14" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 3.2h7" />
                <path d="M3.5 7h7" />
                <path d="M3.5 10.8h5" />
                <path d="M2 2.2v9.6" />
              </svg>
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: C.memory }}>
              Memories
            </span>
            <span style={{ font: `600 9px ${FF.mono}`, color: T.dim }}>{memories.length}</span>
          </div>
          <button
            type="button"
            aria-label="Close memories"
            title="Close memories"
            onClick={() => setShelfOpen(false)}
            onMouseEnter={e => {
              e.currentTarget.style.color = T.secondary;
              e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = T.dim;
              e.currentTarget.style.background = 'transparent';
            }}
            style={iconButtonStyle}
          >
            <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </button>
        </div>

        {/* Search */}
        {memories.length > 0 && (
          <div style={{ padding: '8px 10px', borderBottom: `0.5px solid ${E[4]}` }}>
            <input
              className="dc-memory-search-input"
              style={{
                width: '100%',
                height: 30,
                background: 'rgba(255,255,255,0.025)',
                border: `0.5px solid ${E[5]}`,
                borderRadius: 6,
                padding: '0 9px',
                outline: 'none',
                fontFamily: FF.sans,
                fontSize: 11,
                fontWeight: 600,
                color: T.secondary,
              }}
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Memory list */}
        <div className="scroll-fade" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 10px' }}>
          {filteredMemories.length === 0 ? (
            <div style={{ padding: '20px 8px', textAlign: 'center', color: T.dim, fontSize: 11 }}>
              No memories saved yet.<br />
              <span style={{ fontSize: 10, color: E[6] }}>Right-click a node → Save as memory</span>
            </div>
          ) : (
            filteredMemories.map(m => (
              <div
                className="dc-memory-row"
                key={m.id}
                style={{
                  padding: '9px 10px 9px',
                  borderRadius: R.card,
                  marginBottom: 8,
                  background: 'rgba(255,255,255,0.022)',
                  border: '0.5px solid rgba(128,128,128,0.16)',
                  cursor: 'pointer',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.024) inset',
                  transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                  e.currentTarget.style.borderColor = 'rgba(160,160,160,0.24)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.022)';
                  e.currentTarget.style.borderColor = 'rgba(128,128,128,0.16)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span
                    className="dc-memory-kind-pill"
                    style={{
                      font: `700 7.5px ${FF.mono}`,
                      letterSpacing: '0.45px',
                      textTransform: 'uppercase',
                      color: m.type === 'subgraph' ? C.memory : T.ghost,
                      border: `0.5px solid ${m.type === 'subgraph' ? 'rgba(160,160,160,0.38)' : 'rgba(96,96,96,0.36)'}`,
                      borderRadius: R.inset,
                      padding: '1px 4px',
                      lineHeight: 1.35,
                      flex: '0 0 auto',
                    }}
                  >
                    {m.type === 'subgraph' ? 'Clip' : m.type === 'path' ? 'Path' : 'Node'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 650, color: T.secondary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                  <button
                    type="button"
                    className="dc-memory-dismiss-button"
                    aria-label={`Remove ${m.name}`}
                    title="Remove memory"
                    onClick={(e) => { e.stopPropagation(); removeMemory(m.id); }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = T.secondary;
                      e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = T.dim;
                      e.currentTarget.style.background = 'transparent';
                    }}
                    style={{ ...iconButtonStyle, marginLeft: 'auto', flex: '0 0 auto' }}
                  >
                    <svg viewBox="0 0 8 8" width={8} height={8} fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M6 2L2 6M2 2l4 4" />
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 400, color: T.subtle, lineHeight: 1.45, overflow: 'hidden', maxHeight: 32 }}>
                  {m.content.slice(0, 104)}{m.content.length > 104 ? '...' : ''}
                </div>
                {/* Mini graph thumbnail for subgraph clips */}
                {m.type === 'subgraph' && m.graphSnapshot && (
                  <ClipThumbnail nodes={m.graphSnapshot.nodes} edges={m.graphSnapshot.edges} />
                )}
                <div style={{ fontSize: 9, color: T.dim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, fontFamily: FF.mono }}>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  {m.tags.length > 0 && m.tags.map(t => (
                    <span key={t} style={{ color: C.thinking }}>#{t}</span>
                  ))}
                  {m.type === 'subgraph' && m.graphSnapshot && (
                    <button
                      type="button"
                      className="dc-memory-spawn-button"
                      aria-label={`Branch from ${m.name}`}
                      title="Branch from memory"
                      onClick={(e) => {
                        e.stopPropagation();
                        useSessionStore.getState().spawnFromClip(m);
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.045)';
                        e.currentTarget.style.borderColor = 'rgba(200,200,200,0.28)';
                        e.currentTarget.style.color = T.secondary;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(200,200,200,0.035)';
                        e.currentTarget.style.borderColor = 'rgba(128,128,128,0.22)';
                        e.currentTarget.style.color = T.tertiary;
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: 0,
                        width: 22,
                        height: 20,
                        borderRadius: 4,
                        border: '0.5px solid rgba(128,128,128,0.22)',
                        background: 'rgba(200,200,200,0.035)',
                        color: T.tertiary,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 160ms ease, background 160ms ease, border-color 160ms ease',
                      }}
                    >
                      <svg viewBox="0 0 12 12" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 3.5h1.5A2.5 2.5 0 0 1 8 6v2" />
                        <path d="M8 8l1.4-1.4M8 8 6.6 6.6" />
                        <path d="M2 3.5h2" />
                        <circle cx="2" cy="3.5" r="1" fill={C.memory} stroke="none" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {memories.length > 0 && (
          <div style={{
            padding: '7px 12px',
            borderTop: `0.5px solid ${E[4]}`,
            font: `600 9px ${FF.mono}`,
            color: T.dim,
            textAlign: 'center',
          }}>
            {memories.length} memor{memories.length === 1 ? 'y' : 'ies'} saved
          </div>
        )}
      </div>
    </>
  );
}

// Mini SVG thumbnail of a clip's graph topology
function ClipThumbnail({ nodes, edges }: {
  nodes: readonly { id: string }[];
  edges: readonly { from: string; to: string }[];
}) {
  if (nodes.length === 0) return null;
  const W = 230;
  const H = 30;
  const PAD = 6;

  // Simple vertical layout: spread nodes evenly
  const posMap: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    posMap[n.id] = {
      x: PAD + ((W - PAD * 2) / Math.max(nodes.length - 1, 1)) * i,
      y: H / 2,
    };
  });

  return (
    <svg
      className="dc-memory-clip-thumb"
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      height={H}
      style={{
        marginTop: 7,
        borderRadius: R.inset,
        background: `linear-gradient(180deg, ${E[3]} 0%, ${E[2]} 100%)`,
        border: '0.5px solid rgba(160,160,160,0.16)',
      }}
    >
      {edges.map((e, i) => {
        const a = posMap[e.from];
        const b = posMap[e.to];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(160,160,160,0.46)" strokeWidth={0.8} />;
      })}
      {nodes.map((n) => {
        const p = posMap[n.id];
        return <circle key={n.id} cx={p.x} cy={p.y} r={2.4} fill={E[6]} stroke={C.memory} strokeWidth={0.45} />;
      })}
    </svg>
  );
}
