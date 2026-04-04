'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Toast Notifications
// Simple text toasts in bottom-left. Appear, fade after 2s.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';

interface ToastEntry {
  readonly id: number;
  readonly message: string;
}

// --- External store (module-level, no mutation of existing entries) ---

let toasts: readonly ToastEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emitChange() {
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot(): readonly ToastEntry[] {
  return toasts;
}

function removeToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emitChange();
}

export function showToast(message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emitChange();
  setTimeout(() => removeToast(id), 2000);
}

// --- Provider component ---

export function ToastProvider() {
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (currentToasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 48,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {currentToasts.map(t => (
        <div
          key={t.id}
          style={{
            fontFamily: "'Inconsolata', monospace",
            fontSize: 11,
            color: '#808080',
            whiteSpace: 'nowrap',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
