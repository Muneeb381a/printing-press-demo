import { Router } from 'express';
import { asyncWrap } from '../middleware/errorHandler.js';
import * as ctrl from '../controllers/payroll.js';

const router = Router();

router.get('/',                           asyncWrap(ctrl.getByMonth));
router.post('/calculate',                 asyncWrap(ctrl.calculate));
router.get('/employee/:employeeId',       asyncWrap(ctrl.getEmployeeHistory));
router.get('/:id',                        asyncWrap(ctrl.getById));
router.put('/:id',                        asyncWrap(ctrl.updateRecord));
router.put('/:id/pay',                    asyncWrap(ctrl.markPaid));

export default router;
