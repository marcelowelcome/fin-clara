-- Fix: include merchant_name in dedup index to distinguish installments (parcelas)
-- that share the same auth_code, date, and amount but are different transactions.
-- Example: "TREND VIAGENS OPERADOR - 1/10" through "- 10/10" all have the same
-- auth_code and amount but are 10 separate installment charges.

DROP INDEX IF EXISTS idx_dedup_authorized;

CREATE UNIQUE INDEX idx_dedup_authorized
  ON transactions(transaction_date, auth_code, amount_brl, merchant_name)
  WHERE auth_code IS NOT NULL;
