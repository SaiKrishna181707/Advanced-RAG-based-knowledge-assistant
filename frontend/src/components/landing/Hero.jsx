import { motion } from 'framer-motion'
import { ArrowRight, Command, Database, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductPreview from './ProductPreview'

const EASE = [0.16, 1, 0.3, 1]

const SIGNALS = [
  { icon: Database, label: 'Your documents' },
  { icon: Search, label: 'Hybrid retrieval' },
  { icon: ShieldCheck, label: 'Scoped access' },
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="landing-noise pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="landing-orb landing-orb-one pointer-events-none absolute -top-48 left-[8%] h-[32rem] w-[32rem] rounded-full" aria-hidden="true" />
      <div className="landing-orb landing-orb-two pointer-events-none absolute top-20 right-[-12rem] h-[30rem] w-[30rem] rounded-full" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-2xs font-medium uppercase tracking-[0.18em] text-white/55 backdrop-blur">
            <Sparkles aria-hidden="true" className="h-3 w-3 text-accent" />
            Private knowledge infrastructure
          </div>

          <h1 className="mt-7 text-[3.15rem] font-semibold leading-[0.96] tracking-[-0.045em] text-white sm:text-[4.8rem] lg:text-[6.15rem]">
            Your knowledge.
            <br />
            <span className="text-white/38">Actually searchable.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            ALBATROSS turns your documents into a private knowledge system — searchable in plain
            language, grounded in your sources, and clear about where every answer came from.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_10px_40px_rgba(255,255,255,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_50px_rgba(255,255,255,0.13)]"
            >
              Start for free
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-medium text-white/70 backdrop-blur transition-colors hover:bg-white/[0.07] hover:text-white"
            >
              See how it works
            </a>
          </motion.div>

          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-2xs text-white/35">
            <span>Free plan</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>25 documents</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>200 questions / month</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>No card required</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 38, scale: 0.975 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.18, ease: EASE }}
          className="relative mt-16 sm:mt-20"
        >
          <div className="absolute -inset-6 rounded-[2rem] bg-accent/[0.055] blur-3xl" aria-hidden="true" />
          <div className="relative">
            <ProductPreview />
          </div>
        </motion.div>

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-4">
          {SIGNALS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-2 text-2xs font-medium uppercase tracking-[0.12em] text-white/35">
              <Icon aria-hidden="true" className="h-3.5 w-3.5 text-accent/80" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[45rem] hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/[0.07] bg-black/30 px-3 py-1.5 font-mono text-2xs text-white/25 lg:flex">
          <Command aria-hidden="true" className="h-3 w-3" />
          Search your knowledge, not your tabs
        </div>
      </div>
    </section>
  )
}
