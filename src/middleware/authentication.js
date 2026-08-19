import quiker from '../util/quiker.js'
import config from '../config/config.js'
import databaseService from '../service/databaseService.js'
import httpError from '../util/httpError.js'
import responseMessage from '../constant/responseMessage.js'

export default async (req, res, next) => {
    try {
        const { cookies } = req
        const { accessToken } = cookies

        if (accessToken) {
            try {
                const { userId } = quiker.verifyToken(accessToken, config.ACCESS_TOKEN.SECRET)
                const user = await databaseService.findUserById(userId)
                if (user) {
                    req.authenticatedUser = user
                    return next()
                }
            } catch (err) {
                // Token verification failed
            }
        }
        httpError(next, new Error(responseMessage.UNAUTHORIZED), req, 401)
    } catch (error) {
        httpError(next, error, req, 500)
    }
}
