import { Route, Routes } from "react-router";
import { PortalRedirect } from "./auth/PortalRedirect";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { SiteLayout } from "./components/SiteLayout";
import AboutPage from "./features/public/AboutPage";
import AcademicsPage from "./features/public/AcademicsPage";
import AdmissionsPage from "./features/public/AdmissionsPage";
import ContactPage from "./features/public/ContactPage";
import FacultyPage from "./features/public/FacultyPage";
import GalleryPage from "./features/public/GalleryPage";
import HomePage from "./features/public/HomePage";
import LoginPage from "./features/public/LoginPage";
import NewsPage from "./features/public/NewsPage";
import NotFoundPage from "./features/public/NotFoundPage";
import ResetPasswordPage from "./features/public/ResetPasswordPage";
import StudentDashboard from "./features/student/StudentDashboard";
import StudentCoursePage from "./features/student/StudentCoursePage";
import StudentAssignmentPage from "./features/student/StudentAssignmentPage";
import StudentQuizPage from "./features/student/StudentQuizPage";
import TeacherDashboard from "./features/teacher/TeacherDashboard";
import AdminDashboard from "./features/admin/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="faculty" element={<FacultyPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="portal" element={<PortalRedirect />} />
        <Route
          path="student/dashboard"
          element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>}
        />
        <Route path="student/courses/:courseId" element={<ProtectedRoute allowedRoles={["student"]}><StudentCoursePage /></ProtectedRoute>} />
        <Route path="student/assignments/:assignmentId" element={<ProtectedRoute allowedRoles={["student"]}><StudentAssignmentPage /></ProtectedRoute>} />
        <Route path="student/quizzes/:quizId" element={<ProtectedRoute allowedRoles={["student"]}><StudentQuizPage /></ProtectedRoute>} />
        <Route
          path="teacher/dashboard"
          element={<ProtectedRoute allowedRoles={["teacher", "admin"]}><TeacherDashboard /></ProtectedRoute>}
        />
        <Route
          path="admin/dashboard"
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
