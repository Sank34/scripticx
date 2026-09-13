begin;
-- User managers need role names to recognize accounts they cannot modify.
create policy platform_roles_user_manager_read on public.platform_roles for select to authenticated
using (public.has_platform_permission('admin.users'));
create policy platform_user_roles_user_manager_read on public.platform_user_roles for select to authenticated
using (public.has_platform_permission('admin.users'));
notify pgrst, 'reload schema';
commit;
