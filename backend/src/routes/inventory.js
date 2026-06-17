import { Router } from 'express';
import { asyncWrap } from '../middleware/errorHandler.js';
import * as ctrl from '../controllers/inventory.js';

const router = Router();

// ── Static routes first (must precede /:id to avoid param conflict) ──
router.get('/alerts',                                             asyncWrap(ctrl.getAlerts));

// ── Product → Inventory mappings ─────────────────────────────
router.get('/product/:productId/mappings',                        asyncWrap(ctrl.getMappings));
router.put('/product/:productId/mappings',                        asyncWrap(ctrl.upsertMapping));
router.delete('/product/:productId/mappings/:inventoryItemId',    asyncWrap(ctrl.deleteMapping));

// ── Category → Inventory mappings ────────────────────────────
router.get('/category/:categoryId/mappings',                      asyncWrap(ctrl.getCategoryMappings));
router.put('/category/:categoryId/mappings',                      asyncWrap(ctrl.upsertCategoryMapping));
router.delete('/category/:categoryId/mappings/:inventoryItemId',  asyncWrap(ctrl.deleteCategoryMapping));

// ── Inventory items (param routes last) ──────────────────────
router.get('/',              asyncWrap(ctrl.getAll));
router.post('/',             asyncWrap(ctrl.create));
router.get('/:id',           asyncWrap(ctrl.getById));
router.put('/:id',           asyncWrap(ctrl.update));

// ── Stock operations ──────────────────────────────────────────
router.post('/:id/restock',          asyncWrap(ctrl.restock));
router.post('/:id/adjust',           asyncWrap(ctrl.adjust));
router.get('/:id/movements',         asyncWrap(ctrl.getMovements));
router.get('/:id/category-mappings', asyncWrap(ctrl.getItemCategoryMappings));

export default router;
