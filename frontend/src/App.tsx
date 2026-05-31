import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore, proactiveRefresh } from './context/authStore'
import SessionExpiredModal from './components/common/SessionExpiredModal'
import api from './services/api'

// Layout components
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import InviteUserPage from './pages/admin/InviteUserPage'
import ManageUsersPage from './pages/admin/ManageUsersPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

// Instructor pages
import InstructorDashboard from './pages/instructor/InstructorDashboard'
import CoursesPage from './pages/instructor/CoursesPage'
import CourseManagementPage from './pages/instructor/CourseManagementPage'
import StudentsPage from './pages/instructor/StudentsPage'
import StudentDetailPage from './pages/instructor/StudentDetailPage'
import InstructorCalendarPage from './pages/instructor/InstructorCalendarPage'
import InstructorSettingsPage from './pages/instructor/InstructorSettingsPage'
import InstructorAIAssistantPage from './pages/instructor/InstructorAIAssistantPage'
import InstructorAnalyticsPage from './pages/instructor/InstructorAnalyticsPage'

// Chat page
import ChatPage from './pages/chat/ChatPage'

// Student pages
import StudentDashboard from './pages/student/StudentDashboard'
import CalendarPage from './pages/student/CalendarPage'
import GradesPage from './pages/student/GradesPage'
import AIAssistantPage from './pages/student/AIAssistantPage'
import PaymentsPage from './pages/student/PaymentsPage'
import DeadlinesPage from './pages/student/DeadlinesPage'
import StudentSettingsPage from './pages/student/SettingsPage'

function App() {
  const { isAuthenticated, user, checkAuth, isCheckingAuth, sessionExpired, markSessionExpired } = useAuthStore()

  // Check authentication status on app mount only once
  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for session:expired event dispatched by api.ts interceptor
  useEffect(() => {
    const handler = () => markSessionExpired()
    window.addEventListener('session:expired', handler)
    return () => window.removeEventListener('session:expired', handler)
  }, [markSessionExpired])

  // Proactive token refresh on user activity
  useEffect(() => {
    if (!isAuthenticated) return
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handler = () => proactiveRefresh()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handler))
  }, [isAuthenticated])

  // Refresh token when user returns to the tab after being away
  // (setInterval is throttled in background, so token may expire unnoticed)
  useEffect(() => {
    if (!isAuthenticated) return
    const handler = () => {
      if (document.visibilityState === 'visible') {
        proactiveRefresh(true) // force — bypass debounce on tab return
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [isAuthenticated])

  // Poll /auth/me every 60 s — if the account is deactivated the 401 will trigger
  // a refresh attempt, refresh will fail, and session:expired will be dispatched.
  useEffect(() => {
    if (!isAuthenticated) return
    const id = setInterval(() => {
      api.get('/auth/me').catch(() => {})
    }, 60_000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  // Show loading spinner only during initial auth check
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    // If authenticated but user data not yet loaded, show loading
    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
        </div>
      )
    }

    // Check role-based access
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to={getDashboardRoute()} replace />
    }

    return <>{children}</>
  }

  const getDashboardRoute = () => {
    if (!user) return '/admin' // Default fallback

    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return '/admin'
      case 'INSTRUCTOR':
        return '/instructor'
      case 'STUDENT':
        return '/student'
      default:
        return '/admin'
    }
  }

  return (
    <Router>
      {sessionExpired && <SessionExpiredModalWrapper />}
      <Routes>
        {/* Public routes - always light theme */}
        <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />

        {/* Protected routes with layout */}
        <Route element={<MainLayout />}>
          {/* Redirect root to appropriate dashboard */}
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : !user ? (
                // Still loading user data
                <div className="flex h-screen items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                </div>
              ) : (
                <Navigate to={getDashboardRoute()} replace />
              )
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/invite"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <InviteUserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <ManageUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminPaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Instructor routes */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/students"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <StudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <CourseManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/students/:studentId"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <StudentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/students/by-user/:userId"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <StudentDetailPage byUserId />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/calendar"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/settings"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorAIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/analytics"
            element={
              <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                <InstructorAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/calendar"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <GradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/deadlines"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DeadlinesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/payments"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/settings"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Chat — accessible to all authenticated users */}
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

function SessionExpiredModalWrapper() {
  const { clearSessionExpired } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = () => {
    clearSessionExpired()
    navigate('/login', { replace: true })
  }

  return <SessionExpiredModal onLogin={handleLogin} />
}

export default App
