# Token Architecture Recommendation

Research synthesis and architectural recommendation for evolving Dreamcatcher's `theme.ts` into a world-class design token system. Based on analysis of 14 production design systems and the current codebase state.

---

## Part I: What The Best Systems Do

### System-by-System Findings

#### Radix UI Colors

Radix defines a 12-step color scale where each step has a specific functional purpose. This is the most widely adopted model in the React ecosystem and the foundation shadcn/ui builds on.

**Elevation/Surface:** Steps 1-2 are app backgrounds and subtle component backgrounds. Step 1 is the deepest canvas; step 2 is a recessed surface. The system provides both solid and alpha (transparent) variants of every step, so surfaces can overlay other surfaces without breaking.

**Text Hierarchy:** Step 11 is low-contrast text; step 12 is high-contrast text. Only two text levels exist in the core scale. Additional hierarchy comes from using gray scales versus accent scales.

**Borders/Separators:** Steps 6-7 serve as borders. Step 6 is subtle (dividers, separators). Step 7 is visible (input borders, prominent dividers). Step 8 is reserved for focus rings and strong borders.

**Shadows:** Not part of the color scale system. Shadows are handled separately, which is a weakness for dark mode where shadow and surface are deeply coupled.

**Interactive States:** Steps 3-5 are explicitly mapped to component states. Step 3 = normal/default. Step 4 = hover. Step 5 = active/pressed. This is the cleanest interactive state model in any system studied.

**Unique Approach:** Every color has an alpha variant that appears visually identical to the solid variant when placed over the page background. This means you can layer transparent surfaces over any background and they compose correctly. Critical for canvas UIs where elements overlap.

---

#### GitHub Primer

Primer uses a three-layer token architecture: base (raw palette) -> functional (semantic) -> component. The functional layer is where dark mode happens.

**Elevation/Surface:** Functional tokens like `bgColor-default`, `bgColor-muted`, `bgColor-inset`, `bgColor-emphasis` define surfaces. In dark mode, `default` maps to near-black, `muted` to slightly lighter, `inset` to darker (the reverse of light mode), and `emphasis` to near-white (for inverted badges). The key insight: inset surfaces go darker in dark mode, not lighter.

**Text Hierarchy:** `fgColor-default`, `fgColor-muted`, `fgColor-onEmphasis`. Three tiers. Default is the brightest readable text (~87% luminance in dark). Muted is secondary (~60%). OnEmphasis is for text on inverted backgrounds.

**Borders/Separators:** `borderColor-default`, `borderColor-muted`, `borderColor-emphasis`. Three tiers. Muted borders are nearly invisible separators. Default borders are structural. Emphasis borders demand attention.

**Shadows:** `shadow-small`, `shadow-medium`, `shadow-large`, `shadow-extra-large`. Each is a composite value with multiple layers. Dark mode shadows use deeper blacks with higher opacity.

**Interactive States:** State-specific tokens exist per component. Button has `bgColor-rest`, `bgColor-hover`, `bgColor-active`, `bgColor-disabled`. This per-component approach is thorough but verbose.

**Unique Approach:** Primer supports 9 theme variants (light, dark, dark dimmed, dark high contrast, light high contrast, light tritanopia, dark tritanopia, light colorblind, dark colorblind). They achieve this through an "overrides" system -- a dark theme variant only defines the tokens that differ from the base dark theme. Everything else inherits. This is the most mature multi-theme system in production.

---

#### shadcn/ui

shadcn/ui defines all theme tokens as CSS custom properties in HSL format, scoped to `:root` (light) and `.dark` (dark).

**Elevation/Surface:** `--background` (page), `--card` (elevated), `--popover` (floating), `--muted` (recessed). Four surface levels. Simple and sufficient for most layouts.

**Text Hierarchy:** `--foreground` (primary), `--card-foreground`, `--popover-foreground`, `--muted-foreground`. Each surface has a paired foreground token. This surface-foreground pairing is the defining pattern -- it guarantees contrast ratios hold regardless of which surface a component lands on.

**Borders/Separators:** `--border` (structural), `--input` (form fields), `--ring` (focus rings). Three distinct border contexts.

**Shadows:** Not tokenized at the CSS variable level. Handled through Tailwind shadow utilities. A gap in the system.

**Interactive States:** `--accent` (hover backgrounds), `--accent-foreground` (text on hover backgrounds). A single accent pair handles all hover states. Minimal but effective.

**Unique Approach:** The background/foreground pairing convention. Every surface token (card, popover, muted, destructive, primary, secondary) has a `-foreground` counterpart. Components never choose text color independently -- they always read the foreground of their parent surface. This eliminates contrast violations by construction.

---

#### Tailwind CSS v4

Tailwind v4 replaced JavaScript configuration with a CSS-first `@theme` directive. Design tokens are now CSS custom properties defined directly in CSS, consumed as utility classes.

**Elevation/Surface:** Not opinionated. Tailwind provides the mechanism (`@theme` + CSS variables) but not the token names. The recommended pattern from the ecosystem: semantic tokens like `--color-surface-default`, `--color-surface-raised`, `--color-surface-overlay` mapped to Tailwind utilities.

**Text Hierarchy:** Same approach. `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-disabled` as custom properties, consumed as `text-primary`, `text-secondary`, etc.

**Shadows:** Tailwind v4 uses OKLCH colors for its built-in palette, generating perceptually even steps. Shadow tokens can be defined in `@theme` as composite values.

**Interactive States:** Tailwind handles states through variant prefixes (`hover:`, `focus:`, `active:`, `disabled:`) applied to utility classes. The token system provides the values; the variant system provides the state mapping. This separation is clean.

**Unique Approach:** `@custom-variant dark (&:where(.dark, .dark *))` allows dark mode to be a CSS-level variant rather than a JavaScript toggle. Combined with `@theme`, you define light values by default and dark overrides in a single CSS file. No build-time switching. The `light-dark()` CSS function (now at 93%+ browser support) can hold both values inline: `color: light-dark(var(--gray-900), var(--gray-100))`.

---

#### Vercel Geist

Geist is radically minimal: OKLCH color space, no hue in the gray scale, 10 color scales with P3 wide-gamut support.

**Elevation/Surface:** Two page backgrounds (Background 1 and Background 2). Background 2 is used sparingly for subtle differentiation. Three component background steps: Color 1 (default), Color 2 (hover/active), Color 3 (small elements like badges). This is the most restrained surface system studied.

