import { Router } from 'express';
import { asyncWrap } from '../middleware/errorHandler.js';
import * as ctrl from '../controllers/settings.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();

router.get('/',           asyncWrap(ctrl.getSettings));
router.put('/',           requireRole('owner'), asyncWrap(ctrl.updateSettings));
router.put('/location',   requireRole('owner'), asyncWrap(ctrl.updateLocation));

export default router;
