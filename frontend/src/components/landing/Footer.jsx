import { Link } from 'react-router-dom'
import Brand from '../layout/Brand'

const LINKS = [
  { href: '#product', label: 'Why ALBATROSS' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-5 py-10 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Brand size="md" />
          <span className="hidden text-xs text-muted sm:inline">
            Document intelligence and grounded answers, cited back to your own sources.
          </span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="text-sm text-muted transition-colors hover:text-ink">
            Sign in
          </Link>
          <Link to="/signup" className="text-sm text-muted transition-colors hover:text-ink">
            Create account
          </Link>
        </nav>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-1 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{new Date().getFullYear()} ALBATROSS</p>
        <p>Documents stay in your account. Retrieval is scoped to you on every request.</p>
      </div>
    </footer>
  )
}