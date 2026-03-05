/**
 * Discovery layer: finds individual CRE listing URLs across the web.
 *
 * Primary:  Serper.dev (Google Search API) — searches Google index, returns
 *           actual listing pages from LoopNet, Crexi, broker sites, etc.
 * Secondary: Firecrawl /search — broad web search for additional coverage
 * Optional:  Google Custom Search (requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX)
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;

/**
 * Targeted queries that find INDIVIDUAL listing pages, not category pages.
 * site:loopnet.com/Listing/ restricts to actual LoopNet listings.
 */
const SERPER_QUERIES = [
  // LoopNet individual listings by state
  'site:loopnet.com/Listing/ North Carolina retail outparcel for sale',
  'site:loopnet.com/Listing/ South Carolina retail outparcel for sale',
  'site:loopnet.com/Listing/ Charlotte NC outparcel drive-thru pad site',
  'site:loopnet.com/Listing/ Raleigh Durham NC outparcel retail land',
  'site:loopnet.com/Listing/ Greenville Charleston SC outparcel',
  'site:loopnet.com/Listing/ Myrtle Beach Columbia SC retail pad',
  'site:loopnet.com/Listing/ NC SC commercial land acres for sale',
  // Crexi individual listings
  'site:crexi.com/properties/ North Carolina outparcel retail for sale',
  'site:crexi.com/properties/ South Carolina outparcel retail for sale',
  // Multi-platform: CLT metro
  'retail outparcel pad site for sale Charlotte NC acres 2025 OR 2026',
  'commercial land for sale Charlotte Huntersville Concord NC drive-thru',
  'outparcel for sale Matthews Indian Trail Mooresville NC retail',
  '"ground lease" OR "pad site" Charlotte NC NNN QSR coffee',
  // Multi-platform: RDU / Triangle
  'outparcel for sale Raleigh Durham NC drive-thru QSR retail land',
  'retail pad site for sale Wake Forest Holly Springs Garner NC',
  'commercial outparcel Cary Apex NC for sale retail land',
  // Multi-platform: Triad
  'outparcel for sale Greensboro Winston-Salem High Point NC retail',
  // Multi-platform: Upstate SC
  'commercial outparcel for sale Greenville Spartanburg SC drive-thru QSR',
  'retail land pad site Greer Simpsonville Anderson SC for sale',
  // Multi-platform: Coastal
  'outparcel land for sale Wilmington NC retail drive-thru commercial',
  'outparcel land for sale Myrtle Beach Conway Bluffton SC retail',
  'commercial pad site Jacksonville Leland NC for sale',
  // Multi-platform: Charleston / Columbia
  'outparcel land for sale Columbia Lexington SC commercial restaurant',
  'retail outparcel for sale Charleston Summerville Goose Creek SC',
  // Broad sweeps
  '"pad site" OR "outparcel" for sale "North Carolina" retail drive-thru',
  '"pad site" OR "outparcel" for sale "South Carolina" retail drive-thru',
  'NNN drive-thru ground lease for sale NC SC 2026',
  'commercial land for sale NC SC "hard corner" OR "signalized" acres',
];

const FIRECRAWL_QUERIES = [
  'outparcel for sale Charlotte NC retail pad site drive-thru',
  'outparcel for sale Raleigh Durham NC commercial retail land',
  'outparcel for sale Greenville SC retail pad site drive-thru',
  'outparcel for sale Charleston Columbia SC commercial land',
  'NNN drive-thru property for sale NC SC outparcel land',
  'retail pad site ground lease Charlotte Raleigh NC 2026',
  'commercial outparcel Myrtle Beach Wilmington SC NC for sale',
  'retail land hard corner outparcel NC SC for sale QSR',
];

const DELAY_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function identifySource(url) {
  if (!url) return 'unknown';
  const u = url.toLowerCase();
  if (u.includes('loopnet.com')) return 'loopnet';
  if (u.includes('crexi.com')) return 'crexi';
  if (u.includes('commercialsearch.com')) return 'commercialsearch';
  if (u.includes('commercialcafe.com')) return 'commercialcafe';
  if (u.includes('ten-x.com')) return 'ten-x';
  if (u.includes('landwatch.com')) return 'landwatch';
  if (u.includes('land.com') && !u.includes('landwatch.com')) return 'land';
  if (u.includes('totalcommercial.com')) return 'totalcommercial';
  if (u.includes('coldwellbankercommercial.com')) return 'cbcre';
  if (u.includes('cushmanwakefield.com')) return 'cushwake';
  if (u.includes('colliers.com')) return 'colliers';
  if (u.includes('realmo.com')) return 'realmo';
  if (u.includes('tscg.com')) return 'tscg';
  if (u.includes('mpvre.com') || u.includes('mpvproperties.com')) return 'mpv';
  if (u.includes('cbre.com')) return 'cbre';
  if (u.includes('jll.com')) return 'jll';
  if (u.includes('foundrycommercial.com')) return 'foundry';
  if (u.includes('brixmor.com')) return 'brixmor';
  if (u.includes('zillow.com')) return 'zillow';
  if (u.includes('propertyshark.com')) return 'propertyshark';
  return 'other';
}

