import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import { validateJoiSchema, validationHolidayBody } from '../service/validationService.js'
import databaseService from '../service/databaseService.js'

const isAdmin = (user) => user?.role === 'admin'

const assertLocationAccess = async (actor, locationId) => {
    if (isAdmin(actor)) return true
    const ids = await databaseService.getUserLocationIds(actor.id)
    return ids.includes(locationId)
}

export const getHolidays = async (req, res, next) => {
    try {
        const where = {}
        const locationId = req.query.locationId
        const withGlobal = (id) => ({ OR: [{ locationId: id }, { location: { is: null } }] })

        if (!isAdmin(req.authenticatedUser)) {
            const ids = await databaseService.getUserLocationIds(req.authenticatedUser.id)
            if (locationId) {
                if (!ids.includes(locationId)) {
                    return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
                }
                Object.assign(where, withGlobal(locationId))
            } else {
                where.OR = [{ locationId: { in: ids.length ? ids : ['__none__'] } }, { location: { is: null } }]
            }
        } else if (locationId) {
            Object.assign(where, withGlobal(locationId))
        }

        const holidays = await databaseService.listHolidays(where)
        httpResponse(req, res, 200, responseMessage.SUCCESS, holidays)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const createHoliday = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationHolidayBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }

        const allLocations = value.allLocations === true
        const locationId = allLocations ? null : value.locationId

        if (!allLocations) {
            const location = await databaseService.findLocationById(locationId)
            if (!location) {
                return httpError(next, new Error(responseMessage.NOT_FOUND('Location')), req, 404)
            }

            const allowed = await assertLocationAccess(req.authenticatedUser, locationId)
            if (!allowed) {
                return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
            }
        }

        const existing = await databaseService.findHolidayByLocationDate(locationId, value.date)
        if (existing) {
            return httpError(next, responseMessage.ALREADY_EXIST('Holiday', value.date), req, 422)
        }

        const holiday = await databaseService.createHoliday({
            ...(locationId ? { locationId } : {}),
            date: value.date,
            description: value.description || null
        })
        httpResponse(req, res, 201, responseMessage.SUCCESS, holiday)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const deleteHoliday = async (req, res, next) => {
    try {
        const existing = await databaseService.findHolidayById(req.params.id)
        if (!existing) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Holiday')), req, 404)
        }

        if (existing.locationId) {
            const allowed = await assertLocationAccess(req.authenticatedUser, existing.locationId)
            if (!allowed) {
                return httpError(next, new Error('FORBIDDEN_ACCESS: Access denied for your role'), req, 403)
            }
        }

        await databaseService.deleteHoliday(req.params.id)
        httpResponse(req, res, 200, responseMessage.SUCCESS, null)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
