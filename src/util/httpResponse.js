import config from '../config/config.js'
import { EApplicationEnvironment } from '../constant/application.js'
import logger from '../util/logger.js'

export default (req, res, responseStatusCode, responseMessage, data = null) => {
    const response = {
        success: true,
        statusCode: responseStatusCode,
        request: {
            ip: req.ip || null,
            method: req.method,
            url: req.originalUrl
        },
        message: responseMessage,
        data: data
    }
    
    // Log
    logger.info('CONTROLLER_RESPONSE', {
        meta: response
    })

    // Production env check
    if (config.ENV === EApplicationEnvironment.PRODUCTION) {
        delete response.request.ip
    }

    res.status(responseStatusCode).json(response)
}
