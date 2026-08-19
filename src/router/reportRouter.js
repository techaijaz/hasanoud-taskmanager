import { Router } from 'express'
import * as reportController from '../controller/reportController.js'

const router = Router()

router.route('/').get(reportController.getReport)

export default router
