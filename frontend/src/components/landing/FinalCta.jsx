import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from './Section'

export default function FinalCta() {
  return (
    <Section aria-labelledby="final-cta-title" className="pb-32">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-20 text-center shadow-2xl sm:px-16 sm:py-24">
        {/* Subtle mesh/glow effect inside the CTA banner */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(var(--accent) / 1) 0%, transparent 70%)',
          }}
        />
        
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2
            id="final-cta-title"
            className="text-3xl font-bold tracking-tight text-canvas sm:text-5xl"
          >
            Ask your documents something.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-canvas/70">
            Upload a document set and ask it a question. The answer comes back grounded, with the
            sources attached.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-accent/90"
            >
              Get started for free
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full bg-white/10 px-8 py-4 text-sm font-bold text-canvas backdrop-blur-md transition-colors hover:bg-white/20"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}