import { Router } from 'express'
import apiController from '../controller/apiController.js'
import { apiRateLimit, authRateLimit } from '../middleware/rateLimit.js'
import userController from '../controller/userController.js'
import authentication from '../middleware/authentication.js'
import { authorizeManageUsers, authorizePermission } from '../middleware/authorize.js'
import userManagementRouter from './userManagementRouter.js'
import rbacRouter from './rbacRouter.js'
import locationRouter from './locationRouter.js'
import holidayRouter from './holidayRouter.js'
import taskTemplateRouter from './taskTemplateRouter.js'
import taskInstanceRouter from './taskInstanceRouter.js'
import notificationRouter from './notificationRouter.js'
import reportRouter from './reportRouter.js'

const router = Router()

router.use(apiRateLimit)
router.route('/').get((req, res) => {
    res.status(200).json({ message: 'API is working!' })
})
router.route('/self').get(apiController.self)
router.route('/health').get(apiController.health)

router.route('/register').post(userController.register)
router.route('/confirmation/:token').put(authRateLimit, userController.confirmation)
router.route('/login').post(authRateLimit, userController.login)
router.route('/self-identification').get(authentication, userController.selfIdentification)
router.route('/logout').put(authentication, userController.logout)
router.route('/refresh-token').post(userController.refreshToken)
router.route('/forgot-password').put(authRateLimit, userController.forgotPassword)
router.route('/reset-password/:token').put(authRateLimit, userController.resetPassword)
router.route('/change-password').put(authRateLimit, authentication, userController.changePassword)
router.route('/theme').patch(authentication, userController.updateTheme)

router.use('/users', authentication, authorizeManageUsers, userManagementRouter)
router.use('/rbac', authentication, authorizePermission('rbac', 'canView'), rbacRouter)
router.use('/locations', authentication, authorizePermission('locations', 'canView'), locationRouter)
router.use('/holidays', authentication, authorizePermission('holidays', 'canView'), holidayRouter)
router.use('/task-templates', authentication, authorizePermission('taskList', 'canView'), taskTemplateRouter)
router.use('/task-instances', authentication, authorizePermission('taskBoard', 'canView'), taskInstanceRouter)
router.use('/notifications', authentication, notificationRouter)
router.use('/reports', authentication, authorizePermission('reports', 'canView'), reportRouter)

export default router
