import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import StudentLayout from './components/StudentLayout';
import AlumniLayout from './components/AlumniLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import LandingPage from './pages/LandingPage';

import FeedPage from './pages/feed/FeedPage';
import JobsPage from './pages/jobs/JobsPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import MentorshipPage from './pages/mentorship/MentorshipPage';
import MentorProfilePage from './pages/mentorship/MentorProfilePage';
import ProfilePage from './pages/profile/ProfilePage';
import MailPage from './pages/mail/MailPage';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import AlumniDashboard from './pages/dashboard/AlumniDashboard';
import AlumniRegisterPage from './pages/alumni/AlumniRegisterPage';

// Admin Imports
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPending from './pages/admin/AdminPending';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import AdminEvents from './pages/admin/AdminEvents';
import AdminAlumni from './pages/admin/AdminAlumni';
import AdminNotices from './pages/admin/AdminNotices';
import EventsPage from './pages/events/EventsPage';
import ApplicantKanban from './pages/jobs/ApplicantKanban';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { applyAppearance } from './services/appearance';
import API from './services/api';
import { fetchProfile } from './features/auth/authSlice';

import ScrollToTop from './components/ScrollToTop';

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Restore user profile on page reload if session token exists
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(fetchProfile());
    }

    // Initialise theme and accent color from local storage or public settings API
    const savedTheme = localStorage.getItem('theme');
    const savedColor = localStorage.getItem('primaryColor');
    applyAppearance(savedTheme, savedColor);

    API.get('/public/settings')
      .then(res => {
        if (res.data) {
          applyAppearance(res.data.theme, res.data.primary_color);
          if (res.data.site_name) {
            document.title = res.data.site_name;
          }
        }
      })
      .catch(() => {});
  }, [dispatch, user]);

  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Public Routes (Landing & Auth) */}
      <Route element={<Layout />}>
         <Route path="/" element={<LandingPage />} />
         <Route path="/explore" element={<LandingPage />} />
         <Route path="/login" element={<LoginPage />} />
         <Route path="/forgot-password" element={<ForgotPasswordPage />} />
         <Route path="/verify-email" element={<VerifyEmailPage />} />
         <Route path="/admin/login" element={<Navigate to="/login" replace />} />
         <Route path="/register" element={<RegisterPage />} />
         <Route path="/alumni/register" element={<AlumniRegisterPage />} />
      </Route>
        
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
         <Route index element={<Navigate to="/student/dashboard" replace />} />
         <Route path="dashboard" element={<StudentDashboard />} />
         <Route path="feed" element={<FeedPage />} />
         <Route path="events" element={<EventsPage />} />
         <Route path="jobs" element={<JobsPage />} />
         <Route path="jobs/:id" element={<JobDetailPage />} />
         <Route path="mentorship" element={<MentorshipPage />} />
         <Route path="mentorship/mentors/:id" element={<MentorProfilePage />} />
         <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Alumni Routes */}
      <Route path="/alumni" element={<ProtectedRoute allowedRoles={['alumni', 'faculty']}><AlumniLayout /></ProtectedRoute>}>
         <Route index element={<Navigate to="/alumni/dashboard" replace />} />
         <Route path="dashboard" element={<AlumniDashboard />} />
         <Route path="feed" element={<FeedPage />} />
         <Route path="events" element={<EventsPage />} />
         <Route path="jobs" element={<JobsPage />} />
         <Route path="jobs/applicants" element={<ApplicantKanban />} />
         <Route path="jobs/:id/applicants" element={<ApplicantKanban />} />
         <Route path="jobs/:id" element={<JobDetailPage />} />
         <Route path="mentorship" element={<MentorshipPage />} />
         <Route path="mentorship/mentors/:id" element={<MentorProfilePage />} />
         <Route path="mail" element={<MailPage />} />
         <Route path="profile" element={<ProfilePage />} />
      </Route>
        
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="pending" element={<AdminPending />} />
          <Route path="notices" element={<AdminNotices />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="alumni" element={<Navigate to="/admin/users" replace />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="feed" element={<FeedPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
  );
}

export default App;
