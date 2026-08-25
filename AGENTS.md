## Package manager

Use **pnpm**.

## Supabase local database safety

Preserve the default local Supabase database when applying or verifying migrations. Use `pnpm exec supabase migration up --local` for pending migrations and run the existing verification commands against that database.

Never run `supabase db reset` against the default local stack. It recreates the database and deletes local Auth users, the Admin allowlist, and local content; `--no-seed` does not preserve them. Do not perform a clean migration replay as part of routine local verification. If one is explicitly requested, stop and agree on a safe verification environment with the user first. Read `docs/local-development.md` for the local workflow.

## Agent skills

### Issue tracker

For issue operations, use this repo's GitHub Issues via `gh`; read `docs/agents/issue-tracker.md`.

### Triage labels

For triage work, use the canonical label mapping in `docs/agents/triage-labels.md`.

### Project structure

Before adding or moving code under `src/`, read `docs/agents/project-structure.md`.

### Domain docs

Before exploring the codebase or doing domain work, read `docs/agents/domain.md`.

### UI and styling

Before changing pages, UI components, themes, styles, or responsive behavior, read and follow:

- `docs/agents/visual-style.md` for presentation constraints;
- `docs/agents/styling.md` for implementation, responsive, and animation rules.

### Icons

Before adding, changing, or deleting a shared icon, read `src/components/icons/README.md` and use its inventory and implementation rules.

### Demo directory

Treat everything under `demo/` as isolated experimental material. Do not read, inspect, search, or use files in `demo/` as implementation references unless the user explicitly asks you to reference them for the current task.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
