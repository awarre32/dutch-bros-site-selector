/**
 * Crexi scraper: discover retail/land listings in NC/SC for Dutch Bros site pipeline.
 * Uses HTTP fetch with rate limiting. Crexi is JS-heavy; we try to get listing links from HTML.
 */

const DELAY_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSearchUrls() {
  return [
    'https://www.crexi.com/sale/north-carolina',
    'https://www.crexi.com/sale/south-carolina',
  ];
}

/**
 * State/region-level paths that are search pages, not individual listings.
 */
const CATEGORY_PATHS = [
  '/sale/north-carolina', '/sale/south-carolina',
  '/lease/north-carolina', '/lease/south-carolina',
  '/sale/nc', '/sale/sc', '/lease/nc', '/lease/sc',
];

function isCategoryUrl(url) {
  const path = url.replace(/https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  return CATEGORY_PATHS.includes(path) || /^\/(sale|lease)\/[a-z-]+$/.test(path);
}

function parseListingLinks(html, baseUrl) {
  const results = [];
  const seen = new Set();
  const regex = /href="(https?:\/\/www\.crexi\.com\/[^"]+)"|href="(\/sale\/[^"]+)"|href="(\/lease\/[^"]+)"|href="(\/properties\/[^"]+)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const path = match[1] || match[2] || match[3] || match[4];
    if (!path) continue;
    let url = path.startsWith('http') ? path : new URL(path, baseUrl).href;
    if (isCategoryUrl(url)) continue;
    if (url.includes('/properties/') || url.includes('/sale/') || url.includes('/lease/')) {
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({ url, title: null, snippet: null });
    }
  }
  return results;
}

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

async function fetchListingDetail(url) {
  await sleep(DELAY_MS);
  const html = await fetchPage(url);
  if (!html) return { url, title: null, snippet: null, raw: null };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*Crexi\s*$/i, '').trim() : null;
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const snippet = descMatch ? descMatch[1].trim() : html.slice(0, 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  return { url, title, snippet, raw: html.slice(0, 8000) };
}

/**
 * @param {{ maxListings?: number }} options
 * @returns {Promise<Array<{ url: string, title?: string, snippet?: string, raw?: string }>>}
 */
async function scrapeCrexi(options = {}) {
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

module.exports = { scrapeCrexi, getSearchUrls, fetchPage, parseListingLinks };
