import { Link } from 'react-router-dom'
import { BrandMark } from '../layout/Brand'

const LINKS = [
  { href: '#product', label: 'Why ALBATROSS' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
]

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0a0a0f',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '72rem',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        className="sm:!flex-row sm:!items-center sm:!justify-between"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              width: '28px',
              height: '28px',
              background: '#f4f0e8',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BrandMark className="h-4 w-4 text-[#111117]" />
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '0.08em',
              color: '#f5f5f7',
            }}
          >
            ALBATROSS
          </span>
          <span
            className="hidden sm:inline"
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Document intelligence and grounded answers, cited back to your own sources.
          </span>
        </div>

        <nav
          aria-label="Footer"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '20px',
            rowGap: '8px',
          }}
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f5f5f7' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f5f5f7' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f5f5f7' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
          >
            Create account
          </Link>
        </nav>
      </div>

      <div
        style={{
          maxWidth: '72rem',
          width: '100%',
          margin: '32px auto 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '20px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.35)',
        }}
        className="sm:!flex-row sm:!items-center sm:!justify-between"
      >
        <p>{new Date().getFullYear()} ALBATROSS</p>
        <p>Documents stay in your account. Retrieval is scoped to you on every request.</p>
      </div>
    </footer>
  )
}