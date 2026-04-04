'use client';
import { E, T, C, ACCENT } from '@/lib/theme';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Input Bar
// Type a message, hit Enter. Creates user node, calls Claude,
// streams response into AI node. The conversation loop.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { buildMessages, buildLabel } from '@/lib/context-builder';

const STREAM_TIMEOUT_MS = 30_000;

export function InputBar() {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingAiNodeIdRef = useRef<string | null>(null);
  const streamedTextRef = useRef('');

  // Only subscribe to what we need for React renders
  const activeNodeId = useGraphStore(s => s.activeNodeId);
  const addNode = useGraphStore(s => s.addNode);
  const addEdge = useGraphStore(s => s.addEdge);
  const updateNodeText = useGraphStore(s => s.updateNodeText);
  const setActiveNode = useGraphStore(s => s.setActiveNode);
  const getAncestralPath = useGraphStore(s => s.getAncestralPath);
  const getChildCount = useGraphStore(s => s.getChildCount);
  const selectedModelId = useUIStore(s => s.selectedModelId);

  // Detect if we're about to branch (active node already has children)
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

    // Position: below the active node, or at origin if first message
    // Branch nodes offset to the right to avoid overlapping main thread
    const bodies = useGraphStore.getState().bodies;
    const parentBody = activeNodeId ? bodies[activeNodeId] : null;
    const existingChildren = activeNodeId ? getChildCount(activeNodeId) : 0;
    // Radial spawn: branches fan out equidistantly away from parent
    const SPAWN_DISTANCE = 200;
    const AI_OFFSET = 160;
    let userPos: { x: number; y: number };
    if (!parentBody) {
      userPos = { x: 400, y: 100 };
    } else if (existingChildren === 0) {
      userPos = { x: parentBody.x, y: parentBody.y + SPAWN_DISTANCE };
    } else {
      const totalSlots = existingChildren + 1;
      const arcSpread = Math.PI * 1.3;
      const startAngle = Math.PI * 0.35;
      const angle = startAngle + (existingChildren / totalSlots) * arcSpread;
      userPos = {
        x: parentBody.x + Math.sin(angle) * SPAWN_DISTANCE,
        y: parentBody.y + Math.cos(angle) * SPAWN_DISTANCE,
      };
    }
    const dx = userPos.x - (parentBody?.x ?? userPos.x);
    const dy = userPos.y - (parentBody?.y ?? userPos.y - 1);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const aiPos = {
      x: userPos.x + (dx / dist) * AI_OFFSET,
      y: userPos.y + (dy / dist) * AI_OFFSET,
    };

    // Create user node
    addNode({
      id: userNodeId,
      role: 'user',
      type: 'message',
      text,
      label: buildLabel(text),
      parentId: activeNodeId,
      timestamp: now,
      metadata: {},
    }, userPos);

    // Create edge from parent — detect if this is a branch
    if (activeNodeId) {
      const existingChildren = useGraphStore.getState().getChildCount(activeNodeId);
      const edgeType = existingChildren > 0 ? 'branch' : 'reply';
      addEdge({
        id: `e-${now}-user`,
        from: activeNodeId,
        to: userNodeId,
        type: edgeType,
        weight: 1,
      });
    }

    // Create placeholder AI node
    addNode({
      id: aiNodeId,
      role: 'ai',
      type: 'message',
      text: '',
      label: '...',
      parentId: userNodeId,
      timestamp: now + 1,
      metadata: { model: selectedModelId, userMessage: text, userNodeId },
    }, aiPos);

    addEdge({
      id: `e-${now}-ai`,
      from: userNodeId,
      to: aiNodeId,
      type: 'reply',
      weight: 1,
    });

    setActiveNode(aiNodeId);
    useUIStore.getState().setSelectedNode(aiNodeId);

    // Build context: walk from root to the new user node
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
      if (err instanceof DOMException && err.name === 'AbortError') {
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

  return (
    <footer className="flex items-center justify-center px-3" style={{ background: E[0], borderTop: '1px solid ' + E[4] + '', height: 32 }}>
      <div
        className="flex-1 flex items-center gap-2 rounded px-2"
        style={{ maxWidth: 500, background: E[4], border: '1px solid ' + E[6] + '', transition: 'border-color 0.2s' }}
      >
        {isBranching && (
          <span style={{ fontSize: 10, color: C.branch, fontFamily: "'Inconsolata', monospace", whiteSpace: 'nowrap' }}>
            BRANCH
          </span>
        )}
        <input
          ref={inputRef}
          className="dc-input flex-1 bg-transparent border-none outline-none py-1"
          style={{ fontSize: 11, color: T.secondary }}
          placeholder={streaming ? 'Thinking...' : isBranching ? 'Type to branch from this point...' : 'Continue the conversation...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          disabled={streaming}
        />
        {streaming ? (
          <button
            onClick={handleStop}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, color: ACCENT, fontFamily: "'Inconsolata', monospace",
              padding: '2px 4px',
            }}
          >
            Stop
          </button>
        ) : (
          <span style={{ fontSize: 10, color: T.dim, fontFamily: "'Inconsolata', monospace" }}>
            Enter
          </span>
        )}
      </div>
    </footer>
  );
}
