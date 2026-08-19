import { Router } from 'express'
import * as taskTemplateController from '../controller/taskTemplateController.js'
import { authorizePermission } from '../middleware/authorize.js'

const router = Router()

router
    .route('/')
    .get(taskTemplateController.getTemplates)
    .post(authorizePermission('taskList', 'canCreate'), taskTemplateController.createTemplate)

router.route('/options').get(taskTemplateController.getFormOptions)

router
    .route('/:id/skip-on-holiday')
    .patch(authorizePermission('taskList', 'canEdit'), taskTemplateController.patchSkipOnHoliday)

router
    .route('/:id')
    .put(authorizePermission('taskList', 'canEdit'), taskTemplateController.updateTemplate)
    .delete(authorizePermission('taskList', 'canDelete'), taskTemplateController.deleteTemplate)

export default router
