import { NavLink, Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

export default function SettingsLayout() {
  const { canManageUsers, canManageRbac, canManageLocations, canManageHolidays } = usePermissions()

  const links = [
    { to: '/settings/profile', label: 'Profile', show: true },
    { to: '/settings/users', label: 'User manage', show: canManageUsers },
    { to: '/settings/permissions', label: 'Permission', show: canManageRbac },
    { to: '/settings/locations', label: 'Locations', show: canManageLocations },
    { to: '/settings/holidays', label: 'Holiday', show: canManageHolidays },
    { to: '/settings/notifications', label: 'Notification', show: true }
  ].filter((item) => item.show)

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="flex gap-2 overflow-x-auto md:flex-col">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm whitespace-nowrap',
                isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-accent'
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </aside>
      <Outlet />
    </div>
  )
}
