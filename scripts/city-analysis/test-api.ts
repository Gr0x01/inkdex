import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const authHeader = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');

async function testKeywordAPI() {
  const testKeywords = [
    'tattoo artist los angeles',
    'best tattoo artist in los angeles',
    'fine line tattoo los angeles',
  ];

  console.log('Testing DataForSEO Keyword Ideas API\n');
  console.log(`Testing ${testKeywords.length} keywords:`);
  testKeywords.forEach(k => console.log(`  - ${k}`));

  const requestBody = [{
    location_code: 2840, // United States
    language_code: 'en',
    keywords: testKeywords,
  }];

  try {
    const response = await axios.post(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live',
      requestBody,
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n=== Full API Response ===');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testKeywordAPI();
