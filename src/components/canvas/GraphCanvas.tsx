'use client';

// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Graph Canvas
// SVG infinite canvas with Unit-authentic force physics.
// Uses imperative rAF loop reading from Zustand directly
// (not via React re-renders — performance critical).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { useMemoryStore } from '@/stores/memory-store';
import { showToast } from '@/components/ui/Toast';
import { createSimulation, tickSimulation, wakeSimulation, type SimulationState } from '@/lib/simulation';
import { createPhysicsBridge, type PhysicsBridge } from '@/lib/physics-bridge';
import { ContextMenu } from '@/components/ui/ContextMenu';
import {
  createEffects, tickEffects,
  addRipple, addEntrance, addDragTrail, setStreaming,
  getShakeOffset,
  type EffectsState,
} from '@/lib/effects';
import { renderSVG as renderSVGImpl } from './render';

gsap.registerPlugin(useGSAP);

type DragDropZone = 'learn' | 'remember' | null;

type RadialMenuState = {
  nodeId: string;
  x: number;
  y: number;
} | null;

type CanvasAnimTarget = {
  x: number;
  y: number;
  startTime: number;
  duration: number;
};

type CanvasPanMotion = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  startTime: number;
  target: CanvasAnimTarget | null;
};

const DROP_ZONE_WIDTH = 144;
const RADIAL_MENU_RADIUS = 78;
const RADIAL_ITEM_RADIUS = 25;
const RADIAL_MENU_MARGIN = 12;
const RADIAL_TOP_SAFE = 58;
const RADIAL_BOTTOM_SAFE = 24;

function getDragDropZone(screenX: number, screenY: number, height: number): DragDropZone {
  if (screenX < 0 || screenX >= DROP_ZONE_WIDTH || screenY < 0 || screenY > height) return null;
  return screenY < height / 2 ? 'learn' : 'remember';
}

