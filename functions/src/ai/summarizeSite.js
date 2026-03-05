/**
 * AI site summary: generates a 2-3 sentence human-readable explanation of
 * why a scraped listing is worth reviewing for Dutch Bros site selection.
 * Reuses the same Gemini/OpenAI call pattern from extractListing.
 */

const SUMMARY_PROMPT = `You are a commercial real estate analyst evaluating a site for a Dutch Bros drive-thru coffee shop in NC/SC.

Dutch Bros needs: 0.50+ acres, 25K+ VPD, hard corner or outparcel, 2+ access points, drive-thru zoning, strong co-tenancy, land under $700K in the Southeast.

Given the extracted site data below, write a concise 2-3 sentence summary explaining:
1. What makes this site potentially suitable (or not) for Dutch Bros
2. Key strengths (size, traffic, anchors, price, position)
3. What data is missing that a broker should verify

Be specific and direct. Reference actual numbers from the data. Do NOT use bullet points — write flowing sentences. If very little data is available, say so and focus on what IS known.

Extracted site data:
`;

function buildSummaryInput(extracted, criteriaResult, title, address) {
  const lines = [];
  if (title) lines.push(`Listing: ${title}`);
  if (address) lines.push(`Address: ${address}`);
  if (extracted) {
    for (const [key, val] of Object.entries(extracted)) {
      if (val != null && val !== '' && key !== 'hardCosts' && key !== 'softCostPct' &&
          key !== 'rentEscalationPct5yr' && key !== 'exitCapRate' && key !== 'leaseTermYrs' &&
          key !== 'ltvPct' && key !== 'interestRatePct' && key !== 'amortizationYrs') {
        lines.push(`${key}: ${val}`);
      }
    }
  }
  if (criteriaResult) {
    if (criteriaResult.sectionAPass != null) lines.push(`Section A: ${criteriaResult.sectionAPass}/${criteriaResult.sectionAPresent || 8} site criteria pass`);
    if (criteriaResult.sectionBTotal != null) lines.push(`Section B market score: ${criteriaResult.sectionBTotal}/40`);
    if (criteriaResult.yoc != null && criteriaResult.yoc > 0) lines.push(`Yield on Cost: ${criteriaResult.yoc.toFixed(1)}%`);
    if (criteriaResult.verdict) lines.push(`Screener verdict: ${criteriaResult.verdict}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'Minimal data available.';
}

async function callAI(prompt) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text);
    return textPart?.text?.trim() || null;
  }

  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 256 }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  return null;
}

async function summarizeSite({ extracted, criteriaResult, title, address }) {
  const input = buildSummaryInput(extracted, criteriaResult, title, address);
  const prompt = SUMMARY_PROMPT + input;
  try {
    const summary = await callAI(prompt);
    return summary ? summary.slice(0, 500) : null;
  } catch (e) {
    console.warn('AI summary generation failed:', e.message);
    return null;
  }
}

module.exports = { summarizeSite, buildSummaryInput };
