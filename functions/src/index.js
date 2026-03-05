/**
 * Cloud Functions: daily scrape + AI extraction + Dutch Bros criteria -> Firestore.
 *
 * Deduplication: loads all previously processed URLs from Firestore before scraping.
 * Only new/unseen URLs are scraped, extracted, and evaluated.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { runAllScrapers } = require('./scrapers/index');
const { extractListing } = require('./ai/extractListing');
const { recommendPartialListing } = require('./ai/recommendPartialListing');
const { runDutchBrosCriteria } = require('./criteria/dutchBrosCriteria');
const { geocodeAddress } = require('./geocode');

admin.initializeApp();

const COLLECTION = 'aiQualifiedSites';
const PROCESSED_COLLECTION = 'processedUrls';
const METADATA_COLLECTION = 'scrapeMetadata';
const MIN_VERDICT_TO_STORE = 'CONDITIONAL';
const MAX_LISTINGS_PER_RUN = 50;
const VERDICT_ORDER = { GO: 2, CONDITIONAL: 1, 'NO-GO': 0 };

function normalizeUrl(url) {
  return url.replace(/#.*$/, '').replace(/\?.*$/, (q) => (q.length > 200 ? q.slice(0, 200) : q)).replace(/\/+$/, '');
}

function docIdFromUrl(url) {
  const safe = url.replace(/[^a-zA-Z0-9-_./]/g, '_').slice(0, 150);
  return Buffer.from(safe).toString('base64').replace(/[/+=]/g, '_').slice(0, 150);
}

/**
 * Load all previously processed URLs from Firestore to avoid re-processing.
 */
async function loadProcessedUrls(db) {
  const urls = new Set();

  const qualifiedSnap = await db.collection(COLLECTION).select('url').get();
  for (const doc of qualifiedSnap.docs) {
    const url = doc.data().url;
    if (url) urls.add(normalizeUrl(url));
  }

  const processedSnap = await db.collection(PROCESSED_COLLECTION).select('url').get();
  for (const doc of processedSnap.docs) {
    const url = doc.data().url;
    if (url) urls.add(normalizeUrl(url));
  }

  console.log(`Loaded ${urls.size} previously processed URLs for dedup`);
  return urls;
}

/**
 * Record a URL as processed so it's skipped in future runs.
 */
