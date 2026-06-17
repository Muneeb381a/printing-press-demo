import * as Q from '../db/queries/rateList.js';
import { createError } from '../middleware/errorHandler.js';

// ── Categories ────────────────────────────────────────────────

export const getCategories = async (_req, res) => {
  const { rows } = await Q.getAllCategories();
  res.json({ data: rows });
};

export const addCategory = async (req, res, next) => {
  const { name } = req.body;
  if (!name?.trim()) return next(createError(400, 'Category name is required'));
  const { rows } = await Q.createCategory(name.trim());
  res.status(201).json({ data: rows[0] });
};

export const editCategory = async (req, res, next) => {
  const { name } = req.body;
  if (!name?.trim()) return next(createError(400, 'Category name is required'));
  const { rows } = await Q.updateCategory(req.params.id, name.trim());
  if (!rows.length) return next(createError(404, 'Category not found'));
  res.json({ data: rows[0] });
};

export const removeCategory = async (req, res, next) => {
  const { rows } = await Q.deleteCategory(req.params.id);
  if (!rows.length) return next(createError(404, 'Category not found'));
  res.json({ success: true });
};

// ── Items ─────────────────────────────────────────────────────

export const getItems = async (req, res) => {
  const { categoryId } = req.params;
  const { rows } = await Q.getItemsByCategory(categoryId);
  res.json({ data: rows });
};

export const getAllItems = async (_req, res) => {
  const { rows } = await Q.getAllItems();
  res.json({ data: rows });
};

export const addItem = async (req, res, next) => {
  const { categoryId } = req.params;
  const { name, description, unit, price, min_order, notes } = req.body;
  if (!name?.trim()) return next(createError(400, 'Item name is required'));
  if (price === undefined || price === '') return next(createError(400, 'Price is required'));
  const { rows } = await Q.createItem(categoryId, { name: name.trim(), description, unit, price, min_order, notes });
  res.status(201).json({ data: rows[0] });
};

export const editItem = async (req, res, next) => {
  const { name, description, unit, price, min_order, notes } = req.body;
  if (!name?.trim()) return next(createError(400, 'Item name is required'));
  if (price === undefined || price === '') return next(createError(400, 'Price is required'));
  const { rows } = await Q.updateItem(req.params.itemId, { name: name.trim(), description, unit, price, min_order, notes });
  if (!rows.length) return next(createError(404, 'Item not found'));
  res.json({ data: rows[0] });
};

export const removeItem = async (req, res, next) => {
  const { rows } = await Q.deleteItem(req.params.itemId);
  if (!rows.length) return next(createError(404, 'Item not found'));
  res.json({ success: true });
};
