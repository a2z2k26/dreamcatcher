'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Minimap
// Fixed-position overview of all nodes with viewport indicator.
// Uses canvas for performance, subscribes to ui-store transforms.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useGraphStore } from '@/stores/graph-store';

const WIDTH = 160;
const HEIGHT = 100;
const BG = '#0A0908';
const BORDER = '#252320';
const DOT_COLOR = '#808080';
const VIEWPORT_COLOR = '#DD0000';

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
      canvas.width = WIDTH * dpr;
      canvas.height = HEIGHT * dpr;
      ctx.scale(dpr, dpr);

      // Clear
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const bodies = useGraphStore.getState().bodies;
      const ids = Object.keys(bodies);

      if (ids.length === 0) return;

      // Compute world bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id of ids) {
        const b = bodies[id];
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x);
        maxY = Math.max(maxY, b.y);
      }

      // Add padding
      const pad = 80;
      minX -= pad; minY -= pad; maxX += pad; maxY += pad;
      const worldW = maxX - minX || 1;
      const worldH = maxY - minY || 1;

      // Scale to fit minimap with aspect ratio preservation
      const scaleX = (WIDTH - 8) / worldW;
      const scaleY = (HEIGHT - 8) / worldH;
      const mapScale = Math.min(scaleX, scaleY);
      const offsetX = (WIDTH - worldW * mapScale) / 2;
      const offsetY = (HEIGHT - worldH * mapScale) / 2;

      // Draw dots for nodes
      ctx.fillStyle = DOT_COLOR;
      for (const id of ids) {
        const b = bodies[id];
        const mx = (b.x - minX) * mapScale + offsetX;
        const my = (b.y - minY) * mapScale + offsetY;
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw viewport rectangle
      const { scale, panX, panY } = useUIStore.getState();
      // Viewport in world coords: top-left = (-panX/scale, -panY/scale)
      // We need screen dimensions — approximate with common size or read from DOM
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const vpWorldX = -panX / scale;
      const vpWorldY = -panY / scale;
      const vpWorldW = screenW / scale;
      const vpWorldH = screenH / scale;

      const rx = (vpWorldX - minX) * mapScale + offsetX;
      const ry = (vpWorldY - minY) * mapScale + offsetY;
      const rw = vpWorldW * mapScale;
      const rh = vpWorldH * mapScale;

      ctx.strokeStyle = VIEWPORT_COLOR;
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="dc-minimap"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: WIDTH,
        height: HEIGHT,
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        overflow: 'hidden',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: WIDTH, height: HEIGHT }}
      />
    </div>
  );
}
