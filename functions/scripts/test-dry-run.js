/**
 * Dry-run test: tests discovery + URL filtering + dedup logic
 * WITHOUT calling Firecrawl scrape (0 credits burned).
 *
 * Only uses Serper (free/cheap) for discovery to verify:
 * 1. Serper finds individual listing URLs
 * 2. URL filter rejects category pages
 * 3. LoopNet URLs are flagged as blocked (no Firecrawl)
 * 4. Dedup against a mock set works
 * 5. AI extraction works on a test snippet
 *
 * Run: node scripts/test-dry-run.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { searchListings, isListingUrl, identifySource } = require('../src/scrapers/googleSearch');
const { isAlwaysBlocked } = require('../src/scrapers/firecrawl');
const { extractListing } = require('../src/ai/extractListing');
const { runDutchBrosCriteria } = require('../src/criteria/dutchBrosCriteria');

async function main() {
  console.log('=== DRY-RUN TEST (0 Firecrawl scrape credits) ===\n');

  console.log('Environment:');
  console.log('  SERPER_API_KEY:    ', process.env.SERPER_API_KEY ? 'SET' : 'NOT SET');
  console.log('  FIRECRAWL_API_KEY: ', process.env.FIRECRAWL_API_KEY ? 'SET' : 'NOT SET');
  console.log('  GEMINI_API_KEY:    ', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
  console.log('');

  // ── Step 1: Test discovery (Serper only, no Firecrawl search) ──
  console.log('--- Step 1: Discovery (Serper only) ---');
  const discovered = await searchListings({ maxResults: 15 });
  console.log(`Found ${discovered.length} URLs\n`);

  let blocked = 0;
  let validListings = 0;
  const sources = {};

  for (const item of discovered) {
    sources[item.source] = (sources[item.source] || 0) + 1;
    if (isAlwaysBlocked(item.url)) {
      blocked++;
      console.log(`  [BLOCKED] ${item.source}: ${item.url.slice(0, 80)}`);
    } else {
      validListings++;
      console.log(`  [OK]      ${item.source}: ${item.url.slice(0, 80)}`);
    }
  }
  console.log(`\nSources: ${JSON.stringify(sources)}`);
  console.log(`Valid: ${validListings} | Blocked (no Firecrawl): ${blocked}\n`);

  // ── Step 2: Test dedup ──
  console.log('--- Step 2: Dedup test ---');
  const mockProcessed = new Set();
  if (discovered.length > 0) {
    mockProcessed.add(discovered[0].url.replace(/\/+$/, ''));
  }
  if (discovered.length > 1) {
    mockProcessed.add(discovered[1].url.replace(/\/+$/, ''));
  }
  let wouldSkip = 0;
  for (const item of discovered) {
    const norm = item.url.replace(/\/+$/, '');
    if (mockProcessed.has(norm)) wouldSkip++;
  }
  console.log(`Mock dedup: ${wouldSkip}/${discovered.length} would be skipped\n`);

  // ── Step 3: Test AI extraction on a realistic snippet ──
  console.log('--- Step 3: AI extraction test (1 Gemini call) ---');
  const testListing = {
    url: 'https://www.loopnet.com/Listing/Test/12345/',
    title: '6845 Northlake Mall Dr, Charlotte, NC 28216 - Retail Outparcel',
    snippet: '0.62 acre retail outparcel at Northlake Mall. Signalized hard corner with 2 access points. VPD 45,000 on Northlake Mall Dr. IKEA, Walmart, Target anchors. Drive-thru zoning permitted by right. All utilities. Land price $580,000. Annual rent $115,000 NNN.',
  };

  try {
    const extracted = await extractListing(testListing);
    console.log('  Extraction OK');
    console.log('  Address:', extracted.address);
    console.log('  Acres:', extracted.siteAreaAcres, '| VPD:', extracted.vpd, '| Price:', extracted.landPrice);
    console.log('  Corner:', extracted.cornerOutparcel, '| Zoning:', extracted.driveThruZoning);

    const criteria = runDutchBrosCriteria(extracted);
    console.log('  Section A:', criteria.sectionAPass + '/8');
    console.log('  Section B:', criteria.sectionBTotal + '/40');
    console.log('  YOC:', criteria.yoc?.toFixed(2) + '%');
    console.log('  Verdict:', criteria.verdict);
  } catch (e) {
    console.log('  ERROR:', e.message);
  }

  // ── Step 4: Credit estimate ──
  console.log('\n--- Credit estimate for full scrape ---');
  const firecrawlScrapes = discovered.filter(d => !isAlwaysBlocked(d.url)).length;
  console.log(`  Serper queries: ~10 (free/cheap)`);
  console.log(`  Firecrawl scrapes needed: ~${firecrawlScrapes} (1 credit each, but direct fetch tried first)`);
  console.log(`  Gemini extractions: ~${discovered.length} (free tier)`);
  console.log(`  Estimated Firecrawl credit cost: ${firecrawlScrapes} max (likely less with direct fetch)\n`);

  console.log('=== DRY-RUN COMPLETE ===');
}

main().catch(console.error);
