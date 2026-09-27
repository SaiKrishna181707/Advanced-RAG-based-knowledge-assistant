import { Link } from 'react-router-dom'
import { ArrowRight, FileCheck2, Layers, Search, ShieldCheck } from 'lucide-react'
import ProductPreview from './ProductPreview'

const PROOF = [
  { icon: Layers, label: 'Hybrid retrieval', detail: 'semantic + keyword' },
  { icon: FileCheck2, label: 'Page-level citations', detail: 'document and page' },
  { icon: Search, label: 'Filtered search', detail: 'collection, date, page' },
  { icon: ShieldCheck, label: 'Per-user isolation', detail: 'enforced server-side' },
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="chart-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="horizon-glow pointer-events-none absolute inset-x-0 top-0 h-[26rem]" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-2xs font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Document intelligence for private knowledge bases
          </p>

          <h1 className="mt-6 text-5xl font-semibold tracking-[0.02em] text-ink sm:text-6xl lg:text-7xl">
            ALBATROSS
          </h1>

          <p className="mt-4 text-xl font-medium tracking-tight text-accent-ink sm:text-2xl">
            Navigate your knowledge.
          </p>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            Turn your documents into an intelligent, searchable knowledge base. Ask questions in
            plain language and get grounded answers with transparent sources.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/signup" className="btn-primary px-5 py-2.5 text-sm">
              Get Started
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-5 py-2.5 text-sm">
              Explore ALBATROSS
            </a>
          </div>

          <p className="mt-3 text-xs text-muted">
            Free plan includes 25 documents and 200 questions a month. No card required.
          </p>
        </div>

        <div className="mt-12 sm:mt-16">
          <ProductPreview />
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-8 lg:grid-cols-4">
          {PROOF.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <item.icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <dt className="text-sm font-medium text-ink">{item.label}</dt>
                <dd className="text-xs text-muted">{item.detail}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}