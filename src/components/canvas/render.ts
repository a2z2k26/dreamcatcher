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
  s += `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>`;
  s += `<stop offset="34%" stop-color="${T.primary}" stop-opacity="0.10"/>`;
  s += `<stop offset="100%" stop-color="${T.primary}" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  // User core dot gradient
  s += `<radialGradient id="node-user-core" cx="50%" cy="45%" r="50%">`;
  s += `<stop offset="0%" stop-color="#E8E4E0" stop-opacity="0.85"/>`;
  s += `<stop offset="100%" stop-color="#C0BCB8" stop-opacity="0.6"/>`;
  s += `</radialGradient>`;
  // AI node — generic dark glass fill
  s += `<radialGradient id="node-ai-fill" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="${E[4]}" stop-opacity="0.98"/>`;
  s += `<stop offset="46%" stop-color="${E[3]}" stop-opacity="0.96"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.98"/>`;
  s += `</radialGradient>`;
  // Per-provider AI glass fills (subtle chromatic tint)
  s += `<radialGradient id="node-ai-fill-anthropic" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(224,133,66,0.16)"/>`;
  s += `<stop offset="44%" stop-color="${E[3]}" stop-opacity="0.95"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.98"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-ai-fill-openai" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(74,143,224,0.14)"/>`;
  s += `<stop offset="44%" stop-color="${E[3]}" stop-opacity="0.95"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.98"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-ai-fill-google" cx="50%" cy="45%" r="60%">`;
  s += `<stop offset="0%" stop-color="rgba(234,67,53,0.13)"/>`;
  s += `<stop offset="44%" stop-color="${E[3]}" stop-opacity="0.95"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.98"/>`;
  s += `</radialGradient>`;
  // Shared node specular overlay for glass vessels.
  s += `<radialGradient id="node-glass-spec" cx="36%" cy="26%" r="42%">`;
  s += `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>`;
  s += `<stop offset="34%" stop-color="${T.primary}" stop-opacity="0.08"/>`;
  s += `<stop offset="100%" stop-color="${T.primary}" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  // Hot material cores, matching the Dreamcatcher design-system specimen nodes.
  s += `<radialGradient id="node-hot-core-neutral" cx="42%" cy="35%" r="64%">`;
  s += `<stop offset="0%" stop-color="${T.primary}" stop-opacity="0.42"/>`;
  s += `<stop offset="42%" stop-color="${T.tertiary}" stop-opacity="0.14"/>`;
  s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-hot-core-anthropic" cx="42%" cy="35%" r="64%">`;
  s += `<stop offset="0%" stop-color="#FFD9B4" stop-opacity="0.62"/>`;
  s += `<stop offset="36%" stop-color="#E08542" stop-opacity="0.34"/>`;
  s += `<stop offset="100%" stop-color="#E08542" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-hot-core-openai" cx="42%" cy="35%" r="64%">`;
  s += `<stop offset="0%" stop-color="#D9EAFF" stop-opacity="0.52"/>`;
  s += `<stop offset="38%" stop-color="#4A8FE0" stop-opacity="0.29"/>`;
  s += `<stop offset="100%" stop-color="#4A8FE0" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  s += `<radialGradient id="node-hot-core-google" cx="42%" cy="35%" r="64%">`;
  s += `<stop offset="0%" stop-color="#FFD8D4" stop-opacity="0.54"/>`;
  s += `<stop offset="38%" stop-color="#EA4335" stop-opacity="0.30"/>`;
  s += `<stop offset="100%" stop-color="#EA4335" stop-opacity="0"/>`;
  s += `</radialGradient>`;
  // Per-provider streaming glow gradients
  s += `<radialGradient id="glow-stream-anthropic"><stop offset="0%" stop-color="#E08542" stop-opacity="0.1"/><stop offset="100%" stop-color="#E08542" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="glow-stream-openai"><stop offset="0%" stop-color="#4A8FE0" stop-opacity="0.1"/><stop offset="100%" stop-color="#4A8FE0" stop-opacity="0"/></radialGradient>`;
  s += `<radialGradient id="glow-stream-google"><stop offset="0%" stop-color="#EA4335" stop-opacity="0.1"/><stop offset="100%" stop-color="#EA4335" stop-opacity="0"/></radialGradient>`;
  // Ambient node aura
  s += `<radialGradient id="node-aura"><stop offset="30%" stop-color="${E[7]}" stop-opacity="0.12"/><stop offset="100%" stop-color="${E[7]}" stop-opacity="0"/></radialGradient>`;
  // Node drop shadow
  s += `<filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">`;
  s += `<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.72)"/>`;
  s += `<feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="rgba(8,7,6,0.62)"/>`;
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

  const { nodes, edges, bodies, activeNodeId } = useGraphStore.getState();
  const ui = useUIStore.getState();
  const { scale, selectedNodeId, hoveredNodeId, highlightMode, pathTrace, searchQuery, searchResults, selectedNodeIds, timelineOpen, timelineScrubTime } = ui;
  const searchActive = searchQuery.length > 0;
  const searchSet = searchActive ? new Set(searchResults) : null;
  const { level: lod, fadeIn: lodFade } = getLOD(scale);
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const timelineCutoff = timelineOpen ? timelineScrubTime : null;

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
  const activePath = new Set<string>();
  const activeHeadId = selectedNodeId || traceCurrentId || activeNodeId;
  if (activeHeadId) {
    let currentId: string | null = activeHeadId;
    let guard = 0;
    while (currentId && guard++ < 99) {
      activePath.add(currentId);
      const parent = nodes.find(n => n.id === currentId)?.parentId ?? null;
      currentId = parent;
    }
  }

  // Empty state — centered invitation when no nodes exist
  if (nodes.length === 0 && container) {
    const cx = (container.clientWidth / 2 - ui.panX) / scale;
    const cy = (container.clientHeight / 2 - ui.panY) / scale;
    const breathe = 0.76 + 0.035 * Math.sin(time * 0.8);
    const orbitA = (time * 18) % 360;
    const orbitB = (time * -13) % 360;
    const orbitC = (time * 9) % 360;
    const orbitD = (time * -24) % 360;
    const orbitDotA = orbitA * Math.PI / 180;
    const orbitDotB = orbitB * Math.PI / 180;
    const orbitDotC = orbitC * Math.PI / 180;
    const orbitDotD = orbitD * Math.PI / 180;
    const dotAx = Math.cos(orbitDotA) * 118;
    const dotAy = -48 + Math.sin(orbitDotA) * 118;
    const dotBx = Math.cos(orbitDotB) * 86;
    const dotBy = -48 + Math.sin(orbitDotB) * 86;
    const dotCx = Math.cos(orbitDotC) * 66;
    const dotCy = -48 + Math.sin(orbitDotC) * 66;
    const dotDx = Math.cos(orbitDotD) * 48;
    const dotDy = -48 + Math.sin(orbitDotD) * 48;
    s += `<g data-empty-state="dreamcatcher-seed" transform="translate(${cx},${cy})" opacity="${breathe}">`;
    s += `<circle cx="0" cy="-48" r="150" fill="${ACCENT}" opacity="0.018"/>`;
    s += `<circle cx="0" cy="-48" r="132" fill="${E[4]}" opacity="0.024"/>`;
    s += `<g data-empty-seed-trace="true" opacity="0.82">`;
    s += `<circle cx="0" cy="-48" r="118" fill="none" stroke="${ACCENT}" stroke-width="0.74" stroke-linecap="round" stroke-dasharray="7 18" stroke-dashoffset="${-(time * 28)}" opacity="0.28"/>`;
    s += `<circle cx="0" cy="-48" r="102" fill="none" stroke="${ACCENT}" stroke-width="0.58" stroke-linecap="round" stroke-dasharray="1 17" stroke-dashoffset="${time * 17}" opacity="0.22"/>`;
    s += `<circle cx="0" cy="-48" r="86" fill="none" stroke="${ACCENT}" stroke-width="0.86" stroke-linecap="round" stroke-dasharray="5 12" stroke-dashoffset="${-(time * 22)}" opacity="0.5"/>`;
    s += `<circle cx="0" cy="-48" r="72" fill="none" stroke="${ACCENT}" stroke-width="0.64" stroke-linecap="round" stroke-dasharray="12 20" stroke-dashoffset="${time * 30}" opacity="0.28"/>`;
    s += `<circle cx="0" cy="-48" r="58" fill="none" stroke="${ACCENT}" stroke-width="0.7" stroke-linecap="round" stroke-dasharray="2 10" stroke-dashoffset="${time * 18}" opacity="0.34"/>`;
    s += `<circle cx="0" cy="-48" r="42" fill="none" stroke="${ACCENT}" stroke-width="0.62" stroke-linecap="round" stroke-dasharray="1 13" stroke-dashoffset="${-(time * 13)}" opacity="0.25"/>`;
    s += `<circle cx="${dotAx}" cy="${dotAy}" r="2.5" fill="${ACCENT}" opacity="0.38"/>`;
    s += `<circle cx="${dotBx}" cy="${dotBy}" r="2.2" fill="${ACCENT}" opacity="0.46"/>`;
    s += `<circle cx="${dotCx}" cy="${dotCy}" r="1.8" fill="${ACCENT}" opacity="0.32"/>`;
    s += `<circle cx="${dotDx}" cy="${dotDy}" r="1.55" fill="${ACCENT}" opacity="0.28"/>`;
    s += `</g>`;
    s += `<g data-empty-seed-core="true">`;
    s += `<circle cx="0" cy="-48" r="54" fill="${ACCENT}" opacity="0.035"/>`;
    s += `<circle cx="0" cy="-48" r="38" fill="${E[2]}" stroke="${E[6]}" stroke-width="0.75" opacity="0.62"/>`;
    s += `<circle cx="0" cy="-48" r="26" fill="url(#node-user-fill)" stroke="${T.ghost}" stroke-width="1.05" opacity="0.9"/>`;
    s += `<circle cx="-7" cy="-57" r="10" fill="url(#node-user-spec)" opacity="0.5"/>`;
    s += `<circle cx="0" cy="-48" r="10.5" fill="${ACCENT}" opacity="0.32"/>`;
    s += `<circle cx="0" cy="-48" r="4.7" fill="${ACCENT}" opacity="0.82"/>`;
    s += `<circle cx="-1.4" cy="-50.2" r="1.4" fill="#fff6e8" opacity="0.55"/>`;
    s += `<circle cx="0" cy="-48" r="31" fill="none" stroke="${ACCENT}" stroke-width="0.8" opacity="0.34"/>`;
    s += `</g>`;
    s += `<g data-empty-seed-tag="true">`;
    s += `<text data-empty-title="true" x="0" y="86" text-anchor="middle" fill="${T.tertiary}" font-family="'Mulish',system-ui,sans-serif" font-size="16" font-weight="700" letter-spacing="5.2" opacity="0.66">DREAMCATCHER</text>`;
    s += `</g>`;
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
    const edgeKey = `${e.from}->${e.to}`;
    const createdAt = edgeCreatedAt.get(edgeKey) ?? 0;
    const elapsed = nowMs - createdAt;
    const drawProgress = Math.min(elapsed / EDGE_DRAW_DURATION, 1);
    const dashAttr = ` stroke-dasharray="${es.dash}" stroke-dashoffset="${dashAnim * es.speed}"`;
    const markerAttr = es.marker ? ` marker-end="${es.marker}"` : '';
    const isActiveEdge = activePath.has(e.from) && activePath.has(e.to);
    const isTraceEdge = highlightedNodes?.has(e.from) && highlightedNodes.has(e.to);
    const lit = isActiveEdge || isTraceEdge;
    const sourceNode = nodeById.get(e.from);
    const targetNode = nodeById.get(e.to);
    const timelineEdgeDimmed = timelineCutoff !== null
      && ((sourceNode?.timestamp ?? 0) > timelineCutoff || (targetNode?.timestamp ?? 0) > timelineCutoff);
    const edgeOpacity = timelineEdgeDimmed ? 0.14 : 1;
    const edgeStroke = lit ? 'rgba(200,200,200,0.74)' : es.stroke;
    const edgeWidth = lit ? es.width * 1.42 : es.width;
    const edgeGlow = lit ? 'rgba(200,200,200,0.11)' : es.glow;
    const pulseFill = lit ? T.secondary : T.subtle;
    const pulseOpacity = (lit ? 0.72 : 0.42) * edgeOpacity;
    const edgePathId = `dc-edge-${esc(e.from)}-${esc(e.to)}`.replace(/[^A-Za-z0-9_-]/g, '-');
    if (edgeGlow) {
      s += `<path d="${curve}" fill="none" stroke="${edgeGlow}" stroke-width="${lit ? 9 : 7}" stroke-linecap="round" opacity="${edgeOpacity}"/>`;
    }
    s += `<path id="${edgePathId}" d="${curve}" fill="none" stroke="${edgeStroke}" stroke-width="${edgeWidth}" stroke-linecap="round" opacity="${edgeOpacity}"${dashAttr}${markerAttr}/>`;
    if ((e.type === 'reply' || e.type === 'branch') && drawProgress >= 1) {
      s += `<circle r="${lit ? 2.2 : 1.75}" fill="${pulseFill}" opacity="${pulseOpacity}"><animateMotion dur="${e.type === 'branch' ? '2.6s' : '2.2s'}" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#${edgePathId}"/></animateMotion></circle>`;
    }
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
    const timelineNodeOpacity = timelineCutoff !== null && n.timestamp > timelineCutoff ? 0.16 : 1;
    const nodeOpacity = (!isHighlighted ? 0.15 : !isSearchMatch ? 0.2 : 1) * timelineNodeOpacity;
    const hoverScale = isHov ? 1.06 : 1;
    s += `<g transform="translate(${body.x},${body.y}) scale(${entranceScale * hoverScale})" data-id="${n.id}" style="cursor:pointer;pointer-events:all" opacity="${nodeOpacity}">`;

    if (isSel) {
      s += `<circle cx="0" cy="0" r="${r * 1.6}" fill="url(#glow-select)"/>`;
    }

    if (n.role === 'user') {
      const strokeColor = isSel ? ACCENT : isHov ? T.primary : NODE_USER_STROKE;
      const specOpacity = isHov ? 0.92 : isSel ? 0.84 : 0.68;

      if (isBranchPoint) {
        const shape = hexPath(r);
        s += `<path d="${shape}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}" stroke-linejoin="round"${inheritedDash} filter="url(#node-shadow)"/>`;
        s += `<path d="${shape}" fill="url(#node-user-spec)" opacity="${specOpacity}"/>`;
      } else {
        s += `<circle cx="0" cy="2" r="${r}" fill="black" opacity="0.3"/>`;
        s += `<circle cx="0" cy="0" r="${r}" fill="url(#node-user-fill)" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.8}"${inheritedDash} filter="url(#node-shadow)"/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.85}" fill="url(#node-user-spec)" opacity="${specOpacity}"/>`;
        s += `<circle cx="1" cy="2" r="${r + 0.5}" fill="none" stroke="${E[7]}" stroke-width="1" opacity="${isHov ? 0.4 : 0.25}" stroke-dasharray="${r * 1.8} ${r * 4.5}"/>`;
      }
      s += `<circle cx="0" cy="1" r="5.5" fill="black" opacity="0.15"/>`;
      s += `<circle cx="0" cy="0" r="5" fill="url(#node-user-core)"/>`;

    } else {
      const modelInfo = n.metadata.model ? getModel(n.metadata.model) : null;
      const modelColor = modelInfo?.color || T.ghost;
      const hasModelIcon = Boolean(modelInfo && lod >= 2);
      const providerKey = resolveProvider(modelInfo);
      const strokeColor = isSel ? ACCENT : isHov ? T.secondary : NODE_AI_STROKE;
      const fillId = providerKey ? `node-ai-fill-${providerKey}` : 'node-ai-fill';
      const hotCoreId = providerKey ? `node-hot-core-${providerKey}` : 'node-hot-core-neutral';
      const isActivePathNode = activePath.has(n.id);
      const auraOpacity = isSel ? 0.22 : streamPulse !== null ? 0.18 : isActivePathNode ? 0.11 : 0.055;
      s += `<circle cx="0" cy="0" r="${r * (isSel ? 2.08 : streamPulse !== null ? 1.94 : 1.66)}" fill="${modelColor}" opacity="${auraOpacity}"/>`;

      if (isBranchPoint) {
        const shape = hexPath(r);
        s += `<path d="${shape}" fill="url(#${fillId})" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.5}" stroke-linejoin="round"${inheritedDash} filter="url(#node-shadow)"/>`;
        s += `<path d="${shape}" fill="url(#node-glass-spec)" opacity="${isHov || isSel ? 0.78 : 0.56}"/>`;
        if (!hasModelIcon) {
          s += `<circle cx="0" cy="0" r="${r * 0.58}" fill="url(#${hotCoreId})" opacity="${isHov || isSel ? 0.96 : 0.74}"/>`;
        }
        s += `<circle cx="0" cy="0" r="${r * 0.68}" fill="none" stroke="${modelColor}" stroke-width="0.75" opacity="${isHov || isSel ? 0.54 : 0.34}"/>`;
        if (!hasModelIcon) {
          s += `<path d="M ${-r * 0.3} 0 H ${r * 0.3} M 0 ${-r * 0.3} V ${r * 0.3}" stroke="${modelColor}" stroke-width="0.45" stroke-linecap="round" opacity="${isHov || isSel ? 0.42 : 0.24}"/>`;
        }
      } else {
        s += `<circle cx="0" cy="2.5" r="${r}" fill="black" opacity="0.3"/>`;
        s += `<circle cx="0" cy="0" r="${r}" fill="url(#${fillId})" stroke="${strokeColor}" stroke-width="${isSel ? 2.5 : 1.7}"${inheritedDash} filter="url(#node-shadow)"/>`;
        s += `<circle cx="0" cy="0" r="${r - 3}" fill="none" stroke="${E[5]}" stroke-width="0.6" opacity="0.55"/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.62}" fill="none" stroke="${T.ghost}" stroke-width="0.5" stroke-dasharray="1.5 3" opacity="${isHov ? 0.5 : 0.34}"/>`;
        s += `<circle cx="0" cy="0" r="${r * 0.82}" fill="url(#node-glass-spec)" opacity="${isHov || isSel ? 0.72 : 0.52}"/>`;
        if (!hasModelIcon) {
          s += `<circle cx="0" cy="0" r="${isSel ? 12.5 : 10.5}" fill="url(#${hotCoreId})" opacity="${isHov || isSel ? 0.96 : 0.78}"/>`;
        }
        s += `<circle cx="0" cy="0" r="${isHov ? 8 : 7.2}" fill="none" stroke="${modelColor}" stroke-width="0.6" opacity="${isHov ? 0.48 : 0.31}"/>`;
        if (!hasModelIcon) {
          s += `<path d="M -5.8 0 H 5.8 M 0 -5.8 V 5.8" stroke="${modelColor}" stroke-width="0.35" stroke-linecap="round" opacity="${isHov || isSel ? 0.38 : 0.22}"/>`;
          const coreOpacity = 0.78 + 0.1 * Math.sin(time * 2 + (n.id.charCodeAt(0) || 0));
          s += `<circle cx="0" cy="0" r="${isHov ? 4.8 : 4.2}" fill="${modelColor}" opacity="${coreOpacity}"/>`;
          s += `<circle cx="-1.1" cy="-1.1" r="1.2" fill="#ffffff" opacity="0.55"/>`;
        }
        if (isHov) {
          s += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="1.5"/>`;
        }
      }

      if (modelInfo && lod >= 2) {
        const iconOpacity = lod === 2 ? lodFade * 0.72 : 0.82;
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
      const isActivePathLabel = activePath.has(n.id);
      const labelColor = isSel ? T.primary : isActivePathLabel ? T.tertiary : n.role === 'user' ? T.subtle : T.ghost;
      const labelWeight = isSel || isActivePathLabel ? 600 : 400;
      const labelWidth = Math.min(176, Math.max(42, label.length * 6.4 + 14));
      if (isSel || isActivePathLabel) {
        s += `<rect x="${-labelWidth / 2}" y="${r + 7}" width="${labelWidth}" height="18" rx="3" fill="${E[1]}" opacity="${isSel ? 0.72 : 0.46}" stroke="${isSel ? ACCENT : E[5]}" stroke-width="0.5"/>`;
      }
      s += `<text x="0" y="${r + 20}" text-anchor="middle" fill="${labelColor}" font-family="'iA Writer Mono S',Inconsolata,monospace" font-size="11" font-weight="${labelWeight}" letter-spacing="0.03em" opacity="${labelOpacity}">${esc(label)}</text>`;
      if (streamPulse !== null && n.role === 'ai') {
        const streamingModel = n.metadata.model ? getModel(n.metadata.model) : null;
        const chipText = streamingModel?.provider === 'Anthropic' ? 'Claude' : (streamingModel?.name ?? 'AI');
        const chipWidth = Math.min(128, Math.max(74, chipText.length * 5.8 + 60));
        s += `<g transform="translate(${-chipWidth / 2},${r + 28})" opacity="${labelOpacity}">`;
        s += `<rect x="0" y="0" width="${chipWidth}" height="16" rx="4" fill="${E[1]}" stroke="${E[5]}" stroke-width="0.5" opacity="0.86"/>`;
        s += `<circle cx="10" cy="8" r="2.5" fill="${streamingModel?.color ?? ACCENT}" opacity="0.85"/>`;
        s += `<text x="17" y="11" fill="${T.tertiary}" font-family="'iA Writer Mono S',Inconsolata,monospace" font-size="8" font-weight="600">${esc(chipText)}</text>`;
        s += `<text x="${chipWidth - 7}" y="11" text-anchor="end" fill="${ACCENT}" font-family="'iA Writer Mono S',Inconsolata,monospace" font-size="8" font-weight="500">streaming</text>`;
        s += `</g>`;
      }
    }

    if (isBranchPoint && lod >= 2) {
      const badgeOpacity = lod === 2 ? lodFade : 1;
      const count = childCounts[n.id];
      s += `<circle cx="${r + 5}" cy="${-r + 5}" r="8" fill="${E[6]}" stroke="${T.subtle}" stroke-width="0.5" opacity="${badgeOpacity}"/>`;
      s += `<text x="${r + 5}" y="${-r + 8.5}" text-anchor="middle" fill="${T.primary}" font-family="'iA Writer Mono S',Inconsolata,monospace" font-size="10" font-weight="700" opacity="${badgeOpacity}">${count}</text>`;
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
