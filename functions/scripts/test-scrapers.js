/**
 * Test the scraper pipeline (no AI, no Firestore).
 * Run: node scripts/test-scrapers.js
 *
 * Without API keys, only the legacy (direct-fetch) scrapers run.
 * With GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX, the Google Custom Search discovery layer runs.
 * With FIRECRAWL_API_KEY, content is fetched via Firecrawl (JS rendering).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { runAllScrapers } = require('../src/scrapers/index');

async function main() {
  console.log('=== Dutch Bros Scraper Pipeline Test ===\n');

  console.log('Environment check:');
  console.log('  SERPER_API_KEY:    ', process.env.SERPER_API_KEY ? 'SET' : 'NOT SET');
  console.log('  FIRECRAWL_API_KEY: ', process.env.FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');
  console.log('  GOOGLE_CSE_API_KEY:', process.env.GOOGLE_CSE_API_KEY ? 'SET' : 'NOT SET');
  console.log('  GOOGLE_CSE_CX:     ', process.env.GOOGLE_CSE_CX ? 'SET' : 'NOT SET');
  console.log('');

  console.log('Running scrapers (max 5 per source)...\n');
  const listings = await runAllScrapers({ maxPerSource: 5 });

  console.log(`\nTotal listings: ${listings.length}`);

  const bySrc = {};
  for (const l of listings) bySrc[l.source] = (bySrc[l.source] || 0) + 1;
  console.log('By source:', bySrc);

  console.log('\nTop listings:');
  listings.slice(0, 10).forEach((l, i) => {
    console.log(`  ${i + 1}. [${l.source}] ${l.title || 'No title'}`);
    console.log(`     ${l.url}`);
    if (l.snippet) console.log(`     ${l.snippet.slice(0, 120)}...`);
    console.log('');
  });

  if (listings.length === 0) {
    console.log('\nNo listings returned.');
    console.log('  - Without GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX: only legacy scrapers run (often blocked).');
    console.log('  - Set up Google Custom Search + Firecrawl for reliable results.');
    console.log('  - See .env.example for required environment variables.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
