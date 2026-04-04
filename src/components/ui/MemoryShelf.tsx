'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Memory Shelf
// Left sidebar showing saved memories. Glass-effect, floating.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useMemoryStore } from '@/stores/memory-store';
import { useSessionStore } from '@/stores/session-store';
import { E, T, C, glass } from '@/lib/theme';
import type { Memory } from '@/types/memory';


export function MemoryShelf() {
  const memories = useMemoryStore(s => s.memories);
  const shelfOpen = useMemoryStore(s => s.shelfOpen);
  const setShelfOpen = useMemoryStore(s => s.setShelfOpen);
  const removeMemory = useMemoryStore(s => s.removeMemory);
  const loadFromDB = useMemoryStore(s => s.loadFromDB);
  const [search, setSearch] = useState('');

  // Load memories from IndexedDB on mount
  useEffect(() => { loadFromDB(); }, [loadFromDB]);

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
      {/* Toggle button — always visible */}
      <button
        className="pointer-events-auto"
        onClick={() => setShelfOpen(!shelfOpen)}
        style={{
          position: 'fixed',
          left: 12,
          top: 56,
          zIndex: 55,
          ...glass,
          borderRadius: 8,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          color: memories.length > 0 ? C.thinking : T.ghost,
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M6 1v4M4 3l2 2 2-2" /><rect x="2" y="6" width="8" height="4" rx="1" />
        </svg>
        {memories.length > 0 && <span>{memories.length}</span>}
      </button>

      {/* Shelf panel */}
      <div
        className="pointer-events-auto"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 320,
          ...glass,
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          borderLeft: 'none',
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
          padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: T.ghost }}>
            Memories
          </span>
          <button
            onClick={() => setShelfOpen(false)}
            style={{ border: 'none', background: 'none', color: T.ghost, cursor: 'pointer', padding: 2 }}
          >
            <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </button>
        </div>

        {/* Search */}
        {memories.length > 0 && (
          <div style={{ padding: '6px 10px' }}>
            <input
              style={{
                width: '100%', background: E[4], border: `1px solid ${E[6]}`,
                borderRadius: 6, padding: '8px 12px', outline: 'none',
                fontFamily: 'inherit', fontSize: 11, color: T.secondary,
              }}
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Memory list */}
        <div className="scroll-fade" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {filteredMemories.length === 0 ? (
            <div style={{ padding: '20px 8px', textAlign: 'center', color: T.dim, fontSize: 11 }}>
              No memories saved yet.<br />
              <span style={{ fontSize: 10, color: E[6] }}>Right-click a node → Save as memory</span>
            </div>
          ) : (
            filteredMemories.map(m => (
              <div
                key={m.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  marginBottom: 4,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${E[5]}40`,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${E[7]}15`; e.currentTarget.style.borderColor = `${E[7]}`; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = `${E[5]}40`; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.secondary }}>
                    {m.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeMemory(m.id); }}
                    style={{ border: 'none', background: 'none', color: T.dim, cursor: 'pointer', padding: 2 }}
                  >
                    <svg viewBox="0 0 8 8" width={8} height={8} fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M6 2L2 6M2 2l4 4" />
                    </svg>
                  </button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 400, color: T.subtle, lineHeight: 1.5, overflow: 'hidden', maxHeight: 45 }}>
                  {m.content.slice(0, 120)}{m.content.length > 120 ? '...' : ''}
                </div>
                {/* Mini graph thumbnail for subgraph clips */}
                {m.type === 'subgraph' && m.graphSnapshot && (
                  <ClipThumbnail nodes={m.graphSnapshot.nodes} edges={m.graphSnapshot.edges} />
                )}
                <div style={{ fontSize: 10, color: T.dim, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Inconsolata', monospace" }}>
                  <span>{m.type === 'subgraph' ? 'Clip' : m.type === 'path' ? 'Path' : 'Node'}</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  {m.tags.length > 0 && m.tags.map(t => (
                    <span key={t} style={{ color: C.thinking }}>#{t}</span>
                  ))}
                  {m.type === 'subgraph' && m.graphSnapshot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        useSessionStore.getState().spawnFromClip(m);
                      }}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 6px', borderRadius: 4,
                        border: `1px solid ${C.memory}40`,
                        background: `${C.memory}10`,
                        color: C.memory, fontSize: 10, fontFamily: 'inherit',
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Spawn
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
            padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 10, fontWeight: 400, color: T.dim, textAlign: 'center',
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
  const W = 240;
  const H = 36;
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
    <svg width={W} height={H} style={{ marginTop: 4, borderRadius: 4, background: E[3] }}>
      {edges.map((e, i) => {
        const a = posMap[e.from];
        const b = posMap[e.to];
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={E[7]} strokeWidth={0.5} />;
      })}
      {nodes.map((n, i) => {
        const p = posMap[n.id];
        return <circle key={n.id} cx={p.x} cy={p.y} r={2} fill={E[5]} />;
      })}
    </svg>
  );
}
