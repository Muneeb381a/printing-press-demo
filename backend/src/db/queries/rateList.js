import pool from '../../config/db.js';

// ── Categories ────────────────────────────────────────────────

export const getAllCategories = () =>
  pool.query(`SELECT * FROM rate_list_categories ORDER BY sort_order, id`);

export const createCategory = (name) =>
  pool.query(
    `INSERT INTO rate_list_categories (name) VALUES ($1) RETURNING *`,
    [name]
  );

export const updateCategory = (id, name) =>
  pool.query(
    `UPDATE rate_list_categories SET name = $2 WHERE id = $1 RETURNING *`,
    [id, name]
  );

export const deleteCategory = (id) =>
  pool.query(`DELETE FROM rate_list_categories WHERE id = $1 RETURNING id`, [id]);

export const reorderCategories = (orderedIds) => {
  const safeIds = orderedIds.map(Number);
  if (!safeIds.every((id) => Number.isInteger(id) && id > 0)) {
    const err = new Error('Invalid IDs in reorder request');
    err.status = 400;
    throw err;
  }
  const cases = safeIds.map((id, i) => `WHEN ${id} THEN ${i}`).join(' ');
  return pool.query(
    `UPDATE rate_list_categories SET sort_order = CASE id ${cases} END WHERE id = ANY($1)`,
    [safeIds]
  );
};

// ── Items ─────────────────────────────────────────────────────

export const getItemsByCategory = (categoryId) =>
  pool.query(
    `SELECT * FROM rate_list_items
     WHERE category_id = $1 AND is_active = TRUE
     ORDER BY sort_order, id`,
    [categoryId]
  );

export const getAllItems = () =>
  pool.query(
    `SELECT i.*, c.name AS category_name
     FROM   rate_list_items i
     JOIN   rate_list_categories c ON c.id = i.category_id
     WHERE  i.is_active = TRUE
     ORDER  BY c.sort_order, c.id, i.sort_order, i.id`
  );

export const createItem = (categoryId, { name, name_ur, description, unit, price, min_order, notes }) =>
  pool.query(
    `INSERT INTO rate_list_items (category_id, name, name_ur, description, unit, price, min_order, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [categoryId, name, name_ur || null, description || null, unit || 'sqft', price, min_order || null, notes || null]
  );

export const updateItem = (id, { name, name_ur, description, unit, price, min_order, notes }) =>
  pool.query(
    `UPDATE rate_list_items
     SET name=$2, name_ur=$3, description=$4, unit=$5, price=$6, min_order=$7, notes=$8
     WHERE id=$1 RETURNING *`,
    [id, name, name_ur || null, description || null, unit || 'sqft', price, min_order || null, notes || null]
  );

export const deleteItem = (id) =>
  pool.query(`UPDATE rate_list_items SET is_active=FALSE WHERE id=$1 RETURNING id`, [id]);
