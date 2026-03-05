/**
 * Trigger a manual scrape and print results. Run: node scripts/trigger-scrape.js
 */
async function main() {
  console.log('Triggering full scrape...');
  const start = Date.now();

  const res = await fetch('https://us-central1-dutch-bros-site-selector.cloudfunctions.net/runScrapeNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(540000),
  });

  const data = await res.json();
  console.log('Duration:', Math.round((Date.now() - start) / 1000) + 's');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => console.error('Error:', e.message));
