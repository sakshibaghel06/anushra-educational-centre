import { BookOpen, CalendarDays, Check, ClipboardList, Download, FileUp, Megaphone, Plus, Save, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import type {
  Announcement,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Assignment,
  Course,
  Enrollment,
  Lesson,
  LessonMaterial,
  Profile,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  SchoolClass,
  Submission,
  SubmissionFeedback,
  TimetableEntry,
} from "../../lib/database.types";
import { PortalCard, PortalEmpty, PortalError, PortalLoading, PortalNotice, PortalPage, PortalSuccess, PortalTabs, formatDate } from "../portals/PortalComponents";
import { errorMessage, requireSchoolClient } from "../portals/portalUtils";

type Panel = "Classes" | "Courses" | "Lessons & materials" | "Assignments" | "Tests" | "Submissions" | "Announcements" | "Attendance";

type TeacherData = {
  classes: SchoolClass[];
  courses: Course[];
  assignments: Assignment[];
  lessons: Lesson[];
  materials: LessonMaterial[];
  quizzes: Quiz[];
  questions: QuizQuestion[];
  announcements: Announcement[];
  submissions: Submission[];
  profiles: Profile[];
  feedback: SubmissionFeedback[];
  enrollments: Enrollment[];
  attempts: QuizAttempt[];
  timetable: TimetableEntry[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
};

const emptyData: TeacherData = {
  classes: [], courses: [], assignments: [], lessons: [], materials: [], quizzes: [],
  questions: [], announcements: [], submissions: [], profiles: [], feedback: [], enrollments: [], attempts: [],
  timetable: [], attendanceSessions: [], attendanceRecords: [],
};
const panels: Panel[] = ["Classes", "Courses", "Lessons & materials", "Assignments", "Tests", "Submissions", "Announcements", "Attendance"];

export default function TeacherDashboard() {
  const { user, profile } = useAuth();
  const [selected, setSelected] = useState<Panel>("Classes");
  const [data, setData] = useState<TeacherData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { data: assignmentRows, error: assignmentError } = await client
        .from("teacher_class_assignments").select("*").eq("teacher_id", user.id);
      if (assignmentError) throw assignmentError;
      const classIds = assignmentRows.map(({ class_id }) => class_id);
      if (!classIds.length) { setData(emptyData); return; }
      const [classResult, courseResult] = await Promise.all([
        client.from("classes").select("*").in("id", classIds),
        client.from("courses").select("*").in("class_id", classIds),
      ]);
      if (classResult.error) throw classResult.error;
      if (courseResult.error) throw courseResult.error;
      const courses = courseResult.data;
      const courseIds = courses.map(({ id }) => id);
      const [enrollmentResult, announcementResult, lessonsResult, assignmentsResult, quizzesResult, timetableResult, attendanceSessionResult] = await Promise.all([
        client.from("enrollments").select("*").in("class_id", classIds),
        client.from("announcements").select("*").in("class_id", classIds).order("created_at", { ascending: false }),
        courseIds.length ? client.from("lessons").select("*").in("course_id", courseIds).order("position") : Promise.resolve({ data: [], error: null }),
        courseIds.length ? client.from("assignments").select("*").in("course_id", courseIds).order("due_at") : Promise.resolve({ data: [], error: null }),
        courseIds.length ? client.from("quizzes").select("*").in("course_id", courseIds).order("due_at") : Promise.resolve({ data: [], error: null }),
        client.from("timetable_entries").select("*").in("class_id", classIds).order("day_of_week").order("starts_at"),
        client.from("attendance_sessions").select("*").in("class_id", classIds).order("attendance_date", { ascending: false }).limit(100),
      ]);
      for (const result of [enrollmentResult, announcementResult, lessonsResult, assignmentsResult, quizzesResult, timetableResult, attendanceSessionResult]) {
        if (result.error) throw result.error;
      }
      const lessonRows = lessonsResult.data ?? [];
      const assignmentRowsData = assignmentsResult.data ?? [];
      const enrollmentRows = enrollmentResult.data ?? [];
      const lessonIds = lessonRows.map(({ id }) => id);
      const assignmentIds = assignmentRowsData.map(({ id }) => id);
      const [materialResult, submissionResult] = await Promise.all([
        lessonIds.length ? client.from("lesson_materials").select("*").in("lesson_id", lessonIds) : Promise.resolve({ data: [], error: null }),
        assignmentIds.length ? client.from("submissions").select("*").in("assignment_id", assignmentIds).order("submitted_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (materialResult.error) throw materialResult.error;
      if (submissionResult.error) throw submissionResult.error;
      const profilesResult = enrollmentRows.length
        ? await client.from("profiles").select("*").in("user_id", enrollmentRows.map(({ student_id }) => student_id))
        : { data: [], error: null };
      if (profilesResult.error) throw profilesResult.error;
      const submissionIds = submissionResult.data.map(({ id }) => id);
      const feedbackResult = submissionIds.length
        ? await client.from("submission_feedback").select("*").in("submission_id", submissionIds)
        : { data: [], error: null };
      if (feedbackResult.error) throw feedbackResult.error;
      const quizIds = (quizzesResult.data ?? []).map(({ id }) => id);
      const attemptResult = quizIds.length
        ? await client.from("quiz_attempts").select("*").in("quiz_id", quizIds).order("started_at", { ascending: false })
        : { data: [], error: null };
      if (attemptResult.error) throw attemptResult.error;
      const questionResult = quizIds.length
        ? await client.from("quiz_questions").select("*").in("quiz_id", quizIds).order("position")
        : { data: [], error: null };
      if (questionResult.error) throw questionResult.error;
      const attemptStudentIds = [...new Set((attemptResult.data ?? []).map(({ student_id }) => student_id))];
      const attemptProfilesResult = attemptStudentIds.length
        ? await client.from("profiles").select("*").in("user_id", attemptStudentIds)
        : { data: [], error: null };
      if (attemptProfilesResult.error) throw attemptProfilesResult.error;
      const attendanceSessions = attendanceSessionResult.data ?? [];
      const attendanceRecordResult = attendanceSessions.length
        ? await client.from("attendance_records").select("*").in("session_id", attendanceSessions.map(({ id }) => id))
        : { data: [], error: null };
      if (attendanceRecordResult.error) throw attendanceRecordResult.error;
      setData({
        classes: classResult.data ?? [], courses, assignments: assignmentRowsData, lessons: lessonRows,
        materials: materialResult.data ?? [], quizzes: quizzesResult.data ?? [], questions: questionResult.data ?? [], announcements: announcementResult.data ?? [],
        submissions: submissionResult.data ?? [], profiles: [...(profilesResult.data ?? []), ...(attemptProfilesResult.data ?? [])].filter((person, index, list) => list.findIndex((other) => other.user_id === person.user_id) === index),
        feedback: feedbackResult.data ?? [], enrollments: enrollmentRows, attempts: attemptResult.data ?? [],
        timetable: timetableResult.data ?? [], attendanceSessions,
        attendanceRecords: attendanceRecordResult.data ?? [],
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

  const students = useMemo(() => new Map(data.profiles.map((item) => [item.user_id, item.display_name || item.user_id])), [data.profiles]);
  const coursesById = useMemo(() => new Map(data.courses.map((item) => [item.id, item.title])), [data.courses]);

  if (loading) return <PortalLoading />;
  return (
    <PortalPage role="Teacher" title={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ""}.`} description="Manage your assigned classes and learning activities.">
      {error && <PortalError message={error} retry={() => setRefresh((key) => key + 1)} />}
      {success && <PortalSuccess>{success}</PortalSuccess>}
      <PortalNotice>Your access is limited by the classes assigned to your account. All changes are also checked by database policies.</PortalNotice>
      <PortalTabs items={panels} onSelect={(item) => setSelected(item as Panel)} selected={selected} />
      {selected === "Classes" && (
        <PortalCard title="Assigned classes" subtitle="Student lists are limited to your assigned classes">
          {!data.classes.length ? <PortalEmpty title="No class assignments">Ask an administrator to assign your account to a class.</PortalEmpty> : (
            <div className="portal-record-grid">{data.classes.map((schoolClass) => {
              const enrollments = data.enrollments.filter(({ class_id }) => class_id === schoolClass.id);
              return <article className="portal-record-card" key={schoolClass.id}><span className="portal-list__icon"><UsersRound size={20} /></span><h3>{schoolClass.name}{schoolClass.section ? ` · ${schoolClass.section}` : ""}</h3><p>Academic year {schoolClass.academic_year}</p><strong>{enrollments.length} enrolled learner{enrollments.length === 1 ? "" : "s"}</strong><ul>{enrollments.map(({ student_id }) => <li key={student_id}>{students.get(student_id) ?? "Student profile"}</li>)}</ul></article>;
            })}</div>
          )}
        </PortalCard>
      )}
      {selected === "Courses" && (
        <PortalCard title="Courses" subtitle="Courses available to your assigned classes">
          <div className="portal-record-grid">{data.courses.map((course) => <article className="portal-record-card" key={course.id}><BookOpen size={21} /><h3>{course.title}</h3><p>{course.description || "No course description"}</p><span className={`portal-badge ${course.is_published ? "portal-badge--done" : ""}`}>{course.is_published ? "Published" : "Draft"}</span><small>{data.classes.find(({ id }) => id === course.class_id)?.name}</small><div className="portal-action-row"><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("courses").update({ is_published: !course.is_published }).eq("id", course.id); if (updateError) throw updateError; }, course.is_published ? "Course unpublished." : "Course published.")} type="button">{course.is_published ? "Unpublish" : "Publish"}</button></div></article>)}</div>
          <CourseForm classes={data.classes} onCreate={(values) => act(async () => { const client = requireSchoolClient(); const { error: createError } = await client.from("courses").insert({ ...values, is_published: false }); if (createError) throw createError; }, "Course created as a draft.")} />
        </PortalCard>
      )}
      {selected === "Lessons & materials" && (
        <PortalCard title="Lessons & materials" subtitle="Create a lesson and optionally upload one protected resource">
          <LessonForm courses={data.courses} userId={user?.id ?? ""} onCreate={(lessonValues, file) => act(async () => {
            const client = requireSchoolClient();
            const { data: lesson, error: lessonError } = await client.from("lessons").insert({ ...lessonValues, created_by: user!.id }).select("*").single();
            if (lessonError) throw lessonError;
            if (file) {
              const path = `${lessonValues.course_id}/${lesson.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
              const { error: uploadError } = await client.storage.from("learning-materials").upload(path, file);
              if (uploadError) throw uploadError;
              const { error: metadataError } = await client.from("lesson_materials").insert({ lesson_id: lesson.id, storage_path: path, display_name: file.name, content_type: file.type || null, created_by: user!.id });
              if (metadataError) {
                const { error: cleanupError } = await client.storage.from("learning-materials").remove([path]);
                if (cleanupError) throw new Error(`${metadataError.message}. Uploaded file cleanup failed; contact an administrator.`);
                throw metadataError;
              }
            }
          }, "Lesson saved.")} />
          <div className="portal-list">{data.lessons.map((lesson) => <div className="portal-list__row" key={lesson.id}><span className="portal-list__main"><strong>{lesson.title}</strong><small>{coursesById.get(lesson.course_id)} · position {lesson.position} · {lesson.is_published ? "Published" : "Draft"}</small></span><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("lessons").update({ is_published: !lesson.is_published }).eq("id", lesson.id); if (updateError) throw updateError; }, lesson.is_published ? "Lesson unpublished." : "Lesson published.")} type="button">{lesson.is_published ? "Unpublish" : "Publish"}</button></div>)}</div>
          {data.materials.length > 0 && <p className="portal-muted"><FileUp size={15} /> {data.materials.length} protected learning material{data.materials.length === 1 ? "" : "s"} uploaded.</p>}
        </PortalCard>
      )}
      {selected === "Assignments" && (
        <PortalCard title="Assignments" subtitle="Create an assignment for a course you manage">
          <AssignmentForm courses={data.courses} userId={user?.id ?? ""} onCreate={(values) => act(async () => { const client = requireSchoolClient(); const { error: createError } = await client.from("assignments").insert({ ...values, created_by: user!.id, is_published: false }); if (createError) throw createError; }, "Assignment created as a draft.")} />
          <div className="portal-list">{data.assignments.map((item) => <div className="portal-list__row" key={item.id}><span className="portal-list__main"><strong>{item.title}</strong><small>{coursesById.get(item.course_id)} · due {formatDate(item.due_at)}</small></span><button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("assignments").update({ is_published: !item.is_published }).eq("id", item.id); if (updateError) throw updateError; }, item.is_published ? "Assignment unpublished." : "Assignment published.")} type="button">{item.is_published ? "Unpublish" : "Publish"}</button></div>)}</div>
        </PortalCard>
      )}
      {selected === "Tests" && (
        <PortalCard title="Tests & quizzes" subtitle="The correct answer is stored privately and is never sent to students before grading">
          <QuizForm courses={data.courses} onCreate={(quiz, question) => act(async () => {
            const client = requireSchoolClient();
            const { data: quizRow, error: quizError } = await client.from("quizzes").insert({ ...quiz, created_by: user!.id, is_published: false, results_visible_to_students: false }).select("id").single();
            if (quizError) throw quizError;
            const { error: questionError } = await client.from("quiz_questions").insert({ ...question, quiz_id: quizRow.id });
            if (questionError) throw questionError;
          }, "Quiz and question saved as a draft.")} />
          <div className="portal-list">{data.quizzes.map((quiz) => (
            <div className="portal-list__row" key={quiz.id}>
              <div className="portal-list__main">
                <strong>{quiz.title}</strong>
                <small>{coursesById.get(quiz.course_id)} · {data.questions.filter(({ quiz_id }) => quiz_id === quiz.id).length} questions · due {formatDate(quiz.due_at)} · max {quiz.max_attempts} attempts · {quiz.results_visible_to_students ? "Results released" : "Results hidden"}</small>
                <AddQuestionForm onCreate={(question) => act(async () => {
                  const client = requireSchoolClient();
                  const { error: questionError } = await client.from("quiz_questions").insert({ ...question, quiz_id: quiz.id, position: data.questions.filter(({ quiz_id }) => quiz_id === quiz.id).length });
                  if (questionError) throw questionError;
                }, "Question added to quiz.")} />
              </div>
              <button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("quizzes").update({ is_published: !quiz.is_published }).eq("id", quiz.id); if (updateError) throw updateError; }, quiz.is_published ? "Quiz unpublished." : "Quiz published.")} type="button">{quiz.is_published ? "Unpublish" : "Publish"}</button>
              <button className="button button--secondary" onClick={() => void act(async () => { const client = requireSchoolClient(); const { error: updateError } = await client.from("quizzes").update({ results_visible_to_students: !quiz.results_visible_to_students }).eq("id", quiz.id); if (updateError) throw updateError; }, quiz.results_visible_to_students ? "Quiz results hidden." : "Quiz results released.")} type="button">{quiz.results_visible_to_students ? "Hide results" : "Release results"}</button>
            </div>
          ))}</div>
          {data.attempts.length > 0 && <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Test</th><th>Started</th><th>Submitted</th><th>Score</th></tr></thead><tbody>{data.attempts.map((attempt) => <tr key={attempt.id}><td>{students.get(attempt.student_id) ?? "Student"}</td><td>{data.quizzes.find(({ id }) => id === attempt.quiz_id)?.title}</td><td>{formatDate(attempt.started_at)}</td><td>{formatDate(attempt.submitted_at)}</td><td>{attempt.submitted_at ? `${attempt.score ?? "—"} / ${attempt.maximum_score ?? "—"}` : "In progress"}</td></tr>)}</tbody></table></div>}
        </PortalCard>
      )}
      {selected === "Submissions" && (
        <PortalCard title="Student submissions" subtitle="Only submissions from your assigned courses are visible">
          {data.submissions.length === 0 ? <PortalEmpty title="No submissions yet">Student submissions appear here after an assignment is published.</PortalEmpty> : (
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Response / file</th><th>Grade</th></tr></thead><tbody>
              {data.submissions.map((submission) => <SubmissionRow feedback={data.feedback.find(({ submission_id }) => submission_id === submission.id)} key={submission.id} name={students.get(submission.student_id) ?? "Student"} onSave={(score, feedback, visible) => act(async () => { const client = requireSchoolClient(); const { error: saveError } = await client.from("submission_feedback").upsert({ submission_id: submission.id, score, feedback, visible_to_student: visible, graded_by: user!.id }, { onConflict: "submission_id" }); if (saveError) throw saveError; }, "Feedback saved.")} submission={submission} assignmentTitle={data.assignments.find(({ id }) => id === submission.assignment_id)?.title ?? "Assignment"} />)}
            </tbody></table></div>
          )}
        </PortalCard>
      )}
      {selected === "Announcements" && (
        <PortalCard title="Class announcements" subtitle="Publish only to a class assigned to you">
          <AnnouncementForm classes={data.classes} onCreate={(values) => act(async () => { const client = requireSchoolClient(); const { publish, ...announcement } = values; const { error: createError } = await client.from("announcements").insert({ ...announcement, created_by: user!.id, published_at: publish ? new Date().toISOString() : null }); if (createError) throw createError; }, "Announcement saved.")} />
          <div className="portal-list">{data.announcements.map((item) => <div className="portal-list__row" key={item.id}><Megaphone size={18} /><span className="portal-list__main"><strong>{item.title}</strong><small>{item.class_id ? data.classes.find(({ id }) => id === item.class_id)?.name : "All classes"} · {item.published_at ? "Published" : "Draft"}</small><span>{item.body}</span></span></div>)}</div>
        </PortalCard>
      )}
      {selected === "Attendance" && (
        <div className="portal-grid">
          <PortalCard title="Assigned timetable" subtitle="Schedule entries for your assigned classes">
            {data.timetable.length === 0 ? <PortalEmpty title="No timetable available">The administrator has not published a timetable for your assigned classes.</PortalEmpty> : (
              <div className="portal-list">{data.timetable.map((entry) => <div className="portal-list__row" key={entry.id}><CalendarDays size={18} /><span className="portal-list__main"><strong>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][entry.day_of_week - 1]} · {entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</strong><small>{data.classes.find(({ id }) => id === entry.class_id)?.name} · {coursesById.get(entry.course_id)}{entry.location ? ` · ${entry.location}` : ""}</small><small>From {formatDate(entry.effective_from)}{entry.effective_until ? ` until ${formatDate(entry.effective_until)}` : ""}</small></span></div>)}</div>
            )}
          </PortalCard>
          <PortalCard title="Class attendance" subtitle="Create a dated session and record each enrolled learner's status">
            <AttendanceSessionForm classes={data.classes} onCreate={(values) => act(async () => {
              const client = requireSchoolClient();
              const { error: createError } = await client.from("attendance_sessions").insert({ ...values, created_by: user!.id });
              if (createError) throw createError;
            }, "Attendance session created.")} />
            {data.attendanceSessions.length === 0 ? <PortalEmpty title="No sessions yet">Create a session for one of your assigned classes to begin taking attendance.</PortalEmpty> : (
              <div className="portal-list">{data.attendanceSessions.map((session) => {
                const records = data.attendanceRecords.filter(({ session_id }) => session_id === session.id);
                const learners = data.enrollments.filter(({ class_id }) => class_id === session.class_id).map(({ student_id }) => ({
                  studentId: student_id,
                  name: students.get(student_id) ?? "Student profile",
                }));
                return <AttendanceRoster key={session.id} learners={learners} onSave={(rows) => act(async () => {
                  const client = requireSchoolClient();
                  const { error: saveError } = await client.from("attendance_records").upsert(rows, { onConflict: "session_id,student_id" });
                  if (saveError) throw saveError;
                }, "Attendance saved.")} records={records} session={session} className={data.classes.find(({ id }) => id === session.class_id)?.name ?? "Assigned class"} />;
              })}</div>
            )}
          </PortalCard>
        </div>
      )}
    </PortalPage>
  );
}

