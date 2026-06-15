'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useGraphStore, type LayoutBounds } from '@/stores/graph-store';
import { useMemoryStore } from '@/stores/memory-store';
import { useSessionStore } from '@/stores/session-store';
import { useUIStore } from '@/stores/ui-store';
import { showToast } from '@/components/ui/Toast';
import { MODELS, getModel } from '@/lib/models';
import { E, T, ACCENT, FF, C } from '@/lib/theme';

function rankFor(score: number): string {
  if (score >= 120) return 'Oracle';
  if (score >= 70) return 'Architect';
  if (score >= 38) return 'Cartographer';
  if (score >= 18) return 'Forager';
  return 'Seedling';
}

function fitCleanedLayout(bounds: LayoutBounds, timelineOpen: boolean) {
  if (typeof window === 'undefined') return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalPad = viewportWidth < 760 ? 42 : 112;
  const topPad = 74;
  const bottomPad = timelineOpen ? 252 : 156;
  const availableWidth = Math.max(320, viewportWidth - horizontalPad * 2);
  const availableHeight = Math.max(220, viewportHeight - topPad - bottomPad);
  const scaleX = availableWidth / Math.max(bounds.width, 1);
  const scaleY = availableHeight / Math.max(bounds.height, 1);
  const nextScale = Math.min(1.18, Math.max(0.24, Math.min(scaleX, scaleY)));
  const centerY = topPad + availableHeight / 2;

  useUIStore.getState().setTransform(
    nextScale,
    viewportWidth / 2 - bounds.centerX * nextScale,
    centerY - bounds.centerY * nextScale
  );
}

