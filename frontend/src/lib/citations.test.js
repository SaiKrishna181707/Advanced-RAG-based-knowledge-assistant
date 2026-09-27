import { describe, expect, it } from 'vitest'
import { linkifyCitations, normalizeCitations } from './citations'

describe('normalizeCitations', () => {
  it('rewrites the full-width markers some models emit', () => {
    // gpt-oss renders [1] as \u30101\u3011; both must resolve to the same source.
    expect(normalizeCitations('Spend was 12,480 USD\u30101\u3011.')).toBe('Spend was 12,480 USD[1].')
    expect(normalizeCitations('See \u30162\u3017 and \u30103\u3011.')).toBe('See [2] and [3].')
  })

  it('leaves plain markers and ordinary text untouched', () => {
    expect(normalizeCitations('Already fine [1]. No markers here.')).toBe(
      'Already fine [1]. No markers here.',
    )
    expect(normalizeCitations('')).toBe('')
    expect(normalizeCitations(undefined)).toBe('')
  })
})

describe('linkifyCitations', () => {
  it('turns a marker into an in-page link', () => {
    expect(linkifyCitations('Value is 12,480 [1].')).toBe('Value is 12,480 [1](#cite-1).')
  })

  it('handles full-width markers too, so the click target still works', () => {
    expect(linkifyCitations('Value is 12,480 \u30101\u3011.')).toBe(
      'Value is 12,480 [1](#cite-1).',
    )
  })

  it('does not touch markers inside fenced or inline code', () => {
    const input = 'Use the array index `items[1]` here.\n\n```js\nconst a = b[2]\n```\n'
    expect(linkifyCitations(input)).toBe(input)
  })

  it('ignores markdown links that already have a target', () => {
    const input = 'See [1](https://example.com/page).'
    expect(linkifyCitations(input)).toBe(input)
  })
})
