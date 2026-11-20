begin;

alter table public.snippets
  add column template_source_id uuid references public.snippets(id) on delete set null;

create index snippets_template_source_idx on public.snippets (template_source_id)
where template_source_id is not null;

create function public.validate_repository_template_source()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.template_source_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.template_source_id is not distinct from old.template_source_id then
    return new;
  end if;

  perform 1 from public.snippets as source
  where source.id = new.template_source_id and source.id <> new.id and source.is_public is true
  for share;

  -- The author can still save a draft if its original was removed or made private.
  if not found then new.template_source_id := null; end if;
  return new;
end;
$$;

revoke all on function public.validate_repository_template_source() from public, anon, authenticated;

create trigger snippets_validate_repository_template_source
before insert or update of template_source_id on public.snippets
for each row execute function public.validate_repository_template_source();

commit;
