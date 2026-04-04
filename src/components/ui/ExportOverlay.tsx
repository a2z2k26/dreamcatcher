'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Export Overlay
// Cmd+E to export session as Markdown or JSON.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useSessionStore } from '@/stores/session-store';
import { getModel } from '@/lib/models';
import { E, T, glass, Z } from '@/lib/theme';
import type { GraphNode } from '@/types/graph';

type ExportFormat = 'markdown' | 'json';

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
    const sessionName = session?.name ?? 'dreamcacher-export';
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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: Z.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          ...glass,
          borderRadius: 14,
          padding: '20px 24px',
          maxWidth: 360,
          width: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: T.ghost }}>
            Export Session
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              border: 'none', background: 'none', color: T.ghost, cursor: 'pointer',
              padding: 4, minWidth: 24, minHeight: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M8 2L2 8M2 2l6 6" />
            </svg>
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="radio"
              name="export-format"
              checked={format === 'markdown'}
              onChange={() => setFormat('markdown')}
              style={{ accentColor: T.ghost }}
            />
            <span style={{ fontSize: 13, color: T.tertiary }}>Markdown</span>
            <span style={{ fontSize: 10, color: T.dim }}>Ancestral path as document</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="export-format"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              style={{ accentColor: T.ghost }}
            />
            <span style={{ fontSize: 13, color: T.tertiary }}>JSON</span>
            <span style={{ fontSize: 10, color: T.dim }}>Full graph state</span>
          </label>
        </div>

        <button
          onClick={handleExport}
          style={{
            width: '100%',
            padding: '8px 0',
            border: `1px solid ${E[6]}`,
            borderRadius: 6,
            background: E[4],
            color: T.primary,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          Download
        </button>
      </div>
    </div>
  );
}
