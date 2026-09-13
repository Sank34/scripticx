-- Server-verified game progress. Never backfill from browser/local progress.
begin;
create table public.game_missions (
  id text primary key,
  prerequisite text references public.game_missions(id),
  points integer not null check (points >= 0),
  product_id text references public.reward_products(id),
  active boolean not null default true
);
insert into public.game_missions(id,prerequisite,points,product_id) values
  ('lanterns',null,500,'miniscript-background'),
  ('gate','lanterns',500,null),
  ('beacon','gate',500,null);
create table public.game_mission_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.game_missions(id),
  completed_at timestamptz not null default now(),
  points_awarded integer not null,
  product_id text references public.reward_products(id),
  solution_hash text not null,
  verifier_version text not null default 'island-v1',
  primary key(user_id,mission_id)
);
alter table public.game_missions enable row level security;
alter table public.game_mission_completions enable row level security;
revoke all on public.game_missions, public.game_mission_completions from anon,authenticated;
grant select on public.game_missions, public.game_mission_completions to authenticated;
grant all on public.game_missions, public.game_mission_completions to service_role;
create policy game_catalog_read on public.game_missions for select to authenticated using(active);
create policy own_game_progress on public.game_mission_completions for select to authenticated using(user_id=(select auth.uid()));

create function public.complete_game_mission(p_user_id uuid,p_mission_id text,p_solution_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.game_missions%rowtype; previous public.game_mission_completions%rowtype; balance bigint;
begin
  -- Only service_role can call; caller never supplies reward amount or product.
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
  if p_solution_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid solution digest'; end if;
  select * into m from public.game_missions where id=p_mission_id and active;
  if not found then raise exception 'Unknown mission'; end if;
  -- Serializes simultaneous tabs, retries and different missions for one account.
  select coalesce(reward_points,0) into balance from public.profiles where id=p_user_id for update;
  if not found then raise exception 'Unknown player'; end if;
  select * into previous from public.game_mission_completions where user_id=p_user_id and mission_id=p_mission_id;
  if found then return jsonb_build_object('alreadyCompleted',true,'points',0,'productId',null,'balance',balance); end if;
  if m.prerequisite is not null and not exists(select 1 from public.game_mission_completions where user_id=p_user_id and mission_id=m.prerequisite) then
    raise exception 'Complete the previous mission first' using errcode='42501';
  end if;
  insert into public.game_mission_completions(user_id,mission_id,points_awarded,product_id,solution_hash)
    values(p_user_id,m.id,m.points,m.product_id,p_solution_hash);
  update public.profiles set reward_points=coalesce(reward_points,0)+m.points where id=p_user_id returning reward_points into balance;
  if m.product_id is not null then
    insert into public.user_reward_inventory(user_id,product_id,acquired_at,equipped_at)
      values(p_user_id,m.product_id,now(),null) on conflict(user_id,product_id) do nothing;
  end if;
  return jsonb_build_object('alreadyCompleted',false,'points',m.points,'productId',m.product_id,'balance',balance);
end $$;
revoke all on function public.complete_game_mission(uuid,text,text) from public,anon,authenticated;
grant execute on function public.complete_game_mission(uuid,text,text) to service_role;
commit;
