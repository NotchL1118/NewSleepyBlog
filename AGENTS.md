## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles map 1:1 to labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Visual style

Before creating or changing pages, UI components, themes, or styles, read and follow `docs/agents/visual-style.md`.

The guide governs visual presentation only. Do not use it to infer or alter content structure, page modules, feature priority, or product behavior unless the task explicitly requests those changes.

### Demo directory

Treat everything under `demo/` as isolated experimental material. Do not read, inspect, search, or use files in `demo/` as implementation references unless the user explicitly asks you to reference them for the current task.
