'use client';
import { useState } from 'react';
import { E, T, C, ACCENT, FF, R } from '@/lib/theme';
import { ToolCardList } from './ToolCard';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Inspector Panel
// Right sidebar showing full node content, metadata, and actions.
// ═══════════════════════════════════════════════════════════════

import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { buildMessages } from '@/lib/context-builder';
import { getModel } from '@/lib/models';

const STREAM_TIMEOUT_MS = 30_000;

export function Inspector() {
  const selectedNodeId = useUIStore(s => s.selectedNodeId);
  const inspectorOpen = useUIStore(s => s.inspectorOpen);
  const setSelectedNode = useUIStore(s => s.setSelectedNode);
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null;
  const [retrying, setRetrying] = useState(false);
  const isErrorNode = node?.role === 'ai' && node.text.startsWith('[Error');

  const modelInfo = node?.role === 'ai' && node.metadata.model ? getModel(node.metadata.model) : null;
  const nodeDot = modelInfo?.color ?? (node?.role === 'user' ? T.tertiary : C.memory);
  const nodeKind = node?.role === 'ai'
    ? `AI · ${modelInfo?.name ?? 'Response'}`
    : node?.role === 'user'
      ? 'Your Message'
      : 'Node';
  const nodeDepth = node ? useGraphStore.getState().getAncestralPath(node.id).length - 1 : 0;
  const isArtifact = node ? node.type === 'clip' || edges.some(edge => edge.from === node.id && edge.type === 'clips_to') : false;
  const liveFrontier = node
    ? nodes.find(candidate =>
        candidate.role === 'ai' &&
        !candidate.text &&
        edges.some(edge => edge.from === node.id && edge.to === candidate.id)
      ) ?? null
    : null;
  const compactArtifact = Boolean(isArtifact && node?.metadata.thinking?.length);

  const handleBranch = () => {
    if (!node) return;
    useGraphStore.getState().setActiveNode(node.id);
    window.setTimeout(() => document.querySelector<HTMLInputElement>('.dc-input')?.focus(), 0);
  };

  const handleCopy = () => {
    if (!node) return;
    navigator.clipboard.writeText(node.text);
  };

  const handleRetry = async () => {
    if (!node || node.role !== 'ai' || retrying) return;

    const parentNode = node.parentId ? nodes.find(candidate => candidate.id === node.parentId) : null;
    const userNodeId = node.metadata.userNodeId ?? (parentNode?.role === 'user' ? parentNode.id : null);
    const model = node.metadata.model;

    if (!userNodeId) return;

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
  };

  return (
    <aside
      className="dc-inspector-panel"
      data-artifact={isArtifact ? 'true' : 'false'}
      data-live={liveFrontier ? 'true' : 'false'}
      aria-label="Node inspector"
      aria-hidden={!inspectorOpen}
      style={{
        position: 'fixed',
        right: 0,
        top: 46,
        bottom: 24,
        width: 312,
        overflow: 'hidden',
        background: [
          `radial-gradient(250px 260px at 0% 2%, ${nodeDot}14, transparent 68%)`,
          'linear-gradient(180deg, rgba(16,14,12,0.98) 0%, rgba(10,9,8,0.99) 100%)',
        ].join(', '),
        borderLeft: `1px solid ${E[4]}`,
        boxShadow: '-1px 0 0 rgba(255,255,255,0.035) inset, -18px 0 48px rgba(0,0,0,0.48)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FF.sans,
        transform: inspectorOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: inspectorOpen ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '15px 16px 0',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: node ? nodeDot : T.dim,
          boxShadow: node ? `0 0 6px ${nodeDot}80` : 'none',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '1.2px',
          textTransform: 'uppercase' as const,
          fontFamily: FF.mono,
          color: T.subtle,
        }}>
          {nodeKind}
        </span>
        {isArtifact && (
          <span style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            height: 20,
            padding: '0 8px',
            borderRadius: 9999,
            border: '0.5px solid rgba(212,165,116,0.36)',
            color: '#D4A574',
            background: 'rgba(212,165,116,0.06)',
            font: `700 8px ${FF.mono}`,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
          }}>
            <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 1.4 7.3 4l2.8.4-2 2 .5 2.8L6 7.8 3.4 9.2l.5-2.8-2-2L4.7 4 6 1.4Z" />
            </svg>
            Artifact
          </span>
        )}
        <button
          type="button"
          aria-label="Close inspector"
          onClick={() => setSelectedNode(null)}
          style={{
            width: 24,
            height: 24,
            minWidth: 24,
            minHeight: 24,
            marginLeft: isArtifact ? 0 : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            color: T.ghost,
            cursor: 'pointer',
            borderRadius: R.inset,
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
          padding: '12px 16px 16px',
          fontSize: 13,
          lineHeight: 1.65,
          fontFamily: FF.sans,
          color: T.secondary,
        }}>
          <div style={{
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: `1px solid ${E[4]}`,
          }}>
            <div style={{
              fontSize: 16,
              lineHeight: 1.3,
              fontWeight: 650,
              color: T.primary,
              marginBottom: 6,
            }}>
              {node.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <MetaChip>depth {nodeDepth}</MetaChip>
              <MetaChip>{node.metadata.tokens ?? 0} tok</MetaChip>
              <MetaChip>{new Date(node.timestamp).toLocaleTimeString()}</MetaChip>
              {isArtifact && <MetaChip tone="artifact">rarity + artifact</MetaChip>}
            </div>
          </div>

          {/* Content */}
          {!compactArtifact && (
            <div style={{ marginBottom: 14 }}>
              <Label>Content</Label>
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: T.secondary }}>
                {node.text || '...'}
              </div>
            </div>
          )}

          {/* Metadata */}
          {!compactArtifact && (
            <div style={{ marginBottom: 14 }}>
              <Label>Details</Label>
              <div style={{ fontSize: 10, fontWeight: 400, color: T.subtle, lineHeight: 1.7, fontFamily: FF.mono }}>
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
          )}

          {/* Thinking */}
          {node.metadata.thinking && (
            <div style={{ marginBottom: 14 }}>
              <Label className="dc-inspector-thinking-label">Thinking</Label>
              {node.metadata.thinking.map((step, i) => (
                <div key={i} style={{
                  background: E[2],
                  border: `0.5px solid ${E[5]}`,
                  borderRadius: R.inset,
                  padding: '9px 11px',
                  marginBottom: 6,
                }}>
                  <div style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase' as const,
                    color: T.dimSection,
                    fontFamily: FF.mono,
                    marginBottom: 5,
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: T.secondary, lineHeight: 1.5 }}>
                    {step.content}
                  </div>
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
        </div>
      )}

      {node && (
        <div style={{
          flex: '0 0 auto',
          padding: '10px 16px 16px',
          background: 'linear-gradient(180deg, rgba(10,9,8,0) 0%, rgba(10,9,8,0.94) 24%, rgba(10,9,8,0.98) 100%)',
          borderTop: `0.5px solid ${E[4]}`,
        }}>
          {liveFrontier && (
            <div className="dc-inspector-live-lineage" style={{
              position: 'relative',
              height: 34,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 9,
              padding: '0 12px',
              borderRadius: R.sm,
              border: `0.5px solid ${E[5]}`,
              background: 'rgba(200,200,200,0.035)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)',
              overflow: 'hidden',
            }}>
              <span
                className="dc-inspector-live-rail"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 2,
                  borderRadius: 2,
                  background: ACCENT,
                }}
              />
              <span className="dc-red-pulse dc-inspector-live-dot" style={{
                width: 7,
                height: 7,
                borderRadius: 9999,
                background: ACCENT,
                flex: '0 0 auto',
              }} />
              <span style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: 11,
                fontWeight: 600,
                color: T.secondary,
              }}>
                {liveFrontier.label === '...' ? 'Verifying under load' : liveFrontier.label}
              </span>
              <span style={{
                marginLeft: 'auto',
                font: `500 9px ${FF.mono}`,
                color: ACCENT,
                opacity: 0.78,
              }}>
                streaming
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            {node.role === 'ai' ? (
              <ActionBtn
                className="dc-inspector-retry-button"
                icon="retry"
                onClick={handleRetry}
                style={isErrorNode ? { borderColor: `${ACCENT}50`, color: ACCENT } : undefined}
              >
                {retrying ? 'Retrying...' : 'Retry'}
              </ActionBtn>
            ) : (
              <ActionBtn icon="copy" onClick={handleCopy}>Copy</ActionBtn>
            )}
            <ActionBtn icon="branch" onClick={handleBranch} style={{ borderColor: `${C.branch}50`, color: C.branch }}>
              Branch
            </ActionBtn>
            <ActionBtn icon="compare">Compare</ActionBtn>
          </div>
        </div>
      )}
    </aside>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.8px',
      textTransform: 'uppercase' as const,
      color: T.ghost,
      fontFamily: FF.mono,
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span style={{ color: T.tertiary, fontStyle: 'normal' }}>{children}</span>;
}

