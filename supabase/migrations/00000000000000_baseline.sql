


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."search_tier" AS ENUM (
    'active',
    'archive'
);


ALTER TYPE "public"."search_tier" OWNER TO "postgres";


CREATE TYPE "public"."style_taxonomy" AS ENUM (
    'technique',
    'theme'
);


ALTER TYPE "public"."style_taxonomy" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text" DEFAULT NULL::"text", "p_instagram_handle" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_clean_handle TEXT;
BEGIN
  IF p_instagram_handle IS NOT NULL THEN
    v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));
    IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
      RETURN FALSE;
    END IF;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM artists
    WHERE id = p_artist_id
      AND verification_status = 'unclaimed'
      AND deleted_at IS NULL
      AND (
        (p_instagram_id IS NOT NULL AND instagram_id = p_instagram_id)
        OR
        (v_clean_handle IS NOT NULL AND LOWER(instagram_handle) = v_clean_handle)
      )
  );
END;
$_$;


ALTER FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text", "p_instagram_handle" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text", "p_instagram_handle" "text") IS 'Verifies if user can claim artist by instagram_id OR instagram_handle (case-insensitive)';



CREATE OR REPLACE FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  SELECT * INTO v_preferences
  FROM email_preferences
  WHERE email = p_email;
  IF v_preferences IS NULL THEN
    RETURN TRUE;
  END IF;
  IF v_preferences.unsubscribed_all THEN
    RETURN FALSE;
  END IF;
  CASE p_email_type
    WHEN 'welcome' THEN
      RETURN v_preferences.receive_welcome;
    WHEN 'sync_failed', 'sync_reauthenticate' THEN
      RETURN v_preferences.receive_sync_notifications;
    WHEN 'subscription_created', 'subscription_cancelled', 'downgrade_warning' THEN
      RETURN v_preferences.receive_subscription_updates;
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") IS 'Check if user has opted in to receive this email type';



CREATE OR REPLACE FUNCTION "public"."check_and_blacklist_artist"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    failure_count INTEGER;
    max_retries INTEGER := 3;
BEGIN
    IF NEW.status = 'failed' THEN
        SELECT COUNT(*)
        INTO failure_count
        FROM scraping_jobs
        WHERE artist_id = NEW.artist_id
        AND status = 'failed';
        IF failure_count >= max_retries THEN
            UPDATE artists
            SET
                scraping_blacklisted = TRUE,
                blacklist_reason = 'Exceeded ' || max_retries || ' failed scraping attempts: ' || NEW.error_message,
                blacklisted_at = NOW()
            WHERE id = NEW.artist_id;
            RAISE NOTICE 'Artist % blacklisted after % failures', NEW.artist_id, failure_count;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_and_blacklist_artist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer DEFAULT 10, "p_max_per_day" integer DEFAULT 50) RETURNS TABLE("allowed" boolean, "hourly_count" integer, "daily_count" integer, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_one_hour_ago TIMESTAMPTZ;
  v_one_day_ago TIMESTAMPTZ;
BEGIN
  v_one_hour_ago := NOW() - INTERVAL '1 hour';
  v_one_day_ago := NOW() - INTERVAL '24 hours';
  SELECT COUNT(*) INTO v_hourly_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_hour_ago
    AND success = TRUE;
  SELECT COUNT(*) INTO v_daily_count
  FROM email_log
  WHERE recipient_email = p_recipient_email
    AND email_type = p_email_type
    AND sent_at >= v_one_day_ago
    AND success = TRUE;
  IF v_hourly_count >= p_max_per_hour THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last hour (max %s)',
        v_hourly_count, p_email_type, p_max_per_hour);
    RETURN;
  END IF;
  IF v_daily_count >= p_max_per_day THEN
    RETURN QUERY SELECT
      FALSE,
      v_hourly_count,
      v_daily_count,
      format('Rate limit exceeded: %s emails of type %s sent in last 24 hours (max %s)',
        v_daily_count, p_email_type, p_max_per_day);
    RETURN;
  END IF;
  RETURN QUERY SELECT
    TRUE,
    v_hourly_count,
    v_daily_count,
    NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer, "p_max_per_day" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer, "p_max_per_day" integer) IS 'Check if email send is within rate limits';



CREATE OR REPLACE FUNCTION "public"."check_location_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_pro BOOLEAN;
  location_count INTEGER;
  max_locations INTEGER;
BEGIN
  -- Get artist's pro status
  SELECT a.is_pro INTO is_pro
  FROM artists a
  WHERE a.id = NEW.artist_id;

  -- Set limit based on tier
  max_locations := CASE WHEN is_pro THEN 20 ELSE 1 END;

  -- Count existing locations (excluding current for updates)
  SELECT COUNT(*) INTO location_count
  FROM artist_locations
  WHERE artist_id = NEW.artist_id
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF location_count >= max_locations THEN
    RAISE EXCEPTION 'Location limit reached. % tier allows % location(s).',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, max_locations;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_location_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_artist_handle TEXT;
  v_clean_handle TEXT;
  v_updated_count INT;
BEGIN
  IF p_instagram_handle IS NULL OR p_instagram_handle = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Instagram handle is required'
    );
  END IF;
  v_clean_handle := LOWER(TRIM(REPLACE(p_instagram_handle, '@', '')));
  IF v_clean_handle !~ '^[a-z0-9._]{1,30}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_handle',
      'message', 'Invalid Instagram handle format'
    );
  END IF;
  SELECT instagram_handle INTO v_artist_handle
  FROM artists
  WHERE id = p_artist_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'artist_not_found',
      'message', 'Artist profile not found'
    );
  END IF;
  UPDATE artists
  SET
    claimed_by_user_id = p_user_id,
    claimed_at = NOW(),
    verification_status = 'claimed',
    instagram_id = COALESCE(p_instagram_id, instagram_id)
  WHERE id = p_artist_id
    AND verification_status = 'unclaimed'
    AND deleted_at IS NULL
    AND LOWER(instagram_handle) = v_clean_handle;
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    DECLARE
      v_current_status TEXT;
      v_current_handle TEXT;
    BEGIN
      SELECT verification_status, instagram_handle
      INTO v_current_status, v_current_handle
      FROM artists
      WHERE id = p_artist_id AND deleted_at IS NULL;
      IF v_current_status = 'claimed' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'already_claimed',
          'message', 'This profile has already been claimed'
        );
      ELSIF LOWER(v_current_handle) != v_clean_handle THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'handle_mismatch',
          'message', 'Instagram handle does not match this profile'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'claim_failed',
          'message', 'Unable to claim profile'
        );
      END IF;
    END;
  END IF;
  DELETE FROM portfolio_images WHERE artist_id = p_artist_id;
  INSERT INTO claim_attempts (
    artist_id,
    user_id,
    instagram_handle_attempted,
    artist_handle,
    outcome
  ) VALUES (
    p_artist_id,
    p_user_id,
    p_instagram_handle,
    v_artist_handle,
    'success'
  );
  RETURN jsonb_build_object(
    'success', true,
    'artist_id', p_artist_id,
    'message', 'Profile claimed successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO claim_attempts (
      artist_id,
      user_id,
      instagram_handle_attempted,
      artist_handle,
      outcome
    ) VALUES (
      p_artist_id,
      p_user_id,
      p_instagram_handle,
      COALESCE(v_artist_handle, 'unknown'),
      'error'
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'server_error',
      'message', 'An unexpected error occurred'
    );
END;
$_$;


ALTER FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text") IS 'Atomically claims artist profile with race condition protection and audit logging';



CREATE OR REPLACE FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer DEFAULT 3, "p_min_confidence" double precision DEFAULT 0.35, "p_taxonomy" "public"."style_taxonomy" DEFAULT NULL::"public"."style_taxonomy") RETURNS TABLE("style_name" "text", "confidence" double precision, "taxonomy" "public"."style_taxonomy")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.style_name,
    (1 - (p_embedding <=> ss.embedding))::FLOAT as confidence,
    ss.taxonomy
  FROM style_seeds ss
  WHERE ss.embedding IS NOT NULL
    AND (1 - (p_embedding <=> ss.embedding)) >= p_min_confidence
    AND (p_taxonomy IS NULL OR ss.taxonomy = p_taxonomy)
  ORDER BY p_embedding <=> ss.embedding ASC
  LIMIT p_max_styles;
END;
$$;


ALTER FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision, "p_taxonomy" "public"."style_taxonomy") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision, "p_taxonomy" "public"."style_taxonomy") IS 'Classifies an embedding against style seeds. Optionally filter by taxonomy (technique/theme). Returns top N styles with confidence scores above threshold.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_email_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM email_log
  WHERE sent_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_email_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_email_logs"() IS 'Delete email logs older than 90 days (for GDPR compliance)';



CREATE OR REPLACE FUNCTION "public"."compute_image_style_tags"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  technique_record RECORD;
  theme_record RECORD;
  v_technique_threshold float := 0.35;
  v_theme_threshold float := 0.45;  -- Tighter threshold for themes
  v_theme_count int := 0;
BEGIN
  -- Only process if embedding is set
  IF NEW.embedding IS NULL THEN
    RETURN NEW;
  END IF;

  -- Delete existing tags for this image
  DELETE FROM image_style_tags WHERE image_id = NEW.id;

  -- Step 1: Find ONE best technique (exclusive, lower threshold)
  SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
  INTO technique_record
  FROM style_seeds
  WHERE taxonomy = 'technique' AND embedding IS NOT NULL
  ORDER BY NEW.embedding <=> embedding ASC
  LIMIT 1;

  IF technique_record IS NOT NULL AND technique_record.similarity >= v_technique_threshold THEN
    INSERT INTO image_style_tags
      (image_id, style_name, confidence, taxonomy, is_primary)
    VALUES
      (NEW.id, technique_record.style_name, technique_record.similarity,
       'technique', true);
  END IF;

  -- Step 2: Find top 2 themes (higher threshold to reduce false positives)
  FOR theme_record IN (
    SELECT style_name, (1 - (NEW.embedding <=> embedding)) as similarity
    FROM style_seeds
    WHERE taxonomy = 'theme' AND embedding IS NOT NULL
      AND (1 - (NEW.embedding <=> embedding)) >= v_theme_threshold
    ORDER BY NEW.embedding <=> embedding ASC
    LIMIT 2
  ) LOOP
    INSERT INTO image_style_tags
      (image_id, style_name, confidence, taxonomy, is_primary)
    VALUES
      (NEW.id, theme_record.style_name, theme_record.similarity,
       'theme', false);
    v_theme_count := v_theme_count + 1;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."compute_image_style_tags"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compute_image_style_tags"() IS 'Auto-tags images with ONE technique (threshold 0.35) and up to 2 themes (threshold 0.45). Themes have higher threshold to reduce false positives like horror matching normal portraits.';



CREATE OR REPLACE FUNCTION "public"."count_artists_without_images"() RETURNS bigint
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM artists a
    WHERE a.deleted_at IS NULL
      AND a.instagram_handle IS NOT NULL
      AND a.instagram_private != TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM portfolio_images pi
        WHERE pi.artist_id = a.id
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_artists_without_images"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_artists_without_images"() IS 'Returns count of artists needing image scraping (no portfolio images, not private)';



CREATE OR REPLACE FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.5, "city_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH filtered_artists AS (
    SELECT a.id
    FROM artists a
    WHERE (city_filter IS NULL OR a.city = city_filter)
  ),
  matching_artists AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    INNER JOIN filtered_artists fa ON pi.artist_id = fa.id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND (1 - (pi.embedding <=> query_embedding)) >= match_threshold
  )
  SELECT COUNT(*) AS count
  FROM matching_artists;
END;
$$;


ALTER FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "city_filter" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "city_filter" "text") IS 'Count total matching artists for pagination. Mirrors search_artists_by_embedding() filtering logic.';



CREATE OR REPLACE FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text" DEFAULT 'pending'::"text", "p_target_artist_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_target_city" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_run_id UUID;
BEGIN
  -- Attempt to insert; the unique index will prevent duplicates
  INSERT INTO pipeline_runs (
    job_type,
    status,
    triggered_by,
    target_scope,
    target_artist_ids,
    target_city
  ) VALUES (
    p_job_type,
    'pending',
    p_triggered_by,
    p_target_scope,
    p_target_artist_ids,
    p_target_city
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
EXCEPTION
  WHEN unique_violation THEN
    -- A job of this type is already running
    RAISE EXCEPTION 'A % job is already pending or running', p_job_type
      USING ERRCODE = 'unique_violation';
END;
$$;


ALTER FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text", "p_target_artist_ids" "uuid"[], "p_target_city" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text", "p_target_artist_ids" "uuid"[], "p_target_city" "text") IS 'Atomically creates a pipeline run, failing if one is already active for the job type';



CREATE OR REPLACE FUNCTION "public"."delete_encrypted_token"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM encrypted_instagram_tokens WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_encrypted_token"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_featured_artists"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE artists
  SET
    is_featured = false,
    updated_at = NOW()
  WHERE is_featured = true
    AND featured_expires_at IS NOT NULL
    AND featured_expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  IF expired_count > 0 THEN
    RAISE NOTICE 'Expired % featured artists', expired_count;
  END IF;
END;
$$;


