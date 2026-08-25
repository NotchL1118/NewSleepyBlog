create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table private.site_admins is
  'Private allowlist containing the single Sleepy Admin.';

create unique index site_admins_single_row_idx
  on private.site_admins ((true));

revoke all on table private.site_admins from public, anon, authenticated;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.site_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

comment on function public.is_admin() is
  'Returns whether the authenticated caller is the Sleepy Admin.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
