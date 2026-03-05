/**
 * Content fetching layer. Tries FREE direct fetch first, only uses
 * Firecrawl (1 credit) for JS-heavy sites that need rendering.
 */

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
const REALISTIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const JS_HEAVY_DOMAINS = [
  'crexi.com',
  'commercialsearch.com',
  'commercialcafe.com',
  'ten-x.com',
  'zillow.com',
  'propertyshark.com',
  'realmo.com',
];

function isJsHeavy(url) {
  const u = url.toLowerCase();
  return JS_HEAVY_DOMAINS.some((d) => u.includes(d));
}

/**
 * LoopNet blocks all automated requests. Never waste credits on it.
 */
function isAlwaysBlocked(url) {
  return /loopnet\.(com|ca)\//i.test(url);
}

async function scrapeWithFirecrawl(url) {
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const res = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'], waitFor: 3000 }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`Firecrawl ${res.status} for ${url}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    if (!data.success || !data.data) return null;

    const md = data.data.markdown || '';
    const meta = data.data.metadata || {};

    if (md.includes('Access Denied') || md.length < 100) return null;

    return {
      url,
      title: meta.title || null,
      snippet: meta.description || md.slice(0, 2000),
      raw: md.slice(0, 8000),
    };
  } catch (e) {
    console.warn('Firecrawl error:', url, e.message);
    return null;
  }
}

async function scrapeWithFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': REALISTIC_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();
    if (html.includes('Access Denied') || html.length < 200) return null;

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    const snippet = descMatch
      ? descMatch[1].trim()
      : html.slice(0, 3000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

    return { url, title, snippet, raw: html.slice(0, 8000) };
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Scrape a URL with minimal credit usage:
 * 1. Skip always-blocked sites (LoopNet) — return null
 * 2. Try free direct fetch first
 * 3. Only use Firecrawl (1 credit) for JS-heavy sites where fetch failed
 */
async function scrapeUrl(url) {
  if (isAlwaysBlocked(url)) return null;

  const fetchResult = await scrapeWithFetch(url);
  if (fetchResult) return fetchResult;

  if (isJsHeavy(url)) {
    return scrapeWithFirecrawl(url);
  }

  return null;
}

module.exports = { scrapeUrl, scrapeWithFirecrawl, scrapeWithFetch, isAlwaysBlocked };
