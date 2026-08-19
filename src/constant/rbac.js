export const RBAC_MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'taskList', label: 'Task List' },
    { key: 'taskBoard', label: 'Task Board' },
    { key: 'holidays', label: 'Holiday Manager' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'reports', label: 'Reports' },
    { key: 'locations', label: 'Locations' },
    { key: 'users', label: 'User Management' },
    { key: 'rbac', label: 'Roles & Permissions' },
    { key: 'settings', label: 'Settings' }
]

export const RBAC_ROLES = ['admin', 'manager', 'user']

const all = { canView: true, canCreate: true, canEdit: true, canDelete: true }
const viewOnly = { canView: true, canCreate: false, canEdit: false, canDelete: false }
const none = { canView: false, canCreate: false, canEdit: false, canDelete: false }
const manageNoDelete = { canView: true, canCreate: true, canEdit: true, canDelete: false }
const boardUser = { canView: true, canCreate: true, canEdit: true, canDelete: false }

export const DEFAULT_ROLE_PERMISSIONS = {
    admin: Object.fromEntries(RBAC_MODULES.map((m) => [m.key, { ...all }])),
    manager: {
        dashboard: { ...viewOnly },
        taskList: { ...all },
        taskBoard: { ...all },
        holidays: { ...all },
        notifications: { ...viewOnly },
        reports: { ...viewOnly },
        locations: { ...viewOnly },
        users: { ...manageNoDelete },
        rbac: { ...none },
        settings: { ...viewOnly }
    },
    user: {
        dashboard: { ...viewOnly },
        taskList: { ...manageNoDelete },
        taskBoard: { ...boardUser },
        holidays: { ...none },
        notifications: { ...viewOnly },
        reports: { ...viewOnly },
        locations: { ...none },
        users: { ...none },
        rbac: { ...none },
        settings: { ...viewOnly }
    }
}