function isListingUrl(url) {
  const u = url.toLowerCase();
  if (/\/(search|results|category|about|contact|login|signup|faq|blog)\b/i.test(u)) return false;
  if (/loopnet\.com\/search\//i.test(u)) return false;
  if (/loopnet\.ca\//i.test(u)) return false;
  if (/crexi\.com\/(sale|lease|properties)\//i.test(u) && !/\d{5,}/.test(u)) return false;
  if (u.match(/^https?:\/\/[^/]+\/?$/)) return false;
  if (/\.pdf(\?|$)/i.test(u)) return false;
  if (/\/(uses|property-type|property-search|property-inventory)\//i.test(u)) return false;
  if (/\/(for-sale|for-lease|sale|lease)\/(nc|sc|north-carolina|south-carolina)/i.test(u)) return false;
  if (/\/(drive-through-restaurants|qsr-and-fast-food)\//i.test(u)) return false;

  if (u.includes('loopnet.com/listing/')) return true;
  if (/crexi\.com\/properties\/\d+/i.test(u)) return true;
  if (/\/property\/[^/]+/i.test(u)) return true;
  if (/\/listing\/\d+/i.test(u)) return true;
  if (/\/\d{5,}/.test(u)) return true;
  if (/\/(properties|listings)\/[a-z0-9]+-[a-z0-9-]+/i.test(u)) return true;
  if (/\b(rd|st|blvd|ave|pkwy|hwy|dr|ln|ct|way)\b/i.test(u)) return true;
  const pathParts = u.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
  if (pathParts.length >= 3) return true;
  return false;
}

// ── Serper.dev (primary discovery) ────────────────────────────────

async function searchWithSerper(maxResults) {
  if (!SERPER_API_KEY) return [];

  const allResults = [];
  const seenUrls = new Set();

  for (const query of SERPER_QUERIES) {
    if (allResults.length >= maxResults) break;
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 20 }),
      });

      if (!res.ok) {
        console.warn(`Serper ${res.status} for: ${query}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.organic || []) {
        const url = item.link;
        if (!url || seenUrls.has(url)) continue;
        if (!isListingUrl(url)) continue;
        seenUrls.add(url);
        allResults.push({
          url,
          title: item.title || null,
          snippet: item.snippet || null,
          source: identifySource(url),
        });
      }
    } catch (e) {
      console.warn('Serper error:', e.message);
    }
    await sleep(DELAY_MS);
  }

  console.log(`Serper discovered ${allResults.length} listing URLs`);
  return allResults.slice(0, maxResults);
}

// ── Firecrawl Search (secondary discovery) ────────────────────────

async function searchWithFirecrawl(maxResults) {
  if (!FIRECRAWL_API_KEY) return [];

  const allResults = [];
  const seenUrls = new Set();

  for (const query of FIRECRAWL_QUERIES) {
    if (allResults.length >= maxResults) break;
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({ query, limit: 10 }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      for (const item of data.data || []) {
        const url = item.url;
        if (!url || seenUrls.has(url)) continue;
        if (!isListingUrl(url)) continue;
        seenUrls.add(url);
        allResults.push({
          url,
          title: item.title || null,
          snippet: item.description || item.markdown?.slice(0, 2000) || null,
          source: identifySource(url),
        });
      }
    } catch (e) {
      console.warn('Firecrawl search error:', e.message);
    }
    await sleep(DELAY_MS);
  }

  console.log(`Firecrawl search discovered ${allResults.length} URLs`);
  return allResults.slice(0, maxResults);
}

// ── Google Custom Search (optional discovery) ─────────────────────

async function searchWithGoogleCSE(maxResults) {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) return [];

  const googleQueries = [
    '"retail" "for sale" "North Carolina" outparcel OR "drive-thru"',
    '"retail" "for sale" "South Carolina" outparcel OR "drive-thru"',
  ];

  const allResults = [];
  const seenUrls = new Set();

  for (const query of googleQueries) {
    if (allResults.length >= maxResults) break;
    try {
      const params = new URLSearchParams({
        key: GOOGLE_CSE_API_KEY, cx: GOOGLE_CSE_CX, q: query, num: '10',
      });
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        const url = item.link;
        if (!url || seenUrls.has(url) || !isListingUrl(url)) continue;
        seenUrls.add(url);
        allResults.push({ url, title: item.title || null, snippet: item.snippet || null, source: identifySource(url) });
      }
    } catch (e) {
      console.warn('Google CSE error:', e.message);
    }
    await sleep(DELAY_MS);
  }
  return allResults.slice(0, maxResults);
}

// ── Combined discovery ────────────────────────────────────────────

async function searchListings({ maxResults = 100 } = {}) {
  const serperResults = await searchWithSerper(maxResults);

  let fcResults = [];
  if (serperResults.length < 15) {
    console.log('Serper found few new results, supplementing with Firecrawl search...');
    fcResults = await searchWithFirecrawl(maxResults - serperResults.length);
  }

  const cseResults = await searchWithGoogleCSE(20);

  const byUrl = new Map();
  for (const item of [...serperResults, ...fcResults, ...cseResults]) {
    const norm = item.url.replace(/#.*$/, '').replace(/\/+$/, '');
    if (!byUrl.has(norm)) byUrl.set(norm, item);
  }

  const results = Array.from(byUrl.values()).slice(0, maxResults);
  const sources = {};
  for (const r of results) sources[r.source] = (sources[r.source] || 0) + 1;
  console.log(`Discovery complete: ${results.length} unique listing URLs`, sources);
  return results;
}

module.exports = { searchListings, identifySource, isListingUrl };
