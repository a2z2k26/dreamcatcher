# Dark UI Patterns for Spatial Graph Interfaces

Technical pattern reference for premium dark-mode interface design. Each pattern includes what it solves, how to implement it, who does it well, how it applies to Dreamcatcher's spatial graph canvas, and where the gotchas hide.

Organized into six categories: Surface, Typography, Color, Depth, Motion, Interaction.

---

## SURFACE

### 1. Warm Black Foundation

**What it solves.** Cool-blue dark modes (#0A0A0F) feel clinical and sterile. Warm blacks create an organic, inhabited atmosphere that reads as "technology with soul" rather than "developer tool in dark mode."

**Implementation.**
```css
:root {
  --surface-void:   #080706;   /* deepest layer */
  --surface-ground: #0C0B09;   /* canvas base */
  --surface-recess: #13120F;   /* recessed panels */
  --surface-panel:  #1A1816;   /* floating surfaces */
}
```
The trick is in the undertone. Shift the blue channel 2-5 points below the red channel at every elevation stop. `#121212` (Material's neutral) reads colder than `#13120F` (warm-shifted) even though the luminance is identical. The human eye detects this at the periphery even when it can't name it.

**Who does this well.** Warp terminal, Arc Browser dark theme, Linear's sidebar. Figma uses `#1E1E1E` (neutral), YouTube uses `#181818` (neutral), Slack uses `#1D1D1D` (neutral) -- all functional but none warm. The warmth is a differentiator.

**Dreamcatcher application.** The eight-stop warm elevation stack (E[0] #080706 through E[7] #3D3A35) is the substrate the entire canvas lives on. Every node, edge, and panel inherits this warmth. The canvas ground plane at E[1] #0C0B09 should feel like looking into a warm dark room, not at a cold screen.

**Gotchas.** Warm undertone is subtle in isolation but compounds across large surfaces. Test on multiple monitors -- some displays shift warm further toward yellow. IPS panels and OLED render warm blacks differently; OLED's true black pixels will create a visible boundary at E[0] that LCD panels smooth over.

---

### 2. Elevation Through Luminance (Not Shadow)

**What it solves.** On dark backgrounds, box-shadow is nearly invisible -- a dark shadow on a dark surface has no contrast. Material Design's dark theme solves this by making higher surfaces lighter, simulating proximity to an overhead light source.

**Implementation.**
```css
/* Surface layer mapping: higher = lighter */
--elevation-0: #080706;   /* ground */
--elevation-1: #0C0B09;   /* canvas */
--elevation-2: #13120F;   /* recessed card */
--elevation-3: #1A1816;   /* panel */
--elevation-4: #1E1C19;   /* floating input */
--elevation-5: #252320;   /* dropdown menu */

/* Material's overlay technique: tint surfaces with semi-transparent primary */
.elevated-surface {
  background: color-mix(in oklch, var(--surface-base) 94%, var(--color-primary) 6%);
}
```
Each elevation step adds ~6-8 lightness points in the 0-15% luminance range where the eye is most sensitive. The result is continuous perceived depth using flat color alone.

**Who does this well.** Material Design 3 defines six elevation levels (level0 through level5) with increasing primary-color tint overlays. Linear achieves perceived lift on issue cards through a two-step luminance jump between sidebar and card surface.

**Dreamcatcher application.** Canvas (E[1]) is the ground. Nodes float at E[3]-E[4]. Panels float at E[3]-E[6]. The inspector sits at E[0] -- the deepest level -- because it's a permanent fixture anchored to the frame, not a floating object. This inversion (permanent UI = darker, transient UI = lighter) is deliberate and rare.

**Gotchas.** Keep to 4-6 meaningfully distinct elevation layers in practice. More than 8 and the differences become imperceptible. The eye can distinguish ~3% luminance differences in the dark range, so steps smaller than that are wasted.

---

### 3. Noise Texture Overlay (Grain)

**What it solves.** Large dark surfaces look digital and dead. Subtle noise adds organic texture -- the visual equivalent of the grain in film photography or the micro-texture on expensive matte surfaces. It breaks the banding that appears in dark gradients on 8-bit displays.

**Implementation.**
```html
<!-- SVG noise filter definition -->
<svg style="position:absolute;width:0;height:0">
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
</svg>
```
```css
.canvas-substrate::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,..."); /* inline SVG noise */
  opacity: 0.03;                             /* barely visible */
  mix-blend-mode: overlay;
  pointer-events: none;
}
```
Key attributes: `baseFrequency` controls grain size (0.5-0.8 for fine film grain), `numOctaves` controls detail layers (3 is the sweet spot -- 4+ adds GPU cost without visible benefit), `type="fractalNoise"` for smooth organic grain vs `turbulence` for rippled water.

**Who does this well.** Vercel's landing page uses an extremely subtle noise layer on their dark hero sections. Stripe's dark gradients use noise to prevent banding. Apple's macOS wallpapers layer noise to maintain quality at any resolution.

**Dreamcatcher application.** Apply at 0.03 opacity to the canvas ground plane (E[1]) and at 0.02 to floating panels. This creates the "petri dish under glass" organic substrate described in the design direction. The grain should be invisible at a glance but felt as warmth and texture on prolonged viewing.

**Gotchas.** The SVG filter is computed per-pixel. On a 4K display, a full-viewport noise layer hits millions of pixels. Pre-render the noise to a static PNG tile (256x256 or 512x512) and use `background-repeat: repeat` for production. The SVG filter approach is great for prototyping but costs 2-5ms per frame on mid-range GPUs if animated. Also: `mix-blend-mode: overlay` on dark backgrounds brightens the noise; `multiply` would darken it (wrong). Test both.

---

### 4. Vignette (Radial Edge Darkening)

**What it solves.** A flat dark canvas has no focal point. A vignette -- darkening at the edges, lighter at the center -- creates a natural spotlight effect that draws the eye to the center of the workspace. It also hides the hard edges of the viewport.

**Implementation.**
```css
.canvas-vignette {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    transparent 40%,
    rgba(8, 7, 6, 0.4) 100%
  );
  pointer-events: none;
  z-index: 1; /* above canvas, below UI */
}
```
Control intensity through the transparent stop position (40% = tight spotlight, 60% = gentle fade) and the end opacity (0.2 = subtle, 0.6 = dramatic). Use `ellipse` for widescreen-aware falloff.

**Who does this well.** Figma's canvas has an extremely subtle vignette on their dark theme. Unity and Unreal editors use vignettes in their viewport previews. Most photography editing apps apply this to their workspace.

**Dreamcatcher application.** This is the "observing through a microscope" effect. The vignette should be subtle (0.3-0.4 end opacity) and should NOT follow the camera -- it's fixed to the viewport, so as the user pans the canvas, nodes appear to move through a pool of light. This creates the sense that the user is peering through an instrument at a living system.

**Gotchas.** The vignette must be `pointer-events: none` or it will block all interaction. It must sit above the canvas but below all interactive UI. On ultra-wide monitors (3440px+), the vignette can feel exaggerated -- consider clamping the gradient's aspect ratio or reducing opacity at wider viewport widths using `clamp()` or a media query.

---

### 5. Dot Grid Substrate

**What it solves.** A blank dark canvas has no sense of scale, distance, or coordinate system. A subtle dot grid provides spatial reference, communicates that the canvas is pannable/zoomable, and creates the precision-instrument aesthetic.

**Implementation.**
```css
/* CSS-only approach (best performance) */
.canvas-grid {
  background-image: radial-gradient(
    circle at center,
    var(--grid-dot-color, #252320) 1px,
    transparent 1px
  );
  background-size: 24px 24px; /* grid spacing */
  background-position: calc(var(--cam-x) * 1px) calc(var(--cam-y) * 1px);
}

/* SVG pattern approach (more control) */
<pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="12" cy="12" r="0.75" fill="#252320"/>
</pattern>
```
The CSS approach uses `background-position` driven by camera transform variables for panning. The SVG approach lives inside the canvas SVG itself and transforms with the camera matrix.

For zoom-responsive grids (dots appear/disappear at different zoom levels), use a shader-based approach with SDF (Signed Distance Field) circles via `fract()` to determine grid repetition at any scale.

**Who does this well.** React Flow / xyflow has a built-in dot grid background. Figma's canvas grid is the gold standard -- dots appear/disappear at different zoom levels with smooth opacity transitions. Obsidian Canvas uses a light crosshair grid.

**Dreamcatcher application.** Dot grid at E[5] color (#252320), r=0.75, 24px spacing. At low zoom, show major dots every 120px at slightly higher opacity. At extreme zoom-out, fade all dots to prevent visual noise. The grid dots should feel like the substrate of a petri dish -- not an engineering grid, but an organic matrix.

**Gotchas.** The CSS `radial-gradient` approach is O(1) per frame regardless of viewport size -- highly performant. The SVG pattern approach requires the pattern to transform with the camera, and at extreme zoom levels, thousands of pattern tiles can stress the SVG renderer. React Flow handles this with dynamic pattern size recalculation. At zoom < 0.3, hide the grid entirely to avoid moire patterns.

---

### 6. Directional Border Treatment

**What it solves.** Uniform borders around dark-mode panels look flat and artificial. Real physical objects under overhead lighting have a brighter top edge and a darker bottom edge. Directional borders create the illusion of a physical light source.

**Implementation.**
```css
.panel {
  /* Top border: lighter (catches light) */
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  /* Side borders: medium */
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  /* Bottom border: darkest (in shadow) */
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
}

/* Alternative: single border with gradient */
.panel-alt {
  border: 1px solid transparent;
  background-clip: padding-box;
  background-image:
    linear-gradient(var(--surface-panel), var(--surface-panel)),
    linear-gradient(
      180deg,
      rgba(255,255,255,0.08) 0%,
      rgba(255,255,255,0.03) 50%,
      rgba(0,0,0,0.1) 100%
    );
  background-origin: border-box;
}
```

**Who does this well.** Raycast's floating panels have visibly brighter top edges. Arc Browser's tab bar uses directional borders to separate it from the content area. Linear's command palette has a subtle top-bright treatment.

**Dreamcatcher application.** Every floating panel (inspector, context menus, dialogs) should use directional borders. The top edge gets `rgba(255,255,255,0.06-0.08)`, the bottom gets `rgba(0,0,0,0.15-0.2)`. This matches the overhead light model implied by the node shadow direction (shadows fall downward). Consistency of light direction is critical -- if borders say "light from above" but shadows say "light from left," the illusion breaks.

**Gotchas.** The gradient border technique using `background-clip` is elegant but doesn't work with `border-radius` in all browsers unless you also set `background-origin: border-box`. Test in Safari, which has historically been inconsistent with gradient borders. An alternative is using `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08)` for the top highlight, which is universally supported.

---

### 7. Gradient Separator (Fade-Out Dividers)

**What it solves.** Hard 1px divider lines spanning full width look like scars across the interface. Gradient dividers that fade out at both ends feel softer, more natural, and less disruptive to reading flow.

**Implementation.**
```css
.divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--border-color, #252320) 20%,
    var(--border-color, #252320) 80%,
    transparent 100%
  );
}

/* Pseudo-element version (no extra markup) */
.section + .section::before {
  content: '';
  display: block;
  height: 1px;
  margin: 16px 24px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255,255,255,0.06) 30%,
    rgba(255,255,255,0.06) 70%,
    transparent
  );
}
```

**Who does this well.** Linear's settings panels use gradient dividers between sections. Apple Music's sidebar uses them between grouped items. Notion's dark mode uses extremely subtle gradient separators between blocks.

**Dreamcatcher application.** Use in the inspector panel between sections (metadata, context, tool calls), in the session sidebar between session groups, and in dropdown menus between option groups. The fade-out creates breathing room that matches the observatory aesthetic -- precision instruments don't have visible seams.

**Gotchas.** Gradient dividers rendered at 1px on non-retina displays can appear to flicker or alias. Use `min-height: 1px` and consider a 0.5px shadow approach for sub-pixel rendering on retina: `box-shadow: 0 0.5px 0 rgba(255,255,255,0.06)`.

---

## TYPOGRAPHY

### 8. Font Smoothing for Light-on-Dark

**What it solves.** On macOS, the default subpixel antialiasing makes light text on dark backgrounds appear bolder/thicker than intended. This "weight gain" makes body text feel heavy and headings feel bloated. Antialiased rendering produces crisper, more accurate weight.

**Implementation.**
```css
/* Apply globally on dark themes */
[data-theme="dark"] {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```
This disables subpixel rendering on macOS. The result: light text renders at its actual designed weight. A 400-weight font looks like 400, not 500.

**Who does this well.** Every premium dark-mode product uses this: Linear, Raycast, Vercel, Arc, Warp, Figma. It's table stakes for dark mode but still commonly omitted.

**Dreamcatcher application.** Apply globally. Dreamcatcher uses Inconsolata, a monospace font with thin strokes at regular weight. Without antialiased rendering on macOS, the 400-weight body text will appear ~500 weight, losing the precision-instrument lightness the design requires.

**Gotchas.** This is macOS only. `-webkit-font-smoothing` has no effect on Windows, Linux, iOS, or Android. Firefox 128+ supports it natively (previously required `-moz-osx-font-smoothing`). Do not use `subpixel-antialiased` on dark backgrounds -- it will exaggerate the boldness problem. On Windows, font rendering is controlled by ClearType, which has its own quirks but doesn't suffer from the same bold shift.

---

### 9. Luminance-Based Text Hierarchy

**What it solves.** Using color (blue links, red errors, green success) as the primary hierarchy signal in dark mode creates visual noise and accessibility risk. Luminance hierarchy -- importance equals brightness -- is legible, elegant, and survives color-blindness.

**Implementation.**
```css
:root {
  --text-primary:   #E1E1E1;  /* ~88% luminance — headings, active items */
  --text-secondary: #C8C8C8;  /* ~78% luminance — body text */
  --text-tertiary:  #A8A8A8;  /* ~66% luminance — labels, metadata */
  --text-subtle:    #808080;  /* ~50% luminance — deemphasized */
  --text-ghost:     #606060;  /* ~38% luminance — section headers, shortcuts */
  --text-dim:       #404040;  /* ~25% luminance — nearly invisible, badges */
}
```
Six levels. Each step reduces luminance by 10-13 percentage points. The jump from primary to secondary (10 points) is smaller than secondary to tertiary (12 points) -- this is intentional, because body text needs to feel close to headings in readability while still being visually subordinate.

**Who does this well.** Linear is the gold standard: three luminance levels, no decorative color in body text. Raycast uses four levels. Both prove that monochrome text hierarchy feels more premium than chromatic hierarchy.

**Dreamcatcher application.** Node labels use T.primary when selected, T.secondary at rest. Edge labels use T.subtle. Panel section headers use T.ghost (uppercased, letter-spaced). Timestamps and metadata use T.dim. Color enters the text layer only for the single-accent red (#DD0000) on active/attention states -- and nowhere else.

**Gotchas.** WCAG 2.1 requires 4.5:1 contrast ratio for normal text. Against E[1] #0C0B09 (canvas background, ~3% luminance): T.primary #E1E1E1 achieves ~14:1 (passes AAA), T.secondary #C8C8C8 achieves ~11:1 (passes AAA), T.tertiary #A8A8A8 achieves ~7.5:1 (passes AAA), T.subtle #808080 achieves ~4:1 (fails AA for small text). T.ghost and T.dim are intended for decorative/supplementary text only and should never carry essential meaning alone. If essential, pair with an icon or structural cue.

---

### 10. APCA-Aware Contrast (Beyond WCAG 2.x)

**What it solves.** WCAG 2.x contrast ratios are mathematically broken for dark mode. They overshoot contrast for dark-on-dark and undershoot it for light-on-dark. A pair can pass WCAG 4.5:1 but be functionally unreadable when one color is near black. APCA (Advanced Perceptual Contrast Algorithm) fixes this by accounting for polarity (light text on dark vs dark text on light), luminance context, and font weight/size.

**Implementation.**
```
APCA Lc (Lightness Contrast) targets:
  Lc 90+   — Body text, 16px, 400 weight
  Lc 75    — Large or bold text (18px+ or 16px 700)
  Lc 60    — Non-text elements, icons, borders
  Lc 45    — Supplementary text, placeholders
  Lc 30    — Decorative elements only
```
Tools: apcacontrast.com (calculator), oklch.com (color space visualization), Stark plugin for Figma.

APCA uses the OKLCH color space internally, which maintains perceptual uniformity -- Lc 60 reads as the same perceived contrast regardless of hue, unlike WCAG's sRGB-based ratio.

**Who does this well.** Chrome DevTools has experimental APCA support. Adobe is adopting APCA for Spectrum 2. The W3C Silver task force is developing APCA as the contrast model for WCAG 3.0.

**Dreamcatcher application.** Validate every text/background pair against APCA, not just WCAG. Specifically: T.ghost (#606060) on E[1] (#0C0B09) likely falls below Lc 45 and should be restricted to uppercase section headers at 600+ weight and 9px+ where the heavier weight compensates for low contrast. T.dim (#404040) on E[1] fails even Lc 30 -- acceptable only for non-essential decorative elements with structural alternatives.

**Gotchas.** APCA is not yet an official WCAG standard. It's the leading candidate for WCAG 3.0 but hasn't been finalized. For compliance, you still need to meet WCAG 2.1 AA. Use APCA as a design quality check on top of WCAG 2.x compliance, not as a replacement.

---

### 11. Tight Type Scale for Tool-Dense UI

**What it solves.** Traditional type scales (1.25 ratio, 1.333 perfect fourth) create size jumps that waste space in information-dense panels, sidebars, and floating UIs. A tighter scale (1.07-1.1 ratio) produces meaningful differentiation at every level without any size feeling oversized for its context.

**Implementation.**
```css
/* Dreamcatcher's 7-step tight scale */
--type-display:    14px;  /* hero text, input focused */
--type-body:       13px;  /* body text */
--type-body-small: 12px;  /* inspector body, menus */
--type-label:      11px;  /* session names, role labels */
--type-caption:    10px;  /* timestamps, metadata */
--type-micro:       9px;  /* section headers (uppercase) */
--type-nano:        8px;  /* badges, tool call labels */
```
All line-heights land on 4px increments (20px, 16px, 12px). This creates vertical rhythm across nested panels without explicit grid math.

**Who does this well.** Raycast spans 11px to 15px across its entire UI. Linear keeps most text between 12px and 14px. Both prove that tight scales can feel premium when spacing and weight do the hierarchy work.

**Dreamcatcher application.** The 14px display text is the maximum -- nothing in the canvas UI should be larger. Nodes, panels, and menus all live within this 8-14px range. Hierarchy comes from weight (400 vs 600), opacity (T.primary vs T.subtle), and letter-spacing (0 vs 0.8px) rather than large size jumps. The monospace font (Inconsolata) reinforces this: every size is legible because the characters are designed for terminal-density reading.

**Gotchas.** At 8-9px, font rendering quality varies wildly across platforms. Windows ClearType handles 9px monospace well; macOS antialiasing can make 8px text slightly blurry. Test T.micro and T.nano on both platforms. If 8px is illegible on macOS, bump T.nano to 9px and differentiate through weight alone.

---

## COLOR

### 12. The 60-30-10 Rule for Dark Palettes

**What it solves.** Without a color budget, dark interfaces either look monochrome (all one shade of gray) or chaotic (accent colors everywhere). The 60-30-10 rule provides a simple allocation: 60% dominant surface, 30% supporting surfaces, 10% accent.

**Implementation.**
```
60% — Canvas and panel backgrounds (E[0]-E[3])
       The warm black substrate. This IS the interface.

30% — Secondary surfaces and borders (E[4]-E[7])
       Elevated cards, input fields, hover states, grid dots.
       Creates the layered depth within the dark base.

10% — Accent and semantic color (DD0000, status colors)
       Active states, selection indicators, error states.
       Must feel rare and precious — every instance earns attention.
```

**Who does this well.** Vercel achieves extreme brand recognition with a single white accent on dark gray. Linear uses their purple (#5E6AD2) at well under 10% -- just the sidebar icon and selected state. Both prove that restraint amplifies impact.

**Dreamcatcher application.** The single accent is DD0000 (active red). It appears only on: active recording pulse, unread indicators, error states, and the primary CTA in confirmation dialogs. Everything else is achromatic. If a new feature needs "color," it gets a luminance change (brighter/dimmer) rather than a hue.

**Gotchas.** The 10% feels like less than you think when designing -- it's roughly one accent-colored element per viewport. The temptation is to add "just one more" accent color for a new state. Resist. Each additional accent color halves the visual weight of every existing one.

---

### 13. Color Desaturation for Dark Backgrounds

**What it solves.** Saturated colors on dark backgrounds create optical vibration -- a visual buzzing effect where the color appears to bleed or pulse at its edges. This causes eye strain and makes text unreadable. Desaturated (pastel) versions of the same hues are legible and comfortable.

**Implementation.**
```css
/* Saturated — problematic on dark backgrounds */
--error-saturated: oklch(0.63 0.26 29);     /* vivid red */

/* Desaturated — comfortable on dark backgrounds */
--error-desaturated: oklch(0.63 0.16 29);   /* muted red, same lightness */

/* Rule of thumb: reduce chroma by ~40% for dark mode variants */
/* In OKLCH: keep L (lightness) and H (hue) the same, lower C (chroma) */

/* Automated approach using color-mix */
--error-dark-mode: color-mix(in oklch, var(--error-saturated) 60%, gray);
```
Material Design recommends approximately 20 points lower saturation on dark mode than light mode. The OKLCH color space is ideal for this because chroma (saturation) is a separate, perceptually uniform axis -- reducing C by 0.1 produces the same perceived desaturation regardless of hue.

**Who does this well.** Material Design 3 systematically desaturates all semantic colors for dark mode. GitHub uses distinctly pastel syntax highlighting colors in dark mode. Figma shifts their brand purple lighter and less saturated for dark surfaces.

**Dreamcatcher application.** The DD0000 accent red should be validated for optical vibration against E[1] #0C0B09. In OKLCH, DD0000 is approximately `oklch(0.54 0.24 27)`. For comfortable dark-mode use, consider shifting to `oklch(0.58 0.18 27)` (lighter, less saturated) -- this would be approximately #E44545. Test both at 14px and 9px on the canvas background.

**Gotchas.** `color-mix()` in OKLCH has ~95% browser support (2025+). Older Safari versions need fallback hex values. Always define both: `color: #E44545; color: color-mix(in oklch, #DD0000 60%, gray);` The second declaration overrides the first where supported.

---

### 14. OKLCH-Based Palette Generation

**What it solves.** Generating a dark-mode color palette in sRGB or HSL produces uneven perceptual steps -- two colors with the same HSL lightness can look dramatically different in brightness. OKLCH maintains perceptual uniformity: equal numeric differences produce equal visual differences.

**Implementation.**
```css
:root {
  /* Define base brand color in OKLCH */
  --brand: oklch(0.55 0.18 27);  /* warm red */

  /* Generate full palette by adjusting L (lightness) */
  --brand-50:  oklch(0.97 0.02 27);  /* nearly white */
  --brand-100: oklch(0.90 0.05 27);
  --brand-200: oklch(0.80 0.10 27);
  --brand-300: oklch(0.70 0.14 27);
  --brand-400: oklch(0.60 0.17 27);
  --brand-500: oklch(0.55 0.18 27);  /* base */
  --brand-600: oklch(0.45 0.16 27);
  --brand-700: oklch(0.35 0.13 27);
  --brand-800: oklch(0.25 0.09 27);
  --brand-900: oklch(0.15 0.05 27);  /* nearly black */

  /* Semantic aliases for dark mode */
  --brand-on-dark:     var(--brand-300);  /* for text on dark bg */
  --brand-surface-dark: var(--brand-900); /* for tinted surfaces */
}
```
The key insight: in OKLCH, reducing L linearly produces linearly darker shades. In HSL, the same operation produces non-linear perceptual darkening.

**Who does this well.** Radix Colors and Tailwind v4 both generate scales in OKLCH. Dopely Colors' dark mode generator uses perceptual luminosity shifts.

**Dreamcatcher application.** If Dreamcatcher ever needs a semantic palette (branching colors, agent type indicators, confidence levels), generate it in OKLCH with chroma capped at 0.12 for dark mode usage. This keeps any future color additions harmonious with the warm achromatic base.

**Gotchas.** OKLCH can produce out-of-gamut colors (displayable by P3 wide-gamut screens but not sRGB). Always clamp to sRGB for web: `oklch(0.7 0.2 27)` is in gamut, but `oklch(0.7 0.3 27)` might not be. Use `color(display-p3 ...)` with `@supports` for wide-gamut displays and provide sRGB fallbacks.

---

### 15. Single-Accent Discipline

**What it solves.** Multi-color accent systems in dark mode create cognitive load -- the user must learn what each color means. A single accent color used with extreme restraint creates stronger brand recognition and clearer signaling: if it's colored, it matters.

**Implementation.**
```css
:root {
  --accent: #DD0000;
  --accent-hover: color-mix(in oklch, var(--accent) 85%, white);
  --accent-muted: color-mix(in oklch, var(--accent) 30%, var(--surface-ground));
  --accent-subtle: color-mix(in oklch, var(--accent) 10%, var(--surface-ground));
}

/* Usage is strictly budgeted */
.recording-pulse { color: var(--accent); }
.unread-dot { background: var(--accent); }
.error-text { color: var(--accent); }
.cta-primary { background: var(--accent); }
/* That's it. Four use cases. */
```

**Who does this well.** Vercel uses white as their only accent on black. Raycast uses a single teal. Linear uses a single purple. All three are immediately recognizable from a screenshot because the accent is so rare it becomes a fingerprint.

**Dreamcatcher application.** DD0000 red. Used for: recording state, unread indicators, error states, primary CTAs. That's the complete list. If a new feature "needs color," first ask: can this be solved with luminance (brighter hover state), weight (bold label), or iconography instead?

**Gotchas.** The hardest part of single-accent discipline is maintaining it over time. Every new feature wants its own color. Document the accent budget in the design system and require explicit approval to add any new colored element. The moment you have two accent colors, you have a color system to maintain. The moment you have five, nobody remembers what any of them mean.

---

## DEPTH

### 16. Layered Box-Shadow for Physical Presence

**What it solves.** A single `box-shadow` produces a flat, artificial shadow. Real objects cast multiple shadow layers: a tight, sharp shadow close to the surface (key shadow) and a soft, diffuse shadow at distance (ambient shadow). Layering produces perceived physical presence even on dark backgrounds.

**Implementation.**
```css
/* Light elevation (cards, nodes at rest) */
.elevation-1 {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

/* Medium elevation (floating panels, active nodes) */
.elevation-2 {
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.4),
    0 8px 24px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.06);
}

/* High elevation (modals, context menus) */
.elevation-3 {
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.5),
    0 16px 48px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}
```
Pattern: first shadow is the key (tight offset, small blur, higher opacity), second is the ambient (large offset, large blur, lower opacity), third is a 1px inset ring of light that makes the element visible against the dark background.

**Who does this well.** Josh W. Comeau's shadow layering technique: each layer doubles the offset and blur while reducing opacity. The result mimics real light falloff. Linear's command palette uses a three-layer shadow stack. Raycast's result cards use key + ambient with a subtle light ring.

**Dreamcatcher application.** Nodes on the canvas need shadows tuned to SVG, not CSS. Use `filter: drop-shadow()` stacked on the node group element rather than `box-shadow`:
```html
<g filter="url(#node-shadow)">
  <filter id="node-shadow">
    <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
    <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#080706" flood-opacity="0.6"/>
  </filter>
</g>
```
This creates the "floating specimen" effect described in the design direction.

**Gotchas.** Two to five shadow layers per element is the practical limit. Beyond five, the rendering cost increases linearly with no perceptible visual improvement. On mobile, shadow rendering is one of the most expensive CSS operations -- test on a mid-range Android device. SVG `filter: drop-shadow()` is more expensive than CSS `box-shadow` because it respects the alpha channel; avoid applying it to large complex SVG groups.

---

### 17. Inner Glow (Inset Light Ring)

**What it solves.** On dark backgrounds, the edges of dark elements disappear into the background. An inset light ring -- a very subtle white glow inside the element's border -- makes the element boundary visible without a hard border, creating a "glass edge" effect.

**Implementation.**
```css
.glass-panel {
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.06),   /* outer ring */
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08),      /* top highlight */
    0 2px 8px rgba(0, 0, 0, 0.3),                     /* external shadow */
    0 8px 24px rgba(0, 0, 0, 0.2);                    /* ambient shadow */
}

/* For SVG elements (nodes) */
<circle r="20" fill="url(#node-fill)"
        stroke="rgba(255,255,255,0.06)"
        stroke-width="0.5"/>
```
The inset ring at 0.06-0.08 white opacity is barely visible in isolation but creates a cumulative sense of "glass edges" across the interface. Combined with the directional border (brighter top), it creates convincing material quality.

**Who does this well.** Apple's macOS window chrome uses an inset light ring on every window in dark mode. Linear's cards use it. Raycast's search bar has a pronounced inner glow that makes it feel like a glass tube.

**Dreamcatcher application.** Apply to: node circles (0.5px white stroke at 0.06 opacity), floating panels (inset shadow), and the floating input bar. Do NOT apply to the inspector panel (it's anchored to the frame, not floating) or the canvas itself.

**Gotchas.** Sub-pixel strokes (0.5px) render differently across displays. On 1x screens they become invisible; on 2x retina they're crisp; on 3x they're barely there. For SVG strokes, use 0.75px as a safer minimum. The inset shadow technique is purely CSS and doesn't work on SVG elements -- use SVG stroke for those.

---

### 18. Glassmorphism (Dark Variant)

**What it solves.** Solid opaque panels on a canvas block context. Semi-transparent panels with backdrop blur let the user see the canvas through the panel, maintaining spatial awareness while displaying UI content. On dark backgrounds, this creates the "frosted glass instrument panel" aesthetic.

**Implementation.**
```css
.glass-panel {
  background: rgba(26, 24, 22, 0.75);           /* E[3] at 75% opacity */
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
```
Key values: background opacity between 0.65-0.85 (below 0.65, text becomes hard to read against busy canvas; above 0.85, the blur is invisible). Blur between 8-16px (below 8, the canvas bleeds through too clearly; above 16, diminishing returns). `saturate(1.2)` adds a subtle vibrancy to the blurred content, preventing the glass from looking washed out.

**Who does this well.** Apple's entire design language since Big Sur. Arc Browser's sidebar. Raycast's floating panels. The "dark glassmorphism" trend in 2025-2026 specifically pairs frosted glass with deep dark gradients underneath.

**Dreamcatcher application.** Use for: the floating input bar (so the user can see nodes behind it), context menus (transient, should not fully block the canvas), and the command palette. Do NOT use for the inspector panel (it's a permanent fixture; translucency would be distracting for reading). The glass should use E[3] (#1A1816) as the base tint to maintain the warm palette through the blur.

**Gotchas.** `backdrop-filter` has ~95% global support but requires `-webkit-` prefix for Safari. Performance: 3-5 glass elements are negligible; 10+ cause measurable frame drops on mid-range phones. Keep blur values under 16px -- larger values cost more GPU cycles with imperceptible visual improvement. The glass won't be visible if the background behind it is too dark or too uniform. The canvas needs visual content (nodes, edges, grid dots) behind the glass panel for the effect to register. An empty canvas with glass panels just looks like transparent panels.

---

### 19. Ambient Occlusion Simulation

**What it solves.** Where a floating element meets the background, real objects create a soft shadow in the "crease" between surfaces. This ambient occlusion effect makes elements feel physically seated on the surface rather than floating in a void.

**Implementation.**
```css
/* Tight contact shadow at the base of an element */
.seated-element {
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.1),          /* edge definition */
    0 1px 2px rgba(0, 0, 0, 0.3),           /* contact shadow */
    0 0 8px rgba(0, 0, 0, 0.15);            /* ambient spread */
}

/* For SVG nodes: tight drop-shadow at zero offset */
<feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
```
The key differentiator from regular shadows: ambient occlusion has zero or near-zero offset and very small blur (1-4px). It's the shadow that exists at the point of contact, not below the element.

**Who does this well.** 3D rendering engines (Unity, Unreal) compute SSAO as a post-process. In 2D UI, Figma applies subtle ambient occlusion to their node containers. Linear's cards have a nearly invisible 1px shadow at zero offset that serves this purpose.

**Dreamcatcher application.** Apply to node groups as a zero-offset, 2-3px stdDeviation drop shadow in addition to the directional shadow. This creates the effect of nodes "sitting on" the canvas substrate rather than hovering above it in a void. The combination of directional shadow (node height above canvas) and ambient occlusion (contact with canvas) produces the most convincing depth.

**Gotchas.** Keep ambient occlusion shadows darker (0.2-0.4 opacity) and tighter (1-3px blur) than directional shadows. If the ambient occlusion shadow is too large, it merges with the directional shadow and the distinction is lost. On very dark backgrounds (< 5% luminance), even a black ambient occlusion shadow can be invisible -- consider using a very slightly lighter-than-background color instead.

---

### 20. SVG Radial Gradient Material (Node Dimensionality)

**What it solves.** SVG circles with flat fills look like debug visualizations. Radial gradients with off-center highlight points create the illusion of convex curvature -- a sphere-like surface that appears to catch light from above. This transforms flat 2D nodes into "specimens under glass."

**Implementation.**
```svg
<!-- Node fill: top-lit convex surface -->
<radialGradient id="node-fill" cx="45%" cy="35%">
  <stop offset="0%"   stop-color="#2C2A26"/>  <!-- highlight (E[6]) -->
  <stop offset="60%"  stop-color="#1E1C19"/>  <!-- mid-tone (E[4]) -->
  <stop offset="100%" stop-color="#13120F"/>  <!-- shadow (E[2]) -->
</radialGradient>

<!-- Specular highlight: glass reflection -->
<radialGradient id="node-spec" cx="40%" cy="30%">
  <stop offset="0%"   stop-color="rgba(255,255,255,0.12)"/>
  <stop offset="40%"  stop-color="rgba(255,255,255,0.03)"/>
  <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
</radialGradient>

<!-- Layer structure: shadow -> fill -> specular -> rim light -> core -->
<g class="node">
  <circle r="22" fill="black" opacity="0.15" cy="1"/>        <!-- micro-shadow -->
  <circle r="20" fill="url(#node-fill)"/>                      <!-- body -->
  <circle r="17" fill="url(#node-spec)"/>                      <!-- specular -->
  <circle r="20" stroke="#3D3A35" stroke-width="0.75"          <!-- rim light -->
          opacity="0.3" fill="none"/>
  <circle r="3.5" fill="url(#core-gradient)"/>                 <!-- center dot -->
</g>
```
The specular highlight sits at 40% x, 30% y -- offset from center toward the top-left, implying an overhead-left light source. The rim light (thin stroke at E[7]) catches light at the edge, mimicking the way glass or polished metal reflects at grazing angles.

**Who does this well.** RPG skill tree UIs in games like Path of Exile and Final Fantasy use multi-layer gradient nodes. Figma's component icons use radial gradients for dimensionality. D3.js data visualizations by Nadieh Bremer (Visual Cinnamon) use SVG gradients for organic, precious-feeling data points.

**Dreamcatcher application.** This is the primary node material. Every user node gets the five-layer stack. AI nodes get a different treatment: hollow glass vessel (ring stroke with no fill, or very low-opacity fill with high specular). Decision nodes get a harder, more crystalline gradient with a sharper specular highlight. The material differences between node types communicate function through visual physics.

**Gotchas.** SVG radial gradients are reusable via `<defs>` -- define once, reference many times. Do not create a new gradient per node or you'll balloon the DOM. On canvases with 100+ nodes, SVG filter stacks (especially feGaussianBlur in drop-shadow) are the primary performance bottleneck. Profile with Chrome DevTools Paint Profiler. If shadows are too expensive, consider baking node shadows into a single shared `<use>` shadow element or switching to Canvas2D rendering for the shadow layer.

---

## MOTION

### 21. Skeleton Loading Shimmer (Dark Variant)

**What it solves.** Loading states in dark mode need their own treatment. A light-mode shimmer (white highlight moving across gray) looks wrong on dark surfaces. The dark variant uses a subtle luminance shift moving across the skeleton placeholder.

**Implementation.**
```css
.skeleton-dark {
  background: var(--surface-recess);  /* E[2] */
  background-image: linear-gradient(
    90deg,
    var(--surface-recess) 0%,
    var(--surface-panel) 50%,   /* E[3] — slightly lighter */
    var(--surface-recess) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Synchronized shimmer across all skeletons */
.skeleton-dark {
  background-attachment: fixed;
  /* All elements shimmer in sync, not independently */
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-dark {
    animation: none;
    opacity: 0.7;
  }
}
```
The luminance shift from E[2] to E[3] (a ~5% brightness change) creates a subtle wave of light that reads as "loading" without being harsh. `background-attachment: fixed` synchronizes the shimmer across all skeleton elements -- they pulse together as one surface rather than as individual flickering rectangles.

**Who does this well.** Twitter/X's dark mode skeleton is the reference implementation. Discord uses synchronized dark skeletons in their message loading. Linear uses a very subtle pulse (opacity animation rather than gradient) for their loading states.

**Dreamcatcher application.** Use for: node content loading (when a node is placed but its content hasn't streamed in yet), panel section loading (when inspector data is being fetched), and AI response streaming placeholders. The skeleton should use E[2] as base and E[3] as highlight, maintaining the warm palette.

**Gotchas.** CSS animations on `background-position` are GPU-composited and very cheap. But the `background-attachment: fixed` trick can cause issues with `transform: translate()` parents -- fixed attachment is relative to the viewport, and transforms create a new stacking context that can break this. Test in the context of your actual canvas transform hierarchy.

---

### 22. Micro-Interaction Feedback States

**What it solves.** In dark interfaces, state changes are harder to perceive because the overall luminance range is compressed. Micro-interactions -- small, purposeful animations on hover, press, focus, and toggle -- provide the tactile feedback that dark surfaces lack.

**Implementation.**
```css
/* Hover: luminance lift + scale */
.node:hover {
  filter: brightness(1.15);
  transform: scale(1.02);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Press: luminance drop + scale down */
.node:active {
  filter: brightness(0.9);
  transform: scale(0.98);
  transition: all 50ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus (keyboard): glow ring */
.node:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--surface-ground),    /* gap */
    0 0 0 4px rgba(221, 0, 0, 0.5);    /* accent glow */
}

/* Selection: persistent glow */
.node.selected {
  filter: drop-shadow(0 0 8px rgba(221, 0, 0, 0.3));
}
```
Timing: hover = 150ms (fast enough to feel instant, slow enough to perceive), press = 50ms (immediate tactile response), focus ring = 0ms (appears instantly on keyboard navigation).

**Who does this well.** Raycast's list items scale and brighten on hover. Linear's cards lift with a shadow transition. Arc Browser's tabs have a 100ms brightness pulse on hover. Vercel's buttons have a satisfying press animation.

**Dreamcatcher application.** Nodes on the canvas: hover = brightness(1.15) + subtle shadow expansion. Selection = accent-colored glow ring. Dragging = shadow deepens (node "lifts" higher). Edge hover = stroke-width animates from 1 to 2px. Panel buttons: hover = background lightens one elevation step. These micro-interactions should feel like touching physical objects under glass -- slight movement, slight gleam.

**Gotchas.** `filter: brightness()` applies to the entire element including text, which can make text too bright on hover. Consider applying brightness to the background only via a pseudo-element. `prefers-reduced-motion: reduce` should disable scale animations but keep color/opacity changes (those aren't "motion" in the vestibular sense).

---

### 23. Edge Path Animation (Connection Drawing)

**What it solves.** Static lines between nodes look dead. Animated edges -- data flow particles, pulse effects, or drawing animations -- communicate that the graph is alive and that connections carry meaning.

**Implementation.**
```css
/* Animated dash flow along edge paths */
.edge-path {
  stroke: #3D3A35;                     /* E[7] at rest */
  stroke-width: 1.5;
  stroke-dasharray: 4 8;              /* 4px dash, 8px gap */
  stroke-dashoffset: 0;
  animation: edge-flow 2s linear infinite;
}

@keyframes edge-flow {
  to { stroke-dashoffset: -12; }       /* dash + gap = 12 */
}

/* Active edge: data is flowing */
.edge-path.active {
  stroke: var(--accent);
  stroke-dasharray: 2 6;
  animation: edge-flow 0.8s linear infinite;
}

/* Particle along path (SVG animateMotion) */
<circle r="2" fill="var(--accent)" opacity="0.8">
  <animateMotion dur="2s" repeatCount="indefinite">
    <mpath href="#edge-path-1"/>
  </animateMotion>
</circle>
```
Three levels of edge animation: (1) static with dashes (the edge exists), (2) animated dashes (the connection is live), (3) particle traveling the path (data is actively flowing). Each level communicates different connection states without color.

**Who does this well.** Unreal Engine's Blueprint editor uses particle-flow edges. React Flow supports animated edges with configurable dash patterns. Rive's state machine editor uses pulsing edges to show active transitions.

**Dreamcatcher application.** Default edges: solid, E[7] stroke, no animation. Active conversation edges (current branch): animated dash flow. AI streaming edges (assistant is generating): accent-colored particle traveling the path toward the response node. Completed edges: solid, E[5] stroke (dimmer). This creates a living graph where the user can see conversation flow at a glance.

**Gotchas.** SVG `animateMotion` is CPU-rendered and can't be hardware-accelerated. For canvases with 50+ visible edges, use CSS `stroke-dashoffset` animation instead (it's compositor-friendly). Particle-on-path effects should be limited to 1-3 active edges at a time, or the canvas becomes a Christmas tree. `prefers-reduced-motion` should reduce animated edges to static dashes.

---

### 24. Scroll-Driven Reveal

**What it solves.** Content that appears all at once feels static. Scroll-driven animations make panels and lists feel alive by revealing content as it enters the viewport, creating a sense of discovery.

**Implementation.**
```css
/* Modern scroll-driven approach (no JS) */
.list-item {
  opacity: 0;
  transform: translateY(8px);
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fallback for unsupported browsers */
@supports not (animation-timeline: view()) {
  .list-item {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .list-item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```
CSS `animation-timeline: view()` ties the animation to the element's visibility in its scroll container. `animation-range: entry 0% entry 30%` means the animation completes by the time 30% of the element is visible -- fast enough to feel responsive, not so slow that the user waits for content.

**Who does this well.** Apple.com uses scroll-driven reveals extensively. Stripe's product pages. Linear's changelog. All prove that subtle scroll-driven animations make content feel curated rather than dumped.

**Dreamcatcher application.** Use in the inspector panel's scrollable content: context items, tool call details, and metadata sections reveal as the user scrolls. Use in the session sidebar: session list items reveal on scroll. Do NOT use on the canvas -- the canvas has its own spatial navigation model (pan/zoom) that conflicts with scroll-driven animations.

**Gotchas.** `animation-timeline: view()` is supported in Chrome 115+ and Firefox 110+ but NOT in Safari as of early 2026. Provide the `@supports` fallback. The scroll-driven API runs entirely on the compositor thread (not the main thread), making it more performant than IntersectionObserver-based alternatives. Keep reveal transforms small (8-12px translateY, no scale) to maintain the "precision instrument" feel -- large swooping reveals feel like a marketing page, not a tool.

---

## INTERACTION

### 25. Cursor-Following Spotlight

**What it solves.** Dark canvases can feel vast and empty. A soft radial gradient that follows the cursor creates a subtle "flashlight" effect -- the user illuminates their immediate area of focus, creating intimacy with the content directly under their cursor.

**Implementation.**
```css
.canvas-spotlight {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255, 255, 255, 0.015) 0%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 1;
  transition: background 50ms ease;
}
```
```javascript
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
});
```
The spotlight opacity is critical: 0.015-0.03 white opacity is barely perceptible consciously but creates a measurable luminance bump that the eye registers as "attention." Higher than 0.05 and it becomes a visible circle -- too much.

**Who does this well.** Stripe's documentation sidebar uses a cursor-following gradient. Many portfolio sites use this effect on dark hero sections. The technique is described as "ambient light that follows interaction."

**Dreamcatcher application.** Apply to the canvas layer. The spotlight should be large (600-800px diameter) and extremely subtle (0.02 white opacity). As the user moves their cursor across the canvas, nodes near the cursor get a barely perceptible luminance lift. This reinforces the "peering through an instrument" metaphor -- the user's attention is literally a light source illuminating the specimens.

**Gotchas.** The `mousemove` event fires at 60Hz+ and updating a CSS custom property each time is cheap but not free. Use `requestAnimationFrame` to throttle updates. The spotlight should disappear entirely on touch devices (no cursor). `pointer-events: none` is critical or you'll block all canvas interaction. On high-DPI displays, the radial gradient renders smoothly, but on 1x displays, large gradients can show stepping artifacts -- test at 1x.

---

### 26. Focus-Visible Ring (Accessibility-First)

**What it solves.** Default browser focus outlines are invisible on dark backgrounds (a blue ring on #0C0B09 has near-zero contrast). Custom focus indicators must be visible on dark backgrounds while only appearing for keyboard navigation (not mouse clicks).

**Implementation.**
```css
/* Remove default, replace with visible dark-mode ring */
:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* High-contrast double ring for complex backgrounds */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--surface-ground),    /* dark gap (matches bg) */
    0 0 0 4px rgba(255, 255, 255, 0.6); /* visible ring */
}

/* On accent-colored elements, use inverse */
.accent-button:focus-visible {
  box-shadow:
    0 0 0 2px var(--surface-ground),
    0 0 0 4px rgba(255, 255, 255, 0.8);
}
```
The double-ring technique -- dark gap + light ring -- ensures the focus indicator is visible regardless of what's behind it. The dark gap separates the ring from the element's own border, preventing visual merging.

WCAG 2.4.7 requires focus indicators to be visible. WCAG 2.4.13 (AAA) requires the focus indicator to have a 3:1 contrast ratio against both the component and the adjacent background. The double-ring achieves this by guaranteeing one of the two rings always contrasts.

**Who does this well.** GitHub's dark mode uses a clear white ring with dark gap. Radix UI's primitives default to a visible double ring. Chakra UI's focus ring system provides dark-mode-aware defaults.

**Dreamcatcher application.** All interactive elements (nodes, buttons, inputs, links, tabs) need `:focus-visible` treatment. On the canvas, focused nodes should get the accent glow ring (not white) to distinguish keyboard focus from mouse selection. In panels, use the white double-ring. Critical: test full keyboard navigation flow through the app in dark mode. Every focusable element must be discoverable.

**Gotchas.** `:focus-visible` has universal support. The older `:focus` catch-all should only be used as a fallback for ancient browsers. `outline-offset: 2px` can cause the outline to overlap adjacent elements in tight layouts -- use `box-shadow` instead for pixel-precise control. SVG elements don't support `outline` -- use an additional SVG `<circle>` or `<rect>` with stroke for focused SVG nodes.

---

### 27. Hover Proximity Glow (Magnetic Interaction)

**What it solves.** Standard hover effects are binary -- on or off. Proximity-based glow creates a magnetic feeling where elements "sense" the cursor approaching, lighting up gradually as the cursor nears them. This creates an alive, responsive canvas.

**Implementation.**
```javascript
// Calculate proximity for each node
function updateProximityGlow(mouseX, mouseY, nodes) {
  const maxDistance = 150; // px
  nodes.forEach(node => {
    const dx = mouseX - node.x;
    const dy = mouseY - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const intensity = Math.max(0, 1 - distance / maxDistance);

    // Apply as CSS custom property
    node.element.style.setProperty('--glow-intensity', intensity);
  });
}
```
```css
.node {
  filter: brightness(calc(1 + var(--glow-intensity, 0) * 0.2))
          drop-shadow(0 0 calc(var(--glow-intensity, 0) * 12px)
                       rgba(255, 255, 255, calc(var(--glow-intensity, 0) * 0.1)));
  transition: filter 80ms ease-out;
}
```
As the cursor approaches within 150px, the node brightens up to 20% and gains a soft glow halo that intensifies with proximity. The transition duration (80ms) prevents flickering without adding latency.

**Who does this well.** Stripe's pricing cards have a proximity glow. Many creative agency sites use this for portfolio grids. Path of Exile's passive skill tree lights up nodes near the cursor.

**Dreamcatcher application.** This is the "specimens under glass responding to the microscope light" effect. As the user moves their cursor across the canvas, nearby nodes glow gently -- not selected, not hovered, just illuminated by proximity. This creates the sense of exploring a living system. Limit the proximity check to visible nodes (frustum culling) and throttle to 30fps to avoid performance issues on large graphs.

**Gotchas.** Running distance calculations for 200+ nodes at 60fps is expensive. Use spatial indexing (quadtree, grid hash) to limit proximity checks to nodes in the cursor's vicinity. The `filter` property forces a new GPU layer per element, which is fine for 50 nodes but problematic for 500. Consider applying the glow only to nodes within the proximity radius and removing it immediately when they fall outside, rather than transitioning to 0 (which keeps the filter active).

---

### 28. Empty State Ambient Atmosphere

**What it solves.** An empty canvas in dark mode is a black void. It communicates nothing and feels broken. A well-designed empty state should feel like a dormant but living system -- quiet but not dead, ready but not waiting.

**Implementation.**
```css
/* Breathing ambient gradient */
.empty-canvas {
  background:
    radial-gradient(
      800px ellipse at 50% 45%,
      rgba(44, 42, 38, 0.3) 0%,    /* E[6] warm glow */
      transparent 70%
    ),
    var(--surface-ground);
  animation: breathe 8s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Subtle floating particles (CSS-only) */
.empty-particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(10px, -15px); }
  50% { transform: translate(-5px, -25px); }
  75% { transform: translate(15px, -10px); }
}

@media (prefers-reduced-motion: reduce) {
  .empty-canvas { animation: none; }
  .empty-particle { animation: none; opacity: 0; }
}
```
The "breathing" gradient is an 8-second opacity pulse on a centered warm glow -- so subtle it's felt rather than seen. The particles are 5-10 CSS dots with randomized animation durations (15-25s) and offsets, creating organic drift.

**Who does this well.** Linear's empty project state has a subtle atmospheric gradient. Notion's empty pages use centered, calm illustrations. Discord's empty channels use a muted illustration with gentle animation.

**Dreamcatcher application.** When the canvas has no nodes, show: the dot grid (always), the vignette (always), a centered warm radial glow (breathing), and 5-8 drifting micro-particles. Plus a single line of centered text: "Start a conversation" in T.subtle at type-body. The effect should feel like a warm dark room with dust motes catching faint light -- dormant but alive, waiting to be populated.

**Gotchas.** The breathing animation must respect `prefers-reduced-motion`. CSS particles (positioned `absolute` divs) are lightweight but don't respond to camera transforms -- they live in screen space, which is actually correct for an empty state (it's an atmospheric effect, not canvas content). When the first node is created, the empty state should fade out over 300ms, not snap off.

---

### 29. Dark Mode System Integration

**What it solves.** A standalone dark theme that ignores the operating system's color preference feels disconnected. Proper integration means respecting `prefers-color-scheme`, offering user override, and handling the `color-scheme` CSS property for native element rendering.

**Implementation.**
```html
<!-- Tell the browser the page supports dark mode natively -->
<meta name="color-scheme" content="dark light">
```
```css
/* Set color-scheme for native element theming */
:root {
  color-scheme: dark;  /* scrollbars, form controls, etc. */
}

/* System preference detection */
@media (prefers-color-scheme: dark) {
  :root { /* dark tokens */ }
}

/* User override via data attribute */
[data-theme="dark"] {
  color-scheme: dark;
  /* dark tokens */
}

/* CSS light-dark() function for individual properties */
.element {
  background: light-dark(#FFFFFF, #0C0B09);
  color: light-dark(#1A1A1A, #E1E1E1);
}
```
The `color-scheme: dark` declaration is critical -- it tells the browser to render scrollbars, form controls, `<select>` dropdowns, autofill backgrounds, and other UA-styled elements in their dark variant. Without it, a dark page has bright white scrollbars and form controls.

**Who does this well.** GitHub handles the full cascade: system preference, user override, per-repo override. Tailwind CSS v4's dark mode integrates `prefers-color-scheme` with a `.dark` class override. Apple's Human Interface Guidelines define the three-level preference hierarchy.

**Dreamcatcher application.** Dreamcatcher is dark-only (not dual-theme), so set `color-scheme: dark` unconditionally. This ensures native scrollbars in the inspector panel render dark, any `<input>` or `<textarea>` elements use dark UA styles, and autofill suggestions don't flash white backgrounds. Add `<meta name="color-scheme" content="dark">` to `<head>` for earliest possible rendering hint.

**Gotchas.** Without `color-scheme: dark`, the browser will render the default white scrollbar in the inspector panel -- a jarring break in an otherwise dark interface. The `light-dark()` function has ~90% support (as of 2025) but is unnecessary for Dreamcatcher since it's dark-only. If dual-theme is ever added, `light-dark()` reduces token duplication significantly.

---

### 30. Radial Gradient Spotlight (Panel Focus)

**What it solves.** When a panel or modal opens, the rest of the interface should recede without going fully dark. A radial gradient spotlight centered on the active panel creates cinematic focus -- the rest of the world dims while the active element is illuminated.

**Implementation.**
```css
/* Overlay that creates spotlight around active panel */
.spotlight-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at var(--spotlight-x) var(--spotlight-y),
    transparent 0%,
    transparent var(--spotlight-size, 300px),
    rgba(0, 0, 0, 0.5) calc(var(--spotlight-size, 300px) + 100px)
  );
  pointer-events: none;
  opacity: 0;
  transition: opacity 300ms ease;
}

.spotlight-overlay.active {
  opacity: 1;
}
```
```javascript
// Position spotlight on active panel
function spotlightOn(panel) {
  const rect = panel.getBoundingClientRect();
  const overlay = document.querySelector('.spotlight-overlay');
  overlay.style.setProperty('--spotlight-x', `${rect.left + rect.width / 2}px`);
  overlay.style.setProperty('--spotlight-y', `${rect.top + rect.height / 2}px`);
  overlay.style.setProperty('--spotlight-size', `${Math.max(rect.width, rect.height) / 2 + 20}px`);
  overlay.classList.add('active');
}
```
This is a cinematic technique. The active element stays fully visible; everything outside the gradient radius dims to 50% black overlay. The transition (300ms) creates a slow, deliberate focusing effect.

**Who does this well.** Framer uses spotlight overlays during onboarding to highlight specific UI regions. Many design tools use this for guided tours. Game UIs use spotlight effects to draw attention to new abilities or items.

**Dreamcatcher application.** Use sparingly: command palette opening (spotlight the palette, dim the canvas), first-use onboarding (spotlight the input bar), and error states (spotlight the error source on the canvas). This is a strong effect -- overuse would feel theatrical. Reserve it for moments where the user's attention absolutely must be redirected.

**Gotchas.** The spotlight overlay must be `pointer-events: none` or it blocks interaction with the spotlighted element. The radial gradient approach can cause aliasing at the spotlight edge on low-DPI displays -- use a larger fade region (100-200px) between transparent and the dimmed area. If the spotlighted element is near the viewport edge, the gradient can look asymmetric -- clamp the spotlight center to avoid this.

---

## Summary Matrix

| # | Pattern | Category | Implementation | Performance Cost | Priority for Dreamcatcher |
|---|---------|----------|---------------|-----------------|-------------------------|
| 1 | Warm Black Foundation | Surface | CSS custom properties | Zero | P0 -- already implemented |
| 2 | Elevation Through Luminance | Surface | CSS custom properties | Zero | P0 -- already implemented |
| 3 | Noise Texture Overlay | Surface | SVG filter or tiled PNG | Low (PNG) / Medium (SVG) | P0 -- canvas substrate |
| 4 | Vignette | Surface | CSS radial-gradient | Low | P0 -- canvas atmosphere |
| 5 | Dot Grid Substrate | Surface | CSS radial-gradient or SVG pattern | Low | P0 -- already implemented |
| 6 | Directional Border | Surface | CSS border or box-shadow | Zero | P1 -- all floating panels |
| 7 | Gradient Separator | Surface | CSS linear-gradient | Zero | P1 -- inspector sections |
| 8 | Font Smoothing | Typography | CSS property | Zero | P0 -- global |
| 9 | Luminance Text Hierarchy | Typography | CSS custom properties | Zero | P0 -- already implemented |
| 10 | APCA Contrast | Typography | Design validation | Zero | P0 -- audit existing pairs |
| 11 | Tight Type Scale | Typography | CSS custom properties | Zero | P0 -- already implemented |
| 12 | 60-30-10 Rule | Color | Design constraint | Zero | P0 -- design discipline |
| 13 | Color Desaturation | Color | OKLCH color-mix() | Zero | P1 -- accent validation |
| 14 | OKLCH Palette Generation | Color | CSS color-mix() | Zero | P2 -- future palette |
| 15 | Single-Accent Discipline | Color | Design constraint | Zero | P0 -- design discipline |
| 16 | Layered Box-Shadow | Depth | CSS box-shadow or SVG filter | Low-Medium | P0 -- node shadows |
| 17 | Inner Glow | Depth | CSS inset shadow or SVG stroke | Low | P0 -- glass panels |
| 18 | Glassmorphism | Depth | CSS backdrop-filter | Medium | P1 -- floating input, menus |
| 19 | Ambient Occlusion | Depth | CSS/SVG shadow at zero offset | Low | P1 -- node contact shadow |
| 20 | SVG Radial Gradient Material | Depth | SVG gradients in defs | Low | P0 -- node dimensionality |
| 21 | Skeleton Shimmer | Motion | CSS animation | Low | P1 -- loading states |
| 22 | Micro-Interaction Feedback | Motion | CSS transitions | Low | P0 -- hover/press/focus |
| 23 | Edge Path Animation | Motion | CSS stroke animation or SVG animateMotion | Low-Medium | P1 -- active edges |
| 24 | Scroll-Driven Reveal | Motion | CSS scroll-timeline | Low | P2 -- inspector content |
| 25 | Cursor Spotlight | Interaction | CSS custom properties + JS | Low | P1 -- canvas atmosphere |
| 26 | Focus-Visible Ring | Interaction | CSS :focus-visible | Zero | P0 -- accessibility |
| 27 | Proximity Glow | Interaction | JS distance calc + CSS filter | Medium | P2 -- spatial exploration |
| 28 | Empty State Atmosphere | Interaction | CSS animation + gradient | Low | P1 -- first impression |
| 29 | System Integration | Interaction | meta tag + color-scheme | Zero | P0 -- scrollbars, controls |
| 30 | Radial Spotlight | Interaction | CSS radial-gradient + JS | Low | P2 -- onboarding, modals |

---

## Implementation Order

**Phase 1 (Foundation)**: Patterns 1, 2, 5, 8, 9, 11, 12, 15, 29. These are the bones. Most are already in DESIGN-SPEC.md; validate and lock.

**Phase 2 (Material)**: Patterns 3, 4, 16, 17, 20, 22, 26. These transform flat shapes into dimensional objects. This is where Dreamcatcher stops looking like a developer tool and starts feeling like a precision instrument.

**Phase 3 (Atmosphere)**: Patterns 6, 7, 18, 19, 21, 25, 28. These add the living, breathing quality. The canvas becomes a warm dark room you peer into, not a screen you stare at.

**Phase 4 (Polish)**: Patterns 10, 13, 14, 23, 24, 27, 30. These are refinements that compound quality. Individually small, collectively they're the difference between good and extraordinary.

---

## Sources

Research compiled from technical documentation and industry references:

- [Material Design 3: Elevation](https://m3.material.io/styles/elevation/applying-elevation)
- [Material Design: Dark Theme Codelab](https://codelabs.developers.google.com/codelabs/design-material-darktheme)
- [Josh W. Comeau: Designing Beautiful Shadows](https://www.joshwcomeau.com/css/designing-shadows/)
- [Tobias Ahlin: Layered Box Shadows](https://tobiasahlin.com/blog/layered-smooth-box-shadows/)
- [CSS-Tricks: Grainy Gradients](https://css-tricks.com/grainy-gradients/)
- [CSS-Tricks: Dark Mode Guide](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/)
- [CSS-Tricks: SVG Line Animation](https://css-tricks.com/svg-line-animation-works/)
- [Codrops: SVG feTurbulence Textures](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)
- [Frontend Masters: CSS Spotlight Effect](https://frontendmasters.com/blog/css-spotlight-effect/)
- [web.dev: color-scheme Property](https://web.dev/articles/color-scheme)
- [web.dev: CSS Masking](https://web.dev/articles/css-masking)
- [MDN: CSS Scroll-Driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations)
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible)
- [MDN: font-smooth](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth)
- [APCA Contrast Calculator](https://apcacontrast.com/)
- [APCA Documentation](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Sara Soueidan: Accessible Focus Indicators](https://www.sarasoueidan.com/blog/focus-indicators/)
- [Smashing Magazine: Inclusive Dark Mode](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/)
- [React Flow: Dark Mode](https://reactflow.dev/examples/styling/dark-mode)
- [React Flow: Theming](https://reactflow.dev/learn/customization/theming)
- [Silphium Design: CSS Box Shadow Light and Shadow](https://silphiumdesign.com/css-box-shadow-simulating-real-light-shadow/)
- [Silphium Design: Ambient Light Effects](https://silphiumdesign.com/guide-to-ambient-light-effects-in-web-design/)
- [CodyHouse: Beautiful CSS Shadows](https://codyhouse.co/nuggets/beautiful-css-shadows/)
- [ibelick: Metallic Effect with CSS](https://ibelick.com/blog/creating-metallic-effect-with-css/)
- [ibelick: Grainy Backgrounds with CSS](https://ibelick.com/blog/create-grainy-backgrounds-with-css)
- [Infinite Canvas Tutorial: Grid](https://infinitecanvas.cc/guide/lesson-005)
- [fffuel: SVG Noise Generator](https://www.fffuel.co/nnnoise/)
- [fffuel: SVG Neon Generator](https://www.fffuel.co/nnneon/)
- [Dopely Colors: Dark Mode Palette](https://dopelycolors.com/blog/dark-mode-ui-perfect-theme-palette)
- [Atlassian Design: Elevation](https://atlassian.design/foundations/elevation/)
- [Toptal: Principles of Dark UI Design](https://www.toptal.com/designers/ui/dark-ui-design)
- [Game UI Database: Skill Trees](https://www.gameuidatabase.com/index.php?scrn=64)
- [Tokens Studio: Node-Based Design](https://tokens.studio/blog/revolutionising-design-systems-the-future-of-ui-design-using-graphs-node-based-design)
- [Visual Cinnamon: Glow Filters for D3.js](https://www.visualcinnamon.com/2016/06/glow-filter-d3-visualization/)
- [9elements: Animated SVG Neon Effect](https://9elements.com/blog/creating-an-animated-svg-neon-light-effect/)
- [Polypane: Fading Content with Transparent Gradients](https://polypane.app/blog/my-take-on-fading-content-using-transparent-gradients-in-css/)
