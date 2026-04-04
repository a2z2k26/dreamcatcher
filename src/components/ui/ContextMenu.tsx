'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Context Menu
// Right-click menu on nodes. Branch, regenerate, inspect, copy.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import { buildMessages, buildLabel } from '@/lib/context-builder';
import { E, T, C, ACCENT, glassElevated } from '@/lib/theme';
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
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 200,
        ...glassElevated,
        borderRadius: 12,
        padding: 4,
        minWidth: 200,
        fontFamily: 'Inconsolata, monospace',
        opacity: 0,
        transform: 'scale(0.95)',
      }}
      onClick={e => e.stopPropagation()}
    >
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
      <div style={{ height: 1, background: E[5], margin: '4px 8px' }} />
      <MenuItem
        icon={<MemoryIcon />}
        label="Save as memory"
        onClick={handleSaveMemory}
        accent
        accentColor={C.memory}
      />
      <div style={{ height: 1, background: E[5], margin: '4px 8px' }} />
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
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 6,
        fontSize: 12,
        color: c,
        cursor: 'pointer',
        transition: 'background 150ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = E[6])}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', color: ic }}>
        {icon}
      </span>
      {label}
    </div>
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
