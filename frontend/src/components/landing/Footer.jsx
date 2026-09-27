import { Link } from 'react-router-dom'
import Brand from '../layout/Brand'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '#product', label: 'Why ALBATROSS' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#pricing', label: 'Pricing' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-5 py-12 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Brand size="md" withTagline />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Document intelligence and grounded answers, cited back to your own sources.
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

        <nav aria-label="Account">
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
        </nav>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} ALBATROSS</p>
        <p>Documents stay in your account. Retrieval is scoped to you on every request.</p>
      </div>
    </footer>
  )
}
