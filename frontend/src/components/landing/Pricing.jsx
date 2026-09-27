/**
 * Pricing — dark landing palette.
 *
 * Plans come from GET /api/plans so the landing page and the server can never
 * disagree about a limit. A local fallback keeps the section readable if the API
 * is unreachable.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
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

      {/* One sheet with three columns */}
      <div
        style={{
          marginTop: '40px',
          overflow: 'hidden',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
          background: '#0f1017',
        }}
      >
        <div
          style={{ display: 'grid' }}
          className="lg:!grid-cols-3"
        >
          {plans.map((plan, index) => (
            <div
              key={plan.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '24px',
                borderTop: index > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                background: plan.highlighted ? 'rgba(45,212,191,0.04)' : 'transparent',
              }}
              className={index > 0 ? 'lg:!border-t-0 lg:!border-l lg:!border-l-[rgba(255,255,255,0.06)]' : ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>{plan.name}</h3>
                {plan.highlighted && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: '#2dd4bf',
                    }}
                  >
                    Most popular
                  </span>
                )}
              </div>

              <p style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '30px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#f5f5f7',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {priceOf(plan)}
                </span>
                {Number(plan.price_monthly) > 0 && (
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>/ month</span>
                )}
              </p>

              <p
                style={{
                  marginTop: '8px',
                  minHeight: '40px',
                  fontSize: '14px',
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {plan.tagline}
              </p>

              <ul
                style={{
                  marginTop: '20px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  paddingTop: '20px',
                }}
              >
                {(plan.highlights || []).map((highlight) => (
                  <li
                    key={highlight}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    <Check
                      aria-hidden="true"
                      style={{
                        width: '14px',
                        height: '14px',
                        marginTop: '3px',
                        flexShrink: 0,
                        color: '#2dd4bf',
                      }}
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                style={{
                  marginTop: '24px',
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                  ...(plan.highlighted
                    ? { background: '#f4f0e8', color: '#111117' }
                    : {
                        background: 'transparent',
                        color: '#f5f5f7',
                        border: '1px solid rgba(255,255,255,0.10)',
                      }),
                }}
                onMouseEnter={(e) => {
                  if (plan.highlighted) {
                    e.currentTarget.style.background = '#e8e4d8'
                  } else {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.highlighted) {
                    e.currentTarget.style.background = '#f4f0e8'
                  } else {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                {plan.cta || `Choose ${plan.name}`}
              </Link>
            </div>
          ))}
        </div>

        <p
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 24px',
            fontSize: '12px',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <span style={{ fontWeight: 500, color: '#f5f5f7' }}>Billing is not connected yet.</span>{' '}
          {billing?.note ||
            'Plans are product-level entitlements. No payment provider is wired up, so nothing is charged.'}{' '}
          Changing plan from Settings updates your limits immediately and takes no payment.
        </p>
      </div>
    </Section>
  )
}