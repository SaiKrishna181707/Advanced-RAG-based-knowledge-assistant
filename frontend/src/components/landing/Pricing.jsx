/**
 * Pricing table.
 *
 * Plans come from GET /api/plans so the landing page and the server can never
 * disagree about a limit. A local fallback keeps the section readable if the API
 * is unreachable.
 *
 * The highlights only ever name entitlements the server actually enforces:
 * document, storage and question allowances, retrieval depth, file size and
 * conversation memory. No payment provider is connected, and the page says so.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Info } from 'lucide-react'
import clsx from 'clsx'
import { metaAPI } from '../../api/client'
import { Section, SectionIntro } from './Section'
import { Badge } from '../ui/Primitives'

const FALLBACK_PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'For trying ALBATROSS on a personal document set.',
    price_label: '$0',
    highlights: [
      'Up to 25 documents',
      '100 MB of storage',
      '200 questions per month',
      'Hybrid retrieval with citations',
      'Up to 25 MB per file',
    ],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For working out of a large personal knowledge base.',
    price_label: '$19',
    highlights: [
      'Up to 1,000 documents',
      '10 GB of storage',
      '10,000 questions per month',
      'Deeper retrieval — 8 passages per answer',
      'Up to 50 MB per file',
      '6-turn conversation memory',
    ],
    cta: 'Choose Pro',
    highlighted: true,
  },
  {
    key: 'team',
    name: 'Team',
    tagline: 'For very large corpora and the deepest retrieval.',
    price_label: '$79',
    highlights: [
      'Up to 10,000 documents',
      '100 GB of storage',
      '100,000 questions per month',
      'Deepest retrieval — 10 passages per answer',
      'Up to 100 MB per file',
      '8-turn conversation memory',
    ],
    cta: 'Choose Team',
    highlighted: false,
  },
]

export default function Pricing() {
  const [plans, setPlans] = useState(FALLBACK_PLANS)
  const [billing, setBilling] = useState(null)

  useEffect(() => {
    let active = true
    metaAPI
      .plans()
      .then((data) => {
        if (!active) return
        if (Array.isArray(data?.plans) && data.plans.length) setPlans(data.plans)
        setBilling(data?.billing ?? null)
      })
      .catch(() => {
        /* keep the fallback table */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Section id="pricing" divider>
      <SectionIntro
        eyebrow="Pricing"
        title="Start free. Move up when your knowledge base grows."
        lede="Plans differ in how much you can store, how many questions you can ask, and how deeply the retriever searches."
        align="center"
      />

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={clsx(
              'flex flex-col rounded-card border bg-surface p-6',
              plan.highlighted
                ? 'border-accent/50 shadow-lifted ring-1 ring-accent/20'
                : 'border-line shadow-card',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
              {plan.highlighted && <Badge tone="accent">Most popular</Badge>}
            </div>

            <p className="mt-1.5 min-h-10 text-sm text-muted">{plan.tagline}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {plan.price_label ?? (plan.price_monthly === 0 ? 'Free' : 'Custom')}
              </span>
              {plan.price_monthly !== null && plan.price_monthly !== undefined && plan.price_monthly > 0 && (
                <span className="text-sm text-muted">/ month</span>
              )}
            </p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {(plan.highlights || []).map((highlight) => (
                <li key={highlight} className="flex items-start gap-2.5 text-sm text-muted">
                  <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/signup"
              className={clsx('mt-7 w-full', plan.highlighted ? 'btn-primary' : 'btn-secondary')}
            >
              {plan.cta || `Choose ${plan.name}`}
            </Link>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl items-start gap-2.5 rounded-card border border-line bg-raised/60 p-4">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-medium text-ink">Billing is not connected yet.</span>{' '}
          {billing?.note ||
            'Plans are product-level entitlements. No payment provider is wired up, so nothing is charged.'}{' '}
          Changing plan from Settings updates your limits immediately and takes no payment.
        </p>
      </div>
    </Section>
  )
}
