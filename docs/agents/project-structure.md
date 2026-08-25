# Project Structure

Where code lives under `src/`, and the rules for placing new files. The former `src/features/` directory was removed on purpose — do not recreate it.

## Layout

```text
src/
├── app/          # Routes; route-local components and helpers colocated inside
├── components/   # UI shared across route groups
├── lib/          # Environment-agnostic logic and types; small client-only helpers
├── server/       # Server-only data access and Server Actions
├── utils/        # Third-party client factories (e.g. utils/supabase)
└── types/        # Generated types (database.generated.ts)
```

## Placement rules

1. **Route-local code colocates in `app/`.** A component, hook, or helper used by a single route group lives in a `components/` or `lib/` folder inside that segment, without an underscore prefix (for example `src/app/(studio)/dashboard/components/PostEditor.tsx`). Folders in `app/` that contain no `page.tsx` or `route.ts` are not routable, so these paths 404 by design. Import route-local code with relative paths, not the `@/` alias.
2. **`src/components/` is only for UI shared across route groups** (icons, Toast, theme, markdown rendering). If something is used by one section only, colocate it in `app/` instead. Icon rules stay as documented in `src/components/icons/README.md`.
3. **`src/server/` holds everything that must only run on the server**: files that use `@/utils/supabase/server`, `next/headers`, or (in the future) secrets. Every file's first line must be `import "server-only"` (queries) or `"use server"` (Server Actions, named `actions.ts` per domain). This makes accidental client imports a build error. Client components may still take types from these files via `import type`.
4. **`src/lib/` holds logic that does not care where it runs**: domain types, constants, pure functions (`lib/posts/`, `lib/auth/`). Anything here can end up in the browser bundle, so never put secrets or server APIs in it. Client-only non-component logic (for example `lib/auth/client.ts`, `lib/auth/useSignOut.ts`) also lives here, marked `"use client"`.
5. **Dependency direction is one-way**: `app` may import `server`, `components`, and `lib`; `server` and `components` may import `lib`; `lib` imports none of the others. The `server-only` guard enforces the server side of this at build time.

## Client–server communication

- **Reads**: Server Components call query functions from `src/server/` directly. Public pages use the anonymous client (`@/utils/supabase/public`) with `"use cache"` + cache tags; Studio pages use the cookie-bound client (`@/utils/supabase/server`) under RLS.
- **Writes**: client components submit forms to Server Actions in `src/server/*/actions.ts` via `useActionState`. Multi-table atomic writes go through Postgres RPC functions defined in `supabase/migrations/` (supabase-js has no transactions); simple single-table writes may use the query builder directly inside the action.
- **No REST API routes.** Do not add `app/api/` handlers unless an external caller (webhook, OAuth callback) requires an HTTP endpoint.
