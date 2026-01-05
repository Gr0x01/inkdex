# Migrations

## Baseline (Jan 5, 2026)
`00000000000000_baseline.sql` contains the complete schema as of launch.

## RPC Functions
Search functions are managed in `supabase/functions/search_functions.sql` (single source of truth).

**Do NOT create migrations that rewrite search functions** - edit the file directly, then run `npx supabase db push`.

## Archive
Historical migrations (86 files) are in `_archive/` for reference only.
