/**
 * Landing hero.
 *
 * Deliberately short: an eyebrow, the positioning line, one sentence of
 * support, two calls to action and the product preview. The technical claims
 * live in the sections below rather than being stacked under the headline.
 *
 * Entrance is staggered with framer-motion on mount only (not scroll-linked,
 * since this is the very top of the page and is visible immediately).
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import ProductPreview from './ProductPreview'
import LogoCarousel from './LogoCarousel'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  return (
    <section className="relative">
      <div
        className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-72"
        aria-hidden="true"
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20"
      >
        <div className="max-w-3xl">
          <motion.p
            variants={item}
            className="text-2xs font-semibold uppercase tracking-[0.2em] text-accent"
          >
            Private knowledge, made searchable
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-4 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.5rem] lg:text-[4rem]"
          >
            Your knowledge.
            <br />
            <span className="text-muted">Actually searchable.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Upload your documents, ask questions in plain language, and get answers grounded in the
            sources you already trust.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link to="/signup" className="btn-primary group px-5 py-2.5 text-sm">
              Get started
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              See how it works
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-4 text-xs text-muted">
            Free plan · 25 documents · 200 questions a month · No card required
          </motion.p>
        </div>

        <motion.div variants={item} id="preview" className="mt-12 scroll-mt-24 sm:mt-16">
          <ProductPreview />
        </motion.div>
      </motion.div>

      <div className="mt-14 sm:mt-20">
        <LogoCarousel />
      </div>
    </section>
  )
}
