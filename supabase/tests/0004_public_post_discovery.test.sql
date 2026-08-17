begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

delete from private.site_admins;

insert into auth.users (id, email)
values ('77777777-7777-4777-8777-777777777777', 'issue-6-admin@example.test');

insert into private.site_admins (user_id)
values ('77777777-7777-4777-8777-777777777777');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values
  (-6001, 'regular', 'Issue 6 Category', 'issue-6-category'),
  (-6002, 'heartwork', 'Issue 6 Column', 'issue-6-column');

insert into public.posts (
  id,
  kind,
  group_id,
  title,
  slug,
  body_markdown,
  status,
  updated_at,
  published_at,
  archived_at
)
overriding system value
values
  (-6001, 'regular', -6001, 'Newest tie', 'newest-tie', 'Body', 'published', '2026-06-03 00:00:00+00', '2026-06-03 00:00:00+00', null),
  (-6002, 'heartwork', -6002, 'Newest', 'newest-heartwork', 'Body', 'published', '2026-06-03 00:00:00+00', '2026-06-03 00:00:00+00', null),
  (-6003, 'regular', -6001, 'Older', 'older-regular', 'Body', 'published', '2026-06-02 00:00:00+00', '2026-06-02 00:00:00+00', null),
  (-6004, 'regular', -6001, 'Oldest', 'oldest-regular', 'Body', 'published', '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', null),
  (-6005, 'regular', -6001, 'Archived', 'archived-regular', 'Body', 'archived', '2026-06-04 00:00:00+00', '2026-06-04 00:00:00+00', '2026-06-05 00:00:00+00'),
  (-6006, 'regular', null, 'Draft', 'draft-regular', 'Body', 'draft', '2026-06-06 00:00:00+00', null, null),
  (-6007, 'regular', null, 'First publication', 'first-publication', 'Body', 'draft', '2026-06-07 00:00:00+00', null, null);

set local role anon;

select results_eq(
  $$
    select slug
    from public.posts
    where status = 'published'
    order by published_at desc, id desc
    limit 3
  $$,
  array['newest-tie', 'newest-heartwork', 'older-regular'],
  'recent Posts mix kinds, exclude Archived and Draft Posts, and use id as the stable tie-breaker'
);

select results_eq(
  $$
    select slug
    from public.posts
    where kind = 'regular'
      and status = 'published'
      and (published_at, id) < ('2026-06-03 00:00:00+00'::timestamptz, -6001)
    order by published_at desc, id desc
    limit 1
  $$,
  array['older-regular'],
  'the previous Post candidate is Published and has the same kind'
);

select results_eq(
  $$
    select slug
    from public.posts
    where kind = 'regular'
      and status = 'published'
      and (published_at, id) > ('2026-06-02 00:00:00+00'::timestamptz, -6003)
    order by published_at asc, id asc
    limit 1
  $$,
  array['newest-tie'],
  'the next Post candidate is Published and has the same kind'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '77777777-7777-4777-8777-777777777777',
  true
);

select public.publish_regular_post(
  -6007,
  '2026-06-07 00:00:00+00',
  -6001,
  null,
  null,
  'First publication',
  'first-publication',
  null,
  'Body'
);

reset role;

select ok(
  (
    select updated_at = published_at
    from public.posts
    where id = -6007
  ),
  'first publication does not create a distinct content update time'
);

select * from finish();
rollback;
