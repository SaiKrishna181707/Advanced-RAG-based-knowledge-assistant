import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, SectionIntro } from './Section'

const QUESTIONS = [
  {
    q: 'Which file types can I upload?',
    a: 'PDF, TXT, Markdown, DOCX and CSV. These are the formats the backend can extract reliably, so they are the only ones accepted. Anything else is rejected at upload with a clear reason rather than silently failing later.',
  },
  {
    q: 'Where do the answers come from?',
    a: 'Only from passages retrieved out of your own documents. The model is given those passages and instructed to make no factual claim that is not in them. If the answer is not in the retrieved context, it says so.',
  },
  {
    q: 'Can I check a citation?',
    a: 'Yes — that is the point. Every citation names the document and the page. Opening it shows the exact retrieved text and its relevance score, so you can judge the answer against its evidence.',
  },
  {
    q: 'How is my data separated from other accounts?',
    a: 'Ownership is enforced in the server on every query, not in the interface. A document, chunk, conversation or collection id belonging to somebody else resolves to nothing for you, so changing an id in a request gets you no data.',
  },
  {
    q: 'Does it remember what we discussed earlier?',
    a: 'Follow-up questions are interpreted using the earlier turns of the same conversation, bounded to a sensible context window instead of the entire history. You can clear a conversation at any time.',
  },
  {
    q: 'How good is the semantic search?',
    a: 'The default embedding provider is a deterministic lexical model — no model download, small footprint — so similarity is based on shared terms rather than meaning. Hybrid retrieval pairs it with BM25 keyword matching, which covers most of the gap. A semantic sentence-transformer provider can be enabled with one environment variable.',
  },
  {
    q: 'Do I need a card to start?',
    a: 'No. The Free plan gives you 25 documents, 100 MB of storage and 200 questions a month. Billing is not connected yet, so no plan charges you anything today.',
  },
]

export default function Faq() {
  return (
    <Section id="faq" divider>
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionIntro
          eyebrow="FAQ"
          title="Questions worth answering plainly"
          lede="Including the ones where the honest answer is a limitation."
        />

        <div className="divide-y divide-line border-y border-line">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-ink">
                {item.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg leading-none text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-6 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function FinalCta() {
  return (
    <Section tone="surface" divider>
      <div className="relative overflow-hidden rounded-card border border-line bg-canvas px-6 py-14 text-center sm:px-12">
        <div className="chart-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-48" aria-hidden="true" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Navigate your knowledge.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Upload a document set and ask it a question. It takes a few minutes to find out what
            your own files have been hiding.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
              Get Started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              Explore ALBATROSS
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}