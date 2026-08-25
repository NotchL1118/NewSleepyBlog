begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

create function pg_temp.error_code(p_statement text)
returns text
language plpgsql
as $$
declare
  raised_code text;
begin
  execute p_statement;
  return '<no exception raised>';
exception when others then
  get stacked diagnostics raised_code = returned_sqlstate;
  return raised_code;
end;
$$;

create function pg_temp.error_hint(p_statement text)
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
values ('99999999-9999-4999-8999-999999999971', 'taxonomy-admin@example.test');

insert into private.site_admins (user_id)
values ('99999999-9999-4999-8999-999999999971');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999971',
  true
);

select lives_ok(
  $$select public.create_post_group('regular', '  Engineering  ', 'engineering', '  Notes  ')$$,
  'the Admin can create a Category explicitly'
);

select is(
  (select name from public.post_groups where slug = 'engineering'),
  'Engineering',
  'Post Group names are trimmed'
);

select is(
  (select description from public.post_groups where slug = 'engineering'),
  'Notes',
  'blank padding is removed from Post Group descriptions'
);

select is(
  pg_temp.error_hint(
    $$select public.create_post_group('regular', 'Engineering', 'another-engineering', null)$$
  ),
  'group_name_taken',
  'duplicate Category names report a stable conflict token'
);

select is(
  pg_temp.error_code(
    $$update public.post_groups set slug = 'renamed-engineering' where slug = 'engineering'$$
  ),
  '23514',
  'Post Group Slugs are immutable'
);

select is(
  pg_temp.error_code(
    $$update public.post_groups set kind = 'heartwork' where slug = 'engineering'$$
  ),
  '23514',
  'Post Group kinds are immutable'
);

select is(
  pg_temp.error_code(
    $$insert into public.post_groups (kind, name, slug) values ('regular', '   ', 'blank-name')$$
  ),
  '23514',
  'Post Group names cannot be blank through direct table writes'
);

select lives_ok(
  $$select public.update_post_group(
      (select id from public.post_groups where slug = 'engineering'),
      (select updated_at from public.post_groups where slug = 'engineering'),
      'Platform Engineering',
      null
    )$$,
  'the Admin can update mutable Post Group fields'
);

select is(
  pg_temp.error_code(
    $$select public.update_post_group(
        (select id from public.post_groups where slug = 'engineering'),
        '2000-01-01 00:00:00+00'::timestamptz,
        'Stale update',
        null
      )$$
  ),
  '40001',
  'stale Post Group updates are rejected'
);

insert into public.posts (kind, group_id, title, slug, body_markdown)
select 'regular', id, 'Draft', 'taxonomy-draft', 'Body'
from public.post_groups
where slug = 'engineering';

select is(
  pg_temp.error_hint(
    $$select public.delete_post_group(
        (select id from public.post_groups where slug = 'engineering'),
        (select updated_at from public.post_groups where slug = 'engineering')
      )$$
  ),
  'group_in_use',
  'referenced Post Groups cannot be deleted'
);

select lives_ok(
  $$select public.create_tag('  Database  ')$$,
  'the Admin can create a Tag explicitly'
);

select lives_ok(
  $$select public.update_tag(
      (select id from public.tags where name = 'Database'),
      (select updated_at from public.tags where name = 'Database'),
      'Data'
    )$$,
  'the Admin can update a Tag name'
);

reset role;

select is(
  pg_temp.error_code(
    $$update public.tags set name = 'Data Science' where name = 'Data'$$
  ),
  '23514',
  'Tag names cannot gain whitespace through direct writes'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999971',
  true
);

select is(
  pg_temp.error_code(
    $$select public.update_tag(
        (select id from public.tags where name = 'Data'),
        '2000-01-01 00:00:00+00'::timestamptz,
        'Stale tag update'
      )$$
  ),
  '40001',
  'stale Tag updates are rejected'
);

select lives_ok(
  $$select public.delete_tag(
      (select id from public.tags where name = 'Data'),
      (select updated_at from public.tags where name = 'Data')
    )$$,
  'unused Tags can be deleted'
);

reset role;

select * from finish();
rollback;
