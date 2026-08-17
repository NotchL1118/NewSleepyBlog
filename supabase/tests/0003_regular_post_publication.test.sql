begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select has_function(
  'public',
  'publish_regular_post',
  array[
    'bigint',
    'timestamp with time zone',
    'bigint',
    'text',
    'text',
    'text',
    'text',
    'text',
    'text'
  ],
  'Regular Posts expose one atomic publication function'
);
select ok(
  has_function_privilege('authenticated', 'public.publish_regular_post(bigint,timestamptz,bigint,text,text,text,text,text,text)', 'execute'),
  'authenticated callers can invoke publication through Admin RLS'
);
select ok(
  not has_function_privilege('anon', 'public.publish_regular_post(bigint,timestamptz,bigint,text,text,text,text,text,text)', 'execute'),
  'anonymous Readers cannot invoke publication'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('55555555-5555-4555-8555-555555555555', 'issue-5-admin@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'issue-5-reader@example.test');

insert into private.site_admins (user_id)
values ('55555555-5555-4555-8555-555555555555');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values
  (-5001, 'regular', 'Issue 5 Category', 'issue-5-category'),
  (-5002, 'heartwork', 'Issue 5 Column', 'issue-5-column');

insert into public.posts (
  id,
  kind,
  group_id,
  title,
  slug,
  body_markdown,
  status,
  updated_at,
  published_at
)
overriding system value
values
  (-5001, 'regular', null, null, null, '', 'draft', '2026-05-01 00:00:00+00', null),
  (-5002, 'regular', null, 'Create Category', 'create-category', 'Body', 'draft', '2026-05-02 00:00:00+00', null),
  (-5003, 'regular', null, 'Wrong Category', 'wrong-category', 'Body', 'draft', '2026-05-03 00:00:00+00', null),
  (-5004, 'regular', -5001, 'Existing Public Post', 'existing-public-post', 'Body', 'published', '2026-05-04 00:00:00+00', '2026-05-04 00:00:00+00'),
  (-5005, 'regular', null, 'Duplicate Slug', null, 'Body', 'draft', '2026-05-05 00:00:00+00', null),
  (-5006, 'regular', null, 'Private Draft', 'private-draft', 'Body', 'draft', '2026-05-06 00:00:00+00', null),
  (-5007, 'heartwork', -5002, 'Heartwork', 'heartwork-on-regular-route', 'Body', 'published', '2026-05-07 00:00:00+00', '2026-05-07 00:00:00+00');

select throws_ok(
  $$
    insert into public.post_groups (kind, name, slug)
    values ('regular', 'Invalid Category Slug', 'Invalid Slug')
  $$,
  '23514',
  'new row for relation "post_groups" violates check constraint "post_groups_slug_check"',
  'Category Slugs require lowercase ASCII kebab-case'
);
select throws_ok(
  $$
    insert into public.posts (kind, slug)
    values ('regular', 'Invalid Slug')
  $$,
  '23514',
  'new row for relation "posts" violates check constraint "posts_slug_check"',
  'Post Slugs require lowercase ASCII kebab-case'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

select throws_ok(
  $$
    select public.publish_regular_post(
      -5001, '2026-05-01 00:00:00+00', -5001, null, null,
      '   ', 'blank-title', null, 'Body'
    )
  $$,
  '22023',
  'Post title is required for publication.',
  'publishing rejects a blank title'
);
select throws_ok(
  $$
    select public.publish_regular_post(
      -5001, '2026-05-01 00:00:00+00', -5001, null, null,
      'Title', 'Invalid Slug', null, 'Body'
    )
  $$,
  '22023',
  'Post Slug must use lowercase ASCII kebab-case.',
  'publishing rejects an invalid Post Slug'
);
select throws_ok(
  $$
    select public.publish_regular_post(
      -5001, '2026-05-01 00:00:00+00', -5001, null, null,
      'Title', 'blank-body', null, E' \n '
    )
  $$,
  '22023',
  'Post Markdown body is required for publication.',
  'publishing rejects a blank Markdown body'
);
select throws_ok(
  $$
    select public.publish_regular_post(
      -5003, '2026-05-03 00:00:00+00', -5002, null, null,
      'Wrong Category', 'wrong-category', null, 'Body'
    )
  $$,
  '23503',
  'The selected Category does not exist or is not a Regular Post Category.',
  'publishing rejects a mismatched Category kind'
);
select throws_ok(
  $$
    select public.publish_regular_post(
      -5005, '2026-05-05 00:00:00+00', -5001, null, null,
      'Duplicate Slug', 'existing-public-post', null, 'Body'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "posts_slug_key"',
  'publishing rejects a duplicate Post Slug'
);
select lives_ok(
  $$
    select public.publish_regular_post(
      -5002, '2026-05-02 00:00:00+00', null,
      'Created Category', 'created-category',
      'Create Category', 'create-category', 'Summary', 'Body'
    )
  $$,
  'publishing can atomically create a confirmed Category'
);
select ok(
  exists (
    select 1
    from public.posts as post
    join public.post_groups as post_group on post_group.id = post.group_id
    where post.id = -5002
      and post.status = 'published'
      and post.published_at is not null
      and post_group.kind = 'regular'
      and post_group.name = 'Created Category'
      and post_group.slug = 'created-category'
  ),
  'publication persists the new Category and first publication time'
);
select lives_ok(
  $$
    select public.publish_regular_post(
      -5001, '2026-05-01 00:00:00+00', -5001, null, null,
      'Published Regular Post', 'published-regular-post', null, 'Published body'
    )
  $$,
  'publishing can select an existing Regular Post Category'
);
select throws_ok(
  $$update public.posts set slug = 'changed-after-publication' where id = -5001$$,
  '23514',
  'Post Slug cannot change after first publication.',
  'the Post Slug locks after first publication'
);

reset role;
set local role anon;

select results_eq(
  $$
    select count(*)
    from public.posts
    where slug = 'published-regular-post'
      and kind = 'regular'
      and status in ('published', 'archived')
  $$,
  array[1::bigint],
  'anonymous Readers can read the newly Published Regular Post'
);
select results_eq(
  $$select count(*) from public.posts where slug = 'private-draft'$$,
  array[0::bigint],
  'a Draft Post is not visible to anonymous Readers'
);
select results_eq(
  $$
    select count(*)
    from public.posts
    where slug = 'heartwork-on-regular-route'
      and kind = 'regular'
  $$,
  array[0::bigint],
  'a Heartwork cannot satisfy a Regular Post public read'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);

select throws_ok(
  $$
    select public.publish_regular_post(
      -5006, '2026-05-06 00:00:00+00', -5001, null, null,
      'Reader Publish', 'reader-publish', null, 'Body'
    )
  $$,
  '42501',
  'Only the Sleepy Admin can publish Regular Posts.',
  'an authenticated Reader cannot publish a Regular Post'
);
select results_eq(
  $$update public.posts set title = 'Reader write' where id = -5004 returning id$$,
  array[]::bigint[],
  'Reader writes remain denied by Post RLS'
);

reset role;

select * from finish();
rollback;
