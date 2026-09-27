/**
 * Landing-page floating pill navigation.
 *
 * Fixed inset header with glassmorphism, floating ~24px from every edge.
 * Desktop: brand | nav links (icon + label) | sign-in + start-building CTA.
 * Mobile (<768px): brand + hamburger → dropdown menu.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Layers,
  FileText,
  CreditCard,
  Clock,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react'
import { BrandMark } from '../layout/Brand'

const NAV_ITEMS = [
  { href: '#product', label: 'Product', Icon: Box, active: true },
  { href: '#how-it-works', label: 'Solutions', Icon: Layers },
  { href: 'https://github.com/SaiKrishna181707/Advanced-RAG-based-knowledge-assistant', label: 'Docs', Icon: FileText, external: true },
  { href: '#pricing', label: 'Pricing', Icon: CreditCard },
  { href: 'https://github.com/SaiKrishna181707/Advanced-RAG-based-knowledge-assistant/commits/main', label: 'Changelog', Icon: Clock, external: true },
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <header
        className="albatross-header"
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 48px)',
          maxWidth: '1380px',
          zIndex: 50,
          borderRadius: '999px',
          background: scrolled ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.40)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'background 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            height: '56px',
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            aria-label="ALBATROSS home"
            className="albatross-brand"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '34px',
                height: '34px',
                background: '#f4f0e8',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BrandMark className="h-5 w-5 text-[#111117]" />
            </span>
            <span
              style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                letterSpacing: '0.08em',
                lineHeight: 1,
              }}
            >
              ALBATROSS
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Main navigation"
            className="albatross-nav"
            style={{
              display: 'none',
              flex: 1,
              justifyContent: 'center',
              gap: '2px',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const Tag = item.external ? 'a' : 'a'
              const linkProps = item.external
                ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: item.href }

              return (
                <Tag
                  key={item.label}
                  {...linkProps}
                  className="albatross-nav-item"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    whiteSpace: 'nowrap',
                    ...(item.active
                      ? { background: '#f4f0e8', color: '#111117' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.65)' }),
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                    }
                  }}
                >
                  <item.Icon aria-hidden="true" style={{ width: '14px', height: '14px' }} />
                  {item.label}
                </Tag>
              )
            })}
          </nav>

          {/* Desktop actions */}
          <div
            className="albatross-actions"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '8px',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            <Link
              to="/login"
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: '13px',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: '999px',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="albatross-start"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f4f0e8',
                color: '#111117',
                fontSize: '13px',
                fontWeight: 600,
                padding: '7px 18px',
                borderRadius: '999px',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e8e4d8' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f0e8' }}
            >
              Start building
              <ArrowRight aria-hidden="true" style={{ width: '14px', height: '14px' }} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="albatross-hamburger"
            style={{
              display: 'flex',
              marginLeft: 'auto',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          >
            {open
              ? <X aria-hidden="true" style={{ width: '18px', height: '18px' }} />
              : <Menu aria-hidden="true" style={{ width: '18px', height: '18px' }} />
            }
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {open && (
        <div
          id="landing-mobile-nav"
          className="albatross-mobile-menu"
          style={{
            position: 'fixed',
            top: '92px',
            left: '24px',
            right: '24px',
            zIndex: 49,
            background: 'rgba(10,10,15,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '16px',
          }}
        >
          <nav aria-label="Mobile navigation" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {NAV_ITEMS.map((item) => {
              const linkProps = item.external
                ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: item.href }

              return (
                <a
                  key={item.label}
                  {...linkProps}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <item.Icon aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                  {item.label}
                </a>
              )
            })}
          </nav>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                background: '#f4f0e8',
                color: '#111117',
                textDecoration: 'none',
              }}
            >
              Start building
              <ArrowRight aria-hidden="true" style={{ width: '14px', height: '14px' }} />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}