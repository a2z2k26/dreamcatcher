'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Clip Creator
// Floating pill above multi-selected nodes. Name and save as
// a subgraph memory clip. Source pattern: Clui CC attachment chips.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import { E, T, C, ACCENT, glass } from '@/lib/theme';
import { showToast } from '@/components/ui/Toast';

export function ClipCreator() {
  const selectedNodeIds = useUIStore(s => s.selectedNodeIds);
  const clearMultiSelect = useUIStore(s => s.clearMultiSelect);
  const [naming, setNaming] = useState(false);
  const [clipName, setClipName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when naming starts
  useEffect(() => {
    if (naming && inputRef.current) inputRef.current.focus();
  }, [naming]);

  // Reset naming state when selection clears
  useEffect(() => {
    if (selectedNodeIds.size === 0) {
      setNaming(false);
      setClipName('');
    }
  }, [selectedNodeIds.size]);

  if (selectedNodeIds.size < 2) return null;

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
    <div style={{
      position: 'fixed',
      bottom: 120,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 80,
      ...glass,
      borderRadius: 12,
      padding: naming ? '8px 14px' : '6px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Node count */}
      <span style={{ fontSize: 13, color: T.tertiary }}>
        {selectedNodeIds.size} nodes
      </span>

      {naming ? (
        <>
          <input
            ref={inputRef}
            style={{
              background: E[4], border: `1px solid ${E[6]}`, borderRadius: 6,
              padding: '8px 12px', outline: 'none',
              fontSize: 13, color: T.secondary,
              width: 160,
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
            onClick={handleSave}
            style={{
              padding: '8px 12px', borderRadius: 4,
              border: `1px solid ${C.memory}40`,
              background: `${C.memory}10`,
              color: C.memory, fontSize: 11,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Save
          </button>
        </>
      ) : (
        <>
          {/* Clip button */}
          <button
            onClick={handleClip}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 12px', borderRadius: 4,
              border: `1px solid ${C.memory}40`,
              background: `${C.memory}10`,
              color: C.memory, fontSize: 11,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="2" width="8" height="8" rx="1.5" strokeDasharray="3 2" />
            </svg>
            Clip
          </button>

          {/* Clear button */}
          <button
            onClick={clearMultiSelect}
            style={{
              padding: '8px 12px', borderRadius: 4,
              border: `1px solid ${E[6]}`, background: E[4],
              color: T.dim, fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
