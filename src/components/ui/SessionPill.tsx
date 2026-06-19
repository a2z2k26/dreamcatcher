'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Session Pill (Notch Pattern)
// Compact session navigator with three states:
// Collapsed → Peek (hover) → Open (click)
// Source pattern: Claude Island's Dynamic Island.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useGraphStore } from '@/stores/graph-store';
import { E, T, ACCENT, FF } from '@/lib/theme';
import type { SessionPhase } from '@/types/session';

type PillState = 'collapsed' | 'peek' | 'open';

const SESSION_HEADER_HEIGHT = 46;

const WIDTH_BY_STATE: Record<PillState, number> = {
  collapsed: 424,
  peek: 424,
  open: 420,
};

const HEIGHT_BY_STATE: Record<PillState, number> = {
  collapsed: SESSION_HEADER_HEIGHT,
  peek: 108,
  open: 438,
};

const NOTCH_TRANSITION = 'all 420ms cubic-bezier(0.2, 0.9, 0.3, 1)';
const PANEL_BG = 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 100%), #141311';
const ROW_ACTIVE_BG = 'linear-gradient(90deg, rgba(200,200,200,0.055) 0%, rgba(200,200,200,0.035) 58%, rgba(200,200,200,0.018) 100%)';
const ROW_HOVER_BG = 'rgba(255,255,255,0.035)';

const iconButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 4,
  minWidth: 22,
  minHeight: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'color 160ms ease, background 160ms ease',
};

// Phase indicator color
function phaseColor(phase: SessionPhase | undefined): string {
  switch (phase) {
    case 'streaming': return ACCENT;
    case 'waiting':   return '#FAAD14';
    case 'idle':      return T.dim;
    case 'stale':     return T.ghost;
    default:          return T.dim;
  }
}

