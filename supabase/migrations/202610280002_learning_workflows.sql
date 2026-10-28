create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.courses
  add column subject_id uuid references public.subjects (id) on delete set null;

create table public.lesson_progress (
  student_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create function public.is_string_array(_value jsonb)
returns boolean
language sql
immutable
strict
as $$
  select coalesce(bool_and(jsonb_typeof(item.value) = 'string'), false)
  from jsonb_array_elements(_value) as item(value);
$$;

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  instructions text,
  due_at timestamptz,
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes between 1 and 600),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  is_published boolean not null default false,
  results_visible_to_students boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  prompt text not null,
  options jsonb not null,
  correct_option integer not null check (correct_option >= 0),
  position integer not null default 0 check (position >= 0),
  points numeric(8, 2) not null default 1 check (points > 0),
  check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) >= 2
    and correct_option < jsonb_array_length(options)
    and public.is_string_array(options)
  ),
  unique (quiz_id, position)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric(10, 2),
  maximum_score numeric(10, 2),
  answers jsonb,
  unique (id, quiz_id, student_id)
);

create index courses_subject_idx on public.courses (subject_id);
create index lesson_progress_student_idx on public.lesson_progress (student_id, completed_at desc);
create index quizzes_course_due_idx on public.quizzes (course_id, due_at);
create index quiz_questions_order_idx on public.quiz_questions (quiz_id, position);
create index quiz_attempts_student_idx on public.quiz_attempts (student_id, submitted_at desc);

create trigger quizzes_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "Users read subjects in accessible courses"
  on public.subjects for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.courses c
      where c.subject_id = id
        and (public.is_admin() or public.is_teacher_for_class(c.class_id)
          or (c.is_published and public.is_enrolled_in_class(c.class_id)))
    )
  );
create policy "Administrators manage subjects"
  on public.subjects for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Students and authorized staff read lesson progress"
  on public.lesson_progress for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and public.is_teacher_for_class(c.class_id)
    )
  );

create policy "Teachers read profiles of students in assigned classes"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = profiles.user_id
        and public.is_teacher_for_class(e.class_id)
    )
  );

create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  roles public.app_role[]
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.id, u.email::text, p.display_name,
    coalesce(array_agg(r.role) filter (where r.role is not null), '{}'::public.app_role[])
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.user_roles r on r.user_id = u.id
  where public.is_admin()
  group by u.id, u.email, p.display_name
  order by p.display_name nulls last, u.email
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

drop policy "Assigned teachers and administrators manage lessons" on public.lessons;
create policy "Assigned teachers create lessons"
  on public.lessons for insert to authenticated
  with check (public.can_manage_course(course_id) and created_by = (select auth.uid()));
create policy "Assigned teachers update lessons"
  on public.lessons for update to authenticated
  using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));
create policy "Assigned teachers delete lessons"
  on public.lessons for delete to authenticated
  using (public.can_manage_course(course_id));

drop policy "Assigned teachers and administrators manage lesson materials" on public.lesson_materials;
create policy "Assigned teachers create lesson materials"
  on public.lesson_materials for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and public.can_manage_course(l.course_id)
    )
  );
create policy "Assigned teachers update lesson materials"
  on public.lesson_materials for update to authenticated
  using (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id))
  )
  with check (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id))
  );
create policy "Assigned teachers delete lesson materials"
  on public.lesson_materials for delete to authenticated
  using (
    exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id))
  );

drop policy "Assigned teachers and administrators manage assignments" on public.assignments;
create policy "Assigned teachers create assignments"
  on public.assignments for insert to authenticated
  with check (public.can_manage_course(course_id) and created_by = (select auth.uid()));
create policy "Assigned teachers update assignments"
  on public.assignments for update to authenticated
  using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));
create policy "Assigned teachers delete assignments"
  on public.assignments for delete to authenticated
  using (public.can_manage_course(course_id));

create policy "Assigned teachers create quizzes"
  on public.quizzes for insert to authenticated
  with check (public.can_manage_course(course_id) and created_by = (select auth.uid()));
create policy "Assigned teachers update quizzes"
  on public.quizzes for update to authenticated
  using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));
create policy "Assigned teachers delete quizzes"
  on public.quizzes for delete to authenticated
  using (public.can_manage_course(course_id));

drop policy "Assigned teachers and administrators manage announcements" on public.announcements;
create policy "Assigned teachers create announcements"
  on public.announcements for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (select public.is_admin())
      or (class_id is not null and public.is_teacher_for_class(class_id))
    )
  );
