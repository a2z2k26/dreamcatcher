'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Session Pill (Notch Pattern)
// Compact session navigator with three states:
// Collapsed → Peek (hover) → Open (click)
// Source pattern: Claude Island's Dynamic Island.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useMemo } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useGraphStore } from '@/stores/graph-store';
import { E, T, C, ACCENT, glass } from '@/lib/theme';
import type { SessionPhase } from '@/types/session';

type PillState = 'collapsed' | 'peek' | 'open';

// Phase indicator color
function phaseColor(phase: SessionPhase | undefined): string {
  switch (phase) {
    case 'streaming': return ACCENT;
    case 'waiting':   return T.primary;
    case 'idle':      return T.dim;
    case 'stale':     return T.ghost;
    default:          return T.dim;
  }
}

export function SessionPill() {
  const [state, setState] = useState<PillState>('collapsed');
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const sessions = useSessionStore(s => s.sessions);
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const createSession = useSessionStore(s => s.createSession);
  const switchSession = useSessionStore(s => s.switchSession);
  const renameSession = useSessionStore(s => s.renameSession);
  const deleteSession = useSessionStore(s => s.deleteSession);
  const nodeCount = useGraphStore(s => s.nodes.length);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Group sessions by date for the open state
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groups: { label: string; items: typeof sessions[number][] }[] = [];
    let currentLabel = '';
    for (const s of sessions) {
      const dateStr = new Date(s.updatedAt).toDateString();
      let label: string;
      if (dateStr === todayStr) {
        label = 'Today';
      } else if (dateStr === yesterdayStr) {
        label = 'Yesterday';
      } else {
        label = new Date(s.updatedAt).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
        });
      }
      if (label !== currentLabel) {
        groups.push({ label, items: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].items.push(s);
    }
    return groups;
  }, [sessions]);

  // Close on click outside
  useEffect(() => {
    if (state !== 'open') return;
    const handleClick = (e: MouseEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setState('collapsed');
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState('collapsed');
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [state]);

  const handleMouseEnter = () => {
    if (state === 'open') return;
    hoverTimerRef.current = setTimeout(() => setState('peek'), 600);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (state === 'peek') setState('collapsed');
  };

  const handleClick = () => {
    setState(state === 'open' ? 'collapsed' : 'open');
  };

  // Dimensions per state
  const width = state === 'collapsed' ? 160 : state === 'peek' ? 280 : 340;
  const maxHeight = state === 'collapsed' ? 32 : state === 'peek' ? 80 : 400;

  return (
    <div
      ref={pillRef}
      className="pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        width,
        maxHeight,
        overflow: 'hidden',
        ...glass,
        borderRadius: state === 'open' ? 14 : 10,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: state === 'open' ? 'default' : 'pointer',
      }}
    >
      {/* Collapsed header — always visible */}
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: T.subtle }}>DC</span>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: phaseColor(activeSession?.phase),
          transition: 'background 0.3s',
        }} />
        <span style={{
          fontSize: 11, fontWeight: 500, color: T.tertiary, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {activeSession?.name || 'No session'}
        </span>
        {state === 'collapsed' && (
          <span style={{ fontSize: 10, color: T.dim, fontFamily: "'Inconsolata', monospace", fontWeight: 500 }}>{nodeCount}</span>
        )}
      </div>

      {/* Peek: recent sessions preview */}
      {state === 'peek' && (
        <div style={{ padding: '0 10px 8px' }}>
          {sessions.slice(0, 3).map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 4px', fontSize: 10,
                color: s.id === activeSessionId ? T.secondary : T.dim,
              }}
            >
              <div style={{
                width: 4, height: 4, borderRadius: '50%',
                background: phaseColor(s.phase),
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Open: full session manager */}
      {state === 'open' && (
        <div style={{ borderTop: `1px solid ${E[5]}` }}>
          {/* New session */}
          <div
            onClick={() => { createSession(); setState('collapsed'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', cursor: 'pointer',
              fontSize: 11, color: ACCENT,
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${E[7]}40`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M6 2v8M2 6h8" />
            </svg>
            New Session
          </div>
          <div style={{ height: 1, background: E[5], margin: '0 10px' }} />

          {/* Session list with date headers */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {groupedSessions.map(group => (
              <div key={group.label}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase' as const,
                  color: '#404040',
                  padding: '6px 14px 2px',
                }}>
                  {group.label}
                </div>
                {group.items.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { switchSession(s.id); setState('collapsed'); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 14px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 500,
                      color: s.id === activeSessionId ? T.primary : T.tertiary,
                      background: s.id === activeSessionId ? `${E[7]}40` : 'transparent',
                      transition: 'background 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${E[7]}40`}
                    onMouseLeave={e => e.currentTarget.style.background = s.id === activeSessionId ? `${E[7]}40` : 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenameTo(s.name);
                          setRenaming(true);
                        }}
                      >
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: phaseColor(s.phase), flexShrink: 0,
                        }} />
                        {renaming && s.id === activeSessionId ? (
                          <input
                            autoFocus
                            style={{
                              background: 'transparent', border: 'none', outline: 'none',
                              color: T.secondary, fontSize: 11, fontFamily: 'inherit', width: 160,
                            }}
                            value={renameTo}
                            onChange={e => setRenameTo(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if (renameTo.trim()) renameSession(s.id, renameTo.trim());
                                setRenaming(false);
                              }
                              if (e.key === 'Escape') setRenaming(false);
                            }}
                            onBlur={() => {
                              if (renameTo.trim()) renameSession(s.id, renameTo.trim());
                              setRenaming(false);
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: T.dim, marginTop: 2, paddingLeft: 11, fontFamily: "'Inconsolata', monospace" }}>
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                        onMouseLeave={e => e.currentTarget.style.color = T.dim}
                        style={{
                          border: 'none', background: 'none', color: T.dim, cursor: 'pointer',
                          padding: 4, minWidth: 20, minHeight: 20,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.2s',
                        }}
                      >
                        <svg viewBox="0 0 8 8" width={8} height={8} fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M6 2L2 6M2 2l4 4" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
