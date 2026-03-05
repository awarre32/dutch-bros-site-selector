# APIs to Run This App at Its Best

All APIs below, with direct links and the env vars your code expects. Set them in **Cloud Console** (Functions → your function → Environment variables) and in **`functions/.env`** for local runs.

---

## Required (pipeline won’t run without these)

### 1. AI extraction (listing text → structured data)

**Pick one.** The app currently uses **OpenAI**; you can add **Gemini** and switch or support both.

| Provider | Env var | Get key / enable |
|----------|---------|-------------------|
| **OpenAI** (current) | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| **Google Gemini** | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| **Google Vertex AI (Gemini)** | (uses service account in same project) | https://console.cloud.google.com/vertex-ai?project=dutch-bros-site-selector — Enable Vertex AI API, then use Application Default Credentials |

- OpenAI: Create key → paste as `OPENAI_API_KEY`.
- Gemini (AI Studio): Create API key → paste as `GEMINI_API_KEY` (code can be updated to use it).
- Vertex: No key; enable API and ensure the Cloud Function’s service account has Vertex AI access.

---

## Strongly recommended (better maps and security)

### 2. Geocoding (address → lat/lng for map pins)

| Provider | Env var | Get key / enable |
|----------|---------|-------------------|
| **Google Geocoding** (current) | `GOOGLE_GEOCODING_API_KEY` | Enable: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector — Then create key: https://console.cloud.google.com/apis/credentials?project=dutch-bros-site-selector |

Restrict the key to **Geocoding API** and (optional) to your hosting domain.

### 3. Protect manual scrape endpoint

| What | Env var | Get / set |
|------|---------|-----------|
| **Scrape secret** (any string you choose) | `SCRAPE_SECRET` | No signup. Set in Cloud Console env vars (e.g. a long random string). Call manual scrape with `?key=YOUR_SECRET` or in POST body. |

---

## Optional but valuable (better data and reliability)

### 4. Scraping (fewer blocks, more reliable listing fetch)

LoopNet/Crexi are scraped over HTTP. To reduce blocks and improve success rate:

| Provider | Env var | Get key |
|----------|---------|---------|
| **ScraperAPI** | `SCRAPER_API_KEY` | https://www.scraperapi.com — sign up, get API key (code can be updated to proxy requests through it). |
| **Firecrawl** | `FIRECRAWL_API_KEY` | https://firecrawl.dev — scrape/LLM pipelines (alternative if you later move to their stack). |

Add the key and wire the scraper to use the proxy when the env var is set.

### 5. Demographics (Section B: pop density, income, growth)

Makes Section B scores more accurate when listing text doesn’t include demographics:

| Provider | Env var | Get key / docs |
|----------|---------|-----------------|
| **Census Bureau** | (no key for basic use) | https://www.census.gov/data/developers/data-sets.html — e.g. ACS for income, population. |
| **Google Maps Platform – Places / optional data** | Same Google API key (with Places enabled) | https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=dutch-bros-site-selector — if you want place-based context. |

Demographics would be a separate small module (e.g. “enrich by lat/lng”) and are optional.

### 6. Traffic / VPD (official counts for Section A)

Your suggestions tab mentions NCDOT/SCDOT. If they expose APIs:

| Source | Notes |
|--------|--------|
| **NCDOT** | https://connect.ncdot.gov/resources/State-Mapping — check their developer/data pages for AADT or traffic-count APIs. |
| **SCDOT** | Search “SCDOT traffic count API” or their data portal for similar. |

If available, use them to validate or fill `vpd` in the extraction/criteria.

### 7. Firebase / Google Cloud (already in use)

No extra “API key” beyond what you already use:

- **Firebase** (Auth, Firestore, Hosting, Functions): already configured.
- **Cloud Scheduler**: triggers the daily function (created with the function).
- **Secret Manager** (optional): store keys as secrets instead of env vars — https://console.cloud.google.com/security/secret-manager?project=dutch-bros-site-selector .

---

## Summary table (env vars and links)

| Purpose | Env var | Link to get it |
|---------|---------|-----------------|
| AI extraction | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| AI extraction (alt) | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| Geocoding | `GOOGLE_GEOCODING_API_KEY` | Enable Geocoding → https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector — Create key → https://console.cloud.google.com/apis/credentials?project=dutch-bros-site-selector |
| Manual scrape auth | `SCRAPE_SECRET` | You choose a string; set in Cloud Console. |
| Scraping proxy (optional) | `SCRAPER_API_KEY` | https://www.scraperapi.com |

---

## Where to set env vars

- **Local:** `functions/.env` (copy from `functions/.env.example`).
- **Production:** https://console.cloud.google.com/functions/list?project=dutch-bros-site-selector → open the function → Edit → **Environment variables** (or **Secrets** if using Secret Manager).

Using at least **one AI key** + **Google Geocoding** + **SCRAPE_SECRET** will make the app run as intended; the rest make it better and more robust.
