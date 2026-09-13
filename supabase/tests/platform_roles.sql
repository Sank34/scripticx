-- Run after the roles migration. All fixtures and setting changes roll back.
begin;
select set_config('request.jwt.claims', json_build_object('role','service_role')::text,true);
do $$
declare test_user uuid; test_role uuid;
begin
  select id into test_user from public.profiles where role='user' and not coalesce(banned,false) limit 1;
  if test_user is null then raise exception 'A regular user fixture is required'; end if;
  insert into public.platform_roles(name,permissions) values ('__rbac_transaction_test__',array['admin.shop','maintenance.bypass']) returning id into test_role;
  insert into public.platform_user_roles values(test_user,test_role);
  perform set_config('rbac.test_user', test_user::text,true);
  perform set_config('rbac.test_role', test_role::text,true);
  perform set_config('request.jwt.claims',json_build_object('role','authenticated','sub',test_user)::text,true);
  update public.platform_settings set lockdown_enabled=false where id='global';
end $$;
set local role authenticated;
do $$
declare affected integer;
begin
  if not public.has_platform_permission('admin.shop') then raise exception 'Designer shop access failed'; end if;
  if public.has_platform_permission('admin.tasks') then raise exception 'Designer gained tasks'; end if;
  if public.is_platform_admin() then raise exception 'Custom role became admin'; end if;
  update public.reward_products set sort_order=sort_order;
  get diagnostics affected = row_count;
  if affected=0 then raise exception 'Designer shop RLS denied'; end if;
  if exists(select 1 from public.admin_tasks) then raise exception 'Task data leaked'; end if;
  begin
    insert into public.platform_roles(name) values('__unauthorized__');
    raise exception 'Role escalation succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.admin_tasks(title) values('__unauthorized__');
    raise exception 'Task insertion succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'Profile escalation succeeded';
  exception when insufficient_privilege then null;
  when raise_exception then
    if sqlerrm <> 'profile_security_fields_are_managed' then raise; end if;
  end;
  begin
    perform public.platform_user_permissions(gen_random_uuid());
    raise exception 'Another account permissions leaked';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.platform_settings set lockdown_enabled=true,lockdown_mode='maintenance' where id='global';
set local role authenticated;
do $$ begin
  if not public.platform_access_allowed() or not public.has_platform_permission('admin.shop') then raise exception 'Maintenance bypass failed'; end if;
end $$;
reset role;
update public.platform_roles set permissions=array['admin.shop'] where id=current_setting('rbac.test_role')::uuid;
set local role authenticated;
do $$ begin
  if public.platform_access_allowed() or public.has_platform_permission('admin.shop') then raise exception 'Maintenance bypass revocation failed'; end if;
end $$;
reset role;
update public.platform_settings set lockdown_enabled=false where id='global';
delete from public.platform_user_roles where user_id=current_setting('rbac.test_user')::uuid and role_id=current_setting('rbac.test_role')::uuid;
set local role authenticated;
do $$ begin
  if public.has_platform_permission('admin.shop') then raise exception 'Role revocation failed'; end if;
end $$;
reset role;
update public.platform_settings set lockdown_enabled=true,lockdown_mode='competition' where id='global';
do $$
declare competition_id uuid;
begin
  select id into competition_id from public.competitions limit 1;
  if competition_id is null then raise exception 'A competition fixture is required'; end if;
  perform set_config('request.jwt.claims',json_build_object('role','service_role')::text,true);
  insert into public.competition_participants(competition_id,user_id,status)
  values(competition_id,current_setting('rbac.test_user')::uuid,'active')
  on conflict on constraint competition_participants_pkey do update set status='active';
  perform set_config('request.jwt.claims',json_build_object('role','authenticated','sub',current_setting('rbac.test_user'))::text,true);
end $$;
set local role authenticated;
do $$ begin
  if public.platform_access_allowed() then raise exception 'Participant can access unrelated platform data'; end if;
  if not public.competition_access_allowed() then raise exception 'Participant cannot access competitions'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Participant identity cannot load'; end if;
end $$;
reset role;
rollback;
