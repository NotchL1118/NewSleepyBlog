-- Establish the final Post content model before the first remote deployment.
-- Keep this baseline immutable after it has been deployed.

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
  constraint post_groups_name_check
    check (name ~ '[^[:space:]]'),
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
        title ~ '[^[:space:]]'
        and nullif(btrim(slug), '') is not null
        and body_markdown ~ '[^[:space:]]'
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

create index posts_kind_updated_id_idx
  on public.posts (kind, updated_at desc, id desc);

create index posts_kind_status_updated_id_idx
  on public.posts (kind, status, updated_at desc, id desc);

create table public.tags (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_check check (name ~ '[^[:space:]]'),
  constraint tags_name_length_check
    check (char_length(name) between 1 and 80),
  constraint tags_name_no_whitespace_check
    check (name !~ '[[:space:]]')
);

create unique index tags_name_key on public.tags (lower(name));

create table public.post_tags (
  post_id bigint not null
    references public.posts (id) on delete cascade,
  tag_id bigint not null
    references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create index post_tags_tag_id_idx on public.post_tags (tag_id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Uses the statement timestamp so first publication and its initial update share one value.';

create trigger post_groups_set_updated_at
before update on public.post_groups
for each row execute function public.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

create function public.prevent_post_kind_change()
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

create trigger posts_prevent_kind_change
before update on public.posts
for each row execute function public.prevent_post_kind_change();

create function public.prevent_first_publication_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.published_at is not null
    and new.published_at is distinct from old.published_at
  then
    raise exception using
      errcode = '23514',
      message = 'Post first publication time cannot change.';
  end if;

  if old.published_at is not null
    and new.slug is distinct from old.slug
  then
    raise exception using
      errcode = '23514',
      message = 'Post Slug cannot change after first publication.';
  end if;

  return new;
end;
$$;

create trigger posts_prevent_first_publication_change
before update on public.posts
for each row execute function public.prevent_first_publication_change();

revoke all on function public.set_updated_at()
  from public, anon, authenticated;
revoke all on function public.prevent_post_kind_change()
  from public, anon, authenticated;
revoke all on function public.prevent_first_publication_change()
  from public, anon, authenticated;

alter table public.post_groups enable row level security;
alter table public.posts enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;

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

create policy "Admin can delete Posts"
on public.posts
for delete
to authenticated
using ((select private.is_admin()));

create policy "Tags are readable by Readers"
on public.tags
for select
to anon, authenticated
using (true);

create policy "Admin can create Tags"
on public.tags
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admin can update Tags"
on public.tags
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Admin can delete Tags"
on public.tags
for delete
to authenticated
using ((select private.is_admin()));

create policy "Post Tags are readable by Readers"
on public.post_tags
for select
to anon, authenticated
using (true);

create policy "Admin can create Post Tags"
on public.post_tags
for insert
to authenticated
with check ((select private.is_admin()));

create policy "Admin can delete Post Tags"
on public.post_tags
for delete
to authenticated
using ((select private.is_admin()));

revoke all on table public.post_groups, public.posts, public.tags, public.post_tags
  from public, anon, authenticated;
grant select on table public.post_groups, public.posts, public.tags, public.post_tags
  to anon, authenticated;
grant insert, update, delete on table public.post_groups
  to authenticated;
grant insert, update, delete on table public.posts
  to authenticated;
grant insert, delete on table public.tags
  to authenticated;
grant update (name) on table public.tags
  to authenticated;
grant insert, delete on table public.post_tags
  to authenticated;

revoke all on sequence public.post_groups_id_seq, public.posts_id_seq, public.tags_id_seq
  from public, anon, authenticated;
grant usage on sequence public.post_groups_id_seq, public.posts_id_seq, public.tags_id_seq
  to authenticated;

-- Taxonomy resources and immutable identities.

create function public.prevent_post_group_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind then
    raise exception using
      errcode = '23514',
      message = 'Post Group kind cannot change after creation.';
  end if;

  if new.slug is distinct from old.slug then
    raise exception using
      errcode = '23514',
      message = 'Post Group Slug cannot change after creation.';
  end if;

  return new;
end;
$$;

create trigger post_groups_prevent_identity_change
before update on public.post_groups
for each row execute function public.prevent_post_group_identity_change();

revoke all on function public.prevent_post_group_identity_change()
  from public, anon, authenticated;

create function public.create_post_group(
  p_kind text,
  p_name text,
  p_slug text,
  p_description text default null
)
returns public.post_groups
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_group public.post_groups;
  conflicting_constraint text;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can create Post Groups.';
  end if;

  if p_kind is null or p_kind not in ('regular', 'heartwork') then
    raise exception using
      errcode = '22023',
      message = 'Post Group kind must be regular or heartwork.';
  end if;

  if p_name is null or p_name !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Post Group name is required.';
  end if;

  if nullif(btrim(p_slug), '') is null
    or btrim(p_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  then
    raise exception using
      errcode = '22023',
      message = 'Post Group Slug must use lowercase ASCII kebab-case.';
  end if;

  begin
    insert into public.post_groups (kind, name, slug, description)
    values (
      p_kind,
      btrim(p_name),
      btrim(p_slug),
      nullif(btrim(p_description), '')
    )
    returning * into created_group;
  exception when unique_violation then
    get stacked diagnostics conflicting_constraint = constraint_name;

    raise exception using
      errcode = '23505',
      hint = case conflicting_constraint
        when 'post_groups_kind_name_key' then 'group_name_taken'
        else 'group_slug_taken'
      end,
      message = case conflicting_constraint
        when 'post_groups_kind_name_key' then 'That Post Group name is already taken.'
        else 'That Post Group Slug is already taken.'
      end;
  end;

  return created_group;
end;
$$;

create function public.update_post_group(
  p_group_id bigint,
  p_expected_updated_at timestamptz,
  p_name text,
  p_description text default null
)
returns public.post_groups
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_group public.post_groups;
  updated_group public.post_groups;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Post Groups.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post Group updated_at value is required.';
  end if;

  if p_name is null or p_name !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Post Group name is required.';
  end if;

  select *
  into current_group
  from public.post_groups
  where id = p_group_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      hint = 'group_missing',
      message = 'The Post Group was not found.';
  end if;

  if current_group.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The Post Group has changed since it was loaded.';
  end if;

  begin
    update public.post_groups
    set
      name = btrim(p_name),
      description = nullif(btrim(p_description), '')
    where id = p_group_id
    returning * into updated_group;
  exception when unique_violation then
    raise exception using
      errcode = '23505',
      hint = 'group_name_taken',
      message = 'That Post Group name is already taken.';
  end;

  return updated_group;
end;
$$;

create function public.delete_post_group(
  p_group_id bigint,
  p_expected_updated_at timestamptz
)
returns public.post_groups
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_group public.post_groups;
  deleted_group public.post_groups;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can delete Post Groups.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post Group updated_at value is required.';
  end if;

  select *
  into current_group
  from public.post_groups
  where id = p_group_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      hint = 'group_missing',
      message = 'The Post Group was not found.';
  end if;

  if current_group.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The Post Group has changed since it was loaded.';
  end if;

  begin
    delete from public.post_groups
    where id = p_group_id
    returning * into deleted_group;
  exception when foreign_key_violation then
    raise exception using
      errcode = '23503',
      hint = 'group_in_use',
      message = 'The Post Group is still referenced by Posts.';
  end;

  return deleted_group;
end;
$$;

create function public.update_tag(
  p_tag_id bigint,
  p_expected_updated_at timestamptz,
  p_name text
)
returns public.tags
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_tag public.tags;
  updated_tag public.tags;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Tags.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Tag updated_at value is required.';
  end if;

  if p_name is null or p_name !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Tag name is required.';
  end if;

  select *
  into current_tag
  from public.tags
  where id = p_tag_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      hint = 'tag_missing',
      message = 'The Tag was not found.';
  end if;

  if current_tag.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The Tag has changed since it was loaded.';
  end if;

  begin
    update public.tags
    set name = btrim(p_name)
    where id = p_tag_id
    returning * into updated_tag;
  exception when unique_violation then
    raise exception using
      errcode = '23505',
      hint = 'tag_name_taken',
      message = 'That Tag name is already taken.';
  end;

  return updated_tag;
end;
$$;

create function public.delete_tag(
  p_tag_id bigint,
  p_expected_updated_at timestamptz
)
returns public.tags
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_tag public.tags;
  deleted_tag public.tags;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can delete Tags.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Tag updated_at value is required.';
  end if;

  select *
  into current_tag
  from public.tags
  where id = p_tag_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      hint = 'tag_missing',
      message = 'The Tag was not found.';
  end if;

  if current_tag.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'The Tag has changed since it was loaded.';
  end if;

  delete from public.tags
  where id = p_tag_id
  returning * into deleted_tag;

  return deleted_tag;
end;
$$;

revoke all on function public.create_post_group(text, text, text, text)
  from public, anon;
revoke all on function public.update_post_group(bigint, timestamptz, text, text)
  from public, anon;
revoke all on function public.delete_post_group(bigint, timestamptz)
  from public, anon;
revoke all on function public.update_tag(bigint, timestamptz, text)
  from public, anon;
revoke all on function public.delete_tag(bigint, timestamptz)
  from public, anon;

grant execute on function public.create_post_group(text, text, text, text)
  to authenticated;
grant execute on function public.update_post_group(bigint, timestamptz, text, text)
  to authenticated;
grant execute on function public.delete_post_group(bigint, timestamptz)
  to authenticated;
grant execute on function public.update_tag(bigint, timestamptz, text)
  to authenticated;
grant execute on function public.delete_tag(bigint, timestamptz)
  to authenticated;

-- Final Tag and Post mutation interfaces.

create function public.create_tag(p_name text)
returns public.tags
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := btrim(p_name);
  resolved_tag public.tags;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can create Tags.';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception using
      errcode = '22023',
      message = 'Tag name is required.';
  end if;

  if normalized_name ~ '[[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Tag name cannot contain whitespace.';
  end if;

  if char_length(normalized_name) > 80 then
    raise exception using
      errcode = '22023',
      message = 'Tag name cannot exceed 80 characters.';
  end if;

  select *
  into resolved_tag
  from public.tags
  where lower(name) = lower(normalized_name);

  if found then
    return resolved_tag;
  end if;

  begin
    insert into public.tags (name)
    values (normalized_name)
    returning * into resolved_tag;
  exception when unique_violation then
    -- A concurrent request may have inserted the same case-insensitive name
    -- after the lookup. Resolve that row so creation remains idempotent.
    select *
    into resolved_tag
    from public.tags
    where lower(name) = lower(normalized_name);

    if not found then
      raise;
    end if;
  end;

  return resolved_tag;
end;
$$;

comment on function public.create_tag(text) is
  'Creates a whitespace-free Tag name or returns the existing case-insensitive match.';

revoke all on function public.create_tag(text) from public, anon;
grant execute on function public.create_tag(text) to authenticated;

create function private.replace_post_tags(
  p_post_id bigint,
  p_tag_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Post Tags.';
  end if;

  delete from public.post_tags where post_id = p_post_id;

  begin
    insert into public.post_tags (post_id, tag_id)
    select p_post_id, selected_tag_id
    from (
      select distinct unnest(coalesce(p_tag_ids, '{}'::bigint[]))
        as selected_tag_id
    ) as selected_tags;
  exception when foreign_key_violation then
    raise exception using
      errcode = '23503',
      hint = 'tag_missing',
      message = 'One of the selected Tags no longer exists.';
  end;
end;
$$;

revoke all on function private.replace_post_tags(bigint, bigint[])
  from public, anon;
grant execute on function private.replace_post_tags(bigint, bigint[])
  to authenticated;

create function public.create_post_draft(
  p_kind text,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default '',
  p_tag_ids bigint[] default '{}'::bigint[]
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

  perform private.replace_post_tags(created_post.id, p_tag_ids);

  return created_post;
end;
$$;

comment on function public.create_post_draft(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) is 'Atomically creates an incomplete Draft Post and its Tag relationships.';

revoke all on function public.create_post_draft(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) from public, anon;
grant execute on function public.create_post_draft(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) to authenticated;

create function public.publish_post(
  p_post_id bigint,
  p_expected_kind text,
  p_expected_updated_at timestamptz,
  p_group_id bigint,
  p_new_group_name text,
  p_new_group_slug text,
  p_title text,
  p_slug text,
  p_summary text,
  p_body_markdown text,
  p_tag_ids bigint[] default '{}'::bigint[]
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_post public.posts;
  selected_group public.post_groups;
  published_post public.posts;
  post_label text;
  group_label text;
begin
  if p_expected_kind is null
    or p_expected_kind not in ('regular', 'heartwork')
  then
    raise exception using
      errcode = '22023',
      message = 'Post kind must be regular or heartwork.';
  end if;

  post_label := case p_expected_kind
    when 'regular' then 'Regular Post'
    else 'Heartwork'
  end;
  group_label := case p_expected_kind
    when 'regular' then 'Category'
    else 'Column'
  end;

  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = format('Only the Sleepy Admin can publish %ss.', post_label);
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post updated_at value is required.';
  end if;

  if p_title is null or p_title !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Post title is required for publication.';
  end if;

  if nullif(btrim(p_slug), '') is null
    or btrim(p_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  then
    raise exception using
      errcode = '22023',
      message = 'Post Slug must use lowercase ASCII kebab-case.';
  end if;

  if p_body_markdown is null or p_body_markdown !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Post Markdown body is required for publication.';
  end if;

  if p_new_group_name is not null or p_new_group_slug is not null then
    raise exception using
      errcode = '22023',
      hint = 'group_must_exist',
      message = format('Create the %s explicitly before publishing.', group_label);
  end if;

  if p_group_id is null then
    raise exception using
      errcode = '22023',
      hint = 'group_missing',
      message = format('Select an existing %s before publishing.', group_label);
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id
  for update;

  if not found
    or current_post.kind <> p_expected_kind
    or current_post.status <> 'draft'
  then
    raise exception using
      errcode = 'P0002',
      message = format('%s draft %s was not found.', post_label, p_post_id);
  end if;

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format(
        'Post draft %s has changed since it was loaded.',
        p_post_id
      );
  end if;

  if current_post.published_at is not null
    and btrim(p_slug) is distinct from current_post.slug
  then
    raise exception using
      errcode = '23514',
      message = 'Post Slug cannot change after first publication.';
  end if;

  select *
  into selected_group
  from public.post_groups
  where id = p_group_id
    and kind = p_expected_kind;

  if not found then
    if p_expected_kind = 'regular' then
      raise exception using
        errcode = '23503',
        hint = 'group_missing',
        message = 'The selected Category does not exist or is not a Regular Post Category.';
    end if;

    raise exception using
      errcode = '23503',
      hint = 'group_missing',
      message = 'The selected Column does not exist or does not belong to this Post kind.';
  end if;

  begin
    update public.posts
    set
      group_id = selected_group.id,
      title = btrim(p_title),
      slug = btrim(p_slug),
      summary = nullif(btrim(p_summary), ''),
      body_markdown = p_body_markdown,
      status = 'published',
      published_at = coalesce(published_at, statement_timestamp())
    where id = p_post_id
    returning * into published_post;
  exception when unique_violation then
    raise exception using
      errcode = '23505',
      hint = 'post_slug_taken',
      message = 'That Post Slug is already taken.';
  end;

  perform private.replace_post_tags(p_post_id, p_tag_ids);

  return published_post;
end;
$$;

comment on function public.publish_post(
  bigint,
  text,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint[]
) is 'Publishes an existing Post Draft using explicit Post Group and Tag references.';

revoke all on function public.publish_post(
  bigint,
  text,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint[]
) from public, anon;
grant execute on function public.publish_post(
  bigint,
  text,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text,
  bigint[]
) to authenticated;

create function public.update_post_content(
  p_post_id bigint,
  p_expected_updated_at timestamptz,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default '',
  p_tag_ids bigint[] default '{}'::bigint[]
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_post public.posts;
  updated_post public.posts;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Posts.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post updated_at value is required.';
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Post %s was not found.', p_post_id);
  end if;

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format('Post %s has changed since it was loaded.', p_post_id);
  end if;

  if current_post.published_at is not null
    and p_slug is distinct from current_post.slug
  then
    raise exception using
      errcode = '23514',
      message = 'Post Slug cannot change after first publication.';
  end if;

  begin
    update public.posts
    set
      group_id = p_group_id,
      title = p_title,
      slug = p_slug,
      summary = p_summary,
      body_markdown = coalesce(p_body_markdown, '')
    where id = p_post_id
    returning * into updated_post;
  exception
    when unique_violation then
      raise exception using
        errcode = '23505',
        hint = 'post_slug_taken',
        message = 'That Post Slug is already taken.';
    when foreign_key_violation then
      raise exception using
        errcode = '23503',
        hint = 'group_missing',
        message = 'The selected Post Group does not exist for this Post kind.';
  end;

  perform private.replace_post_tags(p_post_id, p_tag_ids);

  return updated_post;
end;
$$;

comment on function public.update_post_content(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) is 'Atomically updates Admin-owned Post content without changing Post status.';

revoke all on function public.update_post_content(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) from public, anon;
grant execute on function public.update_post_content(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) to authenticated;

-- Post lifecycle interfaces.

create function public.transition_post(
  p_post_id bigint,
  p_expected_kind text,
  p_expected_updated_at timestamptz,
  p_transition text,
  p_archive_note text default null
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_post public.posts;
  transitioned_post public.posts;
  target_status text;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can change a Post lifecycle.';
  end if;

  if p_expected_kind is null
    or p_expected_kind not in ('regular', 'heartwork')
  then
    raise exception using
      errcode = '22023',
      message = 'Post kind must be regular or heartwork.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post updated_at value is required.';
  end if;

  if p_transition is null
    or p_transition not in ('withdraw', 'archive', 'restore')
  then
    raise exception using
      errcode = '22023',
      message = 'Post transition must be withdraw, archive, or restore.';
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id
    and kind = p_expected_kind
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Post %s was not found.', p_post_id);
  end if;

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format('Post %s has changed since it was loaded.', p_post_id);
  end if;

  if p_transition = 'archive' then
    if current_post.status <> 'published' then
      raise exception using
        errcode = '22023',
        message = format(
          'Cannot archive a %s Post.',
          initcap(current_post.status)
        );
    end if;
    target_status := 'archived';
  elsif p_transition = 'restore' then
    if current_post.status <> 'archived' then
      raise exception using
        errcode = '22023',
        message = format(
          'Cannot restore a %s Post.',
          initcap(current_post.status)
        );
    end if;
    target_status := 'published';
  else
    if current_post.status not in ('published', 'archived') then
      raise exception using
        errcode = '22023',
        message = format(
          'Cannot withdraw a %s Post.',
          initcap(current_post.status)
        );
    end if;
    target_status := 'draft';
  end if;

  update public.posts
  set
    status = target_status,
    archived_at = case
      when target_status = 'archived' then statement_timestamp()
      else null
    end,
    archive_note = case
      when target_status = 'archived' then nullif(btrim(p_archive_note), '')
      else null
    end
  where id = p_post_id
  returning * into transitioned_post;

  return transitioned_post;
end;
$$;

comment on function public.transition_post(bigint, text, timestamptz, text, text) is
  'Withdraws, archives, or restores either Post variant while preserving first-publication identity.';

revoke all on function public.transition_post(bigint, text, timestamptz, text, text)
  from public, anon;
grant execute on function public.transition_post(bigint, text, timestamptz, text, text)
  to authenticated;

create function public.delete_post(
  p_post_id bigint,
  p_expected_kind text,
  p_expected_updated_at timestamptz
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_post public.posts;
  deleted_post public.posts;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can delete a Post.';
  end if;

  if p_expected_kind is null
    or p_expected_kind not in ('regular', 'heartwork')
  then
    raise exception using
      errcode = '22023',
      message = 'Post kind must be regular or heartwork.';
  end if;

  if p_expected_updated_at is null then
    raise exception using
      errcode = '22004',
      message = 'The expected Post updated_at value is required.';
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id
    and kind = p_expected_kind
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = format('Post %s was not found.', p_post_id);
  end if;

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format('Post %s has changed since it was loaded.', p_post_id);
  end if;

  delete from public.posts
  where id = p_post_id
  returning * into deleted_post;

  return deleted_post;
end;
$$;

comment on function public.delete_post(bigint, text, timestamptz) is
  'Hard-deletes either Post variant; foreign-key cascades remove dependent relationships.';

revoke all on function public.delete_post(bigint, text, timestamptz)
  from public, anon;
grant execute on function public.delete_post(bigint, text, timestamptz)
  to authenticated;

-- Atomic creation interface.

create function public.create_and_publish_post(
  p_expected_kind text,
  p_group_id bigint,
  p_title text,
  p_slug text,
  p_summary text,
  p_body_markdown text,
  p_tag_ids bigint[] default '{}'::bigint[]
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_draft public.posts;
  published_post public.posts;
begin
  created_draft := public.create_post_draft(
    p_kind => p_expected_kind
  );

  published_post := public.publish_post(
    p_post_id => created_draft.id,
    p_expected_kind => p_expected_kind,
    p_expected_updated_at => created_draft.updated_at,
    p_group_id => p_group_id,
    p_new_group_name => null,
    p_new_group_slug => null,
    p_title => p_title,
    p_slug => p_slug,
    p_summary => p_summary,
    p_body_markdown => p_body_markdown,
    p_tag_ids => p_tag_ids
  );

  return published_post;
end;
$$;

comment on function public.create_and_publish_post(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) is 'Atomically creates and publishes a complete Post without leaving a Draft when publication fails.';

revoke all on function public.create_and_publish_post(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) from public, anon;
grant execute on function public.create_and_publish_post(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[]
) to authenticated;
