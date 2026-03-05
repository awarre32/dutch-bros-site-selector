/**
 * AI second opinion for partial listing data: should this listing be shown for human review?
 * Uses Gemini (GEMINI_API_KEY) or OpenAI (OPENAI_API_KEY). Returns GO, CONDITIONAL, or NO-GO.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPartialSummary(extracted) {
  if (!extracted || typeof extracted !== 'object') return 'No data.';
  const lines = [];
  for (const [key, val] of Object.entries(extracted)) {
    if (val != null && val !== '') lines.push(`${key}: ${val}`);
  }
  return lines.length ? lines.join('\n') : 'No data.';
}

const PROMPT_PREFIX = `You are evaluating partial Dutch Bros drive-thru site data from a listing. Many fields may be missing (null). Based ONLY on the provided fields, should this listing be shown for human review? Missing data must NOT disqualify. Consider only what is present.

Dutch Bros typically wants: 0.50+ ac, 25K+ VPD, hard corner/outparcel, 2+ access, drive-thru permitted, good demographics and co-tenancy, land <$700K in SE, 6.5%+ YOC target.

Answer with exactly one word: GO, CONDITIONAL, or NO-GO. No other text.

Partial extracted data:
`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 64 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text);
  const text = textPart?.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function callOpenAI(prompt) {
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
      temperature: 0.2,
      max_tokens: 64,
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

function parseVerdict(text) {
  const upper = (text || '').toUpperCase().trim();
  if (upper.includes('NO-GO') || upper.includes('NO GO')) return 'NO-GO';
  if (upper.includes('CONDITIONAL')) return 'CONDITIONAL';
  if (upper.includes('GO')) return 'GO';
  return null;
}

/**
 * Ask the LLM whether a listing with partial data should be shown for human review.
 * @param {Object} extracted - Normalized extracted object (from extractListing).
 * @param {Object} [criteriaResult] - Optional criteria result (sectionAPresent, etc.) for context.
 * @returns {Promise<{ recommendedVerdict: 'GO'|'CONDITIONAL'|'NO-GO' }>}
 */
async function recommendPartialListing(extracted, criteriaResult) {
  const summary = buildPartialSummary(extracted);
  const prompt = PROMPT_PREFIX + summary;

  const content = GEMINI_API_KEY
    ? await callGemini(prompt)
    : OPENAI_API_KEY
      ? await callOpenAI(prompt)
      : (() => { throw new Error('Set GEMINI_API_KEY or OPENAI_API_KEY'); })();

  const recommendedVerdict = parseVerdict(content);
  if (!recommendedVerdict) {
    throw new Error(`Could not parse GO/CONDITIONAL/NO-GO from: ${content.slice(0, 100)}`);
  }
  return { recommendedVerdict };
}

module.exports = { recommendPartialListing, buildPartialSummary, parseVerdict };
