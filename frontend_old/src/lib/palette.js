/**
 * Curated accent colours offered wherever the product lets someone pick one.
 *
 * The first entry is the brand accent and the server-side default; the rest keep
 * to the same low-chroma range so any choice still sits inside the product's
 * palette rather than fighting it.
 */
export const ACCENT_SWATCHES = [
  '#0d7d70',
  '#2563eb',
  '#7c3aed',
  '#c2410c',
  '#be123c',
  '#0f766e',
  '#4d7c0f',
]

export function isAccentSwatch(color) {
  return ACCENT_SWATCHES.includes(String(color || '').toLowerCase())
}