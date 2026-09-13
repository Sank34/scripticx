-- Make administrator-initiated account deletion predictable and auditable.
--
-- Supabase Auth refuses to remove accounts that still own Storage objects.
-- This migration exposes a service-role-only inventory of those objects so the
-- application can delete them through the Storage API before deleting auth.users.

begin;

-- Campaigns are platform records and should survive the deletion of the admin
-- who originally created them. Older schema versions used ON DELETE RESTRICT.
do $$
declare
  v_constraint_name text;
begin
  if to_regclass('public.email_campaigns') is null then
    return;
  end if;

  alter table public.email_campaigns
    alter column created_by drop not null;

  for v_constraint_name in
    select constraint_row.conname
    from pg_catalog.pg_constraint as constraint_row
    join pg_catalog.pg_attribute as column_row
      on column_row.attrelid = constraint_row.conrelid
     and column_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = 'public.email_campaigns'::regclass
      and constraint_row.confrelid = 'auth.users'::regclass
      and pg_catalog.array_length(constraint_row.conkey, 1) = 1
      and column_row.attname = 'created_by'
  loop
    execute format(
      'alter table public.email_campaigns drop constraint %I',
      v_constraint_name
    );
  end loop;

  alter table public.email_campaigns
    add constraint email_campaigns_created_by_fkey
    foreign key (created_by)
    references auth.users(id)
    on delete set null;
end;
$$;

-- Normalize legacy profile foreign keys. Several production tables predate the
-- versioned schema and still use the default NO ACTION behavior. New accounts
-- are more likely to have rows in these tables (rewards, workspaces and social
-- activity), which made only those accounts impossible to delete.
do $$
declare
  v_target record;
  v_constraint_name text;
  v_new_constraint_name text;
  v_preserved_constraint_name text;
  v_has_matching_constraint boolean;
begin
  for v_target in
    select *
    from (values
      ('public', 'profiles', 'id', 'auth', 'users', 'id', 'cascade'),
      ('public', 'assignment_submissions', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'live_participants', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'classes', 'teacher_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'class_members', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'follows', 'follower_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'follows', 'following_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'reward_transactions', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'reward_point_awards', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'user_reward_inventory', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'room_participants', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_groups', 'owner_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_group_invites', 'created_by', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_group_members', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_group_messages', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_group_message_reactions', 'user_id', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'study_group_stickers', 'created_by', 'public', 'profiles', 'id', 'cascade'),
      ('public', 'problems', 'author_id', 'public', 'profiles', 'id', 'set null'),
      ('public', 'daily_challenges', 'created_by', 'public', 'profiles', 'id', 'set null'),
      ('public', 'notifications', 'actor_id', 'public', 'profiles', 'id', 'set null')
    ) as target(
      source_schema,
      source_table,
      source_column,
      target_schema,
      target_table,
      target_column,
      delete_action
    )
  loop
    if to_regclass(format('%I.%I', v_target.source_schema, v_target.source_table)) is null
      or to_regclass(format('%I.%I', v_target.target_schema, v_target.target_table)) is null
    then
      continue;
    end if;

    v_has_matching_constraint := false;
    v_preserved_constraint_name := null;
    for v_constraint_name in
      select constraint_row.conname
      from pg_catalog.pg_constraint as constraint_row
      join pg_catalog.pg_attribute as source_column
        on source_column.attrelid = constraint_row.conrelid
       and source_column.attnum = constraint_row.conkey[1]
      join pg_catalog.pg_attribute as target_column
        on target_column.attrelid = constraint_row.confrelid
       and target_column.attnum = constraint_row.confkey[1]
      where constraint_row.contype = 'f'
        and constraint_row.conrelid = to_regclass(
          format('%I.%I', v_target.source_schema, v_target.source_table)
        )
        and constraint_row.confrelid = to_regclass(
          format('%I.%I', v_target.target_schema, v_target.target_table)
        )
        and pg_catalog.array_length(constraint_row.conkey, 1) = 1
        and pg_catalog.array_length(constraint_row.confkey, 1) = 1
        and source_column.attname = v_target.source_column
        and target_column.attname = v_target.target_column
    loop
      v_has_matching_constraint := true;
      v_preserved_constraint_name := coalesce(
        v_preserved_constraint_name,
        v_constraint_name
      );
      execute format(
        'alter table %I.%I drop constraint %I',
        v_target.source_schema,
        v_target.source_table,
        v_constraint_name
      );
    end loop;

    -- Do not add a second relationship when an environment already uses a
    -- newer FK target (for example classes.teacher_id -> auth.users.id).
    if not v_has_matching_constraint then
      continue;
    end if;

    -- Keep the original name because PostgREST allows clients to disambiguate
    -- relationships by FK name (for example profiles!follows_follower_id_fkey).
    v_new_constraint_name := v_preserved_constraint_name;

    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references %I.%I(%I) on delete %s not valid',
      v_target.source_schema,
      v_target.source_table,
      v_new_constraint_name,
      v_target.source_column,
      v_target.target_schema,
      v_target.target_table,
      v_target.target_column,
      case v_target.delete_action
        when 'set null' then 'set null'
        else 'cascade'
      end
    );
    execute format(
      'alter table %I.%I validate constraint %I',
      v_target.source_schema,
      v_target.source_table,
      v_new_constraint_name
    );
  end loop;
