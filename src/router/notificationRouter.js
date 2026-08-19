import { Router } from 'express'
import * as notificationController from '../controller/notificationController.js'

const router = Router()

router.route('/').get(notificationController.getNotifications)
router.route('/unread-count').get(notificationController.getUnreadCount)

export default router
