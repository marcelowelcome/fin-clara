-- ============================================================================
-- Clara - Conciliacao — Add viewer role (STEP 1 of 2)
-- ============================================================================
-- IMPORTANTE: Rode este script PRIMEIRO, depois rode 004_viewer_policies.sql
-- O PostgreSQL exige que o novo valor do enum seja commitado antes de ser usado.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';
