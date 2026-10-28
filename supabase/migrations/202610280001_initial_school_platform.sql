create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('student', 'teacher', 'admin');
create type public.enquiry_status as enum ('new', 'contacted', 'in_review', 'closed');
create type public.fee_status as enum ('pending', 'paid', 'waived');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text,
  academic_year text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, section, academic_year)
);

create table public.teacher_class_assignments (
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  student_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (student_id, class_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  position integer not null default 0 check (position >= 0),
  is_published boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  storage_path text not null unique,
  display_name text not null,
  content_type text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  instructions text not null,
  due_at timestamptz,
  allow_resubmission boolean not null default false,
  is_published boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  submission_text text,
  storage_path text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id),
  check (submission_text is not null or storage_path is not null)
);

create table public.submission_feedback (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  score numeric(8, 2) check (score is null or score >= 0),
  feedback text,
  visible_to_student boolean not null default false,
  graded_by uuid not null references auth.users (id),
  graded_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete cascade,
  title text not null,
  body text not null,
  published_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admissions_enquiries (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  email text not null,
  phone text,
  student_name text,
  programme_interest text,
  message text not null,
  status public.enquiry_status not null default 'new',
  follow_up_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fee_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null,
  due_at date,
  status public.fee_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fee_transactions (
  id uuid primary key default gen_random_uuid(),
  fee_record_id uuid not null references public.fee_records (id) on delete cascade,
  provider text not null,
  provider_reference text unique,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null,
  status text not null check (status in ('created', 'pending', 'verified', 'failed', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.school_content (
  content_key text primary key,
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index teacher_class_assignments_class_idx on public.teacher_class_assignments (class_id);
create index courses_class_published_idx on public.courses (class_id, is_published);
create index enrollments_class_idx on public.enrollments (class_id);
create index lessons_course_position_idx on public.lessons (course_id, position);
create index assignments_course_due_idx on public.assignments (course_id, due_at);
create index submissions_student_idx on public.submissions (student_id, submitted_at desc);
create index announcements_class_published_idx on public.announcements (class_id, published_at desc);
create index admissions_enquiries_status_created_idx on public.admissions_enquiries (status, created_at desc);
create index fee_records_student_status_idx on public.fee_records (student_id, status);
create index fee_transactions_record_created_idx on public.fee_transactions (fee_record_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '')
  );
  return new;
end;
$$;

create trigger auth_user_profile_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_role((select auth.uid()), 'admin');
$$;

create function public.is_teacher_for_class(_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.teacher_class_assignments
    where teacher_id = (select auth.uid()) and class_id = _class_id
  );
$$;

create function public.is_enrolled_in_class(_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments
    where student_id = (select auth.uid()) and class_id = _class_id
  );
$$;

create function public.can_access_course(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = _course_id
      and (
        public.is_admin()
        or public.is_teacher_for_class(c.class_id)
        or (c.is_published and public.is_enrolled_in_class(c.class_id))
      )
  );
$$;

create function public.can_manage_course(_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = _course_id
      and (public.is_admin() or public.is_teacher_for_class(c.class_id))
  );
$$;

create function public.can_access_material(_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.lesson_materials m
    join public.lessons l on l.id = m.lesson_id
    join public.courses c on c.id = l.course_id
    where m.storage_path = _storage_path
      and (
        public.is_admin()
        or public.can_manage_course(c.id)
        or (
          c.is_published
          and l.is_published
          and public.can_access_course(c.id)
        )
      )
  );
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_teacher_for_class(uuid) from public;
revoke all on function public.is_enrolled_in_class(uuid) from public;
revoke all on function public.can_access_course(uuid) from public;
revoke all on function public.can_manage_course(uuid) from public;
revoke all on function public.can_access_material(text) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_teacher_for_class(uuid) to authenticated;
grant execute on function public.is_enrolled_in_class(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;
grant execute on function public.can_manage_course(uuid) to authenticated;
grant execute on function public.can_access_material(text) to authenticated;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger admissions_enquiries_updated_at before update on public.admissions_enquiries
  for each row execute function public.set_updated_at();
create trigger fee_records_updated_at before update on public.fee_records
  for each row execute function public.set_updated_at();
create trigger school_content_updated_at before update on public.school_content
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.classes enable row level security;
alter table public.teacher_class_assignments enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_feedback enable row level security;
alter table public.announcements enable row level security;
alter table public.admissions_enquiries enable row level security;
alter table public.fee_records enable row level security;
alter table public.fee_transactions enable row level security;
alter table public.school_content enable row level security;

create policy "Profiles are readable by their owner and administrators"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Users update only their editable profile fields"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Users read their own role assignments"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Administrators manage role assignments"
  on public.user_roles for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users read classes they are assigned or enrolled in"
  on public.classes for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_teacher_for_class(id))
    or (select public.is_enrolled_in_class(id))
  );
create policy "Administrators manage classes"
  on public.classes for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Teachers and administrators read class assignments"
  on public.teacher_class_assignments for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()));
create policy "Administrators manage class assignments"
  on public.teacher_class_assignments for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users read courses in their classes"
  on public.courses for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_teacher_for_class(class_id))
    or (
      is_published
      and (select public.is_enrolled_in_class(class_id))
    )
  );
create policy "Assigned teachers and administrators manage courses"
  on public.courses for all to authenticated
  using ((select public.is_admin()) or (select public.is_teacher_for_class(class_id)))
  with check ((select public.is_admin()) or (select public.is_teacher_for_class(class_id)));

create policy "Users and administrators read enrollments"
  on public.enrollments for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_teacher_for_class(class_id))
  );
