/**
 * Detailed Google Ads Research
 *
 * 1. Deep dive on top performing cities (Nashville, Richmond, Fargo, etc.)
 * 2. Research new potential low-CPC cities for expansion
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

// Top performing cities from initial research
const TOP_CITIES = [
  { name: 'Nashville', state: 'TN', artists: 128, covered: true },
  { name: 'Richmond', state: 'VA', artists: 129, covered: true },
  { name: 'Fargo', state: 'ND', artists: 50, covered: true },
  { name: 'Sioux Falls', state: 'SD', artists: 50, covered: true },
  { name: 'Albuquerque', state: 'NM', artists: 125, covered: true },
  { name: 'Salt Lake City', state: 'UT', artists: 168, covered: true },
];

// Potential new cities - smaller markets that might have low CPC
// Focus on: college towns, smaller metros, underserved states
const POTENTIAL_NEW_CITIES = [
  // College towns (often tattoo-friendly, lower ad competition)
  { name: 'Duluth', state: 'MN', covered: false },
  { name: 'Flagstaff', state: 'AZ', covered: false },
  { name: 'Fort Collins', state: 'CO', covered: false },
  { name: 'Tempe', state: 'AZ', covered: false },
  { name: 'Lawrence', state: 'KS', covered: false },
  { name: 'Norman', state: 'OK', covered: false },

  // Smaller metros with potential
  { name: 'Shreveport', state: 'LA', covered: false },
  { name: 'Lubbock', state: 'TX', covered: false },
  { name: 'Amarillo', state: 'TX', covered: false },
  { name: 'Mobile', state: 'AL', covered: false },
  { name: 'Huntsville', state: 'AL', covered: false },
  { name: 'Pensacola', state: 'FL', covered: false },

  // States with likely low competition
  { name: 'Grand Rapids', state: 'MI', covered: false },
  { name: 'Dayton', state: 'OH', covered: false },
  { name: 'Toledo', state: 'OH', covered: false },
  { name: 'Akron', state: 'OH', covered: false },
  { name: 'Syracuse', state: 'NY', covered: false },
  { name: 'Albany', state: 'NY', covered: false },

  // Growing markets
  { name: 'Greenville', state: 'SC', covered: true }, // Check if already covered
  { name: 'Chattanooga', state: 'TN', covered: true },
  { name: 'Knoxville', state: 'TN', covered: true },
];

// Comprehensive keyword set for detailed research
const DETAILED_KEYWORDS = [
  // Core discovery
  'tattoo artist {city}',
  'best tattoo artist {city}',
  'tattoo artists near me {city}',
  'find tattoo artist {city}',

  // Shop/location
  'tattoo shop {city}',
  'tattoo studio {city}',
  'tattoo parlor {city}',
  'best tattoo shop {city}',

  // Style-specific (Inkdex strength)
  'fine line tattoo {city}',
  'blackwork tattoo {city}',
  'realism tattoo {city}',
  'traditional tattoo {city}',
  'minimalist tattoo {city}',
  'watercolor tattoo {city}',
  'geometric tattoo {city}',
  'japanese tattoo {city}',
  'black and grey tattoo {city}',

  // Visual/inspiration (perfect for Inkdex)
  'tattoo ideas {city}',
  'tattoo inspiration {city}',
  'tattoo designs {city}',
  'tattoo portfolio {city}',

  // First-timer keywords
  'first tattoo {city}',
  'small tattoo {city}',
  'tattoo consultation {city}',

  // Specific body part (high intent)
  'arm tattoo {city}',
  'sleeve tattoo {city}',
  'back tattoo {city}',
];

interface KeywordResult {
  keyword: string;
  city: string;
  state: string;
  searchVolume: number;
  cpc: number;
  competition: string;
  competitionIndex: number;
  isCovered: boolean;
}

async function getKeywordMetrics(keywords: string[]): Promise<any[]> {
  const requestBody = [{
    location_code: 2840,
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
      console.error('API Error:', task?.status_message);
      return [];
    }

    return task.result || [];
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
    return [];
  }
}

async function researchCity(
  city: { name: string; state: string; covered: boolean; artists?: number },
  label: string
): Promise<KeywordResult[]> {
  console.log(`\n  📍 Researching ${city.name}, ${city.state}...`);

  const keywords = DETAILED_KEYWORDS.map(t => t.replace('{city}', city.name.toLowerCase()));
  const results = await getKeywordMetrics(keywords);

  const validResults: KeywordResult[] = [];

  for (const result of results) {
    if (result.cpc !== null && result.cpc > 0) {
      validResults.push({
        keyword: result.keyword,
        city: city.name,
        state: city.state,
        searchVolume: result.search_volume || 0,
        cpc: result.cpc,
        competition: result.competition || 'UNKNOWN',
        competitionIndex: result.competition_index || 0,
        isCovered: city.covered,
      });
    }
  }

  if (validResults.length > 0) {
    const avgCpc = validResults.reduce((s, r) => s + r.cpc, 0) / validResults.length;
    const totalVolume = validResults.reduce((s, r) => s + r.searchVolume, 0);
    console.log(`     ✓ ${validResults.length} keywords | Avg CPC: $${avgCpc.toFixed(2)} | Total vol: ${totalVolume.toLocaleString()}`);
  } else {
    console.log(`     ⚠️ No CPC data returned`);
  }

  return validResults;
}

async function main() {
  console.log('🎯 Detailed Google Ads City Research');
  console.log('='.repeat(60));

  const allResults: KeywordResult[] = [];

  // Part 1: Deep dive on top performing cities
  console.log('\n📊 PART 1: TOP PERFORMING CITIES (Deep Dive)');
  console.log('-'.repeat(60));

  for (const city of TOP_CITIES) {
    const results = await researchCity(city, 'top');
    allResults.push(...results);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Part 2: Research potential new cities
  console.log('\n📊 PART 2: POTENTIAL NEW CITIES');
  console.log('-'.repeat(60));

  for (const city of POTENTIAL_NEW_CITIES) {
    const results = await researchCity(city, 'new');
    allResults.push(...results);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Analysis
  console.log('\n' + '='.repeat(60));
  console.log('📈 ANALYSIS');
  console.log('='.repeat(60));

  // Group by city
  const cityStats = new Map<string, {
    city: string;
    state: string;
    covered: boolean;
    avgCpc: number;
    totalVolume: number;
    keywordCount: number;
    bestKeywords: KeywordResult[];
  }>();

  for (const result of allResults) {
    const key = `${result.city}, ${result.state}`;
    const existing = cityStats.get(key) || {
      city: result.city,
      state: result.state,
      covered: result.isCovered,
      avgCpc: 0,
      totalVolume: 0,
      keywordCount: 0,
      bestKeywords: [],
    };

    existing.totalVolume += result.searchVolume;
    existing.keywordCount++;
    existing.bestKeywords.push(result);
    cityStats.set(key, existing);
  }

  // Calculate averages and sort
  const citySummaries = Array.from(cityStats.values()).map(city => {
    city.avgCpc = city.bestKeywords.reduce((s, k) => s + k.cpc, 0) / city.keywordCount;
    city.bestKeywords.sort((a, b) => {
      // Score: volume / (cpc * 10) - rewards high volume + low CPC
      const scoreA = a.searchVolume / (a.cpc * 10);
      const scoreB = b.searchVolume / (b.cpc * 10);
      return scoreB - scoreA;
    });
    return city;
  });

  // Sort by value (low CPC + decent volume)
  citySummaries.sort((a, b) => a.avgCpc - b.avgCpc);

  // Report: Currently Covered Cities
  console.log('\n🏆 TOP COVERED CITIES BY VALUE (Low CPC)');
  console.log('-'.repeat(60));

  const coveredCities = citySummaries.filter(c => c.covered);
  for (const city of coveredCities.slice(0, 10)) {
    console.log(`\n${city.city}, ${city.state}`);
    console.log(`  Avg CPC: $${city.avgCpc.toFixed(2)} | Total Volume: ${city.totalVolume.toLocaleString()}`);
    console.log(`  Est. clicks for $50: ~${Math.floor(50 / city.avgCpc)}`);
    console.log(`  Top 5 keywords:`);
    for (const kw of city.bestKeywords.slice(0, 5)) {
      console.log(`    - "${kw.keyword}" ($${kw.cpc.toFixed(2)}, ${kw.searchVolume} vol)`);
    }
  }

  // Report: New Cities Worth Expanding To
  console.log('\n\n🆕 NEW CITIES WORTH EXPANDING TO');
  console.log('-'.repeat(60));

  const newCities = citySummaries.filter(c => !c.covered);
  for (const city of newCities.slice(0, 10)) {
    console.log(`\n${city.city}, ${city.state} (NOT COVERED)`);
    console.log(`  Avg CPC: $${city.avgCpc.toFixed(2)} | Total Volume: ${city.totalVolume.toLocaleString()}`);
    console.log(`  Est. clicks for $50: ~${Math.floor(50 / city.avgCpc)}`);
    console.log(`  Top 5 keywords:`);
    for (const kw of city.bestKeywords.slice(0, 5)) {
      console.log(`    - "${kw.keyword}" ($${kw.cpc.toFixed(2)}, ${kw.searchVolume} vol)`);
    }
  }

  // Best overall keywords across all cities
  console.log('\n\n💎 TOP 30 BEST VALUE KEYWORDS (All Cities)');
  console.log('-'.repeat(60));

  const allKeywordsSorted = allResults
    .filter(r => r.searchVolume >= 50)
    .map(r => ({
      ...r,
      valueScore: r.searchVolume / (r.cpc * 10),
    }))
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 30);

  console.log('\nKeyword | City | CPC | Volume | Covered?');
  console.log('-'.repeat(70));
  for (const kw of allKeywordsSorted) {
    const covered = kw.isCovered ? '✅' : '❌';
    console.log(`"${kw.keyword}" | ${kw.city}, ${kw.state} | $${kw.cpc.toFixed(2)} | ${kw.searchVolume} | ${covered}`);
  }

  // Save results
  const outputPath = path.join(__dirname, '../../data/detailed-city-research.json');
  await fs.writeFile(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    coveredCities: coveredCities.map(c => ({
      city: c.city,
      state: c.state,
      avgCpc: c.avgCpc,
      totalVolume: c.totalVolume,
      topKeywords: c.bestKeywords.slice(0, 10),
    })),
    newCitiesRecommended: newCities.filter(c => c.avgCpc < 2.0).map(c => ({
      city: c.city,
      state: c.state,
      avgCpc: c.avgCpc,
      totalVolume: c.totalVolume,
      topKeywords: c.bestKeywords.slice(0, 10),
    })),
    allKeywords: allResults,
  }, null, 2));

  console.log(`\n\n✅ Full results saved to: ${outputPath}`);

  // Final recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🎯 RECOMMENDATIONS FOR $250 CAMPAIGN');
  console.log('='.repeat(60));

  const cheapNewCities = newCities.filter(c => c.avgCpc < 1.50 && c.totalVolume > 5000);

  console.log('\n1. PRIORITY EXPANSION CITIES (Low CPC, High Volume, Not Covered):');
  for (const city of cheapNewCities.slice(0, 5)) {
    console.log(`   - ${city.city}, ${city.state}: $${city.avgCpc.toFixed(2)} avg CPC, ${city.totalVolume.toLocaleString()} vol`);
  }

  console.log('\n2. COVERED CITIES TO TARGET FIRST:');
  for (const city of coveredCities.slice(0, 5)) {
    console.log(`   - ${city.city}, ${city.state}: $${city.avgCpc.toFixed(2)} avg CPC, ${city.totalVolume.toLocaleString()} vol`);
  }

  console.log('\n3. BUDGET ALLOCATION SUGGESTION:');
  console.log('   - $100 on style-specific keywords in Nashville/Richmond');
  console.log('   - $75 on shop queries in Fargo/Sioux Falls (cheapest CPC)');
  console.log('   - $75 on expansion cities (if pages generated)');
}

main().catch(console.error);
