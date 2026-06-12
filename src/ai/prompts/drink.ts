/**
 * Tool name/description + user prompt for the structure_drink_note call
 * (feature 006). The tool's input_schema is derived from VoiceDrinkDraftSchema
 * in src/ai/schemas/drink.ts — this file owns only the prose. Any change here
 * MUST ship with an updated golden fixture under
 * tests/ai-fixtures/drink-structuring/ (constitution Principle II).
 */

export const DRINK_TOOL_NAME = 'record_drink_log' as const

export const DRINK_TOOL_DESCRIPTION =
  'Record a coffee drink the user described aloud at a café, roaster stand, ' +
  'or event: where they are, what they are drinking, an explicit 1-5 star ' +
  'rating, and how it tasted using a fixed flavour palette. Capture only ' +
  'what was explicitly said; use null (or an empty list) for anything not ' +
  'mentioned. Never guess or infer.'

export function buildDrinkPrompt(transcript: string): string {
  return `A coffee drinker dictated a quick note about a drink they are having. Convert it to a structured drink log using the ${DRINK_TOOL_NAME} tool.

Rules — follow them exactly:
1. Extract ONLY what was explicitly said. Anything not mentioned is null (flavour_tags: empty array). Never guess, infer, or embellish.
2. venue: the place name — a café, roaster stand, or event ("at Sunday's Coffee" → "Sunday's Coffee"). Strip leading "at"/"in". Not the drink.
3. coffee_name: the drink or coffee as spoken ("oat flat white", "the Kenyan filter"). Not the venue.
4. rating: only an explicitly stated value out of five ("four stars", "4 out of 5", "I'd give it a two"). Vague sentiment ("really good", "amazing") is NOT a rating — use null. Half values round down ("four and a half" → 4).
5. flavour_tags: only these palette values — fruity, floral, chocolatey, nutty, bright, heavy. Map unambiguous synonyms (e.g. "berries"/"citrusy" → fruity, "chocolate notes" → chocolatey, "like flowers" → floral, "acidic"/"zingy" → bright, "full-bodied"/"thick" → heavy, "hazelnut"/"almondy" → nutty). Anything outside the palette (e.g. "jammy", "winey") is OMITTED — never force it onto a near-miss tag. Keep the order the flavours were mentioned.

Transcript:
"""
${transcript}
"""`
}
