import { EApplicationEnvironment } from '../constant/application.js'
import config from '../config/config.js'
import { rateLimiter } from '../config/rateLimiter.js'
import httpError from '../util/httpError.js'
import responseMessage from '../constant/responseMessage.js'

export default (req, res, next) => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return next()
    }
    if (rateLimiter) {
        rateLimiter
            .consume(req.ip, 1)
            .then(() => {
                next()
            })
            .catch(() => {
                httpError(next, new Error(responseMessage.TOO_MANY_REQUEST), req, 429)
            })
    } else {
        next()
    }
}
