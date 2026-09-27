import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ArrowRight } from 'lucide-react'
import Brand from '../layout/Brand'

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: 'https://github.com/SaiKrishna181707/Advanced-RAG-based-knowledge-assistant', label: 'Documentation', external: true },
]

/**
 * Clean, standard SaaS top navigation. Sticky and blurred on scroll.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-200 ${
        scrolled ? 'border-b border-line bg-canvas/80 backdrop-blur-md shadow-sm py-3' : 'border-b border-transparent bg-transparent py-5'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="ALBATROSS home" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md">
          <Brand size="md" animated />
        </Link>

        <nav aria-label="Sections" className="hidden md:flex items-center gap-6">
          {LINKS.map((link) => {
            const Tag = link.external ? 'a' : 'a'
            const props = link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
            return (
              <Tag
                key={link.label}
                href={link.href}
                {...props}
                className="text-sm font-medium text-muted transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              >
                {link.label}
              </Tag>
            )
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link 
            to="/login" 
            className="text-sm font-medium text-muted transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
          >
            Sign in
          </Link>
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition-transform hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-md p-2 text-muted hover:bg-raised hover:text-ink md:hidden outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="absolute inset-x-0 top-full flex flex-col border-b border-line bg-canvas px-5 pb-6 pt-4 shadow-xl md:hidden">
          <nav className="flex flex-col gap-4">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <hr className="my-6 border-line" />
          <div className="flex flex-col gap-3">
            <Link 
              to="/login" 
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink"
            >
              Sign in
            </Link>
            <Link 
              to="/signup" 
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}