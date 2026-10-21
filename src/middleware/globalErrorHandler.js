import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'

export const notFoundError = (req, res, next) => {
    try {
        throw new Error(responseMessage.NOT_FOUND('Route'))
    } catch (error) {
        httpError(next, error, req, 404) // Changed to 404
    }
}

// Express only treats 4-argument middleware as an error handler, so `next` must stay
// eslint-disable-next-line no-unused-vars
export default (error, req, res, next) => {
    const statusCode = error.statusCode || 500
    res.status(statusCode).json(error)
}
