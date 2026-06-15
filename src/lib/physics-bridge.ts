// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Physics Bridge
// Main thread ↔ Worker communication for force simulation.
// Applies position updates from the worker to the main thread's
// bodies record, which the canvas reads for rendering.
// Falls back to main-thread simulation if Worker unavailable.
// ═══════════════════════════════════════════════════════════════

import type { PhysicsBody, GraphEdge } from '@/types/graph';
import type { PhysicsWorkerMessage, PhysicsWorkerResult } from './physics-worker';
import { tickSimulation, wakeSimulation, type SimulationState } from './simulation';

export interface PhysicsBridge {
  init(bodies: Record<string, PhysicsBody>, edges: readonly GraphEdge[]): void;
  addNode(id: string, body: PhysicsBody): void;
  setEdges(edges: readonly GraphEdge[]): void;
  dragStart(id: string, fx: number, fy: number): void;
  dragMove(id: string, fx: number, fy: number): void;
  dragEnd(id: string): void;
  wake(): void;
  dispose(): void;
  readonly isWorker: boolean;
}

type PositionCallback = (positions: Record<string, { x: number; y: number }>) => void;

// ── Worker-based bridge ──
function createWorkerBridge(onPositions: PositionCallback): PhysicsBridge {
  const worker = new Worker(
    new URL('./physics-worker.ts', import.meta.url),
    { type: 'module' },
  );

  worker.onmessage = (e: MessageEvent<PhysicsWorkerResult>) => {
    if (e.data.type === 'positions') {
      onPositions(e.data.positions);
    }
  };

  function send(msg: PhysicsWorkerMessage) {
    worker.postMessage(msg);
  }

  return {
    isWorker: true,
    init(bodies, edges) {
      // Strip non-serializable fields (hx, hy) and send plain objects
      const workerBodies: Record<string, { x: number; y: number; vx: number; vy: number; ax: number; ay: number; fx: number | undefined; fy: number | undefined; r: number }> = {};
      for (const [id, b] of Object.entries(bodies)) {
        workerBodies[id] = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, ax: b.ax, ay: b.ay, fx: b.fx, fy: b.fy, r: b.r };
      }
      const workerEdges = edges.map(e => ({ from: e.from, to: e.to, type: e.type }));
      send({ type: 'init', bodies: workerBodies, edges: workerEdges });
    },
    addNode(id, body) {
      send({ type: 'addNode', id, body: { x: body.x, y: body.y, vx: 0, vy: 0, ax: 0, ay: 0, fx: body.fx, fy: body.fy, r: body.r } });
    },
    setEdges(edges) {
      send({ type: 'setEdges', edges: edges.map(e => ({ from: e.from, to: e.to, type: e.type })) });
    },
    dragStart(id, fx, fy) { send({ type: 'dragStart', id, fx, fy }); },
    dragMove(id, fx, fy) { send({ type: 'dragMove', id, fx, fy }); },
    dragEnd(id) { send({ type: 'dragEnd', id }); },
    wake() { send({ type: 'wake' }); },
    dispose() { worker.terminate(); },
  };
}

// ── Main-thread fallback bridge ──
function createMainThreadBridge(
  bodiesRef: () => Record<string, PhysicsBody>,
  edgesRef: () => readonly GraphEdge[],
  simRef: () => SimulationState,
): PhysicsBridge {
  return {
    isWorker: false,
    init() { wakeSimulation(simRef()); },
    addNode() { wakeSimulation(simRef()); },
    setEdges() { wakeSimulation(simRef()); },
    dragStart() { wakeSimulation(simRef()); },
    dragMove() { wakeSimulation(simRef()); },
    dragEnd() { wakeSimulation(simRef()); },
    wake() { wakeSimulation(simRef()); },
    dispose() {},
  };
}

// ── Factory ──
export function createPhysicsBridge(
  onPositions: PositionCallback,
  bodiesRef: () => Record<string, PhysicsBody>,
  edgesRef: () => readonly GraphEdge[],
  simRef: () => SimulationState,
): PhysicsBridge {
  // Try Worker, fall back to main thread
  if (typeof Worker !== 'undefined') {
    try {
      return createWorkerBridge(onPositions);
    } catch {
      // Worker creation failed (SSR, CSP, etc.)
    }
  }
  return createMainThreadBridge(bodiesRef, edgesRef, simRef);
}
