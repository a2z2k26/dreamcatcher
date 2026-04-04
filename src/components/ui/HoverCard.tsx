'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Hover Preview Card
// Shows a compact preview when hovering a node for 500ms.
// Positioned near the cursor, 240px wide.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { getModel } from '@/lib/models';
import { T, Z } from '@/lib/theme';
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

    const unsub = useUIStore.subscribe((state, prevState) => {
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
  const cardWidth = 240;
  const cardHeight = 80;
  const offsetX = 12;
  const offsetY = 12;
  let left = x + offsetX;
  let top = y + offsetY;

  if (typeof window !== 'undefined') {
    if (left + cardWidth > window.innerWidth - 8) {
      left = x - cardWidth - offsetX;
    }
    if (top + cardHeight > window.innerHeight - 8) {
      top = y - cardHeight - offsetY;
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width: cardWidth,
        zIndex: Z.popover,
        pointerEvents: 'none',
        background: '#0C0B09',
        border: '1px solid #252320',
        borderRadius: 6,
        padding: '8px 10px',
      }}
    >
      <div style={{
        fontSize: 11,
        color: T.tertiary,
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        maxHeight: 36,
        marginBottom: 6,
      }}>
        {truncated}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, color: T.dim, fontFamily: "'Inconsolata', monospace" }}>
          {modelName}
        </span>
        <span style={{ fontSize: 9, color: T.dim, fontFamily: "'Inconsolata', monospace" }}>
          {time}
        </span>
      </div>
    </div>
  );
}