**Text Hierarchy:** Gray scale steps 9-12 for text, with step 12 being the highest contrast. The gray alpha scale provides transparent variants for text over variable backgrounds.

**Borders/Separators:** Gray scale steps 4-6. The system does not name these as "border tokens" -- it expects consumers to pick from the scale based on the desired contrast. This is less guided than Primer but more flexible.

**Shadows:** Geist uses almost no box-shadows. Elevation is communicated through background color steps and 1px borders at very low opacity. This "anti-shadow" approach creates an unusually calm interface. Surfaces feel etched into a single plane rather than stacked.

**Interactive States:** Color 1 = default background. Color 2 = hover background. Color 3 = active background. Three explicit steps per color scale for interaction. Consistent across all accent colors.

**Unique Approach:** P3 wide-gamut color support with OKLCH throughout. Colors defined in `oklch()` with fallbacks. The gray scale is truly achromatic -- `oklch(L 0 0)` -- no hue, no chroma. This is the purest luminance-only hierarchy in production.

---

#### Linear

Linear rebuilt their theme system on LCH color space with an algorithmic approach.

**Elevation/Surface:** Five surface levels derived from the base color by incrementing lightness in LCH space. Each step is perceptually equal because LCH is perceptually uniform. Canvas (~L:5), Surface 1 (~L:8), Surface 2 (~L:11), Surface 3 (~L:14), Surface 4 (~L:18). The gaps are roughly 3 LCH lightness units.

**Text Hierarchy:** Three text levels: high priority (~`#EDEDEF`, L:93), secondary (~`#A1A1AA`, L:68), tertiary (~`#71717A`, L:50). The spread is ~43 lightness units from tertiary to primary.

**Borders/Separators:** Derived from the base color at specific lightness offsets. Subtle borders sit 10-12 LCH units above the surface they sit on. Strong borders sit 18-20 units above.

**Shadows:** Shadows are included in the 98-variable theme output. In dark mode, shadows use very deep blacks (L:2-3) with high opacity. The contrast variable controls how aggressive the shadows are -- high contrast themes get harder shadows.

**Interactive States:** Generated algorithmically. Hover = surface + 3L. Active = surface + 5L. The offset is always a fixed lightness delta, which guarantees consistent perceptual feedback regardless of the base surface.

**Unique Approach:** Three-variable theme generation. Base color + accent color + contrast percentage generates all 98 tokens. This is the most automated system studied. The contrast slider is particularly relevant for Dreamcatcher -- it would let users tune how much separation exists between elevation levels, which directly affects the "petri dish under glass" metaphor (low contrast = atmospheric, high contrast = clinical).

---

#### Material Design 3

MD3 is the most formally specified system, with explicit token naming and platform-specific implementations.

**Elevation/Surface:** MD3 replaced shadow-based elevation with tonal elevation. Higher surfaces use tones closer to the primary color rather than getting lighter shades of gray. Six elevation levels (0-5). In dark mode, Surface Container (the primary content surface) uses tone 12 from the neutral palette, Surface Container High uses tone 17, Surface Container Highest uses tone 22. The tonal approach means elevated surfaces have subtle color, not just brightness.

**Text Hierarchy:** `on-surface` (primary text), `on-surface-variant` (secondary text), `outline` (borders and tertiary text). The "on-" prefix convention means every surface has a guaranteed-accessible text color. The system auto-generates these from the tonal palette.

**Borders/Separators:** `outline` (standard borders, 1.33:1 contrast against surface), `outline-variant` (subtle borders, decorative). Two tiers only.

**Shadows:** Six levels from `--md-sys-elevation-level0` (none) to `--md-sys-elevation-level5` (complex multi-layer). Each level is a composite CSS box-shadow with 2-3 layers. Dark mode uses identical shadow definitions -- the tonal surface differences provide the primary hierarchy, shadows are supplementary.

**Interactive States:** State layers. A semi-transparent overlay is applied on top of the component surface: hover = 8% opacity of the content color, pressed = 12%, focused = 12%, dragged = 16%. The overlay uses the content color (usually `on-surface`), not a fixed gray. This means a primary button's hover is tinted primary, a secondary button's hover is tinted secondary.

**Unique Approach:** The state layer system. Instead of defining a separate color for every interactive state of every component, MD3 defines opacity multipliers applied to the content color. This reduces the number of tokens from O(components * states) to O(states). The tonal elevation system is also unique -- no other system ties elevation to hue shift.

---

#### Ant Design v5

Ant Design uses an algorithmic token system with three tiers: Seed -> Map -> Alias.

**Elevation/Surface:** Seed token `colorBgContainer` (the primary surface) generates map tokens for `colorBgElevated` (cards, modals), `colorBgLayout` (page background), `colorBgSpotlight` (tooltips). The dark algorithm inverts and adjusts these automatically.

**Text Hierarchy:** `colorText` (85% opacity on dark), `colorTextSecondary` (65%), `colorTextTertiary` (45%), `colorTextQuaternary` (25%). Four tiers, defined as opacity values against a base text color. This opacity-based approach is simpler than defining separate hex values.

**Borders/Separators:** `colorBorder` (15% of text color), `colorBorderSecondary` (6% of text color). Derived from the text color at fixed opacity ratios, which guarantees they scale correctly across themes.

**Shadows:** `boxShadow`, `boxShadowSecondary`, `boxShadowTertiary`. Three levels. The dark algorithm generates shadows with lower spread and higher opacity.

**Interactive States:** `colorPrimaryHover`, `colorPrimaryActive`, `colorPrimaryBorder`, `colorPrimaryBorderHover`. Per-semantic-color state tokens generated from the seed color via the palette algorithm. The algorithm lightens for hover in dark mode (opposite of light mode).

**Unique Approach:** The algorithm system. You provide ~20 seed tokens, and the algorithm generates ~300 map and alias tokens. Algorithms are composable -- `dark` and `compact` can be combined. Per-component token overrides respect the algorithm (you can set `algorithm: true` on component tokens to have them regenerated). This is the most scalable approach for large component libraries.

---

#### Atlassian Design System

Atlassian uses elevation as a first-class token category alongside color, space, and typography.

**Elevation/Surface:** `elevation.surface.default`, `elevation.surface.sunken`, `elevation.surface.raised`, `elevation.surface.overlay`. Four named surfaces. In dark mode, raised and overlay surfaces are explicitly lighter than default. Sunken is explicitly darker.

