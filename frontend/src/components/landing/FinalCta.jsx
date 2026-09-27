import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from './Section'

export default function FinalCta() {
  return (
    <Section divider aria-labelledby="final-cta-title">
      <div className="max-w-2xl text-center mx-auto py-12">
        <h2
          id="final-cta-title"
          className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
        >
          Ask your documents something.
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Upload a document set and ask it a question. The answer comes back grounded, with the
          sources attached.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-canvas shadow-md transition-transform hover:scale-105"
          >
            Get started
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-raised"
          >
            See how it works
          </a>
        </div>
      </div>
    </Section>
  )
}