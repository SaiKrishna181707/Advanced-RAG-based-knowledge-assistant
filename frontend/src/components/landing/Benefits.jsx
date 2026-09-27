/**
 * What the product actually guarantees, stated once each.
 *
 * Four short claims, no icons and no cards: the preview above already shows the
 * mechanics, so this section only has to name the properties a reader would
 * otherwise have to take on trust.
 */
import { Section, SectionIntro } from './Section'

const BENEFITS = [
  {
    title: 'Grounded answers',
    body: 'Answers are written from retrieved passages only. When your documents do not contain the answer, ALBATROSS says so instead of improvising.',
  },
  {
    title: 'Citations you can open',
    body: 'Every claim names its document and page, and opens to the exact passage with its relevance score.',
  },
  {
    title: 'Hybrid retrieval',
    body: 'Semantic similarity fused with BM25 keyword matching, so exact terms and paraphrases both find their passage.',
  },
  {
    title: 'Isolated by default',
    body: 'Ownership is enforced in the database on every query. Another account\u2019s document or conversation resolves to nothing for you.',
  },
]

export default function Benefits() {
  return (
    <Section id="product" divider>
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionIntro
          eyebrow="Why ALBATROSS"
          title="The citation is the product."
          lede="A confident sentence is worth little if you cannot check it. Every answer points back to the page it came from."
        />

        <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink">{benefit.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{benefit.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
