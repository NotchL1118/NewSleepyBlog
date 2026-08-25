begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Every conflict a Studio form can provoke must carry a stable token in the
-- exception HINT. The Server Action maps `code` + `hint` to a field error, so a
-- missing or renamed token silently degrades that field error into the generic
-- fallback. These assertions are what makes that failure loud.

create function pg_temp.conflict_hint(p_statement text)
returns text
language plpgsql
as $$
declare
  raised_hint text;
begin
  execute p_statement;
  return '<no exception raised>';
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;

delete from private.site_admins;

insert into auth.users (id, email)
values ('99999999-9999-4999-8999-999999999981', 'issue-10-admin@example.test');

insert into private.site_admins (user_id)
values ('99999999-9999-4999-8999-999999999981');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values (-9001, 'regular', 'Token Category', 'token-category');

insert into public.posts (
  id, kind, group_id, title, slug, body_markdown, status, updated_at, published_at
)
overriding system value
values
  (-9001, 'regular', -9001, 'Taken Slug Post', 'taken-slug', 'Body', 'published',
   '2026-08-01 00:00:00+00', '2026-08-01 00:00:00+00'),
  (-9002, 'regular', -9001, 'Draft Under Test', 'draft-under-test', 'Body', 'draft',
   '2026-08-02 00:00:00+00', null),
  (-9003, 'regular', -9001, 'Second Draft', 'second-draft', 'Body', 'draft',
   '2026-08-03 00:00:00+00', null);

insert into public.tags (id, name)
overriding system value
values (-9001, 'TakenTag');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999981',
  true
);

select is(
  pg_temp.conflict_hint(
    $$select public.update_post_content(
        -9002, '2026-08-02 00:00:00+00'::timestamptz, -9001, 'Draft', 'taken-slug'
      )$$
  ),
  'post_slug_taken',
  'saving a draft onto an existing Post Slug reports post_slug_taken'
);

select is(
  pg_temp.conflict_hint(
    $$select public.update_post_content(
        -9002, '2026-08-02 00:00:00+00'::timestamptz, -9999, 'Draft', 'draft-under-test'
      )$$
  ),
  'group_missing',
  'saving a draft into a missing Post Group reports group_missing'
);

select is(
  pg_temp.conflict_hint(
    $$select public.update_post_content(
        -9002, '2026-08-02 00:00:00+00'::timestamptz, -9001, 'Draft', 'draft-under-test',
        null, '', array[-9999]::bigint[]
      )$$
  ),
  'tag_missing',
  'saving a draft with a deleted Tag reports tag_missing'
);

select hasnt_function(
  'public',
  'update_post_content',
  array[
    'bigint', 'timestamp with time zone', 'bigint', 'text', 'text',
    'text', 'text', 'bigint[]', 'text', 'text'
  ],
  'Post updates no longer expose inline Tag creation parameters'
);

select hasnt_function(
  'public',
  'publish_post',
  array[
    'bigint', 'text', 'timestamp with time zone', 'bigint', 'text', 'text',
    'text', 'text', 'text', 'text', 'bigint[]', 'text', 'text'
  ],
  'publication no longer exposes inline Tag creation parameters'
);

select is(
  pg_temp.conflict_hint(
    $$select public.publish_post(
        -9003, 'regular', '2026-08-03 00:00:00+00'::timestamptz, -9001, null, null,
        'Second Draft', 'taken-slug', null, 'Body'
      )$$
  ),
  'post_slug_taken',
  'publishing onto an existing Post Slug reports post_slug_taken'
);

select is(
  pg_temp.conflict_hint(
    $$select public.publish_post(
        -9003, 'regular', '2026-08-03 00:00:00+00'::timestamptz, null,
        'Token Category', 'fresh-category',
        'Second Draft', 'second-draft', null, 'Body'
      )$$
  ),
  'group_must_exist',
  'publication rejects inline Post Group creation by name'
);

select is(
  pg_temp.conflict_hint(
    $$select public.publish_post(
        -9003, 'regular', '2026-08-03 00:00:00+00'::timestamptz, null,
        'Fresh Category', 'token-category',
        'Second Draft', 'second-draft', null, 'Body'
      )$$
  ),
  'group_must_exist',
  'publication rejects inline Post Group creation by Slug'
);

reset role;

select * from finish();
rollback;