create policy "Administrators manage enrollments"
  on public.enrollments for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users read published lessons in authorized courses"
  on public.lessons for select to authenticated
  using (
    (select public.is_admin())
    or (select public.can_manage_course(course_id))
    or (is_published and (select public.can_access_course(course_id)))
  );
create policy "Assigned teachers and administrators manage lessons"
  on public.lessons for all to authenticated
  using ((select public.can_manage_course(course_id)))
  with check ((select public.can_manage_course(course_id)) and created_by = (select auth.uid()));

create policy "Users read materials in authorized courses"
  on public.lesson_materials for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.lessons l
      where l.id = lesson_id
        and (l.is_published or public.can_manage_course(l.course_id))
        and public.can_access_course(l.course_id)
    )
  );
create policy "Assigned teachers and administrators manage lesson materials"
  on public.lesson_materials for all to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.lessons l
      where l.id = lesson_id and public.can_manage_course(l.course_id)
    )
  )
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and public.can_manage_course(l.course_id)
    )
  );

create policy "Users read published assignments in authorized courses"
  on public.assignments for select to authenticated
  using (
    (select public.is_admin())
    or (select public.can_manage_course(course_id))
    or (is_published and (select public.can_access_course(course_id)))
  );
create policy "Assigned teachers and administrators manage assignments"
  on public.assignments for all to authenticated
  using ((select public.can_manage_course(course_id)))
  with check ((select public.can_manage_course(course_id)) and created_by = (select auth.uid()));

create policy "Students and authorized staff read submissions"
  on public.submissions for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1
      from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = assignment_id and public.is_teacher_for_class(c.class_id)
    )
  );
create policy "Students submit their own work"
  on public.submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = assignment_id
        and a.is_published
        and (a.due_at is null or a.due_at >= now())
        and public.is_enrolled_in_class(c.class_id)
    )
  );
create policy "Students update their own submissions"
  on public.submissions for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = assignment_id
        and a.allow_resubmission
        and a.is_published
        and (a.due_at is null or a.due_at >= now())
        and public.is_enrolled_in_class(c.class_id)
    )
  );
create policy "Teachers and administrators read feedback"
  on public.submission_feedback for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.courses c on c.id = a.course_id
      where s.id = submission_id and public.is_teacher_for_class(c.class_id)
    )
    or exists (
      select 1 from public.submissions s
      where s.id = submission_id
        and s.student_id = (select auth.uid())
        and visible_to_student
    )
  );
create policy "Assigned teachers and administrators manage feedback"
  on public.submission_feedback for all to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.courses c on c.id = a.course_id
      where s.id = submission_id and public.is_teacher_for_class(c.class_id)
    )
  )
  with check (
    graded_by = (select auth.uid())
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.submissions s
        join public.assignments a on a.id = s.assignment_id
        join public.courses c on c.id = a.course_id
        where s.id = submission_id and public.is_teacher_for_class(c.class_id)
      )
    )
  );

create policy "Users read announcements for their audience"
  on public.announcements for select to authenticated
  using (
    (select public.is_admin())
    or (
      published_at is not null
      and (
        class_id is null
        or (select public.is_enrolled_in_class(class_id))
        or (select public.is_teacher_for_class(class_id))
      )
    )
  );
create policy "Assigned teachers and administrators manage announcements"
  on public.announcements for all to authenticated
  using (
    (select public.is_admin())
    or (class_id is not null and (select public.is_teacher_for_class(class_id)))
  )
  with check (
    created_by = (select auth.uid())
    and (
      (select public.is_admin())
      or (class_id is not null and (select public.is_teacher_for_class(class_id)))
    )
  );

create policy "Administrators read admissions enquiries"
  on public.admissions_enquiries for select to authenticated
  using ((select public.is_admin()));
create policy "Administrators manage admissions enquiries"
  on public.admissions_enquiries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Students read their own fee records"
  on public.fee_records for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "Administrators manage fee records"
  on public.fee_records for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Users read their own transaction history"
  on public.fee_transactions for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.fee_records f
      where f.id = fee_record_id and f.student_id = (select auth.uid())
    )
  );

create policy "Anyone reads published school content"
  on public.school_content for select to anon, authenticated
  using (is_published);
create policy "Administrators read all school content"
  on public.school_content for select to authenticated
  using ((select public.is_admin()));
create policy "Administrators manage school content"
  on public.school_content for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.school_content to anon, authenticated;
grant select on public.profiles, public.user_roles, public.classes, public.teacher_class_assignments,
  public.courses, public.enrollments, public.lessons, public.lesson_materials, public.assignments,
  public.submissions, public.submission_feedback, public.announcements, public.admissions_enquiries,
  public.fee_records, public.fee_transactions to authenticated;
grant insert, update, delete on public.submission_feedback to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
grant insert, update, delete on public.user_roles, public.classes, public.teacher_class_assignments,
  public.courses, public.enrollments, public.lessons, public.lesson_materials, public.assignments,
  public.announcements, public.admissions_enquiries, public.fee_records, public.school_content to authenticated;
grant insert (assignment_id, student_id, submission_text, storage_path) on public.submissions to authenticated;
grant update (submission_text, storage_path) on public.submissions to authenticated;

insert into storage.buckets (id, name, public)
values ('learning-materials', 'learning-materials', false)
on conflict (id) do nothing;

create policy "Authorized users read private learning materials"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'learning-materials'
    and public.can_access_material(name)
  );
create policy "Assigned staff upload learning materials"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'learning-materials'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_manage_course(split_part(name, '/', 1)::uuid)
  );
create policy "Assigned staff delete learning materials"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'learning-materials'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_manage_course(split_part(name, '/', 1)::uuid)
  );
