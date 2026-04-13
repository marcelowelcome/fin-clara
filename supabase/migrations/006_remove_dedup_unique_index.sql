-- Remove unique index: Clara CSV can have legitimately identical rows
-- for installments (parcelas) sharing auth_code, date, amount, and merchant_name.
-- Dedup is now handled at the application level with frequency counting.

DROP INDEX IF EXISTS idx_dedup_authorized;

-- Keep a regular (non-unique) index for query performance
CREATE INDEX idx_transactions_auth_lookup
  ON transactions(transaction_date, auth_code, amount_brl, merchant_name)
  WHERE auth_code IS NOT NULL;
