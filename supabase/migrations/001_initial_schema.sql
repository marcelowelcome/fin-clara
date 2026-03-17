-- ============================================================================
-- Clara Card Manager — Initial Schema
-- ============================================================================

-- ─── Custom Types ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'holder');
CREATE TYPE transaction_status AS ENUM ('Autorizada', 'Recusada', 'Pendente');
CREATE TYPE reconciliation_status AS ENUM ('Pendente', 'Conciliado', 'N/A', 'Recorrente');
CREATE TYPE notify_frequency AS ENUM ('daily', 'weekly', 'on_demand');

-- ─── Profiles (extends auth.users) ──────────────────────────────────────────

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'holder',
  holder_id  UUID,        -- FK added after holders table is created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'holder');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ─── Holders ─────────────────────────────────────────────────────────────────

CREATE TABLE holders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  card_alias       TEXT NOT NULL UNIQUE,
  card_last4       TEXT NOT NULL CHECK (length(card_last4) = 4),
  email            TEXT NOT NULL,
  notify_enabled   BOOLEAN NOT NULL DEFAULT true,
  notify_frequency notify_frequency NOT NULL DEFAULT 'weekly',
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_holders_user_id ON holders(user_id);
CREATE INDEX idx_holders_card_alias ON holders(card_alias);

-- Now add FK from profiles to holders
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_holder
  FOREIGN KEY (holder_id) REFERENCES holders(id) ON DELETE SET NULL;

-- ─── Uploads ─────────────────────────────────────────────────────────────────

CREATE TABLE uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  filename      TEXT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id),
  total_rows    INTEGER NOT NULL DEFAULT 0,
  inserted_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows  INTEGER NOT NULL DEFAULT 0
);

-- ─── Transactions ────────────────────────────────────────────────────────────

CREATE TABLE transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date  DATE NOT NULL,
  billing_period    TEXT,
  merchant_name     TEXT NOT NULL,
  amount_brl        NUMERIC(12,2) NOT NULL,
  original_amount   NUMERIC(12,2),
  original_currency TEXT,
  card_last4        TEXT NOT NULL,
  card_alias        TEXT NOT NULL,
  status            transaction_status NOT NULL,
  auth_code         TEXT,
  category          TEXT,
  holder_name       TEXT NOT NULL,
  upload_id         UUID NOT NULL REFERENCES uploads(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deduplication index: only authorized transactions (by auth_code)
-- Recusadas/Pendentes have no auth_code and are never deduplicated
CREATE UNIQUE INDEX idx_dedup_authorized
  ON transactions(transaction_date, auth_code, amount_brl)
  WHERE auth_code IS NOT NULL;

CREATE INDEX idx_transactions_card_alias ON transactions(card_alias);
CREATE INDEX idx_transactions_billing_period ON transactions(billing_period);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_upload_id ON transactions(upload_id);

-- ─── Reconciliations (1:1 with transactions) ────────────────────────────────

CREATE TABLE reconciliations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id        UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  status                reconciliation_status NOT NULL DEFAULT 'Pendente',
  note                  TEXT,
  reconciled_by         UUID REFERENCES auth.users(id),
  reconciled_at         TIMESTAMPTZ,
  is_recurring          BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern_id UUID
);

CREATE INDEX idx_reconciliations_status ON reconciliations(status);
CREATE INDEX idx_reconciliations_transaction ON reconciliations(transaction_id);

-- ─── Reconciliation Log ─────────────────────────────────────────────────────

CREATE TABLE reconciliation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  old_status      reconciliation_status NOT NULL,
  new_status      reconciliation_status NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  note            TEXT
);

CREATE INDEX idx_reconciliation_log_transaction ON reconciliation_log(transaction_id);

-- ─── Recurrence Patterns ────────────────────────────────────────────────────

CREATE TABLE recurrence_patterns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_pattern TEXT NOT NULL,
  avg_amount       NUMERIC(12,2) NOT NULL,
  tolerance_pct    NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from reconciliations to recurrence_patterns
ALTER TABLE reconciliations
  ADD CONSTRAINT fk_reconciliations_recurrence
  FOREIGN KEY (recurrence_pattern_id) REFERENCES recurrence_patterns(id) ON DELETE SET NULL;