**Text Hierarchy:** `color.text`, `color.text.subtle`, `color.text.subtlest`, `color.text.disabled`, `color.text.inverse`. Five tiers including disabled and inverse states.

**Borders/Separators:** `color.border`, `color.border.bold`, `color.border.disabled`. Three tiers with a bold variant for emphasis.

**Shadows:** Paired with surfaces. `elevation.shadow.raised` and `elevation.shadow.overlay`. Shadows are always paired with their corresponding surface token. In dark mode, shadows are harder to see, so the surface color difference does more of the work -- "imagine surfaces are distantly lit from the front."

**Interactive States:** `color.interaction.hovered`, `color.interaction.pressed`. System-wide interaction tokens rather than per-component. These are transparent overlays applied on top of any surface.

**Unique Approach:** The elevation.surface + elevation.shadow pairing is mandatory. The system enforces that `elevation.surface.overlay` is always used with `elevation.shadow.overlay`. This prevents the common bug where a developer applies a raised shadow to a default-elevation surface, breaking the illusion. The naming convention (`elevation.surface.*` not `color.background.*`) frames surfaces as spatial concepts, not just color choices.

---

#### Open Props

Open Props provides "sub-atomic" CSS custom properties as a utility library.

**Elevation/Surface:** Gray scale with numbered steps (1-12). Low numbers are light, high numbers are dark. In dark mode, the scale is flipped -- `--gray-1` becomes the darkest value. Surface tokens reference scale positions.

**Text Hierarchy:** `--gray-8` through `--gray-12` for text in dark mode (reversed from light). Consumers build their own semantic layer on top.

**Borders/Separators:** `--gray-4` through `--gray-6` for borders. No semantic naming -- the consumer selects from the scale.

**Shadows:** Six shadow levels (`--shadow-1` through `--shadow-6`) that automatically adapt to light and dark modes. Inner shadows are also provided (`--inner-shadow-1` through `--inner-shadow-4`). Dark mode shadows use deeper blacks and are more prominent.

**Interactive States:** Not tokenized. Left to the consumer.

**Unique Approach:** The adaptive shadow system. Shadows in Open Props use `hsl()` values that automatically adjust when the color-scheme changes. In dark mode, shadow color and spread change to remain visible against dark surfaces. The inner shadow variants are particularly useful for dark mode -- they create depth through carved-out effects rather than drop shadows, which is more perceptible on dark backgrounds.

---

#### Figma Variables

Figma's variable system provides the design-tool-side model that informs code token architecture.

**Elevation/Surface:** Variables are organized into Collections (Primitives, Tokens) with Modes (Light, Dark). A primitive collection holds raw values (`gray-900: #111827`). A token collection holds semantic references (`surface-default -> gray-900` in dark mode, `surface-default -> white` in light mode). Switching modes swaps the references.

**Text Hierarchy:** Same pattern. `text-primary -> gray-50` in dark mode, `text-primary -> gray-900` in light mode.

**Borders/Separators:** Variable scoping restricts where tokens can be applied. A border token scoped to "stroke" will only appear in Figma's stroke color picker, preventing designers from accidentally using border colors as fills.

**Interactive States:** Modes can represent states as well as themes. A "states" mode on a component collection can hold hover, active, disabled values. This is powerful but can lead to mode explosion.

**Unique Approach:** Variable scoping. Figma variables can be scoped to specific properties (fill, stroke, text, gap, etc.), which prevents misuse at the design tool level. This discipline should carry into code -- TypeScript types that restrict which tokens can be used for which properties.

---

#### Style Dictionary

Style Dictionary is the build tool that transforms token definitions into platform-specific outputs.

**Elevation/Surface:** Token files are organized by category (`color/`, `elevation/`, `shadow/`). Dark mode is achieved by running the build multiple times with different source files -- light tokens and dark tokens as separate inputs generating separate CSS files.

**Shadows:** Composite tokens (shadow values with multiple layers) are supported as structured objects with `offsetX`, `offsetY`, `blur`, `spread`, `color` properties. The build resolves references within these composites.

**Interactive States:** No special handling. States are just additional token entries.

**Unique Approach:** Multi-platform output from a single source. The same token definition generates CSS custom properties, iOS Swift constants, Android XML resources, and JSON for runtime consumption. This matters if Dreamcatcher ever targets native platforms. Also: `outputReferences: true` preserves the alias chain in the output (`--surface-raised: var(--gray-800)` rather than `--surface-raised: #1f2937`), which makes debugging easier.

---

### Cross-System Patterns

These patterns appeared in three or more of the systems studied:

| Pattern | Systems | Implication |
|---------|---------|-------------|
| Three-tier token hierarchy (primitive -> semantic -> component) | Primer, Atlassian, Ant Design, MD3, Figma Variables, Style Dictionary | This is the consensus architecture. Not optional. |
| Surface/foreground pairing | shadcn/ui, MD3, Atlassian, Primer | Every surface token should have a guaranteed-accessible text color partner. |
| Interactive states as scale steps | Radix (3/4/5), Geist (1/2/3), Linear (+3L/+5L) | States should be adjacent steps in a scale, not arbitrary values. |
| Perceptual color space (OKLCH/LCH) | Linear, Geist, Tailwind v4, Open Props | Perceptual uniformity is the new standard. Hex/HSL are legacy. |
| Shadow + surface pairing | Atlassian, MD3, Open Props | Shadows must be co-designed with surfaces, especially in dark mode. |
| Alpha/transparent variants | Radix, Geist, Primer, Open Props | Canvas/spatial UIs need transparent variants for composable layering. |
| Algorithmic derivation | Linear (3 seeds -> 98 tokens), Ant Design (20 seeds -> 300 tokens), MD3 (tonal palette) | Compute what you can; hand-tune what you must. |
| Focus ring as distinct token | shadcn/ui (`--ring`), Radix (step 8), Primer (`borderColor-focus`) | Focus is not "just another border." It needs its own token. |

---

## Part II: Where Dreamcatcher's Current System Stands

### What theme.ts Gets Right

1. **Warm-black elevation stack** -- The 8-step E scale with amber undertones is distinctive and well-calibrated. No system studied uses warm blacks at this level of refinement.

2. **Luminance-only text hierarchy** -- T.primary through T.invisible maps to the industry-standard approach (Geist, Linear, Primer all use achromatic text scales). Seven steps is more granular than most systems; that granularity is justified for a spatial UI with many information density levels.

3. **Single-accent discipline** -- DD0000 used with restraint matches Vercel's philosophy. Stronger creative position than multi-accent systems.

4. **Glass treatment** -- The multi-layer glass objects (directional borders, inset highlights, stacked shadows) are more sophisticated than any single system studied. This is already at benchmark quality.

5. **Motion tokens** -- DURATION and EASE as named values is correct. The snap/smooth/bounce easing set covers the three primary interaction characters.

6. **Opacity scale** -- The 8-step opacity scale (O.invisible through O.full) is not something most systems tokenize. This is valuable for the canvas context where alpha compositing is constant.

### What theme.ts Gets Wrong

1. **No tier separation.** Everything is a flat export. E[4] is simultaneously a primitive value and a semantic concept (surface background). There is no separation between "these are the raw colors" and "this is how colors are applied." Changing E[4] ripples unpredictably.

2. **No surface/foreground pairing.** E[4] is used as a surface background in some places and T.secondary is used as text on it, but this relationship is not encoded anywhere. A developer must manually verify contrast.

3. **No interactive state system.** Hover, focus, active, and disabled are not tokenized. Components define their own hover colors ad-hoc (often by appending hex alpha like `${E[7]}80`). This is the string-concatenation equivalent of SQL injection -- it works until it doesn't.

4. **Shadows are inline, not tokens.** The glass object defines shadow stacks as string values, but there are no named shadow tokens for general use. A component that needs a "raised" shadow has no token to reach for.

5. **No alpha variants.** The elevation stack is solid hex values only. For a canvas UI where nodes, edges, and panels layer over each other, transparent surface variants are essential.

6. **Border tokens are missing.** T.invisible serves as both a dim text color and a border color. The dual use means you cannot change border appearance without affecting text.

7. **Canvas-specific tokens are minimal.** CANVAS_BG and GRID_COLOR exist, but there are no tokens for canvas atmosphere (vignette), node materials, edge treatments, or the spatial concepts identified in the Visual Critique (selection glow radius, streaming halo, connection trace).

8. **Color space is sRGB hex.** Every value is a hex string. No perceptual uniformity. The elevation steps happen to be perceptually even (Andrew tuned them by eye), but this is fragile -- future modifications or algorithmic generation would benefit from OKLCH.

---

## Part III: Recommended Architecture

### Tier 1 -- Primitives

Raw values. The "what exists" layer. No semantic meaning. Named by their intrinsic properties.

```typescript
// ── Primitive Color Scale ──
// Warm-black ramp in 16 steps. Derived from Bumba-Dark palette.
// Named by lightness index (0 = darkest, 15 = lightest).
// Future: migrate to oklch() for perceptual uniformity.

export const gray = {
  0:  '#050504',   // true void
  1:  '#080706',   // near-void
  2:  '#0C0B09',   // deep ground
  3:  '#100F0C',   // dark substrate
  4:  '#13120F',   // recessed
  5:  '#1A1816',   // panel base
  6:  '#1E1C19',   // surface
  7:  '#232120',   // mid surface
  8:  '#252320',   // subtle structure
  9:  '#2C2A26',   // visible structure
  10: '#333130',   // elevated
  11: '#3D3A35',   // high elevation
  12: '#4A4743',   // peak elevation
  13: '#605D58',   // subtle text / strong border
  14: '#807D78',   // muted text
  15: '#A8A5A0',   // secondary text
  16: '#D0CDCA',   // primary text
  17: '#E8E6E4',   // emphasis text
} as const;

// ── Primitive Alpha Scale ──
// Transparent variants for composable layering.
// White-based (for additive layering on dark surfaces).

export const whiteA = {
  1:  'rgba(255,255,255,0.02)',
  2:  'rgba(255,255,255,0.04)',
  3:  'rgba(255,255,255,0.06)',
  4:  'rgba(255,255,255,0.08)',
  5:  'rgba(255,255,255,0.10)',
  6:  'rgba(255,255,255,0.14)',
  7:  'rgba(255,255,255,0.18)',
  8:  'rgba(255,255,255,0.24)',
  9:  'rgba(255,255,255,0.32)',
  10: 'rgba(255,255,255,0.44)',
  11: 'rgba(255,255,255,0.60)',
  12: 'rgba(255,255,255,0.80)',
} as const;

export const blackA = {
  1:  'rgba(0,0,0,0.05)',
  2:  'rgba(0,0,0,0.10)',
  3:  'rgba(0,0,0,0.15)',
  4:  'rgba(0,0,0,0.20)',
  5:  'rgba(0,0,0,0.30)',
  6:  'rgba(0,0,0,0.40)',
  7:  'rgba(0,0,0,0.50)',
  8:  'rgba(0,0,0,0.60)',
  9:  'rgba(0,0,0,0.70)',
  10: 'rgba(0,0,0,0.80)',
  11: 'rgba(0,0,0,0.90)',
  12: 'rgba(0,0,0,0.95)',
} as const;

// ── Primitive Accent ──
export const red = {
  base:  '#DD0000',
  light: '#FF2222',
  dark:  '#AA0000',
} as const;

// ── Primitive Faction Colors ──
// Model provider identity. Used only in node materials and model selector.
export const faction = {
  anthropic: '#D4A574',
  openai:    '#52C41A',
  google:    '#FAAD14',
  qwen:      '#FA8C16',
} as const;
```

### Tier 2 -- Semantic Tokens

The "how things are used" layer. Named by role, not appearance. This is where dark mode lives. If Dreamcatcher ever gains a light mode or high-contrast mode, only this tier changes.

