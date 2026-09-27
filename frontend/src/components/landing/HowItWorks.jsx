import { Section, SectionIntro } from './Section'

const STEPS = [
  {
    n: '01',
    title: 'Upload',
    body: 'Add PDFs, text, Markdown, DOCX or CSV files. Files are validated, hashed, and stored against your account.',
  },
  {
    n: '02',
    title: 'Understand',
    body: 'ALBATROSS extracts the text page by page, splits it into overlapping chunks, and records the page each chunk came from.',
  },
  {
    n: '03',
    title: 'Ask',
    body: 'Put a question in plain language. Choose whether to search everything, one collection, or a specific set of documents.',
  },
  {
    n: '04',
    title: 'Retrieve',
    body: 'A hybrid retriever combines dense semantic similarity with BM25 keyword matching and fuses the two rankings.',
  },
  {
    n: '05',
    title: 'Answer',
    body: 'The model receives only the retrieved passages and is instructed to answer from them alone, citing each claim.',
  },
  {
    n: '06',
    title: 'Verify',
    body: 'Open any citation to read the exact passage, its document, its page and its retrieval score.',
  },
]

export default function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionIntro
        eyebrow="How it works"
        title="UPLOAD → UNDERSTAND → ASK → RETRIEVE → ANSWER → VERIFY"
        lede="Six steps, each one inspectable. Nothing about the answer is hidden from you."
      />

      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="card relative p-5">
            <span className="font-mono text-2xs font-medium tracking-widest text-accent">
              {step.n}
            </span>
            <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}