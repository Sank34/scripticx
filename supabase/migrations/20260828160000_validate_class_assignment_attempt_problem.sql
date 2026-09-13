-- Ensure class attempts can only target a problem that belongs to the assignment.
-- The function remains the canonical eligibility gate for web and mobile clients.

create or replace function public.submit_class_assignment_attempt(
  p_assignment_id uuid,
  p_problem_id uuid,
  p_code text,
  p_language text default 'miniscript'
)
returns public.class_assignment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_row public.assignments%rowtype;
  next_attempt integer;
  result public.class_assignment_attempts;
begin
  select * into assignment_row
  from public.assignments
  where id = p_assignment_id;

  if assignment_row.id is null then
    raise exception 'Assignment not found.';
  end if;
  if coalesce(public.class_member_role(assignment_row.class_id), '') <> 'student' then
    raise exception 'Only students can submit class assignment attempts.';
  end if;
  if exists (
    select 1 from public.classes
    where id = assignment_row.class_id and archived_at is not null
  ) then
    raise exception 'This class is archived.';
  end if;
  if nullif(trim(p_code), '') is null or length(p_code) > 20000 then
    raise exception 'A solution between 1 and 20000 characters is required.';
  end if;
  if p_language is distinct from 'miniscript' then
    raise exception 'Unsupported assignment language.';
  end if;
  if not (
    coalesce(assignment_row.problem_id = p_problem_id, false)
    or p_problem_id = any(coalesce(assignment_row.problem_ids, array[]::uuid[]))
  ) then
    raise exception 'This problem does not belong to the assignment.';
  end if;
  if assignment_row.status not in ('published', 'scheduled')
     or (assignment_row.available_at is not null and assignment_row.available_at > now()) then
    raise exception 'This assignment is not available.';
  end if;
  if assignment_row.deadline is not null
     and assignment_row.deadline < now()
     and not assignment_row.allow_late then
    raise exception 'The deadline has passed.';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.class_assignment_attempts
  where assignment_id = p_assignment_id
    and problem_id = p_problem_id
    and user_id = auth.uid();

  if assignment_row.max_attempts is not null and next_attempt > assignment_row.max_attempts then
    raise exception 'The maximum number of attempts has been reached.';
  end if;

  insert into public.class_assignment_attempts (
    assignment_id,
    problem_id,
    user_id,
    code,
    language,
    attempt_number
  ) values (
    p_assignment_id,
    p_problem_id,
    auth.uid(),
    p_code,
    p_language,
    next_attempt
  )
  returning * into result;

  insert into public.assignment_problem_submissions (
    assignment_id,
    problem_id,
    user_id,
    code
  ) values (
    p_assignment_id,
    p_problem_id,
    auth.uid(),
    p_code
  )
  on conflict (assignment_id, problem_id, user_id)
  do update set code = excluded.code;

  return result;
end;
$$;

revoke all on function public.submit_class_assignment_attempt(uuid, uuid, text, text)
  from public;
grant execute on function public.submit_class_assignment_attempt(uuid, uuid, text, text)
  to authenticated;