ALTER FUNCTION "public"."expire_featured_artists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text" DEFAULT NULL::"text", "region_filter" "text" DEFAULT NULL::"text", "country_filter" "text" DEFAULT NULL::"text", "match_count" integer DEFAULT 3) RETURNS TABLE("artist_id" "uuid", "artist_name" "text", "artist_slug" "text", "city" "text", "region" "text", "country_code" "text", "profile_image_url" "text", "instagram_url" "text", "shop_name" "text", "is_verified" boolean, "follower_count" integer, "similarity" double precision, "location_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  source_avg_embedding vector(768);
BEGIN
  -- Get average embedding for source artist
  SELECT avg(embedding)::vector(768) INTO source_avg_embedding
  FROM portfolio_images
  WHERE portfolio_images.artist_id = source_artist_id
    AND status = 'active'
    AND embedding IS NOT NULL;

  IF source_avg_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id, a.name as fa_name, a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.instagram_url as fa_instagram_url,
           a.shop_name as fa_shop_name,
           a.follower_count as fa_follower_count,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.id != source_artist_id
      AND a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  artist_embeddings AS (
    SELECT
      fa.fa_id as ae_artist_id,
      avg(pi.embedding)::vector(768) as ae_avg_embedding
    FROM filtered_artists fa
    INNER JOIN portfolio_images pi ON pi.artist_id = fa.fa_id
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
    GROUP BY fa.fa_id
  ),
  artist_location_counts AS (
    SELECT
      al.artist_id,
      COUNT(*) as loc_count
    FROM artist_locations al
    GROUP BY al.artist_id
  )
  SELECT
    fa.fa_id,
    fa.fa_name,
    fa.fa_slug,
    fa.fa_city,
    fa.fa_region,
    fa.fa_country_code,
    fa.fa_profile_image_url,
    fa.fa_instagram_url,
    fa.fa_shop_name,
    fa.fa_is_verified,
    fa.fa_follower_count,
    (1 - (ae.ae_avg_embedding <=> source_avg_embedding))::float as similarity,
    COALESCE(alc.loc_count, 1) as location_count
  FROM filtered_artists fa
  INNER JOIN artist_embeddings ae ON ae.ae_artist_id = fa.fa_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.fa_id
  ORDER BY ae.ae_avg_embedding <=> source_avg_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text", "region_filter" "text", "country_filter" "text", "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text", "region_filter" "text", "country_filter" "text", "match_count" integer) IS 'Find artists with similar style based on average portfolio embedding. Excludes EU/GDPR artists for compliance.';



CREATE OR REPLACE FUNCTION "public"."format_location"("p_city" "text", "p_region" "text", "p_country_code" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF p_country_code = 'US' THEN
    IF p_city IS NOT NULL AND p_city != '' THEN
      RETURN p_city || ', ' || COALESCE(p_region, '');
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ' (statewide)';
    ELSE
      RETURN 'United States';
    END IF;
  ELSE
    IF p_city IS NOT NULL AND p_city != '' THEN
      IF p_region IS NOT NULL AND p_region != '' THEN
        RETURN p_city || ', ' || p_region || ', ' || p_country_code;
      ELSE
        RETURN p_city || ', ' || p_country_code;
      END IF;
    ELSIF p_region IS NOT NULL AND p_region != '' THEN
      RETURN p_region || ', ' || p_country_code;
    ELSE
      RETURN p_country_code;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."format_location"("p_city" "text", "p_region" "text", "p_country_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer DEFAULT 3) RETURNS TABLE("city" "text", "region" "text", "country_code" "text", "artist_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT
      LOWER(al.city) as city,
      al.region,
      al.country_code,
      COUNT(DISTINCT al.artist_id) AS artist_count
    FROM artist_locations al
    INNER JOIN artists a ON a.id = al.artist_id
    WHERE al.city IS NOT NULL
      AND al.country_code = 'US'
      AND a.deleted_at IS NULL
    GROUP BY LOWER(al.city), al.region, al.country_code
    HAVING COUNT(DISTINCT al.artist_id) >= min_artist_count
    ORDER BY artist_count DESC, city ASC;
  $$;


ALTER FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer) IS 'Returns all US cities with at least min_artist_count active artists. Used by Next.js 
  generateStaticParams().';



CREATE OR REPLACE FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "instagram_handle" "text", "verification_status" "text", "claimed_by_user_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    id, name, slug, instagram_handle,
    verification_status, claimed_by_user_id
  FROM artists
  WHERE LOWER(instagram_handle) = LOWER(REPLACE(p_instagram_handle, '@', ''))
    AND deleted_at IS NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") IS 'Fetches artist by Instagram handle (case-insensitive, strips @ prefix)';



CREATE OR REPLACE FUNCTION "public"."get_artist_locations"("p_artist_id" "uuid") RETURNS TABLE("id" "uuid", "city" "text", "region" "text", "country_code" "text", "location_type" "text", "is_primary" boolean, "display_order" integer, "formatted" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.city,
    al.region,
    al.country_code,
    al.location_type,
    al.is_primary,
    al.display_order,
    format_location(al.city, al.region, al.country_code) as formatted
  FROM artist_locations al
  WHERE al.artist_id = p_artist_id
  ORDER BY al.is_primary DESC, al.display_order ASC;
END;
$$;


ALTER FUNCTION "public"."get_artist_locations"("p_artist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") RETURNS TABLE("id" "uuid", "instagram_post_id" "text", "instagram_url" "text", "storage_original_path" "text", "storage_thumb_320" "text", "storage_thumb_640" "text", "storage_thumb_1280" "text", "post_caption" "text", "post_timestamp" timestamp with time zone, "likes_count" integer, "is_pinned" boolean, "pinned_position" integer, "hidden" boolean, "import_source" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE
    AS $$
    SELECT
      pi.id,
      pi.instagram_post_id,
      pi.instagram_url,
      pi.storage_original_path,
      pi.storage_thumb_320,
      pi.storage_thumb_640,
      pi.storage_thumb_1280,
      pi.post_caption,
      pi.post_timestamp,
      pi.likes_count,
      pi.is_pinned,
      pi.pinned_position,
      pi.hidden,
      pi.import_source,
      pi.created_at
    FROM portfolio_images pi
    WHERE pi.artist_id = p_artist_id
      AND pi.hidden = FALSE
      AND pi.artist_id IN (SELECT id FROM artists WHERE deleted_at IS NULL)
    ORDER BY
      pi.is_pinned DESC,
      pi.pinned_position ASC NULLS LAST,
      pi.created_at DESC;
  $$;


ALTER FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") IS 'Returns portfolio images for an artist, ordered by pinned position.
   Filters out hidden images and deleted artists.';



CREATE OR REPLACE FUNCTION "public"."get_artist_stats"() RETURNS json
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total', COUNT(*),
      'unclaimed', COUNT(*) FILTER (WHERE verification_status = 'unclaimed'),
      'free', COUNT(*) FILTER (WHERE verification_status = 'claimed' AND is_pro = false),
      'pro', COUNT(*) FILTER (WHERE verification_status = 'claimed' AND is_pro = true)
    )
    FROM artists
    WHERE deleted_at IS NULL
  );
END;
$$;


ALTER FUNCTION "public"."get_artist_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_artist_stats"() IS 'Returns aggregate counts by tier for admin dashboard (total, unclaimed, free, pro).';



CREATE OR REPLACE FUNCTION "public"."get_artist_subscription_status"("p_artist_id" "uuid") RETURNS TABLE("subscription_type" "text", "status" "text", "is_active" boolean, "current_period_end" timestamp with time zone)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    subscription_type,
    status,
    (status = 'active' AND current_period_end > NOW()) as is_active,
    current_period_end
  FROM artist_subscriptions
  WHERE artist_id = p_artist_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_artist_subscription_status"("p_artist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_artist_tier_counts"() RETURNS TABLE("total" bigint, "unclaimed" bigint, "claimed_free" bigint, "pro" bigint, "featured" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'unclaimed') as unclaimed,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND verification_status = 'claimed' AND is_pro = false) as claimed_free,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_pro = true) as pro,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_featured = true) as featured
  FROM artists;
END;
$$;


ALTER FUNCTION "public"."get_artist_tier_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_artist_tier_counts"() IS 'Returns artist counts by tier in a single query (replaces 5 separate COUNT queries)';



CREATE OR REPLACE FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer DEFAULT 0, "p_limit" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_location_city" "text" DEFAULT NULL::"text", "p_location_state" "text" DEFAULT NULL::"text", "p_tier" "text" DEFAULT NULL::"text", "p_is_featured" boolean DEFAULT NULL::boolean, "p_has_images" boolean DEFAULT NULL::boolean, "p_sort_by" "text" DEFAULT 'instagram_handle'::"text", "p_sort_order" "text" DEFAULT 'asc'::"text", "p_min_followers" integer DEFAULT NULL::integer, "p_max_followers" integer DEFAULT NULL::integer, "p_min_images" integer DEFAULT NULL::integer, "p_max_images" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "name" "text", "instagram_handle" "text", "city" "text", "state" "text", "is_featured" boolean, "is_pro" boolean, "verification_status" "text", "follower_count" integer, "slug" "text", "deleted_at" timestamp with time zone, "image_count" bigint, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH artist_images AS (
    SELECT
      a.id AS ai_id,
      a.name AS ai_name,
      a.instagram_handle AS ai_instagram_handle,
      COALESCE(al.city, '') AS ai_city,
      COALESCE(al.region, '') AS ai_state,
      a.is_featured AS ai_is_featured,
      a.is_pro AS ai_is_pro,
      a.verification_status::TEXT AS ai_verification_status,
      a.follower_count AS ai_follower_count,
      a.slug AS ai_slug,
      a.deleted_at AS ai_deleted_at,
      COUNT(pi.id) FILTER (WHERE pi.hidden = false) AS ai_image_count
    FROM artists a
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    LEFT JOIN portfolio_images pi ON a.id = pi.artist_id
    WHERE a.deleted_at IS NULL
      AND (
        p_search IS NULL
        OR a.name ILIKE '%' || p_search || '%'
        OR a.instagram_handle ILIKE '%' || p_search || '%'
      )
      AND (p_location_city IS NULL OR al.city = p_location_city)
      AND (p_location_state IS NULL OR al.region = p_location_state)
      AND (
        p_tier IS NULL
        OR (p_tier = 'unclaimed' AND a.verification_status = 'unclaimed')
        OR (p_tier = 'free' AND a.verification_status = 'claimed' AND a.is_pro = false)
        OR (p_tier = 'pro' AND a.verification_status = 'claimed' AND a.is_pro = true)
      )
      AND (p_is_featured IS NULL OR a.is_featured = p_is_featured)
      AND (p_min_followers IS NULL OR a.follower_count >= p_min_followers)
      AND (p_max_followers IS NULL OR a.follower_count <= p_max_followers)
    GROUP BY a.id, al.city, al.region
  )
  SELECT
    ai.ai_id,
    ai.ai_name,
    ai.ai_instagram_handle,
    ai.ai_city,
    ai.ai_state,
    ai.ai_is_featured,
    ai.ai_is_pro,
    ai.ai_verification_status,
    ai.ai_follower_count,
    ai.ai_slug,
    ai.ai_deleted_at,
    ai.ai_image_count,
    COUNT(*) OVER() AS total_count
  FROM artist_images ai
  WHERE
    (p_has_images IS NULL
      OR (p_has_images = true AND ai.ai_image_count > 0)
      OR (p_has_images = false AND ai.ai_image_count = 0))
    AND (p_min_images IS NULL OR ai.ai_image_count >= p_min_images)
    AND (p_max_images IS NULL OR ai.ai_image_count <= p_max_images)
  ORDER BY
    -- Numeric sorting (image_count, follower_count, is_featured)
    CASE WHEN p_sort_by = 'image_count' AND p_sort_order = 'asc' THEN ai.ai_image_count END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'image_count' AND p_sort_order = 'desc' THEN ai.ai_image_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'follower_count' AND p_sort_order = 'asc' THEN ai.ai_follower_count END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'follower_count' AND p_sort_order = 'desc' THEN ai.ai_follower_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'is_featured' AND p_sort_order = 'asc' THEN ai.ai_is_featured::int END ASC,
    CASE WHEN p_sort_by = 'is_featured' AND p_sort_order = 'desc' THEN ai.ai_is_featured::int END DESC,
    -- Text sorting (instagram_handle, name, city, verification_status)
    CASE WHEN p_sort_by IN ('instagram_handle', 'name', 'city', 'verification_status') AND p_sort_order = 'asc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
      END
    END ASC NULLS LAST,
    CASE WHEN p_sort_by IN ('instagram_handle', 'name', 'city', 'verification_status') AND p_sort_order = 'desc' THEN
      CASE p_sort_by
        WHEN 'instagram_handle' THEN ai.ai_instagram_handle
        WHEN 'name' THEN ai.ai_name
        WHEN 'city' THEN ai.ai_city
        WHEN 'verification_status' THEN ai.ai_verification_status
      END
    END DESC NULLS LAST,
    -- Default fallback
    ai.ai_instagram_handle ASC NULLS LAST
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer, "p_limit" integer, "p_search" "text", "p_location_city" "text", "p_location_state" "text", "p_tier" "text", "p_is_featured" boolean, "p_has_images" boolean, "p_sort_by" "text", "p_sort_order" "text", "p_min_followers" integer, "p_max_followers" integer, "p_min_images" integer, "p_max_images" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer, "p_limit" integer, "p_search" "text", "p_location_city" "text", "p_location_state" "text", "p_tier" "text", "p_is_featured" boolean, "p_has_images" boolean, "p_sort_by" "text", "p_sort_order" "text", "p_min_followers" integer, "p_max_followers" integer, "p_min_images" integer, "p_max_images" integer) IS 'Returns paginated artist list with image counts for admin dashboard.';



CREATE OR REPLACE FUNCTION "public"."get_cities_with_counts"("min_count" integer DEFAULT 5, "p_country_code" "text" DEFAULT NULL::"text", "p_region" "text" DEFAULT NULL::"text") RETURNS TABLE("city" "text", "region" "text", "country_code" "text", "artist_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
  IF p_country_code IS NOT NULL AND p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  IF p_country_code IS NOT NULL AND is_gdpr_country(p_country_code) THEN
    RETURN;
  END IF;

  IF p_region IS NOT NULL AND p_region !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid region format.';
  END IF;

  IF min_count < 0 OR min_count > 10000 THEN
    RAISE EXCEPTION 'Invalid min_count value.';
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.city as city,
    al.region as region,
    al.country_code as country_code,
    COUNT(DISTINCT al.artist_id)::bigint AS artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND (p_country_code IS NULL OR al.country_code = UPPER(p_country_code))
    AND (p_region IS NULL OR LOWER(al.region) = LOWER(p_region))
    AND NOT is_gdpr_country(al.country_code)
  GROUP BY al.city, al.region, al.country_code
  HAVING COUNT(DISTINCT al.artist_id) >= min_count
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$_$;


ALTER FUNCTION "public"."get_cities_with_counts"("min_count" integer, "p_country_code" "text", "p_region" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cities_with_counts"("min_count" integer, "p_country_code" "text", "p_region" "text") IS 'Returns cities with artist counts. Excludes GDPR countries.';



CREATE OR REPLACE FUNCTION "public"."get_countries_with_counts"() RETURNS TABLE("country_code" "text", "country_name" "text", "artist_count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  WITH country_counts AS (
    SELECT
      COALESCE(al.country_code, 'US') as code,
      COUNT(DISTINCT al.artist_id)::bigint as cnt
    FROM artist_locations al
    INNER JOIN artists a ON a.id = al.artist_id
    WHERE a.deleted_at IS NULL
      AND NOT is_gdpr_country(COALESCE(al.country_code, 'US'))
    GROUP BY al.country_code
    HAVING COUNT(DISTINCT al.artist_id) >= 1
  )
  SELECT
    cc.code as country_code,
    COALESCE(
      (SELECT DISTINCT l.country_name FROM locations l WHERE l.country_code = cc.code LIMIT 1),
      cc.code
    ) as country_name,
    cc.cnt as artist_count
  FROM country_counts cc
  ORDER BY cc.cnt DESC;
$$;


ALTER FUNCTION "public"."get_countries_with_counts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_countries_with_counts"() IS 'Returns countries with artist counts. Excludes GDPR countries.';



CREATE OR REPLACE FUNCTION "public"."get_decrypted_token"("p_user_id" "uuid", "p_encryption_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT pgp_sym_decrypt(encrypted_token, p_encryption_key)
  INTO v_token
  FROM encrypted_instagram_tokens
  WHERE user_id = p_user_id;

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."get_decrypted_token"("p_user_id" "uuid", "p_encryption_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_homepage_stats"() RETURNS TABLE("artist_count" bigint, "image_count" bigint, "city_count" bigint, "country_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM artists WHERE deleted_at IS NULL)::bigint AS artist_count,
    (SELECT COUNT(*) FROM portfolio_images WHERE status = 'active')::bigint AS image_count,
    (SELECT COUNT(DISTINCT city) FROM artist_locations WHERE country_code = 'US')::bigint AS city_count,
    (SELECT COUNT(DISTINCT al.country_code)
     FROM artist_locations al
     INNER JOIN artists a ON a.id = al.artist_id
     WHERE a.deleted_at IS NULL
       AND al.country_code IS NOT NULL
       AND NOT is_gdpr_country(al.country_code))::bigint AS country_count;
END;
$$;


ALTER FUNCTION "public"."get_homepage_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_homepage_stats"() IS 'Returns aggregate counts (artists, images, cities, countries) for homepage hero section.';



CREATE OR REPLACE FUNCTION "public"."get_mining_city_distribution"() RETURNS json
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_object_agg(city, count), '{}'::JSON)
    FROM (
      SELECT
        city,
        COUNT(*) as count
      FROM artists
      WHERE discovery_source LIKE '%mining%'
        AND deleted_at IS NULL
        AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
    ) subquery
  );
END;
$$;


ALTER FUNCTION "public"."get_mining_city_distribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mining_stats"() RETURNS json
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  hashtag_stats JSON;
  follower_stats JSON;
  totals JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'postsScraped', COALESCE(SUM(posts_scraped) FILTER (WHERE status = 'completed'), 0),
    'handlesFound', COALESCE(SUM(unique_handles_found) FILTER (WHERE status = 'completed'), 0),
    'bioFilterPassed', COALESCE(SUM(bio_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'imageFilterPassed', COALESCE(SUM(image_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'artistsInserted', COALESCE(SUM(artists_inserted) FILTER (WHERE status = 'completed'), 0),
    'estimatedApifyCost', COALESCE(SUM(apify_cost_estimate) FILTER (WHERE status = 'completed'), 0),
    'estimatedOpenAICost', COALESCE(SUM(openai_cost_estimate) FILTER (WHERE status = 'completed'), 0)
  ) INTO hashtag_stats
  FROM hashtag_mining_runs;

  SELECT json_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'running', COUNT(*) FILTER (WHERE status = 'running'),
    'followersScraped', COALESCE(SUM(followers_scraped) FILTER (WHERE status = 'completed'), 0),
    'bioFilterPassed', COALESCE(SUM(bio_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'imageFilterPassed', COALESCE(SUM(image_filter_passed) FILTER (WHERE status = 'completed'), 0),
    'artistsInserted', COALESCE(SUM(artists_inserted) FILTER (WHERE status = 'completed'), 0),
    'skippedPrivate', COALESCE(SUM(artists_skipped_private) FILTER (WHERE status = 'completed'), 0),
    'estimatedApifyCost', COALESCE(SUM(apify_cost_estimate) FILTER (WHERE status = 'completed'), 0),
    'estimatedOpenAICost', COALESCE(SUM(openai_cost_estimate) FILTER (WHERE status = 'completed'), 0)
  ) INTO follower_stats
  FROM follower_mining_runs;

  SELECT json_build_object(
    'artistsInserted',
      COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
      COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0),
    'estimatedApifyCost',
      COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0),
    'estimatedOpenAICost',
      COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0),
    'estimatedTotalCost',
      COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0) +
      COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
      COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0),
    'costPerArtist',
      CASE
        WHEN (COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
              COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0)) > 0
        THEN (COALESCE((hashtag_stats->>'estimatedApifyCost')::NUMERIC, 0) +
              COALESCE((follower_stats->>'estimatedApifyCost')::NUMERIC, 0) +
              COALESCE((hashtag_stats->>'estimatedOpenAICost')::NUMERIC, 0) +
              COALESCE((follower_stats->>'estimatedOpenAICost')::NUMERIC, 0)) /
             (COALESCE((hashtag_stats->>'artistsInserted')::NUMERIC, 0) +
              COALESCE((follower_stats->>'artistsInserted')::NUMERIC, 0))
        ELSE 0
      END
  ) INTO totals;

  RETURN json_build_object(
    'hashtag', hashtag_stats,
    'follower', follower_stats,
    'totals', totals
  );
END;
$$;


ALTER FUNCTION "public"."get_mining_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer DEFAULT 20) RETURNS TABLE("sa_search_id" "uuid", "sa_rank_position" integer, "sa_similarity_score" double precision, "sa_boosted_score" double precision, "sa_created_at" timestamp with time zone, "s_query_type" "text", "s_query_text" "text", "s_instagram_username" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  WITH recent_appearances AS (
    -- Use DISTINCT ON to ensure unique search_id (prevents duplicate key errors in UI)
    SELECT DISTINCT ON (sa.search_id)
      sa.search_id AS ra_search_id,
      sa.rank_position AS ra_rank_position,
      sa.similarity_score AS ra_similarity_score,
      sa.boosted_score AS ra_boosted_score,
      sa.created_at AS ra_created_at
    FROM search_appearances sa
    WHERE
      sa.artist_id = p_artist_id
      AND (p_days IS NULL OR sa.created_at >= NOW() - (p_days || ' days')::INTERVAL)
    ORDER BY sa.search_id, sa.created_at DESC
  )
  SELECT
    ra.ra_search_id,
    ra.ra_rank_position,
    ra.ra_similarity_score,
    ra.ra_boosted_score,
    ra.ra_created_at,
    s.query_type,
    s.query_text,
    s.instagram_username
  FROM recent_appearances ra
  INNER JOIN searches s ON s.id = ra.ra_search_id
  ORDER BY ra.ra_created_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer) IS 'Get recent search appearances for artist with query details. Uses DISTINCT ON to prevent duplicate search_id values.';



CREATE OR REPLACE FUNCTION "public"."get_regions_with_counts"("p_country_code" "text" DEFAULT 'US'::"text") RETURNS TABLE("region" "text", "region_name" "text", "artist_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
  IF p_country_code IS NULL OR p_country_code !~ '^[A-Za-z]{2}$' THEN
    RAISE EXCEPTION 'Invalid country code format. Must be 2 letters.';
  END IF;

  IF is_gdpr_country(p_country_code) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.region as region,
    al.region as region_name,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE al.region IS NOT NULL
    AND al.country_code = UPPER(p_country_code)
    AND a.deleted_at IS NULL
  GROUP BY al.region
  HAVING COUNT(DISTINCT al.artist_id) >= 1
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.region ASC;
END;
$_$;


ALTER FUNCTION "public"."get_regions_with_counts"("p_country_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_regions_with_counts"("p_country_code" "text") IS 'Returns regions/states within a country with artist counts. Excludes GDPR countries.';



CREATE OR REPLACE FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.15) RETURNS TABLE("location_type" "text", "country_code" "text", "region" "text", "city" "text", "artist_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  -- Step 1: Vector search to find matching images (same as main search)
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      1 - (pi.embedding <=> query_embedding) as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 2000
  ),
  threshold_images AS (
    SELECT DISTINCT ri_artist_id
    FROM ranked_images
    WHERE ri_similarity_score >= match_threshold
  ),
  -- Step 2: Get matching artists with their primary locations
  matching_artists AS (
    SELECT DISTINCT
      a.id as artist_id,
      al.country_code as al_country_code,
      al.region as al_region,
      al.city as al_city
    FROM artists a
    INNER JOIN threshold_images ti ON a.id = ti.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND (al.country_code IS NULL OR NOT is_gdpr_country(al.country_code))
  ),
  -- Step 3: Aggregate by country
  country_counts AS (
    SELECT
      'country'::text as loc_type,
      ma.al_country_code,
      NULL::text as loc_region,
      NULL::text as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_country_code IS NOT NULL
    GROUP BY ma.al_country_code
  ),
  -- Step 4: Aggregate by region (only US for now)
  region_counts AS (
    SELECT
      'region'::text as loc_type,
      ma.al_country_code,
      ma.al_region as loc_region,
      NULL::text as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_country_code = 'US'
      AND ma.al_region IS NOT NULL
    GROUP BY ma.al_country_code, ma.al_region
  ),
  -- Step 5: Aggregate by city
  city_counts AS (
    SELECT
      'city'::text as loc_type,
      ma.al_country_code,
      ma.al_region as loc_region,
      ma.al_city as loc_city,
      COUNT(DISTINCT ma.artist_id) as cnt
    FROM matching_artists ma
    WHERE ma.al_city IS NOT NULL
    GROUP BY ma.al_country_code, ma.al_region, ma.al_city
  )
  -- Combine all location types
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM country_counts
  UNION ALL
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM region_counts
  UNION ALL
  SELECT loc_type, al_country_code, loc_region, loc_city, cnt
  FROM city_counts
  ORDER BY cnt DESC;
END;
$$;


ALTER FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision) IS 'Returns location counts filtered by search embedding. Only includes locations with matching artists.';



