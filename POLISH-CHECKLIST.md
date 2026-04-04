# Dreamcacher Polish Checklist

Systematic audit of spacing, radius, color, typography, transition, and z-index inconsistencies across all UI components. Every item references the defined token system in `src/lib/theme.ts` (tokens: `S`, `R`, `FS`, `FF`, `Z`, `DURATION`, `EASE`, `transition()`).

Legend: `file:line` | `current value` -> `token value` | rationale

---

## 1. Border Radius Mismatches

The theme defines `R = { sm: 6, md: 10, lg: 14, xl: 18, pill: 9999 }`. Many components use raw numbers instead of tokens, and several use values that don't exist in the scale.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 1.1 | `FloatingUI.tsx:46` | `borderRadius: 8` | `R.sm` (6) or `R.md` (10) | Timeline toggle button. 8 is off-scale. Use `R.sm` to match other small controls, or `R.md` to match glass panels. Decide one: **recommend `R.md` (10)** for consistency with other glass buttons. |
| 1.2 | `FloatingUI.tsx:62` | `borderRadius: 8` | `R.md` (10) | Model selector button. Same issue. |
| 1.3 | `FloatingUI.tsx:78` | `borderRadius: 8` | `R.md` (10) | Model dropdown panel. |
| 1.4 | `FloatingUI.tsx:88` | `borderRadius: 6` | `R.sm` (6) | Model dropdown items. Already correct value but should use token. |
| 1.5 | `FloatingUI.tsx:126` | `borderRadius: 10` | `R.md` (10) | CanvasTools toolbar. Already correct value but should use token. |
| 1.6 | `FloatingUI.tsx:144` | `borderRadius: 6` | `R.sm` (6) | ToolBtn. Already correct value but should use token. |
| 1.7 | `FloatingUI.tsx:288` | `borderRadius: 12` | `R.md` (10) or `R.lg` (14) | FloatingInput glass container. 12 is off-scale. **Recommend `R.lg` (14)** since this is a primary floating panel. |
| 1.8 | `Inspector.tsx:68` | `borderRadius: 3` | `R.sm` (6) | Close button. 3 is off-scale and too tight. Use `R.sm`. |
| 1.9 | `Inspector.tsx:190` | `borderRadius: 4` | `R.sm` (6) | ActionBtn. 4 is off-scale. Use `R.sm`. |
| 1.10 | `ContextMenu.tsx:179` | `borderRadius: 12` | `R.lg` (14) | Context menu panel. 12 is off-scale. Use `R.lg` to match other floating panels. |
| 1.11 | `ContextMenu.tsx:257` | `borderRadius: 6` | `R.sm` (6) | MenuItem. Correct value, should use token. |
| 1.12 | `MemoryShelf.tsx:50` | `borderRadius: 8` | `R.md` (10) | Toggle button. 8 is off-scale. |
| 1.13 | `MemoryShelf.tsx:110` | `borderRadius: 6` | `R.sm` (6) | Search input. Correct value, should use token. |
| 1.14 | `MemoryShelf.tsx:133` | `borderRadius: 6` | `R.sm` (6) | Memory card. Correct value, should use token. |
| 1.15 | `MemoryShelf.tsx:177` | `borderRadius: 4` | `R.sm` (6) | Spawn button. 4 is off-scale. |
| 1.16 | `MemoryShelf.tsx:227` | `borderRadius: 4` | `R.sm` (6) | ClipThumbnail SVG. 4 is off-scale. |
| 1.17 | `SessionPill.tsx:99` | `borderRadius: state === 'open' ? 14 : 10` | `R.lg` (14) / `R.md` (10) | Correct values but should use tokens. |
| 1.18 | `ToolCard.tsx:42` | `borderRadius: 6` | `R.sm` (6) | Correct, should use token. |
| 1.19 | `ToolCard.tsx:90` | `borderRadius: 4` | `R.sm` (6) | Code block pre. 4 is off-scale. |
| 1.20 | `ToolCard.tsx:108` | `borderRadius: 4` | `R.sm` (6) | Output pre. Same. |
| 1.21 | `PathTrace.tsx:64` | `borderRadius: 12` | `R.lg` (14) | PathTrace bar. 12 is off-scale. |
| 1.22 | `BranchPreview.tsx:38` | `borderRadius: 10` | `R.md` (10) | Correct, should use token. |
| 1.23 | `BranchPreview.tsx:75` | `borderRadius: 6` | `R.sm` (6) | Branch item. Correct, should use token. |
| 1.24 | `LearnOverlay.tsx:190` | `borderRadius: 16` | `R.xl` (18) or `R.lg` (14) | 16 is off-scale. **Recommend `R.xl` (18)** — this is a modal. |
| 1.25 | `LearnOverlay.tsx:232` | `borderRadius: 8` | `R.md` (10) | Mode button. 8 is off-scale. |
| 1.26 | `LearnOverlay.tsx:285` | `borderRadius: 6` | `R.sm` (6) | Follow-up mode buttons. Correct, use token. |
| 1.27 | `LearnOverlay.tsx:312` | `borderRadius: 6` | `R.sm` (6) | Follow-up input. Correct, use token. |
| 1.28 | `LearnOverlay.tsx:325` | `borderRadius: 6` | `R.sm` (6) | Ask button. Correct, use token. |
| 1.29 | `ShortcutsHelp.tsx:58` | `borderRadius: 14` | `R.lg` (14) | Correct, should use token. |
| 1.30 | `ShortcutsHelp.tsx:97` | `borderRadius: 4` | `R.sm` (6) | Kbd tag. 4 is off-scale. |
| 1.31 | `ClipCreator.tsx:81` | `borderRadius: 12` | `R.lg` (14) | ClipCreator container. 12 is off-scale. |
| 1.32 | `ClipCreator.tsx:98` | `borderRadius: 6` | `R.sm` (6) | Clip name input. Correct, use token. |
| 1.33 | `ClipCreator.tsx:114` | `borderRadius: 4` | `R.sm` (6) | Save button. 4 is off-scale. |
| 1.34 | `ClipCreator.tsx:131` | `borderRadius: 4` | `R.sm` (6) | Clip button. 4 is off-scale. |
| 1.35 | `ClipCreator.tsx:148` | `borderRadius: 4` | `R.sm` (6) | Clear button. 4 is off-scale. |

