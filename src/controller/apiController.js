import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import quiker from '../util/quiker.js'

export default {
    self: (req, res, next) => {
        try {
            httpResponse(req, res, 200, responseMessage.SUCCESS, null)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    },
    health: (req, res, next) => {
        try {
            const healthData = {
                application: quiker.getApplicationHealth(),
                system: quiker.getSystemHealth(),
                timeStamp: Date.now()
            }
            httpResponse(req, res, 200, responseMessage.SUCCESS, healthData)
        } catch (error) {
            httpError(next, error, req, 500)
        }
    }
}
