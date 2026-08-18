# Local development

This is the operator guide for a fixture-free local Sleepy environment. Local verification uses forward migrations. Do not reset a database that already has a GitHub Auth user or Admin allowlist row.

Authentication details live in [auth-setup.md](./auth-setup.md). The isolated experimental directory under `demo/` is not part of this workflow.

## First-time setup

1. Copy `.env.example` to `.env.local`.
2. Create a local GitHub OAuth App and fill in the public Supabase values plus `SUPABASE_AUTH_GITHUB_CLIENT_ID` and `SUPABASE_AUTH_GITHUB_SECRET`, as described in [auth-setup.md](./auth-setup.md).
3. Start the local stack:

```bash
pnpm exec supabase start
pnpm exec supabase migration up --local
pnpm dev
```

`supabase start` applies pending migrations on a new local database. `migration up --local` is the repeatable forward-migration command for an existing local database.

Do **not** run `supabase db reset` to pick up later Post migrations. Reset replays seed and recreates Auth, which deletes the existing GitHub user and the private Admin allowlist.

## Minimal seed

`supabase/seed.sql` exists so a reset-based bootstrap has a seed file, but it contains no Posts, Post Groups, or Tags. Local content starts empty. Create Categories, Columns, Tags, Regular Posts, and Heartworks through Studio.

Seed only runs after a database reset. Forward migration does not re-run seed and does not insert demo content.

## Bootstrap the sole Admin

1. Sign in through GitHub on `http://localhost:3000`.
2. Open local Supabase Studio at `http://127.0.0.1:54323`.
3. Copy the user UUID from Authentication → Users.
4. Run this one-time statement in the SQL editor:

```sql
insert into private.site_admins (user_id)
values ('<supabase-user-uuid>');
```

The table allows at most one Admin. The application has no self-promotion endpoint. After the insert, reload `/dashboard` as that signed-in user.

## Generated types

After applying new content migrations, regenerate and commit TypeScript types from the local schema:

```bash
pnpm exec supabase gen types --local > src/types/database.generated.ts
```

The committed file must cover the content tables and invoker RPCs in `public`.

## Automated verification

Run these against the existing local database. None of them reset Auth or the Admin allowlist.

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
```

`pnpm test` runs the application `node:test` files and the complete local pgTAP suite. Do not add Playwright, Vitest, a deterministic test login, a second Supabase stack, or a CI workflow for this content loop.

Do not push migrations to the remote project from this workflow, and do not deploy production as part of local verification.

## Manual smoke test

Use the current GitHub Admin. Start from an empty or known local content library, not from hardcoded fixtures.

1. **Draft privacy.** In Studio, create a Regular Post, save an incomplete draft, and confirm the public Regular Post route for that Slug returns 404. An anonymous Reader must not see the draft.
2. **Regular Post publication.** Add a title, kebab-case Slug, Markdown body, and a Category, then publish. Stay in Studio and open the provided public link. The Regular Post detail must render.
3. **Homepage and detail freshness.** Reload `/`. The new Published Regular Post must appear in “最近写下”. Opening it from the homepage must show the same title and body.
4. **Update cache invalidation.** Withdraw the Published Regular Post to Draft, change the Markdown body, and publish it again. Reload the public detail and homepage without restarting the app. Both must show the new text immediately. The Studio editor currently requires this withdraw-then-publish path; it does not edit a Published Post in place.
5. **Withdrawal to 404.** Withdraw the republished Regular Post to Draft. The public Regular Post URL must return 404, and the homepage must stop listing it.
6. **Heartwork route boundaries.** Publish a Heartwork. It must open at `/heartworks/<slug>` and return 404 at `/posts/<slug>`. A Regular Post must return 404 at `/heartworks/<slug>`.
7. **Archived Post presentation.** Archive a Published Regular Post or Heartwork, optionally with a plain-text archive note. The original public URL must still render, show the archive notice, and stay off the homepage and adjacent recommendations.

If the homepage, public Regular Post or Heartwork readers, Regular Post Studio, or Heartwork Studio still show fixture titles such as “把复杂的事情慢慢说清楚” or “夜里适合读些什么”, the environment is reading leftover demo data and is not the fixture-free workflow. Unimplemented Studio shells such as comments and independent grouping pages are outside this content loop.
