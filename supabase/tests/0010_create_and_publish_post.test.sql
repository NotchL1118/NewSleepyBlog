begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_function(
  'public',
  'create_and_publish_post',
  array['text', 'bigint', 'text', 'text', 'text', 'text', 'bigint[]'],
  'a Post can be created and published through one atomic function'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_and_publish_post(text,bigint,text,text,text,text,bigint[])',
    'execute'
  ),
  'authenticated callers can invoke atomic creation through Admin RLS'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_and_publish_post(text,bigint,text,text,text,text,bigint[])',
    'execute'
  ),
  'anonymous Readers cannot invoke atomic creation'
);

delete from private.site_admins;

insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'atomic-admin@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'atomic-reader@example.test');

insert into private.site_admins (user_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

insert into public.post_groups (id, kind, name, slug)
overriding system value
values (-10001, 'regular', 'Atomic Category', 'atomic-category');

insert into public.tags (id, name)
overriding system value
values (-10001, 'AtomicTag');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);

select lives_ok(
  $$
    select public.create_and_publish_post(
      'regular', -10001, 'Atomic Post', 'atomic-post', 'Summary',
      'Published in one transaction', array[-10001]::bigint[]
    )
  $$,
  'the Admin can create and publish a complete Post directly'
);
select results_eq(
  $$
    select status
    from public.posts
    where slug = 'atomic-post'
  $$,
  array['published'::text],
  'direct publication creates a Published Post'
);
select results_eq(
  $$
    select count(*)
    from public.post_tags pt
    join public.posts p on p.id = pt.post_id
    where p.slug = 'atomic-post'
      and pt.tag_id = -10001
  $$,
  array[1::bigint],
  'direct publication persists selected Tags'
);

select throws_ok(
  $$
    select public.create_and_publish_post(
      'regular', -10001, 'Invalid Atomic Post', 'invalid-atomic-post', null,
      '   ', '{}'::bigint[]
    )
  $$,
  '22023',
  'Post Markdown body is required for publication.',
  'invalid direct publication fails validation'
);
select results_eq(
  $$
    select count(*)
    from public.posts
    where slug = 'invalid-atomic-post'
       or title = 'Invalid Atomic Post'
  $$,
  array[0::bigint],
  'failed direct publication leaves no Draft behind'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  true
);

select throws_ok(
  $$
    select public.create_and_publish_post(
      'regular', -10001, 'Reader Post', 'reader-atomic-post', null,
      'Body', '{}'::bigint[]
    )
  $$,
  '42501',
  'Only the Sleepy Admin can create Post drafts.',
  'an authenticated Reader cannot create and publish a Post'
);

reset role;

select * from finish();
rollback;
