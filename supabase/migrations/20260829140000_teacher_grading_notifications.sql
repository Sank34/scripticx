begin;

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
  class_row public.classes%rowtype;
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

  select * into class_row
  from public.classes
  where id = assignment_row.class_id;

  update public.class_assignment_attempts
  set status = p_status,
      score = p_score,
      feedback = nullif(trim(p_feedback), ''),
      graded_by = auth.uid(),
      graded_at = now()
  where id = p_attempt_id
  returning * into result;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    href,
    metadata,
    dedupe_key
  )
  values (
    result.user_id,
    auth.uid(),
    'assignment_graded',
    'Assignment graded',
    format('%s · %s/%s points', assignment_row.title, result.score, assignment_row.points),
    format('/classes/%s/assignments/%s', assignment_row.class_id, assignment_row.id),
    jsonb_build_object(
      'assignmentId', assignment_row.id,
      'assignmentTitle', assignment_row.title,
      'attemptId', result.id,
      'classId', assignment_row.class_id,
      'className', class_row.name,
      'feedback', result.feedback,
      'problemId', result.problem_id,
      'score', result.score,
      'status', result.status,
      'totalPoints', assignment_row.points
    ),
    'assignment-grade:' || result.id || ':' || floor(extract(epoch from result.graded_at) * 1000)::bigint
  );

  return result;
end;
$$;

revoke all on function public.grade_class_assignment_attempt(uuid, text, numeric, text)
  from public, anon;
grant execute on function public.grade_class_assignment_attempt(uuid, text, numeric, text)
  to authenticated;

comment on function public.grade_class_assignment_attempt(uuid, text, numeric, text) is
  'Grades one class attempt and atomically creates the student inbox/push notification.';

commit;
