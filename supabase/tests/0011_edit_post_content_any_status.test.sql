begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_function(
  'public',
  'update_post_content',
  array[
    'bigint',
    'timestamp with time zone',
    'bigint',
    'text',
    'text',
    'text',
    'text',
    'bigint[]'
  ],
  'Post content has one update function independent of Post status'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.update_post_content(bigint,timestamptz,bigint,text,text,text,text,bigint[])',
    'execute'
  ),
  'authenticated callers can invoke Post updates through Admin RLS'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.update_post_content(bigint,timestamptz,bigint,text,text,text,text,bigint[])',
    'execute'
  ),
  'anonymous Readers cannot invoke Post updates'
);
select hasnt_function(
  'public',
  'update_post_draft',
  array[
    'bigint',
    'timestamp with time zone',
    'bigint',
    'text',
    'text',
    'text',
    'text',
    'bigint[]',
    'text',
    'text'
  ],
  'Draft-only editing is no longer part of the Post API'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'status-admin@example.test'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'status-reader@example.test');

insert into private.site_admins (user_id)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values (-11001, 'regular', 'Status Category', 'status-category');

insert into public.tags (id, name)
overriding system value
values (-11001, 'StatusTag');

insert into public.posts (
  id, kind, group_id, title, slug, body_markdown, status,
  updated_at, published_at, archived_at, archive_note
)
overriding system value
values
  (-11001, 'regular', null, null, null, '', 'draft',
   '2026-08-10 00:00:00+00', null, null, null),
  (-11002, 'regular', -11001, 'Published Before', 'published-status-post',
   'Published body', 'published', '2026-08-11 00:00:00+00',
   '2026-08-01 00:00:00+00', null, null),
  (-11003, 'regular', -11001, 'Archived Before', 'archived-status-post',
   'Archived body', 'archived', '2026-08-12 00:00:00+00',
   '2026-08-02 00:00:00+00', '2026-08-12 00:00:00+00', 'Historical');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  true
);

select lives_ok(
  $$
    select public.update_post_content(
      -11001, '2026-08-10 00:00:00+00', null, 'Draft After', null,
      null, 'Draft body', '{}'::bigint[]
    )
  $$,
  'the Admin can edit a Draft Post'
);
select results_eq(
  $$select status from public.posts where id = -11001$$,
  array['draft'::text],
  'editing preserves Draft status'
);

select lives_ok(
  $$
    select public.update_post_content(
      -11002, '2026-08-11 00:00:00+00', -11001, 'Published After',
      'published-status-post', 'Updated summary', 'Updated published body',
      array[-11001]::bigint[]
    )
  $$,
  'the Admin can edit a Published Post directly'
);
select results_eq(
  $$select status, title from public.posts where id = -11002$$,
  $$values ('published'::text, 'Published After'::text)$$,
  'editing preserves Published status and updates content'
);
select results_eq(
  $$select tag_id from public.post_tags where post_id = -11002$$,
  array[-11001::bigint],
  'editing a Published Post updates its Tags atomically'
);

select lives_ok(
  $$
    select public.update_post_content(
      -11003, '2026-08-12 00:00:00+00', -11001, 'Archived After',
      'archived-status-post', null, 'Updated archived body', '{}'::bigint[]
    )
  $$,
  'the Admin can edit an Archived Post directly'
);
select results_eq(
  $$select status, archive_note from public.posts where id = -11003$$,
  $$values ('archived'::text, 'Historical'::text)$$,
  'editing preserves Archived status and archive metadata'
);

select throws_ok(
  format(
    $$
      select public.update_post_content(
        -11002, %L, -11001, 'Published After', 'changed-public-slug',
        null, 'Body', '{}'::bigint[]
      )
    $$,
    (select updated_at from public.posts where id = -11002)
  ),
  '23514',
  'Post Slug cannot change after first publication.',
  'editing cannot change a Post Slug after first publication'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  true
);

select throws_ok(
  $$
    select public.update_post_content(
      -11002, '2026-08-11 00:00:00+00', -11001, 'Reader Edit',
      'published-status-post', null, 'Body', '{}'::bigint[]
    )
  $$,
  '42501',
  'Only the Sleepy Admin can update Posts.',
  'an authenticated Reader cannot edit a Post'
);

reset role;

select * from finish();
rollback;
