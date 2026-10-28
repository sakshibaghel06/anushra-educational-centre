# Anushra Educational Centre

Responsive public website and secure platform foundation built with React, TypeScript, Vite, Tailwind CSS 4, React Router, Lucide, and Supabase.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to type-check and create a production build, or `npm run preview` to preview that build.

## Project structure

- `src/components/` — shared branding, navigation, buttons, cards, and forms
- `src/data/` — replaceable website content and contact placeholders
- `src/features/public/` — public pages, sign-in, and password reset
- `src/auth/` — Supabase session handling and role-protected routes
- `src/lib/` — Supabase client configuration and TypeScript database types
- `src/features/student/` — student dashboard, course lessons, assignments, and quizzes
- `src/features/teacher/` — assigned classes, course authoring, grading, quizzes, and announcements
- `src/features/admin/` — account roles, academic structure, enquiries, fees, announcements, and website content
- `src/features/portals/` — shared portal components and Supabase helpers
- `supabase/migrations/` — schema, quiz RPCs, enquiry intake, attendance/timetable, private storage, and RLS policies

## Actual logo

The header and footer use the school logo image already supplied in `public/images/WhatsApp Image 2026-10-28 at 9.36.41 AM.jpeg`. If the school provides an approved higher-resolution logo, replace that image file while preserving the filename or update `src/components/Brand.tsx`. When unavailable, the school name remains as text; no replacement logo is fabricated.

## Supabase setup

