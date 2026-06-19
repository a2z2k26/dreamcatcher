'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Toast Notifications
// Simple text toasts in bottom-left. Appear, fade after 2s.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ACCENT, E, T, accentGlow, glass } from '@/lib/theme';

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
  const stackRef = useRef<HTMLDivElement>(null);
  const lastAnimatedToastIdRef = useRef<number | null>(null);

  useEffect(() => {
    const latestToast = currentToasts[currentToasts.length - 1];
    if (!latestToast || lastAnimatedToastIdRef.current === latestToast.id) return;
    lastAnimatedToastIdRef.current = latestToast.id;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const item = stackRef.current?.querySelector<HTMLElement>(`[data-toast-id="${latestToast.id}"]`);
    if (!item) return;

    const icon = item.querySelector<HTMLElement>('.dc-toast-icon');
    const timeline = gsap.timeline();
    timeline.fromTo(
      item,
      { autoAlpha: 0, y: 8, scale: 0.965, filter: 'blur(2px)' },
      { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.26, ease: 'power3.out' },
    );
    if (icon) {
      timeline.fromTo(
        icon,
        { scale: 0.78, rotation: -8 },
        { scale: 1, rotation: 0, duration: 0.28, ease: 'power3.out' },
        0.05,
      );
    }

    return () => {
      timeline.kill();
    };
  }, [currentToasts]);

  if (currentToasts.length === 0) return null;

  return (
    <div
      ref={stackRef}
      className="dc-toast-stack"
      style={{
        position: 'fixed',
        left: 16,
        bottom: 48,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        maxWidth: 'min(320px, calc(100vw - 24px))',
      }}
    >
      {currentToasts.map(t => (
        <div
          className="dc-toast-item"
          data-toast-id={t.id}
          key={t.id}
          style={{
            ...glass,
            position: 'relative',
            minHeight: 38,
            minWidth: 198,
            borderRadius: 8,
            padding: '8px 11px 8px 14px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            alignItems: 'center',
            gap: 9,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(26,24,22,0.95), rgba(19,18,15,0.92))',
          }}
        >
          <span
            className="dc-toast-rail"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 7,
              bottom: 7,
              width: 2,
              borderRadius: 1,
              background: ACCENT,
              boxShadow: `0 0 6px ${accentGlow(0.55)}`,
            }}
          />
          <span
            className="dc-toast-icon"
            aria-hidden="true"
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: `1px solid ${E[6]}`,
              background: 'rgba(255,255,255,0.028)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.tertiary,
            }}
          >
            <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M3 6.2 5 8l4-4.5" />
            </svg>
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              className="dc-toast-label"
              style={{
                display: 'block',
                color: ACCENT,
                fontFamily: "'iA Writer Mono S', 'Inconsolata', ui-monospace, monospace",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Event
            </span>
            <span
              className="dc-toast-message"
              style={{
                display: 'block',
                marginTop: 3,
                color: T.secondary,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t.message}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
