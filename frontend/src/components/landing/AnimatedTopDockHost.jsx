import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AnimatedTopDockHost.css'

const items = [
  { label: 'Product', icon: 'cube', href: '#product' },
  { label: 'Solutions', icon: 'layers', href: '#how-it-works' },
  { label: 'Docs', icon: 'file', href: '#product' },
  { label: 'Pricing', icon: 'tag', href: '#pricing' },
  { label: 'Changelog', icon: 'clock', href: '#changelog' },
]

function Icon({ name, size = 15 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'cube') return <svg {...common}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4M12 12v9"/></svg>
  if (name === 'layers') return <svg {...common}><path d="m12 3-9 5 9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>
  if (name === 'file') return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>
  if (name === 'tag') return <svg {...common}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3.4 13.4a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7a2 2 0 0 1 0 2.8Z"/><circle cx="8.5" cy="8.5" r="1"/></svg>
  if (name === 'clock') return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  return <svg {...common}><path d="M5 12h13M13 7l5 5-5 5"/></svg>
}

export default function AnimatedTopDockHost() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.body.classList.add('albatross-dark-landing')
    return () => document.body.classList.remove('albatross-dark-landing')
  }, [])

  const go = (href) => {
    setMobileOpen(false)
    if (href.startsWith('#')) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="albatross-hero">
      <div className="albatross-ambient" aria-hidden="true" />
      <header className="albatross-header">
        <a className="albatross-brand" href="/" aria-label="ALBATROSS home">
          <span className="albatross-logo" aria-hidden="true">A</span>
          <span>ALBATROSS</span>
        </a>
        <nav className="albatross-nav" aria-label="Primary navigation">
          {items.map((item, index) => (
            <button key={item.label} className={`albatross-nav-item ${index === 0 ? 'is-active' : ''}`} onClick={() => go(item.href)} type="button">
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="albatross-actions">
          <button className="albatross-signin" type="button" onClick={() => navigate('/login')}>Sign in</button>
          <button className="albatross-start" type="button" onClick={() => navigate('/signup')}>
            <span>Start building</span><Icon name="arrow" size={14} />
          </button>
        </div>
        <button className={`albatross-menu ${mobileOpen ? 'is-open' : ''}`} type="button" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>
          <span /><span />
        </button>
      </header>

      {mobileOpen && (
        <nav className="albatross-mobile-nav" aria-label="Mobile navigation">
          {items.map((item) => (
            <button key={item.label} type="button" onClick={() => go(item.href)}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
          <button type="button" onClick={() => navigate('/login')}>Sign in</button>
          <button className="mobile-cta" type="button" onClick={() => navigate('/signup')}>Start building <Icon name="arrow" size={14} /></button>
        </nav>
      )}

      <div className="albatross-hero-copy">
        <div className="albatross-eyebrow">INTERFACE SYSTEMS</div>
        <h1>Everything above the fold</h1>
      </div>
    </section>
  )
}