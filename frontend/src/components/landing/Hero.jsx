/**
 * Landing hero.
 *
 * The hero establishes the product in a few seconds, then gets out of the way
 * and lets the real product preview do the explaining.
 */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductPreview from './ProductPreview'

const EASE = [0.16, 1, 0.3, 1]

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-72"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
          className="max-w-3xl"
        >
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5"
          >
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
              Get started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>

            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              See how it works
            </a>

            <p className="text-xs text-muted">
              Free plan &middot; 25 documents &middot; 200 questions a month &middot; No card required
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          id="preview"
          className="mt-12 scroll-mt-24 sm:mt-16"
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
        >
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  )
}
