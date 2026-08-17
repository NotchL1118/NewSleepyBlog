create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Uses the statement timestamp so first publication and its initial update share one value.';
