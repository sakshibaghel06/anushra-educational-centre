create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  effective_from date not null default current_date,
  effective_until date,
  location text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (effective_until is null or effective_until >= effective_from)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete restrict,
  timetable_entry_id uuid references public.timetable_entries (id) on delete set null,
  attendance_date date not null,
  session_label text not null check (length(btrim(session_label)) between 1 and 100),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index attendance_scheduled_session_unique
  on public.attendance_sessions (timetable_entry_id, attendance_date)
  where timetable_entry_id is not null;
create unique index attendance_manual_session_unique
  on public.attendance_sessions (class_id, attendance_date, session_label)
  where timetable_entry_id is null;

create table public.attendance_records (
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  status public.attendance_status not null,
  marked_by uuid not null references auth.users (id),
  marked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create index timetable_class_day_idx on public.timetable_entries (class_id, day_of_week, starts_at);
create index timetable_teacher_day_idx on public.timetable_entries (teacher_id, day_of_week, starts_at);
create index attendance_sessions_class_date_idx on public.attendance_sessions (class_id, attendance_date desc);
create index attendance_records_student_idx on public.attendance_records (student_id, marked_at desc);

create or replace function public.is_enrolled_in_class(_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_role((select auth.uid()), 'student')
    and exists (
      select 1
      from public.enrollments
      where student_id = (select auth.uid()) and class_id = _class_id
    );
$$;

create function public.validate_timetable_entry()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not exists (
    select 1 from public.courses
    where id = new.course_id and class_id = new.class_id
  ) then
    raise exception 'The selected course does not belong to this class';
  end if;

  if not public.has_role(new.teacher_id, 'teacher')
     or not exists (
       select 1 from public.teacher_class_assignments
       where teacher_id = new.teacher_id and class_id = new.class_id
     ) then
    raise exception 'The scheduled teacher must have an active teacher assignment for this class';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.class_id::text, 1));
  if exists (
    select 1
    from public.timetable_entries existing
    where existing.class_id = new.class_id
      and existing.day_of_week = new.day_of_week
      and existing.id <> new.id
      and existing.starts_at < new.ends_at
      and new.starts_at < existing.ends_at
      and existing.effective_from <= coalesce(new.effective_until, 'infinity'::date)
      and new.effective_from <= coalesce(existing.effective_until, 'infinity'::date)
  ) then
    raise exception 'This schedule overlaps another timetable entry for the class';
  end if;

  return new;
end;
$$;

create trigger timetable_entry_validate
  before insert or update on public.timetable_entries
  for each row execute function public.validate_timetable_entry();
revoke all on function public.validate_timetable_entry() from public;
grant execute on function public.validate_timetable_entry() to authenticated;

create function public.validate_attendance_session()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.timetable_entry_id is not null and not exists (
    select 1 from public.timetable_entries
    where id = new.timetable_entry_id and class_id = new.class_id
  ) then
    raise exception 'The timetable entry does not belong to this class';
  end if;
  return new;
end;
$$;

create trigger attendance_session_validate
  before insert or update on public.attendance_sessions
  for each row execute function public.validate_attendance_session();
revoke all on function public.validate_attendance_session() from public;
grant execute on function public.validate_attendance_session() to authenticated;

create function public.validate_attendance_record()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
declare
  _class_id uuid;
begin
  select class_id into _class_id
  from public.attendance_sessions
  where id = new.session_id;

  if not found or not exists (
    select 1 from public.enrollments
    where class_id = _class_id and student_id = new.student_id
  ) then
    raise exception 'Attendance can only be marked for a student enrolled in the session class';
  end if;

  new.marked_by := (select auth.uid());
  new.marked_at := now();
  return new;
end;
$$;

create trigger attendance_record_validate
  before insert or update on public.attendance_records
  for each row execute function public.validate_attendance_record();
revoke all on function public.validate_attendance_record() from public;
grant execute on function public.validate_attendance_record() to authenticated;

alter table public.timetable_entries enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy "School members read their authorized timetable"
  on public.timetable_entries for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_teacher_for_class(class_id))
    or (select public.is_enrolled_in_class(class_id))
  );
create policy "Administrators create timetable entries"
  on public.timetable_entries for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));
create policy "Administrators update timetable entries"
  on public.timetable_entries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "Administrators delete timetable entries"
  on public.timetable_entries for delete to authenticated
  using ((select public.is_admin()));

create policy "School members read their authorized attendance sessions"
  on public.attendance_sessions for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_teacher_for_class(class_id))
    or (select public.is_enrolled_in_class(class_id))
  );
create policy "Assigned teachers and administrators create attendance sessions"
  on public.attendance_sessions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (select public.is_admin())
      or (select public.is_teacher_for_class(class_id))
    )
  );
create policy "Students and authorized staff read attendance records"
  on public.attendance_records for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1
      from public.attendance_sessions s
      where s.id = session_id
        and (select public.is_teacher_for_class(s.class_id))
    )
  );
create policy "Assigned teachers and administrators mark attendance"
  on public.attendance_records for insert to authenticated
  with check (
    marked_by = (select auth.uid())
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.attendance_sessions s
        where s.id = session_id
          and (select public.is_teacher_for_class(s.class_id))
      )
    )
  );
create policy "Assigned teachers and administrators update attendance"
  on public.attendance_records for update to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id
        and (select public.is_teacher_for_class(s.class_id))
    )
  )
  with check (
    marked_by = (select auth.uid())
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.attendance_sessions s
        where s.id = session_id
          and (select public.is_teacher_for_class(s.class_id))
      )
    )
  );

grant select on public.timetable_entries, public.attendance_sessions, public.attendance_records to authenticated;
grant delete on public.timetable_entries to authenticated;
grant update (course_id, teacher_id, day_of_week, starts_at, ends_at, effective_from, effective_until, location) on public.timetable_entries to authenticated;
grant insert (class_id, course_id, teacher_id, day_of_week, starts_at, ends_at, effective_from, effective_until, location, created_by) on public.timetable_entries to authenticated;
grant insert (class_id, timetable_entry_id, attendance_date, session_label, created_by) on public.attendance_sessions to authenticated;
grant insert (session_id, student_id, status) on public.attendance_records to authenticated;
grant update (status) on public.attendance_records to authenticated;