CREATE OR REPLACE FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") RETURNS TABLE("city" "text", "artist_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $_$
BEGIN
  IF state_code IS NULL OR state_code !~ '^[A-Za-z0-9\s\-]+$' THEN
    RAISE EXCEPTION 'Invalid state_code format.';
  END IF;

  RETURN QUERY
  WITH artists_with_images AS (
    SELECT DISTINCT pi.artist_id
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.storage_thumb_640 IS NOT NULL
  )
  SELECT
    al.city as city,
    COUNT(DISTINCT al.artist_id)::bigint as artist_count
  FROM artist_locations al
  INNER JOIN artists a ON a.id = al.artist_id
  INNER JOIN artists_with_images awi ON awi.artist_id = a.id
  WHERE LOWER(al.region) = LOWER(state_code)
    AND al.city IS NOT NULL
    AND a.deleted_at IS NULL
    AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  GROUP BY al.city
  ORDER BY COUNT(DISTINCT al.artist_id) DESC, al.city ASC;
END;
$_$;


ALTER FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") IS 'Get cities within a state/region with artist counts.';



CREATE OR REPLACE FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer DEFAULT 25) RETURNS TABLE("artist_id" "uuid", "artist_name" "text", "instagram_handle" "text", "city" "text", "state" "text", "similarity_score" double precision, "best_image_url" "text", "is_pro" boolean, "is_featured" boolean)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
  style_embedding vector(768);
BEGIN
  IF p_style_slug IS NULL OR p_style_slug !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Invalid style_slug format. Use lowercase with hyphens.';
  END IF;

  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100.';
  END IF;

  SELECT ss.embedding INTO style_embedding
  FROM style_seeds ss
  WHERE ss.style_name = p_style_slug;

  IF style_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.storage_thumb_640 as ri_thumbnail_url,
      1 - (pi.embedding <=> style_embedding) as ri_similarity
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> style_embedding
    LIMIT 500
  ),
  best_per_artist AS (
    SELECT DISTINCT ON (ri.ri_artist_id)
      ri.ri_artist_id as ba_artist_id,
      ri.ri_similarity as ba_similarity,
      ri.ri_thumbnail_url as ba_image_url
    FROM ranked_images ri
    ORDER BY ri.ri_artist_id, ri.ri_similarity DESC
  ),
  filtered_artists AS (
    SELECT DISTINCT ON (bpa.ba_artist_id)
      bpa.ba_artist_id as fa_artist_id,
      a.name as fa_name,
      a.instagram_handle as fa_handle,
      al.city as fa_city,
      al.region as fa_state,
      bpa.ba_similarity as fa_similarity,
      bpa.ba_image_url as fa_image_url,
      COALESCE(a.is_pro, FALSE) as fa_is_pro,
      COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM best_per_artist bpa
    INNER JOIN artists a ON a.id = bpa.ba_artist_id
    INNER JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
  )
  SELECT
    fa.fa_artist_id,
    fa.fa_name,
    fa.fa_handle,
    fa.fa_city,
    fa.fa_state,
    fa.fa_similarity,
    fa.fa_image_url,
    fa.fa_is_pro,
    fa.fa_is_featured
  FROM filtered_artists fa
  ORDER BY fa.fa_similarity DESC
  LIMIT p_limit;
END;
$_$;


ALTER FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer) IS 'Returns top N artists ranked by similarity to a style seed. Used for marketing curation.';



