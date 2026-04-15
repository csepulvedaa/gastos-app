-- ─────────────────────────────────────────────────────────────
-- Gastos App — Schema
-- Correr en: Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Profiles (vinculado a auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Gastos
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by      UUID        NOT NULL REFERENCES profiles(id),
  amount       INTEGER     NOT NULL CHECK (amount > 0),  -- en pesos, sin decimales
  description  TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'other',
  split        TEXT        NOT NULL DEFAULT '70_30'
                           CHECK (split IN ('70_30', '50_50', 'personal', 'lent')),
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Installment columns (nullable — regular expenses leave these NULL)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_group_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_index    INT CHECK (installment_index > 0);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_total    INT CHECK (installment_total > 1);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by      ON expenses (paid_by);
CREATE INDEX IF NOT EXISTS idx_expenses_installment  ON expenses (installment_group_id) WHERE installment_group_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Profiles: todos los usuarios autenticados pueden leer
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expenses: lectura para todos los autenticados
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Expenses: cualquier usuario autenticado puede insertar
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Expenses: solo el pagador puede actualizar su gasto
CREATE POLICY "expenses_update_own" ON expenses
  FOR UPDATE USING (auth.uid() = paid_by) WITH CHECK (auth.uid() = paid_by);

-- Expenses: solo el pagador puede eliminar su gasto
CREATE POLICY "expenses_delete_own" ON expenses
  FOR DELETE USING (auth.uid() = paid_by);

-- 3. Liquidaciones mensuales
CREATE TABLE IF NOT EXISTS settlements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INT         NOT NULL,
  month       INT         NOT NULL,
  amount      INTEGER     NOT NULL,
  from_user   UUID        NOT NULL REFERENCES profiles(id),
  to_user     UUID        NOT NULL REFERENCES profiles(id),
  settled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_select" ON settlements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settlements_insert" ON settlements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "settlements_delete" ON settlements
  FOR DELETE USING (auth.uid() = from_user OR auth.uid() = to_user);

-- ─────────────────────────────────────────────────────────────
-- Seed: correr DESPUÉS de crear los usuarios en Auth > Users
-- Reemplazar los UUIDs con los generados por Supabase
-- ─────────────────────────────────────────────────────────────

-- INSERT INTO profiles (id, name, email) VALUES
--   ('<UUID-DE-CRISTOBAL>', 'Cristóbal', 'tucorreo@email.com'),
--   ('<UUID-DE-VALENTINA>', 'Valentina', 'correodevalen@email.com');
