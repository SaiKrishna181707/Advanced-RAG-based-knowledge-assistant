import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from './Section'

/**
 * Closing call to action — dark landing palette.
 */
export default function FinalCta() {
  return (
    <Section divider aria-labelledby="final-cta-title">
      <div style={{ maxWidth: '36rem' }}>
        <h2
          id="final-cta-title"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#f5f5f7',
            lineHeight: 1.2,
          }}
        >
          Ask your documents something.
        </h2>
        <p
          style={{
            marginTop: '12px',
            fontSize: '1rem',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Upload a document set and ask it a question. The answer comes back grounded, with the
          sources attached.
        </p>
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="sm:!flex-row sm:!items-center"
        >
          <Link
            to="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#f4f0e8',
              color: '#111117',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e8e4d8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f0e8' }}
          >
            Get started
            <ArrowRight aria-hidden="true" style={{ width: '16px', height: '16px' }} />
          </Link>
          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.10)',
              color: '#f5f5f7',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            See how it works
          </a>
        </div>
      </div>
    </Section>
  )
}