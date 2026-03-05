/**
 * Scraper orchestrator: discovers listings, fetches content, deduplicates.
 *
 * Credit-saving measures:
 * - LoopNet URLs: never Firecrawl-scraped (always blocked), uses Serper snippet
 * - Direct fetch tried first (free); Firecrawl only for JS-heavy sites
 * - Firecrawl search only runs if Serper found < 5 results
 * - Previously processed URLs are skipped (pass via options.alreadyProcessed)
 */

const { searchListings } = require('./googleSearch');
const { scrapeUrl, isAlwaysBlocked } = require('./firecrawl');
const { scrapeLoopNet } = require('./loopnet');
const { scrapeCrexi } = require('./crexi');

const CONTENT_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  return url
    .replace(/#.*$/, '')
    .replace(/\?.*$/, (q) => (q.length > 200 ? q.slice(0, 200) : q))
    .replace(/\/+$/, '');
}

/**
 * @param {{ maxPerSource?: number, alreadyProcessed?: Set<string> }} options
 */
async function runAllScrapers(options = {}) {
  const maxPerSource = options.maxPerSource ?? 30;
  const maxTotal = Math.max(maxPerSource * 3, 100);
  const alreadyProcessed = options.alreadyProcessed || new Set();

  const cseListings = [];
  const seenUrls = new Set();
  let skippedDedup = 0;
  let skippedBlocked = 0;
  let firecrawlCreditsUsed = 0;

  try {
    const discovered = await searchListings({ maxResults: maxTotal + 10 });

    for (const item of discovered) {
      if (cseListings.length >= maxTotal) break;

      const norm = normalizeUrl(item.url);
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);

      if (alreadyProcessed.has(norm)) {
        skippedDedup++;
        continue;
      }

      if (isAlwaysBlocked(item.url)) {
        skippedBlocked++;
        cseListings.push({
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          raw: null,
          source: item.source || 'serper',
        });
        continue;
      }

      await sleep(CONTENT_DELAY_MS);

      const content = await scrapeUrl(item.url);
      if (content) {
        firecrawlCreditsUsed++;
        cseListings.push({
          url: item.url,
          title: content.title || item.title,
          snippet: content.snippet || content.raw?.slice(0, 2000) || item.snippet,
          raw: content.raw || null,
          source: item.source || 'serper',
        });
      } else {
        cseListings.push({
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          raw: null,
          source: item.source || 'serper',
        });
      }
    }
  } catch (e) {
    console.warn('Discovery pipeline error:', e.message);
  }

  // Legacy fallback only if discovery produced almost nothing
  if (cseListings.length < 3) {
    console.log('Discovery found very few new listings, running legacy fallback...');
    const [loopNetListings, crexiListings] = await Promise.all([
      scrapeLoopNet({ maxListings: maxPerSource }).catch(() => []),
      scrapeCrexi({ maxListings: maxPerSource }).catch(() => []),
    ]);
    for (const l of [...loopNetListings.map((x) => ({ ...x, source: 'loopnet' })),
                      ...crexiListings.map((x) => ({ ...x, source: 'crexi' }))]) {
      const norm = normalizeUrl(l.url);
      if (!seenUrls.has(norm) && !alreadyProcessed.has(norm)) {
        seenUrls.add(norm);
        cseListings.push(l);
      }
    }
  }

  const byUrl = new Map();
  for (const item of cseListings) {
    const norm = normalizeUrl(item.url);
    if (!byUrl.has(norm)) byUrl.set(norm, item);
  }

  const results = Array.from(byUrl.values());
  const sources = {};
  for (const r of results) sources[r.source] = (sources[r.source] || 0) + 1;
  console.log(`Pipeline: ${results.length} new listings | skipped ${skippedDedup} already-processed, ${skippedBlocked} blocked | ~${firecrawlCreditsUsed} Firecrawl credits used`, sources);
  return results;
}

module.exports = { runAllScrapers };
