/**
 * Citation marker handling, shared by the chat renderer and the chat store.
 *
 * This lives in `lib` rather than next to the renderer on purpose: the store is
 * part of the entry bundle, and importing a component module from it would drag
 * react-markdown, KaTeX and the syntax highlighter into the first paint.
 */

const CITATION_PATTERN = /\[(\d{1,2})\](?!\()/g

/**
 * Citation markers as the model contract defines them, plus the full-width
 * variants some models emit (【1】 instead of [1]). Both read the same way to a
 * person, so both have to resolve to the same source.
 */
const WIDE_BRACKETS = {
  '\u3010': '[',
  '\u3011': ']',
  '\u3016': '[',
  '\u3017': ']',
  '\uff3b': '[',
  '\uff3d': ']',
}

/** Rewrite full-width citation markers to the plain [n] form. */
export function normalizeCitations(text) {
  return String(text ?? '').replace(
    /[\u3010\u3011\u3016\u3017\uff3b\uff3d]/g,
    (char) => WIDE_BRACKETS[char] ?? char,
  )
}

/** Turn [1] into a markdown link so react-markdown parses it, skipping code spans. */
export function linkifyCitations(markdown) {
  const text = normalizeCitations(markdown)
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g)
  return parts
    .map((part, index) => {
      if (index % 2 === 1) return part
      return part.replace(CITATION_PATTERN, (match, number) => `[${number}](#cite-${number})`)
    })
    .join('')
}
