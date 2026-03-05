/**
 * Geocode address to lat/lng using Google Geocoding API.
 * Set GOOGLE_GEOCODING_API_KEY in environment. If unset, returns null coords.
 */

const API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

async function geocodeAddress(address) {
  if (!API_KEY || !address || typeof address !== 'string') {
    return { lat: null, lng: null };
  }
  const encoded = encodeURIComponent(address.trim().slice(0, 500));
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) {
    // ignore
  }
  return { lat: null, lng: null };
}

module.exports = { geocodeAddress };
