# Enable these two APIs (then re-run test)

Your API keys are wired. Enable these in your Google project so the app can run:

1. **Geocoding API** (for map pins)  
   https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com?project=dutch-bros-site-selector  
   → Click **Enable**

2. **Generative Language API** (for Gemini extraction)  
   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com?project=dutch-bros-site-selector  
   → Click **Enable**

Wait 1–2 minutes, then run the test again:

```bash
cd functions
node scripts/test-apis.js
```

You should see: `Geocoding OK` and `Extraction OK`.
