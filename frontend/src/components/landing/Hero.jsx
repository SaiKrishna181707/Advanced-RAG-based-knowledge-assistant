import { motion } from 'framer-motion'
import { ArrowRight, Command, FileText, Search, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductPreview from './ProductPreview'

const EASE = [0.16, 1, 0.3, 1]

export default function Hero() {
  return (
    <section className="landing-hero relative overflow-hidden">
      <div className="landing-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[34rem]" aria-hidden="true" />
      <div className="landing-hero-grid pointer-events-none absolute inset-x-0 top-0 h-[42rem]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="mx-auto max-w-4xl text-center">
          <div className="landing-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Interface for your private knowledge</div>
          <h1 className="mt-7 text-[3rem] font-semibold leading-[0.98] tracking-[-0.045em] text-ink sm:text-[4.7rem] lg:text-[5.75rem]">Your knowledge.<br /><span className="text-muted">Actually searchable.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">Upload documents, ask questions in plain language, and get grounded answers with citations that lead back to the source.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">Start building<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">See how it works</a>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-2xs text-muted">
            <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" />25 documents free</span>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span className="flex items-center gap-1.5"><Search className="h-3 w-3" />Hybrid retrieval</span>
            <span className="hidden h-1 w-1 rounded-full bg-line sm:block" />
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" />Private by default</span>
          </div>
        </motion.div>
        <motion.div id="preview" className="relative mt-14 scroll-mt-24 sm:mt-18" initial={{ opacity: 0, y: 24, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.12, ease: EASE }}>
          <div className="landing-preview-shadow absolute -inset-5 rounded-[2rem]" aria-hidden="true" />
          <div className="relative"><ProductPreview /></div>
        </motion.div>
        <div className="mx-auto mt-7 flex max-w-xl items-center justify-center gap-2 text-2xs font-mono text-muted/60"><Command className="h-3 w-3" /><span>Ask your knowledge base anything</span></div>
      </div>
    </section>
  )
}