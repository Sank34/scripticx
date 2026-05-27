create or replace function public.update_live_room_code(
  p_room_id uuid,
  p_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.live_rooms lr
    where lr.id = p_room_id
      and (
        lr.owner_id = auth.uid()
        or exists (
          select 1
          from public.room_participants rp
          where rp.room_id = p_room_id
            and rp.user_id = auth.uid()
            and coalesce(rp.status, 'accepted') = 'accepted'
        )
      )
  ) then
    raise exception 'Not allowed to update this live room code';
  end if;

  update public.live_rooms
  set code = p_code
  where id = p_room_id;
end;
$$;

revoke all on function public.update_live_room_code(uuid, text) from public;
grant execute on function public.update_live_room_code(uuid, text) to authenticated;
