-- Allow all authenticated users to reconcile transactions
-- (update reconciliations + insert reconciliation_log)

CREATE POLICY "Holders can update own reconciliations"
  ON reconciliations FOR UPDATE
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE card_alias IN (SELECT my_card_aliases())
    )
  );

CREATE POLICY "Viewers can update all reconciliations"
  ON reconciliations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );

CREATE POLICY "Holders can insert reconciliation_log"
  ON reconciliation_log FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE card_alias IN (SELECT my_card_aliases())
    )
  );

CREATE POLICY "Viewers can insert reconciliation_log"
  ON reconciliation_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'viewer'
    )
  );
