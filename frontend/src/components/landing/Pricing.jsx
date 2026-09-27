import { Check } from 'lucide-react'
import clsx from 'clsx'
import { Section, SectionIntro } from './Section'
import { Link } from 'react-router-dom'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    description: 'For trying ALBATROSS on a personal document set.',
    features: [
      'Up to 25 documents',
      '100 MB of storage',
      '200 questions per month',
      'Hybrid retrieval with citations',
      'Up to 25 MB per file',
    ],
    button: 'Get started free',
    href: '/signup',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/ month',
    description: 'For working out of a large personal knowledge base.',
    highlighted: true,
    features: [
      'Up to 1,000 documents',
      '10 GB of storage',
      '10,000 questions per month',
      'Deeper retrieval \u2014 8 passages per answer',
      'Up to 50 MB per file',
      '6-turn conversation memory',
    ],
    button: 'Choose Pro',
    href: '/signup',
  },
  {
    key: 'team',
    name: 'Team',
    price: '$79',
    period: '/ month',
    description: 'For very large corpora and the deepest retrieval.',
    features: [
      'Up to 10,000 documents',
      '100 GB of storage',
      '100,000 questions per month',
      'Deepest retrieval \u2014 10 passages per answer',
      'Up to 100 MB per file',
      '8-turn conversation memory',
    ],
    button: 'Choose Team',
    href: '/signup',
  },
]

export default function Pricing() {
  return (
    <Section id="pricing" tone="canvas">
      <SectionIntro
        align="center"
        eyebrow="Pricing"
        title="Simple, transparent plans."
        lede="Start for free, upgrade when your knowledge base grows."
      />

      <div className="mt-16 sm:mt-20">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={clsx(
                'group relative flex flex-col rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl',
                plan.highlighted 
                  ? 'bg-surface shadow-md ring-2 ring-accent' 
                  : 'bg-canvas ring-1 ring-line/40 hover:ring-line'
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-0 right-0 mx-auto w-max rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                  Most popular
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
              </div>
              
              <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-ink">
                {plan.price}
                {plan.period && (
                  <span className="ml-1 text-sm font-medium text-muted">{plan.period}</span>
                )}
              </div>
              
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {plan.description}
              </p>

              <ul className="mb-10 mt-8 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-ink/90">
                    <Check
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:scale-110 group-hover:text-accent-ink"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.href}
                className={clsx(
                  'mt-auto block rounded-full py-3.5 text-center text-sm font-bold transition-all hover:scale-105 active:scale-95',
                  plan.highlighted
                    ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90'
                    : 'bg-raised text-ink hover:bg-line/60'
                )}
              >
                {plan.button}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 rounded-2xl bg-surface/50 p-6 text-xs leading-relaxed text-muted/80 ring-1 ring-line/40 text-center max-w-3xl mx-auto">
          <strong className="font-semibold text-ink">Billing is not connected yet.</strong> Plans
          are product-level entitlements. No payment provider is wired up, so nothing is charged.
          Changing plan from Settings updates your limits immediately and takes no payment.
        </p>
      </div>
    </Section>
  )
}