import { Router } from 'express';
import * as ctrl from '../controllers/attendance.js';
import { asyncWrap } from '../middleware/errorHandler.js';

const router = Router();

router.get('/',        asyncWrap(ctrl.getByDate));
router.get('/monthly', asyncWrap(ctrl.getMonthly));
router.post('/mark',   asyncWrap(ctrl.mark));
router.post('/bulk',   asyncWrap(ctrl.markBulk));

export default router;
