import { Router } from 'express'
import * as locationController from '../controller/locationController.js'
import { authorizePermission } from '../middleware/authorize.js'

const router = Router()

router.route('/').get(locationController.getAllLocations).post(authorizePermission('locations', 'canCreate'), locationController.createLocation)

router
    .route('/:id')
    .put(authorizePermission('locations', 'canEdit'), locationController.updateLocation)
    .delete(authorizePermission('locations', 'canDelete'), locationController.deleteLocation)

export default router
