/**
 * Quick test: Geocoding API + Gemini extraction. Run from repo root:
 *   node functions/scripts/test-apis.js
 * Or from functions/: node scripts/test-apis.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { geocodeAddress } = require('../src/geocode');
const { extractListing } = require('../src/ai/extractListing');

async function main() {
  const geoKey = process.env.GOOGLE_GEOCODING_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  console.log('Env: GOOGLE_GEOCODING_API_KEY', geoKey ? '(set)' : '(missing)');
  console.log('Env: GEMINI_API_KEY', geminiKey ? '(set)' : '(missing)');

  console.log('\nTesting Google Geocoding API...');
  const geo = await geocodeAddress('Charlotte, NC');
  if (geo.lat && geo.lng) {
    console.log('  Geocoding OK:', geo.lat.toFixed(4), geo.lng.toFixed(4));
  } else {
    console.log('  Geocoding failed. Enable Geocoding API: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector');
  }

  console.log('\nTesting Gemini extraction...');
  const sample = {
    url: 'https://example.com/listing',
    title: 'Retail outparcel - 0.65 ac - 32K VPD',
    snippet: 'Hard corner at signalized intersection. 2 access points. Drive-thru permitted. Utilities on site. Charlotte NC. Land $450,000.',
  };
  try {
    const extracted = await extractListing(sample);
    console.log('  Extraction OK. Sample fields:', {
      siteAreaAcres: extracted.siteAreaAcres,
      vpd: extracted.vpd,
      address: extracted.address,
      landPrice: extracted.landPrice,
    });
  } catch (e) {
    console.log('  Extraction failed:', e.message);
    if (e.message.includes('403') || e.message.includes('PERMISSION_DENIED')) {
      console.log('  Enable Generative Language API: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=dutch-bros-site-selector');
    }
  }
}

main().catch(console.error);