export function SessionPill() {
  const [state, setState] = useState<PillState>('collapsed');
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [viewportWidth, setViewportWidth] = useState(0);
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

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    document.body.dataset.dcSessionState = state;
    const input = document.querySelector<HTMLElement>('.dc-floating-input');
    const shouldHideInput = state === 'open' && window.innerWidth <= 640;
    if (shouldHideInput) {
      input?.style.setProperty('display', 'none', 'important');
    } else {
      input?.style.removeProperty('display');
    }
    return () => {
      if (document.body.dataset.dcSessionState === state) {
        delete document.body.dataset.dcSessionState;
      }
      input?.style.removeProperty('display');
    };
  }, [state]);

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
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setState(current => current === 'open' ? 'collapsed' : 'open');
  };

  const commitRename = (sessionId: string) => {
    const nextName = renameTo.trim();
    if (nextName) renameSession(sessionId, nextName);
    setRenamingSessionId(null);
  };

  // Dimensions per state
  const isMobileViewport = viewportWidth > 0 && viewportWidth <= 640;
  const isOpen = state === 'open';
  const isCollapsed = state === 'collapsed';
  const liveStatus = activeSession?.phase === 'streaming' || activeSession?.phase === 'waiting';
  const statusWord = activeSession?.phase === 'streaming' ? 'streaming' : activeSession?.phase === 'waiting' ? 'waiting' : null;
  const showStatusWord = Boolean(statusWord && !(isMobileViewport && isCollapsed));
  const width = isMobileViewport
    ? Math.max(296, viewportWidth - 24)
    : isCollapsed && !statusWord ? 372 : WIDTH_BY_STATE[state];
  const height = HEIGHT_BY_STATE[state];
  const statusColor = phaseColor(activeSession?.phase);
  const notchBackground = activeSession?.phase === 'waiting'
    ? 'linear-gradient(180deg, #221C12 0%, #17120B 100%)'
    : `linear-gradient(180deg, ${E[2]} 0%, ${E[1]} 100%)`;

  return (
    <div
      ref={pillRef}
      className="pointer-events-auto dc-session-pill"
      data-state={state}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        top: isCollapsed ? 8 : 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        width,
        height,
        overflow: 'hidden',
        background: isCollapsed ? notchBackground : PANEL_BG,
        backdropFilter: isCollapsed ? 'blur(16px) saturate(1.14)' : 'blur(18px) saturate(1.18)',
        WebkitBackdropFilter: isCollapsed ? 'blur(16px) saturate(1.14)' : 'blur(18px) saturate(1.18)',
        borderTop: isCollapsed ? '0.5px solid rgba(61,58,53,0.40)' : '0.5px solid rgba(61,58,53,0.16)',
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        borderBottom: isCollapsed ? '0.5px solid rgba(61,58,53,0.62)' : '0.5px solid rgba(255,255,255,0.04)',
        borderLeft: '0.5px solid rgba(255,255,255,0.06)',
        borderTopLeftRadius: isCollapsed ? 999 : 0,
        borderTopRightRadius: isCollapsed ? 999 : 0,
        borderBottomLeftRadius: isCollapsed ? 999 : isOpen ? 20 : 16,
        borderBottomRightRadius: isCollapsed ? 999 : isOpen ? 20 : 16,
        boxShadow: isCollapsed
          ? [
              '0 3px 10px rgba(0,0,0,0.38)',
              '0 14px 34px -12px rgba(0,0,0,0.78)',
              activeSession?.phase === 'streaming' ? '0 0 24px rgba(221,0,0,0.32)' : '',
              activeSession?.phase === 'waiting' ? '0 0 18px rgba(250,173,20,0.16)' : '',
              'inset 0 1px 0 rgba(255,255,255,0.026)',
              'inset 0 -1px 0 rgba(0,0,0,0.28)',
            ].filter(Boolean).join(', ')
          : [
              '0 16px 36px rgba(0,0,0,0.62)',
              '0 5px 14px rgba(0,0,0,0.42)',
              '0 0 0 0.5px rgba(255,255,255,0.035) inset',
              '0 1px 0 rgba(255,255,255,0.026) inset',
            ].join(', '),
        fontFamily: FF.sans,
        transition: NOTCH_TRANSITION,
        cursor: state === 'open' ? 'default' : 'pointer',
      }}
    >
      {/* Collapsed header — always visible */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Sessions"
        onClick={handleClick}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: isCollapsed ? 6 : 8,
          height: SESSION_HEADER_HEIGHT,
          padding: isCollapsed ? '0 8px 0 20px' : '0 10px 0 17px',
          cursor: 'pointer',
          background: isCollapsed
            ? [
                'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 42%)',
                notchBackground,
              ].join(', ')
            : notchBackground,
          borderBottom: isOpen ? '0.5px solid rgba(255,255,255,0.065)' : 'none',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className={liveStatus ? 'ds-red-pulse' : undefined} style={{
          width: isCollapsed ? 8 : 7, height: isCollapsed ? 8 : 7, borderRadius: '50%',
          background: ACCENT,
          boxShadow: liveStatus ? '0 0 8px rgba(221,0,0,0.75)' : 'none',
          transition: 'background 0.3s',
          flex: '0 0 auto',
        }} />
        {showStatusWord && statusWord && (
          <>
            <span className="dc-session-pill-status-word" style={{ font: `600 10px ${FF.mono}`, letterSpacing: 0.4, color: statusColor, flex: '0 0 auto' }}>
              {statusWord}
            </span>
            <span className="dc-session-pill-status-separator" style={{ font: `400 11px ${FF.mono}`, color: T.dim, flex: '0 0 auto' }}>·</span>
          </>
        )}
        <span className="dc-session-pill-title" style={{
          fontSize: isCollapsed ? 13 : 12, fontWeight: 650, color: isOpen ? T.primary : T.secondary, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: showStatusWord ? 260 : 292,
        }}>
          {activeSession?.name || 'No session'}
        </span>
        <span className="dc-session-pill-divider" style={{ width: 1, height: isCollapsed ? 18 : 13, background: 'rgba(61,58,53,0.7)', flex: '0 0 auto' }} />
        <span className="dc-session-pill-node-count" style={{ fontSize: isCollapsed ? 11 : 10, color: isOpen ? T.subtle : T.subtle, fontFamily: FF.mono, fontWeight: 600, flex: '0 0 auto' }}>{nodeCount}n</span>
        <svg
          viewBox="0 0 10 6"
          width={8}
          height={5}
          fill="none"
          stroke={T.ghost}
          strokeWidth={1.4}
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 220ms ease' }}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </div>

      {/* Peek: recent sessions preview */}
      {state === 'peek' && (
        <div style={{ padding: '8px 10px 10px', background: PANEL_BG, borderTop: '0.5px solid rgba(255,255,255,0.055)' }}>
          {sessions.slice(0, 3).map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', fontSize: 10,
                borderRadius: 5,
                fontFamily: FF.sans,
                color: s.id === activeSessionId ? T.secondary : T.subtle,
                background: s.id === activeSessionId ? 'rgba(255,255,255,0.035)' : 'transparent',
              }}
            >
              <div className={s.phase === 'streaming' ? 'ds-red-pulse' : undefined} style={{
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
        <div style={{ height: height - SESSION_HEADER_HEIGHT, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            className="dc-session-open-header"
            style={{
              minHeight: 42,
              padding: '7px 14px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ font: `700 9px ${FF.mono}`, letterSpacing: 1.2, textTransform: 'uppercase', color: ACCENT }}>
                Session
              </span>
              <span style={{ font: `500 10px ${FF.mono}`, color: T.ghost, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                active · {activeSession?.phase ?? 'empty'} · {nodeCount}n
              </span>
            </div>
            <span
              className="dc-session-open-count"
              style={{ font: `600 9px ${FF.mono}`, color: T.dim, whiteSpace: 'nowrap' }}
            >
              {sessions.length} saved
            </span>
          </div>

          <button
            type="button"
            className="dc-session-new-button dc-session-command-row"
            onClick={() => { createSession(); setState('collapsed'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              border: 'none',
              background: 'transparent',
              padding: '9px 14px', cursor: 'pointer',
              color: T.secondary,
              fontFamily: FF.sans,
              borderBottom: `0.5px solid ${E[5]}`,
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = ROW_HOVER_BG}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke={ACCENT} strokeWidth={1.5}>
              <path d="M6 2v8M2 6h8" />
            </svg>
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.15 }}>New Session</span>
              <span className="dc-session-command-meta" style={{ font: `500 9px ${FF.mono}`, color: T.dim, lineHeight: 1.15 }}>
                new · 0n
              </span>
            </span>
          </button>

          {/* Session list with date headers */}
          <div className="scroll-fade" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0 10px' }}>
            {groupedSessions.map(group => (
              <div key={group.label}>
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase' as const,
                  color: T.dimSection,
                  fontFamily: FF.mono,
                  padding: '6px 14px 2px',
                }}>
                  {group.label}
                </div>
                {group.items.map(s => (
                  <div
                    className="dc-session-row"
                    data-active={s.id === activeSessionId ? 'true' : 'false'}
                    role="button"
                    tabIndex={0}
                    aria-current={s.id === activeSessionId ? 'true' : undefined}
                    key={s.id}
                    onClick={() => { switchSession(s.id); setState('collapsed'); }}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        switchSession(s.id);
                        setState('collapsed');
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px 8px 14px', cursor: 'pointer',
                      fontSize: 11, fontWeight: 650,
                      color: s.id === activeSessionId ? T.primary : T.tertiary,
                      background: s.id === activeSessionId ? ROW_ACTIVE_BG : 'transparent',
                      borderTop: '0.5px solid rgba(255,255,255,0.04)',
                      boxShadow: s.id === activeSessionId ? 'inset 0 1px 0 rgba(255,255,255,0.035)' : 'none',
                      transition: 'background 180ms ease, color 180ms ease, border-color 180ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = s.id === activeSessionId ? ROW_ACTIVE_BG : ROW_HOVER_BG}
                    onMouseLeave={e => e.currentTarget.style.background = s.id === activeSessionId ? ROW_ACTIVE_BG : 'transparent'}
                  >
                    {s.id === activeSessionId && (
                      <div
                        className="dc-session-row-active-rail"
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          borderRadius: 1,
                          background: ACCENT,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenameTo(s.name);
                          setRenamingSessionId(s.id);
                        }}
                      >
                        <div className={s.phase === 'streaming' ? 'ds-red-pulse' : undefined} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: phaseColor(s.phase), flexShrink: 0,
                          boxShadow: s.phase === 'streaming' ? '0 0 8px rgba(221,0,0,0.72)' : 'none',
                        }} />
                        {renamingSessionId === s.id ? (
                          <input
                            autoFocus
                            style={{
                              background: 'rgba(0,0,0,0.22)',
                              border: `0.5px solid ${E[6]}`,
                              borderRadius: 5,
                              outline: 'none',
                              color: T.secondary,
                              fontSize: 11,
                              fontFamily: FF.sans,
                              width: 190,
                              padding: '3px 5px',
                            }}
                            value={renameTo}
                            onChange={e => setRenameTo(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                commitRename(s.id);
                              }
                              if (e.key === 'Escape') setRenamingSessionId(null);
                            }}
                            onBlur={() => commitRename(s.id)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.name}
                          </span>
                        )}
                      </div>
                      <div className="dc-session-row-meta" style={{ fontSize: 10, color: T.dim, marginTop: 2, paddingLeft: 11, fontFamily: FF.mono }}>
                        {new Date(s.updatedAt).toLocaleDateString()} · {s.phase} · {s.id === activeSessionId ? `${nodeCount}n` : 'saved'}
                      </div>
                    </div>
                    <span
                      className="dc-session-row-state"
                      style={{
                        marginLeft: 8,
                        font: `700 8px ${FF.mono}`,
                        letterSpacing: 0.8,
                        color: s.id === activeSessionId && liveStatus ? ACCENT : T.dim,
                        textTransform: 'uppercase',
                        flex: '0 0 auto',
                      }}
                    >
                      {s.id === activeSessionId ? 'active' : s.phase}
                    </span>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Delete ${s.name}`}
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        onMouseEnter={e => e.currentTarget.style.color = ACCENT}
                        onMouseLeave={e => e.currentTarget.style.color = T.dim}
                        style={{
                          ...iconButtonStyle,
                          color: T.dim,
                          borderRadius: 5,
                        }}
                        title="Delete session"
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
