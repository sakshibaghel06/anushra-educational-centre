import { ArrowLeft, ArrowUpRight, Check, Circle, Download, PlayCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import type { Course, Lesson, LessonMaterial, LessonProgress } from "../../lib/database.types";
import { PortalCard, PortalEmpty, PortalError, PortalLoading, PortalPage, PortalSuccess } from "../portals/PortalComponents";
import { requireSchoolClient, safeExternalUrl } from "../portals/portalUtils";

type MaterialLink = { material: LessonMaterial; url: string };

export default function StudentCoursePage() {
  const { courseId = "" } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<MaterialLink[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !courseId) return;
    setLoading(true);
    setError(null);
    try {
      const client = requireSchoolClient();
      const { data: courseData, error: courseError } = await client.from("courses").select("*").eq("id", courseId).single();
      if (courseError) throw courseError;
      const { data: lessonData, error: lessonError } = await client.from("lessons").select("*").eq("course_id", courseId).eq("is_published", true).order("position");
      if (lessonError) throw lessonError;
      const lessonIds = lessonData.map(({ id }) => id);
      const [{ data: progressData, error: progressError }, materialResult] = await Promise.all([
        client.from("lesson_progress").select("*").eq("student_id", user.id),
        lessonIds.length
          ? client.from("lesson_materials").select("*").in("lesson_id", lessonIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (progressError) throw progressError;
      if (materialResult.error) throw materialResult.error;
      const signedMaterials: MaterialLink[] = await Promise.all(materialResult.data.map(async (material) => {
        const { data, error: signedError } = await client.storage.from("learning-materials").createSignedUrl(material.storage_path, 300);
        if (signedError) throw signedError;
        return { material, url: data.signedUrl };
      }));
      setCourse(courseData);
      setLessons(lessonData);
      setProgress(progressData.filter(({ lesson_id }) => lessonIds.includes(lesson_id)));
      setMaterials(signedMaterials);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this course.");
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => { void load(); }, [load]);

  async function toggleCompletion(lessonId: string) {
    if (!user) return;
    setError(null);
    setSuccess(null);
    const alreadyDone = progress.some((item) => item.lesson_id === lessonId);
    try {
      const client = requireSchoolClient();
      const result = alreadyDone
        ? await client.from("lesson_progress").delete().eq("student_id", user.id).eq("lesson_id", lessonId)
        : await client.from("lesson_progress").insert({ student_id: user.id, lesson_id: lessonId });
      if (result.error) throw result.error;
      setSuccess(alreadyDone ? "Lesson completion removed." : "Lesson marked complete.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update lesson progress.");
    }
  }

  if (loading) return <PortalLoading />;
  if (!course) return <PortalPage role="Student" title="Course unavailable" description="This course could not be loaded."><PortalError message={error ?? "The course may be unpublished or you may not be enrolled."} /><Link className="button button--secondary" to="/student/dashboard"><ArrowLeft size={16} /> Back to courses</Link></PortalPage>;

  return (
    <PortalPage role="Student" title={course.title} description={course.description ?? "Lessons and learning materials available to your enrolled account."}>
      <Link className="portal-back-link" to="/student/dashboard"><ArrowLeft size={16} /> Back to dashboard</Link>
      {error && <PortalError message={error} retry={() => void load()} />}
      {success && <PortalSuccess>{success}</PortalSuccess>}
      <PortalCard title="Course lessons" subtitle={`${progress.length} of ${lessons.length} lessons completed`}>
        {lessons.length === 0 ? <PortalEmpty title="No lessons published">Your teacher has not published lessons for this course yet.</PortalEmpty> : (
          <div className="portal-lesson-list">
            {lessons.map((lesson, index) => {
              const isComplete = progress.some(({ lesson_id }) => lesson_id === lesson.id);
              const videoUrl = safeExternalUrl(lesson.video_url);
              const lessonMaterials = materials.filter(({ material }) => material.lesson_id === lesson.id);
              return (
                <article className="portal-lesson" key={lesson.id}>
                  <div className="portal-lesson__number">{String(index + 1).padStart(2, "0")}</div>
                  <div className="portal-lesson__body">
                    <h3>{lesson.title}</h3>
                    {lesson.description && <p>{lesson.description}</p>}
                    <div className="portal-lesson__actions">
                      {videoUrl && <a className="portal-inline-link" href={videoUrl} rel="noreferrer" target="_blank"><PlayCircle size={16} /> Open lesson video <ArrowUpRight size={14} /></a>}
                      {lessonMaterials.map(({ material, url }) => <a className="portal-inline-link" href={url} key={material.id} rel="noreferrer" target="_blank"><Download size={15} /> {material.display_name}</a>)}
                    </div>
                  </div>
                  <button
                    aria-label={`${isComplete ? "Mark incomplete" : "Mark complete"}: ${lesson.title}`}
                    className={isComplete ? "portal-completion is-complete" : "portal-completion"}
                    onClick={() => void toggleCompletion(lesson.id)}
                    type="button"
                  >
                    {isComplete ? <Check size={17} /> : <Circle size={17} />}
                    <span>{isComplete ? "Completed" : "Mark complete"}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </PortalCard>
    </PortalPage>
  );
}
