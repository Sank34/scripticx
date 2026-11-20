begin;

alter table public.snippets
  add column is_live_workspace boolean not null default false,
  add constraint snippets_live_workspace_private check (not is_live_workspace or is_public is not true);

-- A session-created project cannot predate its first linked room.
-- Keep published projects and projects connected to GitHub in the repository library.
with first_linked_room as (
  select project_id, owner_id, min(created_at) as started_at
  from public.live_rooms
  where project_id is not null
  group by project_id, owner_id
)
update public.snippets as project
set is_live_workspace = true
from first_linked_room as room
where project.id = room.project_id
  and project.user_id = room.owner_id
  and project.created_at >= room.started_at
  and project.is_public is not true
  and not exists (
    select 1 from public.github_project_links as link where link.project_id = project.id
  );

create or replace function public.sync_live_workspace_project()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
  origin jsonb;
  requested_id uuid;
  primary_code text;
  github jsonb;
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Live session ownership cannot be changed.' using errcode = '42501';
    end if;
    if old.project_id is not null and new.project_id is distinct from old.project_id then
      raise exception 'The linked project cannot be changed.' using errcode = '42501';
    end if;
    if old.status = 'closed' and (new.status is distinct from old.status or new.code is distinct from old.code) and actor is not null then
      raise exception 'This live session has ended.' using errcode = '42501';
    end if;
    if actor is not null and actor <> old.owner_id then
      if old.status <> 'active' or not exists (
        select 1 from public.room_participants where room_id = old.id and user_id = actor and status = 'accepted'
      ) or (to_jsonb(new) - array['code', 'updated_at']) is distinct from (to_jsonb(old) - array['code', 'updated_at']) then
        raise exception 'Live session access denied.' using errcode = '42501';
      end if;
    end if;
  elsif actor is not null and actor <> new.owner_id then
    raise exception 'Only the owner can create a live session.' using errcode = '42501';
  end if;

  if new.code is not null and (tg_op = 'INSERT' or new.code is distinct from old.code or new.project_id is null) then
    if length(new.code) > 10000000 then raise exception 'Workspace is too large.'; end if;
    if starts_with(new.code, 'SCRIPTICX_WORKSPACE_V1:') then
      payload := substring(new.code from length('SCRIPTICX_WORKSPACE_V1:') + 1)::jsonb;
      if payload->>'version' is distinct from '1' or jsonb_typeof(payload->'entries') is distinct from 'array' then
        raise exception 'Invalid live workspace.';
      end if;
    else
      payload := jsonb_build_object('version', 1, 'title', coalesce(new.name, 'Live project'), 'description', '',
        'entries', jsonb_build_array(jsonb_build_object('kind', 'file', 'id', 'legacy-main', 'path', 'main.msp', 'name', 'main.msp', 'language', 'msp', 'content', new.code)), 'activeFileId', 'legacy-main');
    end if;
    if not exists (select 1 from jsonb_array_elements(payload->'entries') entry
      where entry->>'kind' = 'file' and length(trim(entry->>'path')) > 0 and jsonb_typeof(entry->'content') = 'string') then
      raise exception 'The workspace must contain a file.';
    end if;

    if new.project_id is null and (actor is null or actor = new.owner_id) then
      begin requested_id := (payload->'project'->>'projectId')::uuid;
      exception when invalid_text_representation then requested_id := null; end;
      select id into new.project_id from public.snippets where id = requested_id and user_id = new.owner_id;
    end if;
    select entry->>'content' into primary_code from jsonb_array_elements(payload->'entries') with ordinality as files(entry, position)
      where entry->>'kind' = 'file' order by (entry->>'path' = 'main.msp') desc, position limit 1;
    if new.project_id is null then
      insert into public.snippets(user_id, title, description, code, files, is_public, is_live_workspace)
        values(new.owner_id, coalesce(nullif(trim(payload->>'title'), ''), 'Live project'), coalesce(payload->>'description', ''), coalesce(primary_code, ''), payload->'entries', false, true)
        returning id into new.project_id;
    elsif not (tg_op = 'UPDATE' and old.status = 'closed' and actor is null) then
      update public.snippets set title = coalesce(nullif(trim(payload->>'title'), ''), 'Live project'),
        description = coalesce(payload->>'description', ''), code = coalesce(primary_code, ''), files = payload->'entries', is_public = false
        where id = new.project_id and user_id = new.owner_id;
      if not found then raise exception 'The linked project is unavailable.'; end if;
    end if;
    origin := jsonb_build_object('projectId', new.project_id, 'ownerId', new.owner_id);
    github := payload->'project'->'github';
    if tg_op = 'UPDATE' and actor is distinct from new.owner_id and starts_with(old.code, 'SCRIPTICX_WORKSPACE_V1:') then
      github := (substring(old.code from length('SCRIPTICX_WORKSPACE_V1:') + 1)::jsonb)->'project'->'github';
    end if;
    if jsonb_typeof(github) = 'object' then
      origin := origin || jsonb_build_object('github', jsonb_build_object('owner', github->>'owner', 'repo', github->>'repo', 'branch', github->>'branch'));
    end if;
    new.code := 'SCRIPTICX_WORKSPACE_V1:' || jsonb_set(payload, '{project}', origin)::text;
  end if;
  if new.status = 'closed' then
    if tg_op = 'UPDATE' and old.status = 'active' then
      update public.snippets set is_public = false where id = new.project_id and user_id = new.owner_id;
    end if;
    new.code := null;
  end if;
  return new;
end;
$$;

commit;
