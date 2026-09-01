begin;

-- Group chat clients use Postgres Changes for durable cross-device updates.
-- Keep this idempotent because production projects may already have enabled
-- one or more of these tables from the Supabase dashboard.
do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'study_group_messages',
    'study_group_message_reactions',
    'study_group_channels',
    'study_group_members',
    'study_group_stickers'
  ]
  loop
    if to_regclass(format('public.%I', realtime_table)) is null then
      continue;
    end if;

    -- UPDATE and DELETE payloads need group_id/channel_id so filtered clients
    -- can refresh the correct conversation.
    execute format(
      'alter table public.%I replica identity full',
      realtime_table
    );

    if exists (
      select 1
      from pg_publication
      where pubname = 'supabase_realtime'
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end;
$$;

commit;
