begin;

create extension if not exists pgtap with schema extensions;

select plan(36);

select has_table('public', 'tags', 'Tags are persisted in a public table');
select has_table(
  'public',
  'post_tags',
  'Post-Tag relationships are persisted in a public table'
);
select ok(
  has_table_privilege('anon', 'public.tags', 'select')
    and has_table_privilege('anon', 'public.post_tags', 'select'),
  'anonymous Readers receive explicit SELECT on Tags and Post-Tag relationships'
);
select ok(
  not has_table_privilege('anon', 'public.tags', 'insert')
    and not has_table_privilege('anon', 'public.post_tags', 'insert'),
  'anonymous Readers receive no Tag write privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.tags', 'insert')
    and has_column_privilege('authenticated', 'public.tags', 'name', 'update')
    and not has_column_privilege('authenticated', 'public.tags', 'slug', 'update')
    and has_table_privilege('authenticated', 'public.tags', 'delete')
    and has_table_privilege('authenticated', 'public.post_tags', 'insert')
    and has_table_privilege('authenticated', 'public.post_tags', 'delete'),
  'authenticated callers receive the table privileges required by Admin RLS'
);
select ok(
  has_sequence_privilege('authenticated', 'public.tags_id_seq', 'usage'),
  'authenticated callers receive explicit USAGE on the Tags identity sequence'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tags'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.post_tags'::regclass),
  'Tags and Post-Tag relationships have RLS enabled'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_tag(text,text)',
    'execute'
  ),
  'authenticated callers can invoke Tag creation through Admin RLS'
);
select ok(
  not has_function_privilege('anon', 'public.create_tag(text,text)', 'execute'),
  'anonymous Readers cannot invoke Tag creation'
);
select has_function(
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
  'Draft saving accepts existing Tags and an optional new Tag atomically'
);
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
    'text',
    'bigint[]',
    'text',
    'text'
  ],
  'publication accepts existing Tags and an optional new Tag atomically'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('99999999-9999-4999-8999-999999999991', 'issue-8-admin@example.test'),
  ('99999999-9999-4999-8999-999999999992', 'issue-8-reader@example.test');

insert into private.site_admins (user_id)
values ('99999999-9999-4999-8999-999999999991');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values
  (-8001, 'regular', 'Issue 8 Category', 'issue-8-category'),
  (-8002, 'heartwork', 'Issue 8 Column', 'issue-8-column');

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
  (-8001, 'regular', -8001, 'Tagged Draft', 'tagged-draft', 'Body', 'draft', '2026-08-01 00:00:00+00', null),
  (-8002, 'heartwork', null, 'Tagged Heartwork', 'tagged-heartwork', 'Body', 'draft', '2026-08-02 00:00:00+00', null),
  (-8003, 'regular', -8001, 'Public Tagged Post', 'public-tagged-post', 'Body', 'published', '2026-08-03 00:00:00+00', '2026-08-03 00:00:00+00');

insert into public.tags (id, name, slug)
overriding system value
values
  (-8001, 'Architecture', 'architecture'),
  (-8002, 'Night Reading', 'night-reading'),
  (-8003, 'Public Topic', 'public-topic');

insert into public.post_tags (post_id, tag_id)
values (-8001, -8001), (-8003, -8003);

select throws_ok(
  $$insert into public.tags (name, slug) values ('Invalid Slug', 'Invalid Slug')$$,
  '23514',
  'new row for relation "tags" violates check constraint "tags_slug_check"',
  'Tag Slugs require lowercase ASCII kebab-case'
);
select throws_ok(
  $$insert into public.tags (name, slug) values ('architecture', 'other-architecture')$$,
  '23505',
  'duplicate key value violates unique constraint "tags_name_key"',
  'Tag names are globally case-insensitively unique'
);
select throws_ok(
  $$insert into public.tags (name, slug) values ('Other Architecture', 'architecture')$$,
  '23505',
  'duplicate key value violates unique constraint "tags_slug_key"',
  'Tag Slugs are globally unique'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999991',
  true
);

select throws_ok(
  $$update public.tags set slug = 'changed-architecture' where id = -8001$$,
  '42501',
  'permission denied for table tags',
  'a Tag Slug remains stable after creation'
);
select lives_ok(
  $$select public.create_tag('  Database Design  ', 'database-design')$$,
  'the Admin can create a confirmed Tag'
);
select ok(
  exists (
    select 1 from public.tags
    where name = 'Database Design' and slug = 'database-design'
  ),
  'Tag creation trims and persists the confirmed name and Slug'
);
select lives_ok(
  $$
    select public.update_post_draft(
      -8001,
      '2026-08-01 00:00:00+00',
      -8001,
      'Tagged Draft Updated',
      'tagged-draft',
      null,
      'Updated body',
      array[-8002]::bigint[],
      '  Fresh Topic  ',
      'fresh-topic'
    )
  $$,
  'saving a Regular Post atomically replaces existing Tags and creates a new Tag'
);
select results_eq(
  $$
    select tag.slug
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.slug
  $$,
  $$values ('fresh-topic'::text), ('night-reading'::text)$$,
  'the saved Regular Post has exactly the selected and newly created Tags'
);
select results_eq(
  $$select title from public.posts where id = -8001$$,
  array['Tagged Draft Updated'::text],
  'the Post content commits with its Tag replacement'
);

