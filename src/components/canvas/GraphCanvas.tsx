'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Graph Canvas
// SVG infinite canvas with Unit-authentic force physics.
// Uses imperative rAF loop reading from Zustand directly
// (not via React re-renders — performance critical).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { createSimulation, tickSimulation, wakeSimulation, type SimulationState } from '@/lib/simulation';
import { createPhysicsBridge, type PhysicsBridge } from '@/lib/physics-bridge';
import {
  E, T, C, ACCENT, ACCENT_18, ACCENT_30, CANVAS_BG, GRID_COLOR,
  NODE_USER_FILL, NODE_USER_STROKE, NODE_USER_INNER,
  NODE_AI_FILL, NODE_AI_STROKE, NODE_AI_INNER,
  lighten, darken,
} from '@/lib/theme';
import { getModel } from '@/lib/models';
import { ContextMenu } from '@/components/ui/ContextMenu';
import {
  createEffects, tickEffects, renderEffects,
  addRipple, addEntrance, addDragTrail, setStreaming,
  getEntranceScale, getStreamingPulse, getShakeOffset,
  type EffectsState,
} from '@/lib/effects';
import type { EdgeType } from '@/types/graph';
import type { ModelInfo } from '@/lib/models';

// Resolve model provider key for per-faction SVG gradient selection
function resolveProvider(model: ModelInfo | null): string | null {
  if (!model) return null;
  if (model.id.includes('anthropic/')) return 'anthropic';
  if (model.id.includes('openai/')) return 'openai';
  if (model.id.includes('google/')) return 'google';
  
  return null;
}

// 4-level LOD system with crossfade zones
// LOD 0: < 25% — dots and lines only (topology)
// LOD 1: 25-50% — shapes distinguishable (user/AI/clip/summary)
// LOD 2: 50-75% — short labels, badges, streaming indicators
// LOD 3: > 75% — full labels, model icons, all metadata
const LOD_THRESHOLDS = [0.25, 0.50, 0.75] as const;
const LOD_FADE_ZONE = 0.05; // 5% crossfade zone around each threshold

function getLOD(scale: number): { level: number; fadeIn: number } {
  for (let i = LOD_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = LOD_THRESHOLDS[i];
    if (scale >= t + LOD_FADE_ZONE) return { level: i + 1, fadeIn: 1 };
    if (scale >= t - LOD_FADE_ZONE) {
      // In crossfade zone — interpolate
      const progress = (scale - (t - LOD_FADE_ZONE)) / (2 * LOD_FADE_ZONE);
      return { level: i + 1, fadeIn: progress };
    }
  }
  return { level: 0, fadeIn: 1 };
}

