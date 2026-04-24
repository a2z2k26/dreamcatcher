// Pure geometry + rendering helpers used by GraphCanvas.
// Kept React-free so they can be unit-tested in isolation.

import { T, C } from '@/lib/theme';
import type { EdgeType } from '@/types/graph';
import type { ModelInfo } from '@/lib/models';

// 4-level LOD system with crossfade zones
// LOD 0: < 25% — dots and lines only (topology)
// LOD 1: 25-50% — shapes distinguishable (user/AI/clip/summary)
// LOD 2: 50-75% — short labels, badges, streaming indicators
// LOD 3: > 75% — full labels, model icons, all metadata
export const LOD_THRESHOLDS = [0.25, 0.50, 0.75] as const;
export const LOD_FADE_ZONE = 0.05; // 5% crossfade zone around each threshold

export function getLOD(scale: number): { level: number; fadeIn: number } {
  for (let i = LOD_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = LOD_THRESHOLDS[i];
    if (scale >= t + LOD_FADE_ZONE) return { level: i + 1, fadeIn: 1 };
    if (scale >= t - LOD_FADE_ZONE) {
      const progress = (scale - (t - LOD_FADE_ZONE)) / (2 * LOD_FADE_ZONE);
      return { level: i + 1, fadeIn: progress };
    }
  }
  return { level: 0, fadeIn: 1 };
}

// Resolve model provider key for per-faction SVG gradient selection
export function resolveProvider(model: ModelInfo | null): string | null {
  if (!model) return null;
  if (model.id.includes('anthropic/')) return 'anthropic';
  if (model.id.includes('openai/')) return 'openai';
  if (model.id.includes('google/')) return 'google';
  return null;
}

// Per-edge-type rendering styles — reply is SOLID (primary thread), others dashed
export interface EdgeRenderStyle {
  readonly stroke: string;
  readonly dash: string;
  readonly width: number;
  readonly speed: number;
  readonly glow: string;
  readonly marker: string;
}

export const EDGE_RENDER: Record<EdgeType, EdgeRenderStyle> = {
  reply:        { stroke: 'rgba(140,140,140,0.30)', dash: '6 4', width: 1.5, speed: 0.8, glow: '', marker: '' },
  branch:       { stroke: 'rgba(176,176,176,0.30)', dash: '6 4', width: 1.5, speed: 0.8, glow: '', marker: '' },
  regeneration: { stroke: 'rgba(221,0,0,0.20)',     dash: '6 4', width: 1.5, speed: 0.8, glow: '', marker: '' },
  summarizes:   { stroke: T.invisible,              dash: '6 4', width: 1.0, speed: 0.8, glow: '', marker: '' },
  clips_to:     { stroke: `${C.memory}30`,          dash: '6 4', width: 1.0, speed: 0.8, glow: '', marker: '' },
  references:   { stroke: `${T.ghost}25`,           dash: '6 4', width: 1.0, speed: 0.8, glow: '', marker: '' },
};

// Escape text for safe SVG interpolation
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Hexagon path for branch point nodes
export function hexPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // flat-top hexagon
    pts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
