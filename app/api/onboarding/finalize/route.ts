/**
 * Onboarding Finalize
 *
 * Atomic transaction to complete onboarding:
 * 1. Create/update artist profile
 * 2. Insert selected portfolio images
 * 3. Delete onboarding session
 *
 * POST /api/onboarding/finalize
 *
 * Request: { sessionId: string }
 * Response: { success: true, artistId: string, artistSlug: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { finalizeOnboardingSchema } from '@/lib/onboarding/validation';
import { checkOnboardingRateLimit } from '@/lib/rate-limiter';
import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { sendWelcomeEmail } from '@/lib/email';

// Helper to generate artist slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check rate limit
    const rateLimit = await checkOnboardingRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.reset).toISOString(),
          },
        }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    let validatedData;

    try {
      validatedData = finalizeOnboardingSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { sessionId, keepSession } = validatedData;

    // 4. Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Onboarding session not found or expired' },
        { status: 404 }
      );
    }

    // 5. Verify session belongs to authenticated user
    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to finalize this session' },
        { status: 403 }
      );
    }

    // 6. Check session expiration
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Onboarding session has expired. Please start over.' },
        { status: 410 } // Gone
      );
    }

    // 6b. Idempotency check: If session already has artist_id, return it (prevents duplicate creation)
    if (session.artist_id) {
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id, slug')
        .eq('id', session.artist_id)
        .single();

      if (existingArtist) {
        console.log(`[Onboarding] Idempotent finalize: returning existing artist ${existingArtist.id}`);
        return NextResponse.json({
          success: true,
          artistId: existingArtist.id,
          artistSlug: existingArtist.slug,
        });
      }
    }

    // 7. Validate required data is present
    if (!session.profile_updates) {
      return NextResponse.json(
        { error: 'Incomplete onboarding data. Please complete all steps.' },
        { status: 400 }
      );
    }

    // Define types for session data
    interface ProfileUpdates {
      email?: string
      name: string
      bio?: string
      locations?: Array<{
        city?: string
        region?: string
        countryCode?: string
        locationType?: string
        isPrimary?: boolean
      }>
      city?: string
      state?: string
      autoSyncEnabled?: boolean
      filterNonTattoo?: boolean
    }
    interface FetchedImage {
      classified?: boolean
      instagram_post_id?: string
      url?: string
      caption?: string
    }
    interface ProfileData {
      bio?: string
      follower_count?: number
    }

    const profileUpdates = session.profile_updates as ProfileUpdates;
    const fetchedImages = (session.fetched_images as FetchedImage[]) || [];
    const profileData = (session.profile_data as ProfileData) || {};

    // Extract locations (new format) or fallback to legacy city/state
    const locations = profileUpdates.locations || [];
    const primaryLocation = locations.length > 0 ? locations[0] : null;

    // For backward compatibility, get city/state from primary location or legacy fields
    const artistCity = primaryLocation?.city || profileUpdates.city || '';
    const artistState = primaryLocation?.region || profileUpdates.state || '';

    // 8. Get user's Instagram username
    const { data: userData } = await supabase
      .from('users')
      .select('instagram_username, instagram_id')
      .eq('id', user.id)
      .single();

    if (!userData || !userData.instagram_username) {
      return NextResponse.json(
        { error: 'Instagram account not connected' },
        { status: 400 }
      );
    }

    const instagramUsername = userData.instagram_username;
    const instagramId = userData.instagram_id;

    // 9. Check if claiming existing artist or creating new one
    let artistId: string;
    let artistSlug: string;
    let isNewArtist = false;

    // Check if session has artist_id (claiming existing artist)
    if (session.artist_id) {
      artistId = session.artist_id;

      // Get artist's Pro status to enforce feature restrictions
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('is_pro')
        .eq('id', session.artist_id)
        .single();

      const isPro = existingArtist?.is_pro || false;

      // Update existing artist
      const { data: artist, error: updateError } = await supabase
        .from('artists')
        .update({
          name: profileUpdates.name,
          city: artistCity,
          state: artistState,
          bio_override: profileUpdates.bio || null,
          booking_url: session.booking_link || null,
          verification_status: 'claimed',
          claimed_by_user_id: user.id,
          claimed_at: new Date().toISOString(),
          // Pro-only: Filter can only be disabled by Pro users (free users always filter)
          filter_non_tattoo_content: isPro
            ? (profileUpdates.filterNonTattoo !== undefined ? profileUpdates.filterNonTattoo : true)
            : true,
        })
        .eq('id', artistId)
        .select('slug')
        .single();

      if (updateError || !artist) {
        console.error('[Onboarding] Failed to update artist:', updateError);
        return NextResponse.json(
          { error: 'Failed to update artist profile' },
          { status: 500 }
        );
      }

      // Upsert sync state for claimed artist
      await supabase
        .from('artist_sync_state')
        .upsert({
          artist_id: artistId,
          auto_sync_enabled: isPro ? (profileUpdates.autoSyncEnabled || false) : false,
        }, { onConflict: 'artist_id' });

      artistSlug = artist.slug;
    } else {
      // Create new artist
      isNewArtist = true;
      artistId = randomUUID();
      artistSlug = generateSlug(profileUpdates.name);

      // Check if slug already exists, append number if needed
      // Use two separate queries to avoid SQL injection risk with .or()
      const { data: exactMatch } = await supabase
        .from('artists')
        .select('slug')
        .eq('slug', artistSlug)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        // Slug exists, find all similar slugs with numbers
        const { data: similarSlugs } = await supabase
          .from('artists')
          .select('slug')
          .like('slug', `${artistSlug}-%`)
          .order('slug', { ascending: false })
          .limit(20);

        // Extract numbers from existing slugs and find the highest
        const numbers = (similarSlugs || [])
          .map((s) => {
            // Safely escape regex special characters in artistSlug
            const escapedSlug = artistSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = s.slug.match(new RegExp(`^${escapedSlug}-(\\d+)$`));
            return match ? parseInt(match[1]) : 0;
          })
          .filter((n) => n > 0);

        const highestNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = highestNumber > 0 ? highestNumber + 1 : 1;

        artistSlug = `${artistSlug}-${nextNumber}`;
      }

      // New artists start as free tier (is_pro defaults to FALSE)
      // Pro features can only be enabled after upgrading
      const { error: insertError } = await supabase
        .from('artists')
        .insert({
          id: artistId,
          name: profileUpdates.name,
          slug: artistSlug,
          city: artistCity,
          state: artistState,
          bio: profileData.bio || null,
          bio_override: profileUpdates.bio || null,
          booking_url: session.booking_link || null,
          instagram_handle: instagramUsername,
          instagram_id: instagramId,
          instagram_url: `https://instagram.com/${instagramUsername}`,
          follower_count: profileData.follower_count || null,
          verification_status: 'claimed',
          claimed_by_user_id: user.id,
          claimed_at: new Date().toISOString(),
          discovery_source: 'self_add',
          filter_non_tattoo_content: true, // Free users always filter
        });

      if (insertError) {
        console.error('[Onboarding] Failed to create artist:', insertError);
        return NextResponse.json(
          { error: 'Failed to create artist profile' },
          { status: 500 }
        );
      }

      // Create initial sync state for new artist (auto_sync disabled for free tier)
      await supabase
        .from('artist_sync_state')
        .insert({
          artist_id: artistId,
          auto_sync_enabled: false,
        });
    }

    // 9. Insert locations to artist_locations table
    if (locations.length > 0) {
      // First, delete any existing locations for this artist (for claimed artists)
      if (session.artist_id) {
        await supabase
          .from('artist_locations')
          .delete()
          .eq('artist_id', artistId);
      }

      // Insert new locations
      const locationInserts = locations.map((loc, index) => ({
        artist_id: artistId,
        city: loc.city || null,
        region: loc.region || null,
        country_code: loc.countryCode || 'US',
        location_type: loc.locationType || 'city',
        is_primary: loc.isPrimary || index === 0,
        display_order: index,
      }));

      const { error: locationsError } = await supabase
        .from('artist_locations')
        .insert(locationInserts);

      if (locationsError) {
        console.error('[Onboarding] Failed to insert locations:', locationsError);
        // Non-critical error - artist was created, locations can be added later
        // Continue with the rest of onboarding
      }
    }

    // 10. Check for marketing outreach - auto-grant 3-month Pro if contacted
    const { data: outreach } = await supabase
      .from('marketing_outreach')
      .select('id, campaign_name')
      .eq('artist_id', artistId)
      .is('claimed_at', null)
      .single();

    if (outreach) {
      console.log(`[Onboarding] Artist ${artistId} has pending outreach - granting 3-month Pro`);

      const proExpiresAt = new Date();
      proExpiresAt.setMonth(proExpiresAt.getMonth() + 3);

      // Update artist to Pro
      await supabase
        .from('artists')
        .update({ is_pro: true })
        .eq('id', artistId);

      // Create subscription record
      await supabase.from('artist_subscriptions').insert({
        user_id: user.id,
        artist_id: artistId,
        subscription_type: 'pro',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: proExpiresAt.toISOString(),
        promo_code: 'OUTREACH_3MO_FREE',
      });

      // Update outreach record
      await supabase
        .from('marketing_outreach')
        .update({
          claimed_at: new Date().toISOString(),
          pro_granted_at: new Date().toISOString(),
          pro_expires_at: proExpiresAt.toISOString(),
        })
        .eq('id', outreach.id);

      console.log(`[Onboarding] Granted Pro until ${proExpiresAt.toISOString()}`);
    }

    // 11. Insert ALL classified portfolio images (auto-import)
    const classifiedImages = fetchedImages.filter((img) =>
      img.classified === true
    );

    // Don't fail if no images - create artist anyway
    if (classifiedImages.length === 0) {
      console.log('[Onboarding] No classified images found, creating artist without portfolio');
    }

    const portfolioImages = classifiedImages.map((img) => ({
      id: randomUUID(),
      artist_id: artistId,
      instagram_post_id: img.instagram_post_id,
      instagram_url: img.url,
      post_caption: img.caption || null,
      post_timestamp: new Date().toISOString(),
      likes_count: null,
      status: 'active',
      manually_added: false, // Auto-imported, not manually selected
      import_source: 'oauth_onboarding',
      is_tattoo: true, // Image was classified as tattoo during fetch
      tattoo_confidence: 1.0, // Passed GPT classification
      // Note: embeddings will be generated asynchronously after this completes
      // Storage paths will be populated by image processing pipeline
    }));

    // Only insert if we have images
    if (portfolioImages.length > 0) {
      const { error: imagesError } = await supabase
        .from('portfolio_images')
        .insert(portfolioImages);

      if (imagesError) {
        console.error('[Onboarding] Failed to insert portfolio images:', imagesError);
        // Don't fail - artist still created
      }
    }

    // 9. Update user email if provided during onboarding (BEFORE deleting session)
    const rawEmail = profileUpdates.email;
    let normalizedEmail: string | null = null;

    if (rawEmail) {
      // Normalize email: lowercase and trim
      normalizedEmail = rawEmail.toLowerCase().trim();

      // Server-side validation
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address format' },
          { status: 400 }
        );
      }
      if (normalizedEmail.length > 254) {
        return NextResponse.json(
          { error: 'Email address is too long' },
          { status: 400 }
        );
      }
      if (normalizedEmail.endsWith('@instagram.inkdex.io')) {
        return NextResponse.json(
          { error: 'Please use your real email address' },
          { status: 400 }
        );
      }

      // Update users table (replaces synthetic Instagram placeholder email)
      const { error: emailUpdateError } = await supabase
        .from('users')
        .update({
          email: normalizedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (emailUpdateError) {
        // Check for unique constraint violation
        if (emailUpdateError.code === '23505') {
          return NextResponse.json(
            { error: 'This email is already associated with another account' },
            { status: 409 }
          );
        }
        console.error('[Onboarding] Failed to update user email:', emailUpdateError);
        // Non-critical for other errors - continue with onboarding
      } else {
        console.log(`[Onboarding] Updated user email to ${normalizedEmail}`);

        // Also update Supabase Auth user email
        const adminClient = createAdminClient();
        const { error: authEmailError } = await adminClient.auth.admin.updateUserById(
          user.id,
          { email: normalizedEmail }
        );

        if (authEmailError) {
          console.error('[Onboarding] Failed to update auth email:', authEmailError);
          // Non-critical - continue
        }
      }
    }

    // 10. Delete onboarding session (AFTER email update to preserve state on failure)
    // Skip deletion if keepSession=true (for multi-step flows where optional steps follow)
    if (!keepSession) {
      const { error: deleteError } = await supabase
        .from('onboarding_sessions')
        .delete()
        .eq('id', sessionId);

      if (deleteError) {
        console.error('[Onboarding] Failed to delete session:', deleteError);
        // Non-critical error, continue
      }
    } else {
      // Update session with artist_id for subsequent steps
      const { error: updateError } = await supabase
        .from('onboarding_sessions')
        .update({ artist_id: artistId })
        .eq('id', sessionId);

      if (updateError) {
        console.error('[Onboarding] Failed to update session with artist_id:', updateError);
        // Non-critical error, continue
      }
    }

    console.log(`[Onboarding] Finalized for user ${user.id}: ${isNewArtist ? 'created' : 'updated'} artist ${artistId}`);

    // 11. Send welcome email (async, non-blocking)
    const emailToUse = normalizedEmail || user.email;
    if (emailToUse && !emailToUse.endsWith('@instagram.inkdex.io')) {
      // Check if artist has Pro subscription
      const { data: subscription } = await supabase
        .from('artist_subscriptions')
        .select('tier, status')
        .eq('artist_id', artistId)
        .eq('status', 'active')
        .single();

      const isPro = subscription?.tier === 'pro';
      const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://inkdex.io'}/${artistSlug}`;

      // Send email asynchronously (don't await to avoid blocking)
      sendWelcomeEmail({
        to: emailToUse,
        artistName: profileUpdates.name,
        profileUrl,
        instagramHandle: instagramUsername,
        isPro,
      }).catch((error) => {
        console.error('[Onboarding] Failed to send welcome email:', error);
        // Don't fail the request if email fails
      });
    }

    // 11. TODO: Trigger background embedding generation
    // This will be implemented later as an async job

    return NextResponse.json({
      success: true,
      artistId,
      artistSlug,
      fetchStatus: session.fetch_status || 'pending',
      imagesImported: portfolioImages.length,
    });
  } catch (error) {
    console.error('[Onboarding] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
