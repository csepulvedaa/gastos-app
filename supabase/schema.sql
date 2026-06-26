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

-- 4. Transacciones de tarjeta (importadas desde email BCI)
CREATE TABLE IF NOT EXISTS card_transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES profiles(id),
  email_message_id    TEXT        NOT NULL UNIQUE,  -- Gmail message ID, para deduplicación
  merchant            TEXT        NOT NULL,
  amount              INTEGER,    -- en CLP; null si es moneda extranjera sin convertir
  original_amount     NUMERIC,    -- monto original si no es CLP (ej: 57.72)
  original_currency   TEXT        NOT NULL DEFAULT 'CLP',
  transaction_date    DATE        NOT NULL,
  transaction_time    TEXT,       -- "21:15"
  card_last4          TEXT,       -- "0049"
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'added_shared', 'added_personal', 'ignored')),
  expense_id          UUID        REFERENCES expenses(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_transactions_user_status
  ON card_transactions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_date
  ON card_transactions (transaction_date DESC);

ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_transactions_select" ON card_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "card_transactions_insert" ON card_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "card_transactions_update" ON card_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Seed: correr DESPUÉS de crear los usuarios en Auth > Users
-- Reemplazar los UUIDs con los generados por Supabase
-- ─────────────────────────────────────────────────────────────

-- INSERT INTO profiles (id, name, email) VALUES
--   ('<UUID-DE-CRISTOBAL>', 'Cristóbal', 'tucorreo@email.com'),
--   ('<UUID-DE-VALENTINA>', 'Valentina', 'correodevalen@email.com');
