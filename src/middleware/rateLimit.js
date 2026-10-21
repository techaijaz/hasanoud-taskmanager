import { EApplicationEnvironment } from '../constant/application.js'
import config from '../config/config.js'
import * as rateLimiters from '../config/rateLimiter.js'
import httpError from '../util/httpError.js'
import responseMessage from '../constant/responseMessage.js'

const createRateLimit = (getLimiter) => (req, res, next) => {
    if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
        return next()
    }
    const limiter = getLimiter()
    if (!limiter) {
        return next()
    }
    limiter
        .consume(req.ip, 1)
        .then(() => {
            next()
        })
        .catch(() => {
            httpError(next, new Error(responseMessage.TOO_MANY_REQUEST), req, 429)
        })
}

export const apiRateLimit = createRateLimit(() => rateLimiters.apiRateLimiter)
export const authRateLimit = createRateLimit(() => rateLimiters.authRateLimiter)

export default apiRateLimit
