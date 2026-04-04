'use client';
import { useState, useCallback } from 'react';
import { E, T, C, ACCENT } from '@/lib/theme';
import { ToolCardList } from './ToolCard';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Inspector Panel
// Right sidebar showing full node content, metadata, and actions.
// ═══════════════════════════════════════════════════════════════

import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { buildMessages } from '@/lib/context-builder';

const STREAM_TIMEOUT_MS = 30_000;

export function Inspector() {
  const selectedNodeId = useUIStore(s => s.selectedNodeId);
  const inspectorOpen = useUIStore(s => s.inspectorOpen);
  const setSelectedNode = useUIStore(s => s.setSelectedNode);
  const nodes = useGraphStore(s => s.nodes);
  const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null;
  const [retrying, setRetrying] = useState(false);

  const isErrorNode = node?.role === 'ai' && node.text.startsWith('[Error');

  const handleRetry = useCallback(async () => {
    if (!node || !isErrorNode || retrying) return;

    const userNodeId = node.metadata.userNodeId;
    const userMessage = node.metadata.userMessage;
    const model = node.metadata.model;

    if (!userNodeId || !userMessage) return;

    setRetrying(true);

    const { updateNodeText, getAncestralPath } = useGraphStore.getState();

    // Reset the AI node text to show streaming
    updateNodeText(node.id, '');

    // Rebuild context from the user node that triggered this
    const path = getAncestralPath(userNodeId);
    const { nodes: allNodes, edges: allEdges } = useGraphStore.getState();
    const { system, messages } = buildMessages(path, { allNodes, allEdges });

    const controller = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, model: model ?? undefined }),
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
        updateNodeText(node.id, fullText);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updateNodeText(node.id, '[Error: response timed out]');
      } else {
        updateNodeText(node.id, '[Error: failed to get response]');
      }
      console.error(err);
    }

    setRetrying(false);
  }, [node, isErrorNode, retrying]);

  return (
    <aside
      style={{
        position: 'fixed',
        right: 0,
        top: 36,
        bottom: 32,
        width: 320,
        background: E[0],
        borderLeft: '1px solid ' + E[4] + '',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        transform: inspectorOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: inspectorOpen ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid ' + E[4] + '',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase' as const,
          color: node?.role === 'user' ? T.tertiary : T.subtle,
        }}>
          {node?.role === 'user' ? 'Your Message' : 'AI Response'}
        </span>
        <button
          onClick={() => setSelectedNode(null)}
          style={{
            width: 24,
            height: 24,
            minWidth: 24,
            minHeight: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            color: T.ghost,
            cursor: 'pointer',
            borderRadius: 3,
            transition: 'background 150ms ease',
          }}
        >
          <svg viewBox="0 0 10 10" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M8 2L2 8M2 2l6 6" />
          </svg>
        </button>
      </div>

      {/* Empty state — no node selected */}
      {!node && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, color: '#404040' }}>Select a node to inspect</span>
        </div>
      )}

      {/* Body */}
      {node && (
        <div className="scroll-fade" style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          fontSize: 13,
          lineHeight: 1.65,
          color: T.secondary,
        }}>
          {/* Content */}
          <div style={{ marginBottom: 14 }}>
            <Label>Content</Label>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {node.text || '...'}
            </div>
          </div>

          {/* Metadata */}
          <div style={{ marginBottom: 14 }}>
            <Label>Details</Label>
            <div style={{ fontSize: 10, fontWeight: 400, color: T.subtle, lineHeight: 1.7, fontFamily: "'Inconsolata', monospace" }}>
              {node.role === 'ai' && node.metadata.model && (
                <div>Model: <Em>{node.metadata.model}</Em></div>
              )}
              {node.metadata.tokens && (
                <div>Tokens: <Em>{node.metadata.tokens.toLocaleString()}</Em></div>
              )}
              <div>Time: <Em>{new Date(node.timestamp).toLocaleTimeString()}</Em></div>
              <div>Node: <Em>{node.id}</Em></div>
              <div>Role: <Em>{node.role === 'user' ? 'You' : 'AI'}</Em></div>
            </div>
          </div>

          {/* Thinking */}
          {node.metadata.thinking && (
            <div style={{ marginBottom: 14 }}>
              <Label>Reasoning</Label>
              {node.metadata.thinking.map((step, i) => (
                <div key={i} style={{ fontSize: 10, color: T.ghost, marginBottom: 4 }}>
                  <span style={{ color: C.thinking, fontWeight: 600 }}>{step.label}:</span>{' '}
                  {step.content}
                </div>
              ))}
            </div>
          )}

          {/* Tool Calls */}
          {node.metadata.toolCalls && node.metadata.toolCalls.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <Label>Tool Use</Label>
              <ToolCardList toolCalls={node.metadata.toolCalls} />
            </div>
          )}

          {/* Actions */}
          <div>
            <Label>Actions</Label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
              <ActionBtn style={{ borderColor: `${C.branch}50`, color: C.branch }}>
                Branch
              </ActionBtn>
              <ActionBtn onClick={() => {
                navigator.clipboard.writeText(node.text);
              }}>
                Copy
              </ActionBtn>
              {node.role === 'ai' && (
                <ActionBtn>Regen</ActionBtn>
              )}
              {isErrorNode && node.metadata.userMessage && (
                <ActionBtn
                  onClick={handleRetry}
                  style={{ borderColor: `${ACCENT}50`, color: ACCENT }}
                >
                  {retrying ? 'Retrying...' : 'Retry'}
                </ActionBtn>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.8px',
      textTransform: 'uppercase' as const,
      color: T.ghost,
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span style={{ color: T.tertiary, fontStyle: 'normal' }}>{children}</span>;
}

function ActionBtn({ children, onClick, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = `${E[7]}60`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      style={{
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 500,
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid ' + E[6] + '',
        background: 'transparent',
        color: T.subtle,
        cursor: 'pointer',
        transition: 'background 150ms ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
