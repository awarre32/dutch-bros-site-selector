# Deploy & Enable — Get the app fully working

**Live app:** https://dutch-bros-site-selector.web.app

---

## 1. Enable Google Cloud APIs

Open each link and click **Enable** (use project `dutch-bros-site-selector`):

| API | Purpose | Link |
|-----|---------|------|
| **Geocoding API** | Backend geocoding for AI sites | https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector |
| **Generative Language API** | Gemini for AI extraction | https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=dutch-bros-site-selector |
| **Maps JavaScript API** | Map on the web app | https://console.cloud.google.com/apis/library/maps-backend.googleapis.com?project=dutch-bros-site-selector |
| **Places API** | Search/autocomplete on the map | https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=dutch-bros-site-selector |

Firestore was already enabled during deploy.

---

## 2. Allow your app URLs on the Browser API key

So the map and Places work on the live site:

1. Go to **Credentials:** https://console.cloud.google.com/apis/credentials?project=dutch-bros-site-selector  
2. Open **Browser key (auto created by Firebase)** (or the key used in the app).  
3. Under **Application restrictions → HTTP referrers**, add:
   - `https://dutch-bros-site-selector.web.app/*`
   - `https://dutch-bros-site-selector.firebaseapp.com/*`
   - (Optional for local) `http://localhost:*`
4. Save.

---

## 3. Set Cloud Functions environment variables

The backend (scrape + AI + geocoding) runs in Cloud Functions. Set these in the Cloud Console so they are available in production:

1. Go to **Cloud Functions:** https://console.cloud.google.com/functions/list?project=dutch-bros-site-selector  
2. Open **runScrapeNow** (and optionally **scheduledScrapeAndQualify**).  
3. Click **Edit** (pencil) → **Runtime, build, connections and security** → **Runtime environment variables**.  
4. Add:

| Name | Value |
|------|--------|
| `GOOGLE_GEOCODING_API_KEY` | Your API key (same as **API key 1** or the key you use for Geocoding) |
| `GEMINI_API_KEY` | Your API key for Gemini (same as **API key 1** if it has no referrer restriction) |

Use **API key 1** (no application restrictions) for both, so the server can call Geocoding and Gemini.

5. Save and redeploy the function if prompted.

---

## 4. Verify

- **App:** Open https://dutch-bros-site-selector.web.app — map, list, and filters should work; no sign-in.  
- **Backend:** After enabling APIs and setting env vars, trigger a run (e.g. call `runScrapeNow` or wait for the daily schedule), then check Firestore `aiQualifiedSites` and the “Last scraped” line on the app.

---

## Quick links

- **Firebase Console:** https://console.firebase.google.com/project/dutch-bros-site-selector/overview  
- **Hosting URL:** https://dutch-bros-site-selector.web.app  
- **Manual scrape (HTTP):** `POST` or `GET` https://us-central1-dutch-bros-site-selector.cloudfunctions.net/runScrapeNow (optional: `?key=YOUR_SCRAPE_SECRET` if you set `SCRAPE_SECRET`)