export function GraphCanvas() {
  const [dragZone, setDragZone] = useState<DragDropZone>(null);
  const [radialMenu, setRadialMenu] = useState<RadialMenuState>(null);
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
  const panMotionRef = useRef<CanvasPanMotion>({ x: 0, y: 0, fromX: 0, fromY: 0, startTime: 0, target: null });
  const dragRef = useRef({ dragSX: 0, dragSY: 0, dragMoved: false, shiftKey: false });
  const deadEndsRef = useRef<ReadonlySet<string>>(new Set());
  const branchHoverRef = useRef<{ nodeId: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const edgeCreatedAtRef = useRef<Map<string, number>>(new Map());
  const longPressRef = useRef<{ nodeId: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Subscribe to store changes — wake sim, add entrance effects, track streaming
  useEffect(() => {
    const initialState = useGraphStore.getState();
    for (const node of initialState.nodes) {
      if (node.role === 'ai' && !node.text) {
        setStreaming(fxRef.current, node.id, true);
      }
    }
    let prevNodeIds = new Set(initialState.nodes.map(n => n.id));
    let prevEdgeCount = initialState.edges.length;
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

  function drawGrid(transformOverride?: { scale: number; panX: number; panY: number }) {
    const canvas = gridRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { scale, panX, panY } = transformOverride ?? useUIStore.getState();
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
    const gap = 24 * scale;
    if (gap < 6) { ctx.setTransform(1, 0, 0, 1, 0, 0); return; }
    const ox = ((panX % gap) + gap) % gap;
    const oy = ((panY % gap) + gap) % gap;
    const r = Math.max(0.72, 0.92 * scale);
    ctx.fillStyle = '#252320';
    ctx.globalAlpha = Math.min(0.78, 0.44 + scale * 0.22);
    for (let x = ox; x < W; x += gap) {
      for (let y = oy; y < H; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function renderSVG() {
    renderSVGImpl({
      svg: svgRef.current,
      container: containerRef.current,
      selDash: selDashRef.current,
      time: timeRef.current,
      deadEnds: deadEndsRef.current,
      edgeCreatedAt: edgeCreatedAtRef.current,
      effects: fxRef.current,
    });
  }

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  }, []);

  const getNodeScreenPosition = useCallback((nodeId: string) => {
    const container = containerRef.current;
    const body = useGraphStore.getState().bodies[nodeId];
    if (!container || !body) return null;
    const { scale, panX, panY } = useUIStore.getState();
    const rect = container.getBoundingClientRect();
    const x = rect.left + body.x * scale + panX;
    const y = rect.top + body.y * scale + panY;
    const inset = RADIAL_MENU_RADIUS + RADIAL_ITEM_RADIUS + RADIAL_MENU_MARGIN;
    const minY = RADIAL_TOP_SAFE + inset;
    const maxY = Math.max(minY, window.innerHeight - RADIAL_BOTTOM_SAFE - inset);
    return {
      x: Math.min(Math.max(x, inset), window.innerWidth - inset),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  const openRadialMenu = useCallback((nodeId: string) => {
    const pos = getNodeScreenPosition(nodeId);
    const body = useGraphStore.getState().bodies[nodeId];
    if (body) {
      body.fx = undefined;
      body.fy = undefined;
      body.hx = 0;
      body.hy = 0;
    }
    bridgeRef.current?.dragEnd(nodeId);
    useUIStore.getState().setDragNode(null);
    setDragZone(null);
    if (pos) setRadialMenu({ nodeId, x: pos.x, y: pos.y });
  }, [getNodeScreenPosition]);

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
  }, [clearLongPress]);

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
  }, [clearLongPress, openRadialMenu]);

  // ── Dead-end detection — 1Hz interval ──
  useEffect(() => {
    const interval = setInterval(() => {
      deadEndsRef.current = useGraphStore.getState().getDeadEndBranches();
    }, 1000);
    return () => clearInterval(interval);
  }, [clearLongPress]);

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
      const panMotion = panMotionRef.current;
      if (animTarget) {
        if (panMotion.target !== animTarget) {
          panMotion.target = animTarget;
          panMotion.fromX = Number.isFinite(panMotion.x) ? panMotion.x : panX;
          panMotion.fromY = Number.isFinite(panMotion.y) ? panMotion.y : panY;
          panMotion.startTime = now;
        }
        const elapsed = now - panMotion.startTime;
        const t = Math.min(elapsed / animTarget.duration, 1);
        const ease = 1 - Math.pow(1 - t, 4); // easeOutQuart for smoother retargeting
        const container = containerRef.current;
        if (container) {
          const cx = container.clientWidth / 2;
          const cy = container.clientHeight / 2;
          const targetPanX = cx - animTarget.x * scale;
          const targetPanY = cy - animTarget.y * scale;
          currentPanX = panMotion.fromX + (targetPanX - panMotion.fromX) * ease;
          currentPanY = panMotion.fromY + (targetPanY - panMotion.fromY) * ease;
          if (t >= 1) {
            panMotion.target = null;
            panMotion.x = targetPanX;
            panMotion.y = targetPanY;
            useUIStore.getState().setTransform(scale, targetPanX, targetPanY);
            useUIStore.setState({ animTarget: null });
          }
        }
      } else {
        panMotion.target = null;
        currentPanX = panX;
        currentPanY = panY;
      }
      panMotion.x = currentPanX;
      panMotion.y = currentPanY;

      // Apply screen shake offset to world transform
      const shake = getShakeOffset(fxRef.current, timeRef.current);
      const world = worldRef.current;
      if (world) {
        world.style.transform = `translate(${currentPanX + shake.x}px,${currentPanY + shake.y}px) scale(${scale})`;
      }
      drawGrid({ scale, panX: currentPanX, panY: currentPanY });
      renderSVG();
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
      setDragZone(null);
      setRadialMenu(null);
      useUIStore.getState().setDragNode(id);
      dragRef.current = { dragSX: e.clientX, dragSY: e.clientY, dragMoved: false, shiftKey: e.shiftKey };
      bridgeRef.current?.dragStart(id, body.x, body.y);
      clearLongPress();
      longPressRef.current = {
        nodeId: id,
        timer: setTimeout(() => openRadialMenu(id), 560),
      };
      wakeSimulation(simRef.current);
      e.preventDefault();
      return;
    }

    const { panX, panY } = useUIStore.getState();
    panRef.current = { isPanning: true, panSX: e.clientX - panX, panSY: e.clientY - panY };
  }, [clearLongPress, openRadialMenu]);

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
      setDragZone(getDragDropZone(e.clientX - rect.left, e.clientY - rect.top, rect.height));
      // Drag trail effect
      addDragTrail(fxRef.current, body.x, body.y);
      if (Math.abs(e.clientX - dragRef.current.dragSX) > 3 || Math.abs(e.clientY - dragRef.current.dragSY) > 3) {
        dragRef.current.dragMoved = true;
        clearLongPress();
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
  }, [clearLongPress]);

  const handleMouseUp = useCallback(() => {
    clearLongPress();
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
        const dropZone = getDragDropZone(sx, sy, rect.height);

        if (dropZone === 'learn') {
          // Left edge, top half = Learn zone
          useUIStore.getState().openLearning(dragNodeId);
        } else if (dropZone === 'remember') {
          // Left edge, bottom half = Remember zone
          const node = useGraphStore.getState().nodes.find(n => n.id === dragNodeId);
          if (node) {
            const path = useGraphStore.getState().getAncestralPath(dragNodeId);
            const contextSummary = path.slice(-3).map(n => `${n.role}: ${n.text.slice(0, 100)}`).join('\n');
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
      setDragZone(null);
      wakeSimulation(simRef.current);
      return;
    }
    panRef.current.isPanning = false;
  }, [clearLongPress]);

  const handleWheel = useCallback((e: WheelEvent) => {
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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

  // ── Touch long-press for radial actions ──
  const touchRef = useRef<{ timer: ReturnType<typeof setTimeout>; startX: number; startY: number; nodeId: string } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const nodeEl = (e.target as SVGElement).closest?.('[data-id]');
    if (!nodeEl) return;
    const id = nodeEl.getAttribute('data-id')!;
    const timer = setTimeout(() => {
      openRadialMenu(id);
      touchRef.current = null;
    }, 500);
    touchRef.current = { timer, startX: touch.clientX, startY: touch.clientY, nodeId: id };
  }, [openRadialMenu]);

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
      className="dc-observatory-canvas absolute inset-0 overflow-hidden"
      style={{ cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="dc-observatory-ember" />
      <canvas ref={gridRef} className="absolute inset-0 pointer-events-none" />
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
      <div className="dc-canvas-vignette" />
      <div className="dc-canvas-grain" />
      {/* Canvas Hotspots — visible when dragging */}
      {dragNodeId && <DragDropZones activeZone={dragZone} />}

      {radialMenu && (
        <RadialNodeActions
          nodeId={radialMenu.nodeId}
          x={radialMenu.x}
          y={radialMenu.y}
          onClose={() => setRadialMenu(null)}
        />
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

function DragDropZones({ activeZone }: { activeZone: DragDropZone }) {
  return (
    <div className="dc-drop-zones" aria-hidden="true">
      <DragDropZonePanel kind="learn" active={activeZone === 'learn'} />
      <div className="dc-drop-zone-divider" />
      <DragDropZonePanel kind="remember" active={activeZone === 'remember'} />
    </div>
  );
}

function DragDropZonePanel({
  kind,
  active,
}: {
  kind: 'learn' | 'remember';
  active: boolean;
}) {
  return (
    <div className="dc-drop-zone" data-kind={kind} data-active={active ? 'true' : 'false'} title={kind === 'learn' ? 'Learn' : 'Remember'}>
      <div className="dc-drop-zone-rail" />
      <div className="dc-drop-zone-field">
        <span />
        <span />
        <span />
      </div>
      <div className="dc-drop-zone-vertical-label">{kind === 'learn' ? 'EDUCATE' : 'REMEMBER'}</div>
    </div>
  );
}

function RadialNodeActions({
  nodeId,
  x,
  y,
  onClose,
}: {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const radialRef = useRef<HTMLDivElement>(null);
  const node = useGraphStore(s => s.nodes.find(n => n.id === nodeId));
  const actions = [
    { id: 'branch', label: 'Branch', angle: -90 },
    { id: 'learn', label: 'Learn', angle: -30 },
    { id: 'save', label: 'Save', angle: 30 },
    { id: 'inspect', label: 'Inspect', angle: 90 },
    { id: 'copy', label: 'Copy', angle: 150 },
    { id: 'more', label: 'More', angle: 210 },
  ] as const;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useGSAP(() => {
    const root = radialRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const backdrop = root.querySelector<HTMLElement>('.dc-radial-backdrop');
    const center = root.querySelector<HTMLElement>('.dc-radial-center');
    const dot = root.querySelector<HTMLElement>('.dc-radial-center-dot');
    const items = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('.dc-radial-item'));

    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    if (backdrop) {
      timeline.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18 }, 0);
    }

    if (center) {
      timeline.fromTo(
        center,
        { autoAlpha: 0, scale: 0.86 },
        { autoAlpha: 1, scale: 1, duration: 0.26 },
        0.02,
      );
    }

    timeline.fromTo(
      items,
      {
        autoAlpha: 0,
        scale: 0.62,
        x: (_index: number, target: Element) => {
          const rect = target.getBoundingClientRect();
          return x - (rect.left + rect.width / 2);
        },
        y: (_index: number, target: Element) => {
          const rect = target.getBoundingClientRect();
          return y - (rect.top + rect.height / 2);
        },
        filter: 'blur(2px)',
      },
      {
        autoAlpha: 1,
        scale: 1,
        x: 0,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.34,
        stagger: { each: 0.028, from: 'start' },
      },
      0.08,
    );

    if (dot) {
      timeline
        .fromTo(dot, { scale: 0.72 }, { scale: 1, duration: 0.28, ease: 'power2.out' }, 0.06)
        .to(dot, { scale: 1.18, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.2);
    }
  }, { scope: radialRef, dependencies: [nodeId, x, y], revertOnUpdate: true });

  const saveMemory = useCallback(() => {
    if (!node) return;
    const now = Date.now();
    const path = useGraphStore.getState().getAncestralPath(nodeId);
    const contextSummary = path.slice(-3).map(n => `${n.role}: ${n.text.slice(0, 100)}`).join('\n');
    useMemoryStore.getState().addMemory({
      id: `mem-${now}`,
      name: node.label || node.text.slice(0, 40),
      content: node.text,
      context: contextSummary,
      tags: [],
      sourceNodeId: nodeId,
      sourcePathNodeIds: path.map(n => n.id),
      createdAt: now,
      type: 'node' as const,
    });
    showToast('Saved to memory');
  }, [node, nodeId]);

  const runAction = (action: typeof actions[number]['id']) => {
    if (!node) return;
    const ui = useUIStore.getState();
    const graph = useGraphStore.getState();
    if (action === 'branch') {
      graph.setActiveNode(nodeId);
      ui.setSelectedNode(nodeId);
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.dc-input')?.focus());
    }
    if (action === 'learn') {
      ui.openLearning(nodeId);
    }
    if (action === 'save') {
      saveMemory();
    }
    if (action === 'inspect') {
      ui.setSelectedNode(nodeId);
    }
    if (action === 'copy') {
      void navigator.clipboard?.writeText(node.text).catch(() => undefined);
      showToast('Copied to clipboard');
    }
    if (action === 'more') {
      ui.openContextMenu(nodeId, x + 28, y - 28);
    }
    onClose();
  };

  if (!node) return null;

  return (
    <div
      ref={radialRef}
      className="dc-radial-overlay"
      style={{
        '--dc-radial-x': `${x}px`,
        '--dc-radial-y': `${y}px`,
      } as CSSProperties}
      onClick={onClose}
      onContextMenu={event => { event.preventDefault(); onClose(); }}
    >
      <div className="dc-radial-backdrop" aria-hidden="true" />
      <div className="dc-radial-center" style={{ left: x, top: y }}>
        <span className="dc-radial-center-dot" />
        <span className="dc-radial-center-label">{node.role}</span>
      </div>
      {actions.map((action) => {
        const radians = (action.angle * Math.PI) / 180;
        const radius = RADIAL_MENU_RADIUS;
        const buttonX = x + Math.cos(radians) * radius;
        const buttonY = y + Math.sin(radians) * radius;
        return (
          <button
            className="dc-radial-item"
            data-action={action.id}
            key={action.id}
            type="button"
            onClick={event => {
              event.stopPropagation();
              runAction(action.id);
            }}
            style={{
              left: buttonX,
              top: buttonY,
            }}
          >
            <RadialIcon name={action.id} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RadialIcon({ name }: { name: 'branch' | 'learn' | 'save' | 'inspect' | 'copy' | 'more' }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 15,
    height: 15,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'branch') {
    return (
      <svg {...common}>
        <path d="M6 4v5a5 5 0 0 0 5 5h7" />
        <path d="M14 10l4 4-4 4" />
        <path d="M6 20v-4" />
      </svg>
    );
  }
  if (name === 'learn') {
    return (
      <svg {...common}>
        <path d="M4 5h6a3 3 0 0 1 3 3v11a4 4 0 0 0-4-3H4z" />
        <path d="M20 5h-6a3 3 0 0 0-3 3v11a4 4 0 0 1 4-3h5z" />
      </svg>
    );
  }
  if (name === 'save') {
    return (
      <svg {...common}>
        <path d="M12 3a6 6 0 0 1 6 6c0 2-1 3.3-2.2 4.5-.8.8-1.3 1.5-1.3 2.5v1.2h-5V16c0-1-.5-1.7-1.3-2.5C7 12.3 6 11 6 9a6 6 0 0 1 6-6z" />
        <path d="M9 21h6" />
      </svg>
    );
  }
  if (name === 'inspect') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" />
        <path d="M11 8v3l2 2" />
      </svg>
    );
  }
  if (name === 'copy') {
    return (
      <svg {...common}>
        <rect x="8" y="8" width="10" height="10" rx="2" />
        <path d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  );
}
