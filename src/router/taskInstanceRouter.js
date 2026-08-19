import { Router } from 'express'
import * as taskInstanceController from '../controller/taskInstanceController.js'
import { authorizePermission } from '../middleware/authorize.js'
import { proofUpload } from '../middleware/proofUpload.js'
import httpError from '../util/httpError.js'

const router = Router()

router.route('/').get(taskInstanceController.getInstances)

router
    .route('/:id/skip-on-holiday')
    .patch(authorizePermission('taskBoard', 'canEdit'), taskInstanceController.patchSkipOnHoliday)

router
    .route('/:id/board')
    .patch(authorizePermission('taskBoard', 'canEdit'), taskInstanceController.placeOnBoard)

router.route('/:id/items/:itemId/complete').post(
    authorizePermission('taskBoard', 'canEdit'),
    (req, res, next) => {
        proofUpload.array('photos', 5)(req, res, (error) => {
            if (error) {
                return httpError(next, error, req, 422)
            }
            next()
        })
    },
    taskInstanceController.completeInstanceItem
)

export default router
