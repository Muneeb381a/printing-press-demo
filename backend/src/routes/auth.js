import { Router } from 'express';
import { login, logout, changePassword, me } from '../controllers/auth.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncWrap } from '../middleware/errorHandler.js';

const router = Router();

router.post('/login',           asyncWrap(login));
router.post('/logout',          requireAuth, asyncWrap(logout));
router.post('/change-password', requireAuth, asyncWrap(changePassword));
router.get('/me',               requireAuth, asyncWrap(me));

export default router;
