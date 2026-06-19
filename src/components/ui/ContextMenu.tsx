'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Context Menu
// Right-click menu on nodes. Branch, regenerate, inspect, copy.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import { buildMessages } from '@/lib/context-builder';
import { T, C, FF, FS, R, overlayGlass } from '@/lib/theme';
import { showToast } from '@/components/ui/Toast';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

export function ContextMenu({ x, y, nodeId, onClose }: ContextMenuProps) {
  const setActiveNode = useGraphStore(s => s.setActiveNode);
  const setSelectedNode = useUIStore(s => s.setSelectedNode);
  const setHighlightMode = useUIStore(s => s.setHighlightMode);
  // Select only the specific node — ContextMenu is short-lived so full equality fn not needed
  const node = useGraphStore(s => s.nodes.find(n => n.id === nodeId));
  const edgeCount = useGraphStore(s => s.edges.filter(e => e.from === nodeId).length);
  const isBranchPoint = edgeCount > 1;
  const nodeKind = node?.role === 'ai' ? 'AI node' : node?.role === 'user' ? 'Your node' : 'Node';

  // Entry animation — mount at scale(0.95)/opacity:0, animate to 1
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    // Force initial state
    el.style.opacity = '0';
    el.style.transform = 'scale(0.95)';
    el.style.transition = 'opacity 150ms ease, transform 150ms ease';
    // Trigger transition after first paint via rAF double-pump
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
    });
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Set this node as the active node — the next message typed
    // will branch from here instead of continuing the main thread
    setActiveNode(nodeId);
    setSelectedNode(nodeId);
    onClose();
    // Focus the input bar
    const input = document.querySelector<HTMLInputElement>('.dc-input');
    if (input) input.focus();
  };

  const handleInspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(nodeId);
    onClose();
  };

  const handleLearn = (e: React.MouseEvent) => {
    e.stopPropagation();
    useUIStore.getState().openLearning(nodeId);
    onClose();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node) navigator.clipboard.writeText(node.text);
    showToast('Copied to clipboard');
    onClose();
  };

  const handleSaveMemory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node) return;
    // Build context from ancestral path
    const path = useGraphStore.getState().getAncestralPath(nodeId);
    const contextSummary = path.slice(-3).map(n => `${n.role}: ${n.text.slice(0, 100)}`).join('\n');
    const memory = {
      id: `mem-${Date.now()}`,
      name: node.label || node.text.slice(0, 40),
      content: node.text,
      context: contextSummary,
      tags: [] as string[],
      sourceNodeId: nodeId,
      sourcePathNodeIds: path.map(n => n.id),
      createdAt: Date.now(),
      type: 'node' as const,
    };
    useMemoryStore.getState().addMemory(memory);
    showToast('Saved to memory');
    onClose();
  };

  const handleRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node || node.role !== 'ai') return;
    onClose();

    const { addNode, addEdge, updateNodeText, getAncestralPath, bodies } = useGraphStore.getState();
    const parentId = node.parentId;
    if (!parentId) return;

    const now = Date.now();
    const regenId = `regen-${now}`;
    const selectedModelId = useUIStore.getState().selectedModelId;

    // Position: offset to the right of the original AI node
    const origBody = bodies[node.id];
    const regenPos = {
      x: origBody ? origBody.x + 200 : 540,
      y: origBody ? origBody.y : 190,
    };

    // Create new AI node as sibling
    addNode({
      id: regenId, role: 'ai', type: 'message',
      text: '', label: '...',
      parentId,
      timestamp: now,
      metadata: { model: selectedModelId },
    }, regenPos);

    // Regeneration edge from the same parent user node
    addEdge({
      id: `e-${now}-regen`,
      from: parentId, to: regenId,
      type: 'regeneration', weight: 0.8,
    });

    useGraphStore.getState().setActiveNode(regenId);
    useUIStore.getState().setSelectedNode(regenId);

    // Build context from root to the parent (same prompt, different response)
    const path = getAncestralPath(parentId);
    const { nodes: allNodes, edges: allEdges } = useGraphStore.getState();
    const { system, messages } = buildMessages(path, { allNodes, allEdges });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, model: selectedModelId, temperature: 1.0 }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        updateNodeText(regenId, fullText);
      }
    } catch (err) {
      updateNodeText(regenId, '[Error: regeneration failed]');
      console.error(err);
    }
  };

  const handleShowPaths = (e: React.MouseEvent) => {
    e.stopPropagation();
    const branchPaths = useGraphStore.getState().getBranchPaths(nodeId);
    setHighlightMode({
      type: 'branches',
      branchPointId: nodeId,
      branchPaths,
    });
    onClose();
  };

  return (
    <div
      className="dc-context-menu"
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 200,
        ...overlayGlass,
        borderRadius: R.card,
        padding: 6,
        minWidth: 214,
        fontFamily: FF.sans,
        background:
          [
            'radial-gradient(circle at 18% 0%, rgba(225,225,225,0.055) 0%, rgba(225,225,225,0.018) 29%, transparent 58%)',
            'linear-gradient(180deg, rgba(30,28,25,0.98) 0%, rgba(18,17,15,0.97) 100%)',
          ].join(', '),
        overflow: 'hidden',
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
        opacity: 0,
        transform: 'scale(0.95)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className="dc-context-menu-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '18px minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 8,
          padding: '6px 7px 8px',
          marginBottom: 5,
          borderRadius: R.sm,
          background: 'linear-gradient(180deg, rgba(61,58,53,0.16) 0%, rgba(61,58,53,0.035) 100%)',
          borderBottom: '0.5px solid rgba(61,58,53,0.42)',
        }}
      >
        <span
          className="dc-context-menu-header-icon"
          aria-hidden="true"
          style={{
            width: 18,
            height: 18,
            borderRadius: R.inset,
            border: '0.5px solid rgba(176,176,176,0.22)',
            background: 'rgba(176,176,176,0.045)',
            color: C.branch,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 0 rgba(225,225,225,0.04) inset',
          }}
        >
          <BranchIcon />
        </span>
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: T.primary,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            {node?.label || 'Node actions'}
          </span>
          <span
            className="dc-context-menu-meta"
            style={{
              display: 'block',
              marginTop: 2,
              color: T.dim,
              font: `700 8px ${FF.mono}`,
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nodeKind}
          </span>
        </span>
        <span
          className="dc-context-menu-count"
          style={{
            color: T.dim,
            font: `700 9px ${FF.mono}`,
            letterSpacing: 0.3,
            minWidth: 18,
            height: 18,
            borderRadius: R.inset,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(176,176,176,0.035)',
          }}
        >
          {edgeCount}
        </span>
      </div>
      <MenuItem
        icon={<BranchIcon />}
        label="Branch from here"
        onClick={handleBranch}
        accent
      />
      {isBranchPoint && (
        <MenuItem
          icon={<PathsIcon />}
          label="Show all paths"
          onClick={handleShowPaths}
          accent
          accentColor={T.primary}
        />
      )}
      {node?.role === 'ai' && (
        <MenuItem
          icon={<LearnIcon />}
          label="Learn about this"
          onClick={handleLearn}
          accent
          accentColor={C.learn}
        />
      )}
      {node?.role === 'ai' && (
        <MenuItem
          icon={<RegenIcon />}
          label="Regenerate"
          onClick={handleRegenerate}
        />
      )}
      <MenuDivider />
      <MenuItem
        icon={<MemoryIcon />}
        label="Save as memory"
        onClick={handleSaveMemory}
        accent
        accentColor={C.memory}
      />
      <MenuDivider />
      <MenuItem
        icon={<InspectIcon />}
        label="Inspect"
        onClick={handleInspect}
      />
      <MenuItem
        icon={<CopyIcon />}
        label="Copy text"
        onClick={handleCopy}
      />
    </div>
  );
}

