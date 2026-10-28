import { Download, FileUp, Send } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import type { Assignment, Submission, SubmissionFeedback } from "../../lib/database.types";
import { PortalCard, PortalError, PortalLoading, PortalPage, PortalSuccess, formatDate } from "../portals/PortalComponents";
import { requireSchoolClient } from "../portals/portalUtils";

export default function StudentAssignmentPage() {
  const { assignmentId = "" } = useParams();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { data: assignmentData, error: assignmentError } = await client.from("assignments").select("*").eq("id", assignmentId).single();
      if (assignmentError) throw assignmentError;
      const { data: submissionData, error: submissionError } = await client.from("submissions").select("*").eq("assignment_id", assignmentId).eq("student_id", user.id).maybeSingle();
      if (submissionError) throw submissionError;
      let feedbackData: SubmissionFeedback | null = null;
      let signedFileUrl: string | null = null;
      if (submissionData) {
        const [{ data: feedbackRow, error: feedbackError }, signedFile] = await Promise.all([
          client.from("submission_feedback").select("*").eq("submission_id", submissionData.id).maybeSingle(),
          submissionData.storage_path
            ? client.storage.from("assignment-submissions").createSignedUrl(submissionData.storage_path, 300)
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (feedbackError) throw feedbackError;
        if (signedFile.error) throw signedFile.error;
        feedbackData = feedbackRow;
        signedFileUrl = signedFile.data?.signedUrl ?? null;
      }
      setAssignment(assignmentData);
      setSubmission(submissionData);
      setText(submissionData?.submission_text ?? "");
      setFeedback(feedbackData);
      setFileUrl(signedFileUrl);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load assignment.");
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user]);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !assignment) return;
    if (!text.trim() && !file && !submission?.storage_path) {
      setError("Enter your response or choose a file before submitting.");
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError("The maximum file size is 10 MB.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const client = requireSchoolClient();
    let uploadedPath: string | null = null;
    try {
      if (file) {
        uploadedPath = `${assignment.id}/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await client.storage.from("assignment-submissions").upload(uploadedPath, file, { upsert: false });
        if (uploadError) throw uploadError;
      }
      const payload = {
        assignment_id: assignment.id,
        student_id: user.id,
        submission_text: text.trim() || null,
        storage_path: uploadedPath ?? submission?.storage_path ?? null,
      };
      const { error: saveError } = await client.from("submissions").upsert(payload, { onConflict: "assignment_id,student_id" });
      if (saveError) throw saveError;
      setSuccess("Your submission was saved.");
      setFile(null);
      await load();
    } catch (submitError) {
      if (uploadedPath) {
        const { error: cleanupError } = await client.storage.from("assignment-submissions").remove([uploadedPath]);
        if (cleanupError) setError(`Submission failed and uploaded file cleanup failed: ${submitError instanceof Error ? submitError.message : "Unknown error"}. Contact an administrator.`);
      }
      setError(submitError instanceof Error ? submitError.message : "Could not submit assignment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PortalLoading />;
  if (!assignment) return <PortalPage role="Student" title="Assignment unavailable" description="This assignment could not be loaded."><PortalError message={error ?? "The assignment may not be published or accessible."} /></PortalPage>;

  return (
    <PortalPage role="Student" title={assignment.title} description={`Due ${formatDate(assignment.due_at)}`}>
      <Link className="portal-back-link" to="/student/dashboard">← Back to dashboard</Link>
      {error && <PortalError message={error} />}
      {success && <PortalSuccess>{success}</PortalSuccess>}
      <div className="portal-grid">
        <PortalCard title="Instructions">
          <p className="portal-prose">{assignment.instructions}</p>
          <p className="portal-muted">Resubmissions {assignment.allow_resubmission ? "are allowed" : "are not enabled"}.</p>
        </PortalCard>
        <PortalCard title="Your submission" subtitle={submission ? `Submitted ${formatDate(submission.submitted_at)}` : "No work submitted yet"}>
          {submission && <div className="portal-submission-status"><span className="portal-badge portal-badge--done">Submitted</span>{feedback?.visible_to_student ? <span>Mark: {feedback.score ?? "—"}</span> : <span>Awaiting teacher review</span>}</div>}
          {feedback?.visible_to_student && <div className="portal-feedback"><strong>Teacher feedback</strong><p>{feedback.feedback || "No written feedback."}</p></div>}
          {fileUrl && <a className="portal-inline-link" href={fileUrl} rel="noreferrer" target="_blank"><Download size={15} /> View submitted file</a>}
          <form className="portal-form" onSubmit={(event) => void handleSubmit(event)}>
            <label>Written response<textarea onChange={(event) => setText(event.target.value)} placeholder="Write your response…" rows={5} value={text} /></label>
            <label className="portal-file-input"><FileUp size={18} /> Attach a file (up to 10 MB)<input accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>
            {file && <p className="portal-muted">Selected: {file.name}</p>}
            <button className="button button--primary" disabled={submitting || (Boolean(submission) && !assignment.allow_resubmission)} type="submit">
              <Send size={15} /> {submitting ? "Submitting…" : submission ? "Update submission" : "Submit work"}
            </button>
          </form>
        </PortalCard>
      </div>
    </PortalPage>
  );
}
