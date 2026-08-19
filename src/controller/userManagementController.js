import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import {
    validateJoiSchema,
    validationCreateManagedUserBody,
    validationUpdateManagedUserBody
} from '../service/validationService.js'
import quiker from '../util/quiker.js'
import databaseService from '../service/databaseService.js'
import { EUserRole } from '../constant/userConstant.js'
import rbacService from '../service/rbacService.js'
import { RBAC_MODULES, RBAC_ROLES } from '../constant/rbac.js'
import { getDescendantIds, isInTeam, validateReportsTo } from '../service/reportingService.js'
import emailService from '../service/emailService.js'
import logger from '../util/logger.js'
import config from '../config/config.js'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
dayjs.extend(utc)

const isAdminActor = (actor) => actor?.role === EUserRole.ADMIN

const parsePhoneFields = (phone) => {
    const normalized = String(phone).trim().startsWith('+') ? String(phone).trim() : `+${String(phone).trim()}`
    const { countryCode, isoCode, internationalNumber } = quiker.parsePhoneNumber(normalized)
    if (!countryCode || !isoCode || !internationalNumber) {
        return { error: responseMessage.INCORECT_PHONE_NUMBER }
    }
    const timezone = quiker.countryTimezone(isoCode)
    if (!timezone || !timezone.length) {
        return { error: responseMessage.INCORECT_PHONE_NUMBER }
    }
    return {
        phoneIsoCode: isoCode,
        phoneCountryCode: countryCode,
        phoneInternationalNumber: internationalNumber,
        timezone: timezone[0].name
    }
}

const sendInviteEmail = (user, token) => {
    const resetURL = `${config.FRONTEND_URL}/reset-password/${token}`
    const text = `Hey ${user.name},\n\nYour Task Manager account is ready. Set your password using this link (valid for 7 days):\n\n${resetURL}\n\nYou can then log in with your email or phone number.`
    emailService.sendEmail([user.email], 'Set your Task Manager password', text).catch((error) => logger.error('EMAIL_SERVICE', { meta: error }))
}

const assertCanManageTarget = async (actor, targetId) => {
    if (isAdminActor(actor)) return true
    if (actor.id === targetId) return false
    return isInTeam(actor.id, targetId)
}

