import { Link } from 'react-router-dom'
import Brand from '../layout/Brand'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '#how-it-works', label: 'How it works' },
      { href: '#capabilities', label: 'Capabilities' },
      { href: '#architecture', label: 'Architecture' },
      { href: '#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '#transparency', label: 'Source transparency' },
      { href: '#documents', label: 'Supported documents' },
      { href: '#faq', label: 'FAQ' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-5 py-12 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Brand size="md" withTagline />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            AI-powered document intelligence and knowledge search.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
              {column.title}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Account</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/signup" className="text-sm text-muted transition-colors hover:text-ink">
                Create account
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-sm text-muted transition-colors hover:text-ink">
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>ALBATROSS — Navigate your knowledge.</p>
        <p>Documents stay in your account. Retrieval is scoped to you on every request.</p>
      </div>
    </footer>
  )
}