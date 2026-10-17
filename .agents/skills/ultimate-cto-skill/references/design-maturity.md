# Design Maturity

Read this when doing serious UI/UX design work — going beyond "build a page" into a proper design
process, motion, theming, or a pre-launch visual QA pass.

## 1. Wireframe → Prototype → Hi-Fi Flow

Don't jump straight to pixel-perfect UI. Move through stages deliberately:

1. **Low-fi wireframe** — grayscale boxes, real layout/hierarchy, no color/type decisions yet.
   Goal: validate information architecture and flow before investing in visuals.
2. **Mid-fi / clickable prototype** — real copy where possible, basic interaction flow, still
   minimal styling. Goal: validate the user journey (can they actually complete the task?).
3. **Hi-fi** — full design system applied: real type, color, spacing, imagery, states
   (hover/active/disabled/error/empty/loading).
4. **Handoff** — see the `design:design-handoff` skill (if available) for producing a developer-ready spec
   (tokens, breakpoints, component states, interaction notes) once hi-fi is approved. If it is
   not available, write that spec yourself: tokens, breakpoints, component states, interaction notes.

Never skip straight to hi-fi on anything with real UX risk (a new flow, a complex form, checkout)
— the cost of restructuring hi-fi mockups is much higher than restructuring wireframes.

## 2. Motion & Micro-interactions

- Motion should communicate, not decorate: state change, spatial relationship, or feedback —
  never animation for its own sake.
- Keep it fast: 120-200ms for small UI transitions, 200-350ms for larger surface changes
  (`--duration-fast` / `--duration-base` / `--duration-slow` tokens). Anything slower feels laggy.
- Use easing that feels physical (`ease-out` for entrances, `ease-in` for exits) rather than
  linear.
- Always respect `prefers-reduced-motion` — provide a reduced/no-motion variant, not just a faster one.
- Reserve larger, delightful animation (confetti, big transitions) for genuinely rare
  celebration moments — overusing it cheapens the effect and hurts perceived performance.

## 3. Dark Mode

- Don't just invert colors — build a real dark palette: reduce pure black/white (`#0b0d10`
  background, off-white text) to reduce eye strain and halo effect.
- Re-check contrast ratios independently in dark mode; a pairing that passes AA in light mode
  often fails in dark.
- Elevation in dark mode is usually shown with lighter surface color, not just shadow (shadows
  barely read on dark backgrounds) — use a surface-elevation token scale.
- Test brand colors in both modes — saturated brand colors often need slightly desaturating for
  dark backgrounds to avoid vibrating against the dark background.
- Implement via the token layer (`--color-*` variables swapped under a `[data-theme="dark"]` or
  `prefers-color-scheme` media query), never hardcoded per-component colors.

## 4. Design QA Checklist (run before every launch)

- [ ] Pixel-check hi-fi vs. built product at 3+ breakpoints — spacing, type size, alignment match
- [ ] Every interactive state exists and looks right: hover, focus, active, disabled, loading, error, empty, success
- [ ] Consistent spacing scale used throughout (no arbitrary one-off pixel values)
- [ ] Text truncation/wrapping checked with real (long) content, not just short placeholder text
- [ ] Images/icons crisp at all target resolutions (no blurry @1x assets on retina)
- [ ] Dark mode (if supported) checked on every screen, not just the homepage
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Cross-browser check (Chrome, Safari, Firefox) and real-device check (not just DevTools emulation)
