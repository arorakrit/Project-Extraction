const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

async function callClaude(messages, includeImage = null) {
  const content = includeImage
    ? [
        { type: 'image', source: { type: 'base64', media_type: includeImage.type, data: includeImage.data } },
        { type: 'text', text: messages }
      ]
    : [{ type: 'text', text: messages }]

  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content }] })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API request failed (${res.status})`)
  }

  const data = await res.json()
  let text = data.content[0].text.trim()
  // Strip markdown code fences if present
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  if (fenceMatch) text = fenceMatch[1].trim()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}

export async function extractCoffeeMetadata(imageBase64, imageType) {
  const prompt = `You are a specialty coffee expert and data extraction AI.
Extract every piece of identifiable information from this coffee bag photo and return it as structured JSON.
If a field is not visible, set it to null. Return ONLY valid JSON, no explanation.

{
  "roaster_name": "string",
  "coffee_name": "string",
  "origin_country": "string",
  "origin_region": "string",
  "farm_or_cooperative": "string",
  "variety": "string",
  "process": "string",
  "roast_level": "string",
  "altitude_masl": "string",
  "harvest_season": "string",
  "tasting_notes": ["string"],
  "certifications": ["string"],
  "roast_date": "string",
  "website_or_qr": "string",
  "raw_text_extracted": "string"
}`
  return callClaude(prompt, { data: imageBase64, type: imageType })
}

export async function enrichCoffeeProfile(metadata) {
  const prompt = `You are a specialty coffee researcher. Enrich this coffee metadata with additional context.
Metadata: ${JSON.stringify(metadata)}
Return ONLY valid JSON, no explanation.

{
  "roaster_bio": "string",
  "roaster_location": "string",
  "roaster_website": "string",
  "origin_story": "string",
  "region_flavor_profile": "string",
  "process_explanation": "string",
  "variety_explanation": "string",
  "brewing_recommendations": {
    "best_for": ["string"],
    "grind_suggestion": "string",
    "temperature_c": "string",
    "ratio_suggestion": "string"
  },
  "fun_fact": "string"
}`
  return callClaude(prompt)
}

export async function structureVoiceLog(transcript) {
  const prompt = `You are a coffee journal assistant. Structure this voice note into a clean brew log.
Transcript: "${transcript}"
Return ONLY valid JSON, no explanation. Use null for anything not mentioned.

{
  "brew_method": "string",
  "grind_size": "string",
  "dose_grams": "number",
  "water_grams": "number",
  "water_temp_c": "number",
  "brew_time_seconds": "number",
  "taste_notes": ["string"],
  "aroma_notes": ["string"],
  "body": "string",
  "acidity": "string",
  "finish": "string",
  "overall_rating": "number",
  "would_buy_again": "boolean",
  "personal_notes": "string"
}`
  return callClaude(prompt)
}
