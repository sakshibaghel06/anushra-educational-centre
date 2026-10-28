create or replace function public.is_teacher_for_class(_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.has_role((select auth.uid()), 'teacher')
    and exists (
      select 1
      from public.teacher_class_assignments
      where teacher_id = (select auth.uid()) and class_id = _class_id
    );
$$;

drop policy "Students submit their own work" on public.submissions;
create policy "Students submit their own work"
  on public.submissions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (
      storage_path is null
      or (
        split_part(storage_path, '/', 1) = assignment_id::text
        and split_part(storage_path, '/', 2) = (select auth.uid())::text
        and split_part(storage_path, '/', 3) <> ''
        and array_length(string_to_array(storage_path, '/'), 1) = 3
      )
    )
    and exists (
      select 1 from public.assignments a
      join public.courses c on c.id = a.course_id
      where a.id = assignment_id
        and a.is_published
        and (a.due_at is null or a.due_at >= now())
        and public.is_enrolled_in_class(c.class_id)
    )
  );

drop policy "Students update their own submissions" on public.submissions;
create policy "Students update their own submissions"
  on public.submissions for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and (
      storage_path is null
      or (
        split_part(storage_path, '/', 1) = assignment_id::text
        and split_part(storage_path, '/', 2) = (select auth.uid())::text
        and split_part(storage_path, '/', 3) <> ''
        and array_length(string_to_array(storage_path, '/'), 1) = 3
      )
    )
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

drop policy "Administrators manage fee records" on public.fee_records;
create policy "Administrators create unpaid fee records"
  on public.fee_records for insert to authenticated
  with check (
    (select public.is_admin())
    and status <> 'paid'
  );
create policy "Administrators update unpaid fee records"
  on public.fee_records for update to authenticated
  using (
    (select public.is_admin())
    and status <> 'paid'
  )
  with check (
    (select public.is_admin())
    and status <> 'paid'
  );
create policy "Administrators delete fees without payment history"
  on public.fee_records for delete to authenticated
  using (
    (select public.is_admin())
    and status <> 'paid'
    and not exists (
      select 1
      from public.fee_transactions
      where fee_record_id = id
    )
  );
