/** Landing-page top navigation. Sticky, blurs the page behind it on scroll. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Brand from '../layout/Brand'

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled ? 'border-line bg-canvas/85 backdrop-blur-md' : 'border-transparent bg-canvas'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="ALBATROSS home" className="rounded-input">
          <Brand size="md" />
        </Link>

        <nav aria-label="Sections" className="ml-6 hidden flex-1 items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-input px-3 py-2 text-sm text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link to="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link to="/signup" className="btn-primary">
            Get started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="ml-auto rounded-input p-2 text-muted hover:bg-raised hover:text-ink md:hidden"
        >
          {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div id="landing-mobile-nav" className="border-t border-line bg-surface px-5 py-4 md:hidden">
          <nav aria-label="Sections" className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-input px-3 py-2 text-sm text-muted hover:bg-raised hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to="/login" className="btn-secondary">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
