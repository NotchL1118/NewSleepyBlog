begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

select has_function(
  'public',
  'transition_post',
  array['bigint', 'text', 'timestamp with time zone', 'text', 'text'],
  'both Post variants share one lifecycle transition function'
);
select has_function(
  'public',
  'delete_post',
  array['bigint', 'text', 'timestamp with time zone'],
  'both Post variants share one hard-delete function'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.transition_post(bigint,text,timestamptz,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.transition_post(bigint,text,timestamptz,text,text)',
    'execute'
  ),
  'only authenticated callers can invoke lifecycle transitions'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_post(bigint,text,timestamptz)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.delete_post(bigint,text,timestamptz)',
    'execute'
  ),
  'only authenticated callers can invoke hard deletion'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'issue-9-admin@example.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'issue-9-reader@example.test');

insert into private.site_admins (user_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values
  (-9001, 'regular', 'Issue 9 Category', 'issue-9-category'),
  (-9002, 'heartwork', 'Issue 9 Column', 'issue-9-column');

insert into public.tags (id, name)
overriding system value
values (-9001, 'Issue9Tag');

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
  archived_at,
  archive_note
)
overriding system value
values
  (-9001, 'regular', -9001, 'Lifecycle Post', 'lifecycle-post', 'Body', 'published', '2026-08-09 00:00:00+00', '2026-08-01 00:00:00+00', null, null),
  (-9002, 'heartwork', -9002, 'Lifecycle Heartwork', 'lifecycle-heartwork', 'Body', 'published', '2026-08-09 00:00:00+00', '2026-08-02 00:00:00+00', null, null),
  (-9003, 'regular', -9001, 'Archived Post', 'archived-post', 'Body', 'archived', '2026-08-09 00:00:00+00', '2026-08-03 00:00:00+00', '2026-08-08 00:00:00+00', 'Old note'),
  (-9004, 'regular', null, 'Draft Post', 'draft-post', 'Body', 'draft', '2026-08-09 00:00:00+00', null, null, null),
  (-9005, 'regular', -9001, 'Delete Post', 'delete-post', 'Body', 'published', '2026-08-09 00:00:00+00', '2026-08-05 00:00:00+00', null, null);

insert into public.post_tags (post_id, tag_id)
values (-9005, -9001);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

select throws_ok(
  $$update public.posts set slug = 'changed-lifecycle-post' where id = -9001$$,
  '23514',
  'Post Slug cannot change after first publication.',
  'a first-published Slug remains locked outside lifecycle functions'
);
select throws_ok(
  $$
    select public.transition_post(
      -9004,
      'regular',
      (select updated_at from public.posts where id = -9004),
      'archive',
      null
    )
  $$,
  '22023',
  'Cannot archive a Draft Post.',
  'a Draft Post cannot be archived'
);
select lives_ok(
  $$
    select public.transition_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      'withdraw',
      null
    )
  $$,
  'a Published Post can be withdrawn to Draft'
);
select results_eq(
  $$
    select status, published_at, archived_at, archive_note
    from public.posts where id = -9001
  $$,
  $$values ('draft'::text, '2026-08-01 00:00:00+00'::timestamptz, null::timestamptz, null::text)$$,
  'withdrawal preserves first publication and clears archive metadata'
);

reset role;
set local role anon;

select results_eq(
  $$select count(*) from public.posts where id = -9001$$,
  array[0::bigint],
  'a withdrawn Post immediately becomes unavailable to Readers'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

select lives_ok(
  $$
    select public.publish_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      -9001,
      null,
      null,
      'Lifecycle Post',
      'lifecycle-post',
      null,
      'Body'
    )
  $$,
  'a withdrawn Post can be republished with its locked Slug'
);
select results_eq(
  $$select published_at, slug from public.posts where id = -9001$$,
  $$values ('2026-08-01 00:00:00+00'::timestamptz, 'lifecycle-post'::text)$$,
  'republication retains first publication time and Slug'
);
select lives_ok(
  $$
    select public.transition_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      'archive',
      '  The tooling described here is obsolete.  '
    )
  $$,
  'a Published Post can be archived with a note'
);
select results_eq(
  $$
    select status, archive_note, archived_at is not null
    from public.posts where id = -9001
  $$,
  $$values ('archived'::text, 'The tooling described here is obsolete.'::text, true)$$,
  'archiving records a normalized plain-text note and timestamp'
);

reset role;
set local role anon;

select results_eq(
  $$select slug from public.posts where id = -9001$$,
  array['lifecycle-post'::text],
  'an Archived Post remains directly readable at its original Slug'
);
select results_eq(
  $$
    select slug from public.posts
    where id in (-9001, -9002) and status = 'published'
    order by id
  $$,
  array['lifecycle-heartwork'::text],
  'Archived Posts are excluded from public discovery queries'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);

select lives_ok(
  $$
    select public.transition_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      'restore',
      null
    )
  $$,
  'an Archived Post can be restored to Published'
);
select results_eq(
  $$select status, archived_at, archive_note from public.posts where id = -9001$$,
  $$values ('published'::text, null::timestamptz, null::text)$$,
  'restoring clears archive metadata'
);
select lives_ok(
  $$
    select public.transition_post(
      -9003,
      'regular',
      (select updated_at from public.posts where id = -9003),
      'withdraw',
      null
    )
  $$,
  'an Archived Post can be withdrawn to Draft'
);
select results_eq(
  $$select status, archived_at, archive_note from public.posts where id = -9003$$,
  $$values ('draft'::text, null::timestamptz, null::text)$$,
  'withdrawing an Archived Post clears archive metadata'
);
select lives_ok(
  $$
    select public.transition_post(
      -9002,
      'heartwork',
      (select updated_at from public.posts where id = -9002),
      'archive',
      '   '
    )
  $$,
  'a Heartwork uses the same archive transition'
);
select is(
  (select archive_note from public.posts where id = -9002),
  null,
  'a blank archive note is stored as null'
);
select throws_ok(
  $$
    select public.transition_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      'restore',
      null
    )
  $$,
  '22023',
  'Cannot restore a Published Post.',
  'restore is allowed only from Archived'
);
select throws_ok(
  $$
    select public.delete_post(
      -9005,
      'regular',
      '2026-08-01 00:00:00+00'
    )
  $$,
  '40001',
  'Post -9005 has changed since it was loaded.',
  'hard deletion rejects a stale Admin editor'
);
select lives_ok(
  $$
    select public.delete_post(
      -9005,
      'regular',
      (select updated_at from public.posts where id = -9005)
    )
  $$,
  'the Admin can hard-delete a Post'
);
select results_eq(
  $$select count(*) from public.posts where id = -9005$$,
  array[0::bigint],
  'hard deletion removes the Post'
);
select results_eq(
  $$select count(*) from public.post_tags where post_id = -9005$$,
  array[0::bigint],
  'hard deletion cascades through dependent Tag relationships'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);

select throws_ok(
  $$
    select public.transition_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001),
      'archive',
      null
    )
  $$,
  '42501',
  'Only the Sleepy Admin can change a Post lifecycle.',
  'an authenticated Reader cannot transition a Post'
);
select throws_ok(
  $$
    select public.delete_post(
      -9001,
      'regular',
      (select updated_at from public.posts where id = -9001)
    )
  $$,
  '42501',
  'Only the Sleepy Admin can delete a Post.',
  'an authenticated Reader cannot hard-delete a Post'
);

reset role;

select * from finish();
rollback;
