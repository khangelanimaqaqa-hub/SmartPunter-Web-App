/*
# Add sync_logs table and fixture_id column for API-Football sync

## Purpose
Enables the sync-fixtures edge function to:
1. Fetch real fixtures from the API-Football API using API_FOOTBALL_KEY secret.
2. Upsert fixtures into the tips table by a stable external fixture_id (so re-syncs update existing rows instead of creating duplicates).
3. Update live scores and match phases for in-progress and finished matches.
4. Log every sync run (success or failure) to sync_logs for auditability.

## New Tables
- sync_logs: records each sync run with counts (fixtures_fetched, fixtures_upserted, scores_updated), status, error message, and timestamp.

## Modified Tables
- tips: adds fixture_id (integer, nullable, unique) — the API-Football fixture ID used for deduplication. Existing rows keep NULL. A partial unique index allows multiple NULLs while enforcing uniqueness for non-NULL values.

## Security
- sync_logs: RLS enabled. SELECT/INSERT allowed for anon + authenticated (the edge function runs with service role and bypasses RLS, but the frontend needs to read the last-sync timestamp; INSERT is allowed so the function could also run via anon if needed).
- tips: no policy changes — the existing SELECT for published tips remains; the edge function uses the service role key which bypasses RLS for upserts.

## Important Notes
1. fixture_id uses a partial unique index (WHERE fixture_id IS NOT NULL) so existing NULL rows don't conflict.
2. The edge function uses the service role key (SUPABASE_SERVICE_ROLE_KEY) to write to tips and sync_logs, bypassing RLS.
3. sync_logs stores the most recent sync at the top; the frontend reads the latest row to display "Last synced" time.
*/

-- ============ ADD fixture_id TO tips ============
ALTER TABLE tips ADD COLUMN IF NOT EXISTS fixture_id integer;

-- Partial unique index: only enforce uniqueness for non-NULL fixture_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_tips_fixture_id_unique
  ON tips (fixture_id) WHERE fixture_id IS NOT NULL;

-- ============ sync_logs TABLE ============
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  fixtures_fetched integer NOT NULL DEFAULT 0,
  fixtures_upserted integer NOT NULL DEFAULT 0,
  scores_updated integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_logs_select_all" ON sync_logs;
CREATE POLICY "sync_logs_select_all" ON sync_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sync_logs_insert_all" ON sync_logs;
CREATE POLICY "sync_logs_insert_all" ON sync_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sync_logs_update_all" ON sync_logs;
CREATE POLICY "sync_logs_update_all" ON sync_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============ GRANTS ============
GRANT SELECT ON sync_logs TO anon, authenticated;
GRANT INSERT ON sync_logs TO anon, authenticated;
GRANT UPDATE ON sync_logs TO anon, authenticated;
