import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import { validateJoiSchema, validationReportQuery } from '../service/validationService.js'
import { getReports } from '../service/reportService.js'

export const getReport = async (req, res, next) => {
    try {
        const { error, value } = validateJoiSchema(validationReportQuery, {
            from: req.query.from,
            to: req.query.to,
            locationId: req.query.locationId || undefined
        })
        if (error) {
            return httpError(next, new Error(error), req, 422)
        }
        const data = await getReports(req.authenticatedUser, value)
        httpResponse(req, res, 200, responseMessage.SUCCESS, data)
    } catch (err) {
        if (err?.statusCode) {
            return httpError(next, err, req, err.statusCode)
        }
        httpError(next, err, req, 500)
    }
}
