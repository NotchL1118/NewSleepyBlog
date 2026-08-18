# Authentication setup

Sleepy uses Supabase Auth with GitHub OAuth. Readers and the single Admin use the same login button; Admin access is granted separately through the private database allowlist.

## Local development

1. Create a GitHub OAuth App for local development.
2. Set its homepage URL to `http://localhost:3000` and its authorization callback URL to `http://localhost:54321/auth/v1/callback`.
3. Copy `.env.example` to `.env.local` and fill in the public Supabase values plus `SUPABASE_AUTH_GITHUB_CLIENT_ID` and `SUPABASE_AUTH_GITHUB_SECRET`.
4. Start Supabase locally, apply pending migrations with `pnpm exec supabase migration up --local`, and start the Next.js app. Do not reset an existing local database just to apply later migrations; reset deletes the GitHub Auth user and the Admin allowlist.

The application callback registered in the local Supabase allowlist is `http://localhost:3000/auth/callback`.

The full local operator workflow, empty seed, generated types, verification commands, and manual smoke test live in [local-development.md](./local-development.md).

## Production

The canonical production origin is `https://lsyfighting.cn`. Vercel Preview deployments are intentionally not authorized for login.

In the GitHub OAuth App, use:

- Homepage URL: `https://lsyfighting.cn`
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

In Supabase Authentication URL Configuration, use:

- Site URL: `https://lsyfighting.cn`
- Redirect URL: `https://lsyfighting.cn/auth/callback`
- Local redirect URL: `http://localhost:3000/auth/callback`

Configure these Vercel environment variables:

- `NEXT_PUBLIC_SITE_URL=https://lsyfighting.cn`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The GitHub client secret belongs in the Supabase provider configuration, not in Vercel or any `NEXT_PUBLIC_` variable.

## Bootstrap the Admin

After signing in through GitHub once, copy that Auth UUID from Supabase Authentication → Users and run this one-time statement in the SQL editor:

```sql
insert into private.site_admins (user_id)
values ('<supabase-user-uuid>');
```

The database permits at most one row in `private.site_admins`. The application has no self-promotion or first-login-wins endpoint.
