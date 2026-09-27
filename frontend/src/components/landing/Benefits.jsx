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

/**
 * Clean grid of benefits using standard Tailwind semantic tokens.
 */
export default function Benefits() {
  return (
    <Section id="product" divider>
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionIntro
          eyebrow="Why ALBATROSS"
          title="The citation is the product."
          lede="A confident sentence is worth little if you cannot check it. Every answer points back to the page it came from."
        />

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="group rounded-2xl border border-transparent p-5 transition-all hover:border-line hover:bg-surface hover:shadow-sm">
              <h3 className="text-base font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
