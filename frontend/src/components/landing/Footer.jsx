import { Link } from 'react-router-dom'
import { BrandMark } from '../layout/Brand'

const LINKS = [
  { href: '#product', label: 'Why ALBATROSS' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-canvas py-12 px-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex items-center gap-3">
            <BrandMark className="h-6 w-6 text-ink" />
            <span className="text-base font-bold tracking-tight text-ink">ALBATROSS</span>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Document intelligence and grounded answers, cited back to your own sources.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Create account
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-line pt-8 sm:flex-row text-xs text-muted">
        <p>&copy; {new Date().getFullYear()} ALBATROSS</p>
        <p>Documents stay in your account. Retrieval is scoped to you on every request.</p>
      </div>
    </footer>
  )
}