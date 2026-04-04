'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Tool Call Card
// Compact, expandable card showing a tool call's name, input,
// and output. Source pattern: Clui CC's ToolResultViews.
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { E, T, ACCENT } from '@/lib/theme';
import type { ToolCall } from '@/types/graph';

// Tool category colors (all from luminance hierarchy)
function toolColor(name: string): string {
  if (name.includes('read') || name.includes('file') || name.includes('write')) return T.tertiary;
  if (name.includes('search') || name.includes('grep') || name.includes('glob')) return T.subtle;
  if (name.includes('bash') || name.includes('exec')) return T.secondary;
  return T.ghost;
}

export function ToolCardList({ toolCalls }: { toolCalls: readonly ToolCall[] }) {
  if (toolCalls.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {toolCalls.map((tc, i) => (
        <ToolCardItem key={i} toolCall={tc} />
      ))}
    </div>
  );
}

function ToolCardItem({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const color = toolColor(toolCall.name);

  return (
    <div
      style={{
        background: E[3],
        border: `1px solid ${E[6]}`,
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px',
          border: 'none', background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke={color} strokeWidth={1.5}>
          <path d="M3 2l2 2-2 2" /><path d="M6 6h4" />
        </svg>
        <span style={{ fontSize: 10, fontWeight: 600, color, flex: 1 }}>
          {toolCall.name}
        </span>
        {toolCall.duration !== undefined && (
          <span style={{ fontSize: 10, color: T.dim, fontFamily: "'Inconsolata', monospace" }}>
            {toolCall.duration}ms
          </span>
        )}
        <svg
          viewBox="0 0 8 8" width={8} height={8} fill="none" stroke={T.dim} strokeWidth={1}
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
        >
          <path d="M1 3l3 2 3-2" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '4px 8px 8px', borderTop: `1px solid ${E[5]}` }}>
          {/* Input */}
          {Object.keys(toolCall.input).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 }}>
                Input
              </div>
              <pre style={{
                fontSize: 10, color: T.subtle, lineHeight: 1.5,
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 100, overflow: 'auto',
                background: E[2], borderRadius: 4, padding: 4,
                fontFamily: "'Inconsolata', monospace",
              }}>
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {toolCall.output && (
            <div>
              <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 }}>
                Output
              </div>
              <pre style={{
                fontSize: 10, color: T.subtle, lineHeight: 1.5,
                margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 100, overflow: 'auto',
                background: E[2], borderRadius: 4, padding: 4,
                fontFamily: "'Inconsolata', monospace",
              }}>
                {toolCall.output.slice(0, 500)}{toolCall.output.length > 500 ? '...' : ''}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
