-- Migration: Consolidate increment functions
-- Replaces: increment_profile_view, increment_image_view, increment_instagram_click,
--           increment_booking_click, increment_search_appearances, increment_pipeline_progress

-- Create unified analytics increment function
CREATE OR REPLACE FUNCTION increment_analytics(
    p_event_type text,
    p_artist_id uuid DEFAULT NULL,
    p_image_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_artist_id UUID;
BEGIN
    CASE p_event_type
        WHEN 'profile_view' THEN
            IF p_artist_id IS NULL THEN
                RAISE EXCEPTION 'artist_id required for profile_view';
            END IF;
            INSERT INTO artist_analytics (artist_id, date, profile_views)
            VALUES (p_artist_id, CURRENT_DATE, 1)
            ON CONFLICT (artist_id, date) DO UPDATE
            SET profile_views = artist_analytics.profile_views + 1;

        WHEN 'image_view' THEN
            IF p_image_id IS NULL THEN
                RAISE EXCEPTION 'image_id required for image_view';
            END IF;
            SELECT artist_id INTO v_artist_id FROM portfolio_images WHERE id = p_image_id;
            IF v_artist_id IS NULL THEN
                RAISE EXCEPTION 'Image not found: %', p_image_id;
            END IF;

            INSERT INTO portfolio_image_analytics (image_id, artist_id, date, view_count)
            VALUES (p_image_id, v_artist_id, CURRENT_DATE, 1)
            ON CONFLICT (image_id, date) DO UPDATE
            SET view_count = portfolio_image_analytics.view_count + 1;

            INSERT INTO artist_analytics (artist_id, date, image_views)
            VALUES (v_artist_id, CURRENT_DATE, 1)
            ON CONFLICT (artist_id, date) DO UPDATE
            SET image_views = artist_analytics.image_views + 1;

        WHEN 'instagram_click' THEN
            IF p_artist_id IS NULL THEN
                RAISE EXCEPTION 'artist_id required for instagram_click';
            END IF;
            INSERT INTO artist_analytics (artist_id, date, instagram_clicks)
            VALUES (p_artist_id, CURRENT_DATE, 1)
            ON CONFLICT (artist_id, date) DO UPDATE
            SET instagram_clicks = artist_analytics.instagram_clicks + 1;

        WHEN 'booking_click' THEN
            IF p_artist_id IS NULL THEN
                RAISE EXCEPTION 'artist_id required for booking_click';
            END IF;
            INSERT INTO artist_analytics (artist_id, date, booking_link_clicks)
            VALUES (p_artist_id, CURRENT_DATE, 1)
            ON CONFLICT (artist_id, date) DO UPDATE
            SET booking_link_clicks = artist_analytics.booking_link_clicks + 1;

        ELSE
            RAISE EXCEPTION 'Unknown event type: %', p_event_type;
    END CASE;
END;
$$;

-- Grant execute to authenticated users (for client-side analytics)
GRANT EXECUTE ON FUNCTION increment_analytics(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_analytics(text, uuid, uuid) TO anon;

-- Drop old functions
DROP FUNCTION IF EXISTS increment_profile_view(uuid);
DROP FUNCTION IF EXISTS increment_image_view(uuid);
DROP FUNCTION IF EXISTS increment_instagram_click(uuid);
DROP FUNCTION IF EXISTS increment_booking_click(uuid);
DROP FUNCTION IF EXISTS increment_search_appearances(uuid[]);
DROP FUNCTION IF EXISTS increment_pipeline_progress(uuid, int, int);
