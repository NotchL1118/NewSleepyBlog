begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_function(
  'public',
  'publish_post',
  array[
    'bigint',
    'text',
    'timestamp with time zone',
    'bigint',
    'text',
    'text',
    'text',
    'text',
    'text',
    'text'
  ],
  'both Post variants share one atomic publication function'
);

delete from private.site_admins;

insert into auth.users (id, email)
values ('88888888-8888-4888-8888-888888888888', 'issue-7-admin@example.test');

insert into private.site_admins (user_id)
values ('88888888-8888-4888-8888-888888888888');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values
  (-7001, 'regular', 'Issue 7 Category', 'issue-7-category'),
  (-7002, 'heartwork', 'Issue 7 Column', 'issue-7-column');

select throws_ok(
  $$
    insert into public.posts (kind, group_id)
    values ('regular', -7002)
  $$,
  '23503',
  'insert or update on table "posts" violates foreign key constraint "posts_group_kind_fkey"',
  'a Regular Post cannot use a Heartwork Column'
);

select throws_ok(
  $$
    insert into public.posts (kind, group_id)
    values ('heartwork', -7001)
  $$,
  '23503',
  'insert or update on table "posts" violates foreign key constraint "posts_group_kind_fkey"',
  'a Heartwork cannot use a Regular Post Category'
);

insert into public.posts (
  id,
  kind,
  title,
  slug,
  body_markdown,
  status,
  updated_at
)
overriding system value
values
  (-7001, 'heartwork', 'Existing Column', 'existing-column', 'Body', 'draft', '2026-07-01 00:00:00+00'),
  (-7002, 'heartwork', 'New Column', 'new-column', 'Body', 'draft', '2026-07-02 00:00:00+00'),
  (-7003, 'regular', 'Regular Draft', 'regular-draft', 'Body', 'draft', '2026-07-03 00:00:00+00');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888888',
  true
);

select throws_ok(
  $$update public.posts set kind = 'regular' where id = -7001$$,
  '23514',
  'Post kind cannot change after creation.',
  'a Heartwork cannot be converted into a Regular Post'
);

select throws_ok(
  $$update public.posts set kind = 'heartwork' where id = -7003$$,
  '23514',
  'Post kind cannot change after creation.',
  'a Regular Post cannot be converted into a Heartwork'
);

select throws_ok(
  $$
    select public.publish_post(
      -7001, 'heartwork', '2026-07-01 00:00:00+00', -7001, null, null,
      'Existing Column', 'existing-column', null, 'Body'
    )
  $$,
  '23503',
  'The selected Column does not exist or does not belong to this Post kind.',
  'publishing a Heartwork rejects a Regular Post Category'
);

select lives_ok(
  $$
    select public.publish_post(
      -7001, 'heartwork', '2026-07-01 00:00:00+00', -7002, null, null,
      'Existing Column', 'existing-column', null, 'Body'
    )
  $$,
  'a Heartwork can publish into an existing Column'
);

select results_eq(
  $$
    select post.kind, post_group.kind, post.status
    from public.posts as post
    join public.post_groups as post_group on post_group.id = post.group_id
    where post.id = -7001
  $$,
  $$values ('heartwork'::text, 'heartwork'::text, 'published'::text)$$,
  'published Heartworks retain their kind and matching Column kind'
);

select lives_ok(
  $$
    select public.publish_post(
      -7002, 'heartwork', '2026-07-02 00:00:00+00', null,
      'Created Column', 'created-column',
      'New Column', 'new-column', null, 'Body'
    )
  $$,
  'Heartwork publication can atomically create a Column'
);

select ok(
  exists (
    select 1
    from public.posts as post
    join public.post_groups as post_group on post_group.id = post.group_id
    where post.id = -7002
      and post.kind = 'heartwork'
      and post_group.kind = 'heartwork'
      and post_group.name = 'Created Column'
      and post_group.slug = 'created-column'
  ),
  'a newly created group is persisted as a Heartwork Column'
);

select throws_ok(
  $$
    select public.publish_post(
      -7003, 'heartwork', '2026-07-03 00:00:00+00', -7002, null, null,
      'Regular Draft', 'regular-draft', null, 'Body'
    )
  $$,
  'P0002',
  'Heartwork draft -7003 was not found.',
  'the Heartwork entry cannot publish a Regular Post draft'
);

select lives_ok(
  $$
    select public.publish_post(
      -7003, 'regular', '2026-07-03 00:00:00+00', -7001, null, null,
      'Regular Draft', 'regular-draft', null, 'Body'
    )
  $$,
  'the shared publication function still publishes Regular Posts'
);

reset role;
set local role anon;

select results_eq(
  $$
    select slug
    from public.posts
    where kind = 'heartwork'
      and status = 'published'
      and id in (-7002, -7001)
    order by published_at desc, id desc
  $$,
  array['new-column', 'existing-column'],
  'Readers can discover Published Heartworks chronologically'
);

select results_eq(
  $$
    select slug
    from public.posts
    where kind = 'heartwork'
      and status = 'published'
      and (published_at, id) < (
        select published_at, id from public.posts where id = -7002
      )
    order by published_at desc, id desc
    limit 1
  $$,
  array['existing-column'],
  'Heartwork previous navigation remains within Published Heartworks'
);

select * from finish();
rollback;