```typescript
// ══════════════════════════════════════════════════════════════
// SURFACES
// Modeled after Atlassian's elevation.surface pattern.
// Every surface has a paired foreground for guaranteed contrast.
// ══════════════════════════════════════════════════════════════

export const surface = {
  // -- Page-level surfaces --
  void:       { bg: gray[1],  fg: gray[17] },  // title bar, absolute deepest
  canvas:     { bg: gray[2],  fg: gray[16] },  // main canvas ground plane
  sunken:     { bg: gray[3],  fg: gray[15] },  // inset areas, code blocks

  // -- Component-level surfaces --
  default:    { bg: gray[5],  fg: gray[16] },  // panels, sidebars, cards
  raised:     { bg: gray[6],  fg: gray[16] },  // elevated cards, active tabs
  overlay:    { bg: gray[7],  fg: gray[17] },  // modals, command palette

  // -- Special surfaces --
  input:      { bg: gray[6],  fg: gray[16] },  // text input backgrounds
  tooltip:    { bg: gray[11], fg: gray[17] },  // tooltips, toasts
  inverse:    { bg: gray[17], fg: gray[2]  },  // inverted badges, emphasis
} as const;

// ══════════════════════════════════════════════════════════════
// TEXT
// Pure luminance hierarchy. No chromatic tint.
// Maps to the Radix step 11-12 model but extended for spatial UI.
// ══════════════════════════════════════════════════════════════

export const text = {
  emphasis:  gray[17],  // headings, selected items, maximum contrast
  primary:   gray[16],  // body text, input text, active labels
  secondary: gray[15],  // secondary labels, metadata values
  tertiary:  gray[14],  // placeholders, timestamps, third-tier info
  muted:     gray[13],  // operators, subtle annotations
  ghost:     gray[11],  // comments, disabled-adjacent, section headers
  dim:       gray[9],   // barely visible hints, disabled text
  invisible: gray[8],   // border-level luminance, hidden until hovered
} as const;

// ══════════════════════════════════════════════════════════════
// BORDERS
// Separated from text tokens. Three tiers + focus ring.
// Follows Primer's borderColor model.
// ══════════════════════════════════════════════════════════════

export const border = {
  subtle:    gray[8],             // dividers, faint separators
  default:   gray[9],             // structural borders, input outlines
  strong:    gray[11],            // emphasized borders, active outlines
  focus:     `${red.base}50`,     // focus rings (accent at 31% alpha)
  focusRing: `0 0 0 2px ${red.base}20, 0 0 12px -2px ${red.base}18`,  // compound focus shadow
} as const;

// ══════════════════════════════════════════════════════════════
// INTERACTIVE STATES
// Modeled after Radix steps 3/4/5 and Linear's +L offset model.
// Transparent overlays (like MD3 state layers) so they work on any surface.
// ══════════════════════════════════════════════════════════════

export const interactive = {
  // -- Neutral states (for non-accent components) --
  hover:    whiteA[3],   // 6% white overlay
  active:   whiteA[4],   // 8% white overlay
  selected: whiteA[5],   // 10% white overlay
  disabled: blackA[3],   // 15% black overlay (dims the surface)

  // -- Accent states (for primary/accent components) --
  accentHover:  `${red.base}18`,  // accent at 9% alpha
  accentActive: `${red.base}28`,  // accent at 16% alpha

  // -- Opacity modifiers (for disabled content, not surfaces) --
  disabledOpacity: 0.38,          // MD3 standard
  hoverOpacity:    0.08,          // state layer opacity
  pressedOpacity:  0.12,
} as const;

// ══════════════════════════════════════════════════════════════
// SHADOWS
// Paired with surface tiers (Atlassian model).
// Dark mode shadows use deep blacks at high opacity.
// Inner highlights included for glass-like depth.
// ══════════════════════════════════════════════════════════════

export const shadow = {
  // -- Drop shadows (external depth) --
  sm: '0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.25)',
  md: '0 2px 8px -1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
  lg: '0 4px 16px -2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
  xl: '0 8px 32px -4px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.35)',

  // -- Inset shadows (internal depth, glass thickness) --
  insetHighlight: '0 1px 0 0 rgba(255,255,255,0.06) inset',
  insetShadow:    '0 -1px 0 0 rgba(0,0,0,0.2) inset',
  insetBoth:      '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 -1px 0 0 rgba(0,0,0,0.2) inset',

  // -- Glow shadows (for selection, focus, streaming) --
  accentGlow:   `0 0 20px -4px ${red.base}30`,
  accentHalo:   `0 0 40px -8px ${red.base}20`,
  warmAmbient:  '0 0 60px -12px rgba(212,165,116,0.06)',  // anthropic amber ambient

  // -- Composite shadow stacks (for glass surfaces) --
  glass: [
    '0 1px 0 0 rgba(61,58,53,0.15) inset',
    '0 -1px 0 0 rgba(0,0,0,0.2) inset',
    '0 4px 16px -2px rgba(0,0,0,0.5)',
    '0 1px 3px 0 rgba(0,0,0,0.3)',
  ].join(', '),

  glassElevated: [
    '0 1px 0 0 rgba(61,58,53,0.2) inset',
    '0 -1px 0 0 rgba(0,0,0,0.25) inset',
    '0 8px 32px -4px rgba(0,0,0,0.6)',
    '0 2px 6px 0 rgba(0,0,0,0.35)',
    '0 0 0 1px rgba(0,0,0,0.15)',
  ].join(', '),
} as const;

// ══════════════════════════════════════════════════════════════
// GLASS MATERIALS
// The defining visual of Dreamcatcher's floating UI.
// Retained from current theme.ts with improved structure.
// ══════════════════════════════════════════════════════════════

export const glass = {
  standard: {
    background: `linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%)`,
    backdropFilter: 'blur(20px) saturate(1.2)',
    borderTop:    `1px solid rgba(61,58,53,0.6)`,
    borderLeft:   `1px solid rgba(44,42,38,0.4)`,
    borderRight:  `1px solid rgba(44,42,38,0.3)`,
    borderBottom: `1px solid rgba(19,18,15,0.6)`,
    boxShadow: shadow.glass,
  },
  elevated: {
    background: `linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%)`,
    backdropFilter: 'blur(24px) saturate(1.3)',
    borderTop:    `1px solid rgba(61,58,53,0.7)`,
    borderLeft:   `1px solid rgba(44,42,38,0.5)`,
    borderRight:  `1px solid rgba(44,42,38,0.4)`,
    borderBottom: `1px solid rgba(19,18,15,0.7)`,
    boxShadow: shadow.glassElevated,
  },
  subtle: {
    background: `rgba(19,18,15,0.6)`,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${gray[8]}40`,
    boxShadow: shadow.md,
  },
} as const;
```

### Tier 2.5 -- Canvas Tokens (Spatial Semantic Layer)

This tier does not exist in any standard design system because standard design systems are not spatial. This is Dreamcatcher-specific and covers the canvas substrate, node materials, edge treatments, and spatial effects.

```typescript
// ══════════════════════════════════════════════════════════════
// CANVAS SUBSTRATE
// The ground plane of the spatial interface.
// Tokens for the "petri dish under a microscope" metaphor.
// ══════════════════════════════════════════════════════════════

