// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Visual Effects System
// Manages transient visual effects: ripples, entrances, pulses.
// All effects are tick-based and self-cleaning.
// ═══════════════════════════════════════════════════════════════

export interface Ripple {
  x: number;
  y: number;
  age: number;      // 0→1
  maxAge: number;   // seconds
  maxRadius: number;
  color: string;
}

export interface NodeEntrance {
  nodeId: string;
  age: number;      // 0→1
  duration: number;  // seconds
}

export interface ScreenShake {
  age: number;
  duration: number;
  intensity: number;
}

export interface EffectsState {
  ripples: Ripple[];
  entrances: Map<string, NodeEntrance>;
  streamingNodes: Set<string>;
  dragTrails: Array<{ x: number; y: number; age: number }>;
  shake: ScreenShake | null;
}

export function createEffects(): EffectsState {
  return {
    ripples: [],
    entrances: new Map(),
    streamingNodes: new Set(),
    dragTrails: [],
    shake: null,
  };
}

export function addRipple(fx: EffectsState, x: number, y: number, color = 'rgba(225,225,225,0.15)', maxRadius = 120) {
  fx.ripples.push({ x, y, age: 0, maxAge: 0.8, maxRadius, color });
  // Add a second, slower ripple for a richer effect
  fx.ripples.push({ x, y, age: 0, maxAge: 1.2, maxRadius: maxRadius * 1.6, color: 'rgba(225,225,225,0.06)' });
}

export function addEntrance(fx: EffectsState, nodeId: string) {
  fx.entrances.set(nodeId, { nodeId, age: 0, duration: 0.7 });
  // Trigger a subtle screen shake
  fx.shake = { age: 0, duration: 0.35, intensity: 3 };
}

export function setStreaming(fx: EffectsState, nodeId: string, streaming: boolean) {
  if (streaming) fx.streamingNodes.add(nodeId);
  else fx.streamingNodes.delete(nodeId);
}

export function addDragTrail(fx: EffectsState, x: number, y: number) {
  fx.dragTrails.push({ x, y, age: 0 });
  // Keep only last 20 trail points
  if (fx.dragTrails.length > 20) fx.dragTrails.shift();
}

export function tickEffects(fx: EffectsState, dt: number) {
  // Tick ripples
  for (let i = fx.ripples.length - 1; i >= 0; i--) {
    fx.ripples[i].age += dt / fx.ripples[i].maxAge;
    if (fx.ripples[i].age >= 1) fx.ripples.splice(i, 1);
  }

  // Tick entrances
  for (const [id, e] of fx.entrances) {
    e.age += dt / e.duration;
    if (e.age >= 1) fx.entrances.delete(id);
  }

  // Tick drag trails
  for (let i = fx.dragTrails.length - 1; i >= 0; i--) {
    fx.dragTrails[i].age += dt * 1.8;
    if (fx.dragTrails[i].age >= 1) fx.dragTrails.splice(i, 1);
  }

  // Tick screen shake
  if (fx.shake) {
    fx.shake.age += dt / fx.shake.duration;
    if (fx.shake.age >= 1) fx.shake = null;
  }
}

// Easing: spring-like overshoot for entrances — more dramatic
export function springEase(t: number): number {
  if (t >= 1) return 1;
  if (t === 0) return 0;
  // Stronger overshoot: peaks at ~1.15 before settling to 1.0
  const c4 = (2 * Math.PI) / 2.8;
  return Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Render effects to SVG string
export function renderEffects(fx: EffectsState, time: number): string {
  let s = '';

  // Ripples — double ring effect
  for (const r of fx.ripples) {
    const radius = r.maxRadius * easeOutCubic(r.age);
    const opacity = (1 - r.age) * 0.8;
    const sw = 2.5 * (1 - r.age);
    s += `<circle cx="${r.x}" cy="${r.y}" r="${radius}" fill="none" stroke="${r.color}" stroke-width="${sw}" opacity="${opacity}"/>`;
  }

  // Drag trails — glowing dots with size falloff
  for (let i = 0; i < fx.dragTrails.length; i++) {
    const t = fx.dragTrails[i];
    const opacity = (1 - t.age) * 0.4;
    const r = 5 * (1 - t.age);
    s += `<circle cx="${t.x}" cy="${t.y}" r="${r}" fill="rgba(200,200,200,${opacity * 0.2})"/>`;
    s += `<circle cx="${t.x}" cy="${t.y}" r="${r * 0.5}" fill="rgba(225,225,225,${opacity * 0.6})"/>`;
  }

  return s;
}

// Get entrance scale for a node (1.0 = fully entered, 0 = not yet)
export function getEntranceScale(fx: EffectsState, nodeId: string): number {
  const e = fx.entrances.get(nodeId);
  if (!e) return 1;
  return springEase(e.age);
}

// Get screen shake offset { x, y } — decaying random displacement
export function getShakeOffset(fx: EffectsState, time: number): { x: number; y: number } {
  if (!fx.shake) return { x: 0, y: 0 };
  const decay = 1 - fx.shake.age;
  const i = fx.shake.intensity * decay;
  // High-frequency random-ish offset using sin at different rates
  const x = Math.sin(time * 47) * i + Math.sin(time * 73) * i * 0.5;
  const y = Math.cos(time * 53) * i + Math.cos(time * 67) * i * 0.5;
  return { x, y };
}

// Get streaming pulse opacity (oscillates 0.3-1.0, faster)
export function getStreamingPulse(fx: EffectsState, nodeId: string, time: number): number | null {
  if (!fx.streamingNodes.has(nodeId)) return null;
  return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 8));
}
