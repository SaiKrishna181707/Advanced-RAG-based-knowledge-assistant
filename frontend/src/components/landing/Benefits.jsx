import { Section, SectionIntro } from './Section'
import { Link2, ShieldCheck, Database, SearchCode } from 'lucide-react'

const BENEFITS = [
  {
    icon: Database,
    title: 'Grounded answers',
    body: 'Answers are written from retrieved passages only. When your documents do not contain the answer, ALBATROSS says so instead of improvising.',
  },
  {
    icon: Link2,
    title: 'Citations you can open',
    body: 'Every claim names its document and page, and opens to the exact passage with its relevance score.',
  },
  {
    icon: SearchCode,
    title: 'Hybrid retrieval',
    body: 'Semantic similarity fused with BM25 keyword matching, so exact terms and paraphrases both find their passage.',
  },
  {
    icon: ShieldCheck,
    title: 'Isolated by default',
    body: 'Ownership is enforced in the database on every query. Another account\u2019s document or conversation resolves to nothing for you.',
  },
]

export default function Benefits() {
  return (
    <Section id="product">
      <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="flex flex-col justify-center">
          <SectionIntro
            eyebrow="Why ALBATROSS"
            title="The citation is the product."
            lede="A confident sentence is worth little if you cannot check it. Every answer points back to the exact page it came from."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon
            return (
              <div 
                key={benefit.title} 
                className="group relative overflow-hidden rounded-3xl border border-line/40 bg-surface p-8 shadow-sm transition-all hover:border-line hover:shadow-md"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-raised text-ink transition-transform group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-accent">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {benefit.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
