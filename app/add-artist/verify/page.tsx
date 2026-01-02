/**
 * Self-Add Verification Page
 *
 * Server component that runs after OAuth success:
 * 1. Verify user is authenticated
 * 2. Check if artist already exists
 * 3. Run classifier on user's Instagram profile
 * 4. Create artist record if passed
 * 5. Redirect to onboarding
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { classifyTattooArtist } from '@/lib/instagram/classifier';

export default async function VerifyPage() {
  const supabase = await createClient();

  // 1. Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/add-artist?error=auth_required');
  }

  // 2. Get user's Instagram data from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('instagram_id, instagram_username')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.instagram_username) {
    redirect('/add-artist?error=no_instagram_data');
  }

  const { instagram_id, instagram_username } = userData;

  // 3. Check if artist already exists
  // First check by instagram_id (most reliable)
  if (instagram_id) {
    const { data: existingById } = await supabase
      .from('artists')
      .select('id, slug, claimed_by_user_id, instagram_handle')
      .eq('instagram_id', instagram_id)
      .maybeSingle();

    if (existingById) {
      // Artist exists - check claim status
      if (existingById.claimed_by_user_id === user.id) {
        // Already claimed by this user - redirect to profile
        redirect(`/artists/${existingById.slug}`);
      } else if (existingById.claimed_by_user_id) {
        // Claimed by someone else
        redirect('/add-artist?error=already_claimed');
      } else {
        // Unclaimed - redirect to claim flow
        redirect(`/artists/${existingById.slug}/claim`);
      }
    }
  }

  // Check by handle (case-insensitive)
  const { data: existingByHandle } = await supabase
    .rpc('get_artist_by_handle', {
      p_instagram_handle: instagram_username,
    })
    .maybeSingle() as { data: any };

  if (existingByHandle) {
    // Artist exists - check claim status
    if (existingByHandle.claimed_by_user_id === user.id) {
      redirect(`/artists/${existingByHandle.slug}`);
    } else if (existingByHandle.claimed_by_user_id) {
      redirect('/add-artist?error=already_claimed');
    } else {
      redirect(`/artists/${existingByHandle.slug}/claim`);
    }
  }

  // 4. Run classifier on user's Instagram profile
  const classifierResult = await classifyTattooArtist(instagram_username);

  if (!classifierResult.passed) {
    // Failed classifier - show error page
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-paper-dark border border-gray-800 rounded-lg p-8">
          <div className="text-center space-y-4">
            <div className="text-5xl">❌</div>
            <h1 className="font-display text-2xl text-white">
              Verification Failed
            </h1>
            <p className="text-gray-400 font-body">
              {classifierResult.details ||
                'Your Instagram profile does not appear to be a tattoo artist account.'}
            </p>
            <p className="text-sm text-gray-500 font-body">
              Classifier method: {classifierResult.method}
              {classifierResult.confidence > 0 && (
                <>
                  <br />
                  Confidence: {Math.round(classifierResult.confidence * 100)}%
                </>
              )}
            </p>
            <a
              href="/add-artist"
              className="inline-block mt-4 px-6 py-2 bg-ether text-ink font-body font-medium rounded-lg
                       hover:bg-ether-light transition-colors"
            >
              Back to Add Artist
            </a>
          </div>
        </div>
      </main>
    );
  }

  // 5. Create artist record
  const slug = instagram_username.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const { data: newArtist, error: artistError } = await supabase
    .from('artists')
    .insert({
      instagram_handle: instagram_username,
      instagram_id: instagram_id || null,
      name: instagram_username, // Will be updated in onboarding
      slug,
      city: 'pending', // Will be set in onboarding
      bio: classifierResult.bio,
      follower_count: classifierResult.follower_count,
      claimed_by_user_id: user.id,
      claimed_at: new Date().toISOString(),
      verification_status: 'verified',
      discovery_source: 'self_add',
    })
    .select('id, slug')
    .single();

  if (artistError || !newArtist) {
    console.error('[Verify] Error creating artist:', artistError);
    redirect('/add-artist?error=creation_failed');
  }

  // Create scraping job (optional - may be handled in onboarding)
  await supabase.from('scraping_jobs').insert({
    artist_id: newArtist.id,
    status: 'pending',
    images_scraped: 0,
  });

  // 6. Redirect to onboarding with artist_id
  redirect(`/onboarding/fetch?artist_id=${newArtist.id}&new=true`);
}
