begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

select ok(
  has_table_privilege('anon', 'public.posts', 'select'),
  'anonymous Readers receive explicit SELECT on Posts'
);
select ok(
  not has_table_privilege('anon', 'public.posts', 'insert')
    and not has_table_privilege('anon', 'public.posts', 'delete'),
  'anonymous Readers do not receive Post write privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.posts', 'select'),
  'authenticated callers receive explicit SELECT on Posts'
);
select ok(
  has_table_privilege('authenticated', 'public.posts', 'insert')
    and has_table_privilege('authenticated', 'public.posts', 'update')
    and has_table_privilege('authenticated', 'public.posts', 'delete'),
  'authenticated callers receive the table privileges required by Admin RLS'
);
select ok(
  has_sequence_privilege('authenticated', 'public.posts_id_seq', 'usage'),
  'authenticated callers receive explicit USAGE on the Posts identity sequence'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.posts'::regclass),
  'Posts have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.post_groups'::regclass),
  'Post Groups have RLS enabled'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'issue-3-admin@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'issue-3-reader@example.test');

insert into private.site_admins (user_id)
values ('11111111-1111-4111-8111-111111111111');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values (-3001, 'regular', 'Issue 3 Category', 'issue-3-category');

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
  (
    -3001,
    'regular',
    -3001,
    'Published Post',
    'issue-3-published',
    'Published body',
    'published',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    null
  ),
  (
    -3002,
    'regular',
    -3001,
    'Archived Post',
    'issue-3-archived',
    'Archived body',
    'archived',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-02 00:00:00+00'
  ),
  (
    -3003,
    'regular',
    null,
    null,
    null,
    '',
    'draft',
    '2026-01-01 00:00:00+00',
    null,
    null
  );

set local role anon;

select results_eq(
  $$
    select count(*)
    from public.posts
    where id between -3003 and -3001
  $$,
  array[2::bigint],
  'anonymous Readers can select only Public Posts'
);
select results_eq(
  $$select count(*) from public.posts where id = -3003$$,
  array[0::bigint],
  'anonymous Readers cannot select a Draft Post'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

select results_eq(
  $$
    select count(*)
    from public.posts
    where id between -3003 and -3001
  $$,
  array[2::bigint],
  'authenticated Readers can select only Public Posts'
);
select results_eq(
  $$select count(*) from public.posts where id = -3003$$,
  array[0::bigint],
  'authenticated Readers cannot select a Draft Post'
);
select throws_ok(
  $$select public.create_post_draft(p_kind => 'regular')$$,
  '42501',
  'Only the Sleepy Admin can create Post drafts.',
  'an authenticated Reader cannot create a Draft Post'
);
select throws_ok(
  $$
    select public.update_post_draft(
      p_post_id => -3003,
      p_expected_updated_at => '2026-01-01 00:00:00+00'
    )
  $$,
  '42501',
  'Only the Sleepy Admin can update Post drafts.',
  'an authenticated Reader cannot update a Draft Post'
);
select throws_ok(
  $$
    insert into public.post_groups (kind, name, slug)
    values ('regular', 'Reader Category', 'reader-category')
  $$,
  '42501',
  'new row violates row-level security policy for table "post_groups"',
  'an authenticated Reader cannot create a Post Group'
);
select results_eq(
  $$delete from public.posts where id = -3001 returning id$$,
  array[]::bigint[],
  'an authenticated Reader cannot delete a Post'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select lives_ok(
  $$
    select public.create_post_draft(
      p_kind => 'regular',
      p_group_id => null,
      p_title => null,
      p_slug => null,
      p_summary => null,
      p_body_markdown => ''
    )
  $$,
  'the Admin can create an incomplete Regular Post draft'
);
select ok(
  exists (
    select 1
    from public.posts
    where kind = 'regular'
      and status = 'draft'
      and group_id is null
      and title is null
      and slug is null
      and summary is null
      and body_markdown = ''
      and id <> -3003
  ),
  'the incomplete Draft Post persists all optional fields as empty'
);
select lives_ok(
  $$
    select public.update_post_draft(
      p_post_id => -3003,
      p_expected_updated_at => '2026-01-01 00:00:00+00',
      p_title => 'Resumable draft',
      p_body_markdown => 'Saved body'
    )
  $$,
  'the Admin can update a Draft Post with the observed updated_at value'
);
select results_eq(
  $$select title from public.posts where id = -3003$$,
  array['Resumable draft'::text],
  'the accepted update persists its content'
);
select throws_ok(
  $$
    select public.update_post_draft(
      p_post_id => -3003,
      p_expected_updated_at => '2026-01-01 00:00:00+00',
      p_title => 'Stale overwrite'
    )
  $$,
  '40001',
  'Post draft -3003 has changed since it was loaded.',
  'a stale updated_at value is rejected'
);
select results_eq(
  $$select title from public.posts where id = -3003$$,
  array['Resumable draft'::text],
  'a rejected stale update does not overwrite newer content'
);
select results_eq(
  $$delete from public.posts where id = -3001 returning id$$,
  array[-3001::bigint],
  'the Admin can delete a Post through RLS'
);

reset role;

select * from finish();
rollback;