**Summary**: 8 and 12 do not exist in the radius scale. Standardize to `R.md` (10) and `R.lg` (14) respectively. All 4s should be `R.sm` (6). All 3s should be `R.sm` (6). Replace raw numbers with token references everywhere.

---

## 2. Hardcoded Colors (not using tokens)

Colors should come from `E`, `T`, `C`, `ACCENT`, or `ACCENT_*` tokens. Several components use raw `rgba()` values that duplicate token semantics.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 2.1 | `MemoryShelf.tsx:77` | `'1px solid rgba(255, 255, 255, 0.06)'` | `\`1px solid ${E[5]}40\`` or define a border token | Raw rgba for panel border. E[5] (#252320) at ~6% opacity is the intent. |
| 2.2 | `MemoryShelf.tsx:89` | `'1px solid rgba(255,255,255,0.06)'` | Same as 2.1 | Header bottom border. |
| 2.3 | `MemoryShelf.tsx:135` | `'rgba(255,255,255,0.02)'` | `${E[3]}08` or add `O.invisible` token usage | Card resting background. |
| 2.4 | `MemoryShelf.tsx:141` | `'rgba(255,255,255,0.02)'` | Same as 2.3 | Card mouseleave reset. |
| 2.5 | `MemoryShelf.tsx:196` | `'1px solid rgba(255,255,255,0.06)'` | Same as 2.1 | Footer top border. |
| 2.6 | `MemoryShelf.tsx:125` | `color: E[6]` | `color: T.dim` | Hint text using elevation color for text. E[6] is #2C2A26 — nearly invisible. Use `T.dim` (#404040) for legibility. |
| 2.7 | `LearnOverlay.tsx:183` | `'rgba(0, 0, 0, 0.5)'` | `'rgba(8, 7, 6, 0.5)'` or use `E[0]` with opacity | Overlay backdrop. Pure black is off-palette (no pure blacks per design direction). Use E[0] base. |
| 2.8 | `LearnOverlay.tsx:202` | `'1px solid rgba(255,255,255,0.06)'` | Same as 2.1 | Header border. |
| 2.9 | `LearnOverlay.tsx:243` | `'rgba(221,0,0,0.3)'` | `ACCENT_30` | Hover border. Use existing accent token. |
| 2.10 | `LearnOverlay.tsx:244` | `'rgba(255,255,255,0.08)'` | `${E[5]}30` or border token | Resting border. |
| 2.11 | `LearnOverlay.tsx:286` | `'1px solid rgba(255,255,255,0.08)'` | Same as 2.10 | Follow-up button border. |
| 2.12 | `LearnOverlay.tsx:287` | `'rgba(255,255,255,0.02)'` | Same as 2.3 | Button background. |
| 2.13 | `LearnOverlay.tsx:291` | `'rgba(221,0,0,0.2)'` | `ACCENT_18` or close | Hover border accent. |
| 2.14 | `LearnOverlay.tsx:292` | `'rgba(255,255,255,0.08)'` | Same as 2.10 | Reset border. |
| 2.15 | `LearnOverlay.tsx:306` | `'1px solid rgba(255,255,255,0.06)'` | Same as 2.1 | Footer border. |
| 2.16 | `LearnOverlay.tsx:311` | `'rgba(255,255,255,0.04)'` bg, `'rgba(255,255,255,0.08)'` border | Use E tokens | Follow-up input. |
| 2.17 | `LearnOverlay.tsx:326` | `\`rgba(221,0,0,0.2)\`` | `ACCENT_18` | Ask button border. |
| 2.18 | `LearnOverlay.tsx:327` | `\`rgba(221,0,0,0.05)\`` | `ACCENT_18` (close enough) or add `ACCENT_05` | Ask button background. |
| 2.19 | `FloatingUI.tsx:293-301` | Multiple `rgba(221,0,0,...)` values | Use `ACCENT_*` tokens | Focused input border glow. These should reference `ACCENT_30`, `ACCENT_18`, etc. Consider adding `ACCENT_06` and `ACCENT_10` tokens. |
| 2.20 | `ShortcutsHelp.tsx:51` | `'rgba(0,0,0,0.5)'` | Same as 2.7 | Overlay backdrop. Pure black. |
| 2.21 | `FloatingUI.tsx:17` | `` `${E[7]}60` `` | Acceptable but could define `hoverBg` as a theme token | Hover background used in multiple files. Consider exporting from theme. |

**Action**: Add these border/overlay tokens to `theme.ts`:
```ts
export const BORDER_SUBTLE = `rgba(255,255,255,0.06)`;
export const BORDER_MEDIUM = `rgba(255,255,255,0.08)`;
export const BG_OVERLAY = `rgba(8, 7, 6, 0.5)`;  // warm, not pure black
export const BG_HOVER = `${E[7]}60`;
export const ACCENT_06 = '#DD000006';
export const ACCENT_10 = '#DD000010';
```

---

## 3. Font Size Inconsistencies

Theme defines `FS = { caption: 10, label: 11, body: 13, title: 16, display: 20 }`. Several components use `fontSize: 9` (off-scale) and `fontSize: 12` and `fontSize: 14` (off-scale).

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 3.1 | `Inspector.tsx:46` | `fontSize: 9` | `FS.caption` (10) | Section label "Your Message"/"AI Response". 9 is off-scale. |
| 3.2 | `Inspector.tsx:159` | `fontSize: 9` | `FS.caption` (10) | Label component. Same issue in reusable component. |
| 3.3 | `TimelineView.tsx:57` | `fontSize: 9` | `FS.caption` (10) | "Timeline" header label. |
| 3.4 | `MemoryShelf.tsx:91` | `fontSize: 9` | `FS.caption` (10) | "Memories" header label. |
| 3.5 | `ShortcutsHelp.tsx:88` | `fontSize: 9` | `FS.caption` (10) | Category headers. |
| 3.6 | `FloatingUI.tsx:146` | `fontSize: 12` | `FS.label` (11) or `FS.body` (13) | ToolBtn text. 12 is off-scale. **Recommend `FS.label` (11)** for toolbar items. |
| 3.7 | `ContextMenu.tsx:258` | `fontSize: 12` | `FS.label` (11) | MenuItem text. 12 is off-scale. Use `FS.label`. |
| 3.8 | `PathTrace.tsx:71` | `fontSize: 12` | `FS.label` (11) or `FS.body` (13) | Step counter. 12 is off-scale. |
| 3.9 | `LearnOverlay.tsx:246` | `fontSize: 14` | `FS.body` (13) | Mode icon. 14 is off-scale. |
| 3.10 | `FloatingUI.tsx:321` | `fontSize: focused ? 14 : 13` | `FS.body` (13) for both | FloatingInput expands font on focus. 14 is off-scale. The size change also animates `font-size` which is **not** GPU-accelerated (causes reflow). Remove the size change. |
| 3.11 | `InputBar.tsx:169` | `fontSize: 11` | `FS.label` (11) | Correct value, should use token. |

**Summary**: `fontSize: 9` appears 5 times in section labels but is not in the scale. Standardize to `FS.caption` (10). `fontSize: 12` appears 3 times — pick `FS.label` (11). `fontSize: 14` appears once — use `FS.body` (13).

---

## 4. Font Family Inconsistencies

Theme defines `FF = { sans: "'Inter', system-ui, ...", mono: "'Inconsolata', monospace" }`. Some files use inconsistent quoting.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 4.1 | `TopBar.tsx:11` | `fontFamily: 'Inconsolata, monospace'` | `FF.mono` | Missing quotes around Inconsolata. |
| 4.2 | `TopBar.tsx:14` | `fontFamily: 'Inconsolata, monospace'` | `FF.mono` | Same. |
| 4.3 | `TopBar.tsx:20` | `fontFamily: 'Inconsolata, monospace'` | `FF.mono` | Same. |
| 4.4 | `ContextMenu.tsx:182` | `fontFamily: 'Inconsolata, monospace'` | `FF.mono` | Context menu panel base font. Also: this makes the entire menu monospace, which contradicts the body font used everywhere else. **Recommend removing this** — menu labels should use the sans font. |
| 4.5 | All files using `"'Inconsolata', monospace"` inline | Literal string | `FF.mono` token | ~20 occurrences. Should all reference the token. |
| 4.6 | All files using `fontFamily: 'inherit'` | Mixed | Keep `'inherit'` where appropriate, use `FF.sans` elsewhere | Buttons using `fontFamily: 'inherit'` is correct — they inherit from parent. |

---

## 5. Letter Spacing Inconsistencies

Uppercase section labels use varying letter-spacing values.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 5.1 | `Inspector.tsx:48` | `letterSpacing: '0.8px'` | `0.8` (number, not string) | Inconsistent type — some use string, some use number. |
| 5.2 | `Inspector.tsx:161` | `letterSpacing: '0.8px'` | `0.8` | Same. |
| 5.3 | `MemoryShelf.tsx:91` | `letterSpacing: '0.8px'` | `0.8` | Same. |
| 5.4 | `TimelineView.tsx:57` | `letterSpacing: '0.8px'` | `0.8` | Same. |
| 5.5 | `ToolCard.tsx:83,101` | `letterSpacing: 0.5` | `0.8` | Input/Output sub-labels use 0.5 while all other uppercase labels use 0.8. Inconsistent within the same pattern. |
| 5.6 | `LearnOverlay.tsx:205` | `letterSpacing: 1` | `0.8` | "Learn Mode" header uses 1 while all other section headers use 0.8. |
| 5.7 | `LearnOverlay.tsx:260` | `letterSpacing: 0.5` | `0.8` | User message labels use 0.5. |
| 5.8 | `FloatingUI.tsx:311` | `letterSpacing: 0.5` | `0.8` | BRANCH indicator. |
| 5.9 | `SessionPill.tsx:113` | `letterSpacing: 1.5` | Keep | "DC" branding intentionally wider. Acceptable exception. |

**Action**: Add to theme.ts:
```ts
export const LS = {
  tight: 0.5,   // compact labels, badges
  normal: 0.8,  // standard uppercase section headers
  wide: 1.5,    // branding, display
} as const;
```
Standardize all uppercase section labels to `LS.normal` (0.8) and use number type consistently.

---

## 6. Spacing / Padding Inconsistencies

Theme defines `S = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32 }`. Many values are off-grid.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 6.1 | `SessionPill.tsx:109` | `padding: '7px 14px'` | `'8px 14px'` (S[2], ~S[3]+2) | 7 is off the 4px grid. Round to 8. |
| 6.2 | `SessionPill.tsx:138` | `padding: '3px 4px'` | `'4px 4px'` (S[1]) | 3 is off-grid. |
| 6.3 | `ToolCard.tsx:52` | `padding: '5px 8px'` | `'4px 8px'` (S[1], S[2]) or `'6px 8px'` | 5 is off-grid. Recommend `'4px 8px'` for compact tool cards. |
| 6.4 | `ToolCard.tsx:79` | `padding: '4px 8px 8px'` | `'4px 8px 8px'` | Acceptable (4, 8 are on-grid). |
| 6.5 | `MemoryShelf.tsx:51` | `padding: '6px 10px'` | `'8px 12px'` (S[2], S[3]) | 6 and 10 are off-grid. |
| 6.6 | `MemoryShelf.tsx:106` | `padding: '6px 10px'` | `'8px 12px'` | Same as above. |
| 6.7 | `BranchPreview.tsx:39` | `padding: 6` | `S[2]` (8) or `S[1]` (4) | 6 is off-grid. Recommend `S[2]` (8). |
| 6.8 | `BranchPreview.tsx:48` | `padding: '4px 8px 6px'` | `'4px 8px 8px'` | Bottom 6 is off-grid. |
| 6.9 | `LearnOverlay.tsx:255` | `padding: '14px 18px'` | `'16px 20px'` (S[4], S[5]) | 14 and 18 are off-grid. |
| 6.10 | `LearnOverlay.tsx:224` | `padding: '16px 18px'` | `'16px 20px'` (S[4], S[5]) | 18 is off-grid. |
| 6.11 | `LearnOverlay.tsx:285` | `padding: '5px 10px'` | `'4px 8px'` or `'4px 12px'` | 5 and 10 are off-grid. |
| 6.12 | `LearnOverlay.tsx:312` | `padding: '6px 10px'` | `'8px 12px'` (S[2], S[3]) | 6 and 10 off-grid. |
| 6.13 | `LearnOverlay.tsx:325` | `padding: '6px 12px'` | `'8px 12px'` (S[2], S[3]) | 6 is off-grid. |
| 6.14 | `Inspector.tsx:136` | `gap: 5` | `gap: 4` (S[1]) | 5 is off-grid. Action buttons gap. |
| 6.15 | `ClipCreator.tsx:85` | `gap: 10` | `gap: 12` (S[3]) or `gap: 8` (S[2]) | 10 is off-grid. |
| 6.16 | `ClipCreator.tsx:130` | `gap: 5` | `gap: 4` (S[1]) | 5 is off-grid. |
| 6.17 | `FloatingUI.tsx:40` | `gap: 6` | `gap: 8` (S[2]) or `gap: 4` (S[1]) | 6 is off-grid. TopControls gap. |
| 6.18 | `MemoryShelf.tsx:54` | `gap: 6` | `gap: 8` (S[2]) | Toggle button gap. |
| 6.19 | `TimelineView.tsx:105` | `gap: 6` | `gap: 8` (S[2]) | Role + timestamp row. |
| 6.20 | `SessionPill.tsx:137` | `gap: 6` | `gap: 8` (S[2]) | Peek session items. |
| 6.21 | `SessionPill.tsx:194` | `gap: 6` | `gap: 8` (S[2]) | Session row inner. |
| 6.22 | `LearnOverlay.tsx:279` | `gap: 6` | `gap: 8` (S[2]) | Follow-up mode buttons. |
| 6.23 | `ToolCard.tsx:25` | `gap: 4` | `S[1]` (4) | Correct, should use token. |
| 6.24 | `ToolCard.tsx:51` | `gap: 6` | `gap: 8` (S[2]) | Tool card header items. |
| 6.25 | `SessionPill.tsx:233` | `paddingLeft: 11` | `paddingLeft: 12` (S[3]) | 11 is off-grid. |
| 6.26 | `MemoryShelf.tsx:121` | `padding: 8` | `S[2]` (8) | Correct value, should use token. |
| 6.27 | `ClipCreator.tsx:82` | `padding: naming ? '8px 14px' : '6px 14px'` | `'8px 16px'` / `'8px 16px'` | 6 and 14 are off-grid. Simplify to one consistent padding. |

---

## 7. Transition Inconsistencies

Theme defines `DURATION`, `EASE`, and `transition()` helper. Components use a mix of raw strings with different durations and easings.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 7.1 | `Inspector.tsx:34` | `'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('transform', 'normal', 'snap')` | 0.2s = 200ms, but `DURATION.normal` = 250ms. Standardize. |
| 7.2 | `Inspector.tsx:69` | `'background 150ms ease'` | `transition('background', 'fast', 'smooth')` | 150ms = `DURATION.fast`. Use token. |
| 7.3 | `Inspector.tsx:195` | `'background 150ms ease'` | Same as 7.2 | ActionBtn. |
| 7.4 | `TimelineView.tsx:49` | `'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('transform', 'normal', 'snap')` | 250ms matches `DURATION.normal`. Use token. |
| 7.5 | `TimelineView.tsx:99` | `'background 0.15s'` | `transition('background', 'fast', 'smooth')` | Missing easing function entirely. |
| 7.6 | `MemoryShelf.tsx:83` | `'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('transform', 'normal', 'snap')` | |
| 7.7 | `MemoryShelf.tsx:138` | `'background 150ms ease'` | `transition('background', 'fast', 'smooth')` | |
| 7.8 | `ContextMenu.tsx:261` | `'background 150ms ease'` | `transition('background', 'fast', 'smooth')` | |
| 7.9 | `BranchPreview.tsx:78` | `'background 150ms ease'` | `transition('background', 'fast', 'smooth')` | |
| 7.10 | `SessionPill.tsx:100` | `'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('all', 'normal', 'snap')` | 300ms vs DURATION.normal (250ms). Consider adjusting or use 'slow'. |
| 7.11 | `SessionPill.tsx:117` | `'background 0.3s'` | `transition('background', 'normal', 'snap')` | Missing easing. 300ms inconsistent — phase dots should be fast. |
| 7.12 | `SessionPill.tsx:187` | `'background 0.3s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('background', 'normal', 'snap')` | |
| 7.13 | `SessionPill.tsx:246` | `'color 0.2s'` | `transition('color', 'fast', 'smooth')` | Missing easing. |
| 7.14 | `FloatingUI.tsx:283` | `'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('all', 'normal', 'snap')` | Width animation. |
| 7.15 | `FloatingUI.tsx:291` | `'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('all', 'normal', 'snap')` | |
| 7.16 | `FloatingUI.tsx:323` | `'font-size 0.2s'` | **Remove entirely** | Animating `font-size` causes layout reflow. Not GPU-accelerated. Remove the font-size change on focus (see 3.10). |
| 7.17 | `FloatingUI.tsx:338` | `'color 0.2s'` | `transition('color', 'fast', 'smooth')` | Missing easing. |
| 7.18 | `ToolCard.tsx:71` | `'transform 0.15s'` | `transition('transform', 'fast', 'snap')` | Missing easing. |
| 7.19 | `ClipCreator.tsx:86` | `'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'` | `transition('all', 'normal', 'snap')` | 200ms vs 250ms. |
| 7.20 | `InputBar.tsx:159` | `'border-color 0.2s'` | `transition('border-color', 'fast', 'smooth')` | Missing easing. |

**Missing transitions on interactive elements** (no hover/active transition at all):

| # | File:Line | Element | Fix |
|---|-----------|---------|-----|
| 7.21 | `TimelineView.tsx:64` | Close button | Add `transition('color', 'fast', 'smooth')` |
| 7.22 | `MemoryShelf.tsx:96` | Close button | Same |
| 7.23 | `MemoryShelf.tsx:149` | Memory delete button | Same |
| 7.24 | `SessionPill.tsx:165-166` | "New Session" row | Has bg transition via onMouseEnter but no transition property. Add `transition: transition('background', 'fast', 'smooth')` to style. |
| 7.25 | `PathTrace.tsx:80-84` | Prev button | No hover transition. Add `transition('color', 'fast', 'smooth')`. |
| 7.26 | `PathTrace.tsx:107-111` | Next button | Same. |
| 7.27 | `PathTrace.tsx:124-127` | Exit button | Same. |
| 7.28 | `LearnOverlay.tsx:214` | Close button | No hover transition. |
| 7.29 | `ShortcutsHelp.tsx:75` | Close button | No hover transition. |
| 7.30 | `FloatingUI.tsx:43-55` | Timeline toggle button | Has onMouseEnter/Leave but no CSS transition property. |
| 7.31 | `FloatingUI.tsx:59-74` | Model selector button | Same. |

---

## 8. Z-Index Issues

Theme defines `Z = { canvas: 0, statusBar: 40, floatingUI: 50, memoryShelf: 55, inspector: 60, timeline: 70, pill: 80, pathTrace: 90, popover: 100, contextMenu: 200, overlay: 300 }`. Most values match but there are conflicts.

| # | File:Line | Current | Token | Notes |
|---|-----------|---------|-------|-------|
| 8.1 | `FloatingUI.tsx:80` | `zIndex: 100` | `Z.popover` (100) | Model dropdown. Correct value but should use token. |
| 8.2 | `BranchPreview.tsx:36` | `zIndex: 100` | `Z.popover` (100) | Correct, should use token. |
| 8.3 | `LearnOverlay.tsx:181` | `zIndex: 200` | `Z.contextMenu` (200) | Learn overlay shares z-index with ContextMenu. Should be `Z.overlay` (300) since it's a full-screen overlay, or define `Z.modal = 250`. |
| 8.4 | `ClipCreator.tsx:79` | `zIndex: 80` | `Z.pill` (80) | ClipCreator shares z-index with SessionPill. Could overlap. **Recommend defining `Z.clipCreator = 75`** or positioning below the pill. |

---

## 9. Missing `prefers-reduced-motion` Respect

No component checks for reduced motion preference. All animated transitions will play regardless of user setting.

| # | Action |
|---|--------|
| 9.1 | Add a CSS media query in global styles: `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }` |
| 9.2 | Or add a `useReducedMotion()` hook and conditionally apply transitions. |

---

## 10. Interactive State Gaps

Elements with `onMouseEnter`/`onMouseLeave` that directly mutate `style` — these bypass React's declarative model and can cause stale state if the component re-renders during hover.

| # | File:Line | Element | Fix |
|---|-----------|---------|-----|
| 10.1 | `FloatingUI.tsx:92-93` | Model dropdown items | Use CSS classes or useState for hover state |
| 10.2 | `FloatingUI.tsx:148-149` | ToolBtn | Same |
| 10.3 | `Inspector.tsx:183-184` | ActionBtn | Same |
| 10.4 | `MemoryShelf.tsx:140-141` | Memory cards | Same — also mutates both `background` and `borderColor` |
| 10.5 | `SessionPill.tsx:165-166` | New Session row | Same |
| 10.6 | `SessionPill.tsx:189-190` | Session items | Same |
| 10.7 | `SessionPill.tsx:240-241` | Delete button | Same |
| 10.8 | `ContextMenu.tsx:263-264` | MenuItem | Same |
| 10.9 | `BranchPreview.tsx:80-81` | Branch items | Same |
| 10.10 | `LearnOverlay.tsx:243-244` | Mode buttons | Same |
| 10.11 | `LearnOverlay.tsx:291-292` | Follow-up buttons | Same |

**Recommendation**: These are not critical bugs but are a code quality concern. For a proper fix, create a `useHover()` hook or use CSS `:hover` via a utility class. Lower priority than visual fixes.

---

## 11. Console.error Calls in Production Code

| # | File:Line | Current | Fix |
|---|-----------|---------|-----|
| 11.1 | `FloatingUI.tsx:268` | `console.error(err)` | Replace with proper error reporting or remove. |
| 11.2 | `ContextMenu.tsx:156` | `console.error(err)` | Same. |
| 11.3 | `LearnOverlay.tsx:112` | `console.error(err)` | Same. |
| 11.4 | `LearnOverlay.tsx:170` | `console.error(err)` | Same. |
| 11.5 | `InputBar.tsx:148` | `console.error(err)` | Same. |

---

## 12. Panel Header Padding Mismatch

Three side panels use slightly different header padding, creating visual inconsistency when switching between them.

| # | File:Line | Current | Should Be | Notes |
|---|-----------|---------|-----------|-------|
| 12.1 | `Inspector.tsx:42` | `padding: '8px 12px'` | `'12px 16px'` (S[3], S[4]) | Tighter than siblings. |
| 12.2 | `TimelineView.tsx:54` | `padding: '10px 14px'` | `'12px 16px'` (S[3], S[4]) | 10 and 14 are off-grid. |
| 12.3 | `MemoryShelf.tsx:89` | `padding: '12px 14px'` | `'12px 16px'` (S[3], S[4]) | 14 is off-grid. |

**All three panels should use identical header padding**: `'12px 16px'` (S[3] vertical, S[4] horizontal).

---

## 13. Panel Top/Bottom Offset Mismatch

Inspector and Timeline panels have different top/bottom offsets, meaning they don't align with each other or the status bar.

| # | File:Line | Current | Issue |
|---|-----------|---------|-------|
| 13.1 | `Inspector.tsx:25-26` | `top: 36, bottom: 32` | Top offset accounts for something (session pill?), bottom for status bar (24px + 8px margin?). |
| 13.2 | `TimelineView.tsx:39-41` | `top: 0, bottom: 0` | Full height — overlaps status bar (24px) and session pill area. |
| 13.3 | `MemoryShelf.tsx:72-74` | `top: 0, bottom: 0` | Same — full height, overlaps status bar. |

**Fix**: All slide-out panels should use consistent offsets. Recommend `top: 0, bottom: 24` (StatusBar height) for Timeline and MemoryShelf, matching the status bar clearance pattern. Or `top: 0, bottom: 0` for all if panels should cover the status bar.

---

## 14. StatusBar Height Token

StatusBar uses `height: 24` but this isn't referenced elsewhere as a token. Other components need to know this value.

| # | Action |
|---|--------|
| 14.1 | Add `export const STATUS_BAR_H = 24;` to theme.ts and use it in StatusBar and for panel bottom offsets. |

---

## 15. Close Button Inconsistency

Close buttons across panels use different SVG sizes and touch target sizes.

| # | File:Line | SVG Size | Touch Target | Fix |
|---|-----------|----------|-------------|-----|
| 15.1 | `Inspector.tsx:72` | 11x11 | 24x24 | Good touch target. |
| 15.2 | `TimelineView.tsx:66-67` | 10x10 | Unspecified (just `padding: 2`) | **Too small**. Add `minWidth: 24, minHeight: 24`. |
| 15.3 | `MemoryShelf.tsx:98-99` | 10x10 | Unspecified (`padding: 2`) | Same — too small. |
| 15.4 | `LearnOverlay.tsx:216-217` | 14x14 | 24x24 | Good. |
| 15.5 | `ShortcutsHelp.tsx:80` | 10x10 | 24x24 | Good target but SVG is smaller than siblings. Standardize to 12x12 across all close buttons. |
| 15.6 | `MemoryShelf.tsx:151` | 8x8 | Unspecified (`padding: 2`) | Memory delete. Very small. Add min 24x24 target. |
| 15.7 | `SessionPill.tsx:249` | 8x8 | 20x20 | Session delete. Borderline small. Recommend 24x24. |

**Standardize**: All close/delete buttons should have `minWidth: 24, minHeight: 24` touch targets and use consistent SVG icon size (12x12 for close, 10x10 for inline delete).

---

## 16. Accessibility Gaps

| # | Issue | Fix |
|---|-------|-----|
| 16.1 | No `aria-label` on icon-only buttons | Add `aria-label` to: timeline toggle, close buttons, delete buttons, nav arrows in PathTrace. |
| 16.2 | ContextMenu items are `<div>` not `<button>` | Change to `<button>` or add `role="menuitem"` and `tabIndex={0}`. |
| 16.3 | Model dropdown items are `<div>` not `<button>` | Same fix. |
| 16.4 | Timeline message items are `<div>` not `<button>` | Add `role="button"` and `tabIndex={0}`, or use `<button>`. |
| 16.5 | Session list items clickable `<div>` | Same. |
| 16.6 | No focus-visible styles anywhere | Add `:focus-visible` outline using `ACCENT_30` ring. |

---

## Priority Order

**P0 — Visual consistency** (spacing, radius, font-size normalization):
1.1-1.35, 3.1-3.10, 6.1-6.27, 12.1-12.3

**P1 — Token adoption** (hardcoded colors, transitions):
2.1-2.21, 4.1-4.5, 5.1-5.8, 7.1-7.31

**P2 — Interaction quality** (missing transitions, touch targets, close buttons):
7.21-7.31, 10.1-10.11, 15.1-15.7

**P3 — Architecture / accessibility**:
8.1-8.4, 9.1-9.2, 11.1-11.5, 13.1-13.3, 14.1, 16.1-16.6
