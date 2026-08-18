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

revoke all on function public.prevent_first_publication_change()
  from public, anon, authenticated;

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
