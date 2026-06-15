'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Hover Preview Card
// Shows a compact preview when hovering a node for 500ms.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { getModel } from '@/lib/models';
import { ACCENT, E, FF, R, T, accentGlow, glass, Z } from '@/lib/theme';
import type { GraphNode } from '@/types/graph';

interface CardData {
  readonly node: GraphNode;
  readonly x: number;
  readonly y: number;
}

export function HoverCard() {
  const [card, setCard] = useState<CardData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHoveredRef = useRef<string | null>(null);

  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const unsub = useUIStore.subscribe((state) => {
      const hoveredId = state.hoveredNodeId;
      const prevId = prevHoveredRef.current;

      if (hoveredId !== prevId) {
        // Clear existing timer and card
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setCard(null);

        if (hoveredId) {
          // Start 500ms timer
          timerRef.current = setTimeout(() => {
            const node = useGraphStore.getState().nodes.find(n => n.id === hoveredId);
            if (node && useUIStore.getState().hoveredNodeId === hoveredId) {
              setCard({ node, x: mouseX, y: mouseY });
            }
          }, 500);
        }

        prevHoveredRef.current = hoveredId;
      }
    });

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsub();
      window.removeEventListener('mousemove', handleMouseMove);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!card) return null;

  const { node, x, y } = card;

  // First 2 lines of text
  const lines = node.text.split('\n').slice(0, 2);
  const preview = lines.join('\n');
  const truncated = preview.length > 120 ? preview.slice(0, 120) + '...' : preview;

  // Model name
  const modelName = node.metadata.model
    ? getModel(node.metadata.model).name
    : node.role === 'user' ? 'User' : 'AI';

  // Timestamp
  const time = new Date(node.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Position: offset from cursor, clamp to viewport
  const cardWidth = 276;
  const cardHeight = 118;
  const offsetX = 12;
  const offsetY = 12;
  let left = x + offsetX;
  let top = y + offsetY;

  if (typeof window !== 'undefined') {
    const edgeMargin = 8;
    const topMargin = 46;
    const bottomReserve = 40;
    const maxLeft = Math.max(edgeMargin, window.innerWidth - cardWidth - edgeMargin);
    const maxTop = Math.max(topMargin, window.innerHeight - cardHeight - bottomReserve);

    if (left + cardWidth > window.innerWidth - edgeMargin) {
      left = x - cardWidth - offsetX;
    }
    if (top + cardHeight > window.innerHeight - bottomReserve) {
      top = y - cardHeight - offsetY;
    }

    left = Math.min(Math.max(left, edgeMargin), maxLeft);
    top = Math.min(Math.max(top, topMargin), maxTop);
  }

  return (
    <div
      className="dc-hover-card"
      style={{
        position: 'fixed',
        left,
        top,
        width: cardWidth,
        zIndex: Z.popover,
        pointerEvents: 'none',
        ...glass,
        borderRadius: R.card,
        padding: 10,
        background: 'linear-gradient(180deg, rgba(30,28,25,0.96) 0%, rgba(19,18,15,0.93) 100%)',
        overflow: 'hidden',
      }}
    >
      <span
        className="dc-hover-rail"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 2,
          borderRadius: 1,
          background: ACCENT,
          boxShadow: `0 0 6px ${accentGlow(0.5)}`,
        }}
      />
      <div
        className="dc-hover-header"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span
          className="dc-hover-kind"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 20,
            borderRadius: 6,
            border: `1px solid ${E[6]}`,
            background: 'rgba(255,255,255,0.032)',
            color: T.tertiary,
            font: `700 9px ${FF.mono}`,
            textTransform: 'uppercase',
          }}
        >
          {node.role === 'user' ? 'YOU' : 'AI'}
        </span>
        <span
          className="dc-hover-title"
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: T.secondary,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {node.label || 'Node preview'}
        </span>
        <span
          className="dc-hover-time"
          style={{
            color: T.dim,
            font: `700 9px ${FF.mono}`,
            whiteSpace: 'nowrap',
          }}
        >
          {time}
        </span>
      </div>
      <div
        className="dc-hover-preview"
        style={{
          fontSize: 11,
          color: T.tertiary,
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          maxHeight: 48,
          marginBottom: 8,
        }}
      >
        {truncated}
      </div>
      <div
        className="dc-hover-meta"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          paddingTop: 7,
          borderTop: `0.5px solid ${E[5]}`,
          color: T.ghost,
          font: `600 9px ${FF.mono}`,
          letterSpacing: 0.35,
          textTransform: 'uppercase',
        }}
      >
        <span>{modelName}</span>
        <span style={{ color: T.dim }}>·</span>
        <span>{node.metadata.tokens ?? 0} tok</span>
      </div>
    </div>
  );
}
