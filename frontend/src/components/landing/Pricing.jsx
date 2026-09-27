/**
 * Pricing.
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
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { metaAPI } from '../../api/client'
import { Section, SectionIntro } from './Section'

const FALLBACK_PLANS = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'For trying ALBATROSS on a personal document set.',
    price_label: '$0',
    price_monthly: 0,
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
    price_monthly: 19,
    highlights: [
      'Up to 1,000 documents',
      '10 GB of storage',
      '10,000 questions per month',
      'Deeper retrieval \u2014 8 passages per answer',
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
    price_monthly: 79,
    highlights: [
      'Up to 10,000 documents',
      '100 GB of storage',
      '100,000 questions per month',
      'Deepest retrieval \u2014 10 passages per answer',
      'Up to 100 MB per file',
      '8-turn conversation memory',
    ],
    cta: 'Choose Team',
    highlighted: false,
  },
]

function priceOf(plan) {
  if (plan.price_label) return plan.price_label
  if (plan.price_monthly === 0) return 'Free'
  return 'Custom'
}

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
      />

      {/* One sheet with three columns rather than three floating cards. */}
      <div className="mt-10 overflow-hidden rounded-card border border-line bg-surface">
        <div className="grid lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={plan.key}
              className={clsx(
                'flex flex-col p-6',
                index > 0 && 'border-t border-line lg:border-l lg:border-t-0',
                plan.highlighted && 'bg-accent/[0.04]',
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-accent">
                    Most popular
                  </span>
                )}
              </div>

              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
                  {priceOf(plan)}
                </span>
                {Number(plan.price_monthly) > 0 && (
                  <span className="text-sm text-muted">/ month</span>
                )}
              </p>

              <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted">{plan.tagline}</p>

              <ul className="mt-5 flex-1 space-y-2.5 border-t border-line pt-5">
                {(plan.highlights || []).map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2.5 text-sm text-muted">
                    <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={clsx('mt-6 w-full', plan.highlighted ? 'btn-primary' : 'btn-secondary')}
              >
                {plan.cta || `Choose ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>

        <p className="border-t border-line px-6 py-4 text-xs leading-relaxed text-muted">
          <span className="font-medium text-ink">Billing is not connected yet.</span>{' '}
          {billing?.note ||
            'Plans are product-level entitlements. No payment provider is wired up, so nothing is charged.'}{' '}
          Changing plan from Settings updates your limits immediately and takes no payment.
        </p>
      </div>
    </Section>
  )
}