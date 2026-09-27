import { Section, SectionIntro } from './Section'

const STEPS = [
  {
    n: '01',
    title: 'Add your documents',
    body: 'PDF, DOCX, Markdown, CSV or plain text. Every file is validated, hashed, and extracted page by page with its source location kept.',
  },
  {
    n: '02',
    title: 'Ask in plain language',
    body: 'Search everything, one collection, or a single document. The retriever blends meaning with keyword matching before the model sees anything.',
  },
  {
    n: '03',
    title: 'Read the answer and check the source',
    body: 'The model answers only from what was retrieved, and every claim links back to the passage, document and page it came from.',
  },
]

export default function Workflow() {
  return (
    <Section id="how-it-works" tone="surface" divider>
      <SectionIntro
        eyebrow="How it works"
        title="From upload to cited answer."
        lede="Three steps, and nothing about the answer is hidden from you."
      />

      <ol className="mt-16 grid gap-10 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="group relative border-t border-line pt-6 transition-all hover:border-accent">
            <span className="font-mono text-xs font-semibold tracking-widest text-accent transition-transform group-hover:translate-x-1 inline-block">
              {step.n}
            </span>
            <h3 className="mt-4 text-base font-semibold tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}