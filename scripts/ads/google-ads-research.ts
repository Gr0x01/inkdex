/**
 * Google Ads Keyword Research for Inkdex
 *
 * Purpose: Find optimal keywords and cities for a $250 ad budget
 * Uses DataForSEO Google Ads Search Volume API for CPC estimates
 *
 * Strategy:
 * 1. Compare keyword categories (generic vs style-specific vs visual)
 * 2. Sample cities across cost tiers
 * 3. Find best value: high intent + low CPC + good artist coverage
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3';

const authHeader = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

// Budget constraints
const TOTAL_BUDGET = 250;

// City tiers based on artist coverage + competition
// Tier 1: High coverage cities (good value delivery, but may have higher CPC)
// Tier 2: Mid-tier cities (good coverage, moderate CPC)
// Tier 3: Lower competition cities (potentially lower CPC)
const SAMPLE_CITIES = {
  tier1_high_coverage: [
    { name: 'Los Angeles', state: 'CA', artists: 1059 },
    { name: 'Austin', state: 'TX', artists: 254 },
    { name: 'Seattle', state: 'WA', artists: 273 },
  ],
  tier2_mid_market: [
    { name: 'Nashville', state: 'TN', artists: 128 },
    { name: 'Salt Lake City', state: 'UT', artists: 168 },
    { name: 'Richmond', state: 'VA', artists: 129 },
  ],
  tier3_low_competition: [
    { name: 'Asheville', state: 'NC', artists: 121 },
    { name: 'Boise', state: 'ID', artists: 133 },
    { name: 'Albuquerque', state: 'NM', artists: 125 },
  ],
  tier4_small_market: [
    { name: 'Fargo', state: 'ND', artists: 50 },
    { name: 'Sioux Falls', state: 'SD', artists: 50 },
    { name: 'Bozeman', state: 'MT', artists: 50 },
  ],
};

// Keyword categories - testing different intent levels
const KEYWORD_TEMPLATES = {
  // High intent - people actively looking for an artist
  high_intent: [
    'tattoo artist {city}',
    'best tattoo artist {city}',
    'tattoo artists near me {city}',
    'find tattoo artist {city}',
  ],

  // Style-specific - our unique value prop, likely lower competition
  style_specific: [
    'fine line tattoo {city}',
    'blackwork tattoo {city}',
    'realism tattoo {city}',
    'traditional tattoo {city}',
    'minimalist tattoo {city}',
  ],

  // Visual/inspiration - matches our product perfectly
  visual_search: [
    'tattoo ideas {city}',
    'tattoo inspiration {city}',
    'tattoo portfolio {city}',
    'tattoo designs {city}',
  ],

  // Shop queries - transactional but may not match our product
  shop_queries: [
    'tattoo shop {city}',
    'tattoo parlor {city}',
    'tattoo studio {city}',
  ],

  // First-timer queries - high value users
  first_timer: [
    'first tattoo {city}',
    'small tattoo ideas {city}',
    'tattoo consultation {city}',
  ],
};

interface KeywordResult {
  keyword: string;
  category: string;
  city: string;
  state: string;
  cityTier: string;
  searchVolume: number;
  cpc: number;
  competition: string;
  competitionIndex: number;
}

interface CategorySummary {
  category: string;
  avgCpc: number;
  avgVolume: number;
  avgCompetition: number;
  totalKeywords: number;
  estimatedClicksFor250: number;
  keywords: KeywordResult[];
}

interface CityTierSummary {
  tier: string;
  avgCpc: number;
  avgVolume: number;
  cities: string[];
  estimatedClicksFor250: number;
}

/**
 * Fetch keyword metrics from DataForSEO
 */
async function getKeywordMetrics(keywords: string[]): Promise<any[]> {
  const requestBody = [{
    location_code: 2840, // United States
    language_code: 'en',
    keywords,
  }];

  try {
    const response = await axios.post(
      `${DATAFORSEO_API_URL}/keywords_data/google_ads/search_volume/live`,
      requestBody,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const task = response.data?.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      console.error('API Error:', task?.status_message || 'Unknown error');
      return [];
    }

    return task.result || [];
  } catch (error: any) {
    console.error('Error fetching keyword metrics:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Generate all keyword variations for a city
 */
function generateKeywordsForCity(
  city: { name: string; state: string; artists: number },
  tier: string
): { keyword: string; category: string; city: string; state: string; tier: string }[] {
  const keywords: { keyword: string; category: string; city: string; state: string; tier: string }[] = [];

  for (const [category, templates] of Object.entries(KEYWORD_TEMPLATES)) {
    for (const template of templates) {
      keywords.push({
        keyword: template.replace('{city}', city.name.toLowerCase()),
        category,
        city: city.name,
        state: city.state,
        tier,
      });
    }
  }

  return keywords;
}

/**
 * Main research function
 */
async function runResearch() {
  console.log('🎯 Google Ads Keyword Research for Inkdex');
  console.log(`💰 Budget: $${TOTAL_BUDGET}`);
  console.log('='.repeat(60) + '\n');

  // Generate all keywords to research
  const allKeywordMeta: { keyword: string; category: string; city: string; state: string; tier: string }[] = [];

  for (const [tier, cities] of Object.entries(SAMPLE_CITIES)) {
    for (const city of cities) {
      const cityKeywords = generateKeywordsForCity(city, tier);
      allKeywordMeta.push(...cityKeywords);
    }
  }

  console.log(`📊 Researching ${allKeywordMeta.length} keywords across ${Object.values(SAMPLE_CITIES).flat().length} cities...\n`);

  // Batch keywords (DataForSEO allows up to 1000 per request)
  const batchSize = 100;
  const allResults: KeywordResult[] = [];

  for (let i = 0; i < allKeywordMeta.length; i += batchSize) {
    const batch = allKeywordMeta.slice(i, i + batchSize);
    const keywords = batch.map(k => k.keyword);

    console.log(`  Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allKeywordMeta.length / batchSize)}...`);

    const results = await getKeywordMetrics(keywords);

    // Match results back to metadata
    for (const result of results) {
      const meta = batch.find(k => k.keyword === result.keyword);
      if (meta && result.cpc !== null) {
        allResults.push({
          keyword: result.keyword,
          category: meta.category,
          city: meta.city,
          state: meta.state,
          cityTier: meta.tier,
          searchVolume: result.search_volume || 0,
          cpc: result.cpc || 0,
          competition: result.competition || 'UNKNOWN',
          competitionIndex: result.competition_index || 0,
        });
      }
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Received data for ${allResults.length} keywords with CPC data\n`);

  // Filter out zero CPC (no data)
  const validResults = allResults.filter(r => r.cpc > 0);

  if (validResults.length === 0) {
    console.log('❌ No valid CPC data returned. Check API credentials or try different keywords.');
    return;
  }

  // Analyze by category
  console.log('='.repeat(60));
  console.log('📈 ANALYSIS BY KEYWORD CATEGORY');
  console.log('='.repeat(60) + '\n');

  const categoryMap = new Map<string, KeywordResult[]>();
  for (const result of validResults) {
    const existing = categoryMap.get(result.category) || [];
    existing.push(result);
    categoryMap.set(result.category, existing);
  }

  const categorySummaries: CategorySummary[] = [];
  for (const [category, keywords] of categoryMap) {
    const avgCpc = keywords.reduce((sum, k) => sum + k.cpc, 0) / keywords.length;
    const avgVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0) / keywords.length;
    const avgCompetition = keywords.reduce((sum, k) => sum + k.competitionIndex, 0) / keywords.length;

    categorySummaries.push({
      category,
      avgCpc,
      avgVolume,
      avgCompetition,
      totalKeywords: keywords.length,
      estimatedClicksFor250: Math.floor(TOTAL_BUDGET / avgCpc),
      keywords,
    });
  }

  // Sort by CPC (lowest first = best value)
  categorySummaries.sort((a, b) => a.avgCpc - b.avgCpc);

  for (const summary of categorySummaries) {
    console.log(`\n📌 ${summary.category.toUpperCase().replace('_', ' ')}`);
    console.log(`   Avg CPC: $${summary.avgCpc.toFixed(2)}`);
    console.log(`   Avg Monthly Volume: ${Math.round(summary.avgVolume).toLocaleString()}`);
    console.log(`   Avg Competition: ${(summary.avgCompetition * 100).toFixed(0)}%`);
    console.log(`   Est. clicks for $250: ~${summary.estimatedClicksFor250}`);

    // Show top 3 lowest CPC keywords in this category
    const topKeywords = summary.keywords.sort((a, b) => a.cpc - b.cpc).slice(0, 3);
    console.log(`   Best value keywords:`);
    for (const kw of topKeywords) {
      console.log(`     - "${kw.keyword}" ($${kw.cpc.toFixed(2)} CPC, ${kw.searchVolume} vol)`);
    }
  }

  // Analyze by city tier
  console.log('\n' + '='.repeat(60));
  console.log('🏙️  ANALYSIS BY CITY TIER');
  console.log('='.repeat(60) + '\n');

  const tierMap = new Map<string, KeywordResult[]>();
  for (const result of validResults) {
    const existing = tierMap.get(result.cityTier) || [];
    existing.push(result);
    tierMap.set(result.cityTier, existing);
  }

  const tierSummaries: CityTierSummary[] = [];
  for (const [tier, keywords] of tierMap) {
    const avgCpc = keywords.reduce((sum, k) => sum + k.cpc, 0) / keywords.length;
    const avgVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0) / keywords.length;
    const cities = [...new Set(keywords.map(k => k.city))];

    tierSummaries.push({
      tier,
      avgCpc,
      avgVolume,
      cities,
      estimatedClicksFor250: Math.floor(TOTAL_BUDGET / avgCpc),
    });
  }

  tierSummaries.sort((a, b) => a.avgCpc - b.avgCpc);

  for (const summary of tierSummaries) {
    console.log(`\n🏷️  ${summary.tier.replace('_', ' ').toUpperCase()}`);
    console.log(`   Cities: ${summary.cities.join(', ')}`);
    console.log(`   Avg CPC: $${summary.avgCpc.toFixed(2)}`);
    console.log(`   Avg Monthly Volume: ${Math.round(summary.avgVolume).toLocaleString()}`);
    console.log(`   Est. clicks for $250: ~${summary.estimatedClicksFor250}`);
  }

  // Find best overall opportunities
  console.log('\n' + '='.repeat(60));
  console.log('💎 TOP 20 BEST VALUE KEYWORDS');
  console.log('   (Lowest CPC with decent volume)');
  console.log('='.repeat(60) + '\n');

  // Score = volume / (cpc * 100) - rewards high volume, low CPC
  const scoredResults = validResults
    .filter(r => r.searchVolume >= 100) // Minimum volume threshold
    .map(r => ({
      ...r,
      valueScore: r.searchVolume / (r.cpc * 100),
    }))
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 20);

  console.log('Keyword | City | CPC | Volume | Competition');
  console.log('-'.repeat(70));
  for (const kw of scoredResults) {
    console.log(`"${kw.keyword}" | ${kw.city}, ${kw.state} | $${kw.cpc.toFixed(2)} | ${kw.searchVolume} | ${kw.competition}`);
  }

  // Campaign recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🎯 CAMPAIGN RECOMMENDATIONS FOR $250');
  console.log('='.repeat(60) + '\n');

  // Find the best category
  const bestCategory = categorySummaries[0];
  const bestTier = tierSummaries[0];

  // Calculate optimal allocation
  const recommendedCpc = Math.min(bestCategory.avgCpc, 1.50); // Cap at $1.50
  const estimatedClicks = Math.floor(TOTAL_BUDGET / recommendedCpc);

  console.log('RECOMMENDED STRATEGY:\n');
  console.log(`1. PRIMARY KEYWORD FOCUS: ${bestCategory.category.replace('_', ' ')}`);
  console.log(`   - Avg CPC: $${bestCategory.avgCpc.toFixed(2)}`);
  console.log(`   - These keywords align with Inkdex\'s visual search value prop\n`);

  console.log(`2. GEOGRAPHIC FOCUS: ${bestTier.tier.replace('_', ' ')} cities`);
  console.log(`   - ${bestTier.cities.join(', ')}`);
  console.log(`   - Avg CPC: $${bestTier.avgCpc.toFixed(2)}`);
  console.log(`   - Lower competition = cheaper clicks\n`);

  console.log(`3. ESTIMATED REACH:`);
  console.log(`   - Budget: $${TOTAL_BUDGET}`);
  console.log(`   - Target CPC: $${recommendedCpc.toFixed(2)}`);
  console.log(`   - Estimated clicks: ~${estimatedClicks}`);
  console.log(`   - If 3% convert to sign-up: ~${Math.round(estimatedClicks * 0.03)} users\n`);

  // Specific keyword recommendations
  console.log('4. RECOMMENDED KEYWORDS TO BID ON:');
  const recommendedKeywords = validResults
    .filter(r => r.category === bestCategory.category || r.category === 'style_specific')
    .filter(r => r.cpc <= 2.00 && r.searchVolume >= 50)
    .sort((a, b) => a.cpc - b.cpc)
    .slice(0, 15);

  for (const kw of recommendedKeywords) {
    console.log(`   - "${kw.keyword}" ($${kw.cpc.toFixed(2)} CPC, ${kw.searchVolume} monthly)`);
  }

  // Save full results
  const outputPath = path.join(__dirname, '../../data/google-ads-research.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    budget: TOTAL_BUDGET,
    totalKeywordsResearched: allResults.length,
    validResultsWithCpc: validResults.length,
    categorySummaries,
    tierSummaries,
    allResults: validResults,
    recommendations: {
      bestCategory: bestCategory.category,
      bestTier: bestTier.tier,
      targetCpc: recommendedCpc,
      estimatedClicks,
      recommendedKeywords: recommendedKeywords.map(k => ({
        keyword: k.keyword,
        city: k.city,
        cpc: k.cpc,
        volume: k.searchVolume,
      })),
    },
  }, null, 2));

  console.log(`\n✅ Full results saved to: ${outputPath}`);
  console.log('\n🎉 Research complete!');
}

// Run
runResearch().catch(console.error);
