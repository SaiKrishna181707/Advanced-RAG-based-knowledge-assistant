/**
 * The pipeline in three steps.
 *
 * The six-step version explained the architecture; this keeps the same promise
 * in a third of the space and leaves the detail to the README.
 */
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
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionIntro
          eyebrow="How it works"
          title="From upload to cited answer."
          lede="Three steps, and nothing about the answer is hidden from you."
        />

        <ol className="divide-y divide-line border-y border-line">
          {STEPS.map((step) => (
            <li key={step.n} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-5 sm:py-6">
              <span className="font-mono text-2xs font-medium tracking-widest text-accent">
                {step.n}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
