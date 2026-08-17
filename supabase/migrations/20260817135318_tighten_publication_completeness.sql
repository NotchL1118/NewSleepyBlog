alter table public.posts
  drop constraint posts_public_content_check;
alter table public.posts
  add constraint posts_public_content_check
  check (
    status = 'draft'
    or (
      title ~ '[^[:space:]]'
      and nullif(btrim(slug), '') is not null
      and body_markdown ~ '[^[:space:]]'
      and group_id is not null
      and published_at is not null
    )
  );

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
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_post public.posts;
  selected_group public.post_groups;
  published_post public.posts;
begin
  if not (select private.is_admin()) then
    raise exception using
      errcode = '42501',
      message = 'Only the Sleepy Admin can publish Regular Posts.';
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
      message = 'Choose an existing Category or create a new Category, not both.';
  end if;

  if p_group_id is null then
    if p_new_group_name is null or p_new_group_name !~ '[^[:space:]]' then
      raise exception using
        errcode = '22023',
        message = 'Category name is required.';
    end if;

    if nullif(btrim(p_new_group_slug), '') is null
      or btrim(p_new_group_slug) !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    then
      raise exception using
        errcode = '22023',
        message = 'Category Slug must use lowercase ASCII kebab-case.';
    end if;
  end if;

  select *
  into current_post
  from public.posts
  where id = p_post_id
  for update;

  if not found or current_post.kind <> 'regular' or current_post.status <> 'draft' then
    raise exception using
      errcode = 'P0002',
      message = format('Regular Post draft %s was not found.', p_post_id);
  end if;

  if current_post.updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = format(
        'Post draft %s has changed since it was loaded.',
        p_post_id
      );
  end if;

  if p_group_id is not null then
    select *
    into selected_group
    from public.post_groups
    where id = p_group_id
      and kind = 'regular';

    if not found then
      raise exception using
        errcode = '23503',
        message = 'The selected Category does not exist or is not a Regular Post Category.';
    end if;
  else
    insert into public.post_groups (kind, name, slug)
    values ('regular', btrim(p_new_group_name), btrim(p_new_group_slug))
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
