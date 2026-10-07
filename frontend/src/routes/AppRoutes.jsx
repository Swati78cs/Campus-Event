import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Public Pages
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import ProfilePage from '../pages/public/ProfilePage';
import ClubsPage from '../pages/public/ClubsPage';
import EventsDiscoveryPage from '../pages/public/EventsDiscoveryPage';
import PublicEventDetailPage from '../pages/public/PublicEventDetailPage';
import ForbiddenPage from '../pages/public/ForbiddenPage';
import NotFoundPage from '../pages/public/NotFoundPage';

// Role Dashboards & Feature Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import MyEventsPage from '../pages/student/MyEventsPage';
import RegistrationConfirmedPage from '../pages/student/RegistrationConfirmedPage';
import MyTicketsPage from '../pages/student/MyTicketsPage';
import TicketDetailsPage from '../pages/student/TicketDetailsPage';
import MyWaitlistPage from '../pages/student/MyWaitlistPage';
import VolunteerEventsPage from '../pages/volunteer/VolunteerEventsPage';
import OrganizerDashboard from '../pages/organizer/OrganizerDashboard';
import OrganizerClubPage from '../pages/organizer/OrganizerClubPage';
import OrganizerEventsPage from '../pages/organizer/OrganizerEventsPage';
import CreateEventPage from '../pages/organizer/CreateEventPage';
import EditEventPage from '../pages/organizer/EditEventPage';
import EventDetailPage from '../pages/organizer/EventDetailPage';
import EventAttendancePage from '../pages/attendance/EventAttendancePage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminEventsPage from '../pages/admin/AdminEventsPage';
import ClubsManagementPage from '../pages/admin/ClubsManagementPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import CertificatesPage from '../pages/student/CertificatesPage';
import CertificateVerificationPage from '../pages/public/CertificateVerificationPage';

export default function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/events" element={<EventsDiscoveryPage />} />
        <Route path="/events/:id" element={<PublicEventDetailPage />} />
        <Route path="/verify-certificate" element={<CertificateVerificationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        {/* Authenticated User Routes */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteer/events"
          element={
            <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
              <VolunteerEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/volunteers/my-events"
          element={
            <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
              <VolunteerEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:eventId/attendance"
          element={
            <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
              <EventAttendancePage />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/my-events"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/my-tickets"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyTicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/waitlist"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <MyWaitlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/tickets/:ticketId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <TicketDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/events/:id/confirmed"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <RegistrationConfirmedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />

        {/* Organizer Routes */}
        <Route
          path="/organizer"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/club"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <OrganizerClubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <OrganizerEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/new"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['organizer', 'admin']}>
              <EditEventPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/clubs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ClubsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EventDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EditEventPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-All 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  );
}
