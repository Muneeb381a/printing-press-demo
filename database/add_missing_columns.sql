-- Additive migration: fix missing columns across categories, quantity_tiers, bill_items
-- Safe to re-run — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- 1. categories: add pricing columns
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20)    NOT NULL DEFAULT 'area_based',
  ADD COLUMN IF NOT EXISTS rate         NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS unit         VARCHAR(50)    NOT NULL DEFAULT 'sqft',
  ADD COLUMN IF NOT EXISTS min_sqft     NUMERIC(10, 2) NOT NULL DEFAULT 1;

-- 2. quantity_tiers: add category_id (product_id already exists for product-level tiers)
ALTER TABLE quantity_tiers
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quantity_tiers_category ON quantity_tiers (category_id);

-- 3. bill_items: add category_id and make product_id nullable
ALTER TABLE bill_items
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories (id) ON DELETE RESTRICT;

ALTER TABLE bill_items ALTER COLUMN product_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bill_items_category_id ON bill_items (category_id);
