/*
# Fix fixture_id unique index for PostgREST upsert compatibility

## Problem
The partial unique index `idx_tips_fixture_id_unique ON tips (fixture_id) WHERE fixture_id IS NOT NULL`
is not recognized by PostgREST (Supabase's API layer) as a valid conflict target for `ON CONFLICT (fixture_id)`.
This caused the sync-fixtures edge function's upsert to silently insert 0 rows.

## Fix
Replace the partial unique index with a regular (non-partial) unique index.
In PostgreSQL, regular unique indexes still allow multiple NULL values (NULLs are not considered equal),
so existing rows with NULL fixture_id won't conflict, while non-NULL values remain unique.

## Changes
- Drop the partial unique index `idx_tips_fixture_id_unique`
- Create a regular unique index `idx_tips_fixture_id_unique` on `(fixture_id)`
*/

DROP INDEX IF EXISTS idx_tips_fixture_id_unique;
CREATE UNIQUE INDEX idx_tips_fixture_id_unique ON tips (fixture_id);
