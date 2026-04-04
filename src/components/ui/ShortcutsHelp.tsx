'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Keyboard Shortcuts Help
// Press ? to toggle. Lists all available shortcuts.
// Source pattern: Understand Anything's KeyboardShortcutsHelp.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { E, T, ACCENT, glass } from '@/lib/theme';

const SHORTCUTS: Array<{ key: string; description: string; category: string }> = [
  { key: '/', category: 'Navigation', description: 'Focus input' },
  { key: 'Space', category: 'Navigation', description: 'Fit graph to viewport' },
  { key: 'Escape', category: 'Navigation', description: 'Exit current mode' },
  { key: 'T', category: 'Inspect', description: 'Trace path from selected node' },
  { key: 'I', category: 'Inspect', description: 'Toggle inspector panel' },
  { key: 'L', category: 'Panels', description: 'Toggle timeline view' },
  { key: 'M', category: 'Panels', description: 'Toggle memory shelf' },
  { key: 'Cmd+E', category: 'Actions', description: 'Export session' },
  { key: 'Arrow Up', category: 'Navigation', description: 'Select parent node' },
  { key: 'Arrow Down', category: 'Navigation', description: 'Select first child node' },
  { key: 'Arrow L/R', category: 'Navigation', description: 'Select sibling nodes' },
  { key: '?', category: 'Help', description: 'Toggle this help' },
  { key: 'Shift+Click', category: 'Selection', description: 'Multi-select nodes' },
  { key: 'Right-click', category: 'Actions', description: 'Context menu on nodes' },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.key === '?') {
        setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
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
          maxWidth: 480,
          width: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: T.ghost }}>
            Keyboard Shortcuts
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

        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' as const, color: T.dim, marginBottom: 8 }}>
              {cat}
            </div>
            {SHORTCUTS.filter(s => s.category === cat).map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                <span style={{ fontSize: 11, fontWeight: 400, color: T.tertiary }}>{s.description}</span>
                <kbd style={{
                  fontSize: 10, fontWeight: 600, color: T.tertiary,
                  background: E[4], border: `1px solid ${E[6]}`,
                  borderRadius: 4, padding: '2px 6px',
                  fontFamily: "'Inconsolata', monospace",
                }}>
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
