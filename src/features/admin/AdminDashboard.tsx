import { BookOpen, CalendarDays, ClipboardList, CreditCard, Megaphone, Plus, Save, School, Shield, UserRound, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../auth/AuthProvider";
import type {
  AdmissionEnquiry,
  AttendanceRecord,
  AttendanceSession,
  AdminUser,
  Announcement,
  AppRole,
  Course,
  Enrollment,
  FeeRecord,
  FeeTransaction,
  Profile,
  SchoolClass,
  SchoolContent,
  Subject,
  TeacherClassAssignment,
  TimetableEntry,
  UserRole,
} from "../../lib/database.types";
import { PortalCard, PortalEmpty, PortalError, PortalLoading, PortalNotice, PortalPage, PortalSuccess, PortalTabs, formatDate } from "../portals/PortalComponents";
import { errorMessage, requireSchoolClient } from "../portals/portalUtils";

type Panel = "People & roles" | "Classes & courses" | "Admissions" | "Announcements" | "Fees" | "Website content" | "Attendance & timetable";
type AdminData = {
  profiles: Profile[];
  roles: UserRole[];
  accounts: AdminUser[];
  classes: SchoolClass[];
  subjects: Subject[];
  courses: Course[];
  enrollments: Enrollment[];
  enquiries: AdmissionEnquiry[];
  announcements: Announcement[];
  fees: FeeRecord[];
  transactions: FeeTransaction[];
  content: SchoolContent[];
  teacherAssignments: TeacherClassAssignment[];
  timetable: TimetableEntry[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
};
const emptyData: AdminData = {
  profiles: [], roles: [], accounts: [], classes: [], subjects: [], courses: [], enrollments: [],
  enquiries: [], announcements: [], fees: [], transactions: [], content: [],
  teacherAssignments: [], timetable: [], attendanceSessions: [], attendanceRecords: [],
};
const panels: Panel[] = ["People & roles", "Classes & courses", "Admissions", "Announcements", "Fees", "Website content", "Attendance & timetable"];

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState<Panel>("People & roles");
  const [data, setData] = useState<AdminData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const results = await Promise.all([
        client.from("profiles").select("*").order("created_at", { ascending: false }),
        client.from("user_roles").select("*").order("created_at", { ascending: false }),
        client.from("classes").select("*").order("academic_year", { ascending: false }),
        client.from("subjects").select("*").order("name"),
        client.from("courses").select("*").order("created_at", { ascending: false }),
        client.from("enrollments").select("*"),
        client.from("admissions_enquiries").select("*").order("created_at", { ascending: false }),
        client.from("announcements").select("*").order("created_at", { ascending: false }),
        client.from("fee_records").select("*").order("due_at"),
        client.from("fee_transactions").select("*").order("created_at", { ascending: false }),
        client.from("school_content").select("*").order("content_key"),
        client.rpc("admin_list_users"),
        client.from("teacher_class_assignments").select("*"),
        client.from("timetable_entries").select("*").order("day_of_week").order("starts_at"),
        client.from("attendance_sessions").select("*").order("attendance_date", { ascending: false }).limit(100),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const attendanceSessionRows = results[14].data ?? [];
      const attendanceRecordResult = attendanceSessionRows.length
        ? await client.from("attendance_records").select("*").in("session_id", attendanceSessionRows.map(({ id }) => id))
        : { data: [], error: null };
      if (attendanceRecordResult.error) throw attendanceRecordResult.error;
      setData({
        profiles: results[0].data ?? [], roles: results[1].data ?? [], classes: results[2].data ?? [],
        subjects: results[3].data ?? [], courses: results[4].data ?? [], enrollments: results[5].data ?? [],
        enquiries: results[6].data ?? [], announcements: results[7].data ?? [], fees: results[8].data ?? [],
        transactions: results[9].data ?? [], content: results[10].data ?? [],
        accounts: results[11].data ?? [],
        teacherAssignments: results[12].data ?? [], timetable: results[13].data ?? [],
        attendanceSessions: attendanceSessionRows, attendanceRecords: attendanceRecordResult.data ?? [],
      });
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [refresh, user]);

  useEffect(() => { void load(); }, [load]);

  async function act(action: () => Promise<void>, message: string) {
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      setRefresh((key) => key + 1);
    } catch (actionError) {
      setError(errorMessage(actionError));
    }
  }

  const rolesByUser = useMemo(() => new Map(data.accounts.map((account) => [
    account.user_id,
    account.roles.map((role) => ({ role })),
  ])), [data.accounts]);
  const profileName = (id: string) => data.profiles.find(({ user_id }) => user_id === id)?.display_name || id;
  const filteredProfiles = data.accounts.filter((profileRow) => {
    const query = search.trim().toLowerCase();
    return !query || (profileRow.display_name ?? "").toLowerCase().includes(query) ||
      profileRow.user_id.toLowerCase().includes(query) || (profileRow.email ?? "").toLowerCase().includes(query);
  });
  if (loading) return <PortalLoading />;
  return (
    <PortalPage role="Administrator" title={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ""}.`} description="Manage school accounts, learning structure, enquiries, and editable website content.">
      {error && <PortalError message={error} retry={() => setRefresh((key) => key + 1)} />}
      {success && <PortalSuccess>{success}</PortalSuccess>}
      <PortalNotice><Shield size={17} /> Administrator actions are restricted by database policies. User invitations and Auth account suspension must be managed through Supabase Auth until a trusted server-side admin function is deployed.</PortalNotice>
      <PortalTabs items={panels} onSelect={(item) => setSelected(item as Panel)} selected={selected} />
      {selected === "People & roles" && (
        <PortalCard title="People & roles" subtitle="Roles can only be assigned to accounts that already exist in Supabase Auth">
          <label className="portal-search"><UserRound size={16} /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or account UUID" value={search} /></label>
          {filteredProfiles.length === 0 ? <PortalEmpty title="No Auth accounts found">Invite accounts through Supabase Auth first. Only existing accounts appear here.</PortalEmpty> : (
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Profile</th><th>Email</th><th>Account UUID</th><th>Roles</th><th>Assign role</th></tr></thead><tbody>
              {filteredProfiles.map((person) => <tr key={person.user_id}><td>{person.display_name || "Name not set"}</td><td>{person.email || "No email address"}</td><td><code>{person.user_id}</code></td><td>{person.roles.map((role) => <span className="portal-badge" key={role}>{role}</span>)}</td><td><RoleAssignment roles={person.roles.map((role) => ({ role }))} onChange={(role, add) => act(async () => { const client = requireSchoolClient(); if (!add && !window.confirm(`Remove the ${role} role from this account?`)) return; const result = add ? await client.from("user_roles").insert({ user_id: person.user_id, role, created_by: user!.id }) : await client.from("user_roles").delete().match({ user_id: person.user_id, role }); if (result.error) throw result.error; }, `${role} role ${add ? "assigned" : "removed"}.`)} /></td></tr>)}
            </tbody></table></div>
          )}
        </PortalCard>
      )}
      {selected === "Classes & courses" && (
        <div className="portal-grid">
          <PortalCard title="Classes" subtitle="Academic years and sections can be updated by administrators">
            <EntityForm title="Add a class" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("classes").insert({ name: String(values.name ?? ""), section: values.section ? String(values.section) : null, academic_year: String(values.academic_year ?? "") }); if (saveError) throw saveError; }, "Class created.")}>
              <label>Class name<input name="name" required /></label><label>Section<input name="section" /></label><label>Academic year<input name="academic_year" placeholder="School-provided year" required /></label>
            </EntityForm>
            <div className="portal-list">{data.classes.map((item) => <div className="portal-list__row" key={item.id}><School size={18} /><span className="portal-list__main"><strong>{item.name}{item.section ? ` · ${item.section}` : ""}</strong><small>{item.academic_year} · {item.is_active ? "Active" : "Inactive"}</small></span><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("classes").update({ is_active: !item.is_active }).eq("id", item.id); if (updateError) throw updateError; }, `Class ${item.is_active ? "deactivated" : "activated"}.`)} type="button">{item.is_active ? "Deactivate" : "Activate"}</button></div>)}</div>
          </PortalCard>
          <PortalCard title="Subjects & courses" subtitle="Create an approved subject, course and enrolment">
            <EntityForm title="Add a subject" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("subjects").insert({ name: String(values.name ?? ""), description: values.description ? String(values.description) : null }); if (saveError) throw saveError; }, "Subject created.")}>
              <label>Subject name<input name="name" required /></label><label>Description<input name="description" /></label>
            </EntityForm>
            <EntityForm title="Add a course" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("courses").insert({ class_id: String(values.class_id ?? ""), subject_id: values.subject_id ? String(values.subject_id) : null, title: String(values.title ?? ""), description: values.description ? String(values.description) : null, is_published: false }); if (saveError) throw saveError; }, "Course created as a draft.")}>
              <label>Class<select name="class_id" required>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label>
              <label>Subject<select name="subject_id"><option value="">Not assigned</option>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Course title<input name="title" required /></label><label>Description<input name="description" /></label>
            </EntityForm>
            <div className="portal-list">{data.courses.map((course) => <div className="portal-list__row" key={course.id}><BookOpen size={18} /><span className="portal-list__main"><strong>{course.title}</strong><small>{data.classes.find(({ id }) => id === course.class_id)?.name} · {data.subjects.find(({ id }) => id === course.subject_id)?.name ?? "Subject not assigned"}</small></span><span className={`portal-badge ${course.is_published ? "portal-badge--done" : ""}`}>{course.is_published ? "Published" : "Draft"}</span><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("courses").update({ is_published: !course.is_published }).eq("id", course.id); if (updateError) throw updateError; }, course.is_published ? "Course unpublished." : "Course published.")} type="button">{course.is_published ? "Unpublish" : "Publish"}</button></div>)}</div>
            <EntityForm title="Enrol a student" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("enrollments").insert({ student_id: String(values.student_id ?? ""), class_id: String(values.class_id ?? "") }); if (saveError) throw saveError; }, "Student enrolled.")}>
              <label>Student<select name="student_id" required>{data.profiles.filter((person) => rolesByUser.get(person.user_id)?.some(({ role }) => role === "student")).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name || person.user_id}</option>)}</select></label>
              <label>Class<select name="class_id" required>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label>
            </EntityForm>
            <p className="portal-muted"><UsersRound size={15} /> {data.enrollments.length} current enrolment{data.enrollments.length === 1 ? "" : "s"}</p>
          </PortalCard>
        </div>
      )}
      {selected === "Admissions" && (
        <PortalCard title="Admissions enquiries" subtitle="Private enquiries are visible to administrators only">
          <label className="portal-search"><ClipboardList size={16} /><select aria-label="Filter by status" onChange={(event) => setSearch(event.target.value)}><option value="">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="in_review">In review</option><option value="closed">Closed</option></select></label>
          {data.enquiries.filter((item) => !["new", "contacted", "in_review", "closed"].includes(search) || item.status === search).length === 0 ? <PortalEmpty title="No enquiries">No admissions enquiries have been submitted through an enabled server-side form.</PortalEmpty> : (
            <div className="portal-record-grid">{data.enquiries.filter((item) => !["new", "contacted", "in_review", "closed"].includes(search) || item.status === search).map((item) => <article className="portal-record-card" key={item.id}><h3>{item.parent_name}</h3><p>{item.email}{item.phone ? ` · ${item.phone}` : ""}</p><p>Student: {item.student_name || "Not provided"} · Programme: {item.programme_interest || "Not specified"}</p><p className="portal-prose">{item.message}</p><label>Status<select onChange={(event) => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("admissions_enquiries").update({ status: event.target.value as AdmissionEnquiry["status"] }).eq("id", item.id); if (updateError) throw updateError; }, "Enquiry status updated.")} value={item.status}><option value="new">New</option><option value="contacted">Contacted</option><option value="in_review">In review</option><option value="closed">Closed</option></select></label><p className="portal-muted">Received {formatDate(item.created_at)}</p></article>)}</div>
          )}
        </PortalCard>
      )}
      {selected === "Announcements" && (
        <PortalCard title="School announcements" subtitle="Publish to all school accounts or a class">
          <AnnouncementCreator classes={data.classes} onSave={(values) => act(async () => { const client = requireSchoolClient(); const { publish, ...payload } = values; const { error: saveError } = await client.from("announcements").insert({ ...payload, created_by: user!.id, published_at: publish ? new Date().toISOString() : null }); if (saveError) throw saveError; }, "Announcement saved.")} />
          <div className="portal-list">{data.announcements.map((item) => <div className="portal-list__row" key={item.id}><Megaphone size={18} /><span className="portal-list__main"><strong>{item.title}</strong><small>{item.class_id ? data.classes.find(({ id }) => id === item.class_id)?.name : "All classes"} · {item.published_at ? "Published" : "Draft"}</small><span>{item.body}</span></span><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("announcements").update({ published_at: item.published_at ? null : new Date().toISOString() }).eq("id", item.id); if (updateError) throw updateError; }, item.published_at ? "Announcement unpublished." : "Announcement published.")} type="button">{item.published_at ? "Unpublish" : "Publish"}</button></div>)}</div>
        </PortalCard>
      )}
      {selected === "Fees" && (
        <div className="portal-grid">
          <PortalCard title="Fee records" subtitle="Amounts and fee labels must be supplied by the school">
            <EntityForm title="Create a fee record" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("fee_records").insert({ student_id: String(values.student_id ?? ""), label: String(values.label ?? ""), amount: Number(values.amount), currency: String(values.currency ?? "").toUpperCase(), due_at: values.due_at ? String(values.due_at) : null }); if (saveError) throw saveError; }, "Fee record created.")}>
              <label>Student<select name="student_id" required>{data.profiles.filter((person) => rolesByUser.get(person.user_id)?.some(({ role }) => role === "student")).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name || person.user_id}</option>)}</select></label>
              <label>Fee label<input name="label" placeholder="School-provided fee category" required /></label><label>Amount<input min="0" name="amount" required step="0.01" type="number" /></label><label>Currency code<input maxLength={3} minLength={3} name="currency" placeholder="School-confirmed code" required /></label><label>Due date<input name="due_at" type="date" /></label>
            </EntityForm>
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Fee</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{data.fees.map((fee) => <tr key={fee.id}><td>{profileName(fee.student_id)}</td><td>{fee.label}</td><td>{fee.currency} {Number(fee.amount).toFixed(2)}</td><td>{formatDate(fee.due_at)}</td><td>{fee.status}</td></tr>)}</tbody></table></div>
          </PortalCard>
          <PortalCard title="Payment history" subtitle="Transactions are recorded only after a trusted payment integration is connected">
            {data.transactions.length === 0 ? <PortalEmpty title="No recorded transactions">No payment transactions are stored. No payment provider is connected.</PortalEmpty> : <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Fee</th><th>Provider</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{data.transactions.map((transaction) => <tr key={transaction.id}><td>{profileName(data.fees.find(({ id }) => id === transaction.fee_record_id)?.student_id ?? "")}</td><td>{data.fees.find(({ id }) => id === transaction.fee_record_id)?.label ?? "Fee"}</td><td>{transaction.provider}</td><td>{transaction.currency} {Number(transaction.amount).toFixed(2)}</td><td>{transaction.status}</td><td>{transaction.provider_reference ?? "—"}</td></tr>)}</tbody></table></div>}
            <PortalNotice><CreditCard size={16} /> Live payment processing is deliberately disabled.</PortalNotice>
          </PortalCard>
        </div>
      )}
      {selected === "Attendance & timetable" && (
        <div className="portal-grid">
          <PortalCard title="School timetable" subtitle="Weekly schedule entries are visible only to enrolled students, assigned teachers, and administrators">
            <EntityForm title="Add timetable entry" onSave={(values) => act(async () => {
              const client = requireSchoolClient();
              const { error: saveError } = await client.from("timetable_entries").insert({
                class_id: String(values.class_id ?? ""),
                course_id: String(values.course_id ?? ""),
                teacher_id: String(values.teacher_id ?? ""),
                day_of_week: Number(values.day_of_week),
                starts_at: String(values.starts_at ?? ""),
                ends_at: String(values.ends_at ?? ""),
                effective_from: String(values.effective_from ?? new Date().toISOString().slice(0, 10)),
                effective_until: values.effective_until ? String(values.effective_until) : null,
                location: values.location ? String(values.location) : null,
                created_by: user!.id,
              });
              if (saveError) throw saveError;
            }, "Timetable entry saved.")}>
              <label>Class<select name="class_id" required>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label>
              <label>Course<select name="course_id" required>{data.courses.map((item) => <option key={item.id} value={item.id}>{item.title} · {data.classes.find(({ id }) => id === item.class_id)?.name}</option>)}</select></label>
              <label>Assigned teacher<select name="teacher_id" required>{data.teacherAssignments.map((item) => <option key={`${item.teacher_id}-${item.class_id}`} value={item.teacher_id}>{profileName(item.teacher_id)} · {data.classes.find(({ id }) => id === item.class_id)?.name}</option>)}</select></label>
              <label>Day of week<select name="day_of_week" required>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label>
              <label>Starts at<input name="starts_at" required type="time" /></label><label>Ends at<input name="ends_at" required type="time" /></label>
              <label>Effective from<input name="effective_from" type="date" /></label><label>Effective until<input name="effective_until" type="date" /></label><label>Room or location<input name="location" maxLength={120} /></label>
            </EntityForm>
            {data.timetable.length === 0 ? <PortalEmpty title="No timetable entries">Add the school-approved weekly schedule. Overlapping class times and mismatched teacher/course assignments are rejected by the database.</PortalEmpty> : (
              <div className="portal-list">{data.timetable.map((entry) => <div className="portal-list__row" key={entry.id}><CalendarDays size={18} /><span className="portal-list__main"><strong>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][entry.day_of_week - 1]} · {entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</strong><small>{data.classes.find(({ id }) => id === entry.class_id)?.name} · {data.courses.find(({ id }) => id === entry.course_id)?.title} · {profileName(entry.teacher_id)}{entry.location ? ` · ${entry.location}` : ""}</small><small>From {formatDate(entry.effective_from)}{entry.effective_until ? ` until ${formatDate(entry.effective_until)}` : ""}</small></span><button className="button button--secondary" onClick={() => { if (!window.confirm("Remove this timetable entry? Existing attendance sessions are retained.")) return; void act(async () => { const client = requireSchoolClient(); const { error: deleteError } = await client.from("timetable_entries").delete().eq("id", entry.id); if (deleteError) throw deleteError; }, "Timetable entry removed."); }} type="button">Remove</button></div>)}</div>
            )}
          </PortalCard>
          <PortalCard title="Attendance overview" subtitle="Recent stored sessions; only administrators can review all classes">
            {data.attendanceSessions.length === 0 ? <PortalEmpty title="No attendance sessions">Attendance records will appear here after an authorized teacher marks a class session.</PortalEmpty> : (
              <div className="portal-list">{data.attendanceSessions.map((session) => {
                const records = data.attendanceRecords.filter(({ session_id }) => session_id === session.id);
                return <div className="portal-list__row" key={session.id}><ClipboardList size={18} /><span className="portal-list__main"><strong>{data.classes.find(({ id }) => id === session.class_id)?.name} · {session.session_label}</strong><small>{formatDate(session.attendance_date)} · {records.length} marked · {records.filter(({ status }) => status === "present").length} present · {records.filter(({ status }) => status === "absent").length} absent · {records.filter(({ status }) => status === "late").length} late · {records.filter(({ status }) => status === "excused").length} excused</small></span></div>;
              })}</div>
            )}
          </PortalCard>
        </div>
      )}
      {selected === "Website content" && (
        <PortalCard title="Website content records" subtitle="Publish verified JSON records to update matching public pages. Drafts remain private.">
          <ContentEditor existing={data.content} onSave={(key, content, published) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("school_content").upsert({ content_key: key, content, is_published: published, updated_by: user!.id }, { onConflict: "content_key" }); if (saveError) throw saveError; }, "Website content saved.")} />
          {data.content.length === 0 ? <PortalEmpty title="No editable content yet">Add verified content above. Unpublished content remains private to administrators.</PortalEmpty> : <div className="portal-list">{data.content.map((item) => <details className="portal-content-row" key={item.content_key}><summary>{item.content_key} · {item.is_published ? "Published" : "Draft"} · updated {formatDate(item.updated_at)}</summary><pre>{JSON.stringify(item.content, null, 2)}</pre></details>)}</div>}
        </PortalCard>
      )}
      {selected === "Classes & courses" && data.courses.length > 0 && (
        <PortalCard title="Teacher assignments" subtitle="Assign an existing teacher to a class">
          <EntityForm title="Assign teacher to class" onSave={(values) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("teacher_class_assignments").insert({ teacher_id: String(values.teacher_id ?? ""), class_id: String(values.class_id ?? "") }); if (saveError) throw saveError; }, "Teacher assignment saved.")}>
            <label>Teacher<select name="teacher_id" required>{data.profiles.filter((person) => rolesByUser.get(person.user_id)?.some(({ role }) => role === "teacher")).map((person) => <option key={person.user_id} value={person.user_id}>{person.display_name || person.user_id}</option>)}</select></label>
            <label>Class<select name="class_id" required>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label>
          </EntityForm>
        </PortalCard>
      )}
    </PortalPage>
  );
}

function RoleAssignment({ roles, onChange }: { roles: Array<Pick<UserRole, "role">>; onChange: (role: AppRole, add: boolean) => void }) {
  const existing = new Set(roles.map(({ role }) => role));
  return <div className="portal-role-actions">{(["student", "teacher", "admin"] as const).map((role) => <button className={existing.has(role) ? "portal-role is-assigned" : "portal-role"} key={role} onClick={() => onChange(role, !existing.has(role))} type="button">{existing.has(role) ? "−" : "+"} {role}</button>)}</div>;
}

function EntityForm({ title, children, onSave }: { title: string; children: React.ReactNode; onSave: (values: Record<string, string | boolean | null | number>) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> {title}</summary><form className="portal-form portal-form--inline" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values: Record<string, string | boolean | null | number> = {}; for (const [key, value] of new FormData(form).entries()) values[key] = value === "" ? null : String(value).trim(); const amount = values.amount; if (typeof amount === "string" && amount) values.amount = Number(amount); onSave(values); form.reset(); }}><div className="portal-form-grid">{children}</div><button className="button button--primary" type="submit"><Save size={15} /> Save</button></form></details>;
}

function AnnouncementCreator({ classes, onSave }: { classes: SchoolClass[]; onSave: (values: { title: string; body: string; class_id: string | null; publish: boolean }) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> Create an announcement</summary><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); onSave({ title: String(values.get("title")).trim(), body: String(values.get("body")).trim(), class_id: String(values.get("class_id")) || null, publish: values.get("publish") === "on" }); event.currentTarget.reset(); }}><div className="portal-form-grid"><label>Title<input name="title" required /></label><label>Audience<select name="class_id"><option value="">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label><label>Message<textarea name="body" required rows={3} /></label><label className="portal-check"><input name="publish" type="checkbox" /> Publish now</label></div><button className="button button--primary" type="submit"><Megaphone size={15} /> Save announcement</button></form></details>;
}

function ContentEditor({ existing, onSave }: { existing: SchoolContent[]; onSave: (key: string, content: import("../../lib/database.types").Json, published: boolean) => void }) {
  const [key, setKey] = useState("");
  const [json, setJson] = useState('{\n  "title": "",\n  "body": ""\n}');
  const [published, setPublished] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  function chooseContent(value: string) {
    setKey(value);
    const item = existing.find(({ content_key }) => content_key === value);
    if (item) { setJson(JSON.stringify(item.content, null, 2)); setPublished(item.is_published); }
  }
  return <><p className="portal-muted">Public keys: home, about, academics, admissions, faculty, gallery, news, contact. Use the page field names shown in the project README; publish only school-approved information and media.</p><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); setValidationError(null); try { const content: unknown = JSON.parse(json); if (!content || typeof content !== "object" || Array.isArray(content)) throw new Error("Content must be a JSON object."); if (!key.trim()) throw new Error("Provide a content key."); onSave(key.trim(), content as import("../../lib/database.types").Json, published); } catch (parseError) { setValidationError(errorMessage(parseError)); } }}><div className="portal-form-grid"><label>Content key<input list="content-keys" onChange={(event) => chooseContent(event.target.value)} placeholder="e.g. home" required value={key} /><datalist id="content-keys">{existing.map(({ content_key }) => <option key={content_key} value={content_key} />)}</datalist></label><label>JSON content<textarea className="portal-code-input" onChange={(event) => setJson(event.target.value)} required rows={8} value={json} /></label><label className="portal-check"><input checked={published} onChange={(event) => setPublished(event.target.checked)} type="checkbox" /> Publish publicly</label></div>{validationError && <p className="portal-error-inline" role="alert">{validationError}</p>}<button className="button button--primary" type="submit"><Save size={15} /> Save content</button></form></>;
}