CREATE OR REPLACE FUNCTION "public"."increment_booking_click"("p_artist_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, booking_link_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET booking_link_clicks = artist_analytics.booking_link_clicks + 1;
END;
$$;


ALTER FUNCTION "public"."increment_booking_click"("p_artist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_image_view"("p_image_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_artist_id UUID;
BEGIN
  -- Get artist_id from portfolio_images table
  SELECT artist_id INTO v_artist_id
  FROM portfolio_images
  WHERE id = p_image_id;

  -- Raise exception if image not found
  IF v_artist_id IS NULL THEN
    RAISE EXCEPTION 'Image not found: %', p_image_id;
  END IF;

  -- Increment image-level view count (portfolio_image_analytics)
  -- Use ON CONFLICT for atomic upsert operation
  INSERT INTO portfolio_image_analytics (image_id, artist_id, date, view_count)
  VALUES (p_image_id, v_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (image_id, date)
  DO UPDATE SET
    view_count = portfolio_image_analytics.view_count + 1;

  -- Also increment artist-level image_views aggregate (artist_analytics)
  -- This provides a total count across all images for the artist
  INSERT INTO artist_analytics (artist_id, date, image_views)
  VALUES (v_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET
    image_views = artist_analytics.image_views + 1;

END;
$$;


ALTER FUNCTION "public"."increment_image_view"("p_image_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_image_view"("p_image_id" "uuid") IS 'Increment view count for a specific image (both image-level and artist-level aggregates)';



CREATE OR REPLACE FUNCTION "public"."increment_instagram_click"("p_artist_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, instagram_clicks)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET instagram_clicks = artist_analytics.instagram_clicks + 1;
END;
$$;


ALTER FUNCTION "public"."increment_instagram_click"("p_artist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_pipeline_progress"("run_id" "uuid", "processed_delta" integer, "failed_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE pipeline_runs
  SET
    processed_items = COALESCE(processed_items, 0) + processed_delta,
    failed_items = COALESCE(failed_items, 0) + failed_delta,
    updated_at = now()
  WHERE id = run_id;
END;
$$;


ALTER FUNCTION "public"."increment_pipeline_progress"("run_id" "uuid", "processed_delta" integer, "failed_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_profile_view"("p_artist_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO artist_analytics (artist_id, date, profile_views)
  VALUES (p_artist_id, CURRENT_DATE, 1)
  ON CONFLICT (artist_id, date)
  DO UPDATE SET profile_views = artist_analytics.profile_views + 1;
END;
$$;


ALTER FUNCTION "public"."increment_profile_view"("p_artist_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO artist_analytics (artist_id, date, search_appearances)
  SELECT unnest(p_artist_ids), CURRENT_DATE, 1
  ON CONFLICT (artist_id, date)
  DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
$$;


ALTER FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) IS 'Batch increment search appearances for multiple artists (optimized with single INSERT)';



CREATE OR REPLACE FUNCTION "public"."is_gdpr_country"("country_code" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
  SELECT UPPER(country_code) = ANY(ARRAY[
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO', 'GB', 'CH'
  ])
$$;


ALTER FUNCTION "public"."is_gdpr_country"("country_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_gdpr_country"("country_code" "text") IS 'Returns TRUE if country is subject to GDPR or equivalent privacy regulation. Includes EU 27, EEA 3, UK, and Switzerland.';



CREATE OR REPLACE FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text" DEFAULT NULL::"text", "p_resend_id" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO email_log (
    recipient_email,
    user_id,
    artist_id,
    email_type,
    subject,
    success,
    error_message,
    resend_id
  ) VALUES (
    p_recipient_email,
    p_user_id,
    p_artist_id,
    p_email_type,
    p_subject,
    p_success,
    p_error_message,
    p_resend_id
  ) RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text", "p_resend_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text", "p_resend_id" "text") IS 'Log an email send attempt with success/failure status';



CREATE OR REPLACE FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
  SELECT (
    (country_filter IS NULL AND region_filter IS NULL AND city_filter IS NULL)
    OR
    (country_filter IS NOT NULL AND region_filter IS NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter))
    OR
    (country_filter IS NOT NULL AND region_filter IS NOT NULL AND city_filter IS NULL
     AND p_country_code = UPPER(country_filter)
     AND LOWER(p_region) = LOWER(region_filter))
    OR
    (city_filter IS NOT NULL
     AND LOWER(p_city) = LOWER(city_filter)
     AND (country_filter IS NULL OR p_country_code = UPPER(country_filter))
     AND (region_filter IS NULL OR LOWER(p_region) = LOWER(region_filter)))
  )
$$;


ALTER FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") IS 'Checks if a location matches the given filter criteria. Used by search and count functions to avoid duplicating filter logic.';



CREATE OR REPLACE FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete existing profiles for this artist that won't be replaced
  -- (We'll upsert the new ones, so this just cleans up any orphaned styles)
  DELETE FROM artist_style_profiles
  WHERE artist_id = p_artist_id
    AND style_name NOT IN (
      SELECT ist.style_name
      FROM image_style_tags ist
      JOIN portfolio_images pi ON pi.id = ist.image_id
      WHERE pi.artist_id = p_artist_id
        AND pi.status = 'active'
    );

  -- Upsert with per-taxonomy percentages (matching compute-artist-profiles.ts logic)
  -- Uses ON CONFLICT to handle concurrent executions gracefully
  INSERT INTO artist_style_profiles (artist_id, style_name, taxonomy, percentage, image_count)
  WITH artist_tags AS (
    SELECT
      ist.style_name,
      COALESCE(ist.taxonomy, 'technique') as taxonomy,
      COUNT(*) as tag_count
    FROM image_style_tags ist
    JOIN portfolio_images pi ON pi.id = ist.image_id
    WHERE pi.artist_id = p_artist_id
      AND pi.status = 'active'
    GROUP BY ist.style_name, ist.taxonomy
  ),
  taxonomy_totals AS (
    SELECT taxonomy, SUM(tag_count) as total
    FROM artist_tags
    GROUP BY taxonomy
  )
  SELECT
    p_artist_id,
    at.style_name,
    at.taxonomy,
    (at.tag_count::float / NULLIF(tt.total, 0) * 100) as percentage,
    at.tag_count as image_count
  FROM artist_tags at
  JOIN taxonomy_totals tt ON tt.taxonomy = at.taxonomy
  ON CONFLICT (artist_id, style_name) DO UPDATE SET
    taxonomy = EXCLUDED.taxonomy,
    percentage = EXCLUDED.percentage,
    image_count = EXCLUDED.image_count,
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") IS 'Recomputes artist_style_profiles for a single artist. Uses UPSERT to handle concurrent executions safely.';



CREATE OR REPLACE FUNCTION "public"."recompute_artist_styles_on_image_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete existing profiles for this artist
  DELETE FROM artist_style_profiles WHERE artist_id = OLD.artist_id;

  -- Recompute from remaining image tags
  INSERT INTO artist_style_profiles (artist_id, style_name, taxonomy, percentage, image_count)
  SELECT
    OLD.artist_id,
    ist.style_name,
    'technique' as taxonomy,
    (COUNT(*)::float / NULLIF(total.cnt, 0) * 100) as percentage,
    COUNT(*) as image_count
  FROM image_style_tags ist
  JOIN portfolio_images pi ON pi.id = ist.image_id
  CROSS JOIN (
    SELECT COUNT(DISTINCT pi2.id) as cnt
    FROM portfolio_images pi2
    WHERE pi2.artist_id = OLD.artist_id
    AND pi2.status = 'active'
    AND pi2.id != OLD.id  -- Exclude the deleted image
  ) total
  WHERE pi.artist_id = OLD.artist_id
  AND pi.status = 'active'
  AND pi.id != OLD.id  -- Exclude the deleted image
  GROUP BY ist.style_name, total.cnt
  HAVING COUNT(*) > 0;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."recompute_artist_styles_on_image_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recompute_artist_styles_on_image_delete"() IS 'Recomputes artist_style_profiles when an image is deleted. Runs as SECURITY DEFINER to bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 20, "city_filter" "text" DEFAULT NULL::"text", "region_filter" "text" DEFAULT NULL::"text", "country_filter" "text" DEFAULT NULL::"text", "offset_param" integer DEFAULT 0, "query_techniques" "jsonb" DEFAULT NULL::"jsonb", "is_color_query" boolean DEFAULT NULL::boolean, "query_themes" "jsonb" DEFAULT NULL::"jsonb") RETURNS TABLE("artist_id" "uuid", "artist_name" "text", "artist_slug" "text", "city" "text", "region" "text", "country_code" "text", "profile_image_url" "text", "follower_count" integer, "shop_name" "text", "instagram_url" "text", "is_verified" boolean, "is_pro" boolean, "is_featured" boolean, "similarity" double precision, "style_boost" double precision, "color_boost" double precision, "theme_boost" double precision, "boosted_score" double precision, "max_likes" bigint, "matching_images" "jsonb", "total_count" bigint, "location_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_has_techniques boolean;
  v_has_themes boolean;
  v_technique_weight float := 0.20;  -- Increased from 0.15 - primary match
  v_theme_weight float := 0.10;       -- Secondary boost
  v_color_weight float := 0.10;
BEGIN
  v_has_techniques := query_techniques IS NOT NULL
    AND jsonb_typeof(query_techniques) = 'array'
    AND jsonb_array_length(query_techniques) > 0;

  v_has_themes := query_themes IS NOT NULL
    AND jsonb_typeof(query_themes) = 'array'
    AND jsonb_array_length(query_themes) > 0;

  RETURN QUERY
  -- Step 1: Vector search FIRST (uses index, fast)
  WITH ranked_images AS (
    SELECT
      pi.artist_id as ri_artist_id,
      pi.id as ri_image_id,
      pi.instagram_url as ri_image_url,
      pi.storage_thumb_640 as ri_thumbnail_url,
      pi.likes_count as ri_likes_count,
      pi.is_color as ri_is_color,
      1 - (pi.embedding <=> query_embedding) as ri_base_similarity,
      -- Color boost at image level
      (1 - (pi.embedding <=> query_embedding)) +
        CASE
          WHEN is_color_query IS NULL THEN 0.0
          WHEN is_color_query = pi.is_color THEN v_color_weight * 0.5
          ELSE 0.0
        END as ri_similarity_score
    FROM portfolio_images pi
    WHERE pi.status = 'active'
      AND pi.embedding IS NOT NULL
      AND COALESCE(pi.hidden, FALSE) = FALSE
    ORDER BY pi.embedding <=> query_embedding
    LIMIT 2000
  ),
  -- Step 2: Filter by threshold
  threshold_images AS (
    SELECT * FROM ranked_images
    WHERE ri_base_similarity >= match_threshold
  ),
  -- Step 3: Get candidate artist IDs
  candidate_artists AS (
    SELECT DISTINCT ri_artist_id FROM threshold_images
  ),
  -- Step 4: Filter artists (GDPR, location, deleted)
  filtered_artists AS (
    SELECT DISTINCT ON (a.id)
           a.id as fa_id,
           a.name as fa_name,
           a.slug as fa_slug,
           al.city as fa_city,
           al.region as fa_region,
           al.country_code as fa_country_code,
           a.profile_image_url as fa_profile_image_url,
           a.follower_count as fa_follower_count,
           a.shop_name as fa_shop_name,
           a.instagram_url as fa_instagram_url,
           (a.verification_status = 'verified' OR a.verification_status = 'claimed') as fa_is_verified,
           COALESCE(a.is_pro, FALSE) as fa_is_pro,
           COALESCE(a.is_featured, FALSE) as fa_is_featured
    FROM artists a
    INNER JOIN candidate_artists ca ON a.id = ca.ri_artist_id
    LEFT JOIN artist_locations al ON al.artist_id = a.id AND al.is_primary = TRUE
    WHERE a.deleted_at IS NULL
      AND COALESCE(a.is_gdpr_blocked, FALSE) = FALSE
      AND matches_location_filter(al.city, al.region, al.country_code, city_filter, region_filter, country_filter)
  ),
  -- Step 5: Calculate TECHNIQUE boost per artist
  artist_technique_boost AS (
    SELECT
      fa.fa_id as atb_artist_id,
      CASE WHEN v_has_techniques THEN
        COALESCE(
          (
            SELECT SUM(
              (qt.confidence::float) * (asp.percentage / 100.0) * v_technique_weight
            )
            FROM jsonb_to_recordset(query_techniques) AS qt(style_name text, confidence float)
            INNER JOIN artist_style_profiles asp
              ON asp.artist_id = fa.fa_id
              AND asp.style_name = qt.style_name
              AND asp.taxonomy = 'technique'
          ),
          0.0
        )
      ELSE 0.0
      END as atb_technique_boost
    FROM filtered_artists fa
  ),
  -- Step 6: Calculate THEME boost per artist (NEW)
  artist_theme_boost AS (
    SELECT
      fa.fa_id as athb_artist_id,
      CASE WHEN v_has_themes THEN
        COALESCE(
          (
            SELECT SUM(
              (qt.confidence::float) * (asp.percentage / 100.0) * v_theme_weight
            )
            FROM jsonb_to_recordset(query_themes) AS qt(style_name text, confidence float)
            INNER JOIN artist_style_profiles asp
              ON asp.artist_id = fa.fa_id
              AND asp.style_name = qt.style_name
              AND asp.taxonomy = 'theme'
          ),
          0.0
        )
      ELSE 0.0
      END as athb_theme_boost
    FROM filtered_artists fa
  ),
  -- Step 7: Calculate color boost per artist (aggregated from image-level)
  artist_color_boost AS (
    SELECT
      ti.ri_artist_id as acb_artist_id,
      CASE
        WHEN is_color_query IS NULL THEN 0.0
        ELSE AVG(
          CASE WHEN is_color_query = ti.ri_is_color THEN v_color_weight * 0.5 ELSE 0.0 END
        )
      END as acb_color_boost
    FROM threshold_images ti
    GROUP BY ti.ri_artist_id
  ),
  -- Step 8: Rank images per artist (top 3)
  artist_ranked_images AS (
    SELECT
      ti.*,
      ROW_NUMBER() OVER (
        PARTITION BY ti.ri_artist_id
        ORDER BY ti.ri_similarity_score DESC
      ) as rank_in_artist
    FROM threshold_images ti
    INNER JOIN filtered_artists fa ON ti.ri_artist_id = fa.fa_id
  ),
  -- Step 9: Aggregate per artist
  aggregated_artists AS (
    SELECT
      ari.ri_artist_id as aa_artist_id,
      MAX(ari.ri_similarity_score) as aa_best_similarity,
      MAX(COALESCE(ari.ri_likes_count, 0))::bigint as aa_max_likes,
      jsonb_agg(
        jsonb_build_object(
          'image_id', ari.ri_image_id,
          'image_url', ari.ri_image_url,
          'thumbnail_url', ari.ri_thumbnail_url,
          'likes_count', ari.ri_likes_count,
          'similarity', ROUND(ari.ri_similarity_score::numeric, 3)
        )
        ORDER BY ari.ri_similarity_score DESC
      ) FILTER (WHERE ari.rank_in_artist <= 3) as aa_matching_images
    FROM artist_ranked_images ari
    GROUP BY ari.ri_artist_id
  ),
  -- Step 10: Apply all boosts (pro, featured, technique, theme, color)
  boosted_artists AS (
    SELECT
      aa.aa_artist_id as ba_artist_id,
      aa.aa_best_similarity,
      aa.aa_max_likes,
      aa.aa_matching_images,
      COALESCE(atb.atb_technique_boost, 0.0)::float as ba_technique_boost,
      COALESCE(athb.athb_theme_boost, 0.0)::float as ba_theme_boost,
      COALESCE(acb.acb_color_boost, 0.0)::float as ba_color_boost,
      aa.aa_best_similarity
        + CASE WHEN fa.fa_is_pro THEN 0.05 ELSE 0 END
        + CASE WHEN fa.fa_is_featured THEN 0.02 ELSE 0 END
        + COALESCE(atb.atb_technique_boost, 0.0)
        + COALESCE(athb.athb_theme_boost, 0.0)
        + COALESCE(acb.acb_color_boost, 0.0) as ba_boosted_score
    FROM aggregated_artists aa
    INNER JOIN filtered_artists fa ON fa.fa_id = aa.aa_artist_id
    LEFT JOIN artist_technique_boost atb ON atb.atb_artist_id = aa.aa_artist_id
    LEFT JOIN artist_theme_boost athb ON athb.athb_artist_id = aa.aa_artist_id
    LEFT JOIN artist_color_boost acb ON acb.acb_artist_id = aa.aa_artist_id
  ),
  -- Step 11: Total count for pagination
  total AS (
    SELECT COUNT(*) as cnt FROM aggregated_artists
  ),
  -- Step 12: Location counts per artist
  artist_location_counts AS (
    SELECT al.artist_id, COUNT(*) as loc_count
    FROM artist_locations al
    INNER JOIN boosted_artists ba ON al.artist_id = ba.ba_artist_id
    GROUP BY al.artist_id
  )
  -- Final SELECT
  SELECT
    fa.fa_id,
    fa.fa_name,
    fa.fa_slug,
    fa.fa_city,
    fa.fa_region,
    fa.fa_country_code,
    fa.fa_profile_image_url,
    fa.fa_follower_count,
    fa.fa_shop_name,
    fa.fa_instagram_url,
    fa.fa_is_verified,
    fa.fa_is_pro,
    fa.fa_is_featured,
    ba.aa_best_similarity,
    ba.ba_technique_boost,       -- style_boost now = technique_boost
    ba.ba_color_boost,
    ba.ba_theme_boost,           -- NEW column
    ba.ba_boosted_score,
    ba.aa_max_likes,
    ba.aa_matching_images,
    (SELECT cnt FROM total),
    COALESCE(alc.loc_count, 1)::bigint as location_count
  FROM boosted_artists ba
  INNER JOIN filtered_artists fa ON fa.fa_id = ba.ba_artist_id
  LEFT JOIN artist_location_counts alc ON alc.artist_id = fa.fa_id
  ORDER BY ba.ba_boosted_score DESC
  LIMIT match_count
  OFFSET offset_param;
END;
$$;


ALTER FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "city_filter" "text", "region_filter" "text", "country_filter" "text", "offset_param" integer, "query_techniques" "jsonb", "is_color_query" boolean, "query_themes" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "city_filter" "text", "region_filter" "text", "country_filter" "text", "offset_param" integer, "query_techniques" "jsonb", "is_color_query" boolean, "query_themes" "jsonb") IS 'Unified vector similarity search with technique + theme + color boosts. Techniques (0.20 weight) match artistic style, themes (0.10 weight) match subject matter.';



CREATE OR REPLACE FUNCTION "public"."store_encrypted_token"("p_user_id" "uuid", "p_token_data" "text", "p_encryption_key" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_token_id UUID;
BEGIN
  INSERT INTO encrypted_instagram_tokens (user_id, encrypted_token, updated_at)
  VALUES (
    p_user_id,
    pgp_sym_encrypt(p_token_data, p_encryption_key),
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    encrypted_token = pgp_sym_encrypt(p_token_data, p_encryption_key),
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  RETURN v_token_id;
END;
$$;


ALTER FUNCTION "public"."store_encrypted_token"("p_user_id" "uuid", "p_token_data" "text", "p_encryption_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_artist_to_locations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- No-op: city/state columns removed from artists table
  -- artist_locations is now source of truth
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_artist_to_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_primary_location"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- This trigger is now a no-op
  -- The city/state columns were removed from artists table
  -- All location data is managed in artist_locations table
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_primary_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_appearance JSONB;
    v_artist_id UUID;
  BEGIN
    FOR v_appearance IN
      SELECT *
      FROM jsonb_array_elements (p_appearances)
    LOOP
      v_artist_id := (v_appearance->>'artist_id')::UUID;

      INSERT INTO search_appearances (
        search_id,
        artist_id,
        rank_position,
        similarity_score,
        boosted_score,
        matching_images_count,
        created_at
      ) VALUES (
        p_search_id,
        v_artist_id,
        (v_appearance->>'rank')::INTEGER,
        (v_appearance->>'similarity')::FLOAT,
        (v_appearance->>'boosted_score')::FLOAT,
        COALESCE ((v_appearance->>'image_count')::INTEGER, 3),
        NOW ()
      );

      INSERT INTO artist_analytics (artist_id, date, search_appearances)
      VALUES (v_artist_id, CURRENT_DATE, 1)
      ON CONFLICT (artist_id, date)
      DO UPDATE SET search_appearances = artist_analytics.search_appearances + 1;
    END LOOP;
  END;
  $$;


ALTER FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") IS 'Track individual search appearances + daily aggregate counts';



CREATE OR REPLACE FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean DEFAULT true, "p_reason" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_pref_id UUID;
BEGIN
  INSERT INTO email_preferences (
    email,
    unsubscribed_all,
    unsubscribed_at,
    unsubscribe_reason
  ) VALUES (
    p_email,
    p_unsubscribe_all,
    NOW(),
    p_reason
  )
  ON CONFLICT (email) DO UPDATE SET
    unsubscribed_all = p_unsubscribe_all,
    unsubscribed_at = NOW(),
    unsubscribe_reason = COALESCE(EXCLUDED.unsubscribe_reason, email_preferences.unsubscribe_reason),
    updated_at = NOW()
  RETURNING id INTO v_pref_id;
  RETURN v_pref_id;
END;
$$;


ALTER FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean, "p_reason" "text") IS 'Unsubscribe user from emails';



CREATE OR REPLACE FUNCTION "public"."update_artist_locations"("p_artist_id" "uuid", "p_locations" "jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  loc JSONB;
  i INTEGER := 0;
BEGIN
  -- Verify caller owns this artist
  -- Use p_user_id if provided (from API route), fall back to auth.uid() (for direct calls)
  IF NOT EXISTS (
    SELECT 1 FROM artists a
    WHERE a.id = p_artist_id
      AND a.claimed_by_user_id = COALESCE(p_user_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this artist profile';
  END IF;

  -- Delete all existing locations for this artist
  DELETE FROM artist_locations WHERE artist_id = p_artist_id;

  -- Insert new locations
  FOR loc IN SELECT * FROM jsonb_array_elements(p_locations)
  LOOP
    INSERT INTO artist_locations (
      artist_id,
      city,
      region,
      country_code,
      location_type,
      is_primary,
      display_order
    ) VALUES (
      p_artist_id,
      loc->>'city',
      loc->>'region',
      COALESCE(loc->>'country_code', 'US'),
      (loc->>'location_type')::text,
      COALESCE((loc->>'is_primary')::boolean, i = 0),
      COALESCE((loc->>'display_order')::integer, i)
    );
    i := i + 1;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."update_artist_locations"("p_artist_id" "uuid", "p_locations" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_artist_pipeline_on_embedding"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    -- Only run when embedding changes from NULL to a value
    IF OLD.embedding IS NULL AND NEW.embedding IS NOT NULL THEN
      -- Check if ALL images for this artist now have embeddings
      IF NOT EXISTS (
        SELECT 1 FROM portfolio_images
        WHERE artist_id = NEW.artist_id
        AND embedding IS NULL
        AND status != 'deleted'
      ) THEN
        -- All images have embeddings, mark artist complete
        UPDATE artists
        SET pipeline_status = 'complete'
        WHERE id = NEW.artist_id
        AND pipeline_status = 'pending_embeddings';
      END IF;
    END IF;

    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_artist_pipeline_on_embedding"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_artist_pipeline_on_embedding"() IS 'Auto-updates artist pipeline_status to complete when all their images 
  have embeddings';



CREATE OR REPLACE FUNCTION "public"."update_artist_styles_on_tag_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_artist_id uuid;
  v_affected_artists uuid[];
BEGIN
  -- Collect all unique artist IDs affected by this statement
  -- Uses transition tables (new_table for INSERT/UPDATE, old_table for UPDATE/DELETE)

  IF TG_OP = 'INSERT' THEN
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM new_table nt
    JOIN portfolio_images pi ON pi.id = nt.image_id
    WHERE pi.artist_id IS NOT NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    -- For UPDATE, we need to handle both old and new image_ids (in case image_id changed)
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM (
      SELECT image_id FROM new_table
      UNION
      SELECT image_id FROM old_table
    ) changed
    JOIN portfolio_images pi ON pi.id = changed.image_id
    WHERE pi.artist_id IS NOT NULL;

  ELSIF TG_OP = 'DELETE' THEN
    -- For DELETE, check if the parent image still exists (skip cascade scenarios)
    -- When portfolio_image is deleted, its tags cascade delete but the image delete trigger handles recompute
    SELECT ARRAY_AGG(DISTINCT pi.artist_id) INTO v_affected_artists
    FROM old_table ot
    JOIN portfolio_images pi ON pi.id = ot.image_id  -- Only if image still exists
    WHERE pi.artist_id IS NOT NULL;
  END IF;

  -- Recompute for each affected artist (deduplicated)
  IF v_affected_artists IS NOT NULL THEN
    FOREACH v_artist_id IN ARRAY v_affected_artists
    LOOP
      PERFORM recompute_artist_styles(v_artist_id);
    END LOOP;
  END IF;

  RETURN NULL;  -- Ignored for statement-level AFTER triggers
END;
$$;


ALTER FUNCTION "public"."update_artist_styles_on_tag_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_artist_styles_on_tag_change"() IS 'Statement-level trigger function: Efficiently updates artist_style_profiles for all affected artists in a single statement. Uses transition tables to deduplicate and handle INSERT/UPDATE/DELETE.';



CREATE OR REPLACE FUNCTION "public"."update_marketing_outreach_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_marketing_outreach_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pipeline_runs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pipeline_runs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_training_label_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_training_label_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
DECLARE
  vault_id UUID;
BEGIN
  SELECT instagram_token_vault_id INTO vault_id
  FROM users
  WHERE id = user_id_param;
  IF vault_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE id = vault_id
  );
END;
$$;


ALTER FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") IS 'Check if a user has valid Instagram tokens stored in Vault.';



CREATE OR REPLACE FUNCTION "public"."validate_promo_code"("p_code" "text") RETURNS TABLE("id" "uuid", "discount_type" "text", "discount_value" integer, "is_valid" boolean)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  promo promo_codes%ROWTYPE;
  is_code_valid BOOLEAN := FALSE;
BEGIN
  SELECT * INTO promo FROM promo_codes WHERE code = p_code;
  IF FOUND
     AND promo.active
     AND (promo.expires_at IS NULL OR promo.expires_at >= NOW())
     AND (promo.max_uses IS NULL OR promo.current_uses < promo.max_uses) THEN
    is_code_valid := TRUE;
  END IF;
  IF is_code_valid THEN
    RETURN QUERY SELECT promo.id, promo.discount_type, promo.discount_value, TRUE;
  ELSE
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::INTEGER, FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_promo_code"("p_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_promo_code"("p_code" "text") IS 'Validate promo code with generic error (prevents timing attacks and code enumeration)';



CREATE OR REPLACE FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pgsodium'
    AS $$
DECLARE
  secret_id UUID;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (secret, name, description)
  RETURNING vault.secrets.id INTO secret_id;
  RETURN QUERY SELECT secret_id;
END;
$$;


ALTER FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text") IS 'Create encrypted secret in Supabase Vault. Returns UUID of created secret.';



CREATE OR REPLACE FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pgsodium'
    AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = secret_id;
END;
$$;


ALTER FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") IS 'Delete secret from Vault. Idempotent.';



CREATE OR REPLACE FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pgsodium'
    AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT decrypted_secret INTO decrypted
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  RETURN decrypted;
END;
$$;


ALTER FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") IS 'Retrieve and decrypt Vault secret. Returns NULL if not found.';



CREATE OR REPLACE FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pgsodium'
    AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = new_secret,
      updated_at = NOW()
  WHERE id = secret_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault secret % not found', secret_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") IS 'Update existing Vault secret. Throws exception if secret not found.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_email" "text" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "text",
    "old_value" "jsonb",
    "new_value" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_audit_log" IS 'Audit trail for all admin panel actions';



CREATE TABLE IF NOT EXISTS "public"."airtable_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_type" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "records_processed" integer DEFAULT 0,
    "records_created" integer DEFAULT 0,
    "records_updated" integer DEFAULT 0,
    "errors" "jsonb",
    "triggered_by" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."airtable_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artist_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid",
    "date" "date" NOT NULL,
    "profile_views" integer DEFAULT 0,
    "image_views" integer DEFAULT 0,
    "instagram_clicks" integer DEFAULT 0,
    "booking_link_clicks" integer DEFAULT 0,
    "search_appearances" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_booking_clicks_non_negative" CHECK (("booking_link_clicks" >= 0)),
    CONSTRAINT "check_image_views_non_negative" CHECK (("image_views" >= 0)),
    CONSTRAINT "check_instagram_clicks_non_negative" CHECK (("instagram_clicks" >= 0)),
    CONSTRAINT "check_profile_views_non_negative" CHECK (("profile_views" >= 0)),
    CONSTRAINT "check_search_appearances_non_negative" CHECK (("search_appearances" >= 0))
);


ALTER TABLE "public"."artist_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artist_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."artist_audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_audit_log" IS 'Audit trail for artist profile changes and portfolio imports';



CREATE TABLE IF NOT EXISTS "public"."artist_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "city" "text",
    "region" "text",
    "country_code" "text" DEFAULT 'US'::"text" NOT NULL,
    "location_type" "text" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "artist_locations_country_code_check" CHECK (("length"("country_code") = 2)),
    CONSTRAINT "artist_locations_location_type_check" CHECK (("location_type" = ANY (ARRAY['city'::"text", 'region'::"text", 'country'::"text"]))),
    CONSTRAINT "city_required_for_city_type" CHECK ((("location_type" <> 'city'::"text") OR ("city" IS NOT NULL))),
    CONSTRAINT "region_required_for_region_type" CHECK ((("location_type" <> 'region'::"text") OR ("region" IS NOT NULL)))
);


ALTER TABLE "public"."artist_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artist_pipeline_state" (
    "artist_id" "uuid" NOT NULL,
    "pipeline_status" "text" DEFAULT 'pending'::"text",
    "last_scraped_at" timestamp with time zone,
    "scrape_priority" integer DEFAULT 0,
    "scraping_blacklisted" boolean DEFAULT false,
    "exclude_from_scraping" boolean DEFAULT false,
    "blacklist_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artist_pipeline_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_pipeline_state" IS 'Stores scraping/embedding pipeline state. Used by Python scripts. Extracted from artists table.';



CREATE TABLE IF NOT EXISTS "public"."artist_recommendations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "instagram_handle" "text" NOT NULL,
    "instagram_id" "text",
    "bio" "text",
    "follower_count" integer,
    "classifier_result" "jsonb",
    "submitter_ip" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "artist_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."artist_recommendations" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_recommendations" IS 'Audit log of public artist submissions via /add-artist page. Classifier gate ensures quality before artist creation.';



COMMENT ON COLUMN "public"."artist_recommendations"."classifier_result" IS 'JSON: { passed: boolean, method: "bio"|"image", confidence: number, details: string }';



COMMENT ON COLUMN "public"."artist_recommendations"."status" IS 'Status: "approved" (artist created, scraping queued), "rejected" (failed classifier), "duplicate" (already exists)';



COMMENT ON COLUMN "public"."artist_recommendations"."artist_id" IS 'Foreign key to created artist record (NULL if rejected or duplicate)';



CREATE TABLE IF NOT EXISTS "public"."artist_style_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "style_name" "text" NOT NULL,
    "percentage" double precision NOT NULL,
    "image_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "taxonomy" "public"."style_taxonomy" DEFAULT 'technique'::"public"."style_taxonomy",
    CONSTRAINT "artist_style_profiles_percentage_check" CHECK ((("percentage" >= (0)::double precision) AND ("percentage" <= (100)::double precision)))
);


ALTER TABLE "public"."artist_style_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artist_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "artist_id" "uuid",
    "subscription_type" "text" NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "promo_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_subscription_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text"]))),
    CONSTRAINT "check_subscription_type" CHECK (("subscription_type" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."artist_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artist_sync_state" (
    "artist_id" "uuid" NOT NULL,
    "auto_sync_enabled" boolean DEFAULT false,
    "last_sync_at" timestamp with time zone,
    "last_sync_started_at" timestamp with time zone,
    "sync_in_progress" boolean DEFAULT false,
    "consecutive_failures" integer DEFAULT 0,
    "disabled_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artist_sync_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."artist_sync_state" IS 'Stores Instagram sync state for claimed artists. Extracted from artists table for cleaner schema.';



CREATE TABLE IF NOT EXISTS "public"."artists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "instagram_handle" "text" NOT NULL,
    "instagram_id" "text",
    "shop_name" "text",
    "profile_image_url" "text",
    "instagram_url" "text",
    "website_url" "text",
    "bio" "text",
    "google_place_id" "text",
    "discovery_source" "text",
    "verification_status" "text" DEFAULT 'unclaimed'::"text",
    "instagram_private" boolean DEFAULT false,
    "follower_count" integer,
    "claimed_by_user_id" "uuid",
    "claimed_at" timestamp with time zone,
    "verification_token" "text",
    "bio_override" "text",
    "contact_email" "text",
    "booking_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_pro" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "pricing_info" "text",
    "availability_status" "text",
    "deleted_at" timestamp with time zone,
    "blacklisted_at" timestamp with time zone,
    "is_test_account" boolean DEFAULT false,
    "filter_non_tattoo_content" boolean DEFAULT true,
    "is_gdpr_blocked" boolean DEFAULT false,
    "profile_storage_path" "text",
    "profile_storage_thumb_320" "text",
    "profile_storage_thumb_640" "text",
    "featured_at" timestamp with time zone,
    "featured_expires_at" timestamp with time zone,
    CONSTRAINT "check_availability_status" CHECK ((("availability_status" IS NULL) OR ("availability_status" = ANY (ARRAY['available'::"text", 'booking_soon'::"text", 'waitlist'::"text"])))),
    CONSTRAINT "check_verification_status" CHECK (("verification_status" = ANY (ARRAY['unclaimed'::"text", 'pending'::"text", 'verified'::"text", 'claimed'::"text"]))),
    CONSTRAINT "valid_booking_url" CHECK ((("booking_url" IS NULL) OR ("booking_url" ~* '^https?://'::"text"))),
    CONSTRAINT "valid_follower_count" CHECK ((("follower_count" IS NULL) OR ("follower_count" >= 0))),
    CONSTRAINT "valid_instagram_url" CHECK ((("instagram_url" IS NULL) OR ("instagram_url" ~* '^https?://'::"text"))),
    CONSTRAINT "valid_website_url" CHECK ((("website_url" IS NULL) OR ("website_url" ~* '^https?://'::"text")))
);


ALTER TABLE "public"."artists" OWNER TO "postgres";


COMMENT ON TABLE "public"."artists" IS 'Core artist profiles. Location data in artist_locations, sync state in artist_sync_state, pipeline state in artist_pipeline_state.';



COMMENT ON COLUMN "public"."artists"."blacklisted_at" IS 'When the artist was blacklisted';



COMMENT ON COLUMN "public"."artists"."is_test_account" IS 'Flag for test/development accounts. Excluded from search but accessible via direct URL.';



COMMENT ON COLUMN "public"."artists"."filter_non_tattoo_content" IS 'Pro feature: Filter non-tattoo content during auto-sync and manual import using GPT-5-mini classification. TRUE = filter enabled (default), FALSE = import all images.';



COMMENT ON COLUMN "public"."artists"."profile_storage_path" IS 'Supabase Storage path to original profile image (e.g., profiles/original/{artist_id}.jpg)';



COMMENT ON COLUMN "public"."artists"."profile_storage_thumb_320" IS 'Supabase Storage path to 320px WebP thumbnail';



COMMENT ON COLUMN "public"."artists"."profile_storage_thumb_640" IS 'Supabase Storage path to 640px WebP thumbnail';



COMMENT ON CONSTRAINT "check_verification_status" ON "public"."artists" IS 'Valid verification statuses: unclaimed (default), pending (verification requested), verified (manual verification), claimed (claimed via OAuth)';



CREATE TABLE IF NOT EXISTS "public"."artists_slug_backup" (
    "id" "uuid" NOT NULL,
    "old_slug" "text" NOT NULL,
    "instagram_handle" "text" NOT NULL,
    "backed_up_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."artists_slug_backup" OWNER TO "postgres";


COMMENT ON TABLE "public"."artists_slug_backup" IS 'Backup of old slugs before migration (2025-01-01). Safe to drop after verification.';



CREATE TABLE IF NOT EXISTS "public"."claim_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "instagram_handle_attempted" "text" NOT NULL,
    "artist_handle" "text" NOT NULL,
    "outcome" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."claim_attempts" IS 'Audit log for all claim attempts (successful and failed)';



CREATE TABLE IF NOT EXISTS "public"."country_editorial_content" (
    "country_code" character(2) NOT NULL,
    "hero_text" "text" NOT NULL,
    "scene_heading" "text",
    "scene_text" "text" NOT NULL,
    "tips_heading" "text",
    "tips_text" "text" NOT NULL,
    "keywords" "text"[] DEFAULT '{}'::"text"[],
    "major_cities" "text"[] DEFAULT '{}'::"text"[],
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "generated_by" "text" DEFAULT 'cron'::"text"
);


ALTER TABLE "public"."country_editorial_content" OWNER TO "postgres";


COMMENT ON TABLE "public"."country_editorial_content" IS 'Auto-generated SEO editorial content for country browse pages. Simpler than city content (~300 words).';



COMMENT ON COLUMN "public"."country_editorial_content"."country_code" IS 'ISO 3166-1 alpha-2 country code (e.g., MX, CA, JP)';



COMMENT ON COLUMN "public"."country_editorial_content"."hero_text" IS 'Hero introduction paragraph about the country''s tattoo culture (80-100 words)';



COMMENT ON COLUMN "public"."country_editorial_content"."scene_heading" IS 'Optional heading for the scene section';



COMMENT ON COLUMN "public"."country_editorial_content"."scene_text" IS 'Scene overview paragraph: major cities, style preferences, influences (100-120 words)';



COMMENT ON COLUMN "public"."country_editorial_content"."tips_heading" IS 'Optional heading for the tips section';



COMMENT ON COLUMN "public"."country_editorial_content"."tips_text" IS 'Practical searching tips paragraph (60-80 words)';



COMMENT ON COLUMN "public"."country_editorial_content"."keywords" IS 'SEO keywords for this country';



COMMENT ON COLUMN "public"."country_editorial_content"."major_cities" IS 'Major tattoo cities in this country';



COMMENT ON COLUMN "public"."country_editorial_content"."generated_at" IS 'Timestamp when content was generated';



COMMENT ON COLUMN "public"."country_editorial_content"."generated_by" IS 'Source of generation: cron, manual, or script name';



CREATE TABLE IF NOT EXISTS "public"."discovery_queries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "query" "text" NOT NULL,
    "city" "text" NOT NULL,
    "source" "text" NOT NULL,
    "results_count" integer DEFAULT 0,
    "artists_found" "text"[],
    "api_cost_estimate" numeric(10,4),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discovery_queries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_email" "text" NOT NULL,
    "user_id" "uuid",
    "artist_id" "uuid",
    "email_type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text",
    "resend_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_log_email_type_check" CHECK (("email_type" = ANY (ARRAY['welcome'::"text", 'sync_failed'::"text", 'sync_reauthenticate'::"text", 'subscription_created'::"text", 'subscription_cancelled'::"text", 'downgrade_warning'::"text", 'profile_deleted'::"text"])))
);


ALTER TABLE "public"."email_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_log" IS 'Audit trail of all emails sent by the system';



CREATE TABLE IF NOT EXISTS "public"."email_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "receive_welcome" boolean DEFAULT true NOT NULL,
    "receive_sync_notifications" boolean DEFAULT true NOT NULL,
    "receive_subscription_updates" boolean DEFAULT true NOT NULL,
    "receive_marketing" boolean DEFAULT false NOT NULL,
    "unsubscribed_all" boolean DEFAULT false NOT NULL,
    "unsubscribed_at" timestamp with time zone,
    "unsubscribe_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_preferences" IS 'User email subscription preferences and unsubscribe management';



CREATE TABLE IF NOT EXISTS "public"."encrypted_instagram_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "encrypted_data" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."encrypted_instagram_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follower_mining_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seed_account" "text" NOT NULL,
    "seed_type" "text",
    "followers_scraped" integer DEFAULT 0,
    "artists_skipped_private" integer DEFAULT 0,
    "bio_filter_passed" integer DEFAULT 0,
    "image_filter_passed" integer DEFAULT 0,
    "artists_inserted" integer DEFAULT 0,
    "apify_cost_estimate" numeric(10,4),
    "openai_cost_estimate" numeric(10,4),
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follower_mining_runs_seed_type_check" CHECK (("seed_type" = ANY (ARRAY['supply_company'::"text", 'convention'::"text", 'industry'::"text", 'macro_artist'::"text"]))),
    CONSTRAINT "follower_mining_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."follower_mining_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hashtag_mining_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hashtag" "text" NOT NULL,
    "posts_scraped" integer DEFAULT 0,
    "unique_handles_found" integer DEFAULT 0,
    "bio_filter_passed" integer DEFAULT 0,
    "image_filter_passed" integer DEFAULT 0,
    "artists_inserted" integer DEFAULT 0,
    "apify_cost_estimate" numeric(10,4),
    "openai_cost_estimate" numeric(10,4),
    "status" "text" DEFAULT 'pending'::"text",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hashtag_mining_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."hashtag_mining_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."image_style_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_id" "uuid" NOT NULL,
    "style_name" "text" NOT NULL,
    "confidence" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "taxonomy" "public"."style_taxonomy" DEFAULT 'technique'::"public"."style_taxonomy",
    "is_primary" boolean DEFAULT false,
    CONSTRAINT "image_style_tags_confidence_check" CHECK ((("confidence" >= (0)::double precision) AND ("confidence" <= (1)::double precision)))
);


ALTER TABLE "public"."image_style_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."image_style_tags" IS 'Style tags for portfolio images. Each image can have 0-3 style tags based on CLIP embedding similarity to style seeds.';



CREATE TABLE IF NOT EXISTS "public"."indexnow_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "urls" "text"[] NOT NULL,
    "url_count" integer NOT NULL,
    "engine" "text" NOT NULL,
    "trigger_source" "text" NOT NULL,
    "response_status" integer,
    "response_body" "jsonb",
    "triggered_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."indexnow_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."indexnow_submissions" IS 'Tracks IndexNow submissions to search engines for SEO auditing';



CREATE TABLE IF NOT EXISTS "public"."instagram_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid",
    "user_id" "uuid",
    "sync_type" "text" NOT NULL,
    "images_fetched" integer,
    "images_added" integer,
    "images_skipped" integer,
    "status" "text" NOT NULL,
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "check_image_counts_non_negative" CHECK ((("images_fetched" IS NULL) OR (("images_fetched" >= 0) AND ("images_added" IS NULL)) OR (("images_added" >= 0) AND ("images_skipped" IS NULL)) OR ("images_skipped" >= 0))),
    CONSTRAINT "check_sync_status" CHECK (("status" = ANY (ARRAY['success'::"text", 'partial'::"text", 'failed'::"text"]))),
    CONSTRAINT "check_sync_type" CHECK (("sync_type" = ANY (ARRAY['manual'::"text", 'auto'::"text", 'onboarding'::"text"])))
);


ALTER TABLE "public"."instagram_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text" NOT NULL,
    "city_ascii" "text" NOT NULL,
    "state_code" "text",
    "state_name" "text",
    "country_code" character(2) NOT NULL,
    "country_name" "text" NOT NULL,
    "population" integer,
    "lat" numeric(10,7),
    "lng" numeric(10,7),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Global database of cities for location selection. Initially populated with US cities from SimpleMaps.';



COMMENT ON COLUMN "public"."locations"."city_ascii" IS 'ASCII version of city name (no accents/special chars) for reliable searching';



COMMENT ON COLUMN "public"."locations"."state_code" IS 'State/province/region code. US uses 2-letter codes (TX, CA). Null for countries without states.';



COMMENT ON COLUMN "public"."locations"."population" IS 'City population. Used for filtering and sorting by relevance.';



CREATE TABLE IF NOT EXISTS "public"."marketing_outreach" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "campaign_name" "text" DEFAULT 'featured_artist_launch'::"text" NOT NULL,
    "outreach_type" "text" DEFAULT 'instagram_dm'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "post_text" "text",
    "post_images" "text"[],
    "paired_artist_id" "uuid",
    "similarity_score" double precision,
    "generated_at" timestamp with time zone,
    "posted_at" timestamp with time zone,
    "dm_sent_at" timestamp with time zone,
    "claimed_at" timestamp with time zone,
    "pro_granted_at" timestamp with time zone,
    "pro_expires_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "airtable_record_id" "text",
    "airtable_synced_at" timestamp with time zone,
    CONSTRAINT "marketing_outreach_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'generated'::"text", 'posted'::"text", 'dm_sent'::"text", 'claimed'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."marketing_outreach" OWNER TO "postgres";


COMMENT ON TABLE "public"."marketing_outreach" IS 'Tracks artist outreach campaigns for marketing and growth';



COMMENT ON COLUMN "public"."marketing_outreach"."status" IS 'Workflow stage: pending/generated/posted/dm_sent/claimed/converted';



COMMENT ON COLUMN "public"."marketing_outreach"."post_images" IS 'Array of Supabase Storage URLs for the post images';



COMMENT ON COLUMN "public"."marketing_outreach"."paired_artist_id" IS 'For Design Twins campaigns - the paired artist';



COMMENT ON COLUMN "public"."marketing_outreach"."similarity_score" IS 'CLIP similarity score for twins pairing';



CREATE TABLE IF NOT EXISTS "public"."mining_candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instagram_handle" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "uuid",
    "biography" "text",
    "follower_count" integer,
    "is_private" boolean DEFAULT false,
    "bio_filter_passed" boolean,
    "image_filter_passed" boolean,
    "extracted_city" "text",
    "extracted_state" "text",
    "location_confidence" "text",
    "processed_at" timestamp with time zone,
    "inserted_as_artist_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mining_candidates_location_confidence_check" CHECK (("location_confidence" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "mining_candidates_source_type_check" CHECK (("source_type" = ANY (ARRAY['hashtag'::"text", 'follower'::"text"])))
);


ALTER TABLE "public"."mining_candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."onboarding_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artist_id" "uuid",
    "fetched_images" "jsonb",
    "profile_data" "jsonb",
    "profile_updates" "jsonb",
    "booking_link" "text",
    "current_step" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    "fetch_status" "text" DEFAULT 'pending'::"text",
    "fetch_started_at" timestamp with time zone,
    "fetch_completed_at" timestamp with time zone,
    "fetch_error" "text",
    CONSTRAINT "onboarding_sessions_current_step_check" CHECK ((("current_step" >= 1) AND ("current_step" <= 2))),
    CONSTRAINT "onboarding_sessions_fetch_status_check" CHECK (("fetch_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."onboarding_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."onboarding_sessions" IS 'Temporary storage for artist onboarding state. Auto-expires after 24 hours.';



COMMENT ON COLUMN "public"."onboarding_sessions"."fetched_images" IS 'JSON array of Instagram images fetched during Step 1';



COMMENT ON COLUMN "public"."onboarding_sessions"."profile_data" IS 'JSON object with Instagram profile metadata';



COMMENT ON COLUMN "public"."onboarding_sessions"."profile_updates" IS 'JSON object with user edits to artist profile';



COMMENT ON COLUMN "public"."onboarding_sessions"."current_step" IS 'Current onboarding step (1=fetch, 2=preview, 3=portfolio, 4=booking, 5=complete)';



COMMENT ON COLUMN "public"."onboarding_sessions"."expires_at" IS 'Auto-cleanup timestamp. Sessions expire 24 hours after creation.';



COMMENT ON COLUMN "public"."onboarding_sessions"."fetch_status" IS 'Background Instagram fetch status: pending, in_progress, completed, failed';



COMMENT ON COLUMN "public"."onboarding_sessions"."fetch_started_at" IS 'When background Instagram fetch started';



COMMENT ON COLUMN "public"."onboarding_sessions"."fetch_completed_at" IS 'When background Instagram fetch completed';



COMMENT ON COLUMN "public"."onboarding_sessions"."fetch_error" IS 'Error message if fetch failed';



CREATE TABLE IF NOT EXISTS "public"."pipeline_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "triggered_by" "text" NOT NULL,
    "target_scope" "text" DEFAULT 'pending'::"text" NOT NULL,
    "target_artist_ids" "uuid"[],
    "target_city" "text",
    "total_items" integer DEFAULT 0,
    "processed_items" integer DEFAULT 0,
    "failed_items" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "result_summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "process_pid" integer,
    "last_heartbeat_at" timestamp with time zone,
    CONSTRAINT "pipeline_runs_job_type_check" CHECK (("job_type" = ANY (ARRAY['scraping'::"text", 'processing'::"text", 'embeddings'::"text"]))),
    CONSTRAINT "pipeline_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "pipeline_runs_target_scope_check" CHECK (("target_scope" = ANY (ARRAY['pending'::"text", 'failed'::"text", 'all'::"text", 'specific'::"text"])))
);


ALTER TABLE "public"."pipeline_runs" OWNER TO "postgres";


COMMENT ON TABLE "public"."pipeline_runs" IS 'Tracks pipeline jobs (scraping, embeddings, etc.) triggered from admin UI';



COMMENT ON COLUMN "public"."pipeline_runs"."job_type" IS 'Type of job: scraping, processing, embeddings, index_rebuild';



COMMENT ON COLUMN "public"."pipeline_runs"."target_scope" IS 'Which items to process: pending, failed, all, or specific artist IDs';



COMMENT ON COLUMN "public"."pipeline_runs"."result_summary" IS 'JSON summary of job results (e.g., images scraped, artists processed)';



CREATE TABLE IF NOT EXISTS "public"."portfolio_image_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_id" "uuid" NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_view_count_non_negative" CHECK (("view_count" >= 0))
);


ALTER TABLE "public"."portfolio_image_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."portfolio_image_analytics" IS 'Per-image view tracking for Pro artist analytics dashboard';



COMMENT ON COLUMN "public"."portfolio_image_analytics"."view_count" IS 'Number of times this image was viewed on this date';



CREATE TABLE IF NOT EXISTS "public"."portfolio_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "instagram_post_id" "text" NOT NULL,
    "instagram_url" "text" NOT NULL,
    "post_caption" "text",
    "post_timestamp" timestamp with time zone,
    "likes_count" integer,
    "embedding" "public"."vector"(768),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "storage_original_path" "text",
    "storage_thumb_320" "text",
    "storage_thumb_640" "text",
    "storage_thumb_1280" "text",
    "is_pinned" boolean DEFAULT false,
    "pinned_position" integer,
    "hidden" boolean DEFAULT false,
    "auto_synced" boolean DEFAULT false,
    "manually_added" boolean DEFAULT false,
    "import_source" "text" DEFAULT 'scrape'::"text",
    "instagram_media_id" "text",
    "is_color" boolean,
    "search_tier" "public"."search_tier" DEFAULT 'active'::"public"."search_tier",
    CONSTRAINT "check_import_source" CHECK (("import_source" = ANY (ARRAY['scrape'::"text", 'oauth_onboarding'::"text", 'oauth_sync'::"text", 'manual_import'::"text"]))),
    CONSTRAINT "check_pinned_position_valid" CHECK ((("pinned_position" IS NULL) OR ("pinned_position" >= 0))),
    CONSTRAINT "valid_likes_count" CHECK ((("likes_count" IS NULL) OR ("likes_count" >= 0))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'hidden'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."portfolio_images" OWNER TO "postgres";


COMMENT ON COLUMN "public"."portfolio_images"."storage_original_path" IS 'Supabase Storage path for original image (e.g., portfolio/original/{artist_id}/{post_id}.jpg)';



COMMENT ON COLUMN "public"."portfolio_images"."storage_thumb_320" IS 'Supabase Storage path for 320w WebP thumbnail';



COMMENT ON COLUMN "public"."portfolio_images"."storage_thumb_640" IS 'Supabase Storage path for 640w WebP thumbnail';



COMMENT ON COLUMN "public"."portfolio_images"."storage_thumb_1280" IS 'Supabase Storage path for 1280w WebP thumbnail';



COMMENT ON COLUMN "public"."portfolio_images"."instagram_media_id" IS 'Instagram media ID for deduplication during sync';



COMMENT ON COLUMN "public"."portfolio_images"."is_color" IS 'True if image is colorful, False if black-and-gray. Determined by saturation analysis.';



COMMENT ON COLUMN "public"."portfolio_images"."search_tier" IS 'Search tier for performance at scale:
   - active: Included in main vector search (recent/popular images)
   - archive: Excluded from main search, used for fallback/completeness

   At 1M+ images, active tier will use HNSW index for fast search.
   Archive tier continues with IVFFlat for recall.';



COMMENT ON CONSTRAINT "valid_status" ON "public"."portfolio_images" IS 'Valid image statuses:
- pending: Image uploaded, awaiting embedding generation
- active: Image has embedding and is searchable
- hidden: Image hidden from search results
- deleted: Soft-deleted image';



CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" integer NOT NULL,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_current_uses_non_negative" CHECK (("current_uses" >= 0)),
    CONSTRAINT "check_discount_type" CHECK (("discount_type" = ANY (ARRAY['months_free'::"text", 'percent_off'::"text"]))),
    CONSTRAINT "check_discount_value_positive" CHECK (("discount_value" > 0)),
    CONSTRAINT "check_max_uses_positive" CHECK ((("max_uses" IS NULL) OR ("max_uses" > 0))),
    CONSTRAINT "check_uses_within_limit" CHECK ((("max_uses" IS NULL) OR ("current_uses" <= "max_uses")))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


COMMENT ON CONSTRAINT "check_uses_within_limit" ON "public"."promo_codes" IS 'Prevent current_uses from exceeding max_uses (enforced at commit time)';



CREATE TABLE IF NOT EXISTS "public"."saved_artists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "artist_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_artists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scraping_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artist_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "images_scraped" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "retry_count" integer DEFAULT 0,
    CONSTRAINT "valid_images_scraped" CHECK (("images_scraped" >= 0)),
    CONSTRAINT "valid_job_status" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."scraping_jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scraping_jobs"."retry_count" IS 'Number of times this job has been retried (auto-incremented)';



CREATE TABLE IF NOT EXISTS "public"."search_appearances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "search_id" "uuid" NOT NULL,
    "artist_id" "uuid" NOT NULL,
    "rank_position" integer NOT NULL,
    "similarity_score" double precision NOT NULL,
    "boosted_score" double precision NOT NULL,
    "matching_images_count" integer DEFAULT 3 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "check_boosted_valid" CHECK ((("boosted_score" >= (0)::double precision) AND ("boosted_score" <= (1.1)::double precision))),
    CONSTRAINT "check_images_count_positive" CHECK (("matching_images_count" > 0)),
    CONSTRAINT "check_rank_positive" CHECK (("rank_position" > 0)),
    CONSTRAINT "check_similarity_valid" CHECK ((("similarity_score" >= (0)::double precision) AND ("similarity_score" <= (1)::double precision)))
);


ALTER TABLE "public"."search_appearances" OWNER TO "postgres";


COMMENT ON TABLE "public"."search_appearances" IS 'Individual search appearance records for Pro artist analytics';



COMMENT ON COLUMN "public"."search_appearances"."rank_position" IS 'Position in search results (1 = first)';



COMMENT ON COLUMN "public"."search_appearances"."similarity_score" IS 'Raw CLIP similarity score (0-1)';



COMMENT ON COLUMN "public"."search_appearances"."boosted_score" IS 'Score with Pro/Featured boosts applied (max 1.07 with both boosts)';



COMMENT ON COLUMN "public"."search_appearances"."matching_images_count" IS 'Number of matching images for this artist (default 3)';



CREATE TABLE IF NOT EXISTS "public"."searches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "embedding" "public"."vector"(768),
    "query_type" "text" NOT NULL,
    "query_text" "text",
    "image_url" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "instagram_username" "text",
    "instagram_post_id" "text",
    "artist_id_source" "uuid",
    "detected_styles" "jsonb",
    "primary_style" "text",
    "is_color" boolean,
    "searched_artist" "jsonb",
    CONSTRAINT "instagram_post_id_format" CHECK ((("instagram_post_id" IS NULL) OR (("length"("instagram_post_id") >= 8) AND ("length"("instagram_post_id") <= 15) AND ("instagram_post_id" ~ '^[a-zA-Z0-9_-]+$'::"text")))),
    CONSTRAINT "instagram_username_format" CHECK ((("instagram_username" IS NULL) OR (("length"("instagram_username") >= 1) AND ("length"("instagram_username") <= 30) AND ("instagram_username" ~ '^[a-zA-Z0-9._]+$'::"text") AND ("instagram_username" !~ '\.$'::"text")))),
    CONSTRAINT "valid_query_type" CHECK (("query_type" = ANY (ARRAY['image'::"text", 'text'::"text", 'hybrid'::"text", 'instagram_post'::"text", 'instagram_profile'::"text", 'similar_artist'::"text"])))
);


ALTER TABLE "public"."searches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."searches"."query_type" IS 'Search query type. Valid values: image, text, hybrid, instagram_post, instagram_profile, similar_artist';



COMMENT ON COLUMN "public"."searches"."instagram_username" IS 'Username from Instagram post/profile search (for attribution)';



COMMENT ON COLUMN "public"."searches"."instagram_post_id" IS 'Instagram post ID from post searches (for attribution)';



COMMENT ON COLUMN "public"."searches"."artist_id_source" IS 'Artist ID for similar_artist searches';



COMMENT ON COLUMN "public"."searches"."detected_styles" IS 'Top 3 detected styles from query image: [{"style_name": "geometric", "confidence": 0.85}, ...]';



COMMENT ON COLUMN "public"."searches"."primary_style" IS 'Dominant style detected in query image (for analytics and debugging)';



COMMENT ON COLUMN "public"."searches"."is_color" IS 'True if query image is colorful, False if black-and-gray. Used for color-matched search ranking.';



COMMENT ON COLUMN "public"."searches"."searched_artist" IS 'For instagram_profile searches: the searched artist card data for immediate display.
Structure: { id, instagram_handle, name, profile_image_url, bio, follower_count, city, images[] }';



COMMENT ON CONSTRAINT "instagram_post_id_format" ON "public"."searches" IS 'Validates Instagram post ID format: 8-15 chars, alphanumeric with underscores/hyphens';



COMMENT ON CONSTRAINT "instagram_username_format" ON "public"."searches" IS 'Validates Instagram username format: 1-30 chars, alphanumeric with dots/underscores, no trailing dot';



CREATE TABLE IF NOT EXISTS "public"."style_seeds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "style_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "seed_image_url" "text" NOT NULL,
    "embedding" "public"."vector"(768) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "taxonomy" "public"."style_taxonomy" DEFAULT 'technique'::"public"."style_taxonomy"
);


ALTER TABLE "public"."style_seeds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."style_training_labels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_id" "uuid" NOT NULL,
    "labeled_by" "text" NOT NULL,
    "styles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "skipped" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."style_training_labels" OWNER TO "postgres";


COMMENT ON TABLE "public"."style_training_labels" IS 'Human-labeled style tags for training ML classifier on CLIP embeddings';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "instagram_id" "text",
    "instagram_username" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "account_type" "text" DEFAULT 'fan'::"text" NOT NULL,
    "instagram_token_vault_id" "uuid",
    "instagram_token_expires_at" timestamp with time zone,
    CONSTRAINT "check_account_type" CHECK (("account_type" = ANY (ARRAY['fan'::"text", 'artist_free'::"text", 'artist_pro'::"text"]))),
    CONSTRAINT "valid_email" CHECK ((("email" IS NULL) OR ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::"text")))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."airtable_sync_log"
    ADD CONSTRAINT "airtable_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_analytics"
    ADD CONSTRAINT "artist_analytics_artist_id_date_key" UNIQUE ("artist_id", "date");



ALTER TABLE ONLY "public"."artist_analytics"
    ADD CONSTRAINT "artist_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_audit_log"
    ADD CONSTRAINT "artist_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_locations"
    ADD CONSTRAINT "artist_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_pipeline_state"
    ADD CONSTRAINT "artist_pipeline_state_pkey" PRIMARY KEY ("artist_id");



ALTER TABLE ONLY "public"."artist_recommendations"
    ADD CONSTRAINT "artist_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_style_profiles"
    ADD CONSTRAINT "artist_style_profiles_artist_id_style_name_key" UNIQUE ("artist_id", "style_name");



ALTER TABLE ONLY "public"."artist_style_profiles"
    ADD CONSTRAINT "artist_style_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_subscriptions"
    ADD CONSTRAINT "artist_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artist_subscriptions"
    ADD CONSTRAINT "artist_subscriptions_user_id_artist_id_key" UNIQUE ("user_id", "artist_id");



ALTER TABLE ONLY "public"."artist_sync_state"
    ADD CONSTRAINT "artist_sync_state_pkey" PRIMARY KEY ("artist_id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists_slug_backup"
    ADD CONSTRAINT "artists_slug_backup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."claim_attempts"
    ADD CONSTRAINT "claim_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."country_editorial_content"
    ADD CONSTRAINT "country_editorial_content_pkey" PRIMARY KEY ("country_code");



ALTER TABLE ONLY "public"."discovery_queries"
    ADD CONSTRAINT "discovery_queries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discovery_queries"
    ADD CONSTRAINT "discovery_queries_query_city_source_key" UNIQUE ("query", "city", "source");



ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."encrypted_instagram_tokens"
    ADD CONSTRAINT "encrypted_instagram_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encrypted_instagram_tokens"
    ADD CONSTRAINT "encrypted_instagram_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."follower_mining_runs"
    ADD CONSTRAINT "follower_mining_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hashtag_mining_runs"
    ADD CONSTRAINT "hashtag_mining_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."image_style_tags"
    ADD CONSTRAINT "image_style_tags_image_id_style_name_key" UNIQUE ("image_id", "style_name");



ALTER TABLE ONLY "public"."image_style_tags"
    ADD CONSTRAINT "image_style_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."indexnow_submissions"
    ADD CONSTRAINT "indexnow_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instagram_sync_log"
    ADD CONSTRAINT "instagram_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_outreach"
    ADD CONSTRAINT "marketing_outreach_airtable_record_id_key" UNIQUE ("airtable_record_id");



ALTER TABLE ONLY "public"."marketing_outreach"
    ADD CONSTRAINT "marketing_outreach_artist_id_campaign_name_key" UNIQUE ("artist_id", "campaign_name");



ALTER TABLE ONLY "public"."marketing_outreach"
    ADD CONSTRAINT "marketing_outreach_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mining_candidates"
    ADD CONSTRAINT "mining_candidates_instagram_handle_source_type_source_id_key" UNIQUE ("instagram_handle", "source_type", "source_id");



ALTER TABLE ONLY "public"."mining_candidates"
    ADD CONSTRAINT "mining_candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_sessions"
    ADD CONSTRAINT "onboarding_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_sessions"
    ADD CONSTRAINT "onboarding_sessions_user_id_artist_id_key" UNIQUE ("user_id", "artist_id");



ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio_image_analytics"
    ADD CONSTRAINT "portfolio_image_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "portfolio_images_instagram_post_id_key" UNIQUE ("instagram_post_id");



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_artists"
    ADD CONSTRAINT "saved_artists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_artists"
    ADD CONSTRAINT "saved_artists_user_id_artist_id_key" UNIQUE ("user_id", "artist_id");



ALTER TABLE ONLY "public"."scraping_jobs"
    ADD CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_appearances"
    ADD CONSTRAINT "search_appearances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."searches"
    ADD CONSTRAINT "searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."style_seeds"
    ADD CONSTRAINT "style_seeds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."style_seeds"
    ADD CONSTRAINT "style_seeds_style_name_key" UNIQUE ("style_name");



ALTER TABLE ONLY "public"."style_training_labels"
    ADD CONSTRAINT "style_training_labels_image_id_key" UNIQUE ("image_id");



ALTER TABLE ONLY "public"."style_training_labels"
    ADD CONSTRAINT "style_training_labels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "unique_artist_post" UNIQUE ("artist_id", "instagram_post_id");



COMMENT ON CONSTRAINT "unique_artist_post" ON "public"."portfolio_images" IS 'Prevents duplicate posts from being inserted (handles race conditions during parallel processing)';



ALTER TABLE ONLY "public"."portfolio_image_analytics"
    ADD CONSTRAINT "unique_image_date" UNIQUE ("image_id", "date");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_instagram_id_key" UNIQUE ("instagram_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "artists_instagram_handle_lower_unique" ON "public"."artists" USING "btree" ("lower"("instagram_handle")) WHERE ("deleted_at" IS NULL);



COMMENT ON INDEX "public"."artists_instagram_handle_lower_unique" IS 'Case-insensitive unique constraint on instagram_handle. Excludes soft-deleted artists. Prevents race conditions in artist creation.';



CREATE INDEX "idx_admin_audit_action" ON "public"."admin_audit_log" USING "btree" ("action");



CREATE INDEX "idx_admin_audit_admin" ON "public"."admin_audit_log" USING "btree" ("admin_email");



CREATE INDEX "idx_admin_audit_created" ON "public"."admin_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_audit_resource" ON "public"."admin_audit_log" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_airtable_sync_log_started_at" ON "public"."airtable_sync_log" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_analytics_artist_date" ON "public"."artist_analytics" USING "btree" ("artist_id", "date" DESC);



CREATE INDEX "idx_analytics_date" ON "public"."artist_analytics" USING "btree" ("date" DESC);



CREATE INDEX "idx_artist_audit_log_artist_id" ON "public"."artist_audit_log" USING "btree" ("artist_id");



CREATE INDEX "idx_artist_audit_log_created_at" ON "public"."artist_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_artist_locations_artist_id" ON "public"."artist_locations" USING "btree" ("artist_id");



COMMENT ON INDEX "public"."idx_artist_locations_artist_id" IS 'Optimizes JOINs between artist_locations and artists tables';



CREATE INDEX "idx_artist_locations_artist_primary" ON "public"."artist_locations" USING "btree" ("artist_id") WHERE ("is_primary" = true);



CREATE INDEX "idx_artist_locations_city" ON "public"."artist_locations" USING "btree" ("lower"("city")) WHERE ("city" IS NOT NULL);



CREATE INDEX "idx_artist_locations_city_lower" ON "public"."artist_locations" USING "btree" ("lower"("city"));



CREATE INDEX "idx_artist_locations_city_region" ON "public"."artist_locations" USING "btree" ("lower"("city"), "region") WHERE ("city" IS NOT NULL);



CREATE INDEX "idx_artist_locations_country" ON "public"."artist_locations" USING "btree" ("country_code");



COMMENT ON INDEX "public"."idx_artist_locations_country" IS 'Optimizes country-only location filtering';



CREATE INDEX "idx_artist_locations_country_code_gdpr" ON "public"."artist_locations" USING "btree" ("country_code") WHERE ("country_code" = ANY (ARRAY['AT'::"text", 'BE'::"text", 'BG'::"text", 'HR'::"text", 'CY'::"text", 'CZ'::"text", 'DK'::"text", 'EE'::"text", 'FI'::"text", 'FR'::"text", 'DE'::"text", 'GR'::"text", 'HU'::"text", 'IE'::"text", 'IT'::"text", 'LV'::"text", 'LT'::"text", 'LU'::"text", 'MT'::"text", 'NL'::"text", 'PL'::"text", 'PT'::"text", 'RO'::"text", 'SK'::"text", 'SI'::"text", 'ES'::"text", 'SE'::"text", 'IS'::"text", 'LI'::"text", 'NO'::"text", 'GB'::"text", 'CH'::"text"]));



COMMENT ON INDEX "public"."idx_artist_locations_country_code_gdpr" IS 'Partial index for efficient GDPR country filtering in search queries.';



CREATE INDEX "idx_artist_locations_country_region" ON "public"."artist_locations" USING "btree" ("country_code", "region");



COMMENT ON INDEX "public"."idx_artist_locations_country_region" IS 'Optimizes country+region location filtering';



CREATE INDEX "idx_artist_locations_country_region_city" ON "public"."artist_locations" USING "btree" ("country_code", "region", "city");



COMMENT ON INDEX "public"."idx_artist_locations_country_region_city" IS 'Optimizes full location filtering (country+region+city)';



CREATE INDEX "idx_artist_locations_region" ON "public"."artist_locations" USING "btree" ("lower"("region")) WHERE ("region" IS NOT NULL);



CREATE INDEX "idx_artist_locations_region_lower" ON "public"."artist_locations" USING "btree" ("lower"("region"));



CREATE INDEX "idx_artist_recommendations_created_at" ON "public"."artist_recommendations" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_artist_recommendations_instagram_handle" ON "public"."artist_recommendations" USING "btree" ("instagram_handle");



CREATE INDEX "idx_artist_recommendations_status" ON "public"."artist_recommendations" USING "btree" ("status");



CREATE INDEX "idx_artist_style_profiles_artist" ON "public"."artist_style_profiles" USING "btree" ("artist_id");



CREATE INDEX "idx_artist_style_profiles_percentage" ON "public"."artist_style_profiles" USING "btree" ("style_name", "percentage" DESC);



CREATE INDEX "idx_artist_style_profiles_style" ON "public"."artist_style_profiles" USING "btree" ("style_name");



CREATE INDEX "idx_artists_active" ON "public"."artists" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_artists_claimed_by" ON "public"."artists" USING "btree" ("claimed_by_user_id");



CREATE INDEX "idx_artists_featured" ON "public"."artists" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_artists_featured_expires" ON "public"."artists" USING "btree" ("featured_expires_at") WHERE ("is_featured" = true);



CREATE INDEX "idx_artists_filter_preference" ON "public"."artists" USING "btree" ("filter_non_tattoo_content") WHERE ("filter_non_tattoo_content" = false);



CREATE INDEX "idx_artists_follower_count_desc" ON "public"."artists" USING "btree" ("follower_count" DESC NULLS LAST) WHERE (("follower_count" >= 50000) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_artists_gdpr_blocked" ON "public"."artists" USING "btree" ("is_gdpr_blocked") WHERE ("is_gdpr_blocked" = true);



CREATE INDEX "idx_artists_instagram_handle" ON "public"."artists" USING "btree" ("instagram_handle") WHERE ("instagram_handle" IS NOT NULL);



COMMENT ON INDEX "public"."idx_artists_instagram_handle" IS 'Optimizes Instagram profile searches by handle. Used for instant search when profile already exists in DB (30% hit rate).';



CREATE INDEX "idx_artists_instagram_handle_lower" ON "public"."artists" USING "btree" ("lower"("instagram_handle")) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_artists_instagram_id" ON "public"."artists" USING "btree" ("instagram_id");



CREATE INDEX "idx_artists_is_test_account" ON "public"."artists" USING "btree" ("is_test_account") WHERE ("is_test_account" = true);



CREATE INDEX "idx_artists_not_gdpr_blocked" ON "public"."artists" USING "btree" ("id") WHERE (("is_gdpr_blocked" = false) OR ("is_gdpr_blocked" IS NULL));



CREATE INDEX "idx_artists_pro" ON "public"."artists" USING "btree" ("is_pro") WHERE ("is_pro" = true);



CREATE INDEX "idx_artists_slug" ON "public"."artists" USING "btree" ("slug");



CREATE INDEX "idx_artists_verification" ON "public"."artists" USING "btree" ("verification_status");



CREATE INDEX "idx_artists_verification_follower" ON "public"."artists" USING "btree" ("verification_status", "follower_count" DESC NULLS LAST) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_claim_attempts_artist" ON "public"."claim_attempts" USING "btree" ("artist_id");



CREATE INDEX "idx_claim_attempts_created" ON "public"."claim_attempts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_claim_attempts_outcome" ON "public"."claim_attempts" USING "btree" ("outcome");



CREATE INDEX "idx_claim_attempts_user" ON "public"."claim_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_country_content_generated_at" ON "public"."country_editorial_content" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_discovery_queries_city" ON "public"."discovery_queries" USING "btree" ("city");



CREATE INDEX "idx_discovery_queries_created" ON "public"."discovery_queries" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_discovery_queries_source" ON "public"."discovery_queries" USING "btree" ("source");



CREATE INDEX "idx_email_log_artist_id" ON "public"."email_log" USING "btree" ("artist_id") WHERE ("artist_id" IS NOT NULL);



CREATE INDEX "idx_email_log_recipient_type_sent" ON "public"."email_log" USING "btree" ("recipient_email", "email_type", "sent_at" DESC);



CREATE INDEX "idx_email_log_sent_at" ON "public"."email_log" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_email_log_user_id" ON "public"."email_log" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_email_preferences_email" ON "public"."email_preferences" USING "btree" ("email");



CREATE INDEX "idx_email_preferences_user_id" ON "public"."email_preferences" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_encrypted_tokens_user" ON "public"."encrypted_instagram_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_follower_mining_runs_seed" ON "public"."follower_mining_runs" USING "btree" ("seed_account");



CREATE INDEX "idx_follower_mining_runs_status" ON "public"."follower_mining_runs" USING "btree" ("status");



CREATE INDEX "idx_hashtag_mining_runs_hashtag" ON "public"."hashtag_mining_runs" USING "btree" ("hashtag");



CREATE INDEX "idx_hashtag_mining_runs_status" ON "public"."hashtag_mining_runs" USING "btree" ("status");



CREATE INDEX "idx_image_analytics_artist_date" ON "public"."portfolio_image_analytics" USING "btree" ("artist_id", "date" DESC);



CREATE INDEX "idx_image_analytics_image_date" ON "public"."portfolio_image_analytics" USING "btree" ("image_id", "date" DESC);



CREATE INDEX "idx_image_style_tags_confidence" ON "public"."image_style_tags" USING "btree" ("confidence" DESC);



CREATE INDEX "idx_image_style_tags_image_id" ON "public"."image_style_tags" USING "btree" ("image_id");



CREATE INDEX "idx_image_style_tags_style_confidence" ON "public"."image_style_tags" USING "btree" ("style_name", "confidence" DESC);



CREATE INDEX "idx_image_style_tags_style_name" ON "public"."image_style_tags" USING "btree" ("style_name");



CREATE INDEX "idx_indexnow_submissions_date" ON "public"."indexnow_submissions" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_indexnow_submissions_source" ON "public"."indexnow_submissions" USING "btree" ("trigger_source");



CREATE INDEX "idx_locations_city_country" ON "public"."locations" USING "btree" ("city_ascii", "country_code");



CREATE INDEX "idx_locations_city_search" ON "public"."locations" USING "gin" ("to_tsvector"('"english"'::"regconfig", "city_ascii"));



CREATE INDEX "idx_locations_coordinates" ON "public"."locations" USING "btree" ("lat", "lng");



CREATE INDEX "idx_locations_country" ON "public"."locations" USING "btree" ("country_code");



CREATE INDEX "idx_locations_state" ON "public"."locations" USING "btree" ("state_code") WHERE ("state_code" IS NOT NULL);



CREATE INDEX "idx_marketing_outreach_artist" ON "public"."marketing_outreach" USING "btree" ("artist_id");



CREATE INDEX "idx_marketing_outreach_campaign" ON "public"."marketing_outreach" USING "btree" ("campaign_name");



CREATE INDEX "idx_marketing_outreach_pending_claims" ON "public"."marketing_outreach" USING "btree" ("artist_id") WHERE ("claimed_at" IS NULL);



CREATE INDEX "idx_marketing_outreach_status" ON "public"."marketing_outreach" USING "btree" ("status");



CREATE INDEX "idx_marketing_outreach_status_generated" ON "public"."marketing_outreach" USING "btree" ("status") WHERE ("post_text" IS NOT NULL);



CREATE INDEX "idx_mining_candidates_handle" ON "public"."mining_candidates" USING "btree" ("instagram_handle");



CREATE INDEX "idx_mining_candidates_unprocessed" ON "public"."mining_candidates" USING "btree" ("processed_at") WHERE ("processed_at" IS NULL);



CREATE INDEX "idx_onboarding_sessions_artist_id" ON "public"."onboarding_sessions" USING "btree" ("artist_id") WHERE ("artist_id" IS NOT NULL);



CREATE INDEX "idx_onboarding_sessions_expires_at" ON "public"."onboarding_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_onboarding_sessions_user_id" ON "public"."onboarding_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_pipeline_last_scraped" ON "public"."artist_pipeline_state" USING "btree" ("last_scraped_at");



CREATE INDEX "idx_pipeline_not_blacklisted" ON "public"."artist_pipeline_state" USING "btree" ("artist_id") WHERE (("scraping_blacklisted" = false) AND ("exclude_from_scraping" = false));



CREATE INDEX "idx_pipeline_priority" ON "public"."artist_pipeline_state" USING "btree" ("scrape_priority" DESC) WHERE ("pipeline_status" = ANY (ARRAY['pending'::"text", 'failed'::"text"]));



CREATE INDEX "idx_pipeline_runs_created" ON "public"."pipeline_runs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pipeline_runs_heartbeat" ON "public"."pipeline_runs" USING "btree" ("status", "last_heartbeat_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'running'::"text"]));



CREATE INDEX "idx_pipeline_runs_job_type" ON "public"."pipeline_runs" USING "btree" ("job_type");



CREATE INDEX "idx_pipeline_runs_pid" ON "public"."pipeline_runs" USING "btree" ("process_pid") WHERE ("process_pid" IS NOT NULL);



CREATE INDEX "idx_pipeline_runs_status" ON "public"."pipeline_runs" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'running'::"text"]));



CREATE UNIQUE INDEX "idx_pipeline_runs_unique_active_job" ON "public"."pipeline_runs" USING "btree" ("job_type") WHERE ("status" = ANY (ARRAY['pending'::"text", 'running'::"text"]));



COMMENT ON INDEX "public"."idx_pipeline_runs_unique_active_job" IS 'Ensures only one pending or running job per job_type at any time (prevents race conditions)';



CREATE INDEX "idx_pipeline_status" ON "public"."artist_pipeline_state" USING "btree" ("pipeline_status");



CREATE INDEX "idx_portfolio_artist" ON "public"."portfolio_images" USING "btree" ("artist_id");



CREATE INDEX "idx_portfolio_auto_synced" ON "public"."portfolio_images" USING "btree" ("artist_id", "created_at" DESC) WHERE (("is_pinned" = false) AND ("hidden" = false));



CREATE INDEX "idx_portfolio_embeddings" ON "public"."portfolio_images" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='300');



CREATE INDEX "idx_portfolio_featured" ON "public"."portfolio_images" USING "btree" ("featured") WHERE ("featured" = true);



CREATE INDEX "idx_portfolio_hidden" ON "public"."portfolio_images" USING "btree" ("artist_id", "created_at" DESC) WHERE ("hidden" = true);



CREATE INDEX "idx_portfolio_images_artist_likes" ON "public"."portfolio_images" USING "btree" ("artist_id", "likes_count" DESC NULLS LAST) WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_portfolio_images_artist_status" ON "public"."portfolio_images" USING "btree" ("artist_id", "status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_portfolio_images_featured_active" ON "public"."portfolio_images" USING "btree" ("featured", "created_at" DESC) WHERE (("status" = 'active'::"text") AND ("featured" = true));



CREATE INDEX "idx_portfolio_images_is_color" ON "public"."portfolio_images" USING "btree" ("is_color") WHERE ("is_color" IS NOT NULL);



CREATE INDEX "idx_portfolio_images_search_tier" ON "public"."portfolio_images" USING "btree" ("search_tier") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_portfolio_images_status_pending" ON "public"."portfolio_images" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['pending'::"text", 'failed'::"text"]));



COMMENT ON INDEX "public"."idx_portfolio_images_status_pending" IS 'Partial index for finding images needing embedding generation. Excludes processed images.';



CREATE INDEX "idx_portfolio_import_source" ON "public"."portfolio_images" USING "btree" ("import_source");



CREATE UNIQUE INDEX "idx_portfolio_instagram_media_unique" ON "public"."portfolio_images" USING "btree" ("artist_id", "instagram_media_id") WHERE ("instagram_media_id" IS NOT NULL);



CREATE INDEX "idx_portfolio_pinned" ON "public"."portfolio_images" USING "btree" ("artist_id", "pinned_position") WHERE (("is_pinned" = true) AND ("hidden" = false));



CREATE INDEX "idx_portfolio_status" ON "public"."portfolio_images" USING "btree" ("status");



CREATE INDEX "idx_promo_codes_active" ON "public"."promo_codes" USING "btree" ("active") WHERE ("active" = true);



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_saved_artists_artist" ON "public"."saved_artists" USING "btree" ("artist_id");



CREATE INDEX "idx_saved_artists_user" ON "public"."saved_artists" USING "btree" ("user_id");



CREATE INDEX "idx_search_appearances_artist_time" ON "public"."search_appearances" USING "btree" ("artist_id", "created_at" DESC);



CREATE INDEX "idx_search_appearances_search" ON "public"."search_appearances" USING "btree" ("search_id");



CREATE INDEX "idx_searches_artist_source" ON "public"."searches" USING "btree" ("artist_id_source") WHERE ("artist_id_source" IS NOT NULL);



CREATE INDEX "idx_searches_created_at" ON "public"."searches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_searches_id_type" ON "public"."searches" USING "btree" ("id", "query_type");



CREATE INDEX "idx_searches_instagram_username" ON "public"."searches" USING "btree" ("instagram_username") WHERE ("instagram_username" IS NOT NULL);



CREATE INDEX "idx_searches_primary_style" ON "public"."searches" USING "btree" ("primary_style") WHERE ("primary_style" IS NOT NULL);



CREATE INDEX "idx_searches_query_type" ON "public"."searches" USING "btree" ("query_type");



CREATE INDEX "idx_style_seeds_name" ON "public"."style_seeds" USING "btree" ("style_name");



CREATE INDEX "idx_subscriptions_artist" ON "public"."artist_subscriptions" USING "btree" ("artist_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."artist_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe" ON "public"."artist_subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscriptions_user" ON "public"."artist_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_sync_log_artist_recent" ON "public"."instagram_sync_log" USING "btree" ("artist_id", "started_at" DESC);



CREATE INDEX "idx_sync_log_status" ON "public"."instagram_sync_log" USING "btree" ("status");



CREATE INDEX "idx_sync_log_user" ON "public"."instagram_sync_log" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "idx_sync_state_auto_enabled" ON "public"."artist_sync_state" USING "btree" ("auto_sync_enabled") WHERE ("auto_sync_enabled" = true);



CREATE INDEX "idx_sync_state_in_progress" ON "public"."artist_sync_state" USING "btree" ("sync_in_progress") WHERE ("sync_in_progress" = true);



CREATE INDEX "idx_sync_state_last_sync" ON "public"."artist_sync_state" USING "btree" ("last_sync_at");



CREATE INDEX "idx_training_labels_image_id" ON "public"."style_training_labels" USING "btree" ("image_id");



CREATE INDEX "idx_training_labels_labeled_by" ON "public"."style_training_labels" USING "btree" ("labeled_by");



CREATE INDEX "idx_users_account_type" ON "public"."users" USING "btree" ("account_type");



CREATE INDEX "idx_users_vault_token" ON "public"."users" USING "btree" ("instagram_token_vault_id");



CREATE UNIQUE INDEX "unique_artist_location" ON "public"."artist_locations" USING "btree" ("artist_id", "lower"(COALESCE("city", ''::"text")), "lower"(COALESCE("region", ''::"text")), "country_code");



CREATE UNIQUE INDEX "unique_primary_location" ON "public"."artist_locations" USING "btree" ("artist_id") WHERE ("is_primary" = true);



CREATE OR REPLACE TRIGGER "compute_image_style_tags_trigger" AFTER INSERT OR UPDATE OF "embedding" ON "public"."portfolio_images" FOR EACH ROW EXECUTE FUNCTION "public"."compute_image_style_tags"();



CREATE OR REPLACE TRIGGER "enforce_location_limit" BEFORE INSERT OR UPDATE ON "public"."artist_locations" FOR EACH ROW EXECUTE FUNCTION "public"."check_location_limit"();



CREATE OR REPLACE TRIGGER "marketing_outreach_updated_at" BEFORE UPDATE ON "public"."marketing_outreach" FOR EACH ROW EXECUTE FUNCTION "public"."update_marketing_outreach_updated_at"();



CREATE OR REPLACE TRIGGER "recompute_styles_on_image_delete" BEFORE DELETE ON "public"."portfolio_images" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_artist_styles_on_image_delete"();



CREATE OR REPLACE TRIGGER "set_pipeline_runs_updated_at" BEFORE UPDATE ON "public"."pipeline_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_pipeline_runs_updated_at"();



CREATE OR REPLACE TRIGGER "sync_artist_location_on_insert" AFTER INSERT ON "public"."artists" FOR EACH ROW EXECUTE FUNCTION "public"."sync_artist_to_locations"();



CREATE OR REPLACE TRIGGER "sync_primary_location_trigger" AFTER INSERT OR UPDATE ON "public"."artist_locations" FOR EACH ROW WHEN (("new"."is_primary" = true)) EXECUTE FUNCTION "public"."sync_primary_location"();



CREATE OR REPLACE TRIGGER "trg_update_artist_styles_on_tag_delete" AFTER DELETE ON "public"."image_style_tags" REFERENCING OLD TABLE AS "old_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."update_artist_styles_on_tag_change"();



COMMENT ON TRIGGER "trg_update_artist_styles_on_tag_delete" ON "public"."image_style_tags" IS 'Statement-level trigger: Recomputes artist_style_profiles when tags are deleted (skips cascade from image delete).';



CREATE OR REPLACE TRIGGER "trg_update_artist_styles_on_tag_insert" AFTER INSERT ON "public"."image_style_tags" REFERENCING NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."update_artist_styles_on_tag_change"();



COMMENT ON TRIGGER "trg_update_artist_styles_on_tag_insert" ON "public"."image_style_tags" IS 'Statement-level trigger: Recomputes artist_style_profiles when tags are inserted (deduplicated per artist).';



CREATE OR REPLACE TRIGGER "trg_update_artist_styles_on_tag_update" AFTER UPDATE ON "public"."image_style_tags" REFERENCING OLD TABLE AS "old_table" NEW TABLE AS "new_table" FOR EACH STATEMENT EXECUTE FUNCTION "public"."update_artist_styles_on_tag_change"();



COMMENT ON TRIGGER "trg_update_artist_styles_on_tag_update" ON "public"."image_style_tags" IS 'Statement-level trigger: Recomputes artist_style_profiles when tags are updated.';



CREATE OR REPLACE TRIGGER "trigger_auto_blacklist" AFTER INSERT OR UPDATE ON "public"."scraping_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."check_and_blacklist_artist"();



CREATE OR REPLACE TRIGGER "trigger_update_pipeline_on_embedding" AFTER UPDATE OF "embedding" ON "public"."portfolio_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_artist_pipeline_on_embedding"();



CREATE OR REPLACE TRIGGER "update_artist_recommendations_updated_at" BEFORE UPDATE ON "public"."artist_recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_artist_subscriptions_updated_at" BEFORE UPDATE ON "public"."artist_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_artists_updated_at" BEFORE UPDATE ON "public"."artists" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_promo_codes_updated_at" BEFORE UPDATE ON "public"."promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_style_seeds_updated_at" BEFORE UPDATE ON "public"."style_seeds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_label_timestamp" BEFORE UPDATE ON "public"."style_training_labels" FOR EACH ROW EXECUTE FUNCTION "public"."update_training_label_timestamp"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."artist_analytics"
    ADD CONSTRAINT "artist_analytics_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_audit_log"
    ADD CONSTRAINT "artist_audit_log_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_locations"
    ADD CONSTRAINT "artist_locations_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_pipeline_state"
    ADD CONSTRAINT "artist_pipeline_state_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_recommendations"
    ADD CONSTRAINT "artist_recommendations_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."artist_style_profiles"
    ADD CONSTRAINT "artist_style_profiles_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_subscriptions"
    ADD CONSTRAINT "artist_subscriptions_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_subscriptions"
    ADD CONSTRAINT "artist_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artist_sync_state"
    ADD CONSTRAINT "artist_sync_state_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artists"
    ADD CONSTRAINT "artists_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."claim_attempts"
    ADD CONSTRAINT "claim_attempts_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_attempts"
    ADD CONSTRAINT "claim_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_log"
    ADD CONSTRAINT "email_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."encrypted_instagram_tokens"
    ADD CONSTRAINT "encrypted_instagram_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."image_style_tags"
    ADD CONSTRAINT "image_style_tags_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."portfolio_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instagram_sync_log"
    ADD CONSTRAINT "instagram_sync_log_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instagram_sync_log"
    ADD CONSTRAINT "instagram_sync_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_outreach"
    ADD CONSTRAINT "marketing_outreach_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_outreach"
    ADD CONSTRAINT "marketing_outreach_paired_artist_id_fkey" FOREIGN KEY ("paired_artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."onboarding_sessions"
    ADD CONSTRAINT "onboarding_sessions_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_sessions"
    ADD CONSTRAINT "onboarding_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_image_analytics"
    ADD CONSTRAINT "portfolio_image_analytics_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_image_analytics"
    ADD CONSTRAINT "portfolio_image_analytics_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."portfolio_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_images"
    ADD CONSTRAINT "portfolio_images_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_artists"
    ADD CONSTRAINT "saved_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_artists"
    ADD CONSTRAINT "saved_artists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scraping_jobs"
    ADD CONSTRAINT "scraping_jobs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."search_appearances"
    ADD CONSTRAINT "search_appearances_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."search_appearances"
    ADD CONSTRAINT "search_appearances_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."searches"
    ADD CONSTRAINT "searches_artist_id_source_fkey" FOREIGN KEY ("artist_id_source") REFERENCES "public"."artists"("id");



ALTER TABLE ONLY "public"."searches"
    ADD CONSTRAINT "searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."style_training_labels"
    ADD CONSTRAINT "style_training_labels_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."portfolio_images"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_instagram_token_vault_id_fkey" FOREIGN KEY ("instagram_token_vault_id") REFERENCES "vault"."secrets"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can submit artist recommendations" ON "public"."artist_recommendations" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Artist owners can view pipeline state" ON "public"."artist_pipeline_state" FOR SELECT USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can delete own images" ON "public"."portfolio_images" FOR DELETE USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can insert own images" ON "public"."portfolio_images" FOR INSERT WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can insert own pipeline state" ON "public"."artist_pipeline_state" FOR INSERT WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can insert own sync state" ON "public"."artist_sync_state" FOR INSERT WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can read own analytics" ON "public"."artist_analytics" FOR SELECT USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can read own image analytics" ON "public"."portfolio_image_analytics" FOR SELECT USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can read own images" ON "public"."portfolio_images" FOR SELECT TO "authenticated" USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can read own search appearances" ON "public"."search_appearances" FOR SELECT USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = "auth"."uid"()))));



CREATE POLICY "Artists can read own sync logs" ON "public"."instagram_sync_log" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Artists can update own images" ON "public"."portfolio_images" FOR UPDATE USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can update own pipeline state" ON "public"."artist_pipeline_state" FOR UPDATE USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can update own profile" ON "public"."artists" FOR UPDATE USING ((("claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK ((("claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)));



CREATE POLICY "Artists can update own sync state" ON "public"."artist_sync_state" FOR UPDATE USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Artists can view own sync state" ON "public"."artist_sync_state" FOR SELECT USING (("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Country content is publicly readable" ON "public"."country_editorial_content" FOR SELECT USING (true);



CREATE POLICY "Locations are publicly readable" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Only service role can modify locations" ON "public"."locations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Public can read active artists" ON "public"."artists" FOR SELECT USING (("deleted_at" IS NULL));



CREATE POLICY "Public can read active promo codes" ON "public"."promo_codes" FOR SELECT USING ((("active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Public can read visible images" ON "public"."portfolio_images" FOR SELECT USING ((("hidden" = false) AND ("artist_id" IN ( SELECT "artists"."id"
   FROM "public"."artists"
  WHERE ("artists"."deleted_at" IS NULL)))));



CREATE POLICY "Public read access to style seeds" ON "public"."style_seeds" FOR SELECT USING (true);



CREATE POLICY "Public read image style tags" ON "public"."image_style_tags" FOR SELECT USING (true);



COMMENT ON POLICY "Public read image style tags" ON "public"."image_style_tags" IS 'Style tags are derived data from CLIP embeddings - safe for public read';



CREATE POLICY "Service role can access slug backup" ON "public"."artists_slug_backup" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can insert audit logs" ON "public"."admin_audit_log" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can manage all recommendations" ON "public"."artist_recommendations" TO "service_role" USING (true);



CREATE POLICY "Service role can manage country content" ON "public"."country_editorial_content" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage style seeds" ON "public"."style_seeds" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can read audit logs" ON "public"."admin_audit_log" FOR SELECT TO "service_role" USING (true);



CREATE POLICY "Service role full access" ON "public"."artist_pipeline_state" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."artist_sync_state" USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."encrypted_instagram_tokens" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access" ON "public"."style_training_labels" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to analytics" ON "public"."artist_analytics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to artist_audit_log" ON "public"."artist_audit_log" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to artists" ON "public"."artists" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to claim attempts" ON "public"."claim_attempts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to discovery_queries" ON "public"."discovery_queries" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to encrypted_instagram_tokens" ON "public"."encrypted_instagram_tokens" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to follower_mining_runs" ON "public"."follower_mining_runs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to hashtag_mining_runs" ON "public"."hashtag_mining_runs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to image analytics" ON "public"."portfolio_image_analytics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to mining_candidates" ON "public"."mining_candidates" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to onboarding sessions" ON "public"."onboarding_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to pipeline_runs" ON "public"."pipeline_runs" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to portfolio_images" ON "public"."portfolio_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to promo codes" ON "public"."promo_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to scraping_jobs" ON "public"."scraping_jobs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to search appearances" ON "public"."search_appearances" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access to subscriptions" ON "public"."artist_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to sync logs" ON "public"."instagram_sync_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access to users" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role manage style tags" ON "public"."image_style_tags" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own onboarding sessions" ON "public"."onboarding_sessions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "Users can insert own data" ON "public"."users" IS 'Allow Supabase Auth to create user records during signup';



CREATE POLICY "Users can insert own onboarding sessions" ON "public"."onboarding_sessions" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert searches" ON "public"."searches" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IS NULL)));



CREATE POLICY "Users can insert their own email preferences" ON "public"."email_preferences" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "email"))));



CREATE POLICY "Users can read own claim attempts" ON "public"."claim_attempts" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can read own subscriptions" ON "public"."artist_subscriptions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can save artists" ON "public"."saved_artists" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can unsave artists" ON "public"."saved_artists" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own onboarding sessions" ON "public"."onboarding_sessions" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update their own email preferences" ON "public"."email_preferences" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "email")))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "email"))));



