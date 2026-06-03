/**
 * Water-parts per 1 part coffee, rounded to 1 decimal. null if either side is
 * missing or the dose is non-positive (FR-006, SC-008). Dose/water are
 * authoritative over any directly-spoken ratio.
 */
export function deriveRatio(
  dose_g: number | null,
  water_g: number | null,
): number | null {
  if (dose_g === null || water_g === null) return null
  if (dose_g <= 0) return null
  return Math.round((water_g / dose_g) * 10) / 10
}