export const canvas = {
  // -- Ground --
  background:    gray[2],
  gridDot:       gray[8],
  gridDotAlpha:  whiteA[3],

  // -- Atmosphere (vignette, ambient light) --
  vignetteInner: 'rgba(19,18,15,0)',
  vignetteOuter: 'rgba(8,7,6,0.8)',
  vignetteGradient: `radial-gradient(ellipse 120% 120% at 50% 50%, rgba(19,18,15,0) 0%, rgba(8,7,6,0.4) 70%, rgba(8,7,6,0.8) 100%)`,

  // -- Ambient glow (for streaming, attention) --
  ambientAccent:   `radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), ${red.base}06 0%, transparent 60%)`,
  ambientFaction:  (color: string) => `radial-gradient(circle, ${color}04 0%, transparent 50%)`,
} as const;

// ══════════════════════════════════════════════════════════════
// NODE MATERIALS
// Multi-layer material definitions for canvas nodes.
// User nodes: precious, dimensional, top-lit.
// AI nodes: glass vessels, hollow, subtle faction tint.
// ══════════════════════════════════════════════════════════════

export const nodeMaterial = {
  user: {
    // Base fill: radial gradient simulating convex surface
    fillGradient: {
      cx: '45%', cy: '35%',
      stops: [
        { offset: '0%',   color: gray[9] },      // highlight
        { offset: '60%',  color: gray[6] },      // midtone
        { offset: '100%', color: gray[4] },      // shadow
      ],
    },
    // Specular highlight: glass-under-microscope sheen
    specularGradient: {
      cx: '40%', cy: '30%',
      stops: [
        { offset: '0%',   color: 'rgba(225,225,225,0.12)' },
        { offset: '40%',  color: 'rgba(225,225,225,0.03)' },
        { offset: '100%', color: 'rgba(225,225,225,0)' },
      ],
    },
    stroke:       text.secondary,
    strokeHover:  text.emphasis,
    innerDot:     text.emphasis,
    shadow:       'drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(0 0 12px rgba(8,7,6,0.8))',
    shadowHover:  'drop-shadow(0 4px 12px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(8,7,6,0.9))',
  },
  ai: {
    fillGradient: {
      cx: '50%', cy: '45%',
      stops: [
        { offset: '0%',   color: `${gray[5]}E6` },   // 90% opacity
        { offset: '80%',  color: `${gray[2]}F2` },   // 95% opacity
      ],
    },
    bezelOuter:      gray[8],
    bezelInner:      `${gray[8]}4D`,   // 30% opacity
    refractionRing:  text.ghost,
    factionTint:     0.04,             // opacity for faction color wash
    factionTintHover: 0.08,
    stroke:          text.muted,
    strokeHover:     text.tertiary,
    shadow:          'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
  },
} as const;

// ══════════════════════════════════════════════════════════════
// EDGE TREATMENTS
// Connection rendering tokens for the conversation graph.
// ══════════════════════════════════════════════════════════════

export const edge = {
  reply: {
    stroke:      'rgba(128,128,128,0.25)',
    strokeWidth: 1.5,
    dashArray:   'none',           // solid -- primary thread is permanent
    glow:        'rgba(128,128,128,0.06)',
    glowWidth:   6,
  },
  branch: {
    stroke:      'rgba(176,176,176,0.3)',
    strokeWidth: 1.2,
    dashArray:   '8 4',            // deliberate, measured dashes
    animationSpeed: 0.8,           // slower than default -- considered, not jittery
  },
  regeneration: {
    stroke:      `${red.base}33`,  // accent at 20%
    strokeWidth: 1.0,
    dashArray:   '2 6',            // short pulses -- "retrying"
    animationSpeed: 2.0,           // fast, urgent
  },
  arrow: {
    size:  4,                      // marker dimensions
    color: 'rgba(128,128,128,0.25)',
  },
} as const;

// ══════════════════════════════════════════════════════════════
// SELECTION & FOCUS
// Multi-layer selection system for spatial objects.
// ══════════════════════════════════════════════════════════════

export const selection = {
  // Primary selection (single node)
  glow: {
    color:   `${red.base}14`,     // 8% accent
    radius:  20,                   // pixels beyond node radius
  },
  ring: {
    color:   red.base,
    width:   1.5,
    opacity: 0.7,
    dashArray: 'none',             // solid for primary
  },
  breath: {
    color:   red.base,
    width:   0.5,
    opacity: 0.15,
    amplitude: 2,                  // pixels of sine wave
    frequency: 3,                  // cycles per second
  },

  // Multi-selection (secondary nodes)
  multi: {
    color:   red.base,
    width:   1.0,
    opacity: 0.4,
    dashArray: '4 4',              // dashed for secondary
  },

  // Lasso / marquee selection
  lasso: {
    fill:   `${red.base}08`,
    stroke: `${red.base}40`,
    strokeWidth: 1,
  },
} as const;

// ══════════════════════════════════════════════════════════════
// STREAMING STATE
// System-wide visual tokens for when AI is generating.
// ══════════════════════════════════════════════════════════════

export const streaming = {
  nodePulse: {
    color:    red.base,
    minOpacity: 0.3,
    maxOpacity: 0.8,
    duration:   1500,              // ms per pulse cycle
  },
  inputBorder: {
    color:    red.base,
    width:    2,
  },
  canvasAmbient: {
    color:    red.base,
    opacity:  0.02,
    radius:   200,                 // px from streaming node
    scaleRange: [0.8, 1.2],       // breathing scale
    duration:   2000,
  },
} as const;
```

### Tier 3 -- Component Tokens

The "where things are applied" layer. Per-component token maps that reference semantic tokens. These exist as documentation and TypeScript types -- they do not introduce new values, they constrain which semantic tokens a component uses.

```typescript
// ══════════════════════════════════════════════════════════════
// COMPONENT TOKEN MAP
// Documents which semantic tokens each component consumes.
// Enables refactoring safety: change a semantic token and
// instantly see every component affected.
// ══════════════════════════════════════════════════════════════

// Example: InputBar component tokens
export const inputBarTokens = {
  surface:        surface.default.bg,
  surfaceFocused: surface.raised.bg,
  text:           text.primary,
  placeholder:    text.ghost,
  border:         border.default,
  borderFocused:  border.focus,
  focusRing:      border.focusRing,
  shadow:         shadow.md,
  shadowFocused:  shadow.lg,
} as const;

