# Google APIs to Enable for This App

In **API Library** (or [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library?project=dutch-bros-site-selector)), search for each name below and click **Enable** for project **dutch-bros-site-selector**.

---

## Required (enable these)

| Search term | API name | Why |
|-------------|----------|-----|
| **Maps JavaScript** | Maps JavaScript API | The app uses Google Maps as the base map (markers, circles, zoom, layers). |
| **Places** | Places API | Powers address/place search (Autocomplete) in the map panel. |
| **Geocoding** | Geocoding API | Converts listing addresses to lat/lng (Cloud Function + optional client use). |

- Maps JavaScript: https://console.cloud.google.com/apis/library/maps-backend.googleapis.com?project=dutch-bros-site-selector  
- Places: https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=dutch-bros-site-selector  
- Geocoding: https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector

---

## Recommended (better place and AI features)

| Search term | API name | Why |
|-------------|----------|-----|
| **Places** | Places API (New) or Places API | Place details, address validation, optional demographics/context near a pin. |
| **Vertex AI** or **Generative Language** | Vertex AI API **or** Generative Language API | Use Gemini from Google Cloud. Generative Language = Gemini via AI Studio key; Vertex AI = Gemini in your project with no extra key. |

- Places: https://console.cloud.google.com/apis/library/places-backend.googleapis.com?project=dutch-bros-site-selector  
- Vertex AI: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=dutch-bros-site-selector  
- Generative Language (Gemini): https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=dutch-bros-site-selector  

---

## Optional (only if you add these features)

| Search term | API name | Why |
|-------------|----------|-----|
| **Directions** | Directions API | In-app routes; app links to Google Maps for Get directions. |
| **Cloud Storage** | Cloud Storage API | Only if you store raw scraped HTML or large files in a bucket. |

---

## Do **not** enable for this app

You don’t need: Maps SDK for Android/iOS, Dialogflow, Vision, Speech-to-Text, Translation, Drive, Calendar, Gmail, Sheets, YouTube, Blogger, People, Contacts, AdSense, Play Store, Fitness, Analytics, Custom Search, PageSpeed, Web Fonts, Compute Engine, Cloud DNS, Bigtable, etc. None of these are used by the Dutch Bros site selection pipeline.

---

## After enabling

1. **Credentials:** Create an **API key** (or use an existing one) at [Credentials](https://console.cloud.google.com/apis/credentials?project=dutch-bros-site-selector).  
2. **Restrict the key:** Restrict it to only the APIs you enabled (e.g. Geocoding, Places, Generative Language or Vertex as needed).  
3. **Use in the app:** Set `GOOGLE_GEOCODING_API_KEY` (and any other keys) in your Cloud Function’s environment variables or in `functions/.env` for local runs.

**Minimum to run:** Enable **Geocoding API** and use that key as `GOOGLE_GEOCODING_API_KEY`. Enable **Places** and **Vertex AI** (or **Generative Language**) if you want better place data and Gemini in the same project.