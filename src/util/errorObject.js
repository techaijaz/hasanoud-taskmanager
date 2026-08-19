import responseMessage from '../constant/responseMessage.js'
import config from '../config/config.js'
import { EApplicationEnvironment } from '../constant/application.js'
import logger from './logger.js'

export default (error, req, errorStatusCode = 500) => {
    const errorObj = {
        success: false,
        statusCode: errorStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.originalUrl
        },
        message:
            error instanceof Error
                ? error.message || responseMessage.ERROR
                : typeof error === 'string'
                  ? error
                  : responseMessage.ERROR,
        data: error,
        trace: error instanceof Error ? { error: error.stack } : null
    }

    // Log
    logger.info('CONTROLLER_RESPONSE', {
        meta: errorObj
    })

    // Production env check
    if (config.ENV === EApplicationEnvironment.PRODUCTION) {
        delete errorObj.request.ip
        delete errorObj.trace
    }
    return errorObj
}
