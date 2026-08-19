import httpResponse from '../util/httpResponse.js'
import responseMessage from '../constant/responseMessage.js'
import httpError from '../util/httpError.js'
import * as notificationService from '../service/notificationService.js'

const handleServiceError = (error, req, next) => {
    if (error?.statusCode) {
        return httpError(next, error, req, error.statusCode)
    }
    return httpError(next, error, req, 500)
}

export const getNotifications = async (req, res, next) => {
    try {
        const rows = await notificationService.listNotifications(req.authenticatedUser)
        httpResponse(req, res, 200, responseMessage.SUCCESS, rows)
    } catch (error) {
        handleServiceError(error, req, next)
    }
}

export const getUnreadCount = async (req, res, next) => {
    try {
        const unreadCount = await notificationService.unreadNotificationCount(req.authenticatedUser)
        httpResponse(req, res, 200, responseMessage.SUCCESS, { unreadCount })
    } catch (error) {
        handleServiceError(error, req, next)
    }
}
