import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import {
    validateJoiSchema,
    validationTaskTemplateBody,
    validationTaskTemplateUpdateBody,
    validationSkipOnHolidayBody
} from '../service/validationService.js'
import * as taskTemplateService from '../service/taskTemplateService.js'

const handleServiceError = (error, req, next) => {
    if (error?.statusCode) {
        return httpError(next, error, req, error.statusCode)
    }
    return httpError(next, error, req, 500)
}

export const getFormOptions = async (req, res, next) => {
    try {
        const options = await taskTemplateService.getAssignableScope(req.authenticatedUser)
        httpResponse(req, res, 200, responseMessage.SUCCESS, options)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const getTemplates = async (req, res, next) => {
    try {
        const kind = req.query.kind
        const locationId = req.query.locationId
        if (kind && !['one_time', 'recurring'].includes(kind)) {
            return httpError(next, new Error('Invalid type filter'), req, 422)
        }
        const templates = await taskTemplateService.listTemplates(req.authenticatedUser, {
            kind: kind || undefined,
            locationId: locationId || undefined
        })
        httpResponse(req, res, 200, responseMessage.SUCCESS, templates)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const createTemplate = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationTaskTemplateBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const template = await taskTemplateService.createTemplate(req.authenticatedUser, value)
        httpResponse(req, res, 201, responseMessage.SUCCESS, template)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const updateTemplate = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationTaskTemplateUpdateBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const template = await taskTemplateService.updateTemplate(req.authenticatedUser, req.params.id, value)
        if (!template) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, template)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const patchSkipOnHoliday = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationSkipOnHolidayBody, req.body)
        if (error) {
            return httpError(next, error, req, 422)
        }
        const template = await taskTemplateService.setSkipOnHoliday(req.authenticatedUser, req.params.id, value.skipOnHoliday)
        if (!template) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, template)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const deleteTemplate = async (req, res, next) => {
    try {
        const deleted = await taskTemplateService.deleteTemplate(req.authenticatedUser, req.params.id)
        if (!deleted) {
            return httpError(next, new Error(responseMessage.NOT_FOUND('Task')), req, 404)
        }
        httpResponse(req, res, 200, responseMessage.SUCCESS, null)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}
