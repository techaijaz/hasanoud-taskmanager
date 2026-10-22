import config from '../config/config.js'
import { EApplicationEnvironment } from '../constant/application.js'

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

    // Production env check
    if (config.ENV === EApplicationEnvironment.PRODUCTION) {
        delete response.request.ip
    }

    res.status(responseStatusCode).json(response)
}