// Per-edge-type rendering styles — reply is SOLID (primary thread), others dashed
// Scaled up for visibility at new node sizes
const EDGE_RENDER: Record<EdgeType, { stroke: string; dash: string; width: number; speed: number; glow: string; marker: string }> = {
  reply:        { stroke: 'rgba(140,140,140,0.30)', dash: '6 4',  width: 1.5,  speed: 0.8, glow: '',  marker: '' },
  branch:       { stroke: 'rgba(176,176,176,0.30)', dash: '6 4',  width: 1.5,  speed: 0.8, glow: '',  marker: '' },
  regeneration: { stroke: `rgba(221,0,0,0.20)`,     dash: '6 4',  width: 1.5,  speed: 0.8, glow: '',  marker: '' },
  summarizes:   { stroke: `${T.invisible}`,          dash: '6 4',  width: 1.0,  speed: 0.8, glow: '',  marker: '' },
  clips_to:     { stroke: `${C.memory}30`,           dash: '6 4',  width: 1.0,  speed: 0.8, glow: '',  marker: '' },
  references:   { stroke: `${T.ghost}25`,            dash: '6 4',  width: 1.0,  speed: 0.8, glow: '',  marker: '' },
};

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<SimulationState>(createSimulation());
  const bridgeRef = useRef<PhysicsBridge | null>(null);
  const fxRef = useRef<EffectsState>(createEffects());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const selDashRef = useRef<number>(0);
  const timeRef = useRef<number>(0); // total elapsed time for oscillations
  const panRef = useRef({ isPanning: false, panSX: 0, panSY: 0 });
  const dragRef = useRef({ dragSX: 0, dragSY: 0, dragMoved: false, shiftKey: false });
  const deadEndsRef = useRef<ReadonlySet<string>>(new Set());
  const branchHoverRef = useRef<{ nodeId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const edgeCreatedAtRef = useRef<Map<string, number>>(new Map());

  // Subscribe to store changes — wake sim, add entrance effects, track streaming
  useEffect(() => {
    let prevNodeIds = new Set(useGraphStore.getState().nodes.map(n => n.id));
    let prevEdgeCount = useGraphStore.getState().edges.length;
    const unsub = useGraphStore.subscribe((state) => {
      const currentIds = new Set(state.nodes.map(n => n.id));
      // Detect new nodes → add entrance effects
      for (const id of currentIds) {
        if (!prevNodeIds.has(id)) {
          addEntrance(fxRef.current, id);
          // If it's an AI node with empty text, it's streaming
          const node = state.nodes.find(n => n.id === id);
          if (node?.role === 'ai' && !node.text) {
            setStreaming(fxRef.current, id, true);
          }
        }
      }
      // Clear streaming for finished nodes (label changed from "...")
      for (const nodeId of [...fxRef.current.streamingNodes]) {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node && node.label !== '...') {
          // Response started arriving — clear after short delay for visual continuity
          setTimeout(() => setStreaming(fxRef.current, nodeId, false), 500);
        }
      }
      if (currentIds.size !== prevNodeIds.size || state.edges.length !== prevEdgeCount) {
        wakeSimulation(simRef.current);
      }
      prevNodeIds = currentIds;
      prevEdgeCount = state.edges.length;
    });
    return unsub;
  }, []);

  // ── Imperative render functions (read from store directly) ──

  function drawGrid() {
    const canvas = gridRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { scale, panX, panY } = useUIStore.getState();
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W * devicePixelRatio, H * devicePixelRatio);
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const gap = 20 * scale;
    if (gap < 6) { ctx.setTransform(1, 0, 0, 1, 0, 0); return; }
    const ox = ((panX % gap) + gap) % gap;
    const oy = ((panY % gap) + gap) % gap;
    const r = Math.max(0.6, 0.8 * scale);
    ctx.fillStyle = GRID_COLOR;
    for (let x = ox; x < W; x += gap) {
      for (let y = oy; y < H; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function renderSVG() {
    const svg = svgRef.current;
    if (!svg) return;

    const { nodes, edges, bodies } = useGraphStore.getState();
    const { scale, selectedNodeId, hoveredNodeId, highlightMode, pathTrace, searchQuery, searchResults } = useUIStore.getState();
    const searchActive = searchQuery.length > 0;
    const searchSet = searchActive ? new Set(searchResults) : null;
    const { level: lod, fadeIn: lodFade } = getLOD(scale);
    let s = '';

    // SVG defs — gradients, filters, markers for dimensional materials
    s += `<defs>`;
    // Selection + streaming glows
    s += `<radialGradient id="glow-select"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.15"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="glow-stream"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.1"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
    // Node materials — user: convex curvature, top-lit
    s += `<radialGradient id="node-user-fill" cx="45%" cy="35%" r="65%">`;
    s += `<stop offset="0%" stop-color="${E[6]}"/>`;       // highlight
    s += `<stop offset="60%" stop-color="${E[4]}"/>`;      // mid
    s += `<stop offset="100%" stop-color="${E[2]}"/>`;     // shadow
    s += `</radialGradient>`;
    // User specular highlight — tighter hotspot, brighter center for visibility at scale
    s += `<radialGradient id="node-user-spec" cx="38%" cy="28%" r="40%">`;
    s += `<stop offset="0%" stop-color="rgba(255,255,255,0.25)"/>`;
    s += `<stop offset="30%" stop-color="rgba(225,225,225,0.08)"/>`;
    s += `<stop offset="100%" stop-color="rgba(225,225,225,0)"/>`;
    s += `</radialGradient>`;
    // User core dot gradient
    s += `<radialGradient id="node-user-core" cx="50%" cy="45%" r="50%">`;
    s += `<stop offset="0%" stop-color="#E8E4E0" stop-opacity="0.85"/>`;
    s += `<stop offset="100%" stop-color="#C0BCB8" stop-opacity="0.6"/>`;
    s += `</radialGradient>`;
    // AI node — dark glass fill (generic fallback)
    s += `<radialGradient id="node-ai-fill" cx="50%" cy="45%" r="60%">`;
    s += `<stop offset="0%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
    s += `<stop offset="80%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
    s += `</radialGradient>`;
    // Per-provider AI glass fills (subtle chromatic tint baked into gradient)
    s += `<radialGradient id="node-ai-fill-anthropic" cx="50%" cy="45%" r="60%">`;
    s += `<stop offset="0%" stop-color="rgba(212,165,116,0.08)"/>`;
    s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
    s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
    s += `</radialGradient>`;
    s += `<radialGradient id="node-ai-fill-openai" cx="50%" cy="45%" r="60%">`;
    s += `<stop offset="0%" stop-color="rgba(82,196,26,0.08)"/>`;       // #52C41A
    s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
    s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
    s += `</radialGradient>`;
    s += `<radialGradient id="node-ai-fill-google" cx="50%" cy="45%" r="60%">`;
    s += `<stop offset="0%" stop-color="rgba(250,173,20,0.08)"/>`;      // #FAAD14
    s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
    s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
    s += `</radialGradient>`;
    // Per-provider streaming glow gradients
    s += `<radialGradient id="glow-stream-anthropic"><stop offset="0%" stop-color="#D4A574" stop-opacity="0.1"/><stop offset="100%" stop-color="#D4A574" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="glow-stream-openai"><stop offset="0%" stop-color="#52C41A" stop-opacity="0.1"/><stop offset="100%" stop-color="#52C41A" stop-opacity="0"/></radialGradient>`;
    s += `<radialGradient id="glow-stream-google"><stop offset="0%" stop-color="#FAAD14" stop-opacity="0.1"/><stop offset="100%" stop-color="#FAAD14" stop-opacity="0"/></radialGradient>`;
    // Ambient node aura gradient (warm neutral)
    s += `<radialGradient id="node-aura"><stop offset="30%" stop-color="${E[7]}" stop-opacity="0.06"/><stop offset="100%" stop-color="${E[7]}" stop-opacity="0"/></radialGradient>`;
    // Node drop shadow filter
    s += `<filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">`;
    s += `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/>`;
    s += `<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="rgba(8,7,6,0.5)"/>`;
    s += `</filter>`;
    // Edge arrow markers — scaled up for visibility
    s += `<marker id="arrow-reply" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="rgba(128,128,128,0.30)"/></marker>`;
    s += `<marker id="arrow-branch" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.branch}" opacity="0.3"/></marker>`;
    s += `<marker id="arrow-regen" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${ACCENT}" opacity="0.2"/></marker>`;
    // Selection glow gradient
    s += `<radialGradient id="glow-select-halo"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.08"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
    s += `</defs>`;

    // Build highlight set for branch visualization or path trace
    const BRANCH_LUMINANCE = [T.primary, T.secondary, T.tertiary, T.subtle];
    let highlightedNodes: Set<string> | null = null;
    let branchColorMap: Record<string, string> = {};
    if (highlightMode?.type === 'branches') {
      highlightedNodes = new Set<string>();
      highlightedNodes.add(highlightMode.branchPointId);
      let colorIdx = 0;
      for (const [leafId, pathIds] of Object.entries(highlightMode.branchPaths)) {
        const color = BRANCH_LUMINANCE[colorIdx % BRANCH_LUMINANCE.length];
        for (const nid of pathIds) {
          highlightedNodes.add(nid);
          branchColorMap[nid] = color;
        }
        colorIdx++;
      }
    } else if (pathTrace) {
      highlightedNodes = new Set(pathTrace.nodeIds);
    }

    // Current path trace step (for accent ring)
    const traceCurrentId = pathTrace ? pathTrace.nodeIds[pathTrace.currentIndex] : null;

    // Animated dash offset for perpetual edge animation
    const dashAnim = selDashRef.current;

    // ── Empty state — centered invitation when no nodes exist ──
    if (nodes.length === 0) {
      const container = containerRef.current;
      if (container) {
        const cx = (container.clientWidth / 2 - (useUIStore.getState().panX)) / scale;
        const cy = (container.clientHeight / 2 - (useUIStore.getState().panY)) / scale;
        const breathe = 0.4 + 0.1 * Math.sin(timeRef.current * 0.8);
        s += `<g transform="translate(${cx},${cy})" opacity="${breathe}">`;
        // DC monogram
        s += `<text x="0" y="0" text-anchor="middle" fill="${E[5]}" font-family="Inter,system-ui,sans-serif" font-size="48" font-weight="200" letter-spacing="10">DC</text>`;
        // Tagline
        s += `<text x="0" y="36" text-anchor="middle" fill="${T.ghost}" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="400">Start a conversation</text>`;
        // Shortcut hint
        s += `<text x="0" y="60" text-anchor="middle" fill="${T.dim}" font-family="'Inconsolata',monospace" font-size="11">Press / to focus input</text>`;
        s += `</g>`;
      }
    }

    // Track edge creation times for draw-on animation
    const EDGE_DRAW_DURATION = 400; // ms
    const edgeMap = edgeCreatedAtRef.current;
    const currentEdgeIds = new Set<string>();
    const nowMs = performance.now();
    for (const e of edges) {
      const edgeKey = `${e.from}->${e.to}`;
      currentEdgeIds.add(edgeKey);
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, nowMs);
      }
    }
    // Prune stale edges
    for (const key of edgeMap.keys()) {
      if (!currentEdgeIds.has(key)) edgeMap.delete(key);
    }

    // Edges — perpetual animated dashes + draw-on animation for new edges
    for (const e of edges) {
      const a = bodies[e.from], b = bodies[e.to];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const ux = dx / d, uy = dy / d;
      const x0 = a.x + ux * (a.r + 2), y0 = a.y + uy * (a.r + 2);
      const x1 = b.x - ux * (b.r + 2), y1 = b.y - uy * (b.r + 2);
      const mid = d * 0.35;
      // Per-type edge styling
      const es = EDGE_RENDER[e.type] || EDGE_RENDER.reply;
      const curve = `M ${x0},${y0} C ${a.x + ux * mid},${a.y + uy * mid} ${b.x - ux * mid},${b.y - uy * mid} ${x1},${y1}`;
      // (glow underlayer removed — all edges are consistent dashed lines)
      // Approximate path length for draw-on animation
      const pathLen = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) * 1.2;
      const edgeKey = `${e.from}->${e.to}`;
      const createdAt = edgeMap.get(edgeKey) ?? 0;
      const elapsed = nowMs - createdAt;
      const drawProgress = Math.min(elapsed / EDGE_DRAW_DURATION, 1);
      // During draw-on: use stroke-dasharray/offset to reveal the path progressively
      let dashAttr: string;
      if (drawProgress < 1) {
        const drawn = pathLen * drawProgress;
        dashAttr = ` stroke-dasharray="${drawn} ${pathLen - drawn}"`;
      } else {
        dashAttr = es.dash ? ` stroke-dasharray="${es.dash}" stroke-dashoffset="${dashAnim * es.speed}"` : '';
      }
      const markerAttr = es.marker ? ` marker-end="${es.marker}"` : '';
      s += `<path d="${curve}" fill="none" stroke="${es.stroke}" stroke-width="${es.width}" stroke-linecap="round"${dashAttr}${markerAttr}/>`;
    }

    // Check which nodes are branch points (have multiple children)
    const childCounts: Record<string, number> = {};
    for (const e of edges) {
      childCounts[e.from] = (childCounts[e.from] || 0) + 1;
    }

    // Nodes
    for (const n of nodes) {
      const body = bodies[n.id];
      if (!body) continue;
      const isSel = selectedNodeId === n.id;
      const isHov = hoveredNodeId === n.id;
      const r = body.r;
      const isBranchPoint = (childCounts[n.id] || 0) > 1;
      const isDead = deadEndsRef.current.has(n.id);
      const isInherited = n.isInherited === true;
      const inheritedDash = isInherited ? ' stroke-dasharray="4 2"' : '';

      // Entrance animation scale
      const entranceScale = getEntranceScale(fxRef.current, n.id);
      // Streaming pulse
      const streamPulse = getStreamingPulse(fxRef.current, n.id, timeRef.current);

      // Opacity: dead-end dimming + highlight mode fading + search dimming
      const isHighlighted = highlightedNodes ? highlightedNodes.has(n.id) : true;
      const isSearchMatch = searchSet ? searchSet.has(n.id) : true;
      const nodeOpacity = !isHighlighted ? 0.15 : !isSearchMatch ? 0.2 : 1;
      const hoverScale = isHov ? 1.06 : 1;
      s += `<g transform="translate(${body.x},${body.y}) scale(${entranceScale * hoverScale})" data-id="${n.id}" style="cursor:pointer;pointer-events:all" opacity="${nodeOpacity}">`;

      // Selection glow only — no ambient aura (removed: invisible noise)
      if (isSel) {
        s += `<circle cx="0" cy="0" r="${r * 1.6}" fill="url(#glow-select)"/>`;
      }

      if (n.role === 'user') {
        // USER NODE: Multi-layer dimensional material — precious specimen
        const strokeColor = isSel ? ACCENT : isHov ? T.primary : NODE_USER_STROKE;
        const specOpacity = isHov ? 0.35 : 0.22;

        if (isBranchPoint) {
          const shape = hexPath(r);
          s += `<path d="${shape}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}" stroke-linejoin="round"${inheritedDash} filter="url(#node-shadow)"/>`;
        } else {
          // Layer 1 — Drop shadow
          s += `<circle cx="0" cy="2" r="${r}" fill="black" opacity="0.3"/>`;
          // Layer 2 — Radial gradient fill (convex, top-lit)
          s += `<circle cx="0" cy="0" r="${r}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}"${inheritedDash}/>`;
          // Layer 3 — Specular highlight (visible at new scale)
          s += `<circle cx="0" cy="0" r="${r * 0.85}" fill="url(#node-user-spec)" opacity="${specOpacity}"/>`;
          // Layer 4 — Rim light (bottom-right catch)
          s += `<circle cx="1" cy="2" r="${r + 0.5}" fill="none" stroke="${E[7]}" stroke-width="1" opacity="${isHov ? 0.4 : 0.25}" stroke-dasharray="${r * 1.8} ${r * 4.5}"/>`;
        }
        // Layer 5 — Core dot shadow + core dot (precious center)
        s += `<circle cx="0" cy="1" r="5.5" fill="black" opacity="0.15"/>`;
        s += `<circle cx="0" cy="0" r="5" fill="url(#node-user-core)"/>`;

      } else {
        // AI NODE: Hollow glass vessel — faction-branded per model provider
        const modelInfo = n.metadata.model ? getModel(n.metadata.model) : null;
        const modelColor = modelInfo?.color || T.ghost;
        const providerKey = resolveProvider(modelInfo);
        const strokeColor = isSel ? ACCENT : isHov ? T.secondary : NODE_AI_STROKE;
        const fillId = providerKey ? `node-ai-fill-${providerKey}` : 'node-ai-fill';

        if (isBranchPoint) {
          const shape = hexPath(r);
          s += `<path d="${shape}" fill="url(#${fillId})" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.5}" stroke-linejoin="round"${inheritedDash}/>`;
        } else {
          // Layer 1 — Outer bezel
          s += `<circle cx="0" cy="0" r="${r}" fill="url(#${fillId})" stroke="${E[5]}" stroke-width="2"${inheritedDash}/>`;
          s += `<circle cx="0" cy="0" r="${r - 3}" fill="none" stroke="${E[5]}" stroke-width="0.5" opacity="0.3"/>`;
          // Layer 2 — Inner refraction ring (dashed, lens-like)
          s += `<circle cx="0" cy="0" r="${r * 0.6}" fill="none" stroke="${T.ghost}" stroke-width="0.4" stroke-dasharray="1.5 3" opacity="0.4"/>`;
          // Layer 3 — Faction-colored inner ring (visible identity signal)
          s += `<circle cx="0" cy="0" r="${r * 0.45}" fill="none" stroke="${modelColor}" stroke-width="0.5" opacity="${isHov ? 0.3 : 0.2}"/>`;
          // Layer 4 — Model color tint (chromatic wash — now visible at 10%)
          const tintOpacity = isHov ? 0.16 : 0.10;
          s += `<circle cx="0" cy="0" r="${r * 0.7}" fill="${modelColor}" opacity="${tintOpacity}"/>`;
          // Layer 5 — Model-colored core indicator (pulsing)
          const coreOpacity = 0.15 + 0.05 * Math.sin(timeRef.current * 2 + (n.id.charCodeAt(0) || 0));
          s += `<circle cx="0" cy="0" r="${r * 0.2}" fill="${modelColor}" opacity="${coreOpacity}"/>`;
          // Hover: outer stroke brightens
          if (isHov) {
            s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>`;
          }
        }

        // Model icon inside (larger, faction-colored)
        if (modelInfo && lod >= 2) {
          const iconOpacity = lod === 2 ? lodFade * 0.4 : 0.6;
          s += `<g transform="translate(-7,-7) scale(0.58)"><path d="${modelInfo.icon}" fill="${modelColor}" opacity="${iconOpacity}"/></g>`;
        }

        // Streaming: single faction-colored dashed crawl on the node stroke
        if (streamPulse !== null) {
          s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${modelColor}" stroke-width="2" opacity="${streamPulse * 0.5}" stroke-dasharray="4 4" stroke-dashoffset="${selDashRef.current * 2}"/>`;
        }
      }

      // Label — LOD 2: short labels (14 char), LOD 3: full labels
      if (lod >= 2) {
        const labelOpacity = lod === 2 ? lodFade : 1;
        const label = lod === 2
          ? n.label.slice(0, 14) + (n.label.length > 14 ? '..' : '')
          : n.label;
        const labelColor = n.role === 'user' ? T.tertiary : T.ghost;
        s += `<text x="0" y="${r + 18}" text-anchor="middle" fill="${labelColor}" font-family="Inconsolata,monospace" font-size="11" font-weight="400" letter-spacing="0.03em" opacity="${labelOpacity}">${esc(label)}</text>`;
      }

      // Branch count badge — LOD 2+ (scaled up)
      if (isBranchPoint && lod >= 2) {
        const badgeOpacity = lod === 2 ? lodFade : 1;
        const count = childCounts[n.id];
        s += `<circle cx="${r + 5}" cy="${-r + 5}" r="8" fill="${E[6]}" stroke="${T.subtle}" stroke-width="0.5" opacity="${badgeOpacity}"/>`;
        s += `<text x="${r + 5}" y="${-r + 8.5}" text-anchor="middle" fill="${T.primary}" font-family="Inconsolata,monospace" font-size="10" font-weight="700" opacity="${badgeOpacity}">${count}</text>`;
      }

      s += '</g>';
    }

    // Multi-selection rings (dimmer than primary)
    const { selectedNodeIds } = useUIStore.getState();
    for (const multiId of selectedNodeIds) {
      if (multiId === selectedNodeId) continue; // primary rendered separately
      const body = bodies[multiId];
      if (body) {
        s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 6}" fill="none" stroke="${T.subtle}" stroke-width="0.8" stroke-dasharray="4 4" stroke-dashoffset="${selDashRef.current}" opacity="0.4"/>`;
      }
    }

    // Primary selection — three-layer per DESIGN-SPEC
    if (selectedNodeId) {
      const body = bodies[selectedNodeId];
      if (body) {
        // Layer 1 — Atmospheric halo
        s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 24}" fill="url(#glow-select-halo)"/>`;
        // Layer 2 — Crisp ring (SOLID, committed selection)
        s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 6}" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0.7"/>`;
        // Layer 3 — Breathing ring (alive, not distracting)
        const breathR = body.r + 12 + 3 * Math.sin(timeRef.current * 3);
        s += `<circle cx="${body.x}" cy="${body.y}" r="${breathR}" fill="none" stroke="${ACCENT}" stroke-width="0.6" opacity="0.15"/>`;
      }
    }

    // Path trace: accent ring on current step + breathing glow
    if (traceCurrentId) {
      const body = bodies[traceCurrentId];
      if (body) {
        const breathe = 0.4 + 0.2 * Math.sin(timeRef.current * 4);
        s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 10}" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="${breathe}"/>`;
      }
    }

    // Environmental effects (ripples, trails)
    s += renderEffects(fxRef.current, timeRef.current);

    svg.innerHTML = s;
  }

  // ── Physics bridge — initialize on mount ──
  useEffect(() => {
    const bridge = createPhysicsBridge(
      // Position callback: apply worker positions to main-thread bodies
      (positions) => {
        const { bodies } = useGraphStore.getState();
        for (const [id, pos] of Object.entries(positions)) {
          const body = bodies[id];
          if (body && body.fx === undefined) {
            body.x = pos.x;
            body.y = pos.y;
          }
        }
        // Wake the render loop
        simRef.current.running = true;
      },
      () => useGraphStore.getState().bodies,
      () => useGraphStore.getState().edges,
      () => simRef.current,
    );
    bridgeRef.current = bridge;

    // Init with current state
    const { bodies, edges } = useGraphStore.getState();
    bridge.init(bodies, edges);

    return () => bridge.dispose();
  }, []);

  // ── Sync new nodes/edges to the bridge ──
  useEffect(() => {
    let prevNodeCount = useGraphStore.getState().nodes.length;
    let prevEdgeCount = useGraphStore.getState().edges.length;
    const unsub = useGraphStore.subscribe((state) => {
      const bridge = bridgeRef.current;
      if (!bridge || !bridge.isWorker) return;
      if (state.edges.length !== prevEdgeCount) {
        bridge.setEdges(state.edges);
        prevEdgeCount = state.edges.length;
      }
      if (state.nodes.length !== prevNodeCount) {
        // Find new nodes and send them
        const bodyIds = new Set(Object.keys(state.bodies));
        for (const node of state.nodes) {
          if (state.bodies[node.id]) {
            // Could be new — bridge.addNode is idempotent
          }
        }
        // Simpler: re-init when nodes change
        bridge.init(state.bodies, state.edges);
        prevNodeCount = state.nodes.length;
      }
    });
    return unsub;
  }, []);

  // ── Dead-end detection — 1Hz interval ──
  useEffect(() => {
    const interval = setInterval(() => {
      deadEndsRef.current = useGraphStore.getState().getDeadEndBranches();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Cmd+F / Ctrl+F — open search (works from anywhere)
      if ((e.key === 'f' || e.key === 'F') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUIStore.getState().setSearchOpen(true);
        return;
      }

      // Don't fire when typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      const { selectedNodeId, pathTrace, highlightMode } = useUIStore.getState();

      if (e.key === 't' || e.key === 'T') {
        if (pathTrace) {
          useUIStore.getState().exitPathTrace();
        } else if (selectedNodeId) {
          const path = useGraphStore.getState().getAncestralPath(selectedNodeId);
          useUIStore.getState().startPathTrace(path.map(n => n.id));
        }
        return;
      }

      if (e.key === 'Escape') {
        if (pathTrace) useUIStore.getState().exitPathTrace();
        if (highlightMode) useUIStore.getState().setHighlightMode(null);
        return;
      }

      if (e.key === ' ') {
        // Fit to view
        e.preventDefault();
        const { bodies } = useGraphStore.getState();
        const ids = Object.keys(bodies);
        if (ids.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const id of ids) {
          const b = bodies[id];
          minX = Math.min(minX, b.x - b.r);
          minY = Math.min(minY, b.y - b.r);
          maxX = Math.max(maxX, b.x + b.r);
          maxY = Math.max(maxY, b.y + b.r);
        }
        const container = containerRef.current;
        if (!container) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const pad = 60;
        const scaleX = (cw - pad * 2) / (maxX - minX || 1);
        const scaleY = (ch - pad * 2) / (maxY - minY || 1);
        const newScale = Math.min(scaleX, scaleY, 2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        useUIStore.getState().setTransform(newScale, cw / 2 - cx * newScale, ch / 2 - cy * newScale);
        simRef.current.running = true;
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('.dc-input');
        if (input) input.focus();
        return;
      }

      if (e.key === 'i' || e.key === 'I') {
        const { inspectorOpen } = useUIStore.getState();
        useUIStore.getState().setInspectorOpen(!inspectorOpen);
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        useUIStore.getState().toggleTimeline();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        const { useMemoryStore } = require('@/stores/memory-store');
        const { shelfOpen, setShelfOpen } = useMemoryStore.getState();
        setShelfOpen(!shelfOpen);
        return;
      }

      // ── Arrow key graph navigation ──
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNodeId) {
        e.preventDefault();
        const { nodes, edges, bodies } = useGraphStore.getState();
        const currentNode = nodes.find(n => n.id === selectedNodeId);
        if (!currentNode) return;

        let targetId: string | null = null;

        if (e.key === 'ArrowUp') {
          // Move to parent
          if (currentNode.parentId) {
            targetId = currentNode.parentId;
          }
        } else if (e.key === 'ArrowDown') {
          // Move to first child
          const childEdges = edges.filter(edge => edge.from === selectedNodeId);
          if (childEdges.length > 0) {
            targetId = childEdges[0].to;
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // Move to sibling (other children of same parent)
          if (currentNode.parentId) {
            const siblingEdges = edges.filter(edge => edge.from === currentNode.parentId);
            const siblingIds = siblingEdges.map(edge => edge.to);
            const currentIndex = siblingIds.indexOf(selectedNodeId);
            if (currentIndex !== -1) {
              const direction = e.key === 'ArrowLeft' ? -1 : 1;
              const nextIndex = currentIndex + direction;
              if (nextIndex >= 0 && nextIndex < siblingIds.length) {
                targetId = siblingIds[nextIndex];
              }
            }
          }
        }

        if (targetId) {
          useUIStore.getState().setSelectedNode(targetId);
          useGraphStore.getState().setActiveNode(targetId);
          // Auto-pan to the newly selected node
          const body = bodies[targetId];
          if (body) {
            useUIStore.getState().animateTo(body.x, body.y);
          }
          simRef.current.running = true;
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // ── Animation loop — reads from stores imperatively ──
  useEffect(() => {
    let frameCount = 0;

    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      frameCount++;

      const { bodies, edges, nodes } = useGraphStore.getState();
      const { scale, panX, panY } = useUIStore.getState();

      timeRef.current += dt;
      const hasContent = nodes.length > 0;

      // Only run main-thread physics if bridge is not a worker
      const bridge = bridgeRef.current;
      const useMainThread = !bridge || !bridge.isWorker;
      const moved = hasContent && useMainThread ? tickSimulation(simRef.current, bodies, edges) : simRef.current.running;

      selDashRef.current -= dt * 30;
      tickEffects(fxRef.current, dt);

      // Auto-pan animation toward target
      const { animTarget } = useUIStore.getState();
      let currentPanX = panX;
      let currentPanY = panY;
      if (animTarget) {
        const elapsed = now - animTarget.startTime;
        const t = Math.min(elapsed / animTarget.duration, 1);
        const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const container = containerRef.current;
        if (container) {
          const cx = container.clientWidth / 2;
          const cy = container.clientHeight / 2;
          const targetPanX = cx - animTarget.x * scale;
          const targetPanY = cy - animTarget.y * scale;
          currentPanX = panX + (targetPanX - panX) * ease;
          currentPanY = panY + (targetPanY - panY) * ease;
          if (t >= 1) {
            useUIStore.getState().setTransform(scale, targetPanX, targetPanY);
            useUIStore.setState({ animTarget: null });
          }
        }
      }

      // Apply screen shake offset to world transform
      const shake = getShakeOffset(fxRef.current, timeRef.current);
      const world = worldRef.current;
      if (world) {
        world.style.transform = `translate(${currentPanX + shake.x}px,${currentPanY + shake.y}px) scale(${scale})`;
      }
      if (frameCount < 10 || hasContent) {
        drawGrid();
        renderSVG();
      }
      if (!moved && frameCount >= 10) simRef.current.running = false;
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // No deps — loop reads from stores directly

  // ── Mouse handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const nodeEl = (e.target as SVGElement).closest?.('[data-id]');
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-id')!;
      const { bodies } = useGraphStore.getState();
      const { scale, panX, panY } = useUIStore.getState();
      const body = bodies[id];
      if (!body) return;
      const rect = container.getBoundingClientRect();
      body.hx = ((e.clientX - rect.left - panX) / scale) - body.x;
      body.hy = ((e.clientY - rect.top - panY) / scale) - body.y;
      body.fx = body.x;
      body.fy = body.y;
      useUIStore.getState().setDragNode(id);
      dragRef.current = { dragSX: e.clientX, dragSY: e.clientY, dragMoved: false, shiftKey: e.shiftKey };
      bridgeRef.current?.dragStart(id, body.x, body.y);
      wakeSimulation(simRef.current);
      e.preventDefault();
      return;
    }

    const { panX, panY } = useUIStore.getState();
    panRef.current = { isPanning: true, panSX: e.clientX - panX, panSY: e.clientY - panY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const { dragNodeId } = useUIStore.getState();

    if (dragNodeId) {
      const { bodies } = useGraphStore.getState();
      const { scale, panX, panY } = useUIStore.getState();
      const body = bodies[dragNodeId];
      if (!body) return;
      const rect = container.getBoundingClientRect();
      body.fx = ((e.clientX - rect.left - panX) / scale) - body.hx;
      body.fy = ((e.clientY - rect.top - panY) / scale) - body.hy;
      body.x = body.fx;
      body.y = body.fy;
      bridgeRef.current?.dragMove(dragNodeId, body.fx, body.fy);
      // Track screen position for hotspots
      dragScreenRef.current = { x: e.clientX, y: e.clientY };
      // Drag trail effect
      addDragTrail(fxRef.current, body.x, body.y);
      if (Math.abs(e.clientX - dragRef.current.dragSX) > 3 || Math.abs(e.clientY - dragRef.current.dragSY) > 3) {
        dragRef.current.dragMoved = true;
      }
      wakeSimulation(simRef.current);
      return;
    }

    if (panRef.current.isPanning) {
      const { scale } = useUIStore.getState();
      useUIStore.getState().setTransform(scale, e.clientX - panRef.current.panSX, e.clientY - panRef.current.panSY);
      simRef.current.running = true;
      return;
    }

    // Hover
    const { nodes, bodies } = useGraphStore.getState();
    const { scale, panX, panY, hoveredNodeId } = useUIStore.getState();
    const rect = container.getBoundingClientRect();
    const mx = (e.clientX - rect.left - panX) / scale;
    const my = (e.clientY - rect.top - panY) / scale;
    let found: string | null = null;
    for (const n of nodes) {
      const body = bodies[n.id];
      if (body && Math.hypot(mx - body.x, my - body.y) < body.r + 8) found = n.id;
    }
    if (found !== hoveredNodeId) {
      useUIStore.getState().setHoveredNode(found);
      simRef.current.running = true;

      // Branch preview: 500ms hover on branch points
      if (branchHoverRef.current) {
        clearTimeout(branchHoverRef.current.timer);
        branchHoverRef.current = null;
      }
      if (found) {
        const childCount = useGraphStore.getState().getChildCount(found);
        if (childCount > 1) {
          const timer = setTimeout(() => {
            const body = useGraphStore.getState().bodies[found];
            if (body) {
              const { scale: s2, panX: px2, panY: py2 } = useUIStore.getState();
              const screenX = body.x * s2 + px2 + (containerRef.current?.getBoundingClientRect().left || 0);
              const screenY = body.y * s2 + py2 + (containerRef.current?.getBoundingClientRect().top || 0);
              useUIStore.getState().setBranchPreview({ nodeId: found, x: screenX, y: screenY });
            }
          }, 500);
          branchHoverRef.current = { nodeId: found, timer };
        }
      } else {
        useUIStore.getState().setBranchPreview(null);
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const { dragNodeId } = useUIStore.getState();
    if (dragNodeId) {
      const { bodies } = useGraphStore.getState();
      const body = bodies[dragNodeId];
      if (body) { body.fx = undefined; body.fy = undefined; body.hx = 0; body.hy = 0; }
      bridgeRef.current?.dragEnd(dragNodeId);

      // Check hotspot drops
      const container = containerRef.current;
      if (container && dragRef.current.dragMoved) {
        const rect = container.getBoundingClientRect();
        const sx = dragScreenRef.current.x - rect.left;
        const sy = dragScreenRef.current.y - rect.top;
        const ZONE = 80; // hotspot zone width in px

        if (sx < ZONE && sy < rect.height / 2) {
          // Left edge, top half = Learn zone
          useUIStore.getState().openLearning(dragNodeId);
        } else if (sx < ZONE && sy >= rect.height / 2) {
          // Left edge, bottom half = Remember zone
          const node = useGraphStore.getState().nodes.find(n => n.id === dragNodeId);
          if (node) {
            const path = useGraphStore.getState().getAncestralPath(dragNodeId);
            const contextSummary = path.slice(-3).map(n => `${n.role}: ${n.text.slice(0, 100)}`).join('\n');
            const { useMemoryStore } = require('@/stores/memory-store');
            useMemoryStore.getState().addMemory({
              id: `mem-${Date.now()}`,
              name: node.label || node.text.slice(0, 40),
              content: node.text,
              context: contextSummary,
              tags: [],
              sourceNodeId: dragNodeId,
              sourcePathNodeIds: path.map(n => n.id),
              createdAt: Date.now(),
              type: 'node' as const,
            });
          }
        }
      }

      if (!dragRef.current.dragMoved) {
        if (dragRef.current.shiftKey) {
          // Shift+click → toggle multi-select
          useUIStore.getState().toggleMultiSelect(dragNodeId);
        } else {
          useUIStore.getState().setSelectedNode(dragNodeId);
        }
        useGraphStore.getState().setActiveNode(dragNodeId);
      }
      useUIStore.getState().setDragNode(null);
      wakeSimulation(simRef.current);
      return;
    }
    panRef.current.isPanning = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const { scale, panX, panY } = useUIStore.getState();
    const d = e.deltaY > 0 ? 0.94 : 1.06;
    const ns = Math.max(0.12, Math.min(5, scale * d));
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    useUIStore.getState().setTransform(ns, mx - (mx - panX) * (ns / scale), my - (my - panY) * (ns / scale));
    simRef.current.running = true;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Add ripple at click position (in world coordinates)
    const container = containerRef.current;
    if (container) {
      const { scale, panX, panY } = useUIStore.getState();
      const rect = container.getBoundingClientRect();
      const wx = (e.clientX - rect.left - panX) / scale;
      const wy = (e.clientY - rect.top - panY) / scale;
      addRipple(fxRef.current, wx, wy);
    }

    const nodeEl = (e.target as SVGElement).closest?.('[data-id]');
    if (!nodeEl) {
      useUIStore.getState().setSelectedNode(null);
      useUIStore.getState().closeContextMenu();
      useUIStore.getState().setHighlightMode(null); // exit highlight mode
      simRef.current.running = true;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const nodeEl = (e.target as SVGElement).closest?.('[data-id]');
    if (!nodeEl) return;
    e.preventDefault();
    const id = nodeEl.getAttribute('data-id')!;
    useUIStore.getState().openContextMenu(id, e.clientX, e.clientY);
  }, []);

  // ── Touch long-press for context menu ──
  const touchRef = useRef<{ timer: ReturnType<typeof setTimeout>; startX: number; startY: number; nodeId: string } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const nodeEl = (e.target as SVGElement).closest?.('[data-id]');
    if (!nodeEl) return;
    const id = nodeEl.getAttribute('data-id')!;
    const timer = setTimeout(() => {
      useUIStore.getState().openContextMenu(id, touch.clientX, touch.clientY);
      touchRef.current = null;
    }, 500);
    touchRef.current = { timer, startX: touch.clientX, startY: touch.clientY, nodeId: id };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchRef.current.startX;
    const dy = touch.clientY - touchRef.current.startY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(touchRef.current.timer);
      touchRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current) {
      clearTimeout(touchRef.current.timer);
      touchRef.current = null;
    }
  }, []);

  // Track drag screen position for hotspot detection
  const dragScreenRef = useRef({ x: 0, y: 0 });

  // Read state for render
  const { scale, panX, panY } = useUIStore();
  const contextMenu = useUIStore(s => s.contextMenu);
  const closeContextMenu = useUIStore(s => s.closeContextMenu);
  const dragNodeId = useUIStore(s => s.dragNodeId);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: CANVAS_BG, cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={gridRef} className="absolute inset-0 pointer-events-none" />
      {/* Vignette removed per Andrew's feedback — clean canvas with dot grid only */}
      {/* Noise removed per Andrew's feedback — dot grid + vignette is the canvas treatment */}
      <div
        ref={worldRef}
        className="absolute top-0 left-0"
        style={{ transformOrigin: '0 0', transform: `translate(${panX}px,${panY}px) scale(${scale})` }}
      >
        <svg
          ref={svgRef}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
          width="1"
          height="1"
        />
      </div>
      {/* Canvas Hotspots — visible when dragging */}
      {dragNodeId && (
        <>
          {/* Learn zone — left edge, top half */}
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute', left: 0, top: 0, bottom: '50%', width: 80,
              background: `linear-gradient(to right, ${ACCENT_18}, transparent)`,
              borderRight: `1px solid ${ACCENT_30}`,
              borderBottom: `1px solid ${E[5]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{
              writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const,
              fontSize: 10, fontWeight: 600, letterSpacing: 2,
              textTransform: 'uppercase' as const, color: `${ACCENT}60`,
            }}>
              LEARN
            </div>
          </div>
          {/* Remember zone — left edge, bottom half */}
          <div
            className="pointer-events-none"
            style={{
              position: 'absolute', left: 0, top: '50%', bottom: 0, width: 80,
              background: `linear-gradient(to right, ${E[3]}80, transparent)`,
              borderRight: `1px solid ${E[6]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
          >
            <div style={{
              writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const,
              fontSize: 10, fontWeight: 600, letterSpacing: 2,
              textTransform: 'uppercase' as const, color: T.ghost,
            }}>
              REMEMBER
            </div>
          </div>
        </>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Hexagon path for branch point nodes
function hexPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // flat-top hexagon
    pts.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
