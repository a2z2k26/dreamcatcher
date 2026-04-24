'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Branch Preview Popover
// Shows a compact list of branches from a branch point on hover.
// Source pattern: Claude Island's session list.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { E, T, C, ACCENT, glass } from '@/lib/theme';

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
      style={{
        position: 'fixed',
        left: x,
        top: y - 8, // position above the cursor
        transform: 'translateX(-50%) translateY(-100%)',
        zIndex: 100,
        ...glass,
        borderRadius: 10,
        padding: 6,
        minWidth: 240,
        maxWidth: 320,
      }}
      onMouseLeave={() => useUIStore.getState().setBranchPreview(null)}
    >
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
        textTransform: 'uppercase' as const, color: T.ghost,
        padding: '4px 8px 6px',
      }}>
        {branchEntries.length} branch{branchEntries.length !== 1 ? 'es' : ''}
      </div>

      {branchEntries.map(([leafId, pathIds], idx) => {
        // Get the first user message on this branch
        const firstNode = nodes.find(n => n.id === pathIds[0]);
        const leafNode = nodes.find(n => n.id === leafId);
        const label = firstNode?.label || firstNode?.text.slice(0, 40) || 'Empty branch';
        const count = pathIds.length;
        const ago = leafNode ? formatAgo(now - leafNode.timestamp) : '';
        const isStale = leafNode ? (now - leafNode.timestamp) > 5 * 60 * 1000 : false;

        return (
          <div
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
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 2,
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${E[7]}40`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              fontSize: 13, fontWeight: 500, color: T.secondary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 10, color: T.dim,
              display: 'flex', gap: 8, marginTop: 2,
              fontFamily: "'Inconsolata', monospace",
            }}>
              <span>{count} node{count !== 1 ? 's' : ''}</span>
              <span>{ago}</span>
              {isStale && <span style={{ color: T.ghost }}>stale</span>}
            </div>
          </div>
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
