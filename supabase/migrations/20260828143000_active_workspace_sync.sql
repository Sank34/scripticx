begin;

create or replace function public.set_active_workspace(
  p_workspace_id uuid
)
returns table (
  active_workspace_id uuid,
  workspace_kind text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_kind text;
  v_updated_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_workspace_id is null then
    raise exception 'Workspace is required' using errcode = '22023';
  end if;

  select workspace.kind
  into v_workspace_kind
  from public.workspaces as workspace
  inner join public.workspace_members as membership
    on membership.workspace_id = workspace.id
   and membership.user_id = v_user_id
  where workspace.id = p_workspace_id;

  if not found then
    raise exception 'Workspace is not available to this account'
      using errcode = '42501';
  end if;

  update public.user_workspace_settings as settings
  set active_workspace_id = p_workspace_id
  where settings.user_id = v_user_id
  returning settings.updated_at into v_updated_at;

  if not found then
    raise exception 'Workspace settings are unavailable'
      using
        errcode = 'P0002',
        hint = 'Complete account setup before selecting a workspace.';
  end if;

  -- Keep the existing metadata key as a non-authoritative routing cache for
  -- clients that have not yet migrated to user_workspace_settings.
  update auth.users as account
  set raw_user_meta_data = coalesce(account.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'scripticx_active_workspace_kind',
      v_workspace_kind
    )
  where account.id = v_user_id;

  if not found then
    raise exception 'Account is unavailable' using errcode = 'P0002';
  end if;

  return query
  select p_workspace_id, v_workspace_kind, v_updated_at;
end;
$$;

revoke all on function public.set_active_workspace(uuid)
  from public, anon, authenticated;
grant execute on function public.set_active_workspace(uuid)
  to authenticated;

comment on function public.set_active_workspace(uuid) is
  'Atomically selects one of auth.uid() memberships and updates the legacy active-workspace metadata cache.';

commit;
