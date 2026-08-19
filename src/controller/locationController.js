import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import { validateJoiSchema, validationLocationBody, validationLocationUpdateBody } from '../service/validationService.js'
import databaseService from '../service/databaseService.js'

export const getAllLocations = async (req, res, next) => {
    try {
        let locations = await databaseService.listLocations()
        if (req.authenticatedUser.role !== 'admin') {
            const ids = await databaseService.getUserLocationIds(req.authenticatedUser.id)
            locations = locations.filter((row) => ids.includes(row.id))
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, locations)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const createLocation = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationLocationBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const location = await databaseService.createLocation({
            name: value.name,
            address: value.address || null
        })
        httpResponse(req, res, 201, responseMessage.SUCCESS, location)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const updateLocation = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationLocationUpdateBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const existing = await databaseService.findLocationById(req.params.id)
        if (!existing) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Location')), req, 404)
        }
        const location = await databaseService.updateLocation(req.params.id, value)
        httpResponse(req, res, 200, responseMessage.SUCCESS, location)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}

export const deleteLocation = async (req, res, next) => {
    try {
        const existing = await databaseService.findLocationById(req.params.id)
        if (!existing) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Location')), req, 404)
        }
        await databaseService.deleteLocation(req.params.id)
        httpResponse(req, res, 200, responseMessage.SUCCESS, null)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
