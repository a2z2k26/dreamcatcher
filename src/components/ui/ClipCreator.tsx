'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Clip Creator
// Floating pill above multi-selected nodes. Name and save as
// a subgraph memory clip. Source pattern: Clui CC attachment chips.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import { C, E, T, FF, R, lightGlass } from '@/lib/theme';
import { showToast } from '@/components/ui/Toast';

export function ClipCreator() {
  const selectedNodeIds = useUIStore(s => s.selectedNodeIds);
  const clearMultiSelect = useUIStore(s => s.clearMultiSelect);
  const [naming, setNaming] = useState(false);
  const [clipName, setClipName] = useState('');
  const [prevSelSize, setPrevSelSize] = useState(selectedNodeIds.size);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset naming state when selection clears — derived during render
  // (React docs: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  if (prevSelSize !== selectedNodeIds.size) {
    setPrevSelSize(selectedNodeIds.size);
    if (selectedNodeIds.size === 0) {
      setNaming(false);
      setClipName('');
    }
  }

  // Focus input when naming starts
  useEffect(() => {
    if (naming && inputRef.current) inputRef.current.focus();
  }, [naming]);

  if (selectedNodeIds.size < 2) return null;
  const selectedCount = selectedNodeIds.size;
  const traceDotCount = Math.min(5, Math.max(2, selectedCount));

  const handleClip = () => {
    setNaming(true);
    setClipName(`Clip ${Date.now() % 10000}`);
  };

  const handleSave = () => {
    const name = clipName.trim();
    if (!name) return;

    const { nodes, edges } = useGraphStore.getState().getSubgraph(selectedNodeIds);
    if (nodes.length === 0) return;

    const contentPreview = nodes
      .slice(0, 3)
      .map(n => `${n.role}: ${n.text.slice(0, 60)}`)
      .join('\n');

    useMemoryStore.getState().addMemory({
      id: `clip-${Date.now()}`,
      name,
      content: contentPreview,
      context: `Subgraph clip with ${nodes.length} nodes`,
      tags: [],
      sourceNodeId: nodes[0].id,
      sourcePathNodeIds: nodes.map(n => n.id),
      createdAt: Date.now(),
      type: 'subgraph',
      graphSnapshot: { nodes, edges },
    });

    showToast('Clip saved');
    setNaming(false);
    setClipName('');
    clearMultiSelect();
  };

  // Position: center of viewport, above the canvas tools
  return (
    <div className="dc-clip-creator" style={{
      position: 'fixed',
      bottom: 120,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 80,
      ...lightGlass,
      borderRadius: R.toolPill,
      padding: naming ? '6px 8px 6px 10px' : '5px 6px 5px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      minHeight: 44,
      fontFamily: FF.sans,
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <span
        className="dc-clip-summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          alignItems: 'center',
          columnGap: 7,
          rowGap: 3,
          minWidth: 88,
          paddingRight: 10,
          borderRight: `0.5px solid ${E[5]}`,
        }}
      >
        <span
          className="dc-clip-kind-pill"
          style={{
            font: `700 7.5px ${FF.mono}`,
            letterSpacing: 0.55,
            textTransform: 'uppercase',
            color: C.memory,
            border: '0.5px solid rgba(160,160,160,0.34)',
            borderRadius: R.inset,
            padding: '1px 4px',
            lineHeight: 1.35,
          }}
        >
          Clip
        </span>
        <span
          className="dc-clip-count"
          style={{
            font: `600 10px ${FF.mono}`,
            color: T.tertiary,
            whiteSpace: 'nowrap',
          }}
        >
          {selectedCount} nodes
        </span>
        <span
          className="dc-clip-trace"
          aria-hidden="true"
          style={{
            gridColumn: '1 / -1',
            position: 'relative',
            height: 9,
            borderRadius: R.inset,
            background: 'rgba(255,255,255,0.018)',
            overflow: 'hidden',
          }}
        >
          <span style={{ position: 'absolute', left: 5, right: 5, top: 4, height: 1, background: 'rgba(160,160,160,0.22)' }} />
          {Array.from({ length: traceDotCount }, (_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${7 + (traceDotCount === 1 ? 0 : (i / (traceDotCount - 1)) * 86)}%`,
                top: 3,
                width: 3,
                height: 3,
                borderRadius: selectedCount > 2 && i === traceDotCount - 1 ? R.dense : '50%',
                transform: 'translateX(-50%)',
                background: i === traceDotCount - 1 ? C.memory : E[6],
                border: `0.5px solid ${i === traceDotCount - 1 ? 'rgba(160,160,160,0.5)' : 'rgba(128,128,128,0.32)'}`,
              }}
            />
          ))}
        </span>
      </span>

      {naming ? (
        <>
          <input
            ref={inputRef}
            className="dc-clip-input"
            style={{
              height: 32,
              background: E[2],
              border: `0.5px solid ${E[5]}`,
              borderRadius: R.innerPill,
              padding: '0 12px',
              outline: 'none',
              fontFamily: FF.sans,
              fontSize: 12,
              fontWeight: 600,
              color: T.secondary,
              width: 170,
            }}
            value={clipName}
            onChange={e => setClipName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setNaming(false); setClipName(''); }
            }}
            placeholder="Name this clip..."
          />
          <button
            className="dc-clip-action"
            onClick={handleSave}
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 12px',
              borderRadius: R.innerPill,
              border: '0.5px solid rgba(200,200,200,0.22)',
              background: 'rgba(200,200,200,0.07)',
              color: T.primary,
              fontFamily: FF.sans,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path d="M2 6.2l2.4 2.3L10 3" />
            </svg>
            Save
          </button>
        </>
      ) : (
        <>
          {/* Clip button */}
          <button
            className="dc-clip-action dc-clip-action-primary"
            onClick={handleClip}
            style={{
              height: 32,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '0 12px', borderRadius: R.innerPill,
              border: '0.5px solid rgba(200,200,200,0.22)',
              background: 'rgba(200,200,200,0.07)',
              color: T.secondary,
              fontFamily: FF.sans,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1.5" strokeDasharray="3 2" />
            </svg>
            Clip
          </button>

          {/* Clear button */}
          <button
            className="dc-clip-action dc-clip-action-secondary"
            onClick={clearMultiSelect}
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '0 12px',
              borderRadius: R.innerPill,
              border: `0.5px solid ${E[5]}`,
              background: 'transparent',
              color: T.subtle,
              fontFamily: FF.sans,
              fontSize: 11,
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path d="M8.5 3.5l-5 5M3.5 3.5l5 5" />
            </svg>
            Clear
          </button>
        </>
      )}
    </div>
  );
}
