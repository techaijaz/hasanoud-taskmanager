import prisma from '../config/prisma.js'
import { RBAC_MODULES, RBAC_ROLES, DEFAULT_ROLE_PERMISSIONS } from '../constant/rbac.js'

let cache = null
let cacheAt = 0
const CACHE_MS = 30_000

export const invalidateCache = () => {
    cache = null
    cacheAt = 0
}

const rowsToMatrix = (rows) => {
    const matrix = {}
    for (const role of RBAC_ROLES) {
        matrix[role] = {}
        for (const mod of RBAC_MODULES) {
            matrix[role][mod.key] = { canView: false, canCreate: false, canEdit: false, canDelete: false }
        }
    }
    for (const row of rows) {
        if (!matrix[row.role]) continue
        matrix[row.role][row.module] = {
            canView: !!row.canView,
            canCreate: !!row.canCreate,
            canEdit: !!row.canEdit,
            canDelete: !!row.canDelete
        }
    }
    return matrix
}

export const ensureDefaultRolePermissions = async () => {
    const existing = await prisma.rolePermission.findMany({ select: { role: true, module: true } })
    const have = new Set(existing.map((row) => `${row.role}:${row.module}`))
    const data = []
    for (const role of RBAC_ROLES) {
        for (const mod of RBAC_MODULES) {
            if (have.has(`${role}:${mod.key}`)) continue
            const perms = DEFAULT_ROLE_PERMISSIONS[role][mod.key] || {
                canView: false,
                canCreate: false,
                canEdit: false,
                canDelete: false
            }
            data.push({
                role,
                module: mod.key,
                ...perms
            })
        }
    }
    if (!data.length) return
    await prisma.rolePermission.createMany({ data })
    invalidateCache()
}

export const getRolePermissionMatrix = async ({ force = false } = {}) => {
    await ensureDefaultRolePermissions()
    const now = Date.now()
    if (!force && cache && now - cacheAt < CACHE_MS) {
        return cache
    }
    const rows = await prisma.rolePermission.findMany()
    cache = rowsToMatrix(rows)
    cacheAt = now
    return cache
}

export const getPermissionsForRole = async (role) => {
    const matrix = await getRolePermissionMatrix()
    return structuredClone(matrix[role] || matrix.user)
}

export const resolveUserPermissions = async (user) => {
    const permissions = await getPermissionsForRole(user.role)
    const overrides = user.permissionOverrides && typeof user.permissionOverrides === 'object' ? user.permissionOverrides : {}

    for (const [moduleKey, actions] of Object.entries(overrides)) {
        if (!actions || typeof actions !== 'object') continue
        permissions[moduleKey] = {
            canView: !!actions.canView,
            canCreate: !!actions.canCreate,
            canEdit: !!actions.canEdit,
            canDelete: !!actions.canDelete
        }
    }

    if (user.canManageUsers) {
        permissions.users = {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: true
        }
    }

    if (user.role === 'admin') {
        for (const mod of RBAC_MODULES) {
            permissions[mod.key] = { canView: true, canCreate: true, canEdit: true, canDelete: true }
        }
    }

    return permissions
}

export const sanitizePermissionOverrides = (overrides) => {
    if (overrides === null) return null
    if (!overrides || typeof overrides !== 'object') return undefined

    const clean = {}
    for (const mod of RBAC_MODULES) {
        const actions = overrides[mod.key]
        if (!actions || typeof actions !== 'object') continue
        const row = {
            canView: !!actions.canView,
            canCreate: !!actions.canCreate,
            canEdit: !!actions.canEdit,
            canDelete: !!actions.canDelete
        }
        clean[mod.key] = row
    }
    return Object.keys(clean).length ? clean : null
}

export const upsertRolePermissionMatrix = async (matrix) => {
    await ensureDefaultRolePermissions()
    const ops = []

    for (const role of RBAC_ROLES) {
        if (!matrix[role]) continue
        for (const mod of RBAC_MODULES) {
            const perms = matrix[role][mod.key]
            if (!perms) continue
            ops.push(
                prisma.rolePermission.upsert({
                    where: {
                        role_module: { role, module: mod.key }
                    },
                    create: {
                        role,
                        module: mod.key,
                        canView: !!perms.canView,
                        canCreate: !!perms.canCreate,
                        canEdit: !!perms.canEdit,
                        canDelete: !!perms.canDelete
                    },
                    update: {
                        canView: !!perms.canView,
                        canCreate: !!perms.canCreate,
                        canEdit: !!perms.canEdit,
                        canDelete: !!perms.canDelete
                    }
                })
            )
        }
    }

    await prisma.$transaction(ops)
    invalidateCache()
    return getRolePermissionMatrix({ force: true })
}

export const resetRolePermissionsToDefault = async () => {
    await prisma.rolePermission.deleteMany()
    await ensureDefaultRolePermissions()
    return getRolePermissionMatrix({ force: true })
}

export default {
    ensureDefaultRolePermissions,
    getRolePermissionMatrix,
    getPermissionsForRole,
    resolveUserPermissions,
    sanitizePermissionOverrides,
    upsertRolePermissionMatrix,
    resetRolePermissionsToDefault,
    invalidateCache
}
