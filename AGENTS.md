## Package manager

This project uses **pnpm** for package management.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Visual style

Before creating or changing pages, UI components, themes, or styles, read and follow both:

- `docs/agents/visual-style.md` for visual direction;
- `docs/agents/styling.md` for styling implementation conventions.

The visual style guide governs visual presentation only. Do not use it to infer or alter content structure, page modules, feature priority, or product behavior unless the task explicitly requests those changes.

### Responsive design

Build responsive behavior from the start; do not finish a desktop-only layout and defer mobile adaptation. Use a mobile-first approach: base styles target narrow screens, and Tailwind breakpoint variants progressively enhance wider layouts. Every page or component change must be checked at both mobile and desktop widths for readable content, usable controls, appropriate spacing, and no unintended horizontal overflow.

### Icons

All shared SVG icons live in a single module: `src/components/icons/index.tsx`. The inventory and reuse rules live beside it in `src/components/icons/README.md`.

- **Before adding an icon**, read `src/components/icons/README.md` and reuse an existing export when it fits (same or close meaning).
- Define each icon as a named exported function in `index.tsx` only (for example `export function MenuIcon`). Import from `@/components/icons`; do not re-declare the same SVG inline in feature or UI components.
- Size and color via `className` / `currentColor`; keep icons decorative with `aria-hidden="true"` unless accessibility requires otherwise.
- When you add, rename, or delete an icon, update the inventory table in `README.md` in the **same change**. Do not paste SVG paths into the README.
- Do not create per-icon files, icon object maps, or a separate icon library package unless the task explicitly requires it.

### Demo directory

Treat everything under `demo/` as isolated experimental material. Do not read, inspect, search, or use files in `demo/` as implementation references unless the user explicitly asks you to reference them for the current task.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
