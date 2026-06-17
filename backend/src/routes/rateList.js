import { Router } from 'express';
import * as ctrl from '../controllers/rateList.js';
import { asyncWrap } from '../middleware/errorHandler.js';

const router = Router();

// All items (for print / WhatsApp view)
router.get('/items',                               asyncWrap(ctrl.getAllItems));

// Categories
router.get('/categories',                          asyncWrap(ctrl.getCategories));
router.post('/categories',                         asyncWrap(ctrl.addCategory));
router.put('/categories/:id',                      asyncWrap(ctrl.editCategory));
router.delete('/categories/:id',                   asyncWrap(ctrl.removeCategory));

// Items per category
router.get('/categories/:categoryId/items',        asyncWrap(ctrl.getItems));
router.post('/categories/:categoryId/items',       asyncWrap(ctrl.addItem));
router.put('/categories/:categoryId/items/:itemId',    asyncWrap(ctrl.editItem));
router.delete('/categories/:categoryId/items/:itemId', asyncWrap(ctrl.removeItem));

export default router;