create policy "Assigned teachers update announcements"
  on public.announcements for update to authenticated
  using ((select public.is_admin()) or (class_id is not null and public.is_teacher_for_class(class_id)))
  with check ((select public.is_admin()) or (class_id is not null and public.is_teacher_for_class(class_id)));
create policy "Assigned teachers delete announcements"
  on public.announcements for delete to authenticated
  using ((select public.is_admin()) or (class_id is not null and public.is_teacher_for_class(class_id)));

revoke update on public.lessons, public.lesson_materials, public.assignments, public.announcements, public.quizzes from authenticated;
grant update (course_id, title, description, video_url, position, is_published) on public.lessons to authenticated;
grant update (lesson_id, storage_path, display_name, content_type) on public.lesson_materials to authenticated;
grant update (course_id, title, instructions, due_at, allow_resubmission, is_published) on public.assignments to authenticated;
grant update (class_id, title, body, published_at) on public.announcements to authenticated;
grant update (course_id, title, instructions, due_at, time_limit_minutes, max_attempts, is_published, results_visible_to_students) on public.quizzes to authenticated;
create policy "Students mark their own accessible lessons complete"
  on public.lesson_progress for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id and l.is_published
        and c.is_published and public.is_enrolled_in_class(c.class_id)
    )
  );
create policy "Students clear their own lesson completion"
  on public.lesson_progress for delete to authenticated
  using (student_id = (select auth.uid()));

create policy "Users read published quizzes in their classes"
  on public.quizzes for select to authenticated
  using (
    (select public.is_admin())
    or public.can_manage_course(course_id)
    or (is_published and public.can_access_course(course_id))
  );
create policy "Assigned staff read quiz questions"
  on public.quiz_questions for select to authenticated
  using (
    exists (select 1 from public.quizzes q where q.id = quiz_id and public.can_manage_course(q.course_id))
  );
create policy "Assigned staff create quiz questions before attempts"
  on public.quiz_questions for insert to authenticated
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.can_manage_course(q.course_id)
        and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id)
    )
  );
create policy "Assigned staff update quiz questions before attempts"
  on public.quiz_questions for update to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.can_manage_course(q.course_id)
        and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id)
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.can_manage_course(q.course_id)
        and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id)
    )
  );
create policy "Assigned staff delete quiz questions before attempts"
  on public.quiz_questions for delete to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.can_manage_course(q.course_id)
        and not exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id)
    )
  );

create policy "Students read their visible quiz results"
  on public.quiz_attempts for select to authenticated
  using (
    student_id = (select auth.uid())
    and submitted_at is not null
    and exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and q.results_visible_to_students
    )
  );
create policy "Teachers and administrators read quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.quizzes q
      join public.courses c on c.id = q.course_id
      where q.id = quiz_id and public.is_teacher_for_class(c.class_id)
    )
  );

create function public.start_quiz_attempt(_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  _student_id uuid := auth.uid();
  _attempt_id uuid;
  _questions jsonb;
  _quiz public.quizzes%rowtype;
begin
  if _student_id is null then
    raise exception 'Authentication required';
  end if;

  select q.* into _quiz
  from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = _quiz_id and q.is_published
      and (q.due_at is null or q.due_at >= now())
      and c.is_published and public.is_enrolled_in_class(c.class_id)
  for update of q;
  if not found then
    raise exception 'Quiz is unavailable for this account';
  end if;

  if not exists (select 1 from public.quiz_questions where quiz_id = _quiz_id) then
    raise exception 'Quiz has no questions';
  end if;

  select id into _attempt_id from public.quiz_attempts
  where quiz_id = _quiz_id and student_id = _student_id and submitted_at is null
  order by started_at desc limit 1;

  if _attempt_id is not null and _quiz.time_limit_minutes is not null and exists (
    select 1 from public.quiz_attempts
    where id = _attempt_id
      and now() > started_at + make_interval(mins => _quiz.time_limit_minutes)
  ) then
    update public.quiz_attempts
    set submitted_at = now(),
        score = 0,
        maximum_score = (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = _quiz_id),
        answers = '[]'::jsonb
    where id = _attempt_id;
    _attempt_id := null;
  end if;

  if _attempt_id is null then
    if (select count(*) from public.quiz_attempts
        where quiz_id = _quiz_id and student_id = _student_id) >=
       _quiz.max_attempts then
      raise exception 'No quiz attempts remain';
    end if;

    insert into public.quiz_attempts (quiz_id, student_id)
    values (_quiz_id, _student_id)
    returning id into _attempt_id;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', id,
      'prompt', prompt,
      'options', options,
      'position', position,
      'points', points
    ) order by position
  )
  into _questions
  from public.quiz_questions
  where quiz_id = _quiz_id;

  return jsonb_build_object('attempt_id', _attempt_id, 'questions', _questions);