function AttendanceSessionForm({ classes, onCreate }: {
  classes: SchoolClass[];
  onCreate: (values: { class_id: string; attendance_date: string; session_label: string; timetable_entry_id: null }) => void;
}) {
  return <details className="portal-create"><summary><Plus size={16} /> Create an attendance session</summary><form className="portal-form portal-form--inline" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    onCreate({
      class_id: String(values.get("class_id")),
      attendance_date: String(values.get("attendance_date")),
      session_label: String(values.get("session_label")).trim(),
      timetable_entry_id: null,
    });
    form.reset();
  }}><label>Assigned class<select name="class_id" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` · ${item.section}` : ""}</option>)}</select></label><label>Session date<input defaultValue={new Date().toISOString().slice(0, 10)} name="attendance_date" required type="date" /></label><label>Period or session label<input maxLength={100} name="session_label" placeholder="Use the school schedule label" required /></label><button className="button button--primary" disabled={!classes.length} type="submit"><ClipboardList size={15} /> Create session</button></form></details>;
}

function AttendanceRoster({ session, className, learners, records, onSave }: {
  session: AttendanceSession;
  className: string;
  learners: Array<{ studentId: string; name: string }>;
  records: AttendanceRecord[];
  onSave: (rows: Array<{ session_id: string; student_id: string; status: AttendanceStatus }>) => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | "">>(() =>
    Object.fromEntries(learners.map(({ studentId }) => [
      studentId,
      records.find(({ student_id }) => student_id === studentId)?.status ?? "",
    ])),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missingStatus = learners.some(({ studentId }) => !statuses[studentId]);
    if (missingStatus) {
      setValidationError("Choose a status for every enrolled learner before saving this session.");
      return;
    }
    setValidationError(null);
    onSave(learners.map(({ studentId }) => ({
      session_id: session.id,
      student_id: studentId,
      status: statuses[studentId] as AttendanceStatus,
    })));
  }

  return <details className="portal-create"><summary><ClipboardList size={16} /> {className} · {session.session_label} · {formatDate(session.attendance_date)} ({records.length}/{learners.length} marked)</summary>{learners.length === 0 ? <PortalEmpty title="No students enrolled">No attendance rows were created because no students are enrolled in this class.</PortalEmpty> : <form className="portal-form portal-form--inline" onSubmit={submit}><div className="portal-list">{learners.map(({ studentId, name }) => <label className="portal-list__row attendance-roster-row" key={studentId}><span className="portal-list__main"><strong>{name}</strong></span><select aria-label={`Attendance status for ${name}`} onChange={(event) => setStatuses((current) => ({ ...current, [studentId]: event.target.value as AttendanceStatus | "" }))} required value={statuses[studentId]}><option value="">Choose status</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></label>)}</div>{validationError && <p className="portal-error-inline" role="alert">{validationError}</p>}<button className="button button--primary" type="submit"><Save size={15} /> Save attendance</button></form>}</details>;
}

function CourseForm({ classes, onCreate }: { classes: SchoolClass[]; onCreate: (values: { class_id: string; title: string; description: string }) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> Create a course</summary><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; onCreate({ class_id: String(new FormData(form).get("class_id")), title: String(new FormData(form).get("title")).trim(), description: String(new FormData(form).get("description")).trim() }); form.reset(); }}><label>Assigned class<select name="class_id" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` - ${item.section}` : ""}</option>)}</select></label><label>Course title<input name="title" required /></label><label>Description<input name="description" /></label><button className="button button--primary" disabled={!classes.length} type="submit"><Save size={15} /> Save draft</button></form></details>;
}

