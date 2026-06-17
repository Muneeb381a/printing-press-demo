import { Router } from 'express';
import * as ctrl from '../controllers/bills.js';
import { asyncWrap } from '../middleware/errorHandler.js';
import { validate, validateId } from '../middleware/validate.js';
import { requireRole } from '../middleware/requireRole.js';

const ownerOnly = requireRole('owner');

const router = Router();

// ── Complete bill (atomic: items + charges + advance in one shot) ──
// MUST be before /:id routes to avoid route shadowing
router.post('/complete',            validate(['customerId']), asyncWrap(ctrl.completeBill));

// Bulk status update (must be before /:id to avoid shadowing)
router.post('/bulk-status',  ownerOnly, validate(['status']), asyncWrap(ctrl.bulkStatus));
router.delete('/bulk',       ownerOnly, validate(['ids']),    asyncWrap(ctrl.bulkDelete));

// Bill number availability check  (?value=AK-2024-55)
router.get('/check-bill-number', asyncWrap(ctrl.checkBillNumber));

// Bills CRUD
router.get('/',       asyncWrap(ctrl.getAll));
router.get('/:id',    validateId, asyncWrap(ctrl.getById));
router.get('/:id/invoice', validateId, asyncWrap(ctrl.getInvoice));
router.post('/',      ownerOnly, validate(['customerId']), asyncWrap(ctrl.create));
router.put('/:id',    ownerOnly, validateId, asyncWrap(ctrl.update));
router.delete('/:id', ownerOnly, validateId, asyncWrap(ctrl.remove));

// Duplicate bill
router.post('/:id/duplicate', ownerOnly, validateId, asyncWrap(ctrl.duplicateBill));

// Full bill edit (replaces items/charges atomically, keeps payments)
router.put('/:id/full', ownerOnly, validateId, validate(['customerId']), asyncWrap(ctrl.editBill));

// Status, priority, discount & design (owner only — employees cannot change status)
router.patch('/:id/status',        ownerOnly, validateId, validate(['status']),   asyncWrap(ctrl.updateStatus));
router.patch('/:id/priority',      ownerOnly, validateId, validate(['priority']), asyncWrap(ctrl.updatePriority));
router.patch('/:id/deliver',       ownerOnly, validateId,                         asyncWrap(ctrl.markDelivered));
router.patch('/:id/discount',      ownerOnly, validateId,                         asyncWrap(ctrl.applyDiscount));
router.patch('/:id/design-status', ownerOnly, validateId,                         asyncWrap(ctrl.updateDesignStatus));

// Bill items (owner only)
router.post('/:id/items',                 ownerOnly, validateId, asyncWrap(ctrl.addItem));
router.put('/:id/items/:itemId',          ownerOnly, validateId, asyncWrap(ctrl.updateItem));
router.delete('/:id/items/:itemId',       ownerOnly, validateId, asyncWrap(ctrl.removeItem));

// Extra charges (owner only)
router.post('/:id/extra-charges',         ownerOnly, validateId, validate(['label', 'amount']), asyncWrap(ctrl.addExtraCharge));
router.delete('/:id/extra-charges/:chargeId', ownerOnly, validateId, asyncWrap(ctrl.removeExtraCharge));

export default router;
