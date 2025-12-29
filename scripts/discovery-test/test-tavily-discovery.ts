/**
 * Test Script: Compare Discovery Approaches
 *
 * Tests:
 * 1. Tavily search for solo artists (Instagram-first approach)
 * 2. Tavily search for traditional shops
 * 3. Google Places API for shops
 *
 * Goal: Determine which approach gives best coverage for tattoo artists
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  response_time: number;
}

interface GooglePlaceResult {
  name: string;
  formatted_address: string;
  place_id: string;
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
}

// Load environment variables
const TAVILY_API_KEY = process.env.TAAVILY_API;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function searchTavily(query: string): Promise<TavilyResponse> {
  console.log(`   Using Tavily API key: ${TAVILY_API_KEY?.substring(0, 10)}...`);

  const response = await axios.post(
    'https://api.tavily.com/search',
    {
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic', // Try basic first
      max_results: 10,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

async function searchGooglePlaces(query: string, location: string): Promise<GooglePlaceResult[]> {
  console.log(`   Using Google API key: ${GOOGLE_PLACES_API_KEY?.substring(0, 10)}...`);

  // Text Search API
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: {
      query: `${query} in ${location}`,
      key: GOOGLE_PLACES_API_KEY,
    },
  });

  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
  }

  return response.data.results || [];
}

function extractInstagramHandles(text: string): string[] {
  // Match @username or instagram.com/username patterns
  const patterns = [
    /@([a-zA-Z0-9._]+)/g,
    /instagram\.com\/([a-zA-Z0-9._]+)/g,
  ];

  const handles = new Set<string>();

  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2) {
        handles.add(match[1].toLowerCase());
      }
    }
  });

  return Array.from(handles);
}

async function testArtistDiscovery() {
  console.log('🔍 Testing Artist Discovery Approaches\n');
  console.log('=' .repeat(60));

  const city = 'Austin, TX';

  // Test 1: Tavily - Search for solo artists with Instagram
  console.log('\n\n📱 TEST 1: Tavily - Solo Artists (Instagram-first)');
  console.log('-'.repeat(60));
  try {
    const query1 = `tattoo artist Austin TX Instagram profile`;
    console.log(`Query: "${query1}"\n`);

    const results1 = await searchTavily(query1);
    console.log(`Found ${results1.results.length} results in ${results1.response_time}s\n`);

    results1.results.slice(0, 5).forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Score: ${result.score}`);

      const handles = extractInstagramHandles(result.content);
      if (handles.length > 0) {
        console.log(`   Instagram: ${handles.join(', ')}`);
      }
      console.log();
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Tavily - Search for tattoo shops
  console.log('\n\n🏪 TEST 2: Tavily - Traditional Shops');
  console.log('-'.repeat(60));
  try {
    const query2 = `tattoo shop Austin TX artists website`;
    console.log(`Query: "${query2}"\n`);

    const results2 = await searchTavily(query2);
    console.log(`Found ${results2.results.length} results in ${results2.response_time}s\n`);

    results2.results.slice(0, 5).forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Score: ${result.score}`);
      console.log();
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Google Places API - Traditional discovery
  console.log('\n\n📍 TEST 3: Google Places API - Shops');
  console.log('-'.repeat(60));
  try {
    const query3 = 'tattoo shop';
    console.log(`Query: "${query3} in ${city}"\n`);

    const results3 = await searchGooglePlaces(query3, city);
    console.log(`Found ${results3.length} places\n`);

    results3.slice(0, 5).forEach((place, i) => {
      console.log(`${i + 1}. ${place.name}`);
      console.log(`   Address: ${place.formatted_address}`);
      if (place.rating) console.log(`   Rating: ${place.rating}⭐`);
      if (place.website) console.log(`   Website: ${place.website}`);
      console.log();
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Test 4: Tavily - Specific style/niche artists
  console.log('\n\n🎨 TEST 4: Tavily - Niche Artists (Fine Line)');
  console.log('-'.repeat(60));
  try {
    const query4 = `fine line tattoo artist Austin TX Instagram`;
    console.log(`Query: "${query4}"\n`);

    const results4 = await searchTavily(query4);
    console.log(`Found ${results4.results.length} results in ${results4.response_time}s\n`);

    results4.results.slice(0, 5).forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   URL: ${result.url}`);

      const handles = extractInstagramHandles(result.content);
      if (handles.length > 0) {
        console.log(`   Instagram: ${handles.join(', ')}`);
      }
      console.log();
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Discovery tests complete!\n');
  console.log('📊 Analysis:');
  console.log('   - Compare coverage: solo artists vs shops');
  console.log('   - Check Instagram handle extraction success rate');
  console.log('   - Evaluate which approach finds more unique artists');
  console.log('\n💡 Next: Based on results, choose optimal strategy\n');
}

// Run tests
testArtistDiscovery().catch(console.error);
