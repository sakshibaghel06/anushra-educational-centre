import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import type { Quiz, QuizAttempt } from "../../lib/database.types";
import { PortalCard, PortalError, PortalLoading, PortalPage, PortalSuccess, formatDate } from "../portals/PortalComponents";
import { requireSchoolClient } from "../portals/portalUtils";

type PublicQuestion = {
  id: string;
  prompt: string;
  options: string[];
  position: number;
  points: number;
};

type AttemptPackage = { attempt_id: string; questions: PublicQuestion[] };

export default function StudentQuizPage() {
  const { quizId = "" } = useParams();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<AttemptPackage | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !quizId) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const [{ data: quizData, error: quizError }, { data: attemptData, error: attemptError }] = await Promise.all([
        client.from("quizzes").select("*").eq("id", quizId).single(),
        client.from("quiz_attempts").select("*").eq("quiz_id", quizId).eq("student_id", user.id).order("started_at", { ascending: false }),
      ]);
      if (quizError) throw quizError;
      if (attemptError) throw attemptError;
      setQuiz(quizData);
      setHistory(attemptData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this test.");
    } finally {
      setLoading(false);
    }
  }, [quizId, user]);

  useEffect(() => { void load(); }, [load]);

  async function beginAttempt() {
    setStarting(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { data, error: attemptError } = await client.rpc("start_quiz_attempt", { _quiz_id: quizId });
      if (attemptError) throw attemptError;
      const result = data as AttemptPackage;
      setActiveAttempt(result);
      setAnswers({});
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start the test.");
    } finally {
      setStarting(false);
    }
  }

  async function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAttempt) return;
    if (activeAttempt.questions.some(({ id }) => answers[id] === undefined)) {
      setError("Answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { error: submitError } = await client.rpc("submit_quiz_attempt", {
        _attempt_id: activeAttempt.attempt_id,
        _answers: Object.entries(answers).map(([question_id, selected_option]) => ({ question_id, selected_option })),
      });
      if (submitError) throw submitError;
      setActiveAttempt(null);
      setSuccess("Your answers were submitted. Results will be visible when your teacher releases them.");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit the test.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PortalLoading />;
  if (!quiz) return <PortalPage role="Student" title="Test unavailable" description="This test could not be loaded."><PortalError message={error ?? "The test may not be published or accessible."} /></PortalPage>;
  return (
    <PortalPage role="Student" title={quiz.title} description={quiz.instructions ?? `Due ${formatDate(quiz.due_at)}`}>
      <Link className="portal-back-link" to="/student/dashboard">← Back to dashboard</Link>
      {error && <PortalError message={error} />}
      {success && <PortalSuccess>{success}</PortalSuccess>}
      {!activeAttempt ? (
        <div className="portal-grid">
          <PortalCard title="Test details">
            <div className="portal-test-meta">
              <p><Clock3 size={16} /> {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} minute time limit` : "No time limit configured"}</p>
              <p>Maximum {quiz.max_attempts} attempt{quiz.max_attempts === 1 ? "" : "s"} configured. The database enforces the limit.</p>
              <p>Deadline: {formatDate(quiz.due_at)}</p>
            </div>
            <button className="button button--primary" disabled={starting} onClick={() => void beginAttempt()} type="button">
              {starting ? "Preparing test…" : history.length ? "Start another attempt" : "Start test"}
            </button>
            <p className="portal-muted"><AlertTriangle size={15} /> The database checks remaining attempts when a test begins.</p>
          </PortalCard>
          <PortalCard title="Attempt history" subtitle="Scores appear only after teacher-controlled release">
            {history.length === 0 ? <p className="portal-muted">No attempts submitted yet.</p> : (
              <div className="portal-list">{history.filter(({ submitted_at }) => submitted_at).map((attempt) => (
                <div className="portal-list__row" key={attempt.id}>
                  <span className="portal-list__icon"><CheckCircle2 size={17} /></span>
                  <span className="portal-list__main"><strong>Submitted {formatDate(attempt.submitted_at)}</strong><small>{quiz.results_visible_to_students ? `Score: ${attempt.score ?? "—"} / ${attempt.maximum_score ?? "—"}` : "Results not released"}</small></span>
                </div>
              ))}</div>
            )}
          </PortalCard>
        </div>
      ) : (
        <PortalCard title="Your test" subtitle="Correct answers are checked securely by the database when you submit.">
          <form className="portal-quiz-form" onSubmit={(event) => void submitAttempt(event)}>
            {activeAttempt.questions.map((question, index) => (
              <fieldset className="portal-question" key={question.id}>
                <legend>{index + 1}. {question.prompt} <small>{question.points} point{question.points === 1 ? "" : "s"}</small></legend>
                {question.options.map((option, optionIndex) => (
                  <label className="portal-radio-option" key={optionIndex}>
                    <input
                      checked={answers[question.id] === optionIndex}
                      name={`question-${question.id}`}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                      type="radio"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Submitting…" : "Submit test"}</button>
          </form>
        </PortalCard>
      )}
    </PortalPage>
  );
}
