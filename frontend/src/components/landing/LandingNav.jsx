import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { motion } from 'framer-motion'
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
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={[
          'mx-auto flex h-14 w-full max-w-6xl items-center rounded-2xl border px-2 transition-all duration-300 sm:h-15',
          scrolled
            ? 'border-white/10 bg-[#090c10]/88 shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl'
            : 'border-white/[0.07] bg-[#090c10]/65 backdrop-blur-md',
        ].join(' ')}
      >
        <Link
          to="/"
          aria-label="ALBATROSS home"
          className="group flex shrink-0 items-center rounded-xl px-2.5 py-2"
        >
          <Brand size="md" animated />
        </Link>

        <nav aria-label="Sections" className="mx-auto hidden items-center rounded-xl border border-white/[0.06] bg-white/[0.025] p-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-lg px-3.5 py-1.5 text-xs font-medium text-white/55 transition-colors hover:text-white"
            >
              <span className="relative z-10">{link.label}</span>
              <span className="absolute inset-0 scale-90 rounded-lg bg-white/[0.06] opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <Link to="/login" className="rounded-xl px-3.5 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="group inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5"
          >
            Start for free
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="ml-auto rounded-xl p-2.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
        >
          {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <motion.div
          id="landing-mobile-nav"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-2 w-full max-w-6xl rounded-2xl border border-white/[0.08] bg-[#090c10]/95 p-3 shadow-2xl backdrop-blur-xl md:hidden"
        >
          <nav aria-label="Sections" className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3">
            <Link to="/login" className="rounded-xl border border-white/10 px-3 py-2.5 text-center text-sm font-medium text-white/75">
              Sign in
            </Link>
            <Link to="/signup" className="rounded-xl bg-white px-3 py-2.5 text-center text-sm font-semibold text-black">
              Start free
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  )
}
