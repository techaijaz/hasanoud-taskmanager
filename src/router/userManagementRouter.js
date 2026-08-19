import { Router } from 'express'
import * as userManagementController from '../controller/userManagementController.js'

const router = Router()

router.route('/').get(userManagementController.getAllUsers).post(userManagementController.createUser)
router.route('/permission-matrix').get(userManagementController.getPermissionMatrix)

router
    .route('/:id')
    .get(userManagementController.getUserById)
    .put(userManagementController.updateUser)
    .delete(userManagementController.deleteUser)

export default router
