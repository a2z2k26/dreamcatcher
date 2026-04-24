// SVG renderer for GraphCanvas. Pure imperative writer — reads from
// stores via .getState() so it stays off the React render path.
// Extracted from GraphCanvas.tsx to keep that file thin.

import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import {
  E, T, C, ACCENT,
  NODE_USER_STROKE, NODE_AI_STROKE,
} from '@/lib/theme';
import { getModel } from '@/lib/models';
import {
  renderEffects, getEntranceScale, getStreamingPulse,
  type EffectsState,
} from '@/lib/effects';
import { getLOD, resolveProvider, EDGE_RENDER, esc, hexPath } from './canvas-geometry';

const EDGE_DRAW_DURATION = 400; // ms

export interface RenderContext {
  readonly svg: SVGSVGElement | null;
  readonly container: HTMLDivElement | null;
  readonly selDash: number;            // dash offset for animated selection rings
  readonly time: number;               // total elapsed time in seconds
  readonly deadEnds: ReadonlySet<string>;
  readonly edgeCreatedAt: Map<string, number>;
  readonly effects: EffectsState;
}

function buildDefs(): string {
  let s = '<defs>';
  // Selection + streaming glows
  s += `<radialGradient id="glow-select"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.15"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="glow-stream"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.1"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
  // User node fill — convex curvature, top-lit
  s += `<radialGradient id="node-user-fill" cx="45%" cy="35%" r="65%">`;
  s += `<stop offset="0%" stop-color="${E[6]}"/>`;
  s += `<stop offset="60%" stop-color="${E[4]}"/>`;
  s += `<stop offset="100%" stop-color="${E[2]}"/>`;
  s += `</radialGradient>`;
  // User specular highlight
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
  // AI node — generic dark glass fill
  s += `<radialGradient id="node-ai-fill" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
  s += `<stop offset="80%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
  s += `</radialGradient>`;
  // Per-provider AI glass fills (subtle chromatic tint)
  s += `<radialGradient id="node-ai-fill-anthropic" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(212,165,116,0.08)"/>`;
  s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-ai-fill-openai" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(82,196,26,0.08)"/>`;
  s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-ai-fill-google" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(250,173,20,0.08)"/>`;
  s += `<stop offset="40%" stop-color="${E[3]}" stop-opacity="0.9"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
  s += `</radialGradient>`;
  // Per-provider streaming glow gradients
  s += `<radialGradient id="glow-stream-anthropic"><stop offset="0%" stop-color="#D4A574" stop-opacity="0.1"/><stop offset="100%" stop-color="#D4A574" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="glow-stream-openai"><stop offset="0%" stop-color="#52C41A" stop-opacity="0.1"/><stop offset="100%" stop-color="#52C41A" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="glow-stream-google"><stop offset="0%" stop-color="#FAAD14" stop-opacity="0.1"/><stop offset="100%" stop-color="#FAAD14" stop-opacity="0"/></radialGradient>`;
  // Ambient node aura
  s += `<radialGradient id="node-aura"><stop offset="30%" stop-color="${E[7]}" stop-opacity="0.06"/><stop offset="100%" stop-color="${E[7]}" stop-opacity="0"/></radialGradient>`;
  // Node drop shadow
  s += `<filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">`;
  s += `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/>`;
  s += `<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="rgba(8,7,6,0.5)"/>`;
  s += `</filter>`;
  // Edge arrow markers
  s += `<marker id="arrow-reply" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="rgba(128,128,128,0.30)"/></marker>`;
  s += `<marker id="arrow-branch" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.branch}" opacity="0.3"/></marker>`;
  s += `<marker id="arrow-regen" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${ACCENT}" opacity="0.2"/></marker>`;
  // Selection halo gradient
  s += `<radialGradient id="glow-select-halo"><stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.08"/><stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;
  s += `</defs>`;
  return s;
}

export function renderSVG(ctx: RenderContext): void {
  const { svg, container, selDash, time, deadEnds, edgeCreatedAt, effects } = ctx;
  if (!svg) return;

  const { nodes, edges, bodies } = useGraphStore.getState();
  const ui = useUIStore.getState();
  const { scale, selectedNodeId, hoveredNodeId, highlightMode, pathTrace, searchQuery, searchResults, selectedNodeIds } = ui;
  const searchActive = searchQuery.length > 0;
  const searchSet = searchActive ? new Set(searchResults) : null;
  const { level: lod, fadeIn: lodFade } = getLOD(scale);

  let s = buildDefs();

  // Build highlight set for branch visualization or path trace
  const BRANCH_LUMINANCE = [T.primary, T.secondary, T.tertiary, T.subtle];
  let highlightedNodes: Set<string> | null = null;
  const branchColorMap: Record<string, string> = {};
  if (highlightMode?.type === 'branches') {
    highlightedNodes = new Set<string>();
    highlightedNodes.add(highlightMode.branchPointId);
    let colorIdx = 0;
    for (const [, pathIds] of Object.entries(highlightMode.branchPaths)) {
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

  const traceCurrentId = pathTrace ? pathTrace.nodeIds[pathTrace.currentIndex] : null;
  const dashAnim = selDash;

  // Empty state — centered invitation when no nodes exist
  if (nodes.length === 0 && container) {
    const cx = (container.clientWidth / 2 - ui.panX) / scale;
    const cy = (container.clientHeight / 2 - ui.panY) / scale;
    const breathe = 0.4 + 0.1 * Math.sin(time * 0.8);
    s += `<g transform="translate(${cx},${cy})" opacity="${breathe}">`;
    s += `<text x="0" y="0" text-anchor="middle" fill="${E[5]}" font-family="Inter,system-ui,sans-serif" font-size="48" font-weight="200" letter-spacing="10">DC</text>`;
    s += `<text x="0" y="36" text-anchor="middle" fill="${T.ghost}" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="400">Start a conversation</text>`;
    s += `<text x="0" y="60" text-anchor="middle" fill="${T.dim}" font-family="'Inconsolata',monospace" font-size="11">Press / to focus input</text>`;
    s += `</g>`;
  }

  // Track edge creation times for draw-on animation
  const currentEdgeIds = new Set<string>();
  const nowMs = performance.now();
  for (const e of edges) {
    const edgeKey = `${e.from}->${e.to}`;
    currentEdgeIds.add(edgeKey);
    if (!edgeCreatedAt.has(edgeKey)) {
      edgeCreatedAt.set(edgeKey, nowMs);
    }
  }
  // Prune stale edges
  for (const key of edgeCreatedAt.keys()) {
    if (!currentEdgeIds.has(key)) edgeCreatedAt.delete(key);
  }

  // Edges
  for (const e of edges) {
    const a = bodies[e.from], b = bodies[e.to];
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const ux = dx / d, uy = dy / d;
    const x0 = a.x + ux * (a.r + 2), y0 = a.y + uy * (a.r + 2);
    const x1 = b.x - ux * (b.r + 2), y1 = b.y - uy * (b.r + 2);
    const mid = d * 0.35;
    const es = EDGE_RENDER[e.type] || EDGE_RENDER.reply;
    const curve = `M ${x0},${y0} C ${a.x + ux * mid},${a.y + uy * mid} ${b.x - ux * mid},${b.y - uy * mid} ${x1},${y1}`;
    const pathLen = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) * 1.2;
    const edgeKey = `${e.from}->${e.to}`;
    const createdAt = edgeCreatedAt.get(edgeKey) ?? 0;
    const elapsed = nowMs - createdAt;
    const drawProgress = Math.min(elapsed / EDGE_DRAW_DURATION, 1);
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

  // Branch points
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
    // Note: deadEnds and inheritedDash apply during rendering; reading deadEnds
    // here keeps the API surface consistent even if styling changes later.
    void deadEnds;
    const isInherited = n.isInherited === true;
    const inheritedDash = isInherited ? ' stroke-dasharray="4 2"' : '';

    const entranceScale = getEntranceScale(effects, n.id);
    const streamPulse = getStreamingPulse(effects, n.id, time);

    const isHighlighted = highlightedNodes ? highlightedNodes.has(n.id) : true;
    const isSearchMatch = searchSet ? searchSet.has(n.id) : true;
    const nodeOpacity = !isHighlighted ? 0.15 : !isSearchMatch ? 0.2 : 1;
    const hoverScale = isHov ? 1.06 : 1;
    s += `<g transform="translate(${body.x},${body.y}) scale(${entranceScale * hoverScale})" data-id="${n.id}" style="cursor:pointer;pointer-events:all" opacity="${nodeOpacity}">`;

    if (isSel) {
      s += `<circle cx="0" cy="0" r="${r * 1.6}" fill="url(#glow-select)"/>`;
    }

    if (n.role === 'user') {
      const strokeColor = isSel ? ACCENT : isHov ? T.primary : NODE_USER_STROKE;
      const specOpacity = isHov ? 0.35 : 0.22;

      if (isBranchPoint) {
        const shape = hexPath(r);
        s += `<path d="${shape}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}" stroke-linejoin="round"${inheritedDash} filter="url(#node-shadow)"/>`;
      } else {
        s += `<circle cx="0" cy="2" r="${r}" fill="black" opacity="0.3"/>`;
        s += `<circle cx="0" cy="0" r="${r}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}"${inheritedDash}/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.85}" fill="url(#node-user-spec)" opacity="${specOpacity}"/>`;
        s += `<circle cx="1" cy="2" r="${r + 0.5}" fill="none" stroke="${E[7]}" stroke-width="1" opacity="${isHov ? 0.4 : 0.25}" stroke-dasharray="${r * 1.8} ${r * 4.5}"/>`;
      }
      s += `<circle cx="0" cy="1" r="5.5" fill="black" opacity="0.15"/>`;
      s += `<circle cx="0" cy="0" r="5" fill="url(#node-user-core)"/>`;

    } else {
      const modelInfo = n.metadata.model ? getModel(n.metadata.model) : null;
      const modelColor = modelInfo?.color || T.ghost;
      const providerKey = resolveProvider(modelInfo);
      const strokeColor = isSel ? ACCENT : isHov ? T.secondary : NODE_AI_STROKE;
      const fillId = providerKey ? `node-ai-fill-${providerKey}` : 'node-ai-fill';

      if (isBranchPoint) {
        const shape = hexPath(r);
        s += `<path d="${shape}" fill="url(#${fillId})" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.5}" stroke-linejoin="round"${inheritedDash}/>`;
      } else {
        s += `<circle cx="0" cy="0" r="${r}" fill="url(#${fillId})" stroke="${E[5]}" stroke-width="2"${inheritedDash}/>`;
        s += `<circle cx="0" cy="0" r="${r - 3}" fill="none" stroke="${E[5]}" stroke-width="0.5" opacity="0.3"/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.6}" fill="none" stroke="${T.ghost}" stroke-width="0.4" stroke-dasharray="1.5 3" opacity="0.4"/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.45}" fill="none" stroke="${modelColor}" stroke-width="0.5" opacity="${isHov ? 0.3 : 0.2}"/>`;
        const tintOpacity = isHov ? 0.16 : 0.10;
        s += `<circle cx="0" cy="0" r="${r * 0.7}" fill="${modelColor}" opacity="${tintOpacity}"/>`;
        const coreOpacity = 0.15 + 0.05 * Math.sin(time * 2 + (n.id.charCodeAt(0) || 0));
        s += `<circle cx="0" cy="0" r="${r * 0.2}" fill="${modelColor}" opacity="${coreOpacity}"/>`;
        if (isHov) {
          s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>`;
        }
      }

      if (modelInfo && lod >= 2) {
        const iconOpacity = lod === 2 ? lodFade * 0.4 : 0.6;
        // Source paths have ~65-68 unit viewBoxes; scale 0.22 → ~14-15px. Center by offsetting ~34*0.22 = 7.5.
        s += `<g transform="translate(-7.5,-7.5) scale(0.22)"><path d="${modelInfo.icon}" fill="${modelColor}" opacity="${iconOpacity}"/></g>`;
      }

      if (streamPulse !== null) {
        s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${modelColor}" stroke-width="2" opacity="${streamPulse * 0.5}" stroke-dasharray="4 4" stroke-dashoffset="${selDash * 2}"/>`;
      }
    }

    if (lod >= 2) {
      const labelOpacity = lod === 2 ? lodFade : 1;
      const label = lod === 2
        ? n.label.slice(0, 14) + (n.label.length > 14 ? '..' : '')
        : n.label;
      const labelColor = n.role === 'user' ? T.tertiary : T.ghost;
      s += `<text x="0" y="${r + 18}" text-anchor="middle" fill="${labelColor}" font-family="Inconsolata,monospace" font-size="11" font-weight="400" letter-spacing="0.03em" opacity="${labelOpacity}">${esc(label)}</text>`;
    }

    if (isBranchPoint && lod >= 2) {
      const badgeOpacity = lod === 2 ? lodFade : 1;
      const count = childCounts[n.id];
      s += `<circle cx="${r + 5}" cy="${-r + 5}" r="8" fill="${E[6]}" stroke="${T.subtle}" stroke-width="0.5" opacity="${badgeOpacity}"/>`;
      s += `<text x="${r + 5}" y="${-r + 8.5}" text-anchor="middle" fill="${T.primary}" font-family="Inconsolata,monospace" font-size="10" font-weight="700" opacity="${badgeOpacity}">${count}</text>`;
    }

    s += '</g>';
  }

  // Multi-selection rings
  for (const multiId of selectedNodeIds) {
    if (multiId === selectedNodeId) continue;
    const body = bodies[multiId];
    if (body) {
      s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 6}" fill="none" stroke="${T.subtle}" stroke-width="0.8" stroke-dasharray="4 4" stroke-dashoffset="${selDash}" opacity="0.4"/>`;
    }
  }

  // Primary selection — three-layer
  if (selectedNodeId) {
    const body = bodies[selectedNodeId];
    if (body) {
      s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 24}" fill="url(#glow-select-halo)"/>`;
      s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 6}" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0.7"/>`;
      const breathR = body.r + 12 + 3 * Math.sin(time * 3);
      s += `<circle cx="${body.x}" cy="${body.y}" r="${breathR}" fill="none" stroke="${ACCENT}" stroke-width="0.6" opacity="0.15"/>`;
    }
  }

  // Path trace accent
  if (traceCurrentId) {
    const body = bodies[traceCurrentId];
    if (body) {
      const breathe = 0.4 + 0.2 * Math.sin(time * 4);
      s += `<circle cx="${body.x}" cy="${body.y}" r="${body.r + 10}" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="${breathe}"/>`;
    }
  }

  // Environmental effects
  s += renderEffects(effects, time);

  svg.innerHTML = s;
}
