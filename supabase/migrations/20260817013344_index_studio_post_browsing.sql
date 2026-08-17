create index posts_kind_updated_id_idx
  on public.posts (kind, updated_at desc, id desc);

create index posts_kind_status_updated_id_idx
  on public.posts (kind, status, updated_at desc, id desc);
