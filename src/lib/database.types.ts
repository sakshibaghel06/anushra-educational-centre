export type AppRole = "student" | "teacher" | "admin";
export type EnquiryStatus = "new" | "contacted" | "in_review" | "closed";
export type FeeStatus = "pending" | "paid" | "waived";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  user_id: string;
  role: AppRole;
  created_at: string;
  created_by: string | null;
};
export type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: AppRole[];
};

export type SchoolClass = {
  id: string;
  name: string;
  section: string | null;
  academic_year: string;
  is_active: boolean;
  created_at: string;
};

export type Subject = { id: string; name: string; description: string | null; created_at: string };
export type Course = {
  id: string;
  class_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
export type Enrollment = { student_id: string; class_id: string; enrolled_at: string };
export type TeacherClassAssignment = { teacher_id: string; class_id: string; assigned_at: string };
export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  position: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type LessonMaterial = {
  id: string;
  lesson_id: string;
  storage_path: string;
  display_name: string;
  content_type: string | null;
  created_by: string;
  created_at: string;
};
export type LessonProgress = { student_id: string; lesson_id: string; completed_at: string };
export type Assignment = {
  id: string;
  course_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  allow_resubmission: boolean;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  storage_path: string | null;
  submitted_at: string;
  updated_at: string;
};
export type SubmissionFeedback = {
  submission_id: string;
  score: number | null;
  feedback: string | null;
  visible_to_student: boolean;
  graded_by: string;
  graded_at: string;
};
export type Quiz = {
  id: string;
  course_id: string;
  title: string;
  instructions: string | null;
  due_at: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  results_visible_to_students: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type QuizQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  correct_option: number;
  position: number;
  points: number;
};
export type QuizAttempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  maximum_score: number | null;
  answers: unknown;
};
export type Announcement = {
  id: string;
  class_id: string | null;
  title: string;
  body: string;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
export type AdmissionEnquiry = {
  id: string;
  parent_name: string;
  email: string;
  phone: string | null;
  student_name: string | null;
  programme_interest: string | null;
  message: string;
  status: EnquiryStatus;
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
};
export type FeeRecord = {
  id: string;
  student_id: string;
  label: string;
  amount: number;
  currency: string;
  due_at: string | null;
  status: FeeStatus;
  created_at: string;
  updated_at: string;
};
export type FeeTransaction = {
  id: string;
  fee_record_id: string;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};
export type SchoolContent = {
  content_key: string;
  content: Json;
  is_published: boolean;
  updated_by: string | null;
  updated_at: string;
};
export type TimetableEntry = {
  id: string;
  class_id: string;
  course_id: string;
  teacher_id: string;
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  effective_from: string;
  effective_until: string | null;
  location: string | null;
  created_by: string;
  created_at: string;
};
export type AttendanceSession = {
  id: string;
  class_id: string;
  timetable_entry_id: string | null;
  attendance_date: string;
  session_label: string;
  created_by: string;
  created_at: string;
};
export type AttendanceRecord = {
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_by: string;
  marked_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile, Pick<Profile, "user_id"> & Partial<Pick<Profile, "display_name" | "avatar_path">>>;
      user_roles: TableShape<UserRole, Pick<UserRole, "user_id" | "role"> & Partial<Pick<UserRole, "created_by">>>;
      classes: TableShape<SchoolClass, Pick<SchoolClass, "name" | "academic_year"> & Partial<Pick<SchoolClass, "section" | "is_active">>>;
      teacher_class_assignments: TableShape<TeacherClassAssignment, Pick<TeacherClassAssignment, "teacher_id" | "class_id">>;
      courses: TableShape<Course, Pick<Course, "class_id" | "title"> & Partial<Pick<Course, "subject_id" | "description" | "is_published">>>;
      enrollments: TableShape<Enrollment, Pick<Enrollment, "student_id" | "class_id">>;
      subjects: TableShape<Subject, Pick<Subject, "name"> & Partial<Pick<Subject, "description">>>;
      lessons: TableShape<Lesson, Pick<Lesson, "course_id" | "title" | "created_by"> & Partial<Pick<Lesson, "description" | "video_url" | "position" | "is_published">>>;
      lesson_materials: TableShape<LessonMaterial, Pick<LessonMaterial, "lesson_id" | "storage_path" | "display_name" | "created_by"> & Partial<Pick<LessonMaterial, "content_type">>>;
      lesson_progress: TableShape<LessonProgress, Pick<LessonProgress, "student_id" | "lesson_id">>;
      assignments: TableShape<Assignment, Pick<Assignment, "course_id" | "title" | "instructions" | "created_by"> & Partial<Pick<Assignment, "due_at" | "allow_resubmission" | "is_published">>>;
      submissions: TableShape<Submission, Pick<Submission, "assignment_id" | "student_id"> & Partial<Pick<Submission, "submission_text" | "storage_path">>>;
      submission_feedback: TableShape<SubmissionFeedback, Pick<SubmissionFeedback, "submission_id" | "graded_by"> & Partial<Pick<SubmissionFeedback, "score" | "feedback" | "visible_to_student">>>;
      quizzes: TableShape<Quiz, Pick<Quiz, "course_id" | "title" | "created_by"> & Partial<Pick<Quiz, "instructions" | "due_at" | "time_limit_minutes" | "max_attempts" | "is_published" | "results_visible_to_students">>>;
      quiz_questions: TableShape<QuizQuestion, Pick<QuizQuestion, "quiz_id" | "prompt" | "options" | "correct_option"> & Partial<Pick<QuizQuestion, "position" | "points">>>;
      quiz_attempts: TableShape<QuizAttempt, Pick<QuizAttempt, "quiz_id" | "student_id"> & Partial<Pick<QuizAttempt, "answers" | "submitted_at" | "score" | "maximum_score">>>;
      announcements: TableShape<Announcement, Pick<Announcement, "title" | "body" | "created_by"> & Partial<Pick<Announcement, "class_id" | "published_at">>>;
      admissions_enquiries: TableShape<AdmissionEnquiry, Pick<AdmissionEnquiry, "parent_name" | "email" | "message"> & Partial<Pick<AdmissionEnquiry, "phone" | "student_name" | "programme_interest" | "status" | "follow_up_notes">>>;
      fee_records: TableShape<FeeRecord, Pick<FeeRecord, "student_id" | "label" | "amount" | "currency"> & Partial<Pick<FeeRecord, "due_at" | "status">>>;
      fee_transactions: TableShape<FeeTransaction, Pick<FeeTransaction, "fee_record_id" | "provider" | "amount" | "currency" | "status"> & Partial<Pick<FeeTransaction, "provider_reference" | "verified_at">>>;
      school_content: TableShape<SchoolContent, Pick<SchoolContent, "content_key" | "content"> & Partial<Pick<SchoolContent, "is_published" | "updated_by">>>;
      timetable_entries: TableShape<TimetableEntry, Pick<TimetableEntry, "class_id" | "course_id" | "teacher_id" | "day_of_week" | "starts_at" | "ends_at" | "created_by"> & Partial<Pick<TimetableEntry, "effective_from" | "effective_until" | "location">>>;
      attendance_sessions: TableShape<AttendanceSession, Pick<AttendanceSession, "class_id" | "attendance_date" | "session_label" | "created_by"> & Partial<Pick<AttendanceSession, "timetable_entry_id">>>;
      attendance_records: TableShape<AttendanceRecord, Pick<AttendanceRecord, "session_id" | "student_id" | "status">>;
    };
    Views: Record<string, never>;
    Functions: {
      submit_public_enquiry: {
        Args: {
          _parent_name: string;
          _email: string;
          _message: string;
          _phone: string | null;
          _student_name: string | null;
          _programme_interest: string | null;
          _website: string | null;
        };
        Returns: undefined;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: AdminUser[];
      };
      start_quiz_attempt: {
        Args: { _quiz_id: string };
        Returns: { attempt_id: string; questions: Array<Omit<QuizQuestion, "quiz_id" | "correct_option">> };
      };
      submit_quiz_attempt: {
        Args: { _attempt_id: string; _answers: Array<{ question_id: string; selected_option: number }> };
        Returns: { submitted: boolean };
      };
    };
    Enums: {
      app_role: AppRole;
      enquiry_status: EnquiryStatus;
      fee_status: FeeStatus;
      attendance_status: AttendanceStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
