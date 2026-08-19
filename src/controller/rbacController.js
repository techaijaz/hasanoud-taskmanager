import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import { RBAC_MODULES, RBAC_ROLES } from '../constant/rbac.js'
import rbacService from '../service/rbacService.js'

export const getCatalog = async (req, res, next) => {
    try {
        httpResponse(req, res, 200, responseMessage.SUCCESS, {
            modules: RBAC_MODULES,
            roles: RBAC_ROLES,
            actions: ['canView', 'canCreate', 'canEdit', 'canDelete']
        })
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const getMatrix = async (req, res, next) => {
    try {
        const matrix = await rbacService.getRolePermissionMatrix({ force: true })
        httpResponse(req, res, 200, responseMessage.SUCCESS, {
            modules: RBAC_MODULES,
            roles: RBAC_ROLES,
            matrix
        })
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const updateMatrix = async (req, res, next) => {
    try {
        const { matrix } = req.body || {}
        if (!matrix || typeof matrix !== 'object') {
            return httpError(next, new Error('matrix is required'), req, 422)
        }
        const updated = await rbacService.upsertRolePermissionMatrix(matrix)
        httpResponse(req, res, 200, responseMessage.SUCCESS, {
            modules: RBAC_MODULES,
            roles: RBAC_ROLES,
            matrix: updated
        })
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const resetMatrix = async (req, res, next) => {
    try {
        const matrix = await rbacService.resetRolePermissionsToDefault()
        httpResponse(req, res, 200, responseMessage.SUCCESS, {
            modules: RBAC_MODULES,
            roles: RBAC_ROLES,
            matrix
        })
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
