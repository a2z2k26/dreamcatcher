// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Force-Directed Graph Simulation
// Ported from Unit's simulation.ts + Editor/Component.ts
//
// Rules:
// - Alpha cooling: 0.25 → decay per tick → stop at 0.001
// - fx/fy drag pinning: dragged node locked, forces flow to neighbors
// - Spring: k = stiffness * (surfDist - rest) * alpha / centerDist
// - Repulsion: -90 * alpha / surfDist (within 6 * LINK_DISTANCE)
// - Hard collision: alpha-independent push when surfaces < MIN_GAP
// - Friction: 0.75 applied as ax -= F * vx
// - Velocity decay: 0.1 per tick
// ═══════════════════════════════════════════════════════════════

import type { PhysicsBody, GraphEdge, EdgeType } from '@/types/graph';

// Unit constants — scaled for node radii 24/28 (up from 18/22)
const FRICTION = 0.75;
const VELOCITY_DECAY = 0.1;
const ALPHA_DECAY = 1 - Math.pow(0.001, 1 / 300);
const ALPHA_MIN = 0.001;
const REPULSION_K = -250;           // very strong — nodes MUST spread
const LINK_DISTANCE = 40;           // base unit for spacing
const MAX_REPULSION_D = 8 * LINK_DISTANCE; // 320px — long-range repulsion
const MIN_GAP = 36;                 // generous surface gap

// Per-edge-type physics — weak springs, strong repulsion = spread layout
// Springs GUIDE direction but don't COMPRESS. Stiffness deliberately low.
const EDGE_PHYSICS: Record<EdgeType, { rest: number; stiffness: number }> = {
  reply:        { rest: 5.0 * LINK_DISTANCE, stiffness: 0.3 },   // 200px — generous, weak pull
  branch:       { rest: 6.0 * LINK_DISTANCE, stiffness: 0.2 },   // 240px — branches spread wide
  regeneration: { rest: 5.0 * LINK_DISTANCE, stiffness: 0.25 },  // 200px — siblings apart
  summarizes:   { rest: 7.0 * LINK_DISTANCE, stiffness: 0.15 },  // 280px — very distant
  clips_to:     { rest: 6.0 * LINK_DISTANCE, stiffness: 0.1 },   // 240px — barely connected
  references:   { rest: 5.0 * LINK_DISTANCE, stiffness: 0.08 },  // 200px — ghost connection
};

export interface SimulationState {
  alpha: number;
  running: boolean;
}

export function createSimulation(): SimulationState {
  return { alpha: 0.3, running: true };    // start hot — spread nodes on first load
}

export function wakeSimulation(sim: SimulationState): void {
  sim.alpha = Math.max(sim.alpha, 0.25);   // wake with enough energy to re-spread
  sim.running = true;
}

export function tickSimulation(
  sim: SimulationState,
  bodies: Record<string, PhysicsBody>,
  edges: readonly GraphEdge[],
): boolean {
  // Decay alpha
  sim.alpha += (0 - sim.alpha) * ALPHA_DECAY;
  if (sim.alpha < ALPHA_MIN) { sim.alpha = ALPHA_MIN; return false; }

  const ids = Object.keys(bodies);
  const alpha = sim.alpha;

  // 1) Edge spring forces
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

  // 2) Repulsion + hard collision
  let anyOverlap = false;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = bodies[ids[i]];
      const b = bodies[ids[j]];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const surfD = d - a.r - b.r;
      const ux = dx / d;
      const uy = dy / d;

      // Inverse-square repulsion — much stronger at close range, fades at distance
      if (surfD > 0 && surfD < MAX_REPULSION_D) {
        const clampedD = Math.max(surfD, 10); // prevent division explosion
        const k = (REPULSION_K * alpha) / (clampedD * clampedD);
        const fx = ux * k;
        const fy = uy * k;
        a.ax -= fx;  a.ay -= fy;
        b.ax += fx;  b.ay += fy;
      }

      // Hard collision — alpha-independent, aggressive separation
      if (surfD < MIN_GAP) {
        anyOverlap = true;
        const overlap = MIN_GAP - surfD;
        const force = overlap * 3.0;        // was 2.0 — stronger push
        a.ax -= ux * force;  a.ay -= uy * force;
        b.ax += ux * force;  b.ay += uy * force;
        const push = overlap * 0.4;         // was 0.25 — faster immediate separation
        if (a.fx === undefined) { a.x -= ux * push; a.y -= uy * push; }
        if (b.fx === undefined) { b.x += ux * push; b.y += uy * push; }
      }
    }
  }

  // 3) Integrate
  let totalDelta = 0;
  for (const id of ids) {
    const n = bodies[id];
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

  // Fast convergence
  if (totalDelta < 1) sim.alpha = Math.min(sim.alpha, 0.1);
  if (anyOverlap) sim.alpha = Math.max(sim.alpha, 0.05);

  return totalDelta > 0.05 || anyOverlap;
}
