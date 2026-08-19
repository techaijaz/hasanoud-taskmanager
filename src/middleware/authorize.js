import httpError from '../util/httpError.js'
import responseMessage from '../constant/responseMessage.js'
import rbacService from '../service/rbacService.js'

export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.authenticatedUser) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
            }

            const { role } = req.authenticatedUser
            if (!allowedRoles.includes(role)) {
                return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
            }

            next()
        } catch (error) {
            httpError(next, error, req, 500)
        }
    }
}

const hasManageUsersFlag = (user) => user?.canManageUsers === true || user?.canManageUsers === 1 || user?.canManageUsers === '1'

export const authorizeManageUsers = async (req, res, next) => {
    try {
        if (!req.authenticatedUser) {
            return httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
        }

        if (req.authenticatedUser.role === 'admin' || hasManageUsersFlag(req.authenticatedUser)) {
            return next()
        }

        const permissions = await rbacService.resolveUserPermissions(req.authenticatedUser)
        if (permissions.users?.canView) {
            return next()
        }

        return httpError(next, new Error('FORBIDDEN_ACCESS: User management permission required'), req, 403)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const authorizePermission = (moduleKey, action = 'canView') => {
    return async (req, res, next) => {
        try {
            if (!req.authenticatedUser) {
                return httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
            }

            if (req.authenticatedUser.role === 'admin') {
                return next()
            }

            if (moduleKey === 'users' && hasManageUsersFlag(req.authenticatedUser)) {
                return next()
            }

            const permissions = await rbacService.resolveUserPermissions(req.authenticatedUser)
            if (permissions[moduleKey]?.[action]) {
                return next()
            }

            return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    }
}

export default authorizeRoles
