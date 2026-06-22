'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Export Overlay
// Cmd+E to export session as Markdown or JSON.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useSessionStore } from '@/stores/session-store';
import { getModel } from '@/lib/models';
import { ACCENT, E, T, accentGlow, glass, Z } from '@/lib/theme';
import type { GraphNode } from '@/types/graph';

type ExportFormat = 'markdown' | 'json';

const FORMAT_OPTIONS: readonly {
  readonly id: ExportFormat;
  readonly label: string;
  readonly tag: string;
  readonly detail: string;
}[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    tag: 'MD',
    detail: 'Ancestral path document',
  },
  {
    id: 'json',
    label: 'JSON',
    tag: 'JSON',
    detail: 'Full graph state',
  },
];

function buildMarkdown(nodes: readonly GraphNode[], activeNodeId: string | null): string {
  const getAncestralPath = useGraphStore.getState().getAncestralPath;
  const targetId = activeNodeId ?? (nodes.length > 0 ? nodes[nodes.length - 1].id : null);
  if (!targetId) return '# Empty Session\n';

  const path = getAncestralPath(targetId);
  const lines: string[] = [];

  for (const node of path) {
    if (node.role === 'user') {
      lines.push(`## User\n`);
    } else {
      const modelName = node.metadata.model
        ? getModel(node.metadata.model).name
        : 'AI';
      lines.push(`## AI (${modelName})\n`);
    }
    lines.push(node.text);
    lines.push('');
  }

  return lines.join('\n');
}

function buildJSON(): string {
  const { nodes, edges, positions } = useGraphStore.getState();
  return JSON.stringify({ nodes, edges, positions }, null, 2);
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

export function ExportOverlay() {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const nodeCount = useGraphStore(s => s.nodes.length);
  const edgeCount = useGraphStore(s => s.edges.length);
  const sessions = useSessionStore(s => s.sessions);
  const activeSessionId = useSessionStore(s => s.activeSessionId);
  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleExport = useCallback(() => {
    const sessions = useSessionStore.getState().sessions;
    const activeSessionId = useSessionStore.getState().activeSessionId;
    const session = sessions.find(s => s.id === activeSessionId);
    const sessionName = session?.name ?? 'dreamcatcher-export';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const base = `${sanitizeFilename(sessionName)}_${timestamp}`;

    if (format === 'markdown') {
      const { nodes, activeNodeId } = useGraphStore.getState();
      const md = buildMarkdown(nodes, activeNodeId);
      triggerDownload(md, `${base}.md`, 'text/markdown');
    } else {
      const json = buildJSON();
      triggerDownload(json, `${base}.json`, 'application/json');
    }

    setOpen(false);
  }, [format]);

  if (!open) return null;

  const selectedOption = FORMAT_OPTIONS.find(option => option.id === format) ?? FORMAT_OPTIONS[0];

  return (
    <div
      className="dc-export-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: Z.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.73)',
        padding: 12,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        className="dc-export-panel"
        style={{
          ...glass,
          borderRadius: 12,
          padding: 16,
          width: 'min(392px, calc(100vw - 24px))',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="dc-export-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
            <div
              className="dc-export-header-icon"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.035)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.tertiary,
                flex: '0 0 auto',
              }}
            >
              <svg viewBox="0 0 14 14" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.4}>
                <path d="M7 2v6" />
                <path d="M4.5 5.5 7 8l2.5-2.5" />
                <path d="M3 11h8" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="dc-export-title"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase' as const,
                  color: ACCENT,
                  fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                }}
              >
                Export
              </div>
              <div
                className="dc-export-meta"
                style={{
                  marginTop: 3,
                  color: T.ghost,
                  fontSize: 10,
                  fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeSession?.phase ?? 'idle'} · {nodeCount}n · {edgeCount}e
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close export overlay"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.025)',
              color: T.ghost,
              cursor: 'pointer',
              padding: 0,
              minWidth: 28,
              minHeight: 28,
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {FORMAT_OPTIONS.map(option => {
            const selected = option.id === format;
            return (
              <button
                key={option.id}
                type="button"
                className="dc-export-format-row"
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => setFormat(option.id)}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  minHeight: 58,
                  padding: '9px 10px 9px 12px',
                  borderRadius: 8,
                  border: selected ? '1px solid rgba(61,58,53,0.56)' : '1px solid rgba(37,35,32,0.72)',
                  background: selected
                    ? 'linear-gradient(180deg, rgba(30,28,25,0.86), rgba(19,18,15,0.72))'
                    : 'rgba(255,255,255,0.018)',
                  color: T.secondary,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  className="dc-export-format-rail"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    borderRadius: 1,
                    background: selected ? ACCENT : 'transparent',
                    boxShadow: selected ? `0 0 6px ${accentGlow(0.52)}` : 'none',
                  }}
                />
                <span
                  className="dc-export-format-tag"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: option.id === 'json' ? 46 : 34,
                    height: 22,
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.032)',
                    color: selected ? T.secondary : T.ghost,
                    fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {option.tag}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    className="dc-export-format-label"
                    style={{ display: 'block', color: T.secondary, fontSize: 13, fontWeight: 600 }}
                  >
                    {option.label}
                  </span>
                  <span
                    className="dc-export-format-detail"
                    style={{
                      display: 'block',
                      marginTop: 2,
                      color: T.ghost,
                      fontSize: 10,
                      fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                    }}
                  >
                    {option.detail}
                  </span>
                </span>
                <span
                  className="dc-export-format-state"
                  style={{
                    color: selected ? ACCENT : T.dim,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {selected ? 'active' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleExport}
          className="dc-export-download"
          style={{
            width: '100%',
            minHeight: 38,
            padding: '0 12px',
            border: `1px solid ${E[6]}`,
            borderRadius: 8,
            background: E[4],
            color: T.secondary,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span>Download export</span>
          <span
            className="dc-export-download-meta"
            style={{
              color: T.ghost,
              fontSize: 10,
              fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
              textTransform: 'uppercase' as const,
            }}
          >
            {selectedOption.tag} · {nodeCount}n
          </span>
        </button>
      </div>
    </div>
  );
}