end;
$$;

create or replace function public.admin_user_deletion_blockers(
  p_user_id uuid
)
returns table (
  schema_name text,
  table_name text,
  column_name text,
  constraint_name text,
  delete_action text,
  matching_rows bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reference record;
  v_matching_rows bigint;
begin
  if p_user_id is null then
    raise exception 'User is required' using errcode = '22023';
  end if;

  for v_reference in
    select
      source_namespace.nspname::text as schema_name,
      source_table.relname::text as table_name,
      source_column.attname::text as column_name,
      constraint_row.conname::text as constraint_name,
      case constraint_row.confdeltype
        when 'r' then 'restrict'
        else 'no_action'
      end as delete_action
    from pg_catalog.pg_constraint as constraint_row
    join pg_catalog.pg_class as source_table
      on source_table.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace as source_namespace
      on source_namespace.oid = source_table.relnamespace
    join pg_catalog.pg_attribute as source_column
      on source_column.attrelid = constraint_row.conrelid
     and source_column.attnum = constraint_row.conkey[1]
    join pg_catalog.pg_attribute as target_column
      on target_column.attrelid = constraint_row.confrelid
     and target_column.attnum = constraint_row.confkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid in (
        'auth.users'::regclass,
        'public.profiles'::regclass
      )
      and constraint_row.confdeltype in ('a', 'r')
      and pg_catalog.array_length(constraint_row.conkey, 1) = 1
      and pg_catalog.array_length(constraint_row.confkey, 1) = 1
      and target_column.attname = 'id'
      -- Storage ownership is intentionally handled through the Storage API so
      -- both metadata and the underlying object are removed together.
      and source_namespace.nspname <> 'storage'
  loop
    execute format(
      'select count(*) from %I.%I where %I = $1',
      v_reference.schema_name,
      v_reference.table_name,
      v_reference.column_name
    )
    into v_matching_rows
    using p_user_id;

    if v_matching_rows > 0 then
      schema_name := v_reference.schema_name;
      table_name := v_reference.table_name;
      column_name := v_reference.column_name;
      constraint_name := v_reference.constraint_name;
      delete_action := v_reference.delete_action;
      matching_rows := v_matching_rows;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.admin_user_deletion_blockers(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_user_deletion_blockers(uuid)
  to service_role;

create or replace function public.admin_list_user_storage_objects(
  p_user_id uuid,
  p_limit integer default 500,
  p_offset integer default 0
)
returns table (
  bucket_id text,
  object_name text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    stored_object.bucket_id::text,
    stored_object.name::text
  from storage.objects as stored_object
  where stored_object.owner_id = p_user_id::text
  order by stored_object.bucket_id, stored_object.name
  limit least(greatest(coalesce(p_limit, 500), 1), 1000)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.admin_list_user_storage_objects(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_list_user_storage_objects(uuid, integer, integer)
  to service_role;

commit;
