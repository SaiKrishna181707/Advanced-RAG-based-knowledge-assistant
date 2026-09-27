import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from './Section'

/**
 * Closing call to action.
 *
 * A band, not a box: the hero already carries the primary button, so this only
 * has to close the page without repeating the whole pitch.
 */
export default function FinalCta() {
  return (
    <Section divider aria-labelledby="final-cta-title" className="py-14 sm:py-20">
      <div className="max-w-xl">
        <h2 id="final-cta-title" className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Ask your documents something.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Upload a document set and ask it a question. The answer comes back grounded, with the
          sources attached.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
            Get started
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
            See how it works
          </a>
        </div>
      </div>
    </Section>
  )
}