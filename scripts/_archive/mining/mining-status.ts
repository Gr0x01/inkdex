#!/usr/bin/env npx tsx
/**
 * Mining Status Script
 *
 * Displays summary statistics for hashtag and follower mining operations.
 *
 * Usage:
 *   npm run mine:status
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Supabase Client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Status Functions
// ============================================================================

async function getHashtagMiningStats() {
  const { data, error } = await supabase
    .from('hashtag_mining_runs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching hashtag mining stats:', error);
    return null;
  }

  const completed = data.filter(r => r.status === 'completed');
  const failed = data.filter(r => r.status === 'failed');
  const running = data.filter(r => r.status === 'running');

  const totals = completed.reduce(
    (acc, r) => ({
      posts: acc.posts + (r.posts_scraped || 0),
      handles: acc.handles + (r.unique_handles_found || 0),
      bioPass: acc.bioPass + (r.bio_filter_passed || 0),
      imagePass: acc.imagePass + (r.image_filter_passed || 0),
      inserted: acc.inserted + (r.artists_inserted || 0),
      apifyCost: acc.apifyCost + parseFloat(r.apify_cost_estimate || '0'),
      openaiCost: acc.openaiCost + parseFloat(r.openai_cost_estimate || '0'),
    }),
    { posts: 0, handles: 0, bioPass: 0, imagePass: 0, inserted: 0, apifyCost: 0, openaiCost: 0 }
  );

  return {
    total: data.length,
    completed: completed.length,
    failed: failed.length,
    running: running.length,
    ...totals,
    recentRuns: data.slice(0, 5),
  };
}

async function getFollowerMiningStats() {
  const { data, error } = await supabase
    .from('follower_mining_runs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching follower mining stats:', error);
    return null;
  }

  const completed = data.filter(r => r.status === 'completed');
  const failed = data.filter(r => r.status === 'failed');
  const running = data.filter(r => r.status === 'running');

  const totals = completed.reduce(
    (acc, r) => ({
      followers: acc.followers + (r.followers_scraped || 0),
      bioPass: acc.bioPass + (r.bio_filter_passed || 0),
      imagePass: acc.imagePass + (r.image_filter_passed || 0),
      inserted: acc.inserted + (r.artists_inserted || 0),
      private: acc.private + (r.artists_skipped_private || 0),
      apifyCost: acc.apifyCost + parseFloat(r.apify_cost_estimate || '0'),
      openaiCost: acc.openaiCost + parseFloat(r.openai_cost_estimate || '0'),
    }),
    { followers: 0, bioPass: 0, imagePass: 0, inserted: 0, private: 0, apifyCost: 0, openaiCost: 0 }
  );

  // Group by seed type
  const byType = completed.reduce((acc, r) => {
    const type = r.seed_type || 'unknown';
    if (!acc[type]) {
      acc[type] = { count: 0, inserted: 0 };
    }
    acc[type].count++;
    acc[type].inserted += r.artists_inserted || 0;
    return acc;
  }, {} as Record<string, { count: number; inserted: number }>);

  return {
    total: data.length,
    completed: completed.length,
    failed: failed.length,
    running: running.length,
    byType,
    ...totals,
    recentRuns: data.slice(0, 5),
  };
}

async function getArtistsByDiscoverySource() {
  const { data, error } = await supabase
    .from('artists')
    .select('discovery_source, city')
    .not('discovery_source', 'is', null);

  if (error) {
    console.error('Error fetching artists by source:', error);
    return null;
  }

  // Group by discovery source
  const bySource = data.reduce((acc, a) => {
    const source = a.discovery_source || 'unknown';
    const sourceType = source.startsWith('hashtag_') ? 'hashtag_mining' :
                       source.startsWith('follower_') ? 'follower_mining' :
                       source.startsWith('tavily_') ? 'tavily' :
                       source === 'google_places' ? 'google_places' : 'other';

    if (!acc[sourceType]) {
      acc[sourceType] = { total: 0, withCity: 0, details: {} as Record<string, number> };
    }
    acc[sourceType].total++;
    if (a.city) acc[sourceType].withCity++;

    // Track detailed sources
    if (!acc[sourceType].details[source]) {
      acc[sourceType].details[source] = 0;
    }
    acc[sourceType].details[source]++;

    return acc;
  }, {} as Record<string, { total: number; withCity: number; details: Record<string, number> }>);

  return bySource;
}

async function getCityDistribution() {
  const { data, error } = await supabase
    .from('artists')
    .select('city, discovery_source')
    .or('discovery_source.like.hashtag_%,discovery_source.like.follower_%');

  if (error) {
    console.error('Error fetching city distribution:', error);
    return null;
  }

  // Group by city
  const byCity = data.reduce((acc, a) => {
    const city = a.city || 'Unknown';
    if (!acc[city]) acc[city] = 0;
    acc[city]++;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count
  const sorted = Object.entries(byCity)
    .sort((a, b) => b[1] - a[1]);

  return sorted;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('MINING STATUS REPORT');
  console.log('='.repeat(60));

  // Hashtag Mining Stats
  console.log('\n📌 HASHTAG MINING');
  console.log('─'.repeat(40));
  const hashtagStats = await getHashtagMiningStats();
  if (hashtagStats) {
    console.log(`  Runs: ${hashtagStats.completed} completed, ${hashtagStats.failed} failed, ${hashtagStats.running} running`);
    console.log(`  Posts scraped: ${hashtagStats.posts.toLocaleString()}`);
    console.log(`  Unique handles: ${hashtagStats.handles.toLocaleString()}`);
    console.log(`  Bio filter passed: ${hashtagStats.bioPass.toLocaleString()}`);
    console.log(`  Image filter passed: ${hashtagStats.imagePass.toLocaleString()}`);
    console.log(`  Artists inserted: ${hashtagStats.inserted.toLocaleString()}`);
    console.log(`  Apify cost: $${hashtagStats.apifyCost.toFixed(4)}`);
    console.log(`  OpenAI cost: $${hashtagStats.openaiCost.toFixed(4)}`);

    if (hashtagStats.recentRuns.length > 0) {
      console.log('\n  Recent runs:');
      hashtagStats.recentRuns.slice(0, 3).forEach(r => {
        const status = r.status === 'completed' ? '✅' : r.status === 'failed' ? '❌' : '⏳';
        console.log(`    ${status} #${r.hashtag}: ${r.artists_inserted || 0} artists (${r.posts_scraped || 0} posts)`);
      });
    }
  }

  // Follower Mining Stats
  console.log('\n👥 FOLLOWER MINING');
  console.log('─'.repeat(40));
  const followerStats = await getFollowerMiningStats();
  if (followerStats) {
    console.log(`  Runs: ${followerStats.completed} completed, ${followerStats.failed} failed, ${followerStats.running} running`);
    console.log(`  Followers scraped: ${followerStats.followers.toLocaleString()}`);
    console.log(`  Skipped (private): ${followerStats.private.toLocaleString()}`);
    console.log(`  Bio filter passed: ${followerStats.bioPass.toLocaleString()}`);
    console.log(`  Image filter passed: ${followerStats.imagePass.toLocaleString()}`);
    console.log(`  Artists inserted: ${followerStats.inserted.toLocaleString()}`);
    console.log(`  Apify cost: $${followerStats.apifyCost.toFixed(4)}`);
    console.log(`  OpenAI cost: $${followerStats.openaiCost.toFixed(4)}`);

    if (Object.keys(followerStats.byType).length > 0) {
      console.log('\n  By seed type:');
      Object.entries(followerStats.byType).forEach(([type, stats]) => {
        console.log(`    ${type}: ${stats.count} seeds → ${stats.inserted} artists`);
      });
    }
  }

  // Discovery Source Breakdown
  console.log('\n📊 ARTISTS BY DISCOVERY SOURCE');
  console.log('─'.repeat(40));
  const sourceStats = await getArtistsByDiscoverySource();
  if (sourceStats) {
    Object.entries(sourceStats).forEach(([source, stats]) => {
      const locationRate = stats.total > 0 ? ((stats.withCity / stats.total) * 100).toFixed(1) : '0';
      console.log(`  ${source}: ${stats.total.toLocaleString()} artists (${locationRate}% with city)`);
    });
  }

  // City Distribution for mined artists
  console.log('\n🏙️ MINED ARTISTS BY CITY');
  console.log('─'.repeat(40));
  const cityDist = await getCityDistribution();
  if (cityDist) {
    cityDist.slice(0, 10).forEach(([city, count]) => {
      const bar = '█'.repeat(Math.min(20, Math.ceil(count / 10)));
      console.log(`  ${city.padEnd(15)} ${count.toString().padStart(5)} ${bar}`);
    });
    if (cityDist.length > 10) {
      console.log(`  ... and ${cityDist.length - 10} more cities`);
    }
  }

  // Total costs
  console.log('\n💰 TOTAL COSTS');
  console.log('─'.repeat(40));
  const totalApify = (hashtagStats?.apifyCost || 0) + (followerStats?.apifyCost || 0);
  const totalOpenAI = (hashtagStats?.openaiCost || 0) + (followerStats?.openaiCost || 0);
  console.log(`  Apify: $${totalApify.toFixed(4)}`);
  console.log(`  OpenAI: $${totalOpenAI.toFixed(4)}`);
  console.log(`  Total: $${(totalApify + totalOpenAI).toFixed(4)}`);

  // Total artists from mining
  const totalMined = (hashtagStats?.inserted || 0) + (followerStats?.inserted || 0);
  if (totalMined > 0) {
    const costPerArtist = (totalApify + totalOpenAI) / totalMined;
    console.log(`  Cost per artist: $${costPerArtist.toFixed(4)}`);
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
