import { Router } from 'express'
import * as rbacController from '../controller/rbacController.js'
import { authorizePermission } from '../middleware/authorize.js'

const router = Router()

router.route('/catalog').get(rbacController.getCatalog)
router.route('/matrix').get(rbacController.getMatrix).put(authorizePermission('rbac', 'canEdit'), rbacController.updateMatrix)
router.route('/matrix/reset').post(authorizePermission('rbac', 'canEdit'), rbacController.resetMatrix)

export default router
