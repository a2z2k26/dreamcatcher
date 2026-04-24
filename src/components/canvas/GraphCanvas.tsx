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
import { useMemoryStore } from '@/stores/memory-store';
import { createSimulation, tickSimulation, wakeSimulation, type SimulationState } from '@/lib/simulation';
import { createPhysicsBridge, type PhysicsBridge } from '@/lib/physics-bridge';
import {
  E, T, ACCENT, ACCENT_18, ACCENT_30, CANVAS_BG, GRID_COLOR,
} from '@/lib/theme';
import { ContextMenu } from '@/components/ui/ContextMenu';
import {
  createEffects, tickEffects,
  addRipple, addEntrance, addDragTrail, setStreaming,
  getShakeOffset,
  type EffectsState,
} from '@/lib/effects';
import { renderSVG as renderSVGImpl } from './render';

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
