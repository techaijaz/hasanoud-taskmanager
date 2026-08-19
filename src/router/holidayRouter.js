import { Router } from 'express'
import * as holidayController from '../controller/holidayController.js'
import { authorizePermission } from '../middleware/authorize.js'

const router = Router()

router.route('/').get(holidayController.getHolidays).post(authorizePermission('holidays', 'canCreate'), holidayController.createHoliday)

router.route('/:id').delete(authorizePermission('holidays', 'canDelete'), holidayController.deleteHoliday)

export default router