function MetaChip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'artifact' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 7px',
      borderRadius: R.inset,
      border: tone === 'artifact' ? '0.5px solid rgba(212,165,116,0.30)' : `0.5px solid ${E[5]}`,
      background: tone === 'artifact' ? 'rgba(212,165,116,0.055)' : 'rgba(200,200,200,0.035)',
      color: tone === 'artifact' ? '#D4A574' : T.ghost,
      font: `600 9px ${FF.mono}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function ActionIcon({ name }: { name: 'retry' | 'copy' | 'branch' | 'compare' }) {
  const paths: Record<typeof name, React.ReactNode> = {
    retry: (
      <>
        <path d="M9.3 3.4a4 4 0 1 0 .5 4.5" />
        <path d="M9.4 1.8v2.1H7.3" />
      </>
    ),
    copy: (
      <>
        <rect x="4.2" y="4.2" width="5.8" height="5.8" rx="1" />
        <path d="M2 7.8V3.2A1.2 1.2 0 0 1 3.2 2h4.6" />
      </>
    ),
    branch: (
      <>
        <path d="M3 2v3.2a2 2 0 0 0 2 2h4" />
        <path d="m7.2 5.4 2 1.8-2 1.8" />
      </>
    ),
    compare: (
      <>
        <path d="M4 2v8" />
        <path d="M8 2v8" />
        <path d="M2 3.5h4M6 8.5h4" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 12 12" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function ActionBtn({ children, icon, onClick, className, style }: {
  children: React.ReactNode;
  icon?: 'retry' | 'copy' | 'branch' | 'compare';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = `${E[7]}60`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,200,200,0.04)'; }}
      style={{
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 600,
        height: 34,
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: R.sm,
        border: `0.5px solid ${E[5]}`,
        background: 'rgba(200,200,200,0.04)',
        color: T.tertiary,
        cursor: 'pointer',
        transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
        ...style,
      }}
    >
      {icon && <ActionIcon name={icon} />}
      {children}
    </button>
  );
}
