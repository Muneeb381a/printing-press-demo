import { Router } from 'express';
import * as ctrl from '../controllers/users.js';
import { asyncWrap } from '../middleware/errorHandler.js';

const router = Router();

router.get('/',             asyncWrap(ctrl.getAll));
router.post('/',            asyncWrap(ctrl.create));
router.put('/:id',          asyncWrap(ctrl.update));
router.put('/:id/password', asyncWrap(ctrl.resetPassword));
router.delete('/:id',       asyncWrap(ctrl.deactivate));

export default router;
