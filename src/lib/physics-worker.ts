// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Physics Web Worker
// Runs the force simulation off the main thread.
// Receives bodies + edges, runs one tick, returns updated positions.
// Pattern: Understand Anything's layout worker, adapted for
// continuous force simulation instead of one-shot dagre layout.
// ═══════════════════════════════════════════════════════════════

import type { EdgeType } from '@/types/graph';

// ── Duplicated physics constants (workers can't import from main) ──
// MUST STAY IN SYNC with simulation.ts
const FRICTION = 0.75;
const VELOCITY_DECAY = 0.1;
const ALPHA_DECAY = 1 - Math.pow(0.001, 1 / 300);
const ALPHA_MIN = 0.001;
const REPULSION_K = -250;           // strong — nodes must spread
const LINK_DISTANCE = 40;           // base unit for spacing
const MAX_REPULSION_D = 8 * LINK_DISTANCE; // 320px
const MIN_GAP = 36;                 // generous surface gap

// Weak springs — guide direction, don't compress
const EDGE_PHYSICS: Record<string, { rest: number; stiffness: number }> = {
  reply:        { rest: 5.0 * LINK_DISTANCE, stiffness: 0.3 },
  branch:       { rest: 6.0 * LINK_DISTANCE, stiffness: 0.2 },
  regeneration: { rest: 5.0 * LINK_DISTANCE, stiffness: 0.25 },
  summarizes:   { rest: 7.0 * LINK_DISTANCE, stiffness: 0.15 },
  clips_to:     { rest: 6.0 * LINK_DISTANCE, stiffness: 0.1 },
  references:   { rest: 5.0 * LINK_DISTANCE, stiffness: 0.08 },
};

// ── Worker state ──
interface WorkerBody {
  x: number; y: number;
  vx: number; vy: number;
  ax: number; ay: number;
  fx: number | undefined;
  fy: number | undefined;
  r: number;
}

interface WorkerEdge {
  from: string;
  to: string;
  type: string;
}

let bodies: Record<string, WorkerBody> = {};
let edges: WorkerEdge[] = [];
let alpha = 0.3;     // start hot
let running = true;
let nodeIds: string[] = [];

// ── Message types ──
export type PhysicsWorkerMessage =
  | { type: 'init'; bodies: Record<string, WorkerBody>; edges: WorkerEdge[] }
  | { type: 'addNode'; id: string; body: WorkerBody }
  | { type: 'removeNode'; id: string }
  | { type: 'setEdges'; edges: WorkerEdge[] }
  | { type: 'dragStart'; id: string; fx: number; fy: number }
  | { type: 'dragMove'; id: string; fx: number; fy: number }
  | { type: 'dragEnd'; id: string }
  | { type: 'wake' }
  | { type: 'stop' };

export interface PhysicsWorkerResult {
  type: 'positions';
  positions: Record<string, { x: number; y: number }>;
  alpha: number;
  moved: boolean;
}

function tick(): boolean {
  alpha += (0 - alpha) * ALPHA_DECAY;
  if (alpha < ALPHA_MIN) { alpha = ALPHA_MIN; return false; }

  // Edge springs
  for (const e of edges) {
    const a = bodies[e.from];
    const b = bodies[e.to];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const surfD = d - a.r - b.r;
    const params = EDGE_PHYSICS[e.type] || EDGE_PHYSICS.reply;
    const k = params.stiffness * ((surfD - params.rest) * alpha) / d;
    const dvx = dx * k;
    const dvy = dy * k;
    a.ax += dvx;  b.ax -= dvx;
    a.ay += dvy;  b.ay -= dvy;
  }

  // Repulsion + collision
  let anyOverlap = false;
  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const a = bodies[nodeIds[i]];
      const b = bodies[nodeIds[j]];
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const surfD = d - a.r - b.r;
      const ux = dx / d;
      const uy = dy / d;

      // Inverse-square repulsion — strong at close range
      if (surfD > 0 && surfD < MAX_REPULSION_D) {
        const clampedD = Math.max(surfD, 10);
        const k = (REPULSION_K * alpha) / (clampedD * clampedD);
        a.ax -= ux * k;  a.ay -= uy * k;
        b.ax += ux * k;  b.ay += uy * k;
      }

      // Hard collision — aggressive separation
      if (surfD < MIN_GAP) {
        anyOverlap = true;
        const overlap = MIN_GAP - surfD;
        const force = overlap * 3.0;
        a.ax -= ux * force;  a.ay -= uy * force;
        b.ax += ux * force;  b.ay += uy * force;
        const push = overlap * 0.4;
        if (a.fx === undefined) { a.x -= ux * push; a.y -= uy * push; }
        if (b.fx === undefined) { b.x += ux * push; b.y += uy * push; }
      }
    }
  }

  // Integrate
  let totalDelta = 0;
  for (const id of nodeIds) {
    const n = bodies[id];
    if (!n) continue;
    if (n.fx !== undefined) {
      n.x = n.fx; n.y = n.fy!;
      n.vx = 0; n.vy = 0; n.ax = 0; n.ay = 0;
      continue;
    }
    n.ax -= FRICTION * n.vx;
    n.ay -= FRICTION * n.vy;
    n.vx += n.ax;
    n.vy += n.ay;
    n.x += n.vx;
    n.y += n.vy;
    n.vx *= (1 - VELOCITY_DECAY);
    n.vy *= (1 - VELOCITY_DECAY);
    totalDelta += Math.abs(n.vx) + Math.abs(n.vy);
    n.ax = 0; n.ay = 0;
  }

  if (totalDelta < 1) alpha = Math.min(alpha, 0.1);
  if (anyOverlap) alpha = Math.max(alpha, 0.05);

  return totalDelta > 0.05 || anyOverlap;
}

// ── Simulation loop — runs at ~60Hz inside the worker ──
let loopTimer: ReturnType<typeof setTimeout> | null = null;

function simulationLoop() {
  if (!running) {
    loopTimer = null;
    return;
  }

  const moved = tick();

  // Send positions back
  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    const b = bodies[id];
    if (b) positions[id] = { x: b.x, y: b.y };
  }

  const result: PhysicsWorkerResult = { type: 'positions', positions, alpha, moved };
  self.postMessage(result);

  if (!moved) {
    running = false;
    loopTimer = null;
    return;
  }

  loopTimer = setTimeout(simulationLoop, 16); // ~60Hz
}

function wake() {
  alpha = Math.max(alpha, 0.25);
  running = true;
  if (!loopTimer) simulationLoop();
}

// ── Message handler ──
self.onmessage = (e: MessageEvent<PhysicsWorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      bodies = msg.bodies;
      edges = msg.edges;
      nodeIds = Object.keys(bodies);
      wake();
      break;

    case 'addNode':
      bodies[msg.id] = msg.body;
      nodeIds = Object.keys(bodies);
      wake();
      break;

    case 'removeNode':
      delete bodies[msg.id];
      nodeIds = Object.keys(bodies);
      break;

    case 'setEdges':
      edges = msg.edges;
      wake();
      break;

    case 'dragStart':
    case 'dragMove': {
      const body = bodies[msg.id];
      if (body) {
        body.fx = msg.fx;
        body.fy = msg.fy;
        body.x = msg.fx;
        body.y = msg.fy;
      }
      wake();
      break;
    }

    case 'dragEnd': {
      const body = bodies[msg.id];
      if (body) {
        body.fx = undefined;
        body.fy = undefined;
      }
      wake();
      break;
    }

    case 'wake':
      wake();
      break;

    case 'stop':
      running = false;
      break;
  }
};
