import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import { validateJoiSchema, validationInstanceSkipBody, validationBoardPlaceBody } from '../service/validationService.js'
import * as taskInstanceService from '../service/taskInstanceService.js'
import { isValidYmd } from '../util/ist.js'
import config from '../config/config.js'

const handleServiceError = (error, req, next) => {
    if (error?.statusCode) {
        return httpError(next, error, req, error.statusCode)
    }
    return httpError(next, error, req, 500)
}

const publicUrl = (filename) => {
    const base = (config.SERVER_URL || '').replace(/\/$/, '')
    return `${base}/uploads/task-proofs/${filename}`
}

export const getInstances = async (req, res, next) => {
    try {
        const date = String(req.query.date || '')
        if (!isValidYmd(date)) {
            return httpError(next, new Error('date is required as YYYY-MM-DD'), req, 422)
        }
        const instances = await taskInstanceService.listInstancesForDate(req.authenticatedUser, date)
        httpResponse(req, res, 200, responseMessage.SUCCESS, instances)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const patchSkipOnHoliday = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationInstanceSkipBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const instance = await taskInstanceService.setInstanceSkipOnHoliday(
            req.authenticatedUser,
            req.params.id,
            value.skipOnHoliday
        )
        if (!instance) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, instance)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const completeInstanceItem = async (req, res, next) => {
    try {
        const files = req.files || []
        const photos = files.map((file) => ({
            url: publicUrl(file.filename),
            publicId: `local:${file.filename}`
        }))
        const instance = await taskInstanceService.completeInstanceItem(
            req.authenticatedUser,
            req.params.id,
            req.params.itemId,
            { note: req.body?.note, photos }
        )
        if (!instance) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, instance)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const placeOnBoard = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationBoardPlaceBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const instance = await taskInstanceService.placeOnBoard(req.authenticatedUser, req.params.id, value)
        if (!instance) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, instance)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}
