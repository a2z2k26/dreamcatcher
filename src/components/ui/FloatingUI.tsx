'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Floating UI Layer
// All chrome floats on the canvas — no opaque bars.
// Glass-effect panels that feel part of the environment.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { buildMessages, buildLabel } from '@/lib/context-builder';
import { T, C, ACCENT, FF, R, heavyGlass, lightGlass } from '@/lib/theme';

const subtleHoverBg = 'rgba(200, 200, 200, 0.04)';

export function FloatingUI() {
  return (
    <div className="pointer-events-none" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <CanvasTools />
      <FloatingInput />
    </div>
  );
}

// ── Canvas Tools: floating toolbar ──
function CanvasTools() {
  const selectedNodeId = useUIStore(s => s.selectedNodeId);
  const inspectorOpen = useUIStore(s => s.inspectorOpen);
  const pathTrace = useUIStore(s => s.pathTrace);
  const setActiveNode = useGraphStore(s => s.setActiveNode);

  if (!selectedNodeId || inspectorOpen || pathTrace) return null;
  const shift = 0;

  const handleBranch = () => {
    setActiveNode(selectedNodeId);
    const input = document.querySelector<HTMLInputElement>('.dc-input');
    if (input) input.focus();
  };

  return (
    <div className="pointer-events-auto dc-canvas-tools" style={{
      position: 'absolute', bottom: 104, left: '50%', transform: `translateX(calc(-50% + ${shift}px))`,
      display: 'flex', gap: 4,
      transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      ...lightGlass, borderRadius: R.toolPill, padding: 4,
    }}>
      <ToolBtn icon="M3.5 1.5v4.5a2 2 0 002 2H10" label="Branch" color={T.secondary} onClick={handleBranch} />
      <ToolBtn icon="M6 4v2.5h2 M6 6a4 4 0 100 0" label="Inspect" color={T.subtle} onClick={() => {
        useUIStore.getState().setSelectedNode(selectedNodeId);
      }} />
    </div>
  );
}

function ToolBtn({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 6,
        border: 'none', background: 'transparent',
        color, cursor: 'pointer', fontSize: 11, fontFamily: FF.sans, fontWeight: 650,
      }}
      onMouseEnter={e => e.currentTarget.style.background = subtleHoverBg}
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
  const setActiveNode = useGraphStore(s => s.setActiveNode);
  const getAncestralPath = useGraphStore(s => s.getAncestralPath);
  const getChildCount = useGraphStore(s => s.getChildCount);
  const selectedModelId = useUIStore(s => s.selectedModelId);
  const inspectorOpen = useUIStore(s => s.inspectorOpen);
  const pathTrace = useUIStore(s => s.pathTrace);
  const timelineOpen = useUIStore(s => s.timelineOpen);

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
      const canvas = document.querySelector<HTMLDivElement>('.dc-observatory-canvas');
      const { scale, panX, panY } = useUIStore.getState();
      userPos = canvas
        ? {
            x: (canvas.clientWidth / 2 - panX) / scale,
            y: (canvas.clientHeight / 2 - panY) / scale,
          }
        : { x: 400, y: 100 };
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
  }, [input, streaming, activeNodeId, selectedModelId, addNode, addEdge, updateNodeText, setActiveNode, getAncestralPath, getChildCount]);

  const rightInset = inspectorOpen ? 312 : 0;

  if (pathTrace) return null;

  return (
    <div className="pointer-events-auto dc-floating-input" data-inspector-open={inspectorOpen ? 'true' : 'false'} style={{
      position: 'absolute',
      left: 0,
      right: rightInset,
      bottom: timelineOpen ? 8 : 24,
      height: 86,
      zIndex: 71,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 20px',
      pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(10,8,7,0) 0%, rgba(8,7,6,0.82) 62%)',
      transform: 'translateY(0)',
      transition: 'right 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ flex: 1, maxWidth: 820, margin: '0 auto', pointerEvents: 'auto' }}>
        <div
          className="dc-input-capsule"
          data-focused={focused ? 'true' : 'false'}
          style={{
          ...heavyGlass,
          background: 'rgba(22,20,18,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16,
          minHeight: 56,
          padding: '0 10px 0 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: FF.sans,
          transition: 'all 260ms cubic-bezier(0.2, 0.9, 0.3, 1)',
          position: 'relative',
          borderTopColor: focused ? 'rgba(221,0,0,0.60)' : 'rgba(255,255,255,0.08)',
          borderLeftColor: focused ? 'rgba(221,0,0,0.42)' : 'rgba(255,255,255,0.05)',
          borderRightColor: focused ? 'rgba(221,0,0,0.34)' : 'rgba(255,255,255,0.045)',
          borderBottomColor: focused ? 'rgba(221,0,0,0.30)' : 'rgba(0,0,0,0.42)',
          boxShadow: focused
            ? [
                '0 0 0 1px rgba(221,0,0,0.24)',
                '0 0 18px rgba(221,0,0,0.18)',
                '0 8px 24px -4px rgba(0,0,0,0.7)',
                'inset 0 1px 0 rgba(255,255,255,0.055)',
                'inset 0 -1px 0 rgba(0,0,0,0.24)',
              ].join(', ')
            : [
                '0 8px 24px -4px rgba(0,0,0,0.7)',
                '0 2px 8px -1px rgba(0,0,0,0.4)',
                'inset 0 1px 0 rgba(255,255,255,0.04)',
              ].join(', '),
        }}
        >
          {isBranching && (
            <span style={{ fontSize: 10, color: C.branch, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0, fontFamily: FF.mono }}>
              BRANCH
            </span>
          )}
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: '#E08542',
              boxShadow: '0 0 9px rgba(224,133,66,0.56)',
              flex: '0 0 auto',
            }}
          />

          <input
            ref={inputRef}
            className="dc-input"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              height: 48,
              minWidth: 0,
              padding: 0,
              fontSize: 15,
              fontFamily: FF.sans,
              fontWeight: 500,
              color: T.primary,
              transition: 'color 120ms ease',
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
              type="button"
              onClick={handleStop}
              style={{
                width: 34,
                height: 34,
                minWidth: 34,
                borderRadius: 17,
                background: ACCENT,
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 0.5px rgba(255,255,255,0.12), 0 2px 6px rgba(221,0,0,0.3)',
              }}
              title="Stop response"
            >
              <svg viewBox="0 0 12 12" width={10} height={10} fill="currentColor">
                <rect x={3} y={3} width={6} height={6} rx={1} />
              </svg>
            </button>
          ) : input.trim() ? (
            <button
              type="button"
              onClick={sendMessage}
              style={{
                width: 34,
                height: 34,
                minWidth: 34,
                borderRadius: 17,
                background: ACCENT,
                border: 'none',
                color: '#0A0908',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(221,0,0,0.5)',
              }}
              title="Send message"
            >
              <svg viewBox="0 0 12 12" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 10V2" />
                <path d="M2.5 5.5 6 2l3.5 3.5" />
              </svg>
            </button>
          ) : (
            <span style={{
              width: 34,
              height: 34,
              minWidth: 34,
              borderRadius: 17,
              background: 'rgba(255,255,255,0.055)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: T.ghost,
              fontFamily: FF.mono,
            }}>
              ↑
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
