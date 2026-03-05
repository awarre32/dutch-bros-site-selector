# App review & test summary

## App structure

- **Frontend:** Single-page `public/index.html` — map (Google Maps), left panel with tabs (Map & Locations, Site Screener, Suggestions), Firestore read for AI-qualified sites. No auth; anyone can use it.
- **Backend:** Firebase Cloud Functions (`functions/`) — scheduled daily scrape, HTTP-triggered scrape, Dutch Bros criteria, Gemini extraction, geocoding, Firestore write.
- **Data:** Static NC/SC locations in the page; AI-qualified sites and “Last scraped” from Firestore `aiQualifiedSites` and `scrapeMetadata/lastRun`.

## API check (latest run)

- **Geocoding:** Fails until [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector) is enabled and the key has no HTTP-referrer restriction (use **API key 1** in `functions/.env`).
- **Gemini:** Fails with `API_KEY_HTTP_REFERRER_BLOCKED` when the key is restricted to HTTP referrers. Use **API key 1** (no application restrictions) in `functions/.env` for `GEMINI_API_KEY`.

See **API_STATUS.md** for the full checklist and links.

## Scraping test

- **Script:** `functions/scripts/test-scrapers.js` (runs LoopNet + Crexi only, no AI/Firestore).
- **Result:** 0 listings returned. LoopNet/Crexi may use JS-rendered content or different HTML structure; the scraper’s regex/selectors may need updating, or the sites may block non-browser requests.
- **Production:** The deployed `runScrapeNow` and `scheduledScrapeAndQualify` functions run the same scrapers; once APIs and keys are fixed, any listings returned will be processed (extract → criteria → geocode → Firestore).

## Theme

- The app uses a **light theme** only (no dark version): light gray background, white panel, default Google Map style.

## Quick commands

```powershell
# API test (Geocoding + Gemini)
cd functions; node scripts/test-apis.js

# Scraper test (LoopNet + Crexi only)
cd functions; node scripts/test-scrapers.js
```
