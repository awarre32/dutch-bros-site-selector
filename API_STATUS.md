# API status & checklist

Run the backend API test from the repo:

```powershell
cd functions
node scripts/test-apis.js
```

## APIs used by this app

| API | Used by | Enable link | Notes |
|-----|--------|-------------|--------|
| **Geocoding API** | Cloud Functions (geocode AI sites) | [Enable](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector) | Backend only |
| **Generative Language API** (Gemini) | Cloud Functions (AI extraction) | [Enable](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=dutch-bros-site-selector) | Backend only |
| **Maps JavaScript API** | Frontend (map) | [Enable](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com?project=dutch-bros-site-selector) | Browser key must allow your URLs |
| **Places API** | Frontend (search autocomplete) | [Enable](https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=dutch-bros-site-selector) | Same key as Maps |
| **Cloud Firestore API** | Frontend + Functions | [Enable](https://console.cloud.google.com/apis/api/firestore.googleapis.com?project=dutch-bros-site-selector) | Usually enabled with Firebase |

## Backend keys (functions/.env or Cloud Console)

- Use **API key 1** (no application restrictions) for `GOOGLE_GEOCODING_API_KEY` and `GEMINI_API_KEY` so server-side calls work (no HTTP referrer).
- If you use a key with “HTTP referrers” only, Gemini and Geocoding will return 403 from Cloud Functions.

## Current test results (example)

- **Geocoding:** Fails until Geocoding API is enabled and key has no referrer restriction.
- **Gemini:** Fails with `API_KEY_HTTP_REFERRER_BLOCKED` if the key is restricted to HTTP referrers; use an unrestricted key for backend.

After enabling APIs and fixing the key, run `node scripts/test-apis.js` again; you should see “Geocoding OK” and “Extraction OK”.