// Example: ContextMenu component tokens
export const contextMenuTokens = {
  surface:        glass.elevated,
  text:           text.primary,
  textSecondary:  text.tertiary,
  separator:      border.subtle,
  itemHover:      interactive.hover,
  itemActive:     interactive.active,
  shadow:         shadow.glassElevated,
  kbd:            text.dim,
} as const;

// Example: Inspector panel tokens
export const inspectorTokens = {
  surface:        glass.standard,
  headerText:     text.ghost,         // uppercase micro headers
  bodyText:       text.secondary,
  metaText:       text.tertiary,
  metaValue:      text.muted,
  border:         border.subtle,
  separator:      border.subtle,
  scrollFade:     `linear-gradient(to bottom, transparent 0px, black 16px, black calc(100% - 16px), transparent 100%)`,
} as const;
```

### Foundation Tokens (Unchanged)

These tokens remain as they are in the current theme.ts, with minor reorganization:

```typescript
// ══════════════════════════════════════════════════════════════
// SPACING (4px base grid -- already correct)
// ══════════════════════════════════════════════════════════════

export const space = {
  1:  4,     // micro: icon-to-label, tight gaps
  2:  8,     // compact: button padding, item gaps
  3:  12,    // standard: input padding, section spacing
  4:  16,    // comfortable: panel padding, generous gaps
  5:  20,    // relaxed: card padding, section separation
  6:  24,    // spacious: panel headers, major separation
  7:  32,    // generous: modal padding, hero spacing
  8:  48,    // dramatic: empty state, canvas clearance
} as const;

// ══════════════════════════════════════════════════════════════
// BORDER RADIUS (simplified from current 10-value chaos)
// ══════════════════════════════════════════════════════════════

export const radius = {
  sm:   6,      // buttons, badges, inputs, menu items
  md:   10,     // dropdowns, toolbars, floating inputs
  lg:   14,     // floating panels, session pill
  xl:   18,     // modals, overlays
  pill:  9999,  // status dots, pills, fully rounded
} as const;

// ══════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════════════════════════════

export const font = {
  family: {
    sans: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'Inconsolata', monospace",
  },
  size: {
    nano:    8,    // badges, counts
    micro:   9,    // section headers (uppercase), shortcuts
    caption: 10,   // timestamps, metadata
    label:   11,   // section labels, secondary info
    body:    13,   // body text, inputs, default
    title:   16,   // panel headers, mode indicators
    display: 20,   // empty state headings, session names
  },
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
  lineHeight: {
    tight:   1.25,
    normal:  1.5,
    relaxed: 1.65,
  },
  tracking: {
    tight:   '-0.01em',
    normal:  '0',
    wide:    '0.06em',
    caps:    '0.08em',   // for uppercase micro text
  },
} as const;

// ══════════════════════════════════════════════════════════════
// MOTION
// ══════════════════════════════════════════════════════════════

export const duration = {
  instant:  100,  // hover states, micro-feedback
  fast:     150,  // button press, icon transitions
  normal:   250,  // panel slides, transforms
  slow:     400,  // overlay fades, major transitions
  dramatic: 600,  // empty state fade, first-run animations
} as const;

export const easing = {
  snap:    'cubic-bezier(0.16, 1, 0.3, 1)',      // primary -- spring-loaded
  smooth:  'cubic-bezier(0.4, 0, 0.2, 1)',       // material standard
  bounce:  'cubic-bezier(0.34, 1.56, 0.64, 1)',  // playful overshoot
  linear:  'linear',                               // progress bars, continuous
} as const;

// ══════════════════════════════════════════════════════════════
// Z-INDEX (unchanged -- the current stack is correct)
// ══════════════════════════════════════════════════════════════

export const zIndex = {
  canvas:       0,
  nodes:        10,
  edges:        5,
  selection:    15,
  statusBar:    40,
  floatingUI:   50,
  memoryShelf:  55,
  inspector:    60,
  timeline:     70,
  pill:         80,
  pathTrace:    90,
  popover:     100,
  contextMenu: 200,
  overlay:     300,
  toast:       400,
} as const;
```

---

## Part IV: Migration Path

### Phase 1 -- Foundation (no visual changes)

Create the new token file alongside the existing `theme.ts`. Map every existing export to its new location. Export backward-compatible aliases:

```typescript
// theme.ts -- backward compatibility layer
import { gray, surface, text, border, shadow, ... } from './tokens';

// Legacy aliases (deprecate over time)
export const E = {
  0: gray[1],
  1: gray[2],
  2: gray[4],
  3: gray[5],
  4: gray[6],
  5: gray[8],
  6: gray[9],
  7: gray[11],
};

