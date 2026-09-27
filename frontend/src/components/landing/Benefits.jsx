/**
 * What the product actually guarantees, stated once each.
 *
 * Four short claims in a dark landing palette.
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
      <div
        style={{
          display: 'grid',
          gap: '40px',
          gridTemplateColumns: 'repeat(1, 1fr)',
        }}
        className="lg:!grid-cols-[0.85fr_1.15fr]"
      >
        <SectionIntro
          eyebrow="Why ALBATROSS"
          title="The citation is the product."
          lede="A confident sentence is worth little if you cannot check it. Every answer points back to the page it came from."
        />

        <div
          style={{
            display: 'grid',
            gap: '28px',
            gridTemplateColumns: 'repeat(1, 1fr)',
          }}
          className="sm:!grid-cols-2"
        >
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '16px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
                {benefit.title}
              </h3>
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '14px',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
