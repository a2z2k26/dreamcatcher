'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Branch Preview Popover
// Shows a compact list of branches from a branch point on hover.
// Source pattern: Claude Island's session list.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { C, E, T, FF, R, overlayGlass } from '@/lib/theme';

type BranchPreviewState = NonNullable<ReturnType<typeof useUIStore.getState>['branchPreview']>;

// Inner component — mounts when popover opens, unmounts when it closes.
// Snapshots Date.now() via a lazy useState initializer — one-time init is
// React-19-pure (react-hooks/purity doesn't flag useState initializers).
function BranchPreviewContent({ branchPreview }: { branchPreview: BranchPreviewState }) {
  const nodes = useGraphStore(s => s.nodes);
  const setActiveNode = useGraphStore(s => s.setActiveNode);
  const setSelectedNode = useUIStore(s => s.setSelectedNode);
  const animateTo = useUIStore(s => s.animateTo);
  const [now] = useState(() => Date.now());

  const { nodeId, x, y } = branchPreview;
  const branches = useGraphStore.getState().getBranchPaths(nodeId);
  const branchEntries = Object.entries(branches);
  if (branchEntries.length === 0) return null;

  return (
    <div
      className="dc-branch-preview"
      style={{
        position: 'fixed',
        left: x,
        top: y - 8, // position above the cursor
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 100,
        ...overlayGlass,
        borderRadius: R.overlay,
        padding: 8,
        minWidth: 266,
        maxWidth: 320,
        background: 'linear-gradient(180deg, rgba(30,28,25,0.98) 0%, rgba(19,18,15,0.96) 100%)',
        borderTopColor: 'rgba(61,58,53,0.66)',
        borderLeftColor: 'rgba(44,42,38,0.48)',
        borderRightColor: 'rgba(44,42,38,0.40)',
        borderBottomColor: 'rgba(8,7,6,0.78)',
        boxShadow: [
          '0 1px 0 rgba(225,225,225,0.05) inset',
          '0 0 0 0.5px rgba(61,58,53,0.30)',
          '0 18px 42px rgba(0,0,0,0.58)',
          '0 2px 8px rgba(0,0,0,0.36)',
        ].join(', '),
        fontFamily: FF.sans,
      }}
      onMouseLeave={() => useUIStore.getState().setBranchPreview(null)}
    >
      <div
        className="dc-branch-preview-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '3px 4px 8px',
          borderBottom: `0.5px solid ${E[4]}`,
          marginBottom: 7,
        }}
      >
        <span
          className="dc-branch-preview-header-icon"
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: R.inset,
            border: '0.5px solid rgba(176,176,176,0.26)',
            background: 'rgba(176,176,176,0.05)',
            color: C.branch,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <svg viewBox="0 0 14 14" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3.5h2.1c1.5 0 2.2.7 2.2 2.2v2.6" />
            <path d="M7.3 6.2c.5-1 1.3-1.5 2.5-1.5H11" />
            <path d="M9.8 3.5 11 4.7 9.8 5.9" />
            <path d="M6.1 7.2 7.3 8.4l1.2-1.2" />
            <circle cx="2.6" cy="3.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span style={{
          fontFamily: FF.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.1,
          textTransform: 'uppercase' as const, color: T.ghost,
        }}>
          Branch comparison
        </span>
        <span style={{ marginLeft: 'auto', font: `700 9px ${FF.mono}`, color: T.dim }}>
          {branchEntries.length}
        </span>
      </div>

      {branchEntries.map(([leafId, pathIds], index) => {
        // Get the first user message on this branch
        const firstNode = nodes.find(n => n.id === pathIds[0]);
        const leafNode = nodes.find(n => n.id === leafId);
        const label = firstNode?.label || firstNode?.text.slice(0, 40) || 'Empty branch';
        const count = pathIds.length;
        const traceDotCount = Math.min(4, Math.max(2, count));
        const ago = leafNode ? formatAgo(now - leafNode.timestamp) : '';
        const isStale = leafNode ? (now - leafNode.timestamp) > 5 * 60 * 1000 : false;

        return (
          <button
            className="dc-branch-preview-row"
            type="button"
            key={leafId}
            onClick={() => {
              setActiveNode(leafId);
              setSelectedNode(leafId);
              // Auto-pan to the leaf
              const body = useGraphStore.getState().bodies[leafId];
              if (body) animateTo(body.x, body.y);
              useUIStore.getState().setBranchPreview(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              minHeight: 68,
              padding: '9px 10px',
              borderRadius: R.card,
              border: '0.5px solid rgba(128,128,128,0.16)',
              background: 'rgba(255,255,255,0.022)',
              cursor: 'pointer',
              margin: index === 0 ? 0 : '7px 0 0',
              textAlign: 'left',
              fontFamily: FF.sans,
              boxShadow: '0 1px 0 rgba(255,255,255,0.024) inset',
              transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
              appearance: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(176,176,176,0.26)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.022)';
              e.currentTarget.style.borderColor = 'rgba(128,128,128,0.16)';
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 7 }}>
              <span
                className="dc-branch-preview-tag"
                style={{
                  font: `700 7.5px ${FF.mono}`,
                  letterSpacing: 0.55,
                  textTransform: 'uppercase',
                  color: index === 0 ? C.branch : T.ghost,
                  border: `0.5px solid ${index === 0 ? 'rgba(176,176,176,0.36)' : 'rgba(96,96,96,0.34)'}`,
                  borderRadius: R.inset,
                  padding: '1px 4px',
                  lineHeight: 1.35,
                }}
              >
                ALT {String(index + 1).padStart(2, '0')}
              </span>
              <div
                className="dc-branch-preview-label"
                style={{
                  fontFamily: FF.sans,
                  fontSize: 13,
                  fontWeight: 650,
                  color: T.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </div>
            <div
              className="dc-branch-preview-meta"
              style={{
                fontFamily: FF.mono,
                fontSize: 9,
                fontWeight: 500,
                color: T.dim,
                display: 'flex',
                gap: 8,
                marginTop: 3,
              }}
            >
              <span>{count} node{count !== 1 ? 's' : ''}</span>
              <span>{ago}</span>
              {isStale && <span style={{ color: T.ghost }}>stale</span>}
            </div>
            <div
              className="dc-branch-preview-trace"
              aria-hidden="true"
              style={{
                position: 'relative',
                height: 12,
                marginTop: 8,
                borderRadius: R.inset,
                background: 'rgba(255,255,255,0.018)',
                overflow: 'hidden',
              }}
            >
              <span style={{ position: 'absolute', left: 8, right: 8, top: 5.5, height: 1, background: 'rgba(176,176,176,0.24)' }} />
              {Array.from({ length: traceDotCount }, (_, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${8 + (traceDotCount === 1 ? 0 : (i / (traceDotCount - 1)) * 84)}%`,
                    top: i === 0 || i === traceDotCount - 1 ? 4 : 4.5,
                    width: i === traceDotCount - 1 ? 4 : 3,
                    height: i === traceDotCount - 1 ? 4 : 3,
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    background: i === traceDotCount - 1 ? C.branch : E[6],
                    border: `0.5px solid ${i === traceDotCount - 1 ? 'rgba(176,176,176,0.54)' : 'rgba(128,128,128,0.34)'}`,
                  }}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function BranchPreview() {
  const branchPreview = useUIStore(s => s.branchPreview);
  if (!branchPreview) return null;
  // Keyed so Date.now() snapshot refreshes each time a new popover opens
  return <BranchPreviewContent key={branchPreview.nodeId} branchPreview={branchPreview} />;
}

function formatAgo(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
