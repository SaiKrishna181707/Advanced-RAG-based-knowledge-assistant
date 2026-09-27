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
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="landing-nav-wrap sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className={'landing-command-bar mx-auto flex max-w-6xl items-center ' + (scrolled ? 'is-scrolled' : '')}>
        <Link to="/" aria-label="ALBATROSS home" className="landing-brand shrink-0"><Brand size="md" animated /></Link>
        <nav aria-label="Sections" className="landing-command-links mx-auto hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onMouseEnter={() => setHovered(link.href)} className="landing-command-link">
              {hovered === link.href && <motion.span layoutId="landing-nav-hover" className="landing-command-hover" transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
              <span>{link.label}</span>
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <Link to="/login" className="landing-signin">Sign in</Link>
          <Link to="/signup" className="landing-start group">Start building<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="landing-mobile-button ml-auto md:hidden">
          {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <motion.div id="landing-mobile-nav" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="landing-mobile-panel mx-auto mt-2 max-w-6xl md:hidden">
          {LINKS.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="landing-mobile-link">{link.label}</a>)}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3"><Link to="/login" className="btn-secondary">Sign in</Link><Link to="/signup" className="btn-primary">Start building</Link></div>
        </motion.div>
      )}
    </header>
  )
}