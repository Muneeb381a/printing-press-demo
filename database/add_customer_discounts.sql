-- Additive migration: add discount fields to customers
-- Safe to re-run — uses IF NOT EXISTS pattern.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS discount_type       VARCHAR(50)    NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2)  NOT NULL DEFAULT 0
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
