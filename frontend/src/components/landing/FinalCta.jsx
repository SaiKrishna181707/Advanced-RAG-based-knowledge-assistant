import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, FileText } from 'lucide-react'
import { Section } from './Section'
import clsx from 'clsx'

export default function FinalCta() {
  const [typedText, setTypedText] = useState('')
  const [showResult, setShowResult] = useState(false)
  
  const targetText = "What were the Q3 results?"

  // Simple typing effect for the demo
  useEffect(() => {
    let timeout
    if (typedText.length < targetText.length) {
      timeout = setTimeout(() => {
        setTypedText(targetText.slice(0, typedText.length + 1))
      }, 70)
    } else if (!showResult) {
      timeout = setTimeout(() => {
        setShowResult(true)
      }, 500)
    }
    
    // Reset loop
    if (showResult) {
      timeout = setTimeout(() => {
        setTypedText('')
        setShowResult(false)
      }, 4000)
    }
    
    return () => clearTimeout(timeout)
  }, [typedText, showResult])

  return (
    <Section aria-labelledby="final-cta-title" className="pb-32">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 shadow-2xl sm:px-16 sm:py-20">
        
        {/* Glow */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 70% 50%, rgba(var(--accent) / 1) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2
              id="final-cta-title"
              className="text-3xl font-bold tracking-tight text-canvas sm:text-5xl"
            >
              Stop searching.<br />Start finding.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-canvas/70">
              Upload your documents and let ALBATROSS synthesize the answers you need, perfectly cited and instantly verifiable.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-accent/90"
              >
                Get started
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          {/* Dynamic Interactive Mini-Preview */}
          <div className="relative mx-auto w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-white/10">
            <div className="flex items-center gap-3 rounded-full bg-raised px-4 py-3 ring-1 ring-line/50">
              <Search className="h-5 w-5 text-accent" />
              <div className="flex-1 text-sm font-medium text-ink">
                {typedText}
                <span className={clsx("inline-block h-4 w-[2px] bg-accent ml-0.5 align-middle", typedText.length === targetText.length && !showResult && "animate-pulse")} />
              </div>
            </div>
            
            <div className={clsx(
              "mt-6 transition-all duration-700",
              showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
              <p className="text-sm leading-relaxed text-ink">
                Based on the <span className="rounded bg-accent/20 px-1 font-medium text-accent-ink">Q3_Earnings_Report.pdf</span>, revenue increased by 14% year-over-year to $4.2M, driven primarily by enterprise software sales.
              </p>
              
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-raised/50 p-3 ring-1 ring-line/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface shadow-sm">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">Q3_Earnings_Report.pdf</p>
                  <p className="text-xs text-muted">Page 12 • 98% relevant</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </Section>
  )
}