create table public.post_groups (
  id bigint generated always as identity primary key,
  kind text not null,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_groups_kind_check
    check (kind in ('regular', 'heartwork')),
  constraint post_groups_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint post_groups_id_kind_key unique (id, kind),
  constraint post_groups_kind_slug_key unique (kind, slug)
);

create unique index post_groups_kind_name_key
  on public.post_groups (kind, lower(name));

create table public.posts (
  id bigint generated always as identity primary key,
  kind text not null,
  group_id bigint,
  title text,
  slug text,
  summary text,
  body_markdown text not null default '',
  status text not null default 'draft',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  archive_note text,
  constraint posts_kind_check
    check (kind in ('regular', 'heartwork')),
  constraint posts_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint posts_slug_check
    check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint posts_group_kind_fkey
    foreign key (group_id, kind)
    references public.post_groups (id, kind)
    on delete restrict,
  constraint posts_public_content_check
    check (
      status = 'draft'
      or (
        nullif(btrim(title), '') is not null
        and nullif(btrim(slug), '') is not null
        and nullif(btrim(body_markdown), '') is not null
        and group_id is not null
        and published_at is not null
      )
    ),
  constraint posts_archive_fields_check
    check (
      (
        status = 'archived'
        and archived_at is not null
      )
      or (
        status <> 'archived'
        and archived_at is null
        and archive_note is null
      )
    )
);

create unique index posts_slug_key
  on public.posts (slug)
  where slug is not null;

create index posts_kind_status_published_id_idx
  on public.posts (kind, status, published_at desc, id desc);

create index posts_group_kind_status_published_id_idx
  on public.posts (group_id, kind, status, published_at desc, id desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create function public.enforce_post_immutable_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception using
      errcode = '23514',
      message = 'Post kind cannot change after creation.';
  end if;

  return new;
end;
$$;

create trigger post_groups_set_updated_at
before update on public.post_groups
for each row execute function public.set_updated_at();

create trigger posts_enforce_immutable_fields
before update on public.posts
for each row execute function public.enforce_post_immutable_fields();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.post_groups enable row level security;
alter table public.posts enable row level security;

create policy "Post Groups are readable by Readers"
on public.post_groups
for select
to anon, authenticated
using (true);

create policy "Admin can create Post Groups"
on public.post_groups
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admin can update Post Groups"
on public.post_groups
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admin can delete Post Groups"
on public.post_groups
for delete
to authenticated
using ((select private.is_admin()));

create policy "Public Posts are readable by Readers"
on public.posts
for select
to anon
using (status in ('published', 'archived'));

create policy "Authenticated Readers can read allowed Posts"
on public.posts
for select
to authenticated
using (
  status in ('published', 'archived')
  or (select private.is_admin())
);

create policy "Admin can create Posts"
on public.posts
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admin can update Posts"
on public.posts
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke all on table public.post_groups, public.posts
  from public, anon, authenticated;
grant select on table public.post_groups, public.posts
  to anon, authenticated;
grant insert, update, delete on table public.post_groups
  to authenticated;
grant insert, update on table public.posts
  to authenticated;

revoke all on sequence public.post_groups_id_seq, public.posts_id_seq
  from public, anon, authenticated;
grant usage on sequence public.post_groups_id_seq, public.posts_id_seq
  to authenticated;

create function public.create_post_draft(
  p_kind text,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default ''
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_post public.posts;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can create Post drafts.';
  end if;

  insert into public.posts (
    kind,
    group_id,
    title,
    slug,
    summary,
    body_markdown,
    status
  )
  values (
    p_kind,
    p_group_id,
    p_title,
    p_slug,
    p_summary,
    coalesce(p_body_markdown, ''),
    'draft'
  )
  returning * into created_post;

  return created_post;
end;
$$;

comment on function public.create_post_draft(text, bigint, text, text, text, text) is
  'Creates an incomplete Draft Post for the authenticated Sleepy Admin.';

create function public.update_post_draft(
  p_post_id bigint,
  p_expected_updated_at timestamptz,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default ''
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_post public.posts;
  current_post public.posts;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Post drafts.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post updated_at value is required.';
  end if;

  update public.posts
  set
    group_id = p_group_id,
    title = p_title,
    slug = p_slug,
    summary = p_summary,
    body_markdown = coalesce(p_body_markdown, '')
  where id = p_post_id
    and status = 'draft'
    and updated_at = p_expected_updated_at
  returning * into updated_post;

  if found then
    return updated_post;
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Post draft %s was not found.', p_post_id);
  end if;

  if current_post.status <> 'draft' then
    raise exception using
      errcode = '22023',
      message = format('Post %s is not a Draft Post.', p_post_id);
  end if;

  raise exception using
    errcode = '40001',
    message = format(
      'Post draft %s has changed since it was loaded.',
      p_post_id
    );
end;
$$;

comment on function public.update_post_draft(bigint, timestamptz, bigint, text, text, text, text) is
  'Updates a Draft Post only when its observed updated_at value is current.';

revoke all on function public.set_updated_at()
  from public, anon, authenticated;
revoke all on function public.enforce_post_immutable_fields()
  from public, anon, authenticated;
revoke all on function public.create_post_draft(text, bigint, text, text, text, text)
  from public, anon;
revoke all on function public.update_post_draft(bigint, timestamptz, bigint, text, text, text, text)
  from public, anon;
grant execute on function public.create_post_draft(text, bigint, text, text, text, text)
  to authenticated;
grant execute on function public.update_post_draft(bigint, timestamptz, bigint, text, text, text, text)
  to authenticated;
