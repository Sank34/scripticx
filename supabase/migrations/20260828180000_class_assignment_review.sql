-- Make every canonical class submission reviewable and keep grading writes
-- behind a validated RPC shared by web and mobile clients.

begin;

insert into public.class_assignment_attempts (
  assignment_id,
  problem_id,
  user_id,
  code,
  language,
  attempt_number,
  status,
  submitted_at
)
select
  submission.assignment_id,
  submission.problem_id,
  submission.user_id,
  coalesce(submission.code, ''),
  'miniscript',
  1,
  'submitted',
  submission.created_at
from public.assignment_problem_submissions submission
join public.assignments assignment on assignment.id = submission.assignment_id
where submission.problem_id = assignment.problem_id
   or submission.problem_id = any(coalesce(assignment.problem_ids, array[]::uuid[]))
on conflict (assignment_id, problem_id, user_id, attempt_number) do nothing;

create or replace function public.grade_class_assignment_attempt(
  p_attempt_id uuid,
  p_status text,
  p_score numeric,
  p_feedback text default null
)
returns public.class_assignment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.class_assignment_attempts%rowtype;
  assignment_row public.assignments%rowtype;
  result public.class_assignment_attempts;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if p_status not in ('accepted', 'partial', 'rejected') then
    raise exception 'Invalid review status.' using errcode = '22023';
  end if;

  select * into attempt_row
  from public.class_assignment_attempts
  where id = p_attempt_id
  for update;
  if attempt_row.id is null then
    raise exception 'Assignment attempt not found.' using errcode = 'P0002';
  end if;

  select * into assignment_row
  from public.assignments
  where id = attempt_row.assignment_id;
  if assignment_row.id is null then
    raise exception 'Assignment not found.' using errcode = 'P0002';
  end if;
  if not public.can_manage_class(assignment_row.class_id) then
    raise exception 'You do not have permission to grade this assignment.'
      using errcode = '42501';
  end if;
  if p_score is null or p_score < 0 or p_score > assignment_row.points then
    raise exception 'Score must be between 0 and %.', assignment_row.points
      using errcode = '22023';
  end if;
  if p_feedback is not null and char_length(p_feedback) > 10000 then
    raise exception 'Feedback is too long.' using errcode = '22023';
  end if;

  update public.class_assignment_attempts
  set status = p_status,
      score = p_score,
      feedback = nullif(trim(p_feedback), ''),
      graded_by = auth.uid(),
      graded_at = now()
  where id = p_attempt_id
  returning * into result;

  return result;
end;
$$;

create or replace function public.manage_class_member(
  p_class_id uuid,
  p_user_id uuid,
  p_action text,
  p_role text default 'student'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if not public.can_manage_class(p_class_id) then
    raise exception 'You do not have permission to manage class members.'
      using errcode = '42501';
  end if;
  select teacher_id into owner_id from public.classes where id = p_class_id;
  if owner_id is null then
    raise exception 'Class not found.' using errcode = 'P0002';
  end if;
  if p_user_id = owner_id then
    raise exception 'The class owner cannot be changed or removed.'
      using errcode = '22023';
  end if;
  if p_user_id = auth.uid() and p_action = 'remove' then
    raise exception 'Class managers cannot remove themselves.'
      using errcode = '22023';
  end if;

  if p_action = 'remove' then
    delete from public.class_members
    where class_id = p_class_id and user_id = p_user_id;
  elsif p_action = 'role' then
    if p_role not in ('student', 'teacher') then
      raise exception 'Invalid class role.' using errcode = '22023';
    end if;
    update public.class_members
    set role = p_role
    where class_id = p_class_id and user_id = p_user_id;
  else
    raise exception 'Invalid member action.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.grade_class_assignment_attempt(uuid, text, numeric, text)
  from public, anon;
revoke all on function public.manage_class_member(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.grade_class_assignment_attempt(uuid, text, numeric, text)
  to authenticated;
grant execute on function public.manage_class_member(uuid, uuid, text, text)
  to authenticated;

comment on function public.grade_class_assignment_attempt(uuid, text, numeric, text) is
  'Validates class-manager access, review status and score before grading an assignment attempt.';

commit;
