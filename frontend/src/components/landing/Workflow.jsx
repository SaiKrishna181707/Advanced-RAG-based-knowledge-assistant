/**
 * The pipeline in three steps — dark landing palette.
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
    <Section id="how-it-works" tone="elevated" divider>
      <SectionIntro
        eyebrow="How it works"
        title="From upload to cited answer."
        lede="Three steps, and nothing about the answer is hidden from you."
      />

      <ol
        style={{
          marginTop: '48px',
          display: 'grid',
          gap: '32px',
        }}
        className="sm:!grid-cols-3"
      >
        {STEPS.map((step) => (
          <li
            key={step.n}
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '20px',
              listStyle: 'none',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.2em',
                color: '#2dd4bf',
              }}
            >
              {step.n}
            </span>
            <h3 style={{ marginTop: '10px', fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              {step.title}
            </h3>
            <p
              style={{
                marginTop: '8px',
                fontSize: '14px',
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}