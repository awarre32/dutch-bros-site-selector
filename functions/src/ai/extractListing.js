/**
 * AI extraction: raw listing text -> structured object matching Dutch Bros screener inputs.
 * Uses Gemini (GEMINI_API_KEY) or OpenAI (OPENAI_API_KEY). Missing fields become null.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DUTCH_BROS_REQUIREMENTS = `
Dutch Bros site requirements (for context): 0.50-0.75 ac min site area, 25K+ VPD, hard corner or outparcel, 2+ access points, signalized intersection, <$700K land (SE), 6.5%+ YOC target.
Section A: Site Area (acres) >= 0.50, Drive-Thru Stack (cars) >= 16, VPD >= 25000, Frontage Excellent or Good, Access points >= 2, Hard Corner or Outparcel, Drive-Thru permitted or conditional, Utilities on site (all or partial).
Section B: 1mi pop density (per sq mi), 3mi median HH income ($), 5yr pop growth (%), daytime workers 3mi, commuter corridor (1-5), co-tenancy (1-5), competitive coffee density 3mi (1-5), nearest Dutch Bros proximity (miles).
Section C: Land price ($), hard costs, soft %, annual rent, escalation %, exit cap %, term yrs, LTV %, rate %, amort yrs.
`;

const EXTRACTION_PROMPT = `You are extracting structured site data from a commercial real estate listing for a Dutch Bros drive-thru site screener in NC/SC.

${DUTCH_BROS_REQUIREMENTS}

Extract only what is clearly stated or strongly implied in the listing. Use null for any field not mentioned. For dropdown-style fields use the numeric or canonical value below.

Return valid JSON only, no markdown or explanation, with exactly these keys (use null when unknown):
- siteAreaAcres (number)
- driveThruStack (number, cars)
- vpd (number, vehicles per day)
- frontageVisibility (string: "Excellent" | "Good" | "Poor" or null)
- accessPoints (number)
- cornerOutparcel (string: "Hard Corner" | "Outparcel" | "Inline" or null)
- driveThruZoning (string: "Permitted by Right" | "Conditional/SUP" | "Not Permitted" or null)
- utilitiesOnSite (string: "All Available" | "Partial" | "None" or null)
- popDensity1mi (number, per sq mi)
- medianHHIncome3mi (number, $)
- popGrowth5yr (number, %)
- daytimeWorkers3mi (number)
- commuterCorridor (number 1-5: 5=major commuter, 1=low)
- cotenancy (number 1-5: 5=national grocer+big box, 1=sparse)
- competitiveCoffeeDensity (number 1-5: 5=0-1 competitors, 1=9+)
- nearestDutchBrosProximityMi (number, miles)
- landPrice (number, $)
- hardCosts (number, default 934500 if unknown)
- softCostPct (number, default 11)
- annualRent (number, $)
- rentEscalationPct5yr (number, default 10)
- exitCapRate (number, default 5.25)
- leaseTermYrs (number, default 15)
- ltvPct (number, default 65)
- interestRatePct (number, default 6.5)
- amortizationYrs (number, default 25)
- address (string, full or partial)
- city (string)
- state (string, NC or SC)
- market (string: clt|rdu|triad|chs|gsp|col|coast|wnc|fay if inferable, else null)

Listing to parse:
---
TITLE: {{title}}
URL: {{url}}
DESCRIPTION / DETAILS:
{{snippet}}
---`;

function buildPrompt(raw) {
  const title = (raw.title || '').slice(0, 300);
  const url = (raw.url || '').slice(0, 500);
  const snippet = (raw.snippet || raw.raw || raw.description || '').slice(0, 4000);
  return EXTRACTION_PROMPT
    .replace('{{title}}', title)
    .replace('{{url}}', url)
    .replace('{{snippet}}', snippet);
}

/**
 * Normalize AI output keys to match criteria module (camelCase and alternate names).
 */