CREATE POLICY "Users can view own onboarding sessions" ON "public"."onboarding_sessions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own saved artists" ON "public"."saved_artists" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own searches" ON "public"."searches" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IS NULL)));



CREATE POLICY "Users can view their own email preferences" ON "public"."email_preferences" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "email"))));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artist_locations_delete_own" ON "public"."artist_locations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."artists" "a"
  WHERE (("a"."id" = "artist_locations"."artist_id") AND ("a"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "artist_locations_insert_own" ON "public"."artist_locations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."artists" "a"
  WHERE (("a"."id" = "artist_locations"."artist_id") AND ("a"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "artist_locations_select_public" ON "public"."artist_locations" FOR SELECT USING (true);



CREATE POLICY "artist_locations_update_own" ON "public"."artist_locations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."artists" "a"
  WHERE (("a"."id" = "artist_locations"."artist_id") AND ("a"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."artists" "a"
  WHERE (("a"."id" = "artist_locations"."artist_id") AND ("a"."claimed_by_user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."artist_pipeline_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_style_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artist_style_profiles_select" ON "public"."artist_style_profiles" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."artist_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artist_sync_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artists_slug_backup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."country_editorial_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discovery_queries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."encrypted_instagram_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follower_mining_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hashtag_mining_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."image_style_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."indexnow_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instagram_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_outreach" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "marketing_outreach_service_role" ON "public"."marketing_outreach" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."mining_candidates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio_image_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_artists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scraping_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_appearances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."style_seeds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."style_training_labels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text", "p_instagram_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text", "p_instagram_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_claim_artist"("p_artist_id" "uuid", "p_instagram_id" "text", "p_instagram_handle" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_receive_email"("p_email" "text", "p_email_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_blacklist_artist"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_blacklist_artist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_blacklist_artist"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer, "p_max_per_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer, "p_max_per_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_rate_limit"("p_recipient_email" "text", "p_email_type" "text", "p_max_per_hour" integer, "p_max_per_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_location_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_location_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_location_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_artist_profile"("p_artist_id" "uuid", "p_user_id" "uuid", "p_instagram_handle" "text", "p_instagram_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision, "p_taxonomy" "public"."style_taxonomy") TO "anon";
GRANT ALL ON FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision, "p_taxonomy" "public"."style_taxonomy") TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_embedding_styles"("p_embedding" "public"."vector", "p_max_styles" integer, "p_min_confidence" double precision, "p_taxonomy" "public"."style_taxonomy") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_email_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_image_style_tags"() TO "anon";
GRANT ALL ON FUNCTION "public"."compute_image_style_tags"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_image_style_tags"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_artists_without_images"() TO "anon";
GRANT ALL ON FUNCTION "public"."count_artists_without_images"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_artists_without_images"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "city_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "city_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_matching_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "city_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text", "p_target_artist_ids" "uuid"[], "p_target_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text", "p_target_artist_ids" "uuid"[], "p_target_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pipeline_run"("p_job_type" "text", "p_triggered_by" "text", "p_target_scope" "text", "p_target_artist_ids" "uuid"[], "p_target_city" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_encrypted_token"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_encrypted_token"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_encrypted_token"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_featured_artists"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_featured_artists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_featured_artists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text", "region_filter" "text", "country_filter" "text", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text", "region_filter" "text", "country_filter" "text", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_related_artists"("source_artist_id" "uuid", "city_filter" "text", "region_filter" "text", "country_filter" "text", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."format_location"("p_city" "text", "p_region" "text", "p_country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."format_location"("p_city" "text", "p_region" "text", "p_country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."format_location"("p_city" "text", "p_region" "text", "p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_cities_with_min_artists"("min_artist_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_by_handle"("p_instagram_handle" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_locations"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_locations"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_locations"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_portfolio"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_subscription_status"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_subscription_status"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_subscription_status"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artist_tier_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_artist_tier_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artist_tier_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer, "p_limit" integer, "p_search" "text", "p_location_city" "text", "p_location_state" "text", "p_tier" "text", "p_is_featured" boolean, "p_has_images" boolean, "p_sort_by" "text", "p_sort_order" "text", "p_min_followers" integer, "p_max_followers" integer, "p_min_images" integer, "p_max_images" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer, "p_limit" integer, "p_search" "text", "p_location_city" "text", "p_location_state" "text", "p_tier" "text", "p_is_featured" boolean, "p_has_images" boolean, "p_sort_by" "text", "p_sort_order" "text", "p_min_followers" integer, "p_max_followers" integer, "p_min_images" integer, "p_max_images" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_artists_with_image_counts"("p_offset" integer, "p_limit" integer, "p_search" "text", "p_location_city" "text", "p_location_state" "text", "p_tier" "text", "p_is_featured" boolean, "p_has_images" boolean, "p_sort_by" "text", "p_sort_order" "text", "p_min_followers" integer, "p_max_followers" integer, "p_min_images" integer, "p_max_images" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cities_with_counts"("min_count" integer, "p_country_code" "text", "p_region" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cities_with_counts"("min_count" integer, "p_country_code" "text", "p_region" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cities_with_counts"("min_count" integer, "p_country_code" "text", "p_region" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_countries_with_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_countries_with_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_countries_with_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_decrypted_token"("p_user_id" "uuid", "p_encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_decrypted_token"("p_user_id" "uuid", "p_encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_decrypted_token"("p_user_id" "uuid", "p_encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_homepage_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_homepage_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_homepage_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mining_city_distribution"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_mining_city_distribution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mining_city_distribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mining_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_mining_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mining_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_search_appearances"("p_artist_id" "uuid", "p_days" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_regions_with_counts"("p_country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_regions_with_counts"("p_country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_regions_with_counts"("p_country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_search_location_counts"("query_embedding" "public"."vector", "match_threshold" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_state_cities_with_counts"("state_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_artists_by_style"("p_style_slug" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_booking_click"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_booking_click"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_booking_click"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_image_view"("p_image_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_image_view"("p_image_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_image_view"("p_image_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_instagram_click"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_instagram_click"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_instagram_click"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_pipeline_progress"("run_id" "uuid", "processed_delta" integer, "failed_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_pipeline_progress"("run_id" "uuid", "processed_delta" integer, "failed_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_pipeline_progress"("run_id" "uuid", "processed_delta" integer, "failed_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_profile_view"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_profile_view"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_profile_view"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_search_appearances"("p_artist_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_gdpr_country"("country_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_gdpr_country"("country_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_gdpr_country"("country_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text", "p_resend_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text", "p_resend_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_email_send"("p_recipient_email" "text", "p_user_id" "uuid", "p_artist_id" "uuid", "p_email_type" "text", "p_subject" "text", "p_success" boolean, "p_error_message" "text", "p_resend_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."matches_location_filter"("p_city" "text", "p_region" "text", "p_country_code" "text", "city_filter" "text", "region_filter" "text", "country_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_artist_styles"("p_artist_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_artist_styles_on_image_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_artist_styles_on_image_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_artist_styles_on_image_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "city_filter" "text", "region_filter" "text", "country_filter" "text", "offset_param" integer, "query_techniques" "jsonb", "is_color_query" boolean, "query_themes" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "city_filter" "text", "region_filter" "text", "country_filter" "text", "offset_param" integer, "query_techniques" "jsonb", "is_color_query" boolean, "query_themes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_artists"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "city_filter" "text", "region_filter" "text", "country_filter" "text", "offset_param" integer, "query_techniques" "jsonb", "is_color_query" boolean, "query_themes" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_encrypted_token"("p_user_id" "uuid", "p_token_data" "text", "p_encryption_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_encrypted_token"("p_user_id" "uuid", "p_token_data" "text", "p_encryption_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_encrypted_token"("p_user_id" "uuid", "p_token_data" "text", "p_encryption_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_artist_to_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_artist_to_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_artist_to_locations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_primary_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_primary_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_primary_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_search_appearances_with_details"("p_search_id" "uuid", "p_appearances" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsubscribe_from_emails"("p_email" "text", "p_unsubscribe_all" boolean, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_artist_locations"("p_artist_id" "uuid", "p_locations" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_artist_locations"("p_artist_id" "uuid", "p_locations" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_artist_locations"("p_artist_id" "uuid", "p_locations" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_artist_pipeline_on_embedding"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_artist_pipeline_on_embedding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_artist_pipeline_on_embedding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_artist_styles_on_tag_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_artist_styles_on_tag_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_artist_styles_on_tag_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_marketing_outreach_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_marketing_outreach_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_marketing_outreach_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pipeline_runs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pipeline_runs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pipeline_runs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_training_label_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_training_label_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_training_label_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_vault_tokens"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_promo_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_create_secret"("secret" "text", "name" "text", "description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_delete_secret"("secret_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_get_decrypted_secret"("secret_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vault_update_secret"("secret_id" "uuid", "new_secret" "text") TO "service_role";



GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."airtable_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."airtable_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."airtable_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."artist_analytics" TO "anon";
GRANT ALL ON TABLE "public"."artist_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."artist_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."artist_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."artist_locations" TO "anon";
GRANT ALL ON TABLE "public"."artist_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_locations" TO "service_role";



GRANT ALL ON TABLE "public"."artist_pipeline_state" TO "anon";
GRANT ALL ON TABLE "public"."artist_pipeline_state" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_pipeline_state" TO "service_role";



GRANT ALL ON TABLE "public"."artist_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."artist_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."artist_style_profiles" TO "anon";
GRANT ALL ON TABLE "public"."artist_style_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_style_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."artist_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."artist_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."artist_sync_state" TO "anon";
GRANT ALL ON TABLE "public"."artist_sync_state" TO "authenticated";
GRANT ALL ON TABLE "public"."artist_sync_state" TO "service_role";



GRANT ALL ON TABLE "public"."artists" TO "anon";
GRANT ALL ON TABLE "public"."artists" TO "authenticated";
GRANT ALL ON TABLE "public"."artists" TO "service_role";



GRANT ALL ON TABLE "public"."artists_slug_backup" TO "anon";
GRANT ALL ON TABLE "public"."artists_slug_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."artists_slug_backup" TO "service_role";



GRANT ALL ON TABLE "public"."claim_attempts" TO "anon";
GRANT ALL ON TABLE "public"."claim_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."country_editorial_content" TO "anon";
GRANT ALL ON TABLE "public"."country_editorial_content" TO "authenticated";
GRANT ALL ON TABLE "public"."country_editorial_content" TO "service_role";



GRANT ALL ON TABLE "public"."discovery_queries" TO "anon";
GRANT ALL ON TABLE "public"."discovery_queries" TO "authenticated";
GRANT ALL ON TABLE "public"."discovery_queries" TO "service_role";



GRANT ALL ON TABLE "public"."email_log" TO "anon";
GRANT ALL ON TABLE "public"."email_log" TO "authenticated";
GRANT ALL ON TABLE "public"."email_log" TO "service_role";



GRANT ALL ON TABLE "public"."email_preferences" TO "anon";
GRANT ALL ON TABLE "public"."email_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."email_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."encrypted_instagram_tokens" TO "anon";
GRANT ALL ON TABLE "public"."encrypted_instagram_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."encrypted_instagram_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."follower_mining_runs" TO "anon";
GRANT ALL ON TABLE "public"."follower_mining_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."follower_mining_runs" TO "service_role";



GRANT ALL ON TABLE "public"."hashtag_mining_runs" TO "anon";
GRANT ALL ON TABLE "public"."hashtag_mining_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."hashtag_mining_runs" TO "service_role";



GRANT ALL ON TABLE "public"."image_style_tags" TO "anon";
GRANT ALL ON TABLE "public"."image_style_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."image_style_tags" TO "service_role";



GRANT ALL ON TABLE "public"."indexnow_submissions" TO "anon";
GRANT ALL ON TABLE "public"."indexnow_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."indexnow_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."instagram_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."instagram_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."instagram_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_outreach" TO "anon";
GRANT ALL ON TABLE "public"."marketing_outreach" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_outreach" TO "service_role";



GRANT ALL ON TABLE "public"."mining_candidates" TO "anon";
GRANT ALL ON TABLE "public"."mining_candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."mining_candidates" TO "service_role";



GRANT ALL ON TABLE "public"."onboarding_sessions" TO "anon";
GRANT ALL ON TABLE "public"."onboarding_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."onboarding_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_runs" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_runs" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_image_analytics" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_image_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_image_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_images" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_images" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_images" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."saved_artists" TO "anon";
GRANT ALL ON TABLE "public"."saved_artists" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_artists" TO "service_role";



GRANT ALL ON TABLE "public"."scraping_jobs" TO "anon";
GRANT ALL ON TABLE "public"."scraping_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."scraping_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."search_appearances" TO "anon";
GRANT ALL ON TABLE "public"."search_appearances" TO "authenticated";
GRANT ALL ON TABLE "public"."search_appearances" TO "service_role";



GRANT ALL ON TABLE "public"."searches" TO "anon";
GRANT ALL ON TABLE "public"."searches" TO "authenticated";
GRANT ALL ON TABLE "public"."searches" TO "service_role";



GRANT ALL ON TABLE "public"."style_seeds" TO "anon";
GRANT ALL ON TABLE "public"."style_seeds" TO "authenticated";
GRANT ALL ON TABLE "public"."style_seeds" TO "service_role";



GRANT ALL ON TABLE "public"."style_training_labels" TO "anon";
GRANT ALL ON TABLE "public"."style_training_labels" TO "authenticated";
GRANT ALL ON TABLE "public"."style_training_labels" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







