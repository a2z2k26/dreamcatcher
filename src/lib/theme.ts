// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Theme System
// Derived from Andrew's Bumba-Dark Zed theme.
// Warm blacks, luminance hierarchy, single red accent.
// 8-level elevation stack with amber/brown undertones.
// ═══════════════════════════════════════════════════════════════

// ── Elevation Stack (warm blacks → warm grays) ──
// Each level represents a material depth in the UI.
export const E = {
  0: '#080706',   // deepest — title bar, void
  1: '#0C0B09',   // base canvas / app background
  2: '#13120F',   // panel backgrounds, inactive tabs
  3: '#1A1816',   // active line, gutter
  4: '#1E1C19',   // editor/surface background
  5: '#252320',   // highlights, guides, borders (subtle)
  6: '#2C2A26',   // elevated surfaces, active tabs, borders
  7: '#3D3A35',   // highest elevation — hover states, active ghosts
} as const;

// ── Text / Luminance Hierarchy ──
// No chromatic color — importance = brightness
export const T = {
  primary:   '#E1E1E1',  // foreground, keywords
  secondary: '#C8C8C8',  // types, variables
  tertiary:  '#A8A8A8',  // properties, muted
  subtle:    '#808080',  // operators, low-importance
  ghost:     '#606060',  // comments, predictive
  dim:       '#404040',  // barely visible, hints
  invisible: '#2C2A26',  // borders that disappear
} as const;

// ── Accent — single color, used exclusively for attention ──
export const ACCENT = '#DD0000';
export const ACCENT_30 = '#DD000030';  // selection, soft highlights
export const ACCENT_50 = '#DD000050';  // stronger highlights
export const ACCENT_18 = '#DD000018';  // very subtle backgrounds

// ── Semantic (derived from accent or luminance) ──
export const C = {
  active:   ACCENT,             // cursor, focus, attention
  branch:   '#B0B0B0',          // branches — warm white, not blue
  thinking: '#909090',          // reasoning — medium gray
  fresh:    '#E8E8E8',          // new/unread — brightest
  memory:   '#A0A0A0',          // memory/save — warm gray
  learn:    '#D0D0D0',          // learn mode — near-white
} as const;

// ── Canvas ──
export const CANVAS_BG = E[1];   // #0C0B09
export const GRID_COLOR = E[5];  // #252320 — subtle warm dots

// ── Node visual properties ──
export const NODE_R_USER = 24;   // was 18 — scaled up for material visibility
export const NODE_R_AI = 28;     // was 22 — AI nodes slightly larger (more content)
export const PIN_R = 6;

// ── Glass effect for floating UI — multi-layer premium treatment ──
export const glass = {
  background: 'linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: '1px solid rgba(61,58,53,0.8)',       // E[7] at 80% — bright light catch
  borderLeft: '1px solid rgba(44,42,38,0.4)',       // E[6] at 40%
  borderRight: '1px solid rgba(44,42,38,0.3)',      // E[6] at 30%
  borderBottom: '1px solid rgba(19,18,15,0.6)',     // E[2] at 60% — shadow edge
  boxShadow: [
    '0 1px 0 0 rgba(61,58,53,0.35) inset',         // inner top highlight — VISIBLE
    '0 -1px 0 0 rgba(0,0,0,0.15) inset',           // inner bottom shadow
    '0 0 0 0.5px rgba(61,58,53,0.25)',              // hairline outline
    '0 8px 24px -4px rgba(0,0,0,0.7)',              // primary drop — deeper
    '0 2px 8px -1px rgba(0,0,0,0.4)',               // tight shadow
    '0 24px 48px -12px rgba(0,0,0,0.35)',           // ambient — floating effect
  ].join(', '),
} as const;

export const glassElevated = {
  background: 'linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%)',
  backdropFilter: 'blur(24px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
  borderTop: '1px solid rgba(61,58,53,0.7)',
  borderLeft: '1px solid rgba(44,42,38,0.5)',
  borderRight: '1px solid rgba(44,42,38,0.4)',
  borderBottom: '1px solid rgba(19,18,15,0.7)',
  boxShadow: [
    '0 1px 0 0 rgba(61,58,53,0.2) inset',
    '0 -1px 0 0 rgba(0,0,0,0.25) inset',
    '0 8px 32px -4px rgba(0,0,0,0.6)',
    '0 2px 6px 0 rgba(0,0,0,0.35)',
    '0 0 0 1px rgba(0,0,0,0.15)',                   // subtle outline
  ].join(', '),
} as const;

// ── Node colors ──
// User nodes: brighter (they're your words)
export const NODE_USER_FILL = E[4];         // warm dark fill
export const NODE_USER_STROKE = T.secondary; // #C8C8C8
export const NODE_USER_INNER = T.primary;    // #E1E1E1

// AI nodes: dimmer (generated, inspectable)
export const NODE_AI_FILL = 'none';
export const NODE_AI_STROKE = T.subtle;      // #808080
export const NODE_AI_INNER = T.ghost;        // #606060

// ── Spacing Scale (4px base grid, from Bumba brand system) ──
export const S = {
  1:  4,    // micro — icon-to-label gap
  2:  8,    // compact — button padding, small gaps
  3:  12,   // default — input padding, list gaps
  4:  16,   // comfortable — panel padding, section gaps
  5:  20,   // relaxed — card padding
  6:  24,   // spacious — panel headers
  7:  32,   // generous — modal padding
} as const;

// ── Border Radius Scale ──
export const R = {
  sm:   6,     // buttons, badges, inputs, menu items
  md:   10,    // dropdowns, toolbars, floating input
  lg:   14,    // floating panels, session pill open
  xl:   18,    // modals, overlays
  pill: 9999,  // status dots, pills
} as const;

// ── Type Scale ──
export const FS = {
  caption:  10,   // timestamps, metadata, token counts (mono)
  label:    11,   // section labels, secondary metadata
  body:     13,   // body text, inputs, list items — the default
  title:    16,   // panel headers, mode indicators
  display:  20,   // empty state headings, session names expanded
} as const;

// ── Font Families ──
export const FF = {
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'Inconsolata', monospace",
} as const;

// ── Z-Index Stack ──
export const Z = {
  canvas:       0,
  statusBar:   40,
  floatingUI:  50,
  memoryShelf: 55,
  inspector:   60,
  timeline:    70,
  pill:        80,
  pathTrace:   90,
  popover:    100,
  contextMenu: 200,
  overlay:     300,
} as const;

// ── Duration Tokens ──
export const DURATION = {
  instant:  100,  // hover state changes
  fast:     150,  // micro-interactions
  normal:   250,  // panel slides, transforms
  slow:     400,  // overlay fades, major transitions
} as const;

// ── Easing Tokens ──
export const EASE = {
  snap:   'cubic-bezier(0.16, 1, 0.3, 1)',     // primary — spring-loaded
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // material standard
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // playful overshoot
} as const;

// ── Transition Helper ──
export function transition(
  property: string,
  duration: keyof typeof DURATION = 'normal',
  ease: keyof typeof EASE = 'snap'
): string {
  return `${property} ${DURATION[duration]}ms ${EASE[ease]}`;
}

// ── Opacity Scale ──
export const O = {
  invisible: 0.04,
  ghost:     0.08,
  dim:       0.15,
  subtle:    0.3,
  medium:    0.5,
  solid:     0.7,
  visible:   0.85,
  full:      1.0,
} as const;

// ── Factor-based color manipulation ──
function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function lighten(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = factor / 100;
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

export function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = factor / 100;
  return rgbToHex(r * (1 - f), g * (1 - f), b * (1 - f));
}
