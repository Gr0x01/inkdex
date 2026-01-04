/**
 * DataForSEO Market Analysis for Tattoo Artist Discovery
 *
 * Purpose: Identify optimal cities to launch based on:
 * 1. Search volume (demand)
 * 2. Competition strength (who's ranking)
 * 3. Opportunity gaps (where we can win)
 * 4. Artist density (supply side)
 *
 * DataForSEO APIs Used:
 * - Keywords Data API (search volume, keyword difficulty)
 * - SERP API (competition analysis, ranking pages)
 * - Related Keywords API (search intent discovery)
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// DataForSEO credentials from environment
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_API_URL = 'https://api.dataforseo.com/v3';

// Base64 encode credentials
const authHeader = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

// Candidate cities for analysis (using US country code 2840)
// BATCH 5 - FINAL 9 STATES EXPANSION (Jan 2026)
// Missing states: DE, MS, MT, NH, NJ, ND, SD, WV, WY
const CANDIDATE_CITIES = [
  // Delaware (DE) - Small state, 1 major city
  { name: 'Wilmington', state: 'DE', location_code: 2840 },
  { name: 'Dover', state: 'DE', location_code: 2840 },
  { name: 'Newark', state: 'DE', location_code: 2840 },

  // Mississippi (MS) - Southern market
  { name: 'Jackson', state: 'MS', location_code: 2840 },
  { name: 'Biloxi', state: 'MS', location_code: 2840 },
  { name: 'Hattiesburg', state: 'MS', location_code: 2840 },

  // Montana (MT) - Mountain West, artsy towns
  { name: 'Missoula', state: 'MT', location_code: 2840 },
  { name: 'Bozeman', state: 'MT', location_code: 2840 },
  { name: 'Billings', state: 'MT', location_code: 2840 },

  // New Hampshire (NH) - New England
  { name: 'Manchester', state: 'NH', location_code: 2840 },
  { name: 'Portsmouth', state: 'NH', location_code: 2840 },
  { name: 'Nashua', state: 'NH', location_code: 2840 },

  // New Jersey (NJ) - Dense metro area
  { name: 'Newark', state: 'NJ', location_code: 2840 },
  { name: 'Jersey City', state: 'NJ', location_code: 2840 },
  { name: 'Hoboken', state: 'NJ', location_code: 2840 },
  { name: 'Atlantic City', state: 'NJ', location_code: 2840 },
  { name: 'Asbury Park', state: 'NJ', location_code: 2840 },

  // North Dakota (ND) - Small market
  { name: 'Fargo', state: 'ND', location_code: 2840 },
  { name: 'Bismarck', state: 'ND', location_code: 2840 },

  // South Dakota (SD) - Small market
  { name: 'Sioux Falls', state: 'SD', location_code: 2840 },
  { name: 'Rapid City', state: 'SD', location_code: 2840 },

  // West Virginia (WV) - Appalachian region
  { name: 'Charleston', state: 'WV', location_code: 2840 },
  { name: 'Morgantown', state: 'WV', location_code: 2840 },
  { name: 'Huntington', state: 'WV', location_code: 2840 },

  // Wyoming (WY) - Mountain West, tourism
  { name: 'Cheyenne', state: 'WY', location_code: 2840 },
  { name: 'Jackson', state: 'WY', location_code: 2840 },
  { name: 'Casper', state: 'WY', location_code: 2840 },
];

// Keyword categories to analyze
const KEYWORD_TEMPLATES = {
  // High-intent discovery queries
  discovery: [
    'tattoo artist {city}',
    'best tattoo artist in {city}',
    'tattoo artists near me {city}',
    'find tattoo artist {city}',
    'top tattoo artists {city}',
  ],

  // Style-specific queries (high commercial intent)
  styles: [
    'fine line tattoo {city}',
    'traditional tattoo {city}',
    'black and grey tattoo {city}',
    'japanese tattoo {city}',
    'geometric tattoo {city}',
    'realism tattoo {city}',
    'watercolor tattoo {city}',
    'minimalist tattoo {city}',
  ],

  // Shop-based queries
  shops: [
    'tattoo shop {city}',
    'tattoo studios {city}',
    'tattoo parlor {city}',
    'best tattoo shops in {city}',
  ],

  // Visual/inspiration queries (our unique value prop)
  visual: [
    'tattoo ideas {city}',
    'tattoo inspiration {city}',
    'tattoo portfolio {city}',
    'tattoo designs {city}',
  ],

  // Location-based queries
  location: [
    'tattoo near me',
    '{city} tattoo',
  ],
};

interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: number; // 0-1 scale
  cpc: number;
  difficulty: number; // 0-100 scale
  trend: number[]; // 12-month trend
}

interface CompetitorData {
  domain: string;
  position: number;
  type: string; // 'directory', 'shop', 'maps', 'social'
  domainRank: number;
  etv: number; // Estimated traffic value
}

interface CityAnalysis {
  city: string;
  totalSearchVolume: number;
  avgCompetition: number;
  avgDifficulty: number;
  keywords: KeywordData[];
  topCompetitors: CompetitorData[];
  opportunityScore: number;
  insights: string[];
  recommendation: 'high' | 'medium' | 'low';
}

/**
 * Generate keyword variations for a city
 */