function normalizeExtracted(obj) {
  if (!obj || typeof obj !== 'object') return {};
  return {
    siteAreaAcres: obj.siteAreaAcres ?? obj.site_area_acres ?? null,
    driveThruStack: obj.driveThruStack ?? obj.drive_thru_stack ?? null,
    vpd: obj.vpd ?? null,
    frontageVisibility: obj.frontageVisibility ?? obj.frontage_visibility ?? null,
    accessPoints: obj.accessPoints ?? obj.access_points ?? null,
    cornerOutparcel: obj.cornerOutparcel ?? obj.corner_outparcel ?? null,
    driveThruZoning: obj.driveThruZoning ?? obj.drive_thru_zoning ?? null,
    utilitiesOnSite: obj.utilitiesOnSite ?? obj.utilities_on_site ?? null,
    popDensity1mi: obj.popDensity1mi ?? obj.pop_density_1mi ?? null,
    medianHHIncome3mi: obj.medianHHIncome3mi ?? obj.median_hh_income_3mi ?? null,
    popGrowth5yr: obj.popGrowth5yr ?? obj.pop_growth_5yr ?? null,
    daytimeWorkers3mi: obj.daytimeWorkers3mi ?? obj.daytime_workers_3mi ?? null,
    commuterCorridor: obj.commuterCorridor ?? obj.commuter_corridor ?? null,
    cotenancy: obj.cotenancy ?? null,
    competitiveCoffeeDensity: obj.competitiveCoffeeDensity ?? obj.competitive_coffee_density ?? null,
    nearestDutchBrosProximityMi: obj.nearestDutchBrosProximityMi ?? obj.nearest_dutch_bros_proximity_mi ?? null,
    landPrice: obj.landPrice ?? obj.land_price ?? null,
    hardCosts: obj.hardCosts ?? obj.hard_costs ?? 934500,
    softCostPct: obj.softCostPct ?? obj.soft_cost_pct ?? 11,
    annualRent: obj.annualRent ?? obj.annual_rent ?? null,
    rentEscalationPct5yr: obj.rentEscalationPct5yr ?? obj.rent_escalation_pct_5yr ?? 10,
    exitCapRate: obj.exitCapRate ?? obj.exit_cap_rate ?? 5.25,
    leaseTermYrs: obj.leaseTermYrs ?? obj.lease_term_yrs ?? 15,
    ltvPct: obj.ltvPct ?? obj.ltv_pct ?? 65,
    interestRatePct: obj.interestRatePct ?? obj.interest_rate_pct ?? 6.5,
    amortizationYrs: obj.amortizationYrs ?? obj.amortization_yrs ?? 25,
    address: obj.address ?? (obj.city && obj.state ? `${obj.city}, ${obj.state}` : null),
    city: obj.city ?? null,
    state: obj.state ?? null,
    market: obj.market ?? null,
  };
}

/**
 * Call Gemini (Generative Language API) to extract structured data.
 */
async function extractWithGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  // Gemini 2.5+ may include "thought" parts — find the text output part
  const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text);
  const text = textPart?.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

/**
 * Call OpenAI to extract structured data.
 */
async function extractWithOpenAI(prompt) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

/**
 * Extract structured data from a single listing. Uses Gemini if GEMINI_API_KEY is set, else OpenAI.
 * @param {{ url: string, title?: string, snippet?: string, raw?: string }} rawListing
 * @returns {Promise<Object>} Normalized extracted object (keys match dutchBrosCriteria input).
 */
async function extractListing(rawListing) {
  const prompt = buildPrompt(rawListing);
  const content = GEMINI_API_KEY
    ? await extractWithGemini(prompt)
    : OPENAI_API_KEY
      ? await extractWithOpenAI(prompt)
      : (() => { throw new Error('Set GEMINI_API_KEY or OPENAI_API_KEY'); })();

  // Extract JSON object from AI response (handles code fences, thinking, truncation)
  let jsonStr;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  } else {
    // Response may be truncated (no closing }) — attempt recovery
    const braceIdx = content.indexOf('{');
    if (braceIdx === -1) {
      throw new Error(`No JSON in AI response. Content: ${content.slice(0, 300)}`);
    }
    jsonStr = content.slice(braceIdx);
    // Close any unclosed JSON by finding the last complete key-value pair
    const lastComma = jsonStr.lastIndexOf(',');
    const lastColon = jsonStr.lastIndexOf(':');
    if (lastComma > lastColon) {
      jsonStr = jsonStr.slice(0, lastComma) + '}';
    } else if (lastColon > 0) {
      const afterColon = jsonStr.slice(lastColon + 1).trim();
      if (afterColon.match(/^(null|true|false|\d|"[^"]*")/)) {
        const valEnd = afterColon.match(/^(null|true|false|\d+\.?\d*|"[^"]*")/);
        jsonStr = jsonStr.slice(0, lastColon + 1) + ' ' + valEnd[0] + '}';
      } else {
        jsonStr = jsonStr.slice(0, lastComma > 0 ? lastComma : lastColon) + '}';
      }
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}. Input: ${jsonStr.slice(0, 200)}`);
  }
  return normalizeExtracted(parsed);
}

module.exports = { extractListing, buildPrompt, normalizeExtracted };
