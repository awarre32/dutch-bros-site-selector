/**
 * LoopNet scraper: discover retail/land listings in NC/SC for Dutch Bros site pipeline.
 * Uses HTTP fetch. Rate-limited. LoopNet may serve JS-rendered content; if so, listing links
 * may still appear in initial HTML or we return empty and rely on Crexi / manual feed.
 */

const DELAY_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build search URLs for NC and SC (retail/land focus). LoopNet URL structure may change.
 */
function getSearchUrls() {
  const base = 'https://www.loopnet.com';
  return [
    `${base}/search/commercial-real-estate/north-carolina/for-sale/`,
    `${base}/search/commercial-real-estate/south-carolina/for-sale/`,
  ];
}

/**
 * Extract listing links and optional snippet from HTML. LoopNet uses data-listing-id and links like /Listing/...
 */
function parseListingLinks(html, baseUrl) {
  const results = [];
  const listingRegex = /href="(\/Listing\/[^"]+)"/gi;
  const titleRegex = /<[^>]*class="[^"]*listing-title[^"]*"[^>]*>([^<]*)</i;
  let match;
  const seen = new Set();
  while ((match = listingRegex.exec(html)) !== null) {
    let path = match[1];
    if (path.startsWith('//')) path = `https:${path}`;
    else if (path.startsWith('/')) path = new URL(path, baseUrl).href;
    if (seen.has(path)) continue;
    seen.add(path);
    results.push({ url: path, title: null, snippet: null });
  }
  return results;
}

/**
 * Fetch one URL with timeout and User-Agent.
 */
async function fetchPage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Fetch listing detail page and return title + snippet (first meaningful text).
 */
async function fetchListingDetail(url) {
  await sleep(DELAY_MS);
  const html = await fetchPage(url);
  if (!html) return { url, title: null, snippet: null, raw: null };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*LoopNet\s*$/i, '').trim() : null;
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const snippet = descMatch ? descMatch[1].trim() : html.slice(0, 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  return { url, title, snippet, raw: html.slice(0, 8000) };
}

/**
 * Run LoopNet scraper: hit search pages, collect listing URLs, then fetch each detail (up to maxListings).
 * @param {{ maxListings?: number }} options
 * @returns {Promise<Array<{ url: string, title?: string, snippet?: string, raw?: string }>>}
 */
async function scrapeLoopNet(options = {}) {
  const maxListings = options.maxListings ?? 15;
  const urls = getSearchUrls();
  const allLinks = [];
  for (const searchUrl of urls) {
    await sleep(DELAY_MS);
    const html = await fetchPage(searchUrl);
    if (html) {
      const links = parseListingLinks(html, searchUrl);
      allLinks.push(...links);
    }
  }
  const unique = Array.from(new Map(allLinks.map((l) => [l.url, l])).values()).slice(0, maxListings);
  const results = [];
  for (const link of unique) {
    try {
      const detail = await fetchListingDetail(link.url);
      results.push(detail);
    } catch (e) {
      results.push({ url: link.url, title: null, snippet: null, raw: null });
    }
  }
  return results;
}

module.exports = { scrapeLoopNet, getSearchUrls, fetchPage, parseListingLinks };
