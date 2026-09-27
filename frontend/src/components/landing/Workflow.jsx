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
    title: 'Read and check',
    body: 'The model answers only from what was retrieved, and every claim links back to the exact passage, document and page it came from.',
  },
]

export default function Workflow() {
  return (
    <Section id="how-it-works" tone="surface">
      <SectionIntro
        eyebrow="How it works"
        title="From upload to cited answer."
        lede="Three steps, and nothing about the answer is hidden from you."
      />

      {/* Modern Bento Grid instead of harsh horizontal lines */}
      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div 
            key={step.n} 
            className="group relative rounded-3xl border border-line/40 bg-canvas p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-line hover:shadow-md"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-lg font-bold text-accent transition-colors group-hover:bg-accent group-hover:text-white">
              {step.n}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}