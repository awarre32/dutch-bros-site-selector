require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function main() {
  const prompt = 'Return valid JSON only: {"siteAreaAcres": 0.76, "vpd": 31000, "address": "Greensboro, NC"}';

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      }),
    }
  );

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];

  console.log('Parts:', parts.length);
  parts.forEach((p, i) => {
    console.log(`Part ${i}: thought=${!!p.thought}, length=${p.text?.length}`);
  });

  const textPart = parts.find((p) => p.text && !p.thought) || parts.find((p) => p.text);
  const content = textPart?.text?.trim();

  console.log('\nRaw content:');
  console.log(JSON.stringify(content));

  console.log('\nCharacter analysis (first 20):');
  for (let i = 0; i < Math.min(20, content.length); i++) {
    console.log(`  [${i}] code=${content.charCodeAt(i)} char=${JSON.stringify(content[i])}`);
  }

  // Test regex
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  console.log('\nRegex match:', jsonMatch ? 'YES, length=' + jsonMatch[0].length : 'NO');

  if (jsonMatch) {
    console.log('Matched JSON:', jsonMatch[0]);
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed:', parsed);
  }
}

main().catch(console.error);
