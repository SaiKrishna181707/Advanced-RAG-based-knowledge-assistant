import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import ProductPreview from './ProductPreview'

/**
 * Landing hero — Minimalist, high-contrast SaaS hero.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-canvas pt-32 pb-16 sm:pt-40 sm:pb-24">
      {/* Subtle top glow instead of jarring background gradients */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px] w-full"
        style={{
          background: 'radial-gradient(50% 50% at 50% 0%, rgba(var(--accent) / 0.15) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-[90rem] px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted shadow-sm">
            Albatross AI Assistant
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Your knowledge,
            <br />
            <span className="text-muted">actually searchable.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Upload your documents, ask questions in plain language, and get answers grounded entirely in the sources you already trust.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-canvas shadow-md transition-transform hover:scale-105"
            >
              Start building for free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-raised"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-xs text-muted/70">
            No credit card required. Free plan includes 25 documents.
          </p>
        </div>

        {/* Premium glowing wrapper for the Product Preview */}
        <motion.div 
          id="preview" 
          className="relative mt-20 scroll-mt-24 sm:mt-24"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <div className="absolute -inset-1.5 rounded-[1.25rem] bg-gradient-to-br from-accent/30 via-transparent to-accent-ink/20 opacity-50 blur-xl" aria-hidden="true" />
          <div className="relative rounded-xl bg-canvas p-1 sm:p-2 border border-white/5 shadow-2xl">
            <ProductPreview />
          </div>
        </motion.div>
      </div>
    </section>
  )
}