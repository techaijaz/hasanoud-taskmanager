import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import GuestRoute from '@/components/GuestRoute'
import AppShell from '@/components/AppShell'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import TaskListPage from '@/pages/TaskListPage'
import ReportsPage from '@/pages/ReportsPage'
import TaskBoardPage from '@/pages/TaskBoardPage'
import SettingsLayout from '@/pages/settings/SettingsLayout'
import ProfilePage from '@/pages/settings/ProfilePage'
import UsersPage from '@/pages/settings/UsersPage'
import PermissionsPage from '@/pages/settings/PermissionsPage'
import LocationsPage from '@/pages/settings/LocationsPage'
import HolidaysPage from '@/pages/settings/HolidaysPage'
import NotificationsPage from '@/pages/settings/NotificationsPage'

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} position="top-right" />
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <ThemedToaster />
          <Routes>
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <GuestRoute>
                <ResetPasswordPage />
              </GuestRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/board" element={<TaskBoardPage />} />
            <Route path="/list" element={<TaskListPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="permissions" element={<PermissionsPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="holidays" element={<HolidaysPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/board" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/board" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