end;
$$;

create function public.submit_quiz_attempt(_attempt_id uuid, _answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  _attempt public.quiz_attempts%rowtype;
  _quiz public.quizzes%rowtype;
  _score numeric(10, 2);
  _maximum numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if _answers is null or jsonb_typeof(_answers) <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select * into _attempt
  from public.quiz_attempts
  where id = _attempt_id and student_id = auth.uid()
  for update;
  if not found or _attempt.submitted_at is not null then
    raise exception 'Quiz attempt is unavailable or already submitted';
  end if;

  select * into _quiz from public.quizzes where id = _attempt.quiz_id;
  if _quiz.time_limit_minutes is not null
     and now() > _attempt.started_at + make_interval(mins => _quiz.time_limit_minutes) then
    raise exception 'The quiz time limit has elapsed';
  end if;
  if _quiz.due_at is not null and now() > _quiz.due_at then
    raise exception 'The quiz deadline has passed';
  end if;
  if jsonb_array_length(_answers) <> (
    select count(*) from public.quiz_questions where quiz_id = _attempt.quiz_id
  ) then
    raise exception 'Answer every question before submitting';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(_answers) answer
    where not exists (
      select 1 from public.quiz_questions question
      where question.id = (answer ->> 'question_id')::uuid
        and question.quiz_id = _attempt.quiz_id
        and (answer ->> 'selected_option') ~ '^[0-9]+$'
        and (answer ->> 'selected_option')::integer >= 0
        and (answer ->> 'selected_option')::integer < jsonb_array_length(question.options)
    )
  ) then
    raise exception 'An answer is invalid';
  end if;
  if (select count(distinct answer ->> 'question_id') from jsonb_array_elements(_answers) answer)
      <> jsonb_array_length(_answers) then
    raise exception 'Duplicate question answers are not allowed';
  end if;

  select
    coalesce(sum(case when (answer ->> 'selected_option')::integer = question.correct_option
      then question.points else 0 end), 0),
    coalesce(sum(question.points), 0)
  into _score, _maximum
  from jsonb_array_elements(_answers) answer
  join public.quiz_questions question
    on question.id = (answer ->> 'question_id')::uuid
   and question.quiz_id = _attempt.quiz_id;

  update public.quiz_attempts
  set answers = _answers,
      score = _score,
      maximum_score = _maximum,
      submitted_at = now()
  where id = _attempt_id;

  return jsonb_build_object('submitted', true);
end;
$$;

revoke all on function public.start_quiz_attempt(uuid) from public;
revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public;
grant execute on function public.start_quiz_attempt(uuid) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

grant select on public.subjects, public.lesson_progress, public.quizzes, public.quiz_attempts to authenticated;
grant insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;
grant insert, delete on public.lesson_progress to authenticated;
grant insert on public.quizzes, public.quiz_attempts to authenticated;
grant execute on function public.is_string_array(jsonb) to authenticated;
revoke all on public.quiz_questions from anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('assignment-submissions', 'assignment-submissions', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

create function public.can_access_submission_file(_path text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.courses c on c.id = a.course_id
    where s.storage_path = _path
      and (
        s.student_id = (select auth.uid())
        or public.is_admin()
        or public.is_teacher_for_class(c.class_id)
      )
  );
$$;

revoke all on function public.can_access_submission_file(text) from public;
grant execute on function public.can_access_submission_file(text) to authenticated;

create policy "Students and authorized staff read submission files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and public.can_access_submission_file(name)
  );
create policy "Students upload their own submission files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-submissions'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and exists (
      select 1 from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = split_part(name, '/', 1)::uuid
        and a.is_published
        and (
          a.allow_resubmission
          or not exists (
            select 1 from public.submissions s
            where s.assignment_id = a.id and s.student_id = auth.uid()
          )
        )
        and (a.due_at is null or a.due_at >= now())
        and public.is_enrolled_in_class(c.class_id)
    )
  );
create policy "Students replace their own submission files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and public.can_access_submission_file(name)
  )
  with check (
    bucket_id = 'assignment-submissions'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and public.can_access_submission_file(name)
  );
