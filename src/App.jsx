import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingScreen from "./components/LoadingScreen";
import { useAuth } from "./context/AuthContext";
import AdminLayout from "./components/layout/AdminLayout";
import StudentLayout from "./components/layout/StudentLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminStudentAdd from "./pages/admin/StudentAdd";
import AdminStudentEdit from "./pages/admin/StudentEdit";
import AdminStudentView from "./pages/admin/StudentView";
import AdminAttendance from "./pages/admin/Attendance";
import AdminAttendanceHistory from "./pages/admin/AttendanceHistory";
import AdminReports from "./pages/admin/Reports";

import StudentDashboard from "./pages/student/Dashboard";
import StudentProfile from "./pages/student/Profile";
import StudentAttendance from "./pages/student/Attendance";
import StudentAttendanceCalendar from "./pages/student/AttendanceCalendar";
import StudentReports from "./pages/student/Reports";
import StudentSettings from "./pages/student/Settings";

const App = () => {
  const { loading, role, roleHome } = useAuth();

  if (loading) {
    return <LoadingScreen label="Preparing your dashboard..." />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          role === "unknown" ? (
            <Navigate to="/unauthorized" replace />
          ) : role ? (
            <Navigate to={roleHome} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/add" element={<AdminStudentAdd />} />
          <Route path="students/edit/:id" element={<AdminStudentEdit />} />
          <Route path="students/:id" element={<AdminStudentView />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="attendance/history" element={<AdminAttendanceHistory />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["student"]} />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="attendance/calendar" element={<StudentAttendanceCalendar />} />
          <Route path="reports" element={<StudentReports />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