export const T = {
  primary:   text.primary,
  secondary: text.secondary,
  tertiary:  text.tertiary,
  subtle:    text.muted,
  ghost:     text.ghost,
  dim:       text.dim,
  invisible: text.invisible,
};
```

### Phase 2 -- CSS Variable Integration

Export the semantic tier as CSS custom properties in `globals.css`. This enables runtime theming and DevTools inspection:

```css
:root {
  /* Surfaces */
  --surface-void:    #080706;
  --surface-canvas:  #0C0B09;
  --surface-sunken:  #100F0C;
  --surface-default: #1A1816;
  --surface-raised:  #1E1C19;
  --surface-overlay: #232120;

  /* Text */
  --text-emphasis:   #E8E6E4;
  --text-primary:    #D0CDCA;
  --text-secondary:  #A8A5A0;
  --text-tertiary:   #807D78;
  --text-muted:      #605D58;
  --text-ghost:      #3D3A35;
  --text-dim:        #2C2A26;

  /* Borders */
  --border-subtle:   #252320;
  --border-default:  #2C2A26;
  --border-strong:   #3D3A35;

  /* Accent */
  --accent:          #DD0000;

  /* Shadows */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.25);
  --shadow-md:  0 2px 8px -1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg:  0 4px 16px -2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3);
  --shadow-xl:  0 8px 32px -4px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.35);

  /* Interactive */
  --hover:     rgba(255,255,255,0.06);
  --active:    rgba(255,255,255,0.08);
  --selected:  rgba(255,255,255,0.10);
}
```

### Phase 3 -- Component Migration

Migrate components one at a time from legacy `E[4]` / `T.secondary` references to semantic tokens (`surface.default.bg` / `text.secondary`). Each migration is a small PR that can be reviewed independently.

Priority order (by usage frequency in codebase):
1. Glass surfaces (InputBar, Inspector, Timeline, ContextMenu)
2. Text colors (all components)
3. Interactive states (all hover/active/disabled handlers)
4. Borders (all structural dividers)
5. Shadows (all elevated elements)
6. Canvas-specific tokens (GraphCanvas, node rendering, edge rendering)

### Phase 4 -- OKLCH Migration (Future)

Once the semantic tier is stable, migrate the primitive gray scale from hex to OKLCH. This enables algorithmic theme generation (Linear's approach):

```typescript
// Future: OKLCH primitives
export const gray = {
  0:  'oklch(0.03 0.004 70)',   // warm void
  1:  'oklch(0.05 0.004 70)',
  2:  'oklch(0.08 0.004 70)',
  // ...
  17: 'oklch(0.92 0.004 70)',   // emphasis text
} as const;
```

The hue angle `70` (amber) and chroma `0.004` (barely perceptible warmth) encode the Bumba-Dark warm-black identity into the color space itself. Adjusting just the lightness channel generates new elevation levels that are perceptually uniform and tonally consistent.

---

## Part V: What Makes This Different

Standard design systems solve for form-based UI: cards, lists, buttons, inputs. Dreamcatcher is a spatial canvas application. The token architecture must account for:

1. **Composable transparency.** Nodes overlap edges. Edges cross other edges. Glass panels float over nodes. The alpha scale and transparent surface variants make this work without visual artifacts.

2. **Material depth on canvas objects.** Nodes are not flat rectangles. They are dimensional specimens with radial gradients, specular highlights, and drop shadows. The `nodeMaterial` token block encodes this as structured data, not inline SVG values scattered across components.

3. **Spatial state tokens.** Selection, streaming, connection-in-progress, hover proximity -- these are spatial concepts with no equivalent in a form-based system. The `selection`, `streaming`, `edge`, and `canvas` token blocks exist for this reason.

4. **Atmosphere as a first-class concept.** The canvas vignette, ambient glow, and faction tints are not decorative -- they communicate spatial context (what is nearby, what is active, what is generating). These need tokens, not hardcoded gradient strings.

5. **Per-object material systems.** User nodes and AI nodes have different physical metaphors (polished stone vs. glass vessel). The `nodeMaterial` structure allows each to be fully specified without polluting the general-purpose token system.

The recommendation is to build Tiers 1, 2, and 2.5 as a single `tokens.ts` file, export backward-compatible aliases from the existing `theme.ts`, and migrate components incrementally. The canvas-specific layer (Tier 2.5) is what will make Dreamcatcher's token system unlike anything published -- every other system stops at buttons and cards.

---

## Sources

- [Radix Colors -- Understanding the Scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Radix Colors -- Scales](https://www.radix-ui.com/colors/docs/palette-composition/scales)
- [Radix Themes -- Color](https://www.radix-ui.com/themes/docs/theme/color)
- [Radix Themes -- Dark Mode](https://www.radix-ui.com/themes/docs/theme/dark-mode)
- [GitHub Primer -- Color Usage](https://primer.style/product/getting-started/foundations/color-usage/)
- [Primer Primitives -- Colors](https://primer.style/primitives/colors/)
- [Primer -- UI Color System](https://primer.style/foundations/color/overview/)
- [GitHub Blog -- Inclusive Design with Primer Color System](https://github.blog/engineering/user-experience/unlocking-inclusive-design-how-primers-color-system-is-making-github-com-more-inclusive/)
- [shadcn/ui -- Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui -- Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Tailwind CSS -- Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS 4 @theme -- Design Tokens Guide](https://medium.com/@sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06)
- [Design Tokens That Scale in 2026 (Tailwind v4 + CSS Variables)](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)
- [Vercel Geist -- Colors](https://vercel.com/geist/colors)
- [Vercel Geist -- Introduction](https://vercel.com/geist/introduction)
- [Linear -- How We Redesigned the Linear UI (Part II)](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Andreas Eldh on Linear Theme Generation](https://x.com/eldh/status/1773462909185597617)
- [Material Design 3 -- Color Roles](https://m3.material.io/styles/color/roles)
- [Material Design 3 -- Tone-based Surface Colors](https://m3.material.io/blog/tone-based-surface-color-m3/)
- [Material Design 3 -- Design Tokens](https://m3.material.io/foundations/design-tokens)
- [Material Design 3 -- States](https://m3.material.io/foundations/interaction/states/applying-states)
- [Ant Design -- Customize Theme](https://ant.design/docs/react/customize-theme/)
- [Atlassian Design -- Elevation](https://atlassian.design/foundations/elevation/)
- [Atlassian Design -- Design Tokens](https://atlassian.design/foundations/tokens/design-tokens/)
- [Open Props](https://open-props.style/)
- [Open Props -- GitHub](https://github.com/argyleink/open-props)
- [Style Dictionary -- Dark Mode](https://dbanks.design/blog/dark-mode-with-style-dictionary/)
- [Style Dictionary -- GitHub](https://github.com/dbanksdesign/style-dictionary-dark-mode)
- [Figma -- Guide to Variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Figma -- Modes for Variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)
- [Design System Mastery with Figma Variables 2025-2026](https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66)
- [Martin Fowler -- Design Token-Based UI Architecture](https://martinfowler.com/articles/design-token-based-ui-architecture.html)
- [Nathan Curtis -- Naming Tokens in Design Systems](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676)
- [Smashing Magazine -- Naming Best Practices](https://www.smashingmagazine.com/2024/05/naming-best-practices/)
- [Brad Frost -- The Many Faces of Themeable Design Systems](https://bradfrost.com/blog/post/the-many-faces-of-themeable-design-systems/)
- [Evil Martians -- OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [Shadows in UI Design -- Tips and Best Practices](https://blog.logrocket.com/ux-design/shadows-ui-design-tips-best-practices/)
- [Color Tokens Guide to Light and Dark Modes](https://medium.com/design-bootcamp/color-tokens-guide-to-light-and-dark-modes-in-design-systems-146ab33023ac)
- [Carbon Design System -- Color](https://carbondesignsystem.com/elements/color/overview/)
- [Tokens Studio -- Revolutionising Design Systems](https://tokens.studio/blog/revolutionising-design-systems-the-future-of-ui-design-using-graphs-node-based-design)