function Icon({ name, size = 14, stroke = T.tertiary }: { name: 'memory' | 'search' | 'timeline' | 'chevron' | 'grid' | 'cleanup'; size?: number; stroke?: string }) {
  const paths = {
    memory: (
      <>
        <path d="M12 3a6 6 0 0 1 6 6c0 2.1-1 3.3-2.1 4.4-.8.8-1.3 1.5-1.3 2.6v.6a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1V16c0-1.1-.5-1.8-1.3-2.6C7 12.3 6 11.1 6 9a6 6 0 0 1 6-6Z" />
        <path d="M9.5 20h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    timeline: (
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <circle cx="4" cy="6" r="1.2" />
        <circle cx="4" cy="12" r="1.2" />
        <circle cx="4" cy="18" r="1.2" />
      </>
    ),
    chevron: <path d="m7 9 5 5 5-5" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    cleanup: (
      <>
        <circle cx="6" cy="7" r="1.8" />
        <circle cx="18" cy="7" r="1.8" />
        <circle cx="6" cy="17" r="1.8" />
        <circle cx="18" cy="17" r="1.8" />
        <path d="M7.8 7h8.4M7.8 17h8.4M6 8.8v6.4M18 8.8v6.4" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={stroke} strokeWidth={1.55} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function chromeButton(active: boolean): CSSProperties {
  return {
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: active ? T.primary : T.tertiary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '0 9px',
    transition: 'background 150ms ease, color 150ms ease',
  };
}

function framedChromeButton(active: boolean, disabled = false): CSSProperties {
  return {
    ...chromeButton(active),
    height: 36,
    minWidth: 36,
    borderRadius: 10,
    border: `0.5px solid ${active ? 'rgba(221,0,0,0.34)' : E[5]}`,
    background: active
      ? 'linear-gradient(180deg, rgba(35,31,27,0.88) 0%, rgba(16,15,13,0.82) 100%)'
      : 'rgba(14,13,11,0.62)',
    color: active ? T.primary : T.tertiary,
    boxShadow: active
      ? '0 1px 0 rgba(255,255,255,0.045) inset, 0 0 14px rgba(221,0,0,0.11)'
      : '0 1px 0 rgba(255,255,255,0.035) inset',
    opacity: disabled ? 0.36 : 1,
    cursor: disabled ? 'default' : 'pointer',
  };
}

function metricPill(children: ReactNode, title: string): ReactNode {
  return (
    <div
      title={title}
      className="dc-cockpit-metric"
      style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '0 15px',
        borderRadius: 10,
        background: 'rgba(14,13,11,0.62)',
        border: `0.5px solid ${E[5]}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.035) inset',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

export function CockpitChrome() {
  const [modelOpen, setModelOpen] = useState(false);
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const memories = useMemoryStore(s => s.memories);
  const shelfOpen = useMemoryStore(s => s.shelfOpen);
  const setShelfOpen = useMemoryStore(s => s.setShelfOpen);
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const activeSession = useSessionStore(s => s.sessions.find(session => session.id === activeSessionId));
  const timelineOpen = useUIStore(s => s.timelineOpen);
  const searchOpen = useUIStore(s => s.searchOpen);
  const selectedModelId = useUIStore(s => s.selectedModelId);
  const setSearchOpen = useUIStore(s => s.setSearchOpen);
  const selectedModel = getModel(selectedModelId);

  const branchCount = edges.filter(edge => edge.type === 'branch').length;
  const regenerationCount = edges.filter(edge => edge.type === 'regeneration').length;
  const clipCount = edges.filter(edge => edge.type === 'clips_to').length;
  const tokenCount = nodes.reduce((total, node) => total + (node.metadata.tokens ?? 0), 0);
  const rarityScore = nodes.length * 2 + branchCount * 4 + regenerationCount * 3 + clipCount * 4 + memories.length * 4;
  const rank = rankFor(rarityScore);
  const phase = activeSession?.phase ?? 'empty';
  const phaseColor = phase === 'streaming' ? ACCENT : phase === 'waiting' ? T.secondary : T.ghost;

  const toggleMemory = () => setShelfOpen(!shelfOpen);
  const toggleSearch = () => setSearchOpen(!searchOpen);
  const cleanUpLayout = () => {
    const bounds = useGraphStore.getState().cleanupLayout();
    if (!bounds) return;
    setModelOpen(false);
    fitCleanedLayout(bounds, timelineOpen);
    showToast('Layout cleaned up');
  };

  return (
    <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, zIndex: 65, fontFamily: FF.sans }}>
      <div
        className="dc-cockpit-topbar"
        data-phase={phase}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          background: [
            'radial-gradient(360px 72px at 50% 0%, rgba(255,255,255,0.045), transparent 72%)',
            'linear-gradient(180deg, rgba(24,20,16,0.88) 0%, rgba(12,11,9,0.79) 100%)',
          ].join(', '),
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `0.5px solid ${E[5]}`,
          boxShadow: '0 1px 0 rgba(255,255,255,0.035) inset, 0 14px 34px rgba(0,0,0,0.28)',
          pointerEvents: 'auto',
        }}
      >
        <div className="dc-cockpit-left" style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <button
            type="button"
            className="dc-memory-button dc-chrome-icon-button"
            data-active={shelfOpen ? 'true' : 'false'}
            title="Memories"
            aria-label="Memories"
            onClick={toggleMemory}
            style={{
              ...framedChromeButton(shelfOpen),
              padding: '0 12px',
              gap: 8,
            }}
            onMouseEnter={event => { if (!shelfOpen) event.currentTarget.style.background = 'rgba(34,31,27,0.72)'; }}
            onMouseLeave={event => { if (!shelfOpen) event.currentTarget.style.background = 'rgba(14,13,11,0.62)'; }}
          >
            <Icon name="memory" stroke={shelfOpen ? T.primary : memories.length > 0 ? C.memory : T.ghost} />
            <span style={{ font: `600 10px ${FF.mono}`, color: memories.length > 0 ? C.memory : T.ghost }}>{memories.length}</span>
          </button>
          <button
            type="button"
            className="dc-search-button dc-chrome-icon-button"
            data-active={searchOpen ? 'true' : 'false'}
            title="Search"
            aria-label="Search"
            onClick={toggleSearch}
            style={{
              ...framedChromeButton(searchOpen),
              width: 36,
              padding: 0,
            }}
            onMouseEnter={event => { if (!searchOpen) event.currentTarget.style.background = 'rgba(34,31,27,0.72)'; }}
            onMouseLeave={event => { if (!searchOpen) event.currentTarget.style.background = 'rgba(14,13,11,0.62)'; }}
          >
            <Icon name="search" stroke={searchOpen ? T.primary : T.tertiary} />
          </button>
          <button
            type="button"
            className="dc-cleanup-button dc-chrome-icon-button"
            data-active="false"
            title="Clean up layout"
            aria-label="Clean up layout"
            disabled={nodes.length === 0}
            onClick={cleanUpLayout}
            style={{
              ...framedChromeButton(false, nodes.length === 0),
              width: 36,
              padding: 0,
            }}
            onMouseEnter={event => { if (nodes.length > 0) event.currentTarget.style.background = 'rgba(34,31,27,0.72)'; }}
            onMouseLeave={event => { event.currentTarget.style.background = 'rgba(14,13,11,0.62)'; }}
          >
            <Icon name="cleanup" stroke={nodes.length > 0 ? T.tertiary : T.dim} />
          </button>
        </div>

        <div className="dc-cockpit-right" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {metricPill(
            <>
              <span style={{ font: `700 11px ${FF.mono}`, color: ACCENT }}>+ {rarityScore}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.tertiary }}>{rank}</span>
            </>,
            'Rarity score'
          )}
          <button
            type="button"
            className="dc-timeline-button dc-chrome-icon-button"
            data-active={timelineOpen ? 'true' : 'false'}
            title="Timeline"
            aria-label="Timeline"
            onClick={() => useUIStore.getState().toggleTimeline()}
            style={{
              ...framedChromeButton(timelineOpen),
              width: 36,
              padding: 0,
            }}
          >
            <Icon name="timeline" stroke={timelineOpen ? T.primary : T.tertiary} />
          </button>
          <div style={{ position: 'relative' }}>
            <button
	              type="button"
	              className="dc-model-selector-button"
	              title="Model"
	              aria-label="Model"
	              aria-haspopup="listbox"
	              aria-expanded={modelOpen}
              onClick={() => setModelOpen(open => !open)}
              style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                borderRadius: 10,
                cursor: 'pointer',
                background: 'linear-gradient(180deg, rgba(30,28,25,0.92) 0%, rgba(14,13,11,0.82) 100%)',
                border: `0.5px solid rgba(61,58,53,0.72)`,
                color: T.secondary,
                boxShadow: '0 1px 0 rgba(255,255,255,0.045) inset, 0 6px 18px rgba(0,0,0,0.34)',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 9999, background: selectedModel.color, boxShadow: `0 0 7px ${selectedModel.color}80` }} />
              <span className="dc-cockpit-model-name" style={{ fontSize: 12, fontWeight: 600 }}>{selectedModel.provider === 'Anthropic' ? 'Claude' : selectedModel.name}</span>
              <Icon name="chevron" size={12} stroke={T.subtle} />
            </button>
            {modelOpen && (
              <div
                className="dc-model-menu"
                role="listbox"
                aria-label="Model"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 7,
                  minWidth: 252,
                  padding: 7,
                  borderRadius: 12,
                  background: [
                    'linear-gradient(180deg, rgba(30,28,25,0.97) 0%, rgba(13,12,10,0.96) 100%)',
                  ].join(', '),
                  border: `1px solid ${E[5]}`,
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 42px rgba(0,0,0,0.64), 0 0 0 0.5px rgba(255,255,255,0.025)',
                }}
              >
                <div
                  className="dc-model-menu-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '3px 7px 8px',
                    borderBottom: `0.5px solid ${E[5]}`,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ font: `700 9px ${FF.mono}`, letterSpacing: 1.2, color: ACCENT, textTransform: 'uppercase' }}>Model</span>
                  <span style={{ font: `500 9px ${FF.mono}`, color: T.ghost }}>{MODELS.length} providers</span>
                </div>
                {MODELS.map(model => (
                  <button
                    type="button"
                      className="dc-model-option"
	                    role="option"
	                    aria-selected={model.id === selectedModelId}
                      data-selected={model.id === selectedModelId ? 'true' : 'false'}
	                    key={model.id}
                    onClick={() => {
                      useUIStore.getState().setSelectedModel(model.id);
                      setModelOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      minHeight: 46,
                      padding: '8px 9px 8px 12px',
                      cursor: 'pointer',
                      background: model.id === selectedModelId ? 'rgba(255,255,255,0.051)' : 'transparent',
                      border: '0.5px solid transparent',
                      borderRadius: 4,
                      position: 'relative',
                      boxShadow: 'none',
                    }}
                    onMouseEnter={event => { if (model.id !== selectedModelId) event.currentTarget.style.background = 'rgba(61,58,53,0.30)'; }}
                    onMouseLeave={event => { if (model.id !== selectedModelId) event.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 9999, background: model.color, boxShadow: `0 0 8px ${model.color}80`, flex: '0 0 auto' }} />
                    <span
                      className="dc-model-option-copy"
                      style={{
                        minWidth: 0,
                        flex: '1 1 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2,
                      }}
                    >
                      <span className="dc-model-option-name" style={{ fontSize: 12, fontWeight: 600, color: model.id === selectedModelId ? T.primary : T.secondary, lineHeight: 1.2 }}>{model.name}</span>
                      <span className="dc-model-option-meta" style={{ font: `500 9px ${FF.mono}`, color: model.id === selectedModelId ? T.ghost : T.dim, lineHeight: 1.2 }}>
                        {model.provider} · {model.id.split('/')[0]}
                      </span>
                    </span>
                    {model.id === selectedModelId && (
                      <span
                        className="dc-model-option-selected"
                        style={{
                          flex: '0 0 auto',
                          font: `700 8px ${FF.mono}`,
                          letterSpacing: 0.8,
                          color: ACCENT,
                          textTransform: 'uppercase',
                        }}
                      >
                        active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="dc-cockpit-statusbar"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: E[0],
          borderTop: `1px solid ${E[4]}`,
          pointerEvents: 'none',
        }}
      >
	        <div className="dc-cockpit-status-left" style={{ display: 'flex', alignItems: 'center', gap: 8, font: `400 9px ${FF.mono}`, color: T.dim }}>
	          <span style={{ width: 6, height: 6, borderRadius: 9999, background: selectedModel.color }} />
	          <span>{selectedModel.provider === 'Anthropic' ? 'Claude' : selectedModel.name}</span>
	          <span style={{ color: E[6] }}>|</span>
	          <span className={phase === 'streaming' || phase === 'waiting' ? 'ds-red-pulse' : undefined} style={{ width: 5, height: 5, borderRadius: 9999, background: phaseColor }} />
	          <span style={{ color: phaseColor }}>{phase}</span>
	        </div>
	        <div className="dc-cockpit-status-right" style={{ display: 'flex', alignItems: 'center', gap: 8, font: `400 9px ${FF.mono}`, color: T.dim }}>
	          <span>{nodes.length} nodes</span>
	          <span className="dc-status-divider" style={{ color: E[6] }}>|</span>
	          <span>{edges.length} edges</span>
	          <span className="dc-status-divider dc-status-wide" style={{ color: E[6] }}>|</span>
	          <span className="dc-status-wide">~{tokenCount || nodes.length * 90} tok</span>
	          <span className="dc-status-divider" style={{ color: E[6] }}>|</span>
	          <span style={{ color: ACCENT }}>+ {rarityScore}</span>
	          <span className="dc-status-rank" style={{ color: T.ghost }}>{rank}</span>
	        </div>
      </div>
    </div>
  );
}