export const getAllUsers = async (req, res, next) => {
    try {
        const actor = req.authenticatedUser
        let where = {}
        if (!isAdminActor(actor)) {
            const teamIds = await getDescendantIds(actor.id)
            where = { id: { in: [actor.id, ...teamIds] } }
        }
        const users = await databaseService.listUsers(where)
        httpResponse(req, res, 200, responseMessage.SUCCESS, users)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const getPermissionMatrix = async (req, res, next) => {
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

export const getUserById = async (req, res, next) => {
    try {
        const allowed = await assertCanManageTarget(req.authenticatedUser, req.params.id)
        if (!allowed && req.params.id !== req.authenticatedUser.id && !isAdminActor(req.authenticatedUser)) {
            return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
        }
        const user = await databaseService.findUserPublicById(req.params.id)
        if (!user) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('User')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, user)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const createUser = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationCreateManagedUserBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }

        const actor = req.authenticatedUser
        const { name, email, phone, role: requestedRole, reportsToId, locationIds, canManageUsers: requestedCanManage, permissionOverrides } = value

        let role = requestedRole || EUserRole.USER
        let canManageUsers = requestedCanManage === true

        if (!isAdminActor(actor)) {
            if (role === EUserRole.ADMIN || role === EUserRole.MANAGER) {
                return httpError(next, new Error('Only admin can create admin or manager accounts'), req, 403)
            }
            role = EUserRole.USER
            canManageUsers = false
        }

        let overrides = null
        if (permissionOverrides !== undefined) {
            if (!isAdminActor(actor)) {
                return httpError(next, new Error('Only admin can set special permissions'), req, 403)
            }
            overrides = rbacService.sanitizePermissionOverrides(permissionOverrides)
        }

        const existing = await databaseService.findUserByEmail(email)
        if (existing) {
            return httpError(next, responseMessage.ALREADY_EXIST('User', email), req, 422)
        }

        const phoneFields = parsePhoneFields(phone)
        if (phoneFields.error) {
            return httpError(next, phoneFields.error, req, 422)
        }

        const phoneTaken = await databaseService.findUserByPhone(phoneFields.phoneCountryCode, phoneFields.phoneInternationalNumber)
        if (phoneTaken) {
            return httpError(next, responseMessage.ALREADY_EXIST('User', phone), req, 422)
        }

        let resolvedReportsTo = reportsToId || (!isAdminActor(actor) ? actor.id : null)
        if (!resolvedReportsTo) {
            return httpError(next, new Error('Reporting manager is required'), req, 422)
        }

        if (!isAdminActor(actor) && resolvedReportsTo !== actor.id) {
            const inTeam = await isInTeam(actor.id, resolvedReportsTo)
            if (!inTeam) {
                return httpError(next, new Error('You can only assign reporting manager within your team'), req, 403)
            }
        }

        const reports = await validateReportsTo({ role, reportsToId: resolvedReportsTo })
        if (reports.error) {
            return httpError(next, new Error(reports.error), req, 422)
        }

        const token = quiker.generateRandomId()
        const code = quiker.generateOtp(6)
        const encryptedPassword = await quiker.hashedPassword(quiker.generateRandomId())
        const inviteExpiry = quiker.generateResetPasswordExpiry(60 * 24 * 7)

        const newUser = await databaseService.registerUser({
            name,
            email,
            ...phoneFields,
            password: encryptedPassword,
            role,
            canManageUsers,
            permissionOverrides: overrides,
            reportsToId: reports.reportsToId,
            consent: true,
            accountConfirmationStatus: true,
            accountConfirmationToken: token,
            accountConfirmationCode: code,
            accountConfirmationTimestamp: dayjs().utc().toDate(),
            passwordResetToken: token,
            passwordResetExpiry: inviteExpiry,
            passwordResetLastResetAt: null,
            refreshToken: null,
            lastLoginAt: null
        })

        if (locationIds?.length) {
            await databaseService.setUserLocations(newUser.id, locationIds)
        }

        sendInviteEmail(newUser, token)

        const safe = await databaseService.findUserPublicById(newUser.id)
        httpResponse(req, res, 201, responseMessage.SUCCESS, safe)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const updateUser = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationUpdateManagedUserBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }

        const existing = await databaseService.findUserById(req.params.id)
        if (!existing) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('User')), req, 404)
        }

        const actor = req.authenticatedUser
        const allowed = isAdminActor(actor) || (await isInTeam(actor.id, existing.id))
        if (!allowed) {
            return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
        }

        const data = {}
        if (value.name !== undefined) data.name = value.name

        if (value.email !== undefined && value.email !== existing.email) {
            const emailTaken = await databaseService.findUserByEmail(value.email)
            if (emailTaken) {
                return httpError(next, responseMessage.ALREADY_EXIST('User', value.email), req, 422)
            }
            data.email = value.email
        }

        if (value.phone !== undefined) {
            const phoneFields = parsePhoneFields(value.phone)
            if (phoneFields.error) {
                return httpError(next, phoneFields.error, req, 422)
            }
            const phoneTaken = await databaseService.findUserByPhone(phoneFields.phoneCountryCode, phoneFields.phoneInternationalNumber)
            if (phoneTaken && phoneTaken.id !== existing.id) {
                return httpError(next, responseMessage.ALREADY_EXIST('User', value.phone), req, 422)
            }
            Object.assign(data, phoneFields)
        }

        const nextRole = value.role !== undefined ? value.role : existing.role
        if (!isAdminActor(actor) && value.role !== undefined && value.role !== EUserRole.USER) {
            return httpError(next, new Error('Only admin can assign admin or manager role'), req, 403)
        }

        if (value.role !== undefined) data.role = nextRole

        if (value.canManageUsers !== undefined) {
            if (!isAdminActor(actor)) {
                return httpError(next, new Error('Only admin can change user credentials permission'), req, 403)
            }
            data.canManageUsers = value.canManageUsers === true
        }

        if (value.permissionOverrides !== undefined) {
            if (!isAdminActor(actor)) {
                return httpError(next, new Error('Only admin can set special permissions'), req, 403)
            }
            data.permissionOverrides = rbacService.sanitizePermissionOverrides(value.permissionOverrides)
        }

        if (value.reportsToId !== undefined || value.role !== undefined) {
            const reportsToId = value.reportsToId !== undefined ? value.reportsToId || null : existing.reportsToId
            if (reportsToId === existing.id) {
                return httpError(next, new Error('User cannot report to themselves'), req, 422)
            }
            if (!reportsToId && existing.role === EUserRole.ADMIN && !existing.reportsToId) {
                data.reportsToId = null
            } else {
                const reports = await validateReportsTo({ role: nextRole, reportsToId })
                if (reports.error) {
                    return httpError(next, new Error(reports.error), req, 422)
                }
                data.reportsToId = reports.reportsToId
            }
        }

        const updated = await databaseService.updateUser(req.params.id, data)
        if (value.locationIds !== undefined) {
            await databaseService.setUserLocations(req.params.id, value.locationIds)
        }

        const safe = await databaseService.findUserPublicById(updated.id)
        httpResponse(req, res, 200, responseMessage.SUCCESS, safe)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params
        if (id === req.authenticatedUser.id) {
            return httpError(next, new Error('You cannot delete your own account'), req, 400)
        }

        const existing = await databaseService.findUserById(id)
        if (!existing) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('User')), req, 404)
        }

        if (existing.role === EUserRole.ADMIN && !isAdminActor(req.authenticatedUser)) {
            return httpError(next, new Error('Only admin can delete admin users'), req, 403)
        }

        const allowed = isAdminActor(req.authenticatedUser) || (await isInTeam(req.authenticatedUser.id, id))
        if (!allowed) {
            return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
        }

        const reportsCount = await databaseService.countDirectReports(id)
        if (reportsCount > 0) {
            return httpError(next, new Error('Reassign this user\'s team before deleting'), req, 400)
        }

        await databaseService.deleteUser(id)
        httpResponse(req, res, 200, responseMessage.SUCCESS, null)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
