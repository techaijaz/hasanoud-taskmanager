import { useAuth } from '@/context/AuthContext'

export function usePermissions() {
  const { user } = useAuth()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin'
  const permissions = user?.permissions || {}
  const canManageUsersFlag = user?.canManageUsers === true

  const can = (moduleKey, action = 'canView') => {
    if (isAdmin) return true
    if (moduleKey === 'users' && canManageUsersFlag) return true
    return !!permissions?.[moduleKey]?.[action]
  }

  return {
    role,
    isAdmin,
    permissions,
    can,
    canManageUsers: isAdmin || canManageUsersFlag || can('users', 'canView'),
    canManageRbac: isAdmin || can('rbac', 'canView'),
    canManageLocations: isAdmin || can('locations', 'canView'),
    canManageHolidays: isAdmin || can('holidays', 'canView'),
    canSeeNotifications: isAdmin || can('notifications', 'canView'),
    canSeeTaskList: isAdmin || can('taskList', 'canView'),
    canSeeTaskBoard: isAdmin || can('taskBoard', 'canView'),
    canSeeReports: isAdmin || can('reports', 'canView')
  }
}
