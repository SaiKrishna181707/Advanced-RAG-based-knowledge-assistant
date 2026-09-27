import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from './Section'

export default function FinalCta() {
  return (
    <Section tone="canvas" divider aria-labelledby="final-cta-title">
      <div className="relative overflow-hidden rounded-card border border-line bg-surface px-6 py-14 text-center shadow-card sm:px-12">
        <div className="chart-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-48"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-2xl">
          <h2
            id="final-cta-title"
            className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            Ask your documents something.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Upload a document set and ask it a question. The answer comes back grounded, with the
            sources attached.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
              Get started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              See how it works
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}
