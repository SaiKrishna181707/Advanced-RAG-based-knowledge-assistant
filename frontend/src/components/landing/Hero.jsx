/**
 * Landing hero.
 *
 * Deliberately short: an eyebrow, the positioning line, one sentence of
 * support, two calls to action and the product preview. The technical claims
 * live in the sections below rather than being stacked under the headline.
 */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductPreview from './ProductPreview'

export default function Hero() {
  return (
    <section className="relative">
      <div
        className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-72"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <div className="max-w-3xl">
          <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-accent">
            Private knowledge, made searchable
          </p>

          <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.5rem] lg:text-[4rem]">
            Your knowledge.
            <br />
            <span className="text-muted">Actually searchable.</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Upload your documents, ask questions in plain language, and get answers grounded in the
            sources you already trust.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
              Get started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              See how it works
            </a>
          </div>

          <p className="mt-4 text-xs text-muted">
            Free plan · 25 documents · 200 questions a month · No card required
          </p>
        </div>

        <div id="preview" className="mt-12 scroll-mt-24 sm:mt-16">
          <ProductPreview />
        </div>
      </div>
    </section>
  )
}
