import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import systemLogService from '../service/systemLogService.js'

export const getSystemLogs = async (req, res, next) => {
    try {
        const { event, level, from, to, page } = req.query
        const result = await systemLogService.list({ event, level, from, to, page })
        httpResponse(req, res, 200, responseMessage.SUCCESS, result)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