function LessonForm({ courses, userId: _userId, onCreate }: { courses: Course[]; userId: string; onCreate: (values: { course_id: string; title: string; description: string; video_url: string | null; position: number; is_published: boolean }, file: File | null) => void }) {
  return <details className="portal-create" open><summary><Plus size={16} /> Add a lesson</summary><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const video = String(values.get("video_url")).trim(); onCreate({ course_id: String(values.get("course_id")), title: String(values.get("title")).trim(), description: String(values.get("description")).trim(), video_url: video || null, position: Number(values.get("position")), is_published: false }, (values.get("material") as File).size ? values.get("material") as File : null); form.reset(); }}><label>Course<select name="course_id" required>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Lesson title<input name="title" required /></label><label>Description<textarea name="description" rows={2} /></label><label>Authorised video URL<input name="video_url" placeholder="https://" type="url" /></label><label>Order<input defaultValue="0" min="0" name="position" type="number" /></label><label className="portal-file-input"><FileUp size={17} /> Learning material<input accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" name="material" type="file" /></label><button className="button button--primary" disabled={!courses.length} type="submit"><Save size={15} /> Save lesson</button></form></details>;
}

function AssignmentForm({ courses, userId: _userId, onCreate }: { courses: Course[]; userId: string; onCreate: (values: { course_id: string; title: string; instructions: string; due_at: string | null; allow_resubmission: boolean }) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> Create an assignment</summary><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); onCreate({ course_id: String(values.get("course_id")), title: String(values.get("title")).trim(), instructions: String(values.get("instructions")).trim(), due_at: values.get("due_at") ? new Date(String(values.get("due_at"))).toISOString() : null, allow_resubmission: values.get("allow_resubmission") === "on" }); form.reset(); }}><label>Course<select name="course_id" required>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Title<input name="title" required /></label><label>Instructions<textarea name="instructions" required rows={3} /></label><label>Due date<input name="due_at" type="datetime-local" /></label><label className="portal-check"><input name="allow_resubmission" type="checkbox" /> Allow resubmission</label><button className="button button--primary" disabled={!courses.length} type="submit"><Save size={15} /> Save draft</button></form></details>;
}

