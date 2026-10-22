import { Router } from 'express'
import * as userManagementController from '../controller/userManagementController.js'
import { authorizePermission } from '../middleware/authorize.js'

const router = Router()

router.route('/').get(userManagementController.getAllUsers).post(authorizePermission('users', 'canCreate'), userManagementController.createUser)
router.route('/permission-matrix').get(userManagementController.getPermissionMatrix)

router
    .route('/:id')
    .get(userManagementController.getUserById)
    .put(authorizePermission('users', 'canEdit'), userManagementController.updateUser)
    .delete(authorizePermission('users', 'canDelete'), userManagementController.deleteUser)

export default router
