begin;

alter table public.live_rooms add column if not exists project_id uuid;

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
      insert into public.snippets(user_id, title, description, code, files, is_public)
        values(new.owner_id, coalesce(nullif(trim(payload->>'title'), ''), 'Live project'), coalesce(payload->>'description', ''), coalesce(primary_code, ''), payload->'entries', false)
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

drop trigger if exists sync_live_workspace_project on public.live_rooms;
create trigger sync_live_workspace_project before insert or update on public.live_rooms
  for each row execute function public.sync_live_workspace_project();

-- Recover existing session snapshots into owner projects before removing closed copies.
update public.live_rooms set code = code where code is not null;

create or replace function public.save_live_workspace(p_room_id uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare target public.live_rooms;
begin
  select * into target from public.live_rooms where id = p_room_id for update;
  if auth.uid() is null or target.id is null or target.status <> 'active' or not (
    target.owner_id = auth.uid() or exists (select 1 from public.room_participants where room_id = p_room_id and user_id = auth.uid() and status = 'accepted')
  ) then raise exception 'Live session access denied.' using errcode = '42501'; end if;
  update public.live_rooms set code = p_code where id = p_room_id;
end;
$$;

create or replace function public.get_live_workspace(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target public.live_rooms; project public.snippets; result jsonb; member_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into target from public.live_rooms where id = p_room_id;
  if target.id is null then return null; end if;
  select status into member_status from public.room_participants where room_id = p_room_id and user_id = auth.uid();
  if target.owner_id <> auth.uid() and member_status = 'removed' then
    raise exception 'You were removed from this session.' using errcode = '42501';
  end if;
  if target.owner_id <> auth.uid() and target.status = 'closed' and member_status is distinct from 'accepted' then
    raise exception 'Live session access denied.' using errcode = '42501';
  end if;
  result := to_jsonb(target);
  if target.owner_id = auth.uid() and target.status = 'closed' and target.project_id is not null then
    select * into project from public.snippets where id = target.project_id and user_id = auth.uid();
    if project.id is not null then
      result := result || jsonb_build_object('code', 'SCRIPTICX_WORKSPACE_V1:' || jsonb_build_object('version', 1,
        'title', project.title, 'description', project.description, 'entries', project.files,
        'project', jsonb_build_object('projectId', project.id, 'ownerId', project.user_id))::text);
    end if;
  elsif target.owner_id <> auth.uid() and (target.status = 'closed' or member_status is distinct from 'accepted') then
    result := result || jsonb_build_object('code', null, 'project_id', null);
  end if;
  return result;
end;
$$;

create or replace function public.close_live_workspace(p_room_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target public.live_rooms;
begin
  select * into target from public.live_rooms where id = p_room_id for update;
  if auth.uid() is null or target.owner_id is distinct from auth.uid() then
    raise exception 'Only the owner can end this session.' using errcode = '42501';
  end if;
  update public.live_rooms set status = 'closed', ended_at = now() where id = p_room_id;
end;
$$;

revoke all on function public.save_live_workspace(uuid, text) from public;
revoke all on function public.get_live_workspace(uuid) from public;
revoke all on function public.close_live_workspace(uuid) from public;
grant execute on function public.save_live_workspace(uuid, text), public.get_live_workspace(uuid), public.close_live_workspace(uuid) to authenticated;

commit;