function QuizForm({ courses, onCreate }: { courses: Course[]; onCreate: (quiz: { course_id: string; title: string; instructions: string; due_at: string | null; time_limit_minutes: number | null; max_attempts: number }, question: { prompt: string; options: string[]; correct_option: number; points: number; position: number }) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> Create a multiple-choice test</summary><form className="portal-form portal-form--inline" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const optionInput = form.elements.namedItem("options");
    const answerInput = form.elements.namedItem("correct_option");
    if (!(optionInput instanceof HTMLInputElement) || !(answerInput instanceof HTMLInputElement)) return;
    const options = optionInput.value.split("|").map((item) => item.trim()).filter(Boolean);
    const correct = Number(answerInput.value) - 1;
    optionInput.setCustomValidity(options.length < 2 ? "Enter at least two options separated by |." : "");
    answerInput.setCustomValidity(correct < 0 || correct >= options.length ? "Choose a correct option number within the listed options." : "");
    if (!form.reportValidity()) return;
    onCreate({ course_id: String(values.get("course_id")), title: String(values.get("title")).trim(), instructions: String(values.get("instructions")).trim(), due_at: values.get("due_at") ? new Date(String(values.get("due_at"))).toISOString() : null, time_limit_minutes: values.get("time_limit_minutes") ? Number(values.get("time_limit_minutes")) : null, max_attempts: Number(values.get("max_attempts")) || 1 }, { prompt: String(values.get("prompt")).trim(), options, correct_option: correct, points: Number(values.get("points")) || 1, position: 0 });
    form.reset();
  }}><label>Course<select name="course_id" required>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Test title<input name="title" required /></label><label>Instructions<textarea name="instructions" rows={2} /></label><label>Due date<input name="due_at" type="datetime-local" /></label><label>Time limit in minutes<input min="1" max="600" name="time_limit_minutes" type="number" /></label><label>Maximum attempts<input defaultValue="1" min="1" max="10" name="max_attempts" type="number" required /></label><label>First question<input name="prompt" required /></label><label>Options (separate with |)<input name="options" onInput={(event) => event.currentTarget.setCustomValidity("")} placeholder="Option A | Option B | Option C" required /></label><label>Correct option number<input defaultValue="1" min="1" name="correct_option" onInput={(event) => event.currentTarget.setCustomValidity("")} type="number" required /></label><label>Question points<input defaultValue="1" min="0.01" name="points" step="0.01" type="number" required /></label><p className="portal-muted">Additional questions can be added to each quiz after it is created.</p><button className="button button--primary" disabled={!courses.length} type="submit"><Save size={15} /> Save quiz draft</button></form></details>;
}

