create index admissions_enquiries_email_created_idx
  on public.admissions_enquiries (lower(email), created_at desc);

create or replace function public.submit_public_enquiry(
  _parent_name text,
  _email text,
  _message text,
  _phone text default null,
  _student_name text default null,
  _programme_interest text default null,
  _website text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  _normalized_email text := lower(btrim(_email));
begin
  if nullif(btrim(coalesce(_website, '')), '') is not null then
    raise exception using errcode = '22023', message = 'Enquiry could not be accepted.';
  end if;

  if _parent_name is null or length(btrim(_parent_name)) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'Provide a name of 1 to 120 characters.';
  end if;
  if _email is null or length(_normalized_email) not between 3 and 254
     or _normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Provide a valid email address.';
  end if;
  if _message is null or length(btrim(_message)) not between 10 and 5000 then
    raise exception using errcode = '22023', message = 'Provide a message of 10 to 5000 characters.';
  end if;
  if _phone is not null and length(btrim(_phone)) > 32 then
    raise exception using errcode = '22023', message = 'Phone number must be 32 characters or fewer.';
  end if;
  if _student_name is not null and length(btrim(_student_name)) > 120 then
    raise exception using errcode = '22023', message = 'Student name must be 120 characters or fewer.';
  end if;
  if _programme_interest is not null and length(btrim(_programme_interest)) > 120 then
    raise exception using errcode = '22023', message = 'Enquiry topic must be 120 characters or fewer.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_normalized_email, 0));
  if (
    select count(*)
    from public.admissions_enquiries
    where lower(email) = _normalized_email
      and created_at > now() - interval '15 minutes'
  ) >= 3 then
    raise exception using errcode = '54000', message = 'Too many recent enquiries. Please try again later.';
  end if;

  insert into public.admissions_enquiries (
    parent_name,
    email,
    phone,
    student_name,
    programme_interest,
    message
  )
  values (
    btrim(_parent_name),
    _normalized_email,
    nullif(btrim(coalesce(_phone, '')), ''),
    nullif(btrim(coalesce(_student_name, '')), ''),
    nullif(btrim(coalesce(_programme_interest, '')), ''),
    btrim(_message)
  );
end;
$$;

revoke all on function public.submit_public_enquiry(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_public_enquiry(text, text, text, text, text, text, text) to anon, authenticated;

revoke all on public.admissions_enquiries from anon;
revoke insert, update, delete on public.admissions_enquiries from authenticated;
grant update (status, follow_up_notes) on public.admissions_enquiries to authenticated;
