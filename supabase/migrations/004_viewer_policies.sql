-- ============================================================================
-- Clara - Conciliacao — Viewer role: trigger + RLS policies (STEP 2 of 2)
-- ============================================================================
-- IMPORTANTE: Rode DEPOIS de 003_add_viewer_role.sql ter sido commitado.

-- Update trigger to default new users to 'viewer' (safest default)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

-- ─── RLS: viewer can read all transactions ──────────────────────────────────

CREATE POLICY "Viewers can read all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

-- ─── RLS: viewer can read all reconciliations ───────────────────────────────

CREATE POLICY "Viewers can read all reconciliations"
  ON reconciliations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

-- ─── RLS: viewer can read all reconciliation_log ────────────────────────────

CREATE POLICY "Viewers can read all reconciliation_log"
  ON reconciliation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

-- ─── RLS: viewer can read uploads ───────────────────────────────────────────

CREATE POLICY "Viewers can read uploads"
  ON uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

-- ─── RLS: viewer can read holders ───────────────────────────────────────────

CREATE POLICY "Viewers can read holders"
  ON holders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );
