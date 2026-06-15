'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Search Bar
// Cmd+F graph search. Filters nodes by text, cycles results.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';
import { E, T, ACCENT, FF, FS, R, heavyGlass, overlayGlass } from '@/lib/theme';

type SearchFilter = 'all' | 'user' | 'ai' | 'clip' | 'branch';

const SEARCH_FILTERS: readonly { id: SearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'user', label: 'You' },
  { id: 'ai', label: 'AI' },
  { id: 'clip', label: 'Clips' },
  { id: 'branch', label: 'Branches' },
];

export function SearchBar() {
  const searchOpen = useUIStore(s => s.searchOpen);
  const searchQuery = useUIStore(s => s.searchQuery);
  const searchResults = useUIStore(s => s.searchResults);
  const searchIndex = useUIStore(s => s.searchIndex);
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
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
    const { nodes, edges } = useGraphStore.getState();
    const branchNodeIds = new Set(edges.filter(edge => edge.type === 'branch').map(edge => edge.to));
    const matching = nodes
      .filter(n => {
        if (searchFilter === 'branch' && !branchNodeIds.has(n.id)) return false;
        if (searchFilter === 'clip' && n.type !== 'clip') return false;
        if ((searchFilter === 'user' || searchFilter === 'ai') && n.role !== searchFilter) return false;
        return n.text.toLowerCase().includes(lowerQ) || n.label.toLowerCase().includes(lowerQ);
      })
      .map(n => n.id);
    useUIStore.getState().setSearchResults(matching);
    useUIStore.getState().setSearchIndex(0);
  }, [searchQuery, searchFilter]);

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

  const selectResult = useCallback((nodeId: string) => {
    const body = useGraphStore.getState().bodies[nodeId];
    useGraphStore.getState().setActiveNode(nodeId);
    useUIStore.getState().setSelectedNode(nodeId);
    if (body) useUIStore.getState().animateTo(body.x, body.y);
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
  const branchNodeIds = new Set(edges.filter(edge => edge.type === 'branch').map(edge => edge.to));
  const filterCounts: Record<SearchFilter, number> = {
    all: nodes.length,
    user: nodes.filter(node => node.role === 'user').length,
    ai: nodes.filter(node => node.role === 'ai').length,
    clip: nodes.filter(node => node.type === 'clip').length,
    branch: nodes.filter(node => branchNodeIds.has(node.id)).length,
  };
  const resultNodes = searchResults
    .map(id => nodes.find(node => node.id === id))
    .filter(node => node !== undefined);
  const countText = searchQuery
    ? `${resultCount > 0 ? searchIndex + 1 : 0} / ${resultCount}`
    : `${totalNodes} nodes`;

  return (
    <div
      className="dc-search-panel"
      style={{
        position: 'fixed',
        top: 58,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        width: 'min(480px, calc(100vw - 24px))',
        fontFamily: FF.sans,
      }}
    >
      <div
        className="dc-search-bar"
        style={{
          ...heavyGlass,
          height: 40,
          borderRadius: 10,
          padding: '0 10px 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderTopColor: 'rgba(221,0,0,0.38)',
          borderLeftColor: 'rgba(221,0,0,0.14)',
          borderRightColor: 'rgba(61,58,53,0.45)',
          boxShadow: [
            '0 0 0 1px rgba(221,0,0,0.08)',
            '0 0 18px -6px rgba(221,0,0,0.22)',
            '0 12px 32px rgba(0,0,0,0.55)',
            'inset 0 1px 0 rgba(255,255,255,0.05)',
          ].join(', '),
        }}
      >
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke={T.ghost} strokeWidth={1.5}>
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11l3.5 3.5" />
        </svg>
        <input
          ref={inputRef}
          className="dc-search-input"
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes, branches, clips..."
          style={{
            flex: 1,
            minWidth: 0,
            height: 38,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: T.primary,
            fontSize: FS.body,
            fontFamily: FF.sans,
            fontWeight: 600,
          }}
        />
        <span className="dc-search-count" style={{ font: `600 10px ${FF.mono}`, color: T.ghost, whiteSpace: 'nowrap' }}>
          {countText}
        </span>
        <button
          aria-label="Previous search result"
          onClick={() => navigateResult(-1)}
          style={{
            width: 24, height: 24, background: 'rgba(255,255,255,0.035)', border: `0.5px solid ${E[5]}`, borderRadius: 6, cursor: 'pointer', padding: 2,
            color: T.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 8l4-4 4 4" />
          </svg>
        </button>
        <button
          aria-label="Next search result"
          onClick={() => navigateResult(1)}
          style={{
            width: 24, height: 24, background: 'rgba(255,255,255,0.035)', border: `0.5px solid ${E[5]}`, borderRadius: 6, cursor: 'pointer', padding: 2,
            color: T.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
        <button
          aria-label="Close search"
          onClick={() => useUIStore.getState().setSearchOpen(false)}
          style={{
            width: 24, height: 24, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
            color: T.ghost, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>

      <div
        className="dc-search-results"
        style={{
          ...overlayGlass,
          marginTop: 6,
          borderRadius: 10,
          overflow: 'hidden',
          maxHeight: 'min(310px, calc(100vh - 146px))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="dc-search-filter-row"
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 12px',
            borderBottom: `0.5px solid ${E[5]}`,
            overflowX: 'auto',
          }}
        >
          {SEARCH_FILTERS.map(filter => {
            const active = searchFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                className="dc-search-filter-chip"
                data-active={active ? 'true' : 'false'}
                onClick={() => setSearchFilter(filter.id)}
                style={{
                  flex: '0 0 auto',
                  height: 22,
                  padding: '0 9px',
                  borderRadius: R.pill,
                  border: active ? '0.5px solid rgba(221,0,0,0.42)' : `0.5px solid ${E[6]}`,
                  background: active ? 'rgba(221,0,0,0.085)' : 'transparent',
                  color: active ? ACCENT : T.subtle,
                  font: `600 10px ${FF.mono}`,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{filter.label}</span>
                <span style={{ color: active ? 'rgba(221,0,0,0.62)' : T.dim }}>
                  {filterCounts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ overflowY: 'auto', padding: '5px 0' }}>
          {searchQuery && resultNodes.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: T.ghost }}>
              No matching nodes
            </div>
          ) : (
            resultNodes.slice(0, 6).map((node, idx) => {
              const active = idx === searchIndex;
              const excerpt = node.text.length > 96 ? `${node.text.slice(0, 96)}...` : node.text;
              return (
                <button
                  key={node.id}
                  type="button"
                  className="dc-search-result-row"
                  data-active={active ? 'true' : 'false'}
                  onClick={() => selectResult(node.id)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    border: 'none',
                    background: active ? 'rgba(26,24,22,0.58)' : 'transparent',
                    color: active ? T.primary : T.secondary,
                    padding: '8px 13px 8px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    columnGap: 10,
                    rowGap: 2,
                  }}
                >
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 650 }}>
                    {node.label}
                  </span>
                  <span style={{ font: `600 9px ${FF.mono}`, color: node.role === 'user' ? T.tertiary : T.ghost, textTransform: 'uppercase' }}>
                    {node.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span style={{ gridColumn: '1 / -1', color: T.ghost, fontSize: 11, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {excerpt}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
