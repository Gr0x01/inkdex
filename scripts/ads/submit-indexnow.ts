/**
 * Submit new Google Ads city pages to IndexNow
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const BASE_URL = 'https://inkdex.io';

const NEW_CITIES = [
  { city: 'lubbock', state: 'tx' },
  { city: 'amarillo', state: 'tx' },
  { city: 'fort-collins', state: 'co' },
  { city: 'syracuse', state: 'ny' },
  { city: 'albany', state: 'ny' },
  { city: 'duluth', state: 'mn' },
  { city: 'huntsville', state: 'al' },
  { city: 'lawrence', state: 'ks' },
  { city: 'norman', state: 'ok' },
];

async function submitToIndexNow(urls: string[], engine: string, endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      host: 'inkdex.io',
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });

  console.log(`  ${engine}: ${response.status} ${response.statusText}`);
  return response.status >= 200 && response.status < 300;
}

async function main() {
  console.log('📤 Submitting new city pages to IndexNow');
  console.log('='.repeat(60));

  if (!INDEXNOW_KEY) {
    console.error('❌ INDEXNOW_KEY not set in .env.local');
    process.exit(1);
  }

  // Generate URLs for new cities
  const urls: string[] = [];

  for (const { city, state } of NEW_CITIES) {
    // City main page
    urls.push(`${BASE_URL}/us/${state}/${city}`);

    // For-artists page
    urls.push(`${BASE_URL}/us/${state}/${city}/for-artists`);

    // Guide page
    urls.push(`${BASE_URL}/guides/${city}`);
  }

  console.log(`\n📊 Submitting ${urls.length} URLs:`);
  for (const url of urls) {
    console.log(`  - ${url}`);
  }

  console.log('\n📡 Sending to search engines...');

  // Submit to Bing
  const bingSuccess = await submitToIndexNow(
    urls,
    'Bing',
    'https://www.bing.com/indexnow'
  );

  // Submit to Yandex
  const yandexSuccess = await submitToIndexNow(
    urls,
    'Yandex',
    'https://yandex.com/indexnow'
  );

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));
  console.log(`Bing: ${bingSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Yandex: ${yandexSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`\nURLs submitted: ${urls.length}`);
  console.log('\n🎉 IndexNow submission complete!');
  console.log('\nNote: Google does not support IndexNow directly.');
  console.log('To notify Google, submit sitemap via Search Console or let Googlebot crawl naturally.');
}

main().catch(console.error);
