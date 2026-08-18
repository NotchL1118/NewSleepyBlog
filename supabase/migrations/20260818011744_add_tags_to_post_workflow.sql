create table public.tags (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_check check (name ~ '[^[:space:]]'),
  constraint tags_slug_check
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tags_slug_key unique (slug)
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

create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

alter table public.tags enable row level security;
alter table public.post_tags enable row level security;

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

revoke all on table public.tags, public.post_tags
  from public, anon, authenticated;
grant select on table public.tags, public.post_tags
  to anon, authenticated;
grant insert, delete on table public.tags
  to authenticated;
grant update (name) on table public.tags
  to authenticated;
grant insert, delete on table public.post_tags
  to authenticated;

revoke all on sequence public.tags_id_seq
  from public, anon, authenticated;
grant usage on sequence public.tags_id_seq
  to authenticated;

create function public.create_tag(p_name text, p_slug text)
returns public.tags
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_tag public.tags;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can create Tags.';
  end if;

  if p_name is null or p_name !~ '[^[:space:]]' then
    raise exception using
      errcode = '22023',
      message = 'Tag name is required.';
  end if;

  if nullif(btrim(p_slug), '') is null
    or btrim(p_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  then
    raise exception using
      errcode = '22023',
      message = 'Tag Slug must use lowercase ASCII kebab-case.';
  end if;

  insert into public.tags (name, slug)
  values (btrim(p_name), btrim(p_slug))
  returning * into created_tag;

  return created_tag;
end;
$$;

comment on function public.create_tag(text, text) is
  'Creates a confirmed reusable Tag for the authenticated Sleepy Admin.';

revoke all on function public.create_tag(text, text) from public, anon;
grant execute on function public.create_tag(text, text) to authenticated;

create function private.replace_post_tags(
  p_post_id bigint,
  p_tag_ids bigint[],
  p_new_tag_name text,
  p_new_tag_slug text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_tag public.tags;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can update Post Tags.';
  end if;

  if (p_new_tag_name is null) <> (p_new_tag_slug is null) then
    raise exception using
      errcode = '22023',
      message = 'A new Tag requires both a confirmed name and Slug.';
  end if;

  if p_new_tag_name is not null then
    select *
    into created_tag
    from public.create_tag(p_new_tag_name, p_new_tag_slug);
  end if;

  delete from public.post_tags where post_id = p_post_id;

  insert into public.post_tags (post_id, tag_id)
  select p_post_id, selected_tag_id
  from (
    select distinct unnest(coalesce(p_tag_ids, '{}'::bigint[]))
      as selected_tag_id
    union
    select created_tag.id where created_tag.id is not null
  ) as selected_tags;
end;
$$;

revoke all on function private.replace_post_tags(bigint, bigint[], text, text)
  from public, anon;
grant execute on function private.replace_post_tags(bigint, bigint[], text, text)
  to authenticated;

drop function public.create_post_draft(text, bigint, text, text, text, text);

create function public.create_post_draft(
  p_kind text,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default '',
  p_tag_ids bigint[] default '{}'::bigint[],
  p_new_tag_name text default null,
  p_new_tag_slug text default null
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

  perform private.replace_post_tags(
    created_post.id,
    p_tag_ids,
    p_new_tag_name,
    p_new_tag_slug
  );

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
  bigint[],
  text,
  text
) is 'Atomically creates an incomplete Draft Post and its Tag relationships.';

revoke all on function public.create_post_draft(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[],
  text,
  text
) from public, anon;
grant execute on function public.create_post_draft(
  text,
  bigint,
  text,
  text,
  text,
  text,
  bigint[],
  text,
  text
) to authenticated;

drop function public.update_post_draft(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text
);

create function public.update_post_draft(
  p_post_id bigint,
  p_expected_updated_at timestamptz,
  p_group_id bigint default null,
  p_title text default null,
  p_slug text default null,
  p_summary text default null,
  p_body_markdown text default '',
  p_tag_ids bigint[] default '{}'::bigint[],
  p_new_tag_name text default null,
  p_new_tag_slug text default null
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

  select *
  into current_post
  from public.posts
  where id = p_post_id
  for update;

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

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format(
        'Post draft %s has changed since it was loaded.',
        p_post_id
      );
  end if;

  if current_post.published_at is not null
    and p_slug is distinct from current_post.slug
  then
    raise exception using
      errcode = '23514',
      message = 'Post Slug cannot change after first publication.';
  end if;

  update public.posts
  set
    group_id = p_group_id,
    title = p_title,
    slug = p_slug,
    summary = p_summary,
    body_markdown = coalesce(p_body_markdown, '')
  where id = p_post_id
  returning * into updated_post;

  perform private.replace_post_tags(
    p_post_id,
    p_tag_ids,
    p_new_tag_name,
    p_new_tag_slug
  );

  return updated_post;
end;
$$;

comment on function public.update_post_draft(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[],
  text,
  text
) is 'Atomically updates a current Draft Post and replaces its Tag relationships.';

revoke all on function public.update_post_draft(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[],
  text,
  text
) from public, anon;
grant execute on function public.update_post_draft(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  bigint[],
  text,
  text
) to authenticated;

drop function public.publish_regular_post(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text
);
drop function public.publish_post(
  bigint,
  text,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text
);

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
  p_tag_ids bigint[],
  p_new_tag_name text,
  p_new_tag_slug text
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

  if p_group_id is not null
    and (p_new_group_name is not null or p_new_group_slug is not null)
  then
    raise exception using
      errcode = '22023',
      message = format(
        'Choose an existing %s or create a new %s, not both.',
        group_label,
        group_label
      );
  end if;

  if p_group_id is null then
    if p_new_group_name is null or p_new_group_name !~ '[^[:space:]]' then
      raise exception using
        errcode = '22023',
        message = format('%s name is required.', group_label);
    end if;

    if nullif(btrim(p_new_group_slug), '') is null
      or btrim(p_new_group_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    then
      raise exception using
        errcode = '22023',
        message = format(
          '%s Slug must use lowercase ASCII kebab-case.',
          group_label
        );
    end if;
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

  if p_group_id is not null then
    select *
    into selected_group
    from public.post_groups
    where id = p_group_id
      and kind = p_expected_kind;

    if not found then
      if p_expected_kind = 'regular' then
        raise exception using
          errcode = '23503',
          message = 'The selected Category does not exist or is not a Regular Post Category.';
      end if;

      raise exception using
        errcode = '23503',
        message = 'The selected Column does not exist or does not belong to this Post kind.';
    end if;
  else
    insert into public.post_groups (kind, name, slug)
    values (p_expected_kind, btrim(p_new_group_name), btrim(p_new_group_slug))
    returning * into selected_group;
  end if;

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

  perform private.replace_post_tags(
    p_post_id,
    p_tag_ids,
    p_new_tag_name,
    p_new_tag_slug
  );

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
  bigint[],
  text,
  text
) is 'Atomically creates or selects a Post Group, publishes either Post variant, and replaces its Tags.';

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
  bigint[],
  text,
  text
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
  bigint[],
  text,
  text
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
  p_body_markdown text
)
returns public.posts
language sql
security invoker
set search_path = ''
as $$
  select public.publish_post(
    p_post_id,
    p_expected_kind,
    p_expected_updated_at,
    p_group_id,
    p_new_group_name,
    p_new_group_slug,
    p_title,
    p_slug,
    p_summary,
    p_body_markdown,
    array(
      select post_tag.tag_id
      from public.post_tags as post_tag
      where post_tag.post_id = p_post_id
    ),
    null,
    null
  );
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
  text
) is 'Compatibility entry that publishes either Post variant while retaining its Tags.';

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
  text
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
  text
) to authenticated;

create function public.publish_regular_post(
  p_post_id bigint,
  p_expected_updated_at timestamptz,
  p_group_id bigint,
  p_new_group_name text,
  p_new_group_slug text,
  p_title text,
  p_slug text,
  p_summary text,
  p_body_markdown text
)
returns public.posts
language sql
security invoker
set search_path = ''
as $$
  select public.publish_post(
    p_post_id,
    'regular',
    p_expected_updated_at,
    p_group_id,
    p_new_group_name,
    p_new_group_slug,
    p_title,
    p_slug,
    p_summary,
    p_body_markdown,
    array(
      select post_tag.tag_id
      from public.post_tags as post_tag
      where post_tag.post_id = p_post_id
    ),
    null,
    null
  );
$$;

comment on function public.publish_regular_post(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text
) is 'Compatibility entry that publishes a Regular Post through the shared Post mutation.';

revoke all on function public.publish_regular_post(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;
grant execute on function public.publish_regular_post(
  bigint,
  timestamptz,
  bigint,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
