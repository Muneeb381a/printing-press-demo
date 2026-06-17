import { Router } from 'express';
import * as ctrl from '../controllers/attendance.js';
import { asyncWrap } from '../middleware/errorHandler.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

// Owner routes — full attendance management
router.get('/',          requireRole('owner'), asyncWrap(ctrl.getByDate));
router.get('/monthly',   requireRole('owner'), asyncWrap(ctrl.getMonthly));
router.post('/mark',     requireRole('owner'), asyncWrap(ctrl.mark));
router.post('/bulk',     requireRole('owner'), asyncWrap(ctrl.markBulk));

// Employee route — geo-fenced self-mark (today only, always 'present')
router.post('/mark-self', requireRole('employee'), asyncWrap(ctrl.markSelf));

export default router;