function generateKeywords(city: string): { keyword: string; category: string }[] {
  const keywords: { keyword: string; category: string }[] = [];

  for (const [category, templates] of Object.entries(KEYWORD_TEMPLATES)) {
    for (const template of templates) {
      keywords.push({
        keyword: template.replace('{city}', city.toLowerCase()),
        category,
      });
    }
  }

  return keywords;
}

/**
 * Fetch keyword metrics from DataForSEO Keywords Data API
 */
async function getKeywordMetrics(
  keywords: string[],
  locationCode: number
): Promise<KeywordData[]> {
  const requestBody = [{
    location_code: locationCode,
    language_code: 'en',
    keywords,
  }];

  try {
    // Use keywords_data endpoint for exact keyword metrics
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
      console.error('    ⚠️  API Error:', task?.status_message || 'Unknown error');
      return [];
    }

    const results = task.result || [];
    console.log(`    ✓ Received data for ${results.length} keywords`);

    // Convert competition level to numeric value
    const competitionToNumber = (comp: string): number => {
      if (!comp) return 0;
      const level = comp.toUpperCase();
      if (level === 'LOW') return 0.33;
      if (level === 'MEDIUM') return 0.67;
      if (level === 'HIGH') return 1.0;
      return 0;
    };

    return results.map((item: any) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume || 0,
      competition: competitionToNumber(item.competition),
      cpc: item.cpc || 0,
      difficulty: item.keyword_difficulty || 0,
      trend: item.monthly_searches?.map((m: any) => m.search_volume) || [],
    }));
  } catch (error: any) {
    console.error('Error fetching keyword metrics:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Analyze SERP competition for a keyword
 */
async function analyzeSerpCompetition(
  keyword: string,
  locationCode: number
): Promise<CompetitorData[]> {
  const requestBody = [{
    keyword,
    location_code: locationCode,
    language_code: 'en',
    device: 'desktop',
    depth: 10, // Analyze top 10 results
  }];

  try {
    const response = await axios.post(
      `${DATAFORSEO_API_URL}/serp/google/organic/live/advanced`,
      requestBody,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const items = response.data?.tasks?.[0]?.result?.[0]?.items || [];

    return items
      .filter((item: any) => item.url) // Filter out items without URLs
      .map((item: any) => {
        try {
          const domain = new URL(item.url).hostname;
          let type = 'other';

          // Classify competitor type
          if (domain.includes('yelp') || domain.includes('tattoodo') || domain.includes('thumbtack')) {
            type = 'directory';
          } else if (domain.includes('google') && item.type === 'map') {
            type = 'maps';
          } else if (domain.includes('instagram') || domain.includes('facebook')) {
            type = 'social';
          } else {
            type = 'shop'; // Likely individual shop site
          }

          return {
            domain,
            position: item.rank_absolute || 0,
            type,
            domainRank: item.domain_rank || 0,
            etv: item.etv || 0,
          };
        } catch (error) {
          // Skip items with invalid URLs
          return null;
        }
      })
      .filter((item: CompetitorData | null): item is CompetitorData => item !== null);
  } catch (error) {
    console.error(`Error analyzing SERP for "${keyword}":`, error);
    return [];
  }
}

/**
 * Calculate opportunity score for a city
 *
 * Formula:
 * - Search volume weight: 30%
 * - Low competition weight: 25%
 * - Low keyword difficulty weight: 20%
 * - Weak competitor weight: 15%
 * - Trending searches weight: 10%
 */
function calculateOpportunityScore(analysis: Partial<CityAnalysis>): number {
  const { keywords = [], topCompetitors = [] } = analysis;

  if (keywords.length === 0) return 0;

  // Normalize search volume (0-1 scale, log transform for better distribution)
  const totalVolume = keywords.reduce((sum, k) => sum + k.searchVolume, 0);
  const avgVolume = totalVolume / keywords.length;
  const volumeScore = Math.min(Math.log10(avgVolume + 1) / 5, 1); // Cap at 100k searches

  // Average competition (lower is better)
  const avgCompetition = keywords.reduce((sum, k) => sum + k.competition, 0) / keywords.length;
  const competitionScore = 1 - avgCompetition;

  // Average keyword difficulty (lower is better)
  const avgDifficulty = keywords.reduce((sum, k) => sum + k.difficulty, 0) / keywords.length;
  const difficultyScore = 1 - (avgDifficulty / 100);

  // Competitor strength (analyze top 3 positions)
  const topThree = topCompetitors.filter(c => c.position <= 3);
  const hasWeakCompetitors = topThree.filter(c => c.type === 'directory' || c.domainRank < 1000).length;
  const competitorScore = hasWeakCompetitors / Math.max(topThree.length, 1);

  // Trending score (positive trend = growing market)
  const trendingKeywords = keywords.filter(k => {
    if (k.trend.length < 6) return false;
    const recent = k.trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = k.trend.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    return recent > older * 1.1; // 10% growth
  });
  const trendScore = trendingKeywords.length / keywords.length;

  // Weighted composite score
  const compositeScore = (
    volumeScore * 0.30 +
    competitionScore * 0.25 +
    difficultyScore * 0.20 +
    competitorScore * 0.15 +
    trendScore * 0.10
  );

  return Math.round(compositeScore * 100);
}

/**
 * Generate insights and recommendations
 */
function generateInsights(analysis: CityAnalysis): void {
  const insights: string[] = [];
  const { keywords, topCompetitors, totalSearchVolume, avgCompetition, avgDifficulty } = analysis;

  // Search volume insights
  if (totalSearchVolume > 50000) {
    insights.push(`🔥 High search demand: ${totalSearchVolume.toLocaleString()} monthly searches`);
  } else if (totalSearchVolume < 10000) {
    insights.push(`⚠️ Low search demand: ${totalSearchVolume.toLocaleString()} monthly searches`);
  }

  // Competition insights
  if (avgCompetition < 0.3) {
    insights.push(`✅ Low competition: Average ${(avgCompetition * 100).toFixed(0)}% competition`);
  } else if (avgCompetition > 0.7) {
    insights.push(`❌ High competition: Average ${(avgCompetition * 100).toFixed(0)}% competition`);
  }

  // Keyword difficulty insights
  if (avgDifficulty < 30) {
    insights.push(`✅ Easy to rank: Average keyword difficulty ${avgDifficulty.toFixed(0)}/100`);
  } else if (avgDifficulty > 60) {
    insights.push(`❌ Hard to rank: Average keyword difficulty ${avgDifficulty.toFixed(0)}/100`);
  }

  // Competitor insights
  const directories = topCompetitors.filter(c => c.type === 'directory');
  const maps = topCompetitors.filter(c => c.type === 'maps');

  if (directories.length > 5) {
    insights.push(`📁 Directories dominate: ${directories.length} directory listings in top 10`);
  }

  if (maps.length > 3) {
    insights.push(`📍 Google Maps strong: ${maps.length} map results in top 10`);
  }

  // Find gap opportunities
  const visualKeywords = keywords.filter(k => k && k.keyword && (k.keyword.includes('ideas') || k.keyword.includes('inspiration') || k.keyword.includes('portfolio')));
  if (visualKeywords.length > 0 && visualKeywords.every(k => k.competition < 0.5)) {
    insights.push(`💡 Visual search opportunity: Low competition on inspiration/portfolio queries`);
  }

  // Style-specific opportunities
  const styleKeywords = keywords.filter(k =>
    k && k.keyword && (
      k.keyword.includes('fine line') ||
      k.keyword.includes('minimalist') ||
      k.keyword.includes('geometric')
    )
  );
  const highVolumeStyles = styleKeywords.filter(k => k && k.searchVolume > 500);
  if (highVolumeStyles.length > 0) {
    insights.push(`🎨 Style-specific demand: ${highVolumeStyles.length} high-volume style queries`);
  }

  // Trending insights
  const trendingKeywords = keywords.filter(k => {
    if (!k || !k.trend || k.trend.length < 6) return false;
    const recent = k.trend.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = k.trend.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    return recent > older * 1.2; // 20% growth
  });
  if (trendingKeywords.length > keywords.length * 0.3) {
    insights.push(`📈 Growing market: ${trendingKeywords.length} keywords trending up`);
  }

  analysis.insights = insights;

  // Recommendation
  if (analysis.opportunityScore >= 70) {
    analysis.recommendation = 'high';
  } else if (analysis.opportunityScore >= 50) {
    analysis.recommendation = 'medium';
  } else {
    analysis.recommendation = 'low';
  }
}

/**
 * Analyze a single city
 */
async function analyzeCity(city: { name: string; state: string; location_code: number }): Promise<CityAnalysis> {
  console.log(`\n🔍 Analyzing ${city.name}, ${city.state}...`);

  // Generate keyword variations
  const keywordList = generateKeywords(city.name);
  const keywords = keywordList.map(k => k.keyword);

  console.log(`  - Fetching metrics for ${keywords.length} keywords...`);
  const keywordMetrics = await getKeywordMetrics(keywords, city.location_code);

  // Analyze SERP competition for top keywords (limit to avoid API costs)
  console.log(`  - Analyzing SERP competition...`);
  const topKeywords = keywordMetrics
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5); // Analyze top 5 keywords only

  const competitorPromises = topKeywords.map(k => analyzeSerpCompetition(k.keyword, city.location_code));
  const competitorResults = await Promise.all(competitorPromises);
  const allCompetitors = competitorResults.flat();

  // Deduplicate and rank competitors
  const competitorMap = new Map<string, CompetitorData>();
  for (const comp of allCompetitors) {
    if (!competitorMap.has(comp.domain) || comp.position < competitorMap.get(comp.domain)!.position) {
      competitorMap.set(comp.domain, comp);
    }
  }
  const topCompetitors = Array.from(competitorMap.values())
    .sort((a, b) => a.position - b.position)
    .slice(0, 10);

  // Calculate metrics
  const totalSearchVolume = keywordMetrics.reduce((sum, k) => sum + k.searchVolume, 0);
  const avgCompetition = keywordMetrics.reduce((sum, k) => sum + k.competition, 0) / keywordMetrics.length;
  const avgDifficulty = keywordMetrics.reduce((sum, k) => sum + k.difficulty, 0) / keywordMetrics.length;

  const analysis: CityAnalysis = {
    city: `${city.name}, ${city.state}`,
    totalSearchVolume,
    avgCompetition,
    avgDifficulty,
    keywords: keywordMetrics,
    topCompetitors,
    opportunityScore: 0,
    insights: [],
    recommendation: 'low',
  };

  // Calculate opportunity score
  analysis.opportunityScore = calculateOpportunityScore(analysis);

  // Generate insights
  generateInsights(analysis);

  console.log(`  ✅ Complete: Opportunity Score = ${analysis.opportunityScore}/100`);

  return analysis;
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting Tattoo Artist Market Analysis\n');
  console.log(`Analyzing ${CANDIDATE_CITIES.length} cities...\n`);

  // Analyze all cities (sequentially to avoid rate limits)
  const analyses: CityAnalysis[] = [];
  for (const city of CANDIDATE_CITIES) {
    const analysis = await analyzeCity(city);
    analyses.push(analysis);

    // Wait 2 seconds between cities to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Sort by opportunity score
  analyses.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📊 MARKET ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');

  for (const analysis of analyses) {
    const badge = analysis.recommendation === 'high' ? '🌟' :
                  analysis.recommendation === 'medium' ? '⭐' : '💫';

    console.log(`\n${badge} ${analysis.city}`);
    console.log(`   Opportunity Score: ${analysis.opportunityScore}/100 (${analysis.recommendation.toUpperCase()})`);
    console.log(`   Search Volume: ${analysis.totalSearchVolume.toLocaleString()}/month`);
    console.log(`   Avg Competition: ${(analysis.avgCompetition * 100).toFixed(0)}%`);
    console.log(`   Avg Difficulty: ${analysis.avgDifficulty.toFixed(0)}/100`);
    console.log(`\n   Top Competitors:`);

    analysis.topCompetitors.slice(0, 5).forEach(comp => {
      console.log(`     ${comp.position}. ${comp.domain} (${comp.type})`);
    });

    console.log(`\n   Key Insights:`);
    analysis.insights.forEach(insight => {
      console.log(`     ${insight}`);
    });
  }

  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('🎯 LAUNCH RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');

  const highPriority = analyses.filter(a => a.recommendation === 'high');
  const mediumPriority = analyses.filter(a => a.recommendation === 'medium');

  console.log('🌟 HIGH PRIORITY CITIES (Launch First):');
  highPriority.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.city} - Score: ${a.opportunityScore}/100`);
  });

  console.log('\n⭐ MEDIUM PRIORITY CITIES (Consider for Phase 2):');
  mediumPriority.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.city} - Score: ${a.opportunityScore}/100`);
  });

  // Save detailed report as JSON
  const reportPath = path.join(__dirname, '../../data/city-analysis-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(analyses, null, 2));

  console.log(`\n✅ Detailed report saved to: ${reportPath}`);
  console.log('\n🎉 Analysis complete!');
}

// Run analysis
main().catch(console.error);
