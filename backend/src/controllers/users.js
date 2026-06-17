import { hashPassword } from '../utils/hash.js';
import { createError } from '../middleware/errorHandler.js';
import * as Q from '../db/queries/users.js';

export const getAll = async (_req, res) => {
  const { rows } = await Q.findEmployeesWithAccounts();
  res.json({ data: rows });
};

export const create = async (req, res, next) => {
  const { username, fullName, password, employeeId } = req.body;

  if (!username?.trim()) return next(createError(400, 'username is required'));
  if (!password || password.length < 6)
    return next(createError(400, 'password must be at least 6 characters'));
  if (password.length > 1000) return next(createError(400, 'password too long'));

  const passwordHash = hashPassword(password);
  const { rows } = await Q.create({
    username:   username.trim().toLowerCase(),
    fullName:   fullName?.trim() || null,
    passwordHash,
    employeeId: employeeId ? Number(employeeId) : null,
    createdBy:  req.user.userId,
  });
  res.status(201).json({ data: rows[0] });
};

export const update = async (req, res, next) => {
  const { fullName, isActive } = req.body;
  const { rows } = await Q.update(req.params.id, { fullName, isActive });
  if (!rows.length) return next(createError(404, 'Employee account not found'));
  res.json({ data: rows[0] });
};

export const resetPassword = async (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return next(createError(400, 'newPassword must be at least 6 characters'));
  if (newPassword.length > 1000) return next(createError(400, 'password too long'));

  const { rows } = await Q.findById(req.params.id);
  if (!rows.length || rows[0].role !== 'employee')
    return next(createError(404, 'Employee account not found'));

  await Q.updatePassword(req.params.id, hashPassword(newPassword));
  res.json({ message: 'Password reset successfully' });
};

export const deactivate = async (req, res, next) => {
  const { rows } = await Q.deactivate(req.params.id);
  if (!rows.length) return next(createError(404, 'Employee account not found'));
  res.json({ message: 'Employee deactivated', id: rows[0].id });
};
