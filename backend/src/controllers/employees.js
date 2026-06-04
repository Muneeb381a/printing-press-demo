import * as Q from '../db/queries/employees.js';
import { createError } from '../middleware/errorHandler.js';

export const getAll = async (_req, res) => {
  const { rows } = await Q.findAll();
  res.json({ data: rows });
};

export const getById = async (req, res, next) => {
  const { rows } = await Q.findById(req.params.id);
  if (!rows.length) return next(createError(404, 'Employee not found'));
  res.json({ data: rows[0] });
};

export const create = async (req, res) => {
  const { name, phone, role, salary, joinDate, status } = req.body;
  const { rows } = await Q.create({ name: name.trim(), phone, role, salary, joinDate, status });
  res.status(201).json({ data: rows[0] });
};

export const update = async (req, res, next) => {
  const { name, phone, role, salary, joinDate, status } = req.body;
  const { rows } = await Q.update(req.params.id, { name, phone, role, salary, joinDate, status });
  if (!rows.length) return next(createError(404, 'Employee not found'));
  res.json({ data: rows[0] });
};

export const remove = async (req, res, next) => {
  const { rows } = await Q.remove(req.params.id);
  if (!rows.length) return next(createError(404, 'Employee not found'));
  res.json({ message: 'Employee deleted', id: rows[0].id });
};
