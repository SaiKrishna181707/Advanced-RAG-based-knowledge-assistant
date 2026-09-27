/**
 * Four product benefits, stated once each.
 *
 * This replaces the previous wall of capability cards. Anything that is better
 * shown than described is shown in the preview above instead.
 */
import { FileCheck2, Layers, Quote, ShieldCheck } from 'lucide-react'
import { Section, SectionIntro } from './Section'

const BENEFITS = [
  {
    icon: FileCheck2,
    title: 'Grounded answers',
    body: 'Answers are written from retrieved passages only. When your documents do not contain the answer, ALBATROSS says so instead of improvising.',
  },
  {
    icon: Quote,
    title: 'Citations you can open',
    body: 'Every claim carries a numbered citation naming the document and page. Open it to read the exact passage and its relevance score.',
  },
  {
    icon: Layers,
    title: 'Hybrid retrieval',
    body: 'Semantic similarity fused with BM25 keyword matching, so exact terms and paraphrases both find their passage.',
  },
  {
    icon: ShieldCheck,
    title: 'Isolated by default',
    body: 'Ownership is enforced in the database on every query. Another account’s document or conversation resolves to nothing for you.',
  },
]

export default function Benefits() {
  return (
    <Section id="product" divider>
      <SectionIntro
        eyebrow="Why ALBATROSS"
        title="The citation is the product."
        lede="A confident sentence is worth little if you cannot check it. Every answer points back to the page it came from."
      />

      <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((benefit) => (
          <div key={benefit.title} className="border-t border-line pt-5">
            <benefit.icon aria-hidden="true" className="h-4 w-4 text-accent" />
            <h3 className="mt-3 text-sm font-semibold text-ink">{benefit.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{benefit.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
