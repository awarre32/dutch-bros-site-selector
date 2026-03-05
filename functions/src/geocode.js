/**
 * Geocode address to lat/lng using Google Geocoding API.
 * Set GOOGLE_GEOCODING_API_KEY in environment. If unset, returns null coords.
 * Validates results fall within NC/SC bounding box to prevent mislocated markers.
 */

const API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

const NC_SC_BOUNDS = {
  latMin: 32.0,
  latMax: 36.6,
  lngMin: -84.4,
  lngMax: -75.4,
};

function isWithinCarolinas(lat, lng) {
  return (
    lat >= NC_SC_BOUNDS.latMin &&
    lat <= NC_SC_BOUNDS.latMax &&
    lng >= NC_SC_BOUNDS.lngMin &&
    lng <= NC_SC_BOUNDS.lngMax
  );
}

async function geocodeAddress(address) {
  if (!API_KEY || !address || typeof address !== 'string') {
    return { lat: null, lng: null };
  }

  const trimmed = address.trim().slice(0, 500);
  const needsState = !/\b(NC|SC|North Carolina|South Carolina)\b/i.test(trimmed);
  const queryAddr = needsState ? `${trimmed}, NC` : trimmed;

  const encoded = encodeURIComponent(queryAddr);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&components=country:US&key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { lat: null, lng: null };
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      if (!isWithinCarolinas(loc.lat, loc.lng)) {
        console.warn(`Geocode out of NC/SC bounds: "${trimmed}" -> ${loc.lat},${loc.lng}`);
        return { lat: null, lng: null };
      }
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (e) {
    console.warn('Geocode error:', e.message);
  }
  return { lat: null, lng: null };
}

module.exports = { geocodeAddress, isWithinCarolinas };
