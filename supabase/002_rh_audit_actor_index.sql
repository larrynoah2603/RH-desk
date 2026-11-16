-- Applied to Supabase project rh desk (2026-11-16).
-- Cover foreign-key lookups when users are deleted.
create index if not exists rh_audit_actor_idx on public.rh_audit_events(actor_id);
