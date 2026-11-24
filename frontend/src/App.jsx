import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import { SchoolProvider } from './context/SchoolContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import HomePage from './pages/public/HomePage.jsx';
import AboutPage from './pages/public/AboutPage.jsx';
import AcademicsPage from './pages/public/AcademicsPage.jsx';
import AdmissionsPage from './pages/public/AdmissionsPage.jsx';
import StudentLifePage from './pages/public/StudentLifePage.jsx';
import NewsPage from './pages/public/NewsPage.jsx';
import NewsDetailPage from './pages/public/NewsDetailPage.jsx';
import EventsPage from './pages/public/EventsPage.jsx';
import GalleryPage from './pages/public/GalleryPage.jsx';
import StaffPage from './pages/public/StaffPage.jsx';
import ContactPage from './pages/public/ContactPage.jsx';
import PrivacyNoticePage from './pages/public/PrivacyNoticePage.jsx';
import NotFoundPage from './pages/public/NotFoundPage.jsx';

import ApplyPage from './admissions/ApplyPage.jsx';
import TrackApplicationPage from './admissions/TrackApplicationPage.jsx';

import AdminLoginPage from './admin/AdminLoginPage.jsx';
import AdminDashboardPage from './admin/AdminDashboardPage.jsx';
import AdminAdmissionsPage from './admin/AdminAdmissionsPage.jsx';
import AdminContentPage from './admin/AdminContentPage.jsx';
import AdminUsersPage from './admin/AdminUsersPage.jsx';

function ProtectedAdminRoute({ children, requiredPermission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] text-sm text-slate-600">
        Verifying administrator session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProvider>
      <SchoolProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Website */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/academics" element={<AcademicsPage />} />
                <Route path="/admissions" element={<AdmissionsPage />} />
                <Route path="/admissions/apply" element={<ApplyPage />} />
                <Route path="/admissions/track" element={<TrackApplicationPage />} />
                <Route path="/student-life" element={<StudentLifePage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/news/:slug" element={<NewsDetailPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyNoticePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Administrator Login */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Protected Administrator Dashboard */}
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <AdminLayout />
                  </ProtectedAdminRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route
                  path="admissions"
                  element={
                    <ProtectedAdminRoute requiredPermission="admissions:read">
                      <AdminAdmissionsPage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="content"
                  element={
                    <ProtectedAdminRoute requiredPermission="content:write">
                      <AdminContentPage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedAdminRoute requiredPermission="users:manage">
                      <AdminUsersPage />
                    </ProtectedAdminRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </SchoolProvider>
    </ToastProvider>
  );
}
