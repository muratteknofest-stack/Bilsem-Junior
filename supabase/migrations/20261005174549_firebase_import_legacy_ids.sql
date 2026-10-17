-- Existing Zekapark schema predates this repository migration.
-- Preserve historical document IDs while importing append-only audit rows.
alter table public.ai_generation_logs add column if not exists legacy_id text unique;
alter table public.security_events add column if not exists legacy_id text unique;

