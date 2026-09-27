import { Activity, Clock, Database, FileText, HelpCircle, Layers, HardDrive, TriangleAlert } from 'lucide-react'
import { Section, SectionIntro } from './Section'

const METRICS = [
  { icon: FileText, label: 'Documents and pages' },
  { icon: Layers, label: 'Total indexed chunks' },
  { icon: HelpCircle, label: 'Questions asked' },
  { icon: Activity, label: 'Conversations started' },
  { icon: Database, label: 'Documents by collection' },
  { icon: TriangleAlert, label: 'Processing failures' },
]

export default function Insights() {
  return (
    <Section divider>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
        <div>
          <SectionIntro
            eyebrow="Analytics and productivity"
            title="Know what your knowledge base is doing"
            lede="The dashboard reports real counts and real latencies from your own data. An empty account shows zeros, not invented charts."
          />

          <dl className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                Retrieval latency
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                Median time to find the passages, per answer.
              </dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                Generation latency
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                Time spent producing the answer itself.
              </dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                <HardDrive aria-hidden="true" className="h-3.5 w-3.5" />
                Storage used
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                Measured against your plan's storage allowance.
              </dd>
            </div>
            <div className="card p-4">
              <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                <Activity aria-hidden="true" className="h-3.5 w-3.5" />
                Activity timeline
              </dt>
              <dd className="mt-1.5 text-sm text-ink">
                Uploads, questions, collections and searches as they happen.
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
            Reported for your account
          </p>
          <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {METRICS.map((metric) => (
              <li key={metric.label} className="flex items-center gap-2.5 text-sm text-ink">
                <metric.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
                {metric.label}
              </li>
            ))}
          </ul>
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
              Also answered
            </p>
            <p className="text-sm text-muted">
              Which documents are queried most, how many answers were rated helpful, and what has
              failed processing — with the error message kept for you to act on.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}