async function markUrlProcessed(db, url, verdict) {
  const docId = docIdFromUrl(url);
  await db.collection(PROCESSED_COLLECTION).doc(docId).set({
    url,
    verdict: verdict || 'EXTRACT_FAILED',
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function processOneListing(listing, db) {
  const { url, title, snippet, raw, source } = listing;
  let extracted;
  try {
    extracted = await extractListing({ url, title, snippet, raw });
  } catch (e) {
    console.warn('Extract failed for', url, e.message);
    await markUrlProcessed(db, url, 'EXTRACT_FAILED');
    return { stored: false, verdict: null, error: e.message };
  }
  const criteriaResult = runDutchBrosCriteria(extracted);
  let verdict = criteriaResult.verdict;
  let aiOverride = false;

  if (verdict === 'NO-GO') {
    const sectionAPresent = criteriaResult.sectionAPresent ?? criteriaResult.criteriaResult?.sectionAPresent ?? 0;
    const sectionBPresent = criteriaResult.sectionBPresent ?? criteriaResult.criteriaResult?.sectionBPresent ?? 0;
    const hasAddressOrTitle = !!(extracted?.address || title);
    const hasEnoughPartialData = sectionAPresent >= 3 ||
      (hasAddressOrTitle && (extracted?.landPrice != null || sectionAPresent >= 2 || sectionBPresent >= 2));
    if (hasEnoughPartialData) {
      try {
        const { recommendedVerdict } = await recommendPartialListing(extracted, criteriaResult.criteriaResult);
        if (recommendedVerdict === 'GO' || recommendedVerdict === 'CONDITIONAL') {
          verdict = 'CONDITIONAL';
          aiOverride = true;
        }
      } catch (e) {
        console.warn('AI partial recommendation failed for', url, e.message);
      }
    }
  }

  await markUrlProcessed(db, url, verdict);

  if (VERDICT_ORDER[verdict] == null || VERDICT_ORDER[verdict] < VERDICT_ORDER[MIN_VERDICT_TO_STORE]) {
    return { stored: false, verdict };
  }
  const address = extracted.address || [extracted.city, extracted.state].filter(Boolean).join(', ') || title || url;
  const { lat, lng } = await geocodeAddress(address);
  const docId = docIdFromUrl(url);
  const incompleteData = criteriaResult.incompleteData === true || aiOverride;
  const payload = {
    url,
    source: source || 'unknown',
    scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    title: title || extracted.address || 'Unknown',
    address: address || null,
    lat: lat ?? null,
    lng: lng ?? null,
    market: extracted.market || null,
    extracted,
    criteriaResult: criteriaResult.criteriaResult,
    verdict,
    incompleteData: incompleteData || undefined,
    aiOverride: aiOverride || undefined,
    dataCompleteness: criteriaResult.dataCompleteness,
    rawSnippet: snippet ? snippet.slice(0, 2000) : null,
  };
  await db.collection(COLLECTION).doc(docId).set(payload, { merge: true });
  return { stored: true, verdict, docId };
}

async function runScrapeJob(db) {
  const start = Date.now();
  let scraped = 0;
  let extracted = 0;
  let stored = 0;
  let skipped = 0;
  const verdictCounts = { GO: 0, CONDITIONAL: 0, 'NO-GO': 0 };
  const processedDetails = [];

  const alreadyProcessed = await loadProcessedUrls(db);

  const listings = await runAllScrapers({
    maxPerSource: Math.ceil(MAX_LISTINGS_PER_RUN / 2),
    alreadyProcessed,
  });
  scraped = listings.length;
  console.log(`New listings after dedup: ${scraped} (${alreadyProcessed.size} already processed)`);
  const toProcess = listings.slice(0, MAX_LISTINGS_PER_RUN);

  for (const listing of toProcess) {
    try {
      const result = await processOneListing(listing, db);
      if (result.verdict) verdictCounts[result.verdict] = (verdictCounts[result.verdict] || 0) + 1;
      if (result.stored) stored++;
      extracted++;
      processedDetails.push({ url: listing.url?.slice(0, 80), source: listing.source, verdict: result.verdict, stored: result.stored });
    } catch (e) {
      console.error('Process error', listing.url, e);
      processedDetails.push({ url: listing.url?.slice(0, 80), source: listing.source, error: e.message });
    }
  }

  if (processedDetails.length > 0) {
    console.log('Processed listings:', JSON.stringify(processedDetails));
  }

  const meta = {
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    scraped,
    extracted,
    stored,
    skipped: alreadyProcessed.size,
    verdictCounts,
    durationMs: Date.now() - start,
  };

  await db.collection(METADATA_COLLECTION).doc('lastRun').set(meta, { merge: true });
  console.log('Scrape complete', { scraped, extracted, stored, verdictCounts, durationMs: meta.durationMs });
  return { ok: true, ...meta, durationMs: Date.now() - start };
}

exports.scheduledScrapeAndQualify = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('0 6 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    const db = admin.firestore();
    await runScrapeJob(db);
    return null;
  });

exports.runScrapeNow = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const secret = req.query?.key || req.body?.key;
    const expected = process.env.SCRAPE_SECRET;
    if (expected && secret !== expected) {
      res.status(403).send('Forbidden');
      return;
    }

    const db = admin.firestore();
    try {
      const result = await runScrapeJob(db);
      res.json(result);
    } catch (e) {
      console.error('runScrapeNow error', e);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

exports.cleanupBadGeolocations = functions
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }
    const { isWithinCarolinas } = require('./geocode');
    const db = admin.firestore();
    const snap = await db.collection(COLLECTION).get();
    let fixed = 0, removed = 0, regeoFailed = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      const lat = d.lat, lng = d.lng;
      if (lat != null && lng != null && !isWithinCarolinas(lat, lng)) {
        const address = d.address || d.title || '';
        if (address) {
          const newGeo = await geocodeAddress(address);
          if (newGeo.lat != null && newGeo.lng != null) {
            await doc.ref.update({ lat: newGeo.lat, lng: newGeo.lng });
            console.log(`Re-geocoded "${address}": ${lat},${lng} -> ${newGeo.lat},${newGeo.lng}`);
            fixed++;
          } else {
            await doc.ref.update({ lat: null, lng: null });
            console.log(`Nulled bad coords for "${address}" (re-geocode failed)`);
            regeoFailed++;
          }
        } else {
          await doc.ref.update({ lat: null, lng: null });
          removed++;
        }
      }
    }
    res.json({ ok: true, total: snap.size, fixed, nulled: regeoFailed, removedNoAddr: removed });
  });
