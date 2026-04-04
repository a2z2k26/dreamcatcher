'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Floating UI Layer
// All chrome floats on the canvas — no opaque bars.
// Glass-effect panels that feel part of the environment.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { MODELS, getModel } from '@/lib/models';
import { buildMessages, buildLabel } from '@/lib/context-builder';
import { E, T, C, ACCENT, glass } from '@/lib/theme';

// Warm hover highlight
const hoverBg = `${E[7]}60`;

export function FloatingUI() {
  return (
    <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <TopControls />
      <CanvasTools />
      <FloatingInput />
    </div>
  );
}

// ── Top: Right-side controls (model selector + timeline toggle) ──
// Session management moved to SessionPill component
function TopControls() {
  const [modelOpen, setModelOpen] = useState(false);
  const selectedModelId = useUIStore(s => s.selectedModelId);
  const setSelectedModel = useUIStore(s => s.setSelectedModel);
  const model = getModel(selectedModelId);

  return (
    <div className="pointer-events-auto" style={{
      position: 'absolute', top: 12, right: 12,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {/* Timeline toggle */}
      <button
        onClick={() => useUIStore.getState().toggleTimeline()}
        style={{
          ...glass, borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', color: T.ghost, fontSize: 11,
        }}
        title="Toggle timeline (L)"
      >
        <svg viewBox="0 0 12 12" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.2}>
          <path d="M2 3h8M2 6h6M2 9h4" />
        </svg>
      </button>

      {/* Model Selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setModelOpen(!modelOpen)}
          style={{
            ...glass, borderRadius: 8, padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', color: T.tertiary, fontSize: 13,
          }}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} fill={model.color}>
            <path d={model.icon} />
          </svg>
          <span>{model.name}</span>
          <svg viewBox="0 0 10 6" width={8} height={5} fill="none" stroke={T.ghost} strokeWidth={1.5}>
            <path d="M1 1l4 4 4-4" />
          </svg>
        </button>

        {modelOpen && (
          <div style={{
            ...glass, borderRadius: 8, padding: 4,
            position: 'absolute', top: '100%', right: 0, marginTop: 4,
            minWidth: 200, zIndex: 100,
          }}>
            {MODELS.map(m => (
              <div
                key={m.id}
                onClick={() => { setSelectedModel(m.id); setModelOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 13, color: m.id === selectedModelId ? T.primary : T.tertiary,
                  background: m.id === selectedModelId ? hoverBg : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = m.id === selectedModelId ? hoverBg : 'transparent'}
              >
                <svg viewBox="0 0 24 24" width={16} height={16} fill={m.color}>
                  <path d={m.icon} />
                </svg>
                <span>{m.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: T.dim }}>{m.provider}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Canvas Tools: floating toolbar ──
function CanvasTools() {
  const selectedNodeId = useUIStore(s => s.selectedNodeId);
  const setActiveNode = useGraphStore(s => s.setActiveNode);

  if (!selectedNodeId) return null;

  const handleBranch = () => {
    setActiveNode(selectedNodeId);
    const input = document.querySelector<HTMLInputElement>('.dc-input');
    if (input) input.focus();
  };

  return (
    <div className="pointer-events-auto" style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 4,
      ...glass, borderRadius: 10, padding: 4,
    }}>
      <ToolBtn icon="M3.5 1.5v4.5a2 2 0 002 2H10" label="Branch" color={T.secondary} onClick={handleBranch} />
      <ToolBtn icon="M3.5 3.5h6.5v6.5h-6.5z M2 8.5V2.5a1 1 0 011-1h6" label="Clip" color={T.tertiary} onClick={() => {}} />
      <ToolBtn icon="M6 4v2.5h2 M6 6a4 4 0 100 0" label="Inspect" color={T.subtle} onClick={() => {
        useUIStore.getState().setSelectedNode(selectedNodeId);
      }} />
    </div>
  );
}

function ToolBtn({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 6,
        border: 'none', background: 'transparent',
        color, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 500,
      }}
      onMouseEnter={e => e.currentTarget.style.background = hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg viewBox="0 0 12 12" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d={icon} />
      </svg>
      {label}
    </button>
  );
}

// ── Floating Input — expands on focus ──
const STREAM_TIMEOUT_MS = 30_000; // 30 seconds with no data = timeout

function FloatingInput() {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingAiNodeIdRef = useRef<string | null>(null);
  const streamedTextRef = useRef('');

  const activeNodeId = useGraphStore(s => s.activeNodeId);
  const addNode = useGraphStore(s => s.addNode);
  const addEdge = useGraphStore(s => s.addEdge);
  const updateNodeText = useGraphStore(s => s.updateNodeText);
  const updateNodeMetadata = useGraphStore(s => s.updateNodeMetadata);
  const setActiveNode = useGraphStore(s => s.setActiveNode);
  const getAncestralPath = useGraphStore(s => s.getAncestralPath);
  const getChildCount = useGraphStore(s => s.getChildCount);
  const selectedModelId = useUIStore(s => s.selectedModelId);

  const isBranching = activeNodeId ? getChildCount(activeNodeId) > 0 : false;

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const aiNodeId = streamingAiNodeIdRef.current;
    if (aiNodeId) {
      const suffix = streamedTextRef.current ? ' [Stopped]' : '[Stopped]';
      updateNodeText(aiNodeId, streamedTextRef.current + suffix);
    }
    setStreaming(false);
    streamingAiNodeIdRef.current = null;
    streamedTextRef.current = '';
    inputRef.current?.focus();
  }, [updateNodeText]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    setStreaming(true);

    const now = Date.now();
    const userNodeId = `u-${now}`;
    const aiNodeId = `ai-${now}`;

    // Track for stop button
    streamingAiNodeIdRef.current = aiNodeId;
    streamedTextRef.current = '';

    const bodies = useGraphStore.getState().bodies;
    const parentBody = activeNodeId ? bodies[activeNodeId] : null;
    const existingChildren = activeNodeId ? getChildCount(activeNodeId) : 0;

    // Radial spawn: new branches fan out equidistantly away from graph center
    const SPAWN_DISTANCE = 200; // distance from parent to new user node
    const AI_OFFSET = 160;      // distance from user node to AI response
    let userPos: { x: number; y: number };
    if (!parentBody) {
      userPos = { x: 400, y: 100 };
    } else if (existingChildren === 0) {
      // First child: straight down
      userPos = { x: parentBody.x, y: parentBody.y + SPAWN_DISTANCE };
    } else {
      // Nth child: radial fan. Compute angle based on child index.
      // Start at -60deg, spread equidistantly across 240deg arc (leaving space above)
      const totalSlots = existingChildren + 1;
      const arcSpread = Math.PI * 1.3; // ~234 degrees
      const startAngle = Math.PI * 0.35; // start ~63deg from vertical
      const angle = startAngle + (existingChildren / totalSlots) * arcSpread;
      userPos = {
        x: parentBody.x + Math.sin(angle) * SPAWN_DISTANCE,
        y: parentBody.y + Math.cos(angle) * SPAWN_DISTANCE,
      };
    }
    // AI node spawns further out along the same radial direction
    const dx = userPos.x - (parentBody?.x ?? userPos.x);
    const dy = userPos.y - (parentBody?.y ?? userPos.y - 1);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const aiPos = {
      x: userPos.x + (dx / dist) * AI_OFFSET,
      y: userPos.y + (dy / dist) * AI_OFFSET,
    };

    addNode({
      id: userNodeId, role: 'user', type: 'message',
      text, label: buildLabel(text), parentId: activeNodeId,
      timestamp: now, metadata: {},
    }, userPos);

    if (activeNodeId) {
      const edgeType = existingChildren > 0 ? 'branch' : 'reply';
      addEdge({ id: `e-${now}-user`, from: activeNodeId, to: userNodeId, type: edgeType, weight: 1 });
    }

    addNode({
      id: aiNodeId, role: 'ai', type: 'message',
      text: '', label: '...', parentId: userNodeId,
      timestamp: now + 1, metadata: { model: selectedModelId, userMessage: text, userNodeId },
    }, aiPos);

    addEdge({ id: `e-${now}-ai`, from: userNodeId, to: aiNodeId, type: 'reply', weight: 1 });

    setActiveNode(aiNodeId);
    useUIStore.getState().setSelectedNode(aiNodeId);
    // Auto-pan to the new AI node
    useUIStore.getState().animateTo(aiPos.x, aiPos.y);

    const path = getAncestralPath(userNodeId);
    const { nodes: allNodes, edges: allEdges } = useGraphStore.getState();
    const { system, messages } = buildMessages(path, { allNodes, allEdges });

    // Create AbortController for this request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, model: selectedModelId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        // Race between reader.read() and a 30s timeout
        const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
        let result: ReadableStreamReadResult<Uint8Array>;
        try {
          result = await reader.read();
        } finally {
          clearTimeout(timeoutId);
        }
        const { done, value } = result;
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        streamedTextRef.current = fullText;
        updateNodeText(aiNodeId, fullText);
      }
    } catch (err) {
      // Distinguish abort (user stop vs timeout) from other errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        // If handleStop already set the text, don't overwrite.
        // If it was a timeout (not user-initiated), set timeout error.
        const currentNode = useGraphStore.getState().nodes.find(n => n.id === aiNodeId);
        const alreadyStopped = currentNode?.text.endsWith('[Stopped]');
        if (!alreadyStopped) {
          const prefix = streamedTextRef.current ? streamedTextRef.current + '\n' : '';
          updateNodeText(aiNodeId, prefix + '[Error: response timed out]');
        }
      } else {
        updateNodeText(aiNodeId, '[Error: failed to get response]');
      }
      console.error(err);
    }

    abortRef.current = null;
    streamingAiNodeIdRef.current = null;
    streamedTextRef.current = '';
    setStreaming(false);
    inputRef.current?.focus();
  }, [input, streaming, activeNodeId, selectedModelId, addNode, addEdge, updateNodeText, updateNodeMetadata, setActiveNode, getAncestralPath, getChildCount]);

  const model = getModel(selectedModelId);

  return (
    <div className="pointer-events-auto" style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      width: focused || input ? 560 : 420,
    }}>
      <div style={{
        ...glass,
        borderRadius: 12,
        padding: focused ? '12px 20px' : '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        ...(focused ? {
          borderTopColor: 'rgba(221,0,0,0.25)',
          borderLeftColor: 'rgba(221,0,0,0.12)',
          borderRightColor: 'rgba(221,0,0,0.12)',
          borderBottomColor: 'rgba(221,0,0,0.08)',
          boxShadow: [
            '0 0 0 2px rgba(221,0,0,0.06)',
            '0 0 16px -4px rgba(221,0,0,0.10)',
            '0 4px 16px -2px rgba(0,0,0,0.5)',
            '0 1px 3px 0 rgba(0,0,0,0.3)',
          ].join(', '),
        } : {}),
      }}>
        {/* Model indicator */}
        <svg viewBox="0 0 24 24" width={18} height={18} fill={model.color} style={{ flexShrink: 0, opacity: 0.8 }}>
          <path d={model.icon} />
        </svg>

        {isBranching && (
          <span style={{ fontSize: 10, color: C.branch, fontWeight: 600, letterSpacing: 0.5, flexShrink: 0, fontFamily: "'Inconsolata', monospace" }}>
            BRANCH
          </span>
        )}

        <input
          ref={inputRef}
          className="dc-input"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: focused ? 14 : 13,
            color: T.secondary,
            transition: 'font-size 0.2s',
          }}
          placeholder={streaming ? 'Thinking...' : isBranching ? 'Branch from this point...' : 'Ask anything...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!input) setFocused(false); }}
          disabled={streaming}
        />

        {/* Send indicator / Stop button */}
        {streaming ? (
          <button
            onClick={handleStop}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: ACCENT, fontFamily: "'Inconsolata', monospace",
              padding: '2px 6px',
            }}
          >
            Stop
          </button>
        ) : (
          <span style={{
            fontSize: 11, color: T.dim,
            fontFamily: "'Inconsolata', monospace",
          }}>
            ↵
          </span>
        )}
      </div>
    </div>
  );
}
