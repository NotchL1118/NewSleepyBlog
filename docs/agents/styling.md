# Styling Conventions

Use these rules when creating or changing pages, UI components, themes, or styles.

## Rules

1. **Prefer Tailwind CSS.** Use utilities for layout, spacing, sizing, color, typography, responsive behavior, dark mode, and common interaction states.
2. **Keep shared tokens global.** Define colors, fonts, and other design tokens in `src/app/globals.css`, then consume them through semantic Tailwind utilities. Do not repeat raw values in components.
3. **Use CSS Modules for genuinely complex styles.** Appropriate cases include complex pseudo-elements, selectors, gradients, masks, keyframes, rich-text content, and third-party overrides. Do not force these into unreadable utility strings.
4. **Keep component styles colocated.** Components with private styles use this structure:

   ```text
   ArticleCard/
   ├── index.tsx
   └── index.module.css
   ```

5. **Keep global CSS minimal.** Global CSS is limited to the Tailwind entry point, theme tokens, resets, base element styles, and effects that are truly global.
6. **Avoid recreating Tailwind with `@apply`.** Keep ordinary utilities in JSX; put only the complex portion of a style in a CSS Module.

When Tailwind and a CSS Module are both appropriate, use Tailwind for the component's ordinary structure and appearance, and the CSS Module for the exceptional effect.

## Responsive design

- Build mobile-first: base styles target narrow screens, then Tailwind breakpoint variants progressively enhance wider layouts.
- Implement responsive behavior with the initial page or component change rather than deferring it after the desktop layout.
- Check every changed page or component at mobile and desktop widths. Content must remain readable, controls usable, spacing appropriate, and the page free of unintended horizontal overflow.

## Animation

- Prefer CSS transitions for simple hover, focus, color, opacity, and transform effects.
- Use Motion for React component enter/exit transitions, layout changes, and gesture-driven interactions.
- Use GSAP for complex timelines, coordinated multi-element sequences, SVG animation, or advanced scroll-driven effects.
- Do not let Motion and GSAP control the same element or interaction unless there is a clear technical reason.
- Prefer animating `transform` and `opacity`; avoid properties that trigger frequent layout recalculation when a transform can produce the same result.
- Keep animation subtle, infrequent, and functional, consistent with the visual style guide.
- Respect `prefers-reduced-motion`, and clean up animations when components unmount.
