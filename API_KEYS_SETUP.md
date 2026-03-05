# API keys setup

You can give your API keys and everything will be wired for you.

## What’s needed

| Key | Required | Used for |
|-----|----------|----------|
| **OpenAI API key** | Yes | AI extraction from listing text (Cloud Function) |
| **Google Geocoding API key** | No | Turning addresses into map coordinates (Cloud Function) |
| **Scrape secret** | No | Protects the manual “run scrape now” HTTP endpoint |

## How to give me the keys

Reply with something like:

- “OpenAI key: sk-…”  
- Or: “Here are my keys: OPENAI_API_KEY=sk-…, GOOGLE_GEOCODING_API_KEY=…, SCRAPE_SECRET=…”

I will:

1. Put them in `functions/.env` (this file is gitignored and never committed).
2. Ensure the Cloud Functions use these keys (they already read from `process.env`; locally they’re loaded from `.env` via dotenv).

You never need to commit keys. For **production** (deployed Cloud Functions), set the same variable names in Google Cloud Console under your function’s **Environment variables**.

## After keys are set

- **Local:** From `functions/`, run `npm run build` then `npm run serve` to test.
- **Deploy:** Run `firebase deploy --only functions`. Then in Cloud Console, add the same env vars to the deployed function so the scheduled job and manual scrape use your keys.
