-- ============================================
-- Fix Function Search Paths
-- Set search_path = '' on all functions to prevent search path injection
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================

-- Analytics functions
ALTER FUNCTION public.increment_profile_view(uuid) SET search_path = '';
ALTER FUNCTION public.increment_booking_click(uuid) SET search_path = '';
ALTER FUNCTION public.increment_instagram_click(uuid) SET search_path = '';
ALTER FUNCTION public.increment_search_appearances(uuid[]) SET search_path = '';
ALTER FUNCTION public.get_recent_search_appearances(uuid, integer, integer) SET search_path = '';
ALTER FUNCTION public.get_artist_stats() SET search_path = '';

-- Artist functions
ALTER FUNCTION public.get_artist_by_handle(text) SET search_path = '';
ALTER FUNCTION public.get_artist_portfolio(uuid) SET search_path = '';
ALTER FUNCTION public.get_artist_subscription_status(uuid) SET search_path = '';
ALTER FUNCTION public.get_artist_locations(uuid) SET search_path = '';
ALTER FUNCTION public.get_artist_tier_counts() SET search_path = '';
ALTER FUNCTION public.get_artists_with_image_counts(integer, integer, text, text, text, text, boolean, boolean, text, text) SET search_path = '';
ALTER FUNCTION public.count_artists_without_images() SET search_path = '';
ALTER FUNCTION public.find_related_artists(uuid, text, text, text, integer) SET search_path = '';

-- Search functions
ALTER FUNCTION public.search_artists_by_embedding(vector, double precision, integer, text, text, text, integer) SET search_path = '';
ALTER FUNCTION public.search_artists_with_count(vector, double precision, integer, text, text, text, integer) SET search_path = '';
ALTER FUNCTION public.search_artists_with_style_boost(vector, double precision, integer, text, text, text, integer, jsonb, boolean) SET search_path = '';
ALTER FUNCTION public.classify_embedding_styles(vector, integer, double precision) SET search_path = '';
ALTER FUNCTION public.count_matching_artists(vector, double precision, text) SET search_path = '';

-- Location functions
ALTER FUNCTION public.get_cities_with_counts(integer, text, text) SET search_path = '';
ALTER FUNCTION public.get_state_cities_with_counts(text) SET search_path = '';
ALTER FUNCTION public.get_countries_with_counts() SET search_path = '';
ALTER FUNCTION public.get_regions_with_counts(text) SET search_path = '';
ALTER FUNCTION public.format_location(text, text, text) SET search_path = '';
ALTER FUNCTION public.update_artist_locations(uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.sync_primary_location() SET search_path = '';
ALTER FUNCTION public.check_location_limit() SET search_path = '';

-- Homepage/stats functions
ALTER FUNCTION public.get_homepage_stats() SET search_path = '';
ALTER FUNCTION public.get_top_artists_by_style(text, integer) SET search_path = '';

-- Claim functions
ALTER FUNCTION public.can_claim_artist(uuid, text, text) SET search_path = '';
ALTER FUNCTION public.claim_artist_profile(uuid, uuid, text, text) SET search_path = '';

-- Promo/subscription functions
ALTER FUNCTION public.validate_promo_code(text) SET search_path = '';

-- Email functions
ALTER FUNCTION public.log_email_send(text, uuid, uuid, text, text, boolean, text, text) SET search_path = '';
ALTER FUNCTION public.check_email_rate_limit(text, text, integer, integer) SET search_path = '';
ALTER FUNCTION public.can_receive_email(text, text) SET search_path = '';
ALTER FUNCTION public.unsubscribe_from_emails(text, boolean, text) SET search_path = '';
ALTER FUNCTION public.cleanup_old_email_logs() SET search_path = '';

-- Mining functions
ALTER FUNCTION public.get_mining_stats() SET search_path = '';
ALTER FUNCTION public.get_mining_city_distribution() SET search_path = '';

-- Pipeline functions
ALTER FUNCTION public.create_pipeline_run(text, text, text, uuid[], text) SET search_path = '';
ALTER FUNCTION public.increment_pipeline_progress(uuid, integer, integer) SET search_path = '';
ALTER FUNCTION public.update_pipeline_runs_updated_at() SET search_path = '';
ALTER FUNCTION public.update_artist_pipeline_on_embedding() SET search_path = '';

-- Vault functions
ALTER FUNCTION public.vault_create_secret(text, text, text) SET search_path = '';
ALTER FUNCTION public.vault_get_decrypted_secret(uuid) SET search_path = '';
ALTER FUNCTION public.vault_update_secret(uuid, text) SET search_path = '';
ALTER FUNCTION public.vault_delete_secret(uuid) SET search_path = '';
ALTER FUNCTION public.user_has_vault_tokens(uuid) SET search_path = '';

-- Utility/trigger functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_marketing_outreach_updated_at() SET search_path = '';
ALTER FUNCTION public.check_and_blacklist_artist() SET search_path = '';
ALTER FUNCTION public.compute_image_style_tags() SET search_path = '';
