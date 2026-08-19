import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ClipboardList, LayoutGrid, Settings, BarChart3, LogOut, Bell, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { usePermissions } from '@/hooks/usePermissions'
import { notificationsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function AppShell() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, saving } = useTheme()
  const { canSeeTaskBoard, canSeeTaskList, canSeeReports } = usePermissions()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const tabs = [
    { to: '/board', label: 'Task Board', icon: LayoutGrid, show: canSeeTaskBoard },
    { to: '/list', label: 'Task List', icon: ClipboardList, show: canSeeTaskList },
    { to: '/settings', label: 'Setting', icon: Settings, show: true },
    { to: '/reports', label: 'Report', icon: BarChart3, show: canSeeReports }
  ].filter((tab) => tab.show)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      notificationsApi
        .unreadCount()
        .then((data) => {
          if (!cancelled) setUnreadCount(Number(data?.unreadCount) || 0)
        })
        .catch(() => {
          if (!cancelled) setUnreadCount(0)
        })
    }
    load()
    const timer = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operations</p>
            <h1 className="text-base font-semibold">Task Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={toggleTheme} disabled={saving} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <span className="relative inline-flex">
              <Button variant="ghost" size="sm" onClick={() => navigate('/settings/notifications')} aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              {unreadCount > 0 ? (
                <span className="absolute top-0 right-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </span>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[90rem] gap-1 overflow-x-auto px-2 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </NavLink>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-[90rem] flex-1 overflow-x-hidden px-4 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
