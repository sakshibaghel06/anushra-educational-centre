import { ArrowRight, BookOpen, ClipboardCheck, Clock3, FileText, Megaphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import type {
  Announcement,
  AttendanceRecord,
  AttendanceSession,
  Assignment,
  Course,
  Enrollment,
  FeeRecord,
  Lesson,
  LessonProgress,
  Quiz,
  Submission,
  SubmissionFeedback,
  TimetableEntry,
} from "../../lib/database.types";
import { PortalCard, PortalEmpty, PortalError, PortalLoading, PortalNotice, PortalPage, formatDate } from "../portals/PortalComponents";
import { requireSchoolClient } from "../portals/portalUtils";

type DashboardData = {
  enrollments: Enrollment[];
  courses: Course[];
  lessons: Lesson[];
  assignments: Assignment[];
  submissions: Submission[];
  feedback: SubmissionFeedback[];
  quizzes: Quiz[];
  announcements: Announcement[];
  progress: LessonProgress[];
  fees: FeeRecord[];
  timetable: TimetableEntry[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
};

const emptyData: DashboardData = {
  enrollments: [], courses: [], lessons: [], assignments: [], submissions: [],
  feedback: [], quizzes: [], announcements: [], progress: [], fees: [],
  timetable: [], attendanceSessions: [], attendanceRecords: [],
};

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { data: enrollments, error: enrollmentError } = await client
        .from("enrollments").select("*").eq("student_id", user.id);
      if (enrollmentError) throw enrollmentError;
      const classIds = enrollments.map(({ class_id }) => class_id);

      const [courseResult, announcementResult, feeResult, timetableResult, attendanceSessionResult] = classIds.length
        ? await Promise.all([
            client.from("courses").select("*").in("class_id", classIds).eq("is_published", true),
            client.from("announcements").select("*").or(`class_id.is.null,class_id.in.(${classIds.join(",")})`).not("published_at", "is", null).order("published_at", { ascending: false }).limit(8),
            client.from("fee_records").select("*").eq("student_id", user.id).order("due_at"),
            client.from("timetable_entries").select("*").in("class_id", classIds).order("day_of_week").order("starts_at"),
            client.from("attendance_sessions").select("*").in("class_id", classIds).order("attendance_date", { ascending: false }).limit(50),
          ])
        : await Promise.all([
            client.from("courses").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
            client.from("announcements").select("*").is("class_id", null).not("published_at", "is", null).order("published_at", { ascending: false }).limit(8),
            client.from("fee_records").select("*").eq("student_id", user.id).order("due_at"),
            client.from("timetable_entries").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
            client.from("attendance_sessions").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
          ]);
      if (courseResult.error) throw courseResult.error;
      if (announcementResult.error) throw announcementResult.error;
      if (feeResult.error) throw feeResult.error;
      if (timetableResult.error) throw timetableResult.error;
      if (attendanceSessionResult.error) throw attendanceSessionResult.error;
      const attendanceSessions = attendanceSessionResult.data ?? [];
      const attendanceRecordResult = attendanceSessions.length
        ? await client.from("attendance_records").select("*").eq("student_id", user.id).in("session_id", attendanceSessions.map(({ id }) => id))
        : { data: [], error: null };
      if (attendanceRecordResult.error) throw attendanceRecordResult.error;
      const courses = courseResult.data;
      const courseIds = courses.map(({ id }) => id);
      const [lessonResult, assignmentResult, quizResult, progressResult] = courseIds.length
        ? await Promise.all([
            client.from("lessons").select("*").in("course_id", courseIds).eq("is_published", true).order("position"),
            client.from("assignments").select("*").in("course_id", courseIds).eq("is_published", true).order("due_at"),
            client.from("quizzes").select("*").in("course_id", courseIds).eq("is_published", true).order("due_at"),
            client.from("lesson_progress").select("*").eq("student_id", user.id),
          ])
        : await Promise.all([
            client.from("lessons").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
            client.from("assignments").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
            client.from("quizzes").select("*").eq("id", "00000000-0000-0000-0000-000000000000"),
            client.from("lesson_progress").select("*").eq("student_id", user.id),
          ]);
      if (lessonResult.error) throw lessonResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      if (quizResult.error) throw quizResult.error;
      if (progressResult.error) throw progressResult.error;
      const assignmentIds = assignmentResult.data.map(({ id }) => id);
      const submissionResult = assignmentIds.length
        ? await client.from("submissions").select("*").eq("student_id", user.id).in("assignment_id", assignmentIds)
        : { data: [], error: null };
      if (submissionResult.error) throw submissionResult.error;
      const submissionIds = submissionResult.data.map(({ id }) => id);
      const feedbackResult = submissionIds.length
        ? await client.from("submission_feedback").select("*").in("submission_id", submissionIds)
        : { data: [], error: null };
      if (feedbackResult.error) throw feedbackResult.error;

      setData({
        enrollments, courses, lessons: lessonResult.data, assignments: assignmentResult.data,
        submissions: submissionResult.data, feedback: feedbackResult.data,
        quizzes: quizResult.data, announcements: announcementResult.data, progress: progressResult.data,
        fees: feeResult.data, timetable: timetableResult.data ?? [], attendanceSessions,
        attendanceRecords: attendanceRecordResult.data ?? [],
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load student records.");
    } finally {
      setLoading(false);
    }
  }, [refreshKey, user]);

  useEffect(() => { void load(); }, [load]);

  const progressPercent = useMemo(() => data.lessons.length
    ? Math.round((data.progress.filter((item) => data.lessons.some((lesson) => lesson.id === item.lesson_id)).length / data.lessons.length) * 100)
    : null, [data.lessons, data.progress]);
  const submittedIds = useMemo(() => new Set(data.submissions.map(({ assignment_id }) => assignment_id)), [data.submissions]);

  if (loading) return <PortalLoading />;
  return (
    <PortalPage
      description={`Your courses, learning activities and updates${data.enrollments.length ? " from your enrolled classes" : ""}.`}
      role="Student"
      title={`Welcome${profile?.display_name ? `, ${profile.display_name}` : ""}.`}
    >
      <PortalNotice>Showing records available to your signed-in account. Progress is calculated from stored lesson completions.</PortalNotice>
      {error && <PortalError message={error} retry={() => setRefreshKey((key) => key + 1)} />}
      {!error && data.enrollments.length === 0 && (
        <PortalEmpty title="No class enrolments found">
          Ask the school administrator to assign your account to a class. No sample courses are shown.
        </PortalEmpty>
      )}
      <div className="portal-metrics">
        <div><BookOpen /><span><strong>{data.courses.length}</strong><small>Enrolled courses</small></span></div>
        <div><ClipboardCheck /><span><strong>{data.assignments.length}</strong><small>Assignments</small></span></div>
        <div><Clock3 /><span><strong>{progressPercent === null ? "—" : `${progressPercent}%`}</strong><small>Lesson progress</small></span></div>
        <div><FileText /><span><strong>{data.quizzes.length}</strong><small>Published tests</small></span></div>
      </div>
      <div className="portal-grid">
        <PortalCard title="My courses" subtitle="Published courses in your enrolled classes">
          {data.courses.length === 0 ? <PortalEmpty title="Courses will appear here">Your assigned classes do not currently have published courses.</PortalEmpty> : (
            <div className="portal-list">
              {data.courses.map((course) => {
                const lessons = data.lessons.filter(({ course_id }) => course_id === course.id);
                const completed = lessons.filter(({ id }) => data.progress.some(({ lesson_id }) => lesson_id === id)).length;
                return (
                  <Link className="portal-list__row portal-course-row" key={course.id} to={`/student/courses/${course.id}`}>
                    <span className="portal-list__icon"><BookOpen size={18} /></span>
                    <span className="portal-list__main"><strong>{course.title}</strong><small>{lessons.length} lessons · {lessons.length ? Math.round(completed / lessons.length * 100) : 0}% complete</small></span>
                    <ArrowRight aria-hidden="true" size={17} />
                  </Link>
                );
              })}
            </div>
          )}
        </PortalCard>
        <PortalCard title="Upcoming work" subtitle="Published assignments and tests">
          {!data.assignments.length && !data.quizzes.length ? <PortalEmpty title="Nothing due yet">New assignments and tests will appear here when published.</PortalEmpty> : (
            <div className="portal-list">
              {data.assignments.map((item) => (
                <Link className="portal-list__row" key={item.id} to={`/student/assignments/${item.id}`}>
                  <span className={`portal-badge ${submittedIds.has(item.id) ? "portal-badge--done" : ""}`}>{submittedIds.has(item.id) ? "Submitted" : "Assignment"}</span>
                  <span className="portal-list__main"><strong>{item.title}</strong><small>Due {formatDate(item.due_at)}</small></span>
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              ))}
              {data.quizzes.map((item) => (
                <Link className="portal-list__row" key={item.id} to={`/student/quizzes/${item.id}`}>
                  <span className="portal-badge portal-badge--test">Test</span>
                  <span className="portal-list__main"><strong>{item.title}</strong><small>Due {formatDate(item.due_at)}</small></span>
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              ))}
            </div>
          )}
        </PortalCard>
        <PortalCard title="Announcements" subtitle="Published notices for your classes">
          {data.announcements.length === 0 ? <PortalEmpty title="No announcements">Class announcements will show up here.</PortalEmpty> : (
            <div className="portal-list">
              {data.announcements.map((item: Announcement) => (
                <article className="portal-list__row" key={item.id}>
                  <span className="portal-list__icon"><Megaphone size={18} /></span>
                  <span className="portal-list__main"><strong>{item.title}</strong><small>{formatDate(item.published_at)}</small><span>{item.body}</span></span>
                </article>
              ))}
            </div>
          )}
        </PortalCard>
        <PortalCard title="My timetable" subtitle="Published schedule for your enrolled classes">
          {data.timetable.filter((entry) => entry.effective_from <= new Date().toISOString().slice(0, 10) && (!entry.effective_until || entry.effective_until >= new Date().toISOString().slice(0, 10))).length === 0
            ? <PortalEmpty title="No timetable available">The school has not published a current schedule for your classes.</PortalEmpty>
            : <div className="portal-list">{data.timetable.filter((entry) => entry.effective_from <= new Date().toISOString().slice(0, 10) && (!entry.effective_until || entry.effective_until >= new Date().toISOString().slice(0, 10))).map((entry) => <div className="portal-list__row" key={entry.id}><Clock3 size={18} /><span className="portal-list__main"><strong>{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][entry.day_of_week - 1]} · {entry.starts_at.slice(0, 5)}–{entry.ends_at.slice(0, 5)}</strong><small>{data.courses.find(({ id }) => id === entry.course_id)?.title ?? "Scheduled class"}{entry.location ? ` · ${entry.location}` : ""}</small></span></div>)}</div>}
        </PortalCard>
        <PortalCard title="My attendance" subtitle="Only attendance records for your signed-in account">
          {data.attendanceSessions.length === 0 ? <PortalEmpty title="No attendance records">Attendance will appear after a teacher records a class session.</PortalEmpty> : (
            <div className="portal-list">{data.attendanceSessions.map((session) => {
              const record = data.attendanceRecords.find(({ session_id }) => session_id === session.id);
              return <div className="portal-list__row" key={session.id}><ClipboardCheck size={18} /><span className="portal-list__main"><strong>{session.session_label}</strong><small>{formatDate(session.attendance_date)} · {record?.status ?? "Not marked"}</small></span></div>;
            })}</div>
          )}
        </PortalCard>
        <PortalCard title="Fees" subtitle="Fee records for your account">
          {data.fees.length === 0 ? <PortalEmpty title="No fee records">There are no fee records available for your account.</PortalEmpty> : (
            <div className="portal-list">
              {data.fees.map((fee) => (
                <div className="portal-list__row" key={fee.id}>
                  <span className="portal-list__main"><strong>{fee.label}</strong><small>Due {formatDate(fee.due_at)}</small></span>
                  <span className="portal-fee-amount">{fee.currency} {Number(fee.amount).toFixed(2)}<small>{fee.status}</small></span>
                </div>
              ))}
              <p className="portal-muted">Online payments are not connected.</p>
            </div>
          )}
        </PortalCard>
      </div>
      <PortalCard title="Recent submissions" subtitle="Your submitted work and any feedback released by your teacher">
        {data.submissions.length === 0 ? <PortalEmpty title="No submissions yet">Your assignment submissions will be listed here.</PortalEmpty> : (
          <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Assignment</th><th>Submitted</th><th>Mark</th><th>Feedback</th></tr></thead><tbody>
            {data.submissions.map((submission) => {
              const feedback = data.feedback.find(({ submission_id }) => submission_id === submission.id);
              const assignment = data.assignments.find(({ id }) => id === submission.assignment_id);
              return <tr key={submission.id}><td>{assignment?.title ?? "Assignment"}</td><td>{formatDate(submission.submitted_at)}</td><td>{feedback?.visible_to_student && feedback.score !== null ? feedback.score : "Not released"}</td><td>{feedback?.visible_to_student ? feedback.feedback || "No written feedback" : "Pending review"}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </PortalCard>
    </PortalPage>
  );
}