function MenuDivider() {
  return (
    <div
      style={{
        height: 0.5,
        background: 'rgba(61,58,53,0.54)',
        margin: '5px 7px',
        opacity: 0.76,
      }}
    />
  );
}

function MenuItem({ icon, label, onClick, accent, accentColor }: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  accent?: boolean;
  accentColor?: string;
}) {
  const c = accent ? (accentColor || C.branch) : T.secondary;
  const ic = accent ? (accentColor || C.branch) : T.ghost;
  return (
    <button
      className="dc-context-menu-item"
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        width: '100%',
        minHeight: 32,
        padding: '7px 8px',
        borderRadius: R.sm,
        border: 'none',
        background: 'transparent',
        fontFamily: FF.sans,
        fontSize: FS.body,
        fontWeight: 650,
        letterSpacing: 0,
        lineHeight: 1,
        color: c,
        cursor: 'pointer',
        transition: 'background 130ms ease, color 130ms ease, transform 150ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(61,58,53,0.36)';
        e.currentTarget.style.color = T.primary;
        e.currentTarget.style.transform = 'translateX(1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = c;
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          flex: '0 0 18px',
          borderRadius: R.inset,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ic,
          opacity: accent ? 0.94 : 0.82,
          background: 'rgba(176,176,176,0.035)',
          boxShadow: '0 0 0 0.5px rgba(176,176,176,0.12) inset',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
    </button>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3.5 1.5v4.5a2 2 0 002 2H10" /><circle cx="3.5" cy="1.5" r="1" /><circle cx="10" cy="8" r="1" /><path d="M3.5 4.5L6 3" /><circle cx="6" cy="3" r="1" />
    </svg>
  );
}

function RegenIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M1.5 6A4.5 4.5 0 019.8 3.5" /><path d="M10.5 6A4.5 4.5 0 012.2 8.5" /><path d="M9.8 1v2.5H7.3" /><path d="M2.2 11V8.5h2.5" />
    </svg>
  );
}

function InspectIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="6" cy="6" r="4" /><path d="M6 4v2.5h2" />
    </svg>
  );
}

function LearnIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="6" cy="5" r="3.5" /><path d="M6 8.5v2" /><path d="M4 11h4" /><path d="M6 3v1" /><circle cx="6" cy="5.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M6 1v4M4 3l2 2 2-2" /><rect x="2" y="6" width="8" height="4" rx="1" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" /><path d="M2 8.5V2.5a1 1 0 011-1h6" />
    </svg>
  );
}

function PathsIcon() {
  return (
    <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M6 2v3" /><path d="M6 5L3 9" /><path d="M6 5l3 4" /><circle cx="3" cy="9.5" r="1" /><circle cx="9" cy="9.5" r="1" /><circle cx="6" cy="2" r="1" />
    </svg>
  );
}