function AddQuestionForm({ onCreate }: { onCreate: (question: { prompt: string; options: string[]; correct_option: number; points: number }) => void }) {
  return <details className="portal-create"><summary><Plus size={15} /> Add question</summary><form className="portal-form portal-form--inline" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const optionInput = form.elements.namedItem("options");
    const answerInput = form.elements.namedItem("correct_option");
    if (!(optionInput instanceof HTMLInputElement) || !(answerInput instanceof HTMLInputElement)) return;
    const options = optionInput.value.split("|").map((item) => item.trim()).filter(Boolean);
    const correct = Number(answerInput.value) - 1;
    optionInput.setCustomValidity(options.length < 2 ? "Enter at least two options separated by |." : "");
    answerInput.setCustomValidity(correct < 0 || correct >= options.length ? "Choose a correct option number within the listed options." : "");
    if (!form.reportValidity()) return;
    onCreate({ prompt: String(values.get("prompt")).trim(), options, correct_option: correct, points: Number(values.get("points")) });
    form.reset();
  }}><label>Question<input name="prompt" required /></label><label>Options (separate with |)<input name="options" onInput={(event) => event.currentTarget.setCustomValidity("")} placeholder="Option A | Option B | Option C" required /></label><label>Correct option number<input defaultValue="1" min="1" name="correct_option" onInput={(event) => event.currentTarget.setCustomValidity("")} type="number" required /></label><label>Points<input defaultValue="1" min="0.01" name="points" required step="0.01" type="number" /></label><button className="button button--secondary" type="submit"><Save size={15} /> Save question</button></form></details>;
}

