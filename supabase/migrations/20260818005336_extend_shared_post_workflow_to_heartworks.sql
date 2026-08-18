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

revoke all on function public.prevent_post_kind_change()
  from public, anon, authenticated;

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
  text
) is 'Atomically creates or selects a matching Post Group and publishes either Post variant.';

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

create or replace function public.publish_regular_post(
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
    p_body_markdown
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
