'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Search Bar
// Cmd+F graph search. Filters nodes by text, cycles results.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';
import { E, T, ACCENT, glass, FF, FS } from '@/lib/theme';

export function SearchBar() {
  const searchOpen = useUIStore(s => s.searchOpen);
  const searchQuery = useUIStore(s => s.searchQuery);
  const searchResults = useUIStore(s => s.searchResults);
  const searchIndex = useUIStore(s => s.searchIndex);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Run search whenever query changes
  useEffect(() => {
    if (!searchQuery) {
      useUIStore.getState().setSearchResults([]);
      return;
    }
    const lowerQ = searchQuery.toLowerCase();
    const nodes = useGraphStore.getState().nodes;
    const matching = nodes
      .filter(n => n.text.toLowerCase().includes(lowerQ) || n.label.toLowerCase().includes(lowerQ))
      .map(n => n.id);
    useUIStore.getState().setSearchResults(matching);
    useUIStore.getState().setSearchIndex(0);
  }, [searchQuery]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    useUIStore.getState().setSearchQuery(e.target.value);
  }, []);

  const navigateResult = useCallback((direction: 1 | -1) => {
    const { searchResults: results, searchIndex: idx } = useUIStore.getState();
    if (results.length === 0) return;
    const next = (idx + direction + results.length) % results.length;
    useUIStore.getState().setSearchIndex(next);
    // Pan to result
    const nodeId = results[next];
    const body = useGraphStore.getState().bodies[nodeId];
    if (body) {
      useUIStore.getState().animateTo(body.x, body.y);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      useUIStore.getState().setSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      navigateResult(1);
      return;
    }
    if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault();
      navigateResult(-1);
      return;
    }
  }, [navigateResult]);

  if (!searchOpen) return null;

  const totalNodes = useGraphStore.getState().nodes.length;
  const resultCount = searchResults.length;
  const countText = searchQuery
    ? `${resultCount > 0 ? searchIndex + 1 : 0} of ${resultCount} node${resultCount !== 1 ? 's' : ''}`
    : `${totalNodes} nodes`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150,
        ...glass,
        borderRadius: 10,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 280,
        fontFamily: FF.mono,
      }}
    >
      <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke={T.ghost} strokeWidth={1.5}>
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3.5 3.5" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search nodes..."
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: T.primary,
          fontSize: FS.body,
          fontFamily: FF.mono,
        }}
      />
      <span style={{ fontSize: FS.caption, color: T.ghost, whiteSpace: 'nowrap' }}>
        {countText}
      </span>
      <button
        onClick={() => navigateResult(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: T.subtle, display: 'flex', alignItems: 'center',
        }}
      >
        <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2 8l4-4 4 4" />
        </svg>
      </button>
      <button
        onClick={() => navigateResult(1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: T.subtle, display: 'flex', alignItems: 'center',
        }}
      >
        <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>
      <button
        onClick={() => useUIStore.getState().setSearchOpen(false)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: T.ghost, display: 'flex', alignItems: 'center',
        }}
      >
        <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  );
}
