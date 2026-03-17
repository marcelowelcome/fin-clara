-- ============================================================================
-- Clara Card Manager — Row Level Security Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_patterns ENABLE ROW LEVEL SECURITY;

-- ─── Helper: check if current user is admin ─────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ─── Helper: get card aliases for current holder ─────────────────────────────

CREATE OR REPLACE FUNCTION my_card_aliases()
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT card_alias FROM public.holders
  WHERE user_id = auth.uid();
$$;

-- ─── Profiles ────────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ─── Holders ─────────────────────────────────────────────────────────────────

CREATE POLICY "Admin can do everything on holders"
  ON holders FOR ALL
  USING (is_admin());

CREATE POLICY "Holders can read own record"
  ON holders FOR SELECT
  USING (user_id = auth.uid());

-- ─── Uploads ─────────────────────────────────────────────────────────────────

CREATE POLICY "Admin can do everything on uploads"
  ON uploads FOR ALL
  USING (is_admin());

-- ─── Transactions ────────────────────────────────────────────────────────────

CREATE POLICY "Admin can read all transactions"
  ON transactions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admin can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Holders can read own transactions"
  ON transactions FOR SELECT
  USING (card_alias IN (SELECT my_card_aliases()));

-- ─── Reconciliations ────────────────────────────────────────────────────────

CREATE POLICY "Admin can do everything on reconciliations"
  ON reconciliations FOR ALL
  USING (is_admin());

CREATE POLICY "Holders can read own reconciliations"
  ON reconciliations FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE card_alias IN (SELECT my_card_aliases())
    )
  );

-- ─── Reconciliation Log ────────────────────────────────────────────────────

CREATE POLICY "Admin can do everything on reconciliation_log"
  ON reconciliation_log FOR ALL
  USING (is_admin());

CREATE POLICY "Holders can read own reconciliation log"
  ON reconciliation_log FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE card_alias IN (SELECT my_card_aliases())
    )
  );

-- ─── Recurrence Patterns ───────────────────────────────────────────────────

CREATE POLICY "Admin can do everything on recurrence_patterns"
  ON recurrence_patterns FOR ALL
  USING (is_admin());

CREATE POLICY "All authenticated can read recurrence_patterns"
  ON recurrence_patterns FOR SELECT
  USING (auth.uid() IS NOT NULL);
