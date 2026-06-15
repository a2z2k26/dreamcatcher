# Green-Land Design Rubric

Score each category from 0-2.

- `0`: misses the design system or breaks the product.
- `1`: technically present but weak, flat, or inconsistent.
- `2`: clearly aligned with the reference direction.

Minimum green score: `18 / 24`, with no zero in Product Signal, Responsiveness, or Verification.

## 1. Product Signal

- `0`: first viewport is mostly empty or generic.
- `1`: product is visible but weak or hard to understand.
- `2`: spatial conversation graph is visible immediately and feels like the core product.

## 2. Canvas Atmosphere

- `0`: flat black/dot grid.
- `1`: has subtle texture but little depth.
- `2`: warm-black atmospheric field with depth, falloff, and quiet spatial richness.

## 3. Node And Edge Language

- `0`: nodes are generic dots or unclear roles.
- `1`: roles exist but lack material/selection/streaming nuance.
- `2`: user, AI, branch, summary, selected, and streaming states are visually distinct and restrained.

## 4. Input Jewel

- `0`: input feels like an ordinary field.
- `1`: pill/glass exists but lacks edge lighting or command clarity.
- `2`: input has the strongest material treatment and reads as where thought enters the system.

## 5. Glass Material

- `0`: surfaces are flat fills.
- `1`: blur/border exists but feels pasted on.
- `2`: top light, side falloff, bottom weight, and shadow stack make surfaces feel physical.

## 6. Red Is Earned

- `0`: red is decorative or overused.
- `1`: mostly restrained but leaks into idle decoration.
- `2`: red appears only for focus, streaming, acute attention, or primary next action.

## 7. Typography And Luminance

- `0`: inconsistent fonts or weak hierarchy.
- `1`: correct fonts/tokens but flat hierarchy.
- `2`: Mulish/iA Writer Mono stack, tight hierarchy, and luminance-only metadata clarity.

## 8. Interaction States

- `0`: open/focus/streaming states are missing or broken.
- `1`: states exist but feel unpolished or disconnected.
- `2`: states are captured, intentional, and visually differentiated.

## 9. Responsiveness

- `0`: mobile or laptop chrome overlaps.
- `1`: no overlaps but cramped or missing important cues.
- `2`: mobile adapts composition while preserving the product and primary actions.

## 10. Accessibility

- `0`: unreadable contrast, keyboard traps, or inaccessible controls.
- `1`: basic contrast and controls pass, but focus/reduced-motion states are incomplete.
- `2`: readable, keyboard-aware, reduced-motion safe, and semantically stable.

## 11. Performance Discipline

- `0`: visual changes add heavy runtime work without bounds.
- `1`: acceptable but not measured.
- `2`: effects are CSS/SVG/canvas bounded, with reduced-motion and no avoidable layout churn.

## 12. Verification

- `0`: no screenshots or checks.
- `1`: screenshots or tests run but not both.
- `2`: capture matrix and `greenland:check` both pass.
