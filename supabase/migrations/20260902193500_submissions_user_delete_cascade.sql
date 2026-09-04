-- Submission code and results belong to the account that created them.
-- Legacy databases used the default NO ACTION foreign key, which prevented
-- administrators from deleting users who had submitted at least one solution.

begin;

do $$
declare
  v_constraint record;
begin
  if to_regclass('public.submissions') is null then
    return;
  end if;

  for v_constraint in
    select
      constraint_row.conname as constraint_name,
      target_namespace.nspname as target_schema,
      target_table.relname as target_table,
      target_column.attname as target_column
    from pg_catalog.pg_constraint as constraint_row
    join pg_catalog.pg_attribute as source_column
      on source_column.attrelid = constraint_row.conrelid
     and source_column.attnum = constraint_row.conkey[1]
    join pg_catalog.pg_class as target_table
      on target_table.oid = constraint_row.confrelid
    join pg_catalog.pg_namespace as target_namespace
      on target_namespace.oid = target_table.relnamespace
    join pg_catalog.pg_attribute as target_column
      on target_column.attrelid = constraint_row.confrelid
     and target_column.attnum = constraint_row.confkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = 'public.submissions'::regclass
      and constraint_row.confrelid in (
        'auth.users'::regclass,
        'public.profiles'::regclass
      )
      and constraint_row.confdeltype in ('a', 'r')
      and pg_catalog.array_length(constraint_row.conkey, 1) = 1
      and pg_catalog.array_length(constraint_row.confkey, 1) = 1
      and source_column.attname = 'user_id'
      and target_column.attname = 'id'
  loop
    execute format(
      'alter table public.submissions drop constraint %I',
      v_constraint.constraint_name
    );

    -- Preserve the original name because PostgREST can use FK names to
    -- disambiguate embedded relationships.
    execute format(
      'alter table public.submissions add constraint %I foreign key (user_id) references %I.%I(%I) on delete cascade not valid',
      v_constraint.constraint_name,
      v_constraint.target_schema,
      v_constraint.target_table,
      v_constraint.target_column
    );

    execute format(
      'alter table public.submissions validate constraint %I',
      v_constraint.constraint_name
    );
  end loop;
end;
$$;

commit;