Authentication is implemented but remains unavailable until connected to a Supabase project. The frontend only accepts a project URL and **publishable** key; never put a service-role key in `VITE_*` variables or frontend code.

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. These frontend values are public configuration; keep privileged keys server-side.
3. Install the Supabase CLI separately, link this project with `supabase link --project-ref <PROJECT_REF>`, and apply ordered migrations only after review with `supabase db push`; alternatively, back up the project and run each reviewed SQL file in `supabase/migrations/` in filename order in the Supabase SQL editor. The newest files are `202610280003_production_safeguards.sql`, `202610280004_public_enquiry_submission.sql`, and `202610280005_attendance_timetable.sql`. They have not been applied by this workspace. After applying, verify their presence in Supabase's migration history and test the policies/functions using separate student, teacher, and admin accounts.
4. In Supabase Auth, disable public sign-ups and use the dashboard’s invite flow for student and teacher accounts. Configure the site URL and allowed redirect URL to include `http://localhost:5173/reset-password` for local password recovery, plus the production site URL after deployment.
5. Invite the first trusted administrator through the Supabase dashboard. Find that user’s UUID in Authentication, then assign the role in the SQL editor:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('<AUTH_USER_UUID>', 'admin');
   ```

   Replace the placeholder with the invited administrator’s UUID. Administrator roles must only be granted by this trusted setup process or a secured admin workflow.
6. Restart Vite after changing environment variables.

The migrations add subjects, lesson progress, quizzes, questions, quiz attempts, server-side quiz scoring, a private assignment-submissions bucket, role-scoped RLS policies, public enquiry submission, and attendance/timetable tables. The production-safeguards migration binds submission file paths to the owning student, requires assigned teacher accounts to have the teacher role, and prevents authenticated clients (including administrators) from setting, editing, or deleting paid fee records; fee rows with transaction history cannot be deleted. No real student or school data is seeded. The admin-only `admin_list_users` RPC exposes account email addresses only after verifying the caller's administrator role; it does not create Auth accounts or grant roles.

## Current functionality and limitations

- Public pages remain available; school history, curriculum/programmes, admissions requirements and dates, fees, contact details, faculty, and official news are unverified placeholders. Replace them only with school-approved information. Public gallery and story photos are illustrative third-party stock images, not school photographs; replace them with approved assets and confirm usage rights.
- Public pages request `school_content` rows with `is_published = true`; unpublished drafts are excluded in both the query and RLS. Supported keys are `home`, `about`, `academics`, `admissions`, `faculty`, `gallery`, `news`, and `contact`. All records are JSON objects. Common fields include `heroTitle` and `heroDescription`; homepage supports `heroEyebrow`, `heroImage`, `welcomeTitle`, `welcomeBody`, `welcomeImage`, `academicsTitle`, `academicsDescription`, `approachTitle`, `approachBody`, `approachQuote`, `approachImage`, `newsTitle`, and `news` (array of `{title, description, date, category, image}`). The `about` record supports `storyTitle`, `storyBody`, `valuesTitle`, `valuesDescription`, and `values` (array of `{title, description}`). `academics` supports `introTitle`, `introDescription`, `areas` (array of `{title, description}`), `noticeTitle`, and `noticeBody`. `admissions` supports `introTitle`, `introBody`, and `steps` (array of `{title, description}`). `faculty` supports `introTitle`, `introDescription`, and `people` (array of `{name, role, biography, image}`). `gallery` supports `images` (array of `{label, alt, image}`); `news` supports `items` (array of `{title, description, date, category, image}`); `contact` supports `introTitle`, `address`, `phone`, `email`, `hours`, and `detailsNote`. Invalid/missing fields fall back to the existing labeled placeholders. Publish only verified text and usage-approved imagery.
- Contact and admissions forms submit to the `submit_public_enquiry` database function. It validates field lengths and email shape, rejects a filled honeypot, rate-limits each normalized email to three enquiries per 15 minutes, and inserts only a new enquiry. Public clients have no direct read, update, or insert rights on the table; only administrators can read enquiries and update status/follow-up notes. A recorded enquiry is not an email notification; the administrator must review it in the portal. The current abuse limit is per email, not IP-based and not a CAPTCHA; configure an edge/API gateway rate limit and challenge provider before opening the forms to high-volume public traffic.
- Login, logout, role lookup, invitation-only account access, and password reset use Supabase Auth. Student, teacher, and admin routes enforce role checks and show setup/errors when Supabase is unavailable.
- Students can view their enrolled courses, ordered lessons, signed learning-material links, HTTPS video links, lesson progress, assignments, submission status/feedback, announcements, fee records, and quiz attempts/results. Assignment files are limited to 10 MB by the private storage bucket.
- Teachers can view assigned classes and enrolled students, create/publish course lessons, learning materials, assignments, multiple-choice quizzes and class announcements, review submissions, grade work, release feedback, and inspect quiz attempt scores. App queries and database policies restrict their scope to assigned classes.
- Administrators can search existing Auth accounts, assign/remove roles, manage classes, subjects, courses, enrolments, admissions enquiry status, announcements, fee records, JSON website-content records, and school timetable entries. Account invitations and suspension remain in Supabase Auth; administrator access must be seeded through the trusted setup process above.
- Teachers can create dated attendance sessions for assigned classes and mark enrolled students present, absent, late, or excused. Students can view only their own attendance records and the timetable for their enrolled classes; administrators can review all timetable entries and the most recent 100 attendance sessions. Attendance sessions and records are not deletable through authenticated clients, preserving the audit history. No records are seeded.
- Quiz attempts are started and scored by database functions. Correct options are not returned to student clients, and attempt limits, deadlines, and time limits are checked server-side.
- Fee records and payment-history views are available, but no payment provider, checkout, or payment processing is connected. Authenticated dashboard clients cannot set a fee to `paid`; an existing paid record should only be trusted if created through a verified server-side process. Select a provider with the school, then implement a trusted checkout-creation endpoint, signed webhook verification with idempotent event handling, server-side transaction writes, fee-status updates only after provider verification, and private receipt generation. Keep provider secrets in server-side configuration, never frontend variables.
- In-app announcements are the only school notifications implemented. No school email, SMS, or push-notification provider is connected; password-reset email delivery also depends on configured Supabase Auth email settings.
- There is no parent/guardian role or parent-child relationship table. A parent portal requires an administrator-verified parent-to-student link table (with parent and child foreign keys, verification/audit fields, and uniqueness constraints), secure create/revoke workflows, and RLS scopes that expose only linked children's specifically approved records. Do not create links from user-supplied child names or email addresses alone.
- Timetable entries use ISO weekdays (Monday=1 through Sunday=7), local wall-clock times, and effective dates. The school must confirm the timezone, school periods, locations, and real schedule before admins enter/publish timetable records. The database rejects overlapping times for a class and rejects courses or teachers not assigned to the selected class.
- RLS policies are included in the migrations but have not been applied or integration-tested against a live Supabase project in this workspace. Apply reviewed migrations 003–005 only after backing up the project, then test the functions, storage, and policies with separate student, teacher, administrator, and anonymous sessions before production use. This workspace has no Supabase CLI or `psql`; there are no configured lint or test scripts.

## Before production

Verify school-supplied content and approved images/logo; configure Supabase Auth and email templates; apply and review all migrations; test RLS, quiz functions, and private storage access with separate student, teacher, and administrator accounts; implement trusted admissions processing; decide whether parent, attendance, and timetable features are in scope; choose and securely integrate a payment provider before enabling payment features; then deploy the frontend with the correct Supabase URL and publishable key. Never send secrets through chat or commit `.env.local`.
