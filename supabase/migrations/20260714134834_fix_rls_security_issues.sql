/*
# Fix RLS Security Issues on quality_references and generation_log

## Problem
1. `quality_references` has an INSERT policy `submit_reference` with `WITH CHECK (true)`,
   allowing unrestricted inserts. An attacker could insert a row with
   `moderation_status = 'approved'` and `use_as_reference = true`, making their content
   immediately visible to all users — bypassing the moderation queue entirely.
2. `generation_log` has RLS enabled but no policies, making the table completely
   inaccessible via the anon key (locked down). Logging inserts silently fail.

## Changes

### quality_references
- Replace the `submit_reference` INSERT policy with a tightened version that enforces:
  - `moderation_status = 'pending'` — all submissions must start in the moderation queue
  - `use_as_reference = false` — submitters cannot self-approve
  - `safety_status = 'safe'` — submissions must start as safe (moderation can change later)
  - `quality_score = 0` — submitters cannot self-rate quality
  - `originality_score = 0` — submitters cannot self-rate originality
- Add UPDATE and DELETE policies scoped to `authenticated` only (admin/moderator use),
  since no-auth anon users should not be able to modify or remove submitted references.

### generation_log
- Add INSERT policy for `anon, authenticated` — allows the edge function and client
  to log generation events. The `client_ip` column is NOT NULL so the inserter must
  provide it.
- No SELECT/UPDATE/DELETE policies — log data (especially `client_ip`) must not be
  exposed to frontend clients. Admin access would use the service-role key which
  bypasses RLS.

## Security Impact
- Prevents moderation bypass on quality_references (CVE-class: broken access control)
- Enables logging on generation_log without exposing sensitive client_ip data
- No data loss: existing rows are untouched, only policies change
*/

-- =============================================================
-- quality_references: fix INSERT policy + add UPDATE/DELETE
-- =============================================================

-- Drop the vulnerable INSERT policy
DROP POLICY IF EXISTS "submit_reference" ON public.quality_references;

-- Tightened INSERT policy: submissions must enter the moderation queue
CREATE POLICY "submit_reference" ON public.quality_references
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    moderation_status = 'pending'
    AND use_as_reference = false
    AND safety_status = 'safe'
    AND quality_score = 0
    AND originality_score = 0
  );

-- UPDATE policy: only authenticated users (admins/moderators) can update
-- (e.g., approve/reject, adjust scores, toggle use_as_reference)
DROP POLICY IF EXISTS "update_references" ON public.quality_references;
CREATE POLICY "update_references" ON public.quality_references
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE policy: only authenticated users (admins/moderators) can delete
DROP POLICY IF EXISTS "delete_references" ON public.quality_references;
CREATE POLICY "delete_references" ON public.quality_references
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================
-- generation_log: add INSERT policy (table had RLS but no policies)
-- =============================================================

DROP POLICY IF EXISTS "insert_generation_log" ON public.generation_log;
CREATE POLICY "insert_generation_log" ON public.generation_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