function AnnouncementForm({ classes, onCreate }: { classes: SchoolClass[]; onCreate: (values: { class_id: string | null; title: string; body: string; publish: boolean }) => void }) {
  return <details className="portal-create"><summary><Plus size={16} /> Write an announcement</summary><form className="portal-form portal-form--inline" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); onCreate({ class_id: String(values.get("class_id")) || null, title: String(values.get("title")).trim(), body: String(values.get("body")).trim(), publish: values.get("publish") === "on" }); form.reset(); }}><label>Assigned class<select name="class_id" required>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.section ? ` - ${item.section}` : ""}</option>)}</select></label><label>Title<input name="title" required /></label><label>Message<textarea name="body" required rows={3} /></label><label className="portal-check"><input name="publish" type="checkbox" /> Publish now</label><button className="button button--primary" disabled={!classes.length} type="submit"><Megaphone size={15} /> Save announcement</button></form></details>;
}

function SubmissionRow({ submission, assignmentTitle, name, feedback, onSave }: { submission: Submission; assignmentTitle: string; name: string; feedback?: SubmissionFeedback; onSave: (score: number | null, feedback: string, visible: boolean) => void }) {
  const [score, setScore] = useState(feedback?.score?.toString() ?? "");
  const [comment, setComment] = useState(feedback?.feedback ?? "");
  const [visible, setVisible] = useState(feedback?.visible_to_student ?? false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    if (!submission.storage_path) return;
    void requireSchoolClient().storage.from("assignment-submissions").createSignedUrl(submission.storage_path, 300).then(({ data, error: urlError }) => {
      if (urlError) setLoadError(urlError.message);
      else setFileUrl(data.signedUrl);
    });
  }, [submission.storage_path]);
  return <tr><td>{name}</td><td>{assignmentTitle}</td><td>{formatDate(submission.submitted_at)}</td><td>{submission.submission_text && <span>{submission.submission_text}</span>}{fileUrl && <a className="portal-inline-link" href={fileUrl} rel="noreferrer" target="_blank"><Download size={14} /> File</a>}{loadError && <span className="portal-error-inline">{loadError}</span>}</td><td><form className="portal-grade-form" onSubmit={(event) => { event.preventDefault(); onSave(score ? Number(score) : null, comment, visible); }}><input aria-label="Score" min="0" onChange={(event) => setScore(event.target.value)} placeholder="Score" step="0.01" type="number" value={score} /><input aria-label="Feedback" onChange={(event) => setComment(event.target.value)} placeholder="Feedback" value={comment} /><label><input checked={visible} onChange={(event) => setVisible(event.target.checked)} type="checkbox" /> Release</label><button aria-label={`Save grade for ${name}`} className="button button--secondary" type="submit"><Check size={15} /> Save</button></form></td></tr>;
}
