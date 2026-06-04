-- Employees & Attendance tables
-- Run once: node backend/scripts/add-attendance.js

CREATE TABLE IF NOT EXISTS employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(20),
  role       VARCHAR(100) DEFAULT 'Staff',
  salary     NUMERIC(10,2) NOT NULL DEFAULT 0,
  join_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status     VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  status      VARCHAR(20) NOT NULL DEFAULT 'present'
                CHECK (status IN ('present','absent','half_day','leave')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date)
);