select throws_ok(
  format(
    $$
      select public.update_post_draft(
        -8001,
        %L,
        -8001,
        'Must Roll Back',
        'tagged-draft',
        null,
        'Must roll back',
        array[-8999]::bigint[],
        null,
        null
      )
    $$,
    (select updated_at from public.posts where id = -8001)
  ),
  '23503',
  'insert or update on table "post_tags" violates foreign key constraint "post_tags_tag_id_fkey"',
  'an invalid Tag rolls back the entire Post save'
);
select results_eq(
  $$select title from public.posts where id = -8001$$,
  array['Tagged Draft Updated'::text],
  'a failed Tag replacement rolls back the Post content update'
);
select results_eq(
  $$
    select tag.slug
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.slug
  $$,
  $$values ('fresh-topic'::text), ('night-reading'::text)$$,
  'a failed Tag replacement restores the previous relationships'
);

select lives_ok(
  format(
    $$
      select public.publish_regular_post(
        -8001,
        %L,
        -8001,
        null,
        null,
        'Tagged Draft Updated',
        'tagged-draft',
        null,
        'Updated body'
      )
    $$,
    (select updated_at from public.posts where id = -8001)
  ),
  'the legacy Regular Post publisher remains compatible'
);
select results_eq(
  $$
    select tag.slug
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.slug
  $$,
  $$values ('fresh-topic'::text), ('night-reading'::text)$$,
  'the legacy Regular Post publisher retains every saved Tag'
);

select lives_ok(
  $$
    select public.publish_post(
      -8002,
      'heartwork',
      '2026-08-02 00:00:00+00',
      -8002,
      null,
      null,
      'Tagged Heartwork',
      'tagged-heartwork',
      null,
      'Body',
      array[-8001, -8002]::bigint[],
      null,
      null
    )
  $$,
  'publishing a Heartwork atomically persists its selected Tags'
);
select results_eq(
  $$
    select tag.slug
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8002
    order by tag.slug
  $$,
  $$values ('architecture'::text), ('night-reading'::text)$$,
  'the published Heartwork has every selected Tag'
);

reset role;
set local role anon;

select results_eq(
  $$select name from public.tags where id = -8003$$,
  array['Public Topic'::text],
  'anonymous Readers can read persisted Tags'
);
select results_eq(
  $$select tag_id from public.post_tags where post_id = -8003$$,
  array[-8003::bigint],
  'anonymous Readers can read Post-Tag relationships'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999992',
  true
);

select throws_ok(
  $$select public.create_tag('Reader Tag', 'reader-tag')$$,
  '42501',
  'Only the Sleepy Admin can create Tags.',
  'an authenticated Reader cannot create a Tag through the RPC'
);
select throws_ok(
  $$
    select public.publish_post(
      -8001,
      'regular',
      (select updated_at from public.posts where id = -8001),
      -8001,
      null,
      null,
      'Reader Publish',
      'tagged-draft',
      null,
      'Body',
      array[-8001]::bigint[],
      null,
      null
    )
  $$,
  '42501',
  'Only the Sleepy Admin can publish Regular Posts.',
  'an authenticated Reader cannot mutate a Post and its Tags through the atomic RPC'
);
select throws_ok(
  $$insert into public.tags (name, slug) values ('Direct Reader Tag', 'direct-reader-tag')$$,
  '42501',
  'new row violates row-level security policy for table "tags"',
  'an authenticated Reader cannot insert a Tag directly'
);
select throws_ok(
  $$insert into public.post_tags (post_id, tag_id) values (-8003, -8001)$$,
  '42501',
  'new row violates row-level security policy for table "post_tags"',
  'an authenticated Reader cannot insert a Post-Tag relationship directly'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999991',
  true
);

delete from public.tags where id = -8003;
select results_eq(
  $$select count(*) from public.post_tags where tag_id = -8003$$,
  array[0::bigint],
  'deleting a Tag cascades only its Post relationships'
);
select results_eq(
  $$select count(*) from public.posts where id = -8003$$,
  array[1::bigint],
  'deleting a Tag does not delete its Post'
);

delete from public.posts where id = -8002;
select results_eq(
  $$select count(*) from public.post_tags where post_id = -8002$$,
  array[0::bigint],
  'deleting a Post cascades its Tag relationships'
);

reset role;

select * from finish();
rollback;
