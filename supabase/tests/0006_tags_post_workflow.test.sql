begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

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
    'public.create_tag(text)',
    'execute'
  ),
  'authenticated callers can invoke Tag creation through Admin RLS'
);
select ok(
  not has_function_privilege('anon', 'public.create_tag(text)', 'execute'),
  'anonymous Readers cannot invoke Tag creation'
);
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
  'Post content updates accept existing Tags atomically in every status'
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
    'bigint[]'
  ],
  'publication accepts existing Tags atomically'
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

insert into public.tags (id, name)
overriding system value
values
  (-8001, 'Architecture'),
  (-8002, 'NightReading'),
  (-8003, 'PublicTopic');

insert into public.post_tags (post_id, tag_id)
values (-8001, -8001), (-8003, -8003);

select throws_ok(
  $$insert into public.tags (name) values ('Invalid Tag')$$,
  '23514',
  'new row for relation "tags" violates check constraint "tags_name_no_whitespace_check"',
  'Tag names cannot contain whitespace'
);
select throws_ok(
  $$insert into public.tags (name) values ('architecture')$$,
  '23505',
  'duplicate key value violates unique constraint "tags_name_key"',
  'Tag names are globally case-insensitively unique'
);
select throws_ok(
  $$insert into public.tags (name) values (repeat('a', 81))$$,
  '23514',
  'new row for relation "tags" violates check constraint "tags_name_length_check"',
  'Tag names are limited to 80 characters'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999991',
  true
);

select hasnt_column('public', 'tags', 'slug', 'Tags do not expose a Slug column');
select lives_ok(
  $$select public.create_tag('  DatabaseDesign  ')$$,
  'the Admin can create a confirmed Tag'
);
select ok(
  exists (
    select 1 from public.tags
    where name = 'DatabaseDesign'
  ),
  'Tag creation trims and persists the confirmed name'
);
select lives_ok(
  $$select public.create_tag('  FreshTopic  ')$$,
  'a second Tag can be created explicitly before draft assignment'
);
select lives_ok(
  $$
    select public.update_post_content(
      -8001,
      '2026-08-01 00:00:00+00',
      -8001,
      'Tagged Draft Updated',
      'tagged-draft',
      null,
      'Updated body',
      array[
        -8002,
        (select id from public.tags where name = 'FreshTopic')
      ]::bigint[]
    )
  $$,
  'saving a Regular Post atomically replaces existing Tag references'
);
select results_eq(
  $$
    select tag.name
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.name
  $$,
  $$values ('FreshTopic'::text), ('NightReading'::text)$$,
  'the saved Regular Post has exactly the selected Tags'
);
select results_eq(
  $$select title from public.posts where id = -8001$$,
  array['Tagged Draft Updated'::text],
  'the Post content commits with its Tag replacement'
);

select throws_ok(
  format(
    $$
      select public.update_post_content(
        -8001,
        %L,
        -8001,
        'Must Roll Back',
        'tagged-draft',
        null,
        'Must roll back',
        array[-8999]::bigint[]
      )
    $$,
    (select updated_at from public.posts where id = -8001)
  ),
  '23503',
  'One of the selected Tags no longer exists.',
  'an invalid Tag rolls back the entire Post save'
);
select results_eq(
  $$select title from public.posts where id = -8001$$,
  array['Tagged Draft Updated'::text],
  'a failed Tag replacement rolls back the Post content update'
);
select results_eq(
  $$
    select tag.name
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.name
  $$,
  $$values ('FreshTopic'::text), ('NightReading'::text)$$,
  'a failed Tag replacement restores the previous relationships'
);

select lives_ok(
  format(
    $$
      select public.publish_post(
        -8001,
        'regular',
        %L,
        -8001,
        null,
        null,
        'Tagged Draft Updated',
        'tagged-draft',
        null,
        'Updated body',
        array(
          select post_tag.tag_id
          from public.post_tags as post_tag
          where post_tag.post_id = -8001
        )
      )
    $$,
    (select updated_at from public.posts where id = -8001)
  ),
  'publishing a Regular Post retains every Tag saved on the draft'
);
select results_eq(
  $$
    select tag.name
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8001
    order by tag.name
  $$,
  $$values ('FreshTopic'::text), ('NightReading'::text)$$,
  'publication keeps the selected Tags'
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
      array[-8001, -8002]::bigint[]
    )
  $$,
  'publishing a Heartwork atomically persists its selected Tags'
);
select results_eq(
  $$
    select tag.name
    from public.post_tags as post_tag
    join public.tags as tag on tag.id = post_tag.tag_id
    where post_tag.post_id = -8002
    order by tag.name
  $$,
  $$values ('Architecture'::text), ('NightReading'::text)$$,
  'the published Heartwork has every selected Tag'
);

reset role;
set local role anon;

select results_eq(
  $$select name from public.tags where id = -8003$$,
  array['PublicTopic'::text],
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
  $$select public.create_tag('ReaderTag')$$,
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
      array[-8001]::bigint[]
    )
  $$,
  '42501',
  'Only the Sleepy Admin can publish Regular Posts.',
  'an authenticated Reader cannot mutate a Post and its Tags through the atomic RPC'
);
select throws_ok(
  $$insert into public.tags (name) values ('DirectReaderTag')$$,
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